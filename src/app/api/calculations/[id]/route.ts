import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const calculation = await prisma.calculation.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!calculation) {
    return NextResponse.json(
      { error: "Kalkulacija nije pronadjena" },
      { status: 404 }
    );
  }

  return NextResponse.json(calculation);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const existing = await prisma.calculation.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Kalkulacija nije pronadjena" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    number,
    deliveryNumber,
    dateIssued,
    affectsStock,
    signedBy,
    responsiblePerson,
    items,
  } = body;

  if (!number || !String(number).trim()) {
    return NextResponse.json(
      { error: "Broj kalkulacije je obavezan" },
      { status: 400 }
    );
  }

  if (String(number).trim() !== existing.number) {
    const duplicate = await prisma.calculation.findUnique({
      where: { number: String(number).trim() },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Kalkulacija sa tim brojem vec postoji" },
        { status: 400 }
      );
    }
  }

  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  // Reverse old stock changes if previously affected
  if (existing.affectsStock) {
    for (const item of existing.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            amount: { decrement: item.quantity },
          },
        });
      }
    }
  }

  const calculation = await prisma.$transaction(async (tx) => {
    await tx.calculationItem.deleteMany({
      where: { calculationId: params.id },
    });

    const calc = await tx.calculation.update({
      where: { id: params.id },
      data: {
        number: String(number).trim(),
        deliveryNumber: deliveryNumber?.trim() || null,
        dateIssued: new Date(dateIssued || new Date()),
        affectsStock: !!affectsStock,
        signedBy: signedBy?.trim() || null,
        responsiblePerson: responsiblePerson?.trim() || null,
        items: {
          create: validItems.map(
            (item: {
              productId: string | null;
              productName: string;
              unit: string;
              quantity: number;
              pricePerUnit: number;
              goodsValue: number;
              dependentCosts: number;
              priceDifference: number;
              sellingPriceNoVat: number;
              vatRate: number;
              vatAmount: number;
              sellingPriceVat: number;
              sellingPriceUnit: number;
              note: string;
            }) => ({
              productId: item.productId || null,
              productName: item.productName.trim(),
              unit: item.unit || "kom",
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              goodsValue: item.goodsValue,
              dependentCosts: item.dependentCosts || 0,
              priceDifference: item.priceDifference || 0,
              sellingPriceNoVat: item.sellingPriceNoVat,
              vatRate: item.vatRate || 0.2,
              vatAmount: item.vatAmount,
              sellingPriceVat: item.sellingPriceVat,
              sellingPriceUnit: item.sellingPriceUnit,
              note: item.note || null,
            })
          ),
        },
      },
      include: { items: true },
    });

    if (affectsStock && validItems.length > 0) {
      for (const item of validItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              amount: { increment: item.quantity },
              price: item.sellingPriceUnit,
            },
          });
        }
      }
    }

    return calc;
  });

  await createAuditLog({
    userId: session.userId,
    action: "KALKULACIJA",
    description: `Izmenjena kalkulacija br. ${calculation.number}${affectsStock ? " (utice na magacin)" : ""}`,
  });

  return NextResponse.json(calculation);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const calculation = await prisma.calculation.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!calculation) {
    return NextResponse.json(
      { error: "Kalkulacija nije pronadjena" },
      { status: 404 }
    );
  }

  if (calculation.affectsStock) {
    for (const item of calculation.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            amount: { decrement: item.quantity },
          },
        });
      }
    }
  }

  await prisma.calculation.delete({ where: { id: params.id } });

  await createAuditLog({
    userId: session.userId,
    action: "KALKULACIJA",
    description: `Obrisana kalkulacija br. ${calculation.number}`,
  });

  return NextResponse.json({ success: true });
}
