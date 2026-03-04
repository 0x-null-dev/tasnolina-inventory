import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Proizvod nije pronadjen" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { field, value } = body;

  if (field === "name") {
    const newName = String(value).trim();
    if (!newName) {
      return NextResponse.json(
        { error: "Naziv je obavezan" },
        { status: 400 }
      );
    }

    const oldName = product.name;
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { name: newName },
    });

    await createAuditLog({
      userId: session.userId,
      productId: product.id,
      action: "PROMJENA_NAZIVA",
      description: `Naziv promenjen: "${oldName}" → "${newName}"`,
    });

    return NextResponse.json(updated);
  }

  if (field === "price") {
    const input = String(value).trim();
    let newPrice: number;

    if (input.startsWith("+") || input.startsWith("-")) {
      newPrice = product.price + parseFloat(input);
    } else {
      newPrice = parseFloat(input);
    }

    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json(
        { error: "Cena mora biti veca od 0" },
        { status: 400 }
      );
    }

    const oldPrice = product.price;
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { price: newPrice },
    });

    await createAuditLog({
      userId: session.userId,
      productId: product.id,
      action: "PROMJENA_CIJENE",
      description: `Cena za "${product.name}" promenjena: ${oldPrice.toLocaleString("sr")} → ${newPrice.toLocaleString("sr")} RSD`,
    });

    return NextResponse.json(updated);
  }

  if (field === "amount") {
    const input = String(value).trim();
    let newAmount: number;

    if (input.startsWith("+") || input.startsWith("-")) {
      newAmount = product.amount + parseInt(input, 10);
    } else {
      newAmount = parseInt(input, 10);
    }

    if (isNaN(newAmount) || newAmount < 0) {
      return NextResponse.json(
        { error: "Kolicina ne moze biti negativna" },
        { status: 400 }
      );
    }

    const oldAmount = product.amount;
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { amount: newAmount },
    });

    await createAuditLog({
      userId: session.userId,
      productId: product.id,
      action: "PROMJENA_KOLICINE",
      description: `Kolicina za "${product.name}" promenjena: ${oldAmount} → ${newAmount}`,
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Nepoznato polje" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Proizvod nije pronadjen" },
      { status: 404 }
    );
  }

  await prisma.product.delete({ where: { id: params.id } });

  await createAuditLog({
    userId: session.userId,
    action: "OBRISANO",
    description: `Obrisan proizvod "${product.name}" (cena: ${product.price.toLocaleString("sr")} RSD, kolicina: ${product.amount})`,
  });

  return NextResponse.json({ success: true });
}
