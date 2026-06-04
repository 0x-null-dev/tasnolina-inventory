import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const nivelacija = await prisma.nivelacija.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!nivelacija) {
    return NextResponse.json(
      { error: "Nivelacija nije pronadjena" },
      { status: 404 }
    );
  }

  return NextResponse.json(nivelacija);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const existing = await prisma.nivelacija.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Nivelacija nije pronadjena" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    number,
    dateIssued,
    affectsStock,
    workplace,
    department,
    taxpayerCode,
    activityCode,
    signedBy,
    items,
  } = body;

  if (!number || !String(number).trim()) {
    return NextResponse.json(
      { error: "Broj nivelacije je obavezan" },
      { status: 400 }
    );
  }

  if (String(number).trim() !== existing.number) {
    const duplicate = await prisma.nivelacija.findUnique({
      where: { number: String(number).trim() },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Nivelacija sa tim brojem vec postoji" },
        { status: 400 }
      );
    }
  }

  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  // Revert old price changes if previously affected stock
  if (existing.affectsStock) {
    for (const item of existing.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { price: item.oldPrice },
        });
      }
    }
  }

  const nivelacija = await prisma.$transaction(async (tx) => {
    await tx.nivelacijaItem.deleteMany({
      where: { nivelacijaId: params.id },
    });

    const updated = await tx.nivelacija.update({
      where: { id: params.id },
      data: {
        number: String(number).trim(),
        dateIssued: new Date(dateIssued || new Date()),
        affectsStock: !!affectsStock,
        workplace: workplace?.trim() || null,
        department: department?.trim() || null,
        taxpayerCode: taxpayerCode?.trim() || null,
        activityCode: activityCode?.trim() || null,
        signedBy: signedBy?.trim() || null,
        items: {
          create: validItems.map(
            (item: {
              productId: string | null;
              articleCode: string | null;
              productName: string;
              unit: string;
              quantity: number;
              oldPrice: number;
              newPrice: number;
              note: string | null;
            }) => ({
              productId: item.productId || null,
              articleCode: item.articleCode?.trim() || null,
              productName: item.productName.trim(),
              unit: item.unit || "kom",
              quantity: item.quantity,
              oldPrice: item.oldPrice,
              newPrice: item.newPrice,
              note: item.note?.trim() || null,
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
            data: { price: item.newPrice },
          });
        }
      }
    }

    return updated;
  });

  await createAuditLog({
    userId: session.userId,
    action: "NIVELACIJA",
    description: `Izmenjena nivelacija br. ${nivelacija.number}${affectsStock ? " (utice na magacin)" : ""}`,
  });

  return NextResponse.json(nivelacija);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const nivelacija = await prisma.nivelacija.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!nivelacija) {
    return NextResponse.json(
      { error: "Nivelacija nije pronadjena" },
      { status: 404 }
    );
  }

  if (nivelacija.affectsStock) {
    for (const item of nivelacija.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { price: item.oldPrice },
        });
      }
    }
  }

  await prisma.nivelacija.delete({ where: { id: params.id } });

  await createAuditLog({
    userId: session.userId,
    action: "NIVELACIJA",
    description: `Obrisana nivelacija br. ${nivelacija.number}`,
  });

  return NextResponse.json({ success: true });
}
