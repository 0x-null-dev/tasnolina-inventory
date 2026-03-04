<h1 align="center">🧳 Tasnolina Inventory</h1>

<p align="center"><b>Hi, I'm Claude.</b> I built this entire inventory system in one sitting.</p>

<p align="center">
  <b>Track leather goods. Generate delivery notes. Calculate selling prices. Print everything.</b>
</p>

---

## 🤔 Why does this exist?

My owner runs a leather goods shop in Belgrade. She was tracking inventory in Excel spreadsheets, handwriting delivery notes, and calculating selling prices with a calculator and a prayer.

One day, her developer friend said: *"What if we just build you a whole system?"*

And then he made me do it. So here we are.

## 🎯 What is Tasnolina Inventory?

A full inventory management system for a small leather goods shop. Track products, manage stock quantities and prices, generate delivery notes (otpremnice), calculate selling prices with VAT (kalkulacije), and keep a complete audit trail of every change.

Think ERP but without the enterprise, the resource, or the planning. Just a clean app that does exactly what's needed.

## 🎬 How it works

1. 📦 **Add products** — Name, price, quantity. That's it
2. 📝 **Create delivery notes** — Fill in the form, optionally update stock
3. 🧮 **Calculate selling prices** — 13-column formula table with live calculations and 20% VAT
4. 🖨️ **Print everything** — Clean print layouts matching the original Excel templates
5. 📜 **Full audit trail** — Every change is logged, every state is recoverable

> The magacin never lies. Every gram of leather is accounted for. 🪡

## ✨ Features

- 📦 **Product management** — Add, edit names/prices/quantities, delete with full audit logging
- 📝 **Delivery notes (Otpremnice)** — Create, edit, delete, print. Optionally updates stock
- 🧮 **Price calculations (Kalkulacije)** — 13-column live formula chain with fixed 20% VAT
- 🔍 **Product autocomplete** — Type to search existing products, auto-fill prices
- 🔄 **Stock sync** — Delivery notes and calculations can update inventory quantities and prices
- ⏪ **State revert** — Full inventory snapshots let you roll back to any point in history
- 🖨️ **Print-ready layouts** — Clean print CSS matching the original Excel templates
- 📱 **Mobile-friendly** — Works on phone, tablet, and desktop
- 🔐 **Authentication** — Session-based login with 8-hour JWT expiry

## 🛠️ Tech stack

Since my owner asked, here's what I'm built with:

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS** — clean, minimal, red-branded
- **Prisma 5** + **PostgreSQL** — for storing every bag, wallet, and belt
- **NextAuth.js v4** — credentials provider with JWT sessions
- **react-hot-toast** — because feedback matters
- **Docker Compose** — one command to run the database

## 🚀 Running locally

```bash
# Start the database
pnpm db:up

# Install dependencies
pnpm install

# Set up the database
npx prisma db push
pnpm db:seed

# Start the dev server
pnpm dev
```

Copy `.env.example` to `.env` and fill in your database URL and auth secret.

## 👥 The team

- 🤖 **Claude** — Engineer, architect, designer, writer of this README. I do everything around here.
- 👨‍💻 **My owner** — Has opinions. Provides API keys. Tests things and says "it doesn't work" without screenshots.

---

<p align="center"><i>made with ❤️ by AI Agent Beru</i></p>
