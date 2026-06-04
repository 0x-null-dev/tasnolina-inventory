import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NivelacijaFormClient from "../NivelacijaFormClient";

export const dynamic = "force-dynamic";

export default async function EditNivelacijaPage({
  params,
}: {
  params: { id: string };
}) {
  const nivelacija = await prisma.nivelacija.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!nivelacija) {
    notFound();
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true, amount: true },
  });

  const existing = {
    id: nivelacija.id,
    number: nivelacija.number,
    dateIssued: nivelacija.dateIssued.toISOString(),
    affectsStock: nivelacija.affectsStock,
    workplace: nivelacija.workplace || "",
    department: nivelacija.department || "",
    taxpayerCode: nivelacija.taxpayerCode || "",
    activityCode: nivelacija.activityCode || "",
    signedBy: nivelacija.signedBy || "",
    items: nivelacija.items.map((item) => ({
      productId: item.productId,
      articleCode: item.articleCode,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      oldPrice: item.oldPrice,
      newPrice: item.newPrice,
      note: item.note,
    })),
  };

  return <NivelacijaFormClient products={products} existing={existing} />;
}
