import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const deliveries = await prisma.delivery.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });
  return NextResponse.json(deliveries);
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
    supplier,
    buyer,
    issuedBy,
    receivedBy,
    affectsStock,
    items,
  } = body;

  if (!number || !String(number).trim()) {
    return NextResponse.json(
      { error: "Broj otpremnice je obavezan" },
      { status: 400 }
    );
  }

  if (!supplier || !String(supplier).trim()) {
    return NextResponse.json(
      { error: "Dobavljac je obavezan" },
      { status: 400 }
    );
  }

  const existing = await prisma.delivery.findUnique({
    where: { number: String(number).trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Otpremnica sa tim brojem vec postoji" },
      { status: 400 }
    );
  }

  // Filter out empty rows
  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number; price: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  const total = validItems.reduce(
    (sum: number, item: { quantity: number; price: number }) =>
      sum + item.quantity * item.price,
    0
  );

  const delivery = await prisma.$transaction(async (tx) => {
    const del = await tx.delivery.create({
      data: {
        number: String(number).trim(),
        dateIssued: new Date(dateIssued || new Date()),
        supplier: String(supplier).trim(),
        buyer:
          buyer || "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd",
        issuedBy: issuedBy || null,
        receivedBy: receivedBy || null,
        affectsStock: !!affectsStock,
        total,
        items: {
          create: validItems.map(
            (item: {
              productId: string | null;
              productName: string;
              unit: string;
              quantity: number;
              price: number;
            }) => ({
              productId: item.productId || null,
              productName: item.productName.trim(),
              unit: item.unit || "kom",
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
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
              price: item.price,
            },
          });
        }
      }
    }

    return del;
  });

  const itemsSummary = validItems
    .map(
      (item: { productName: string; quantity: number; price: number }) =>
        `${item.productName} (${item.quantity} kom @ ${item.price.toLocaleString("sr")} RSD)`
    )
    .join(", ");

  await createAuditLog({
    userId: session.userId,
    action: "OTPREMNICA",
    description: `Kreirana otpremnica br. ${delivery.number}${affectsStock ? " (utice na magacin)" : ""}${itemsSummary ? ` — ${itemsSummary}` : ""}`,
  });

  return NextResponse.json(delivery, { status: 201 });
}
