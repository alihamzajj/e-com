# NORTHKEY Store

A full-stack e-commerce site with an admin dashboard. It's built with
Next.js 16 (App Router, Cache Components), Supabase (Postgres, Auth, Storage),
Tailwind CSS 4, Recharts, React Hook Form and Zod. It deploys to Vercel.

The store name, logo, currency, time zone, contact details, shipping, payment
methods, hero, promo and policies are all set in **Admin → Settings**. The demo
catalog is a keyboard shop that matches the design reference.

## What's included

**Storefront**
- Home page: hero, categories, featured, new arrivals, best sellers, promo, reviews, newsletter.
- Catalog: filters by category, keyword, price and stock, with sorting and server-side pagination.
- Product pages: gallery, variant picker, live stock, specs, related products, reviews, Q&A, JSON-LD.
- Cart: works for guests (cookie) and signed-in users (database), with coupons and server-priced totals.
- Checkout: saved addresses, shipping methods, cash on delivery or an online gateway, and idempotent order placement.
- Accounts: sign up and sign in, password reset, profile, address book, order history and tracking, cancelling pending orders, reviews for delivered items, support history.
- Contact form, policy pages, sitemap and robots.

**Admin (`/admin`)**
- Dashboard and reports: real metrics computed in SQL, date presets plus custom ranges, 8 charts, CSV export.
- Products: variants, images, stock adjustments with a movement log, publish/archive.
- Categories: nested, with visibility controls.
- Orders: state machine, COD payment recording, refunds (gateway or manual), notes, history, emails.
- Customers: profiles, order totals and purchase frequency.
- Q&A and reported-content moderation, plus a support inbox.
- Coupons, store settings, and staff roles and permissions with an audit log.

**Integrity and security**
- Row Level Security on every table.
- Totals are computed and stock is locked inside one database transaction.
- Payments are only confirmed by signature-verified, deduplicated webhooks.
- Inputs are rate-limited and validated. See [docs/SECURITY.md](docs/SECURITY.md).

## Quick start

```bash
npm install
```

```bash
cp .env.example .env.local
```

Create a Supabase project and apply the migrations, then promote the first admin.
Both steps are in [docs/SETUP.md](docs/SETUP.md). Then:

```bash
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | Generates route types, then runs `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Unit and database tests (no external services needed) |
| `npm run test:e2e` | Playwright against a running app on a staging project |
| `npm run test:live` | Opt-in concurrency test against a staging project |
| `npm run db:bundle` | Writes `supabase/bundle/setup.sql` (all migrations) for the SQL Editor |
| `npm run images:demo` | Regenerates the demo catalog artwork in `public/demo` |

## Project structure

```
src/
  app/(store)/        storefront routes (home, products, cart, checkout, account, …)
  app/(auth)/         sign in, sign up, password reset
  app/admin/          admin dashboard
  app/api/            payment webhooks, cron
  actions/            Server Actions (validated, permission-checked)
  components/         ui/ primitives, layout/, products/, cart/, checkout/, account/, admin/, charts/
  features/           data access and domain logic (catalog, cart, orders, settings, admin, analytics)
  lib/                supabase clients, auth, payments, email, validation, storage, utils
  types/              domain types
supabase/
  migrations/         version-controlled schema, functions, RLS, storage
  seed.sql            optional demo catalog (no orders or sales)
tests/
  unit/  db/  e2e/  live/
docs/                 SETUP, DEPLOYMENT, SECURITY, METRICS, TESTING
```

## Documentation

- [Setup](docs/SETUP.md): Supabase project, migrations, auth, storage, first admin, local development.
- [Deployment](docs/DEPLOYMENT.md): Vercel, environment variables, payment gateway, email, cron, production checklist, backups.
- [Metrics](docs/METRICS.md): how gross and net sales, refunds, AOV and profit are calculated.
- [Security](docs/SECURITY.md): roles, RLS, money and stock integrity, secrets.
- [Testing](docs/TESTING.md): what each suite covers and how to run it.
