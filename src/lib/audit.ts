import { prisma } from "./prisma";

export async function createAuditLog({
  userId,
  productId,
  action,
  description,
}: {
  userId: string;
  productId?: string;
  action: string;
  description: string;
}) {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  const snapshot = {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      amount: p.amount,
    })),
    totalValue: products.reduce((sum, p) => sum + p.price * p.amount, 0),
    timestamp: new Date().toISOString(),
  };

  return prisma.auditLog.create({
    data: {
      userId,
      productId: productId || null,
      action,
      description,
      snapshot,
    },
  });
}
