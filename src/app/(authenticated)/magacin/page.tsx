import { prisma } from "@/lib/prisma";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function MagacinPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  return <InventoryClient initialProducts={products} />;
}
