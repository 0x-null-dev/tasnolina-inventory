import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OtpremnicaFormClient from "../OtpremnicaFormClient";

export const dynamic = "force-dynamic";

export default async function EditOtpremnicaPage({
  params,
}: {
  params: { id: string };
}) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!delivery) {
    notFound();
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });

  const existing = {
    id: delivery.id,
    number: delivery.number,
    dateIssued: delivery.dateIssued.toISOString(),
    supplier: delivery.supplier,
    buyer: delivery.buyer,
    issuedBy: delivery.issuedBy || "",
    receivedBy: delivery.receivedBy || "",
    affectsStock: delivery.affectsStock,
    items: delivery.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  return <OtpremnicaFormClient products={products} existing={existing} />;
}
