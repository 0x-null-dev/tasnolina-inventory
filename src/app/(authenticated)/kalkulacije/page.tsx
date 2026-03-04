import { prisma } from "@/lib/prisma";
import KalkulacijeClient from "./KalkulacijeClient";

export const dynamic = "force-dynamic";

export default async function KalkulacijePage() {
  const calculations = await prisma.calculation.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });

  const serialized = calculations.map((c) => ({
    id: c.id,
    number: c.number,
    deliveryNumber: c.deliveryNumber,
    dateIssued: c.dateIssued.toISOString(),
    affectsStock: c.affectsStock,
    totalSellingPriceVat: c.items.reduce(
      (sum, item) => sum + item.sellingPriceVat,
      0
    ),
  }));

  return <KalkulacijeClient initialCalculations={serialized} />;
}
