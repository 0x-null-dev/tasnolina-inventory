import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const { logId } = await request.json();

  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    return NextResponse.json(
      { error: "Zapis nije pronadjen" },
      { status: 404 }
    );
  }

  const snapshot = log.snapshot as {
    products: { id: string; name: string; price: number; amount: number }[];
  };

  // Delete all current products and recreate from snapshot
  await prisma.$transaction(async (tx) => {
    // Remove all existing products (cascade will handle delivery/calc items if any)
    // Instead, update existing and create/delete as needed
    const currentProducts = await tx.product.findMany();
    const snapshotIds = new Set(snapshot.products.map((p) => p.id));
    const currentIds = new Set(currentProducts.map((p) => p.id));

    // Delete products not in snapshot
    for (const cp of currentProducts) {
      if (!snapshotIds.has(cp.id)) {
        await tx.product.delete({ where: { id: cp.id } });
      }
    }

    // Upsert products from snapshot
    for (const sp of snapshot.products) {
      if (currentIds.has(sp.id)) {
        await tx.product.update({
          where: { id: sp.id },
          data: { name: sp.name, price: sp.price, amount: sp.amount },
        });
      } else {
        await tx.product.create({
          data: {
            id: sp.id,
            name: sp.name,
            price: sp.price,
            amount: sp.amount,
          },
        });
      }
    }
  });

  // Create audit log for the revert
  const allProducts = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  const revertDate = log.createdAt.toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "REVERT",
      description: `Stanje vraceno na: ${revertDate}`,
      snapshot: {
        products: allProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          amount: p.amount,
        })),
        totalValue: allProducts.reduce(
          (sum, p) => sum + p.price * p.amount,
          0
        ),
        timestamp: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ success: true });
}
