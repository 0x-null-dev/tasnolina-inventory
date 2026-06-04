import { prisma } from "@/lib/prisma";
import NivelacijaFormClient from "../NivelacijaFormClient";

export const dynamic = "force-dynamic";

export default async function NovaNivelacijaPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, amount: true },
  });

  return <NivelacijaFormClient products={products} />;
}
