import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const body = await request.json();
  const { name, price, amount } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "Naziv je obavezan" },
      { status: 400 }
    );
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json(
      { error: "Cena mora biti veca od 0" },
      { status: 400 }
    );
  }
  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json(
      { error: "Kolicina ne moze biti negativna" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      price,
      amount: Math.floor(amount),
    },
  });

  await createAuditLog({
    userId: session.userId,
    productId: product.id,
    action: "DODATO",
    description: `Dodat proizvod "${product.name}" — cena: ${price.toLocaleString("sr")} RSD, kolicina: ${amount}`,
  });

  return NextResponse.json(product, { status: 201 });
}
