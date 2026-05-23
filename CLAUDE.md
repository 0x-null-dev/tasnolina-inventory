# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tasnolina Inventory is a full inventory management system for a leather goods shop in Belgrade. It tracks products, generates delivery notes (otpremnice), calculates selling prices with VAT (kalkulacije), and maintains a complete audit trail. The UI language is Serbian (Latin script).

## Commands

```bash
# Development
pnpm dev              # Start Next.js dev server (http://localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint

# Database (PostgreSQL via Docker, exposed on port 5433)
pnpm db:up            # Start PostgreSQL container
pnpm db:down          # Stop container
pnpm db:clean         # Stop container and delete volume
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed database (npx tsx prisma/seed.ts)
pnpm db:generate      # Regenerate Prisma client

# Schema changes
npx prisma db push    # Push schema to DB without migration (dev)
npx prisma migrate dev # Create and apply migration (when ready to persist)
```

## Architecture

**Next.js 14 App Router** with `src/` directory and `@/*` path alias.

### Route Groups
- `src/app/(authenticated)/` — Protected pages behind NextAuth middleware: magacin (inventory), otpremnice (delivery notes), kalkulacije (price calculations), istorija (audit history)
- `src/app/prijava/` — Login page (public)
- `src/app/api/` — REST API routes for products, deliveries, calculations, audit

### Key Patterns
- **Client/Server split**: Pages are server components that fetch data; interactive parts are `*Client.tsx` components (e.g., `InventoryClient.tsx`, `OtpremniceClient.tsx`, `KalkulacijaFormClient.tsx`)
- **API routes** use `getSession()` from `src/lib/session.ts` for auth checks, return Serbian error messages
- **Audit logging**: Every mutation calls `createAuditLog()` from `src/lib/audit.ts`, which snapshots the entire product table
- **Auth**: NextAuth v4 credentials provider with JWT sessions (8-hour expiry). Middleware in `src/middleware.ts` protects authenticated routes. Login route is `/prijava`.
- **Prisma singleton** in `src/lib/prisma.ts` with global caching for dev hot-reload

### Data Model (prisma/schema.prisma)
- **Product** — Core entity: name, price, amount
- **Delivery / DeliveryItem** — Delivery notes with line items; `affectsStock` flag optionally updates product quantities
- **Calculation / CalculationItem** — 13-column price calculation with VAT (fixed 20%); `affectsStock` flag optionally updates product prices/quantities
- **AuditLog** — Full inventory snapshot on every change, linked to User and optionally Product
- Cascade deletes on DeliveryItem and CalculationItem when parent is deleted

### Environment
Requires `.env` with: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Docker Compose runs PostgreSQL on port 5433 (maps to internal 5432).

## Serbian Domain Terms

| Serbian | English |
|---------|---------|
| magacin | warehouse/inventory |
| otpremnica | delivery note |
| kalkulacija | price calculation |
| istorija | history |
| prijava | login |
| proizvod | product |
| cena | price |
| kolicina | quantity |
| kom (komad) | piece (unit) |
