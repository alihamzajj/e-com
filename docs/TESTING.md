# Testing

```bash
npm test
```

This runs everything that needs no external services.

## Unit tests — `tests/unit` (Vitest)

Pure logic, no network:

- `pricing.test.ts`: variant and sale price rules, discount badges, stock states, money formatting.
- `stripe.test.ts`: webhook signature verification (valid, tampered, wrong secret, stale/replayed, malformed, key rotation), event normalisation, minor-unit conversion.
- `validation.test.ts`: checkout, product, coupon, sign-up and support validation; mapping database errors to safe messages (raw errors are never shown).

## Database tests — `tests/db` (Vitest + PGlite)

These apply the **real migrations** to an in-process Postgres (PGlite, no Docker
needed). Minimal stand-ins for Supabase's `auth.users`, `auth.uid()`, storage
tables and the `anon` / `authenticated` / `service_role` roles are provided by
`tests/db/harness.ts`. Each query runs under `SET ROLE` with JWT claims, exactly
like PostgREST, so Row Level Security is genuinely enforced.

Covered:

- Catalog visibility (drafts hidden), category, price, keyword (prefix) filtering, sorting, pagination, in-stock filter.
- Server-side quotes: variant/sale pricing, shipping, the free-shipping threshold, coupon caps and minimums, out-of-stock lines.
- Order placement: authentication required, item snapshots, stock decrement plus inventory log, client totals ignored, idempotent retries, no overselling, the stock ≥ 0 constraint, payment-method availability, per-customer and global coupon limits, expired coupons.
- Privacy: customers can't read other customers' orders, items or addresses; no role self-escalation; column-level profile updates; staff permission boundaries; gateway functions not callable by clients; audit logging.
- Fulfilment: the status state machine, restocking and coupon release on cancel, customer cancellation rules, exact-amount COD payment, refunds (partial, over-refund rejected).
- Online payments: staff can't confirm or mark paid without gateway evidence, amount mismatch rejected, duplicate webhook events ignored, expired sessions cancel and restock.
- Reviews (delivered purchases only, rating aggregation) and Q&A (private until answered, staff-only answers, spam moderation, rate limiting).
- Dashboard metrics: gross, net, refunds, AOV, cancelled/unpaid exclusions, profit only with costs, permission check.
- Price parity: the SQL `compute_unit_price` and the TypeScript display function agree on 432 combinations.
- Storage policies: per-folder, per-permission upload rules.

**Limitation:** PGlite is single-connection, so these tests cover the locking
design (`FOR UPDATE` in a fixed order, the stock check constraint, the advisory
lock on idempotency keys) with sequential last-unit tests, not truly parallel
transactions. The live test below covers real concurrency.

## Live concurrency test — `tests/live` (opt-in)

Two temporary customers buy the last unit of a temporary product at the same
instant against a **staging** Supabase project. Exactly one order must succeed
and stock must end at 0. Everything it creates is deleted afterwards.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`SUPABASE_SECRET_KEY` in `.env.local`, then run (Git Bash):

```bash
RUN_LIVE_DB_TESTS=1 npm run test:live
```

## End-to-end tests — `tests/e2e` (Playwright)

These need a running app connected to a Supabase project with the migrations and
`seed.sql` applied (use a **staging** project, never production).

```bash
npx playwright install chromium
```

```bash
npm run build
```

```bash
npm run test:e2e
```

Environment variables (in `.env.local` or the shell):

| Variable | Purpose |
| --- | --- |
| `E2E_BASE_URL` | Test an already-running/deployed app instead of starting `npm run start`. |
| `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` | A confirmed **customer** account on the staging project. |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | A confirmed **admin** account on the staging project. |

Tests that need an account are skipped when its credentials are missing.
Online payment end-to-end tests are not automated, because they need gateway
test keys and webhook forwarding. Use `stripe listen` (DEPLOYMENT.md) and a
Stripe test card to verify manually.
