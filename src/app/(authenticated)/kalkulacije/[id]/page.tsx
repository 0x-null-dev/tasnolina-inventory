import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import KalkulacijaFormClient from "../KalkulacijaFormClient";

export const dynamic = "force-dynamic";

export default async function EditKalkulacijaPage({
  params,
}: {
  params: { id: string };
}) {
  const calculation = await prisma.calculation.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!calculation) {
    notFound();
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });

  const existing = {
    id: calculation.id,
    number: calculation.number,
    deliveryNumber: calculation.deliveryNumber,
    dateIssued: calculation.dateIssued.toISOString(),
    affectsStock: calculation.affectsStock,
    signedBy: calculation.signedBy || "",
    responsiblePerson: calculation.responsiblePerson || "",
    items: calculation.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      dependentCosts: item.dependentCosts,
      priceDifference: item.priceDifference,
      note: item.note,
    })),
  };

  return <KalkulacijaFormClient products={products} existing={existing} />;
}
