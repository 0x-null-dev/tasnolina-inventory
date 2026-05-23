import { PrismaClient } from "@prisma/client";

const raw = `AVA – 11 – 2150
ANJA – 13 – 1080
ARIJA – 46 – 2460
ANITA – 8 – 2200
ANA – 4 – 2790
BARBARA – 12 – 2650
BUBI – 22 – 3200
BRANKA – 0
VERA – 36 – 1850
VESNA – 26 – 2300
VIDA – 7 – 2500
GRETA – 4 – 3790
GREJS – 10 – 3800
DARA – 14 – 2500
DORIS – 9 – 2450
DINA – 63 – 1500
DADA – 11 – 2650
DIJANA – 17 – 2480
DANKA – 1 – 500
ENA – 17 – 1980
ELA – 16 – 2790
ELZA – 12 – 2980
EMA – 15 – 990
EMILIJA – 80 – 1680
ELENA – 13 – 2200
ZORANA – 2 – 1380
ZARA RUČKA – 5 – 2500
ZARA – 59 – 2380
ZARA DUGME – 5 – 2380
MILKA – 6 – 1080
MILENA – 52 – 1460
MILICA – 4 – 2490
MIRA – 16 – 1980
MAJA – 28 – 1650
MITRA – 3 – 1980
MIRNA – 26 – 990
MIMI – 7 – 990
MANJA – 7 – 2650
MARIJA – 4 – 1490
MINI – 16 – 1880
MAŠA – 4 – 1980
MARA – 18 – 2500
MARA (1) – 4 – 1880
MARTA – 6 – 2490
MREŽA – 1 – 790
NADA – 6 – 1980
NADJA – 2 – 1980
NOA – 12 – 990
NORA – 11 – 2890
NEVA – 1 – 990
NENA – 4 – 1290
NEVENA – 24 – 2390
OLJA – 55 – 1460
OLGA – 4 – 1920
PETKA 1 – 1 – 990
PERLA – 1 – 4200
PAOLA – 1 – 3800
PETRA – 11 – 3280
POLA – 6 – 3480
RUKSAK – 15 – 2190
REA – 8 – 2090
RANAC I – 6 – 1490
ROSA – 38 – 2680
ROSA I – 6 – 2680
SAUDA – 6 – 3100
RANAC – 9 – 2190
SANDRA – 23 – 3100
SANDRA D – 19 – 3100
SRNA – 2 – 11000
SRCE – 3 – 2800
STAŠA – 21 – 2500
SANJA – 7 – 2450
STELA – 18 – 1980
SIUDI – 0
TEA – 7 – 2650
TAMARA – 33 – 1350
TARA – 7 – 1100
HANA – 22 – 1790
CEGER M – 24 – 850
CEGER U – 30 – 890
UNA – 18 – 2790
PRIVEZAK – 23 – 400
NES. M – 21 – 400
NES U – 7 – 400
NES – 34 – 400
KAIŠ (1) – 18 – 500
KAIŠ (2) – 5 – 500
NOVČANIK (1) – 6 – 1100
NOVČANIK (2) – 10 – 990
NOVČANIK (3) – 1 – 750
NOVČANIK (4) – 3 – 1200
NOVČANIK (5) – 15 – 990
NOVČANIK (6) – 2 – 1100
NOVČANIK (7) – 9 – 1200
NOVČANIK (8) – 9 – 1200
NOVČANIK (9) – 7 – 1200
NOVČANIK (10) – 6 – 1200
NOVČANIK (11) – 8 – 990
NOVČANIK (12) – 13 – 990
NOVČANIK (14) – 13 – 1200
NOVČANIK (15) – 12 – 1100
NOVČANIK (16) – 6 – 1100
NOVČANIK (17) – 7 – 1100
NOVČANIK (18) – 17 – 1100
NOVČANIK (19) – 15 – 1380
NOVČANIK (20) – 19 – 1100
NOVČANIK (21) – 15 – 1100
NOVČANIK (22) – 14 – 1100
NOVČANIK (23) – 5 – 1200
NOVČANIK (24) – 17 – 1200
NOVČANIK (25) – 12 – 990
ZOI – 31 – 1850
IVA – 2 – 1080
ISKRA – 17 – 2080
IRINA – 17 – 1980
JULIJA – 1 – 2500
JECA – 1 – 1980
JELICA – 103 – 1460
KELI – 13 – 860
KATA – 14 – 1860
KIĆA – 10 – 1980
KIRA – 2 – 3500
LARA – 10 – 2980
LEA – 3 – 9900
LISA – 7 – 4200
LILI – 32 – 2350
LENA – 23 – 1720
LOLA – 4 – 2100
LUCIJA – 10 – 2950
LENKA – 3 – 2650
M. RANAC – 9 – 1990
M. RANAC NUBOK – 5 – 2340
MERI – 3 – 4400
MEGI – 7 – 2050
MILA – 18 – 2650
MILJA – 5 – 2650`;

type Row = { name: string; amount: number; price: number };

const rows: Row[] = raw
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((line) => {
    const parts = line.split(/\s*[–-]\s*/);
    const name = parts[0].trim();
    const amount = Number(parts[1] ?? 0);
    const price = parts[2] !== undefined ? Number(parts[2]) : 0;
    if (Number.isNaN(amount) || Number.isNaN(price)) {
      throw new Error(`Failed to parse line: ${line}`);
    }
    return { name, amount, price };
  });

const prisma = new PrismaClient();

(async () => {
  console.log(`Parsed ${rows.length} rows.`);
  console.log("First 3:", rows.slice(0, 3));
  console.log("Last 3:", rows.slice(-3));
  console.log(
    "Zero-price rows:",
    rows.filter((r) => r.price === 0).map((r) => r.name),
  );

  const dupes = rows
    .map((r) => r.name)
    .filter((n, i, a) => a.indexOf(n) !== i);
  if (dupes.length > 0) {
    console.log("Duplicate names:", dupes);
  } else {
    console.log("No duplicate names.");
  }

  const result = await prisma.product.createMany({ data: rows });
  console.log(`Inserted ${result.count} products.`);

  const total = await prisma.product.count();
  console.log(`Product table count: ${total}`);

  await prisma.$disconnect();
})();
