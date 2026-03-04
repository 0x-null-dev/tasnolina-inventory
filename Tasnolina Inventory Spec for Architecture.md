# Tasnolina Inventory — Project Specification

> Inventory management system for Tasnolina — track and manage shop goods in real time.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Package Manager**: pnpm
- **Auth**: NextAuth.js (credentials provider)
- **Styling**: Tailwind CSS
- **Print**: Browser native `window.print()` with print-specific CSS
- **Language**: Serbian Cyrillic (sr-Cyrl) — all UI text

---

## Local Development

### Docker Setup

`docker-compose.yml` with a single PostgreSQL service.

### pnpm Commands

```json
"scripts": {
  "db:up": "docker compose up -d",
  "db:down": "docker compose down",
  "db:clean": "docker compose down -v",
  "db:studio": "prisma studio",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed"
}
```

---

## Authentication

- **Provider**: NextAuth.js credentials (username + password)
- **Users**: Max 2–3, all same privileges (no roles)
- **Storage**: Users stored in DB, passwords hashed with bcrypt
- **Session**: JWT, 8h expiry
- **Setup**: Seed script creates initial users
- **No admin dashboard** — users managed via seed/migration only

---

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  actions   AuditLog[]
}

model Product {
  id        String   @id @default(cuid())
  name      String
  price     Float
  amount    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  auditLogs AuditLog[]
  deliveryItems DeliveryItem[]
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  action      String   -- "DODATO", "PROMJENA_CIJENE", "PROMJENA_KOLICINE", "REVERT", "OTPREMNICA"
  description String   -- human-readable, e.g. "Cijena promijenjena: 1500 → 2000 RSD"
  snapshot    Json     -- full inventory state at this moment
  createdAt   DateTime @default(now())
}

model Delivery (Otpremnica) {
  id            String         @id @default(cuid())
  number        String         @unique  -- otpremnica broj
  dateIssued    DateTime
  supplier      String         -- Dobavljač
  buyer         String         -- Kupac (default: "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd")
  affectsStock  Boolean        @default(false)
  items         DeliveryItem[]
  total         Float          @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model DeliveryItem {
  id          String   @id @default(cuid())
  deliveryId  String
  delivery    Delivery @relation(fields: [deliveryId], references: [id])
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  productName String   -- snapshot of name at time of delivery
  unit        String   @default("kom")
  quantity    Int
  price       Float
  total       Float    -- quantity * price
}
```

---

## Pages & Routes

| Route | Page |
|---|---|
| `/` | Редирект на `/магацин` или `/пријава` |
| `/пријава` | Login |
| `/магацин` | Main inventory table |
| `/историја` | Audit log / history |
| `/отпремнице` | List of all delivery notes |
| `/отпремнице/нова` | New delivery note form |
| `/отпремнице/[id]` | View/edit delivery note |

---

## Page: Магацин (Main Inventory)

### Layout
Full-screen table, responsive (mobile + desktop).

### Table Columns

| Назив производа | Цена (РСД) | Количина | Укупно |
|---|---|---|---|
| string | number | number | price × amount |

- **Footer row**: Total value of all goods (sum of all "Укупно" values), shown prominently below or above table
- Each row has inline **Edit** actions

### Actions per Row

**Промијени цијену** — opens simple modal/inline input:
- Shows current price
- Input: new price (number)
- OR: input delta (e.g. "+500" or "-200") — both modes supported
- On save: recalculates row total + grand total, writes AuditLog

**Промијени количину** — opens simple modal/inline input:
- Shows current amount
- Input: new amount (direct number, e.g. "12")
- OR: delta ("+5" or "-3") — both modes supported
- On save: recalculates totals, writes AuditLog

### Add Product Button
- Prominent button, top-right: **"Додај производ"**
- Modal with: Назив, Цијена (РСД), Количина
- Validates: name required, price > 0, amount ≥ 0

### Print Button
- **"Штампај"** button — triggers `window.print()`
- Print CSS: hides nav/buttons, shows clean table with logo/date header
- Prints: current date, table with all columns, grand total

---

## Page: Историја (Audit Log)

### Layout
Full-width chronological list, newest first.

### Each Entry Shows
- Датум и вријеме
- Корисник (username)
- Акција (ДОДАТО / ПРОМЈЕНА ЦИЈЕНЕ / ПРОМЈЕНА КОЛИЧИНЕ / РЕВЕРТ / ОТПРЕМНИЦА)
- Опис (human-readable, e.g. "Цијена за 'Торба А' промијењена: 1.500 → 2.000 РСД")
- **"Врати на ово стање"** button

### Revert Flow
1. User clicks "Врати на ово стање"
2. Confirmation dialog: "Да ли сте сигурни да желите да вратите стање магацина на [датум]?"
3. On confirm:
   - Restores full inventory snapshot from that log entry
   - Writes new AuditLog entry with action "РЕВЕРТ", description "Стање враћено на: [датум оригиналног снапшота]"
4. Redirects to `/магацин`

---

## Page: Отпремнице — List

- Table: Број | Датум | Добављач | Укупно | Утиче на магацин | Акције
- Each row: **Отвори** button
- Top-right: **"Нова отпремница"** button

---

## Page: Нова отпремница / Уреди отпремницу

### Header Fields (matches Excel exactly)

| Field | Notes |
|---|---|
| Добављач | Text input, default: "Danijela Opačić PR Tašnerska Radnja Beograd (Vračar)" |
| Купац | **Fixed, read-only**: "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd" |
| Отпремница бр. | Manual input (user enters number) |
| Датум издавања | Date picker, default today |

### Items Table (up to 30 rows, matches Excel)

| Редни број | Назив робе | Јед. мјере | Количина | Цијена | Износ |
|---|---|---|---|---|---|
| Auto | Dropdown (from products) or free text | "ком" default | number | number | quantity × price (auto-calculated) |

- **"Назив робе"**: searchable dropdown from Products table — prevents typos
- **Rows**: Start with 30 empty rows (matching Excel), **"Додај ред"** button adds more rows if needed
- **Износ** = Количина × Цијена (calculated live, read-only)
- **Укупно** = sum of all Износ (bottom of table, read-only)

### Footer Fields (matches Excel)

- **Роbu издао** — text input (signature line)
- **Роbu примио** — text input (signature line)

### Affects Stock Toggle

Prominent toggle/checkbox: **"Да ли ова отпремница утиче на магацин?"**

- **ДА**: On save:
  - For each item: `product.amount += quantity` AND `product.price = item price`
  - Both quantity and price are updated in inventory
  - Writes AuditLog entry with action "ОТПРЕМНИЦА", links to delivery ID
- **НЕ** (default): Otpremnica saved, no inventory change

### Buttons
- **"Сачувај"** — saves, redirects to list
- **"Штампај"** — opens print view matching Excel layout exactly

### Print Layout (matches Excel template)
```
[blank header area]

Добављач:    [value]
Купац:       [value]
ОТПРЕМНИЦА БР. [number]
Датум издавања: [date]

┌─────┬──────────────┬──────────┬──────────┬────────┬────────┐
│ Рб. │ Назив робе   │ Јед.мјере│ Количина │  Цијена│  Износ │
├─────┼──────────────┼──────────┼──────────┼────────┼────────┤
│  1  │              │   ком    │          │        │      0 │
... (30 rows)
├─────┴──────────────┴──────────┴──────────┴────────┼────────┤
│                                          Укупно:  │  [sum] │
└───────────────────────────────────────────────────┴────────┘

Роbu издао: ___________        Роbu примио: ___________
```

---

## UX / Design Principles

Since users are **non-technical**, the following are mandatory:

1. **Large touch targets** — all buttons minimum 44px height
2. **Confirmation dialogs** on all destructive/impactful actions
3. **Inline validation** with clear error messages in Serbian
4. **No jargon** — plain Serbian Cyrillic everywhere
5. **Mobile-first** — table scrolls horizontally on small screens, actions accessible via tap
6. **Loading states** — spinner/skeleton on all async operations
7. **Success feedback** — toast notifications after save/update/revert
8. **Simple navigation** — bottom nav on mobile, sidebar on desktop: Магацин | Историја | Отпремнице

---

## Audit Log Snapshot Format

Every AuditLog entry stores a full snapshot of inventory state:

```json
{
  "products": [
    { "id": "...", "name": "Торба А", "price": 2000, "amount": 15 },
    { "id": "...", "name": "Торба Б", "price": 3500, "amount": 8 }
  ],
  "totalValue": 58000,
  "timestamp": "2025-11-28T14:32:00Z"
}
```

This enables full revert to any past checkpoint.

---

## Out of Scope

- Role-based permissions
- Email notifications
- Multi-location inventory
- Barcode scanning
- Bulk import/export (CSV etc.)
- Admin dashboard for user management

---

## Page: Калкулације — List

- Table: Број | Датум | Отпремница бр. | Укупно са ПДВ | Утиче на магацин | Акције
- Each row: **Отвори** button
- Top-right: **"Нова калкулација"** button

---

## Page: Нова калкулација / Уреди калкулацију

Identical flow to Otpremnica page — same save/print/affects-stock logic.

### Header Fields (matches Excel — sheet "Kalkulacija")

| Field | Notes |
|---|---|
| Калкулација продајне цене бр. | Manual input (user enters number) |
| По документу — Отпремница број | Manual input |
| Од (датум) | Date picker, default today |
| Године | Auto-filled from date |

Header metadata (from sheet "Zaglavlje", fixed/read-only):
- PIB: 100292681
- Обвезник: Опачић Данијела
- Фирма: PR Tašnerska radnja Beograd

### Items Table (30 rows default, "Додај ред" for more)

Columns match Excel exactly:

| Р.бр. | Назив робе | Јед.мере | Кол. | Цена по јед. (5) | Вредност робе (6) | Зависни трошкови (7) | Разлика у цени (8) | Прод. вр. без ПДВ (9) | Стопа (10) | Обрачунати износ (11) | Прод. вр. са ПДВ (12) | Прод. цена по јед. (13) | Напомена |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Auto | Dropdown from products | ком | number | number | **4×5** | number (opt.) | number (opt.) | **6+7+8** | 0.20 fixed | **9×10** | **9+11** | **12÷4** | text |

**All formula columns are read-only, calculated live.**

**Footer totals row**: Sum of cols 8, 9, 11, 12, 13.

**Footer footnotes** (read-only, shown below table):
> 1 preduzetnici - obveznici PDV, unose nabavnu vrednost robe bez obračunatog PDV u fakturi dobavljača...
> 2 preduzetnici - obveznici PDV, unose vrednost zavisnih troškova bez obračunatog PDV iz fakture...

### Signature Fields (bottom, matches Excel)
- **Датум**: date input
- **Саставио**: text input
- **Одговорно лице**: text input

### Affects Stock Toggle

Prominent toggle: **"Да ли ова калкулација утиче на магацин?"**

- **НЕ** (default): Saved, no inventory change
- **ДА**: On save:
  - For each item with linked product: `product.amount += quantity` AND `product.price = col 13` (prodajna cena po jedinici SA PDV)
  - Writes AuditLog with action "КАЛКУЛАЦИЈА"

### Buttons
- **"Сачувај"** — saves, redirects to list
- **"Штампај"** — print view matching Excel layout exactly

---

## Database Schema Addition

```prisma
model Calculation {
  id                String            @id @default(cuid())
  number            String            @unique
  deliveryNumber    String?
  dateIssued        DateTime
  affectsStock      Boolean           @default(false)
  signedBy          String?
  responsiblePerson String?
  items             CalculationItem[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model CalculationItem {
  id                String       @id @default(cuid())
  calculationId     String
  calculation       Calculation  @relation(fields: [calculationId], references: [id])
  productId         String?
  product           Product?     @relation(fields: [productId], references: [id])
  productName       String
  unit              String       @default("kom")
  quantity          Int
  pricePerUnit      Float        -- col 5
  goodsValue        Float        -- col 6 = 4x5 (calculated)
  dependentCosts    Float        @default(0)   -- col 7
  priceDifference   Float        @default(0)   -- col 8
  sellingPriceNoVat Float        -- col 9 = 6+7+8 (calculated)
  vatRate           Float        @default(0.20) -- col 10, fixed
  vatAmount         Float        -- col 11 = 9x10 (calculated)
  sellingPriceVat   Float        -- col 12 = 9+11 (calculated)
  sellingPriceUnit  Float        -- col 13 = 12/4 (calculated)
  note              String?      -- col 14
}
```

---

## Updated Navigation

| Route | Page |
|---|---|
| `/` | Редирект на `/магацин` или `/пријава` |
| `/пријава` | Login |
| `/магацин` | Main inventory |
| `/историја` | Audit log |
| `/отпремнице` | Delivery notes list |
| `/отпремнице/нова` | New delivery note |
| `/отпремнице/[id]` | View/edit delivery note |
| `/калкулације` | Calculations list |
| `/калкулације/нова` | New calculation |
| `/калкулације/[id]` | View/edit calculation |

Nav: **Магацин \| Историја \| Отпремнице \| Калкулације**

---

## Development Milestones

### Milestone 1 — Project Setup
- Next.js 14 (App Router) + Prisma + PostgreSQL
- Docker Compose for local DB
- pnpm scripts: `db:up`, `db:down`, `db:clean`, `db:migrate`, `db:studio`
- NextAuth.js credentials auth (login page, session, protected routes)
- Seed script with initial users
- Base layout: navigation (Магацин | Историја | Отпремнице | Калкулације), mobile + desktop
- All UI text in Serbian Cyrillic

### Milestone 2 — Basic Inventory Table (Магацин)
- Full-screen product table: Назив | Цена (РСД) | Количина | Укупно
- Grand total below/above table
- Add product modal (Додај производ)
- Edit price — inline/modal, supports direct value + delta (+/-)
- Edit amount — inline/modal, supports direct value + delta (+/-)
- Print current state (`window.print()`)
- Mobile responsive

### Milestone 3 — Reverts & Logs (Историја)
- AuditLog writes on every inventory change (snapshot of full state)
- History page — chronological list of all actions
- Revert button per entry → confirmation dialog → restore snapshot → new log entry
- Toast notifications on all actions

### Milestone 4 — Отпремница
- Delivery notes list page
- New/edit form (30 rows + add more, product dropdown, auto-calc Износ)
- Affects stock toggle → updates product amount + price on save
- Print view matching Excel template exactly

### Milestone 5 — Калкулација цене
- Calculations list page
- New/edit form (30 rows + add more, product dropdown, live formula chain cols 5→6→9→11→12→13)
- Fixed VAT 20%, all formula columns read-only
- Affects stock toggle → updates product amount + price (col 13) on save
- Print view matching Excel template exactly

---

## Assets Provided by Client
- This specification document
- `Delivery_Note.xlsx` — otpremnica template
- `Sales_Price_Calculation_Form.xlsx` — kalkulacija template
