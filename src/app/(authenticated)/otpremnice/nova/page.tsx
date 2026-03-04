import { prisma } from "@/lib/prisma";
import OtpremnicaFormClient from "../OtpremnicaFormClient";

export const dynamic = "force-dynamic";

export default async function NovaOtpremnicaPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, price: true },
  });

  return <OtpremnicaFormClient products={products} />;
}
