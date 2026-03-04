import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!delivery) {
    return NextResponse.json(
      { error: "Otpremnica nije pronadjena" },
      { status: 404 }
    );
  }

  return NextResponse.json(delivery);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const existing = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Otpremnica nije pronadjena" },
      { status: 404 }
    );
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

  // Check uniqueness if number changed
  if (String(number).trim() !== existing.number) {
    const duplicate = await prisma.delivery.findUnique({
      where: { number: String(number).trim() },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Otpremnica sa tim brojem vec postoji" },
        { status: 400 }
      );
    }
  }

  const validItems = (items || []).filter(
    (item: { productName: string; quantity: number }) =>
      item.productName && item.productName.trim() && item.quantity > 0
  );

  const total = validItems.reduce(
    (sum: number, item: { quantity: number; price: number }) =>
      sum + item.quantity * item.price,
    0
  );

  // If previously affected stock, reverse those changes first
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

  const delivery = await prisma.$transaction(async (tx) => {
    // Delete old items
    await tx.deliveryItem.deleteMany({
      where: { deliveryId: params.id },
    });

    const del = await tx.delivery.update({
      where: { id: params.id },
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

  await createAuditLog({
    userId: session.userId,
    action: "OTPREMNICA",
    description: `Izmenjena otpremnica br. ${delivery.number}${affectsStock ? " (utice na magacin)" : ""}`,
  });

  return NextResponse.json(delivery);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!delivery) {
    return NextResponse.json(
      { error: "Otpremnica nije pronadjena" },
      { status: 404 }
    );
  }

  // Reverse stock changes if it affected stock
  if (delivery.affectsStock) {
    for (const item of delivery.items) {
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

  await prisma.delivery.delete({ where: { id: params.id } });

  await createAuditLog({
    userId: session.userId,
    action: "OTPREMNICA",
    description: `Obrisana otpremnica br. ${delivery.number}`,
  });

  return NextResponse.json({ success: true });
}
