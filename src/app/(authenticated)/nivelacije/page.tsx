import { prisma } from "@/lib/prisma";
import NivelacijeClient from "./NivelacijeClient";

export const dynamic = "force-dynamic";

export default async function NivelacijePage() {
  const nivelacije = await prisma.nivelacija.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });

  const serialized = nivelacije.map((n) => ({
    id: n.id,
    number: n.number,
    dateIssued: n.dateIssued.toISOString(),
    affectsStock: n.affectsStock,
    itemCount: n.items.length,
    totalNewValue: n.items.reduce(
      (sum, item) => sum + item.newPrice * item.quantity,
      0
    ),
  }));

  return <NivelacijeClient initialNivelacije={serialized} />;
}
