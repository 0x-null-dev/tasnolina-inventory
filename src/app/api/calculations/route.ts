import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const calculations = await prisma.calculation.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });
  return NextResponse.json(calculations);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
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

  const existing = await prisma.calculation.findUnique({
    where: { number: String(number).trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Kalkulacija sa tim brojem vec postoji" },
      { status: 400 }
    );
  }

  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  const calculation = await prisma.$transaction(async (tx) => {
    const calc = await tx.calculation.create({
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

  const itemsSummary = validItems
    .map(
      (item: { productName: string; quantity: number; sellingPriceUnit: number }) =>
        `${item.productName} (${item.quantity} kom @ ${item.sellingPriceUnit.toLocaleString("sr")} RSD)`
    )
    .join(", ");

  await createAuditLog({
    userId: session.userId,
    action: "KALKULACIJA",
    description: `Kreirana kalkulacija br. ${calculation.number}${affectsStock ? " (utice na magacin)" : ""}${itemsSummary ? ` — ${itemsSummary}` : ""}`,
  });

  return NextResponse.json(calculation, { status: 201 });
}
