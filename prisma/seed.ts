import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Users ---
  const users = [
    { username: "admin", password: "admin123" },
    { username: "korisnik", password: "korisnik123" },
  ];

  let adminUser;
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        password: hashed,
      },
    });
    if (u.username === "admin") adminUser = user;
    console.log(`User "${u.username}" created/exists`);
  }

  // --- Products ---
  const productData = [
    { name: "Tasna Marija", price: 4500, amount: 12 },
    { name: "Ranac Ksenija", price: 5200, amount: 8 },
    { name: "Torbica Jelena", price: 3800, amount: 15 },
    { name: "Novcanik Milica", price: 1200, amount: 25 },
    { name: "Tasna Dragana", price: 4800, amount: 10 },
    { name: "Pojasna torba Ana", price: 2900, amount: 18 },
    { name: "Ranac Teodora", price: 5500, amount: 6 },
  ];

  const products = [];
  for (const p of productData) {
    let product = await prisma.product.findFirst({
      where: { name: p.name },
    });
    if (!product) {
      product = await prisma.product.create({ data: p });
    }
    products.push(product);
    console.log(`Product "${p.name}" created/exists`);
  }

  // --- Deliveries (otpremnice) ---
  const deliveryData = [
    {
      number: "OTP-001",
      dateIssued: new Date("2025-11-15"),
      supplier: "Danijela Opacic PR Tasnerska Radnja Beograd (Vracar)",
      buyer: "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd",
      issuedBy: "Danijela Opacic",
      receivedBy: "Marko Petrovic",
      affectsStock: false,
      items: [
        { product: products[0], quantity: 5, price: 3200 },
        { product: products[1], quantity: 3, price: 3800 },
        { product: products[3], quantity: 10, price: 800 },
      ],
    },
    {
      number: "OTP-002",
      dateIssued: new Date("2025-12-03"),
      supplier: "Danijela Opacic PR Tasnerska Radnja Beograd (Vracar)",
      buyer: "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd",
      issuedBy: "Danijela Opacic",
      receivedBy: "Ana Jovanovic",
      affectsStock: false,
      items: [
        { product: products[2], quantity: 8, price: 2700 },
        { product: products[4], quantity: 4, price: 3500 },
        { product: products[5], quantity: 6, price: 2100 },
      ],
    },
    {
      number: "OTP-003",
      dateIssued: new Date("2026-01-20"),
      supplier: "Danijela Opacic PR Tasnerska Radnja Beograd (Vracar)",
      buyer: "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd",
      issuedBy: "Danijela Opacic",
      receivedBy: "Jelena Nikolic",
      affectsStock: false,
      items: [
        { product: products[6], quantity: 3, price: 4000 },
        { product: products[0], quantity: 7, price: 3200 },
        { product: products[3], quantity: 15, price: 800 },
      ],
    },
  ];

  for (const d of deliveryData) {
    const existing = await prisma.delivery.findUnique({
      where: { number: d.number },
    });
    if (existing) {
      console.log(`Delivery "${d.number}" already exists, skipping`);
      continue;
    }

    const total = d.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    await prisma.delivery.create({
      data: {
        number: d.number,
        dateIssued: d.dateIssued,
        supplier: d.supplier,
        buyer: d.buyer,
        issuedBy: d.issuedBy,
        receivedBy: d.receivedBy,
        affectsStock: d.affectsStock,
        total,
        items: {
          create: d.items.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            unit: "kom",
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })),
        },
      },
    });
    console.log(`Delivery "${d.number}" created`);
  }

  // --- Calculations (kalkulacije) — ne uticu na magacin ---
  const VAT_RATE = 0.2;

  const calcData = [
    {
      number: "KAL-001",
      deliveryNumber: "OTP-001",
      dateIssued: new Date("2025-11-16"),
      items: [
        { product: products[0], quantity: 5, pricePerUnit: 3200, priceDifference: 800 },
        { product: products[1], quantity: 3, pricePerUnit: 3800, priceDifference: 1000 },
        { product: products[3], quantity: 10, pricePerUnit: 800, priceDifference: 300 },
      ],
    },
    {
      number: "KAL-002",
      deliveryNumber: "OTP-002",
      dateIssued: new Date("2025-12-04"),
      items: [
        { product: products[2], quantity: 8, pricePerUnit: 2700, priceDifference: 700 },
        { product: products[4], quantity: 4, pricePerUnit: 3500, priceDifference: 900 },
        { product: products[5], quantity: 6, pricePerUnit: 2100, priceDifference: 500 },
      ],
    },
  ];

  for (const c of calcData) {
    const existing = await prisma.calculation.findUnique({
      where: { number: c.number },
    });
    if (existing) {
      console.log(`Calculation "${c.number}" already exists, skipping`);
      continue;
    }

    await prisma.calculation.create({
      data: {
        number: c.number,
        deliveryNumber: c.deliveryNumber,
        dateIssued: c.dateIssued,
        affectsStock: false,
        signedBy: "Danijela Opacic",
        responsiblePerson: "Danijela Opacic",
        items: {
          create: c.items.map((item) => {
            const goodsValue = item.quantity * item.pricePerUnit;
            const sellingPriceNoVat = goodsValue + item.priceDifference;
            const vatAmount = sellingPriceNoVat * VAT_RATE;
            const sellingPriceVat = sellingPriceNoVat + vatAmount;
            const sellingPriceUnit = sellingPriceVat / item.quantity;

            return {
              productId: item.product.id,
              productName: item.product.name,
              unit: "kom",
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              goodsValue,
              dependentCosts: 0,
              priceDifference: item.priceDifference,
              sellingPriceNoVat,
              vatRate: VAT_RATE,
              vatAmount,
              sellingPriceVat,
              sellingPriceUnit,
            };
          }),
        },
      },
    });
    console.log(`Calculation "${c.number}" created`);
  }

  // --- Audit logs for seed data ---
  if (adminUser) {
    const snapshot = {
      products: productData.map((p) => ({
        name: p.name,
        price: p.price,
        amount: p.amount,
      })),
      totalValue: productData.reduce((sum, p) => sum + p.price * p.amount, 0),
      timestamp: new Date().toISOString(),
    };

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "DODATO",
        description: "Pocetno stanje magacina (seed)",
        snapshot,
      },
    });
    console.log("Initial audit log created");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
