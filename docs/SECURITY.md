# Security model

## Roles

| Role | How assigned | Can do |
| --- | --- | --- |
| Visitor (`anon`) | — | Browse active products, visible categories, published reviews, answered questions; price a cart. |
| Customer | Default for every new account | Above, plus: own profile (name, phone, opt-in only), own addresses and cart, place and cancel own pending orders, ask questions, review delivered purchases, report content. |
| Staff | Admin assigns, with permissions | Only the areas granted: `products`, `orders`, `customers`, `support`, `coupons`, `reports`, `settings`. |
| Admin | SQL for the first one, then Admin → Staff | Everything, including roles and the audit log. |

Role and permission changes are blocked for everyone except admins by a trigger
(`profiles_guard_role`) and by column-level grants: customers can only update
`full_name`, `phone`, `marketing_opt_in`. An admin cannot remove their own admin
role. Every change is written to `audit_logs`.

## Defence in depth

1. **Row Level Security** is enabled on every table in `public`. Policies are in
   `supabase/migrations/20261022000005_rls_and_grants.sql`. Table and function
   privileges are granted explicitly; nothing relies on project defaults.
2. **Business rules live in the database.** Orders, stock, payments, refunds,
   status changes, Q&A answers and reviews go through `SECURITY DEFINER`
   functions that check `auth.uid()` and permissions themselves. Their tables have
   no client write policies.
3. **Server Actions re-check** the session and permission and validate input with
   Zod before calling the database.
4. **UI checks are for convenience only.** Hiding a button is never the
   protection.

## Money and stock integrity

- Prices, discounts, shipping and totals are computed by `place_order()` from
  database rows. Client-supplied totals are never read.
- Variant rows are locked `FOR UPDATE` in a fixed order, and
  `stock_quantity >= 0` is a constraint, so concurrent buyers cannot oversell.
- Checkout submissions carry an idempotency key (`unique (user_id,
  idempotency_key)` plus an advisory lock), so double clicks and retries return
  the same order.
- Payment webhooks are signature-verified, amount-checked and deduplicated by
  event id (`payment_webhook_events`).
- Order items snapshot name, SKU, options, price and cost.

## Secrets

- `SUPABASE_SECRET_KEY`, gateway keys, the email key and `CRON_SECRET` are read
  only in `src/lib/config/server.ts` (`import "server-only"`).
- Only `NEXT_PUBLIC_SUPABASE_URL`, the publishable key and the site URL reach the
  browser.
- Logs record error codes and messages only, never request bodies, tokens or
  payment data (`logServerError`).

## Abuse protection

- Postgres-backed rate limits (work across serverless instances): order
  placement (10/hour/user), questions (5/hour), reviews and reports
  (10/hour), plus per-IP limits on sign-in, sign-up, password reset, the
  contact form and newsletter.
- Honeypot fields on public forms.
- Password reset always shows the same message (no account enumeration).
- Uploads: bucket-level size/MIME limits, plus server-side size, MIME and
  magic-byte checks.

## Sessions

Supabase Auth sessions are stored in HTTP cookies managed by `@supabase/ssr`.
The proxy refreshes them on each request, and identity is read from
signature-verified JWT claims (`getClaims`). Private pages are rendered per
request and never shared-cached. Only anonymous catalog data uses `use cache`.

## Reporting

`Admin → Staff` shows recent `audit_logs` entries (product, category, coupon,
settings and role changes; order status changes; payments and refunds; Q&A
moderation).
