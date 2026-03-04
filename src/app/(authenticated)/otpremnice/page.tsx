import { prisma } from "@/lib/prisma";
import OtpremniceClient from "./OtpremniceClient";

export const dynamic = "force-dynamic";

export default async function OtpremnicePage() {
  const deliveries = await prisma.delivery.findMany({
    orderBy: [{ dateIssued: "desc" }, { createdAt: "desc" }],
    include: { items: true },
  });

  const serialized = deliveries.map((d) => ({
    id: d.id,
    number: d.number,
    dateIssued: d.dateIssued.toISOString(),
    supplier: d.supplier,
    buyer: d.buyer,
    issuedBy: d.issuedBy,
    receivedBy: d.receivedBy,
    affectsStock: d.affectsStock,
    total: d.total,
    items: d.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    })),
  }));

  return <OtpremniceClient initialDeliveries={serialized} />;
}
