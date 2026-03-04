import { prisma } from "@/lib/prisma";
import KalkulacijaFormClient from "../KalkulacijaFormClient";

export const dynamic = "force-dynamic";

export default async function NovaKalkulacijaPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });

  return <KalkulacijaFormClient products={products} />;
}
