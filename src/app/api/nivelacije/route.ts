import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const nivelacije = await prisma.nivelacija.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });
  return NextResponse.json(nivelacije);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
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

  const existing = await prisma.nivelacija.findUnique({
    where: { number: String(number).trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Nivelacija sa tim brojem vec postoji" },
      { status: 400 }
    );
  }

  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  const nivelacija = await prisma.$transaction(async (tx) => {
    const created = await tx.nivelacija.create({
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

    return created;
  });

  const itemsSummary = validItems
    .map(
      (item: { productName: string; oldPrice: number; newPrice: number }) =>
        `${item.productName} (${item.oldPrice.toLocaleString("sr")} → ${item.newPrice.toLocaleString("sr")} RSD)`
    )
    .join(", ");

  await createAuditLog({
    userId: session.userId,
    action: "NIVELACIJA",
    description: `Kreirana nivelacija br. ${nivelacija.number}${affectsStock ? " (utice na magacin)" : ""}${itemsSummary ? ` — ${itemsSummary}` : ""}`,
  });

  return NextResponse.json(nivelacija, { status: 201 });
}
