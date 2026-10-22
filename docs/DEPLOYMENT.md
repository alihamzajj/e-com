# Deployment (Vercel + Supabase)

## Vercel — You do this

1. Push the repository to GitHub and **Import** it in Vercel (framework: Next.js,
   default build command `next build`, Node.js 20+).
2. **Settings → Environment Variables**: add every variable from `.env.example`
   that you use, for Production and Preview:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | `https://shop.example.com` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | publishable / anon key |
| `SUPABASE_SECRET_KEY` | **secret** | service-role key; server only |
| `PAYMENT_PROVIDER` | secret | `stripe`, or empty for COD only |
| `STRIPE_SECRET_KEY` | **secret** | |
| `STRIPE_WEBHOOK_SECRET` | **secret** | |
| `RESEND_API_KEY` | **secret** | |
| `EMAIL_FROM` | secret | e.g. `Store <orders@shop.example.com>` |
| `EMAIL_REPLY_TO` | secret | optional |
| `CRON_SECRET` | **secret** | random 32+ chars; Vercel Cron sends it automatically |

3. Add your domain under **Settings → Domains**, then update Supabase's Site URL
   and redirect URLs (see SETUP.md §3).
4. Deploy. `vercel.json` registers the daily cron that cancels online orders left
   unpaid (`/api/cron/expire-orders`).

> `SUPABASE_SECRET_KEY`, `STRIPE_*`, `RESEND_API_KEY` and `CRON_SECRET` are only
> read in server code (`src/lib/config/server.ts` imports `server-only`, so
> importing them from client code fails the build).

## Payment gateway

Checkout talks to gateways through `src/lib/payments/types.ts`
(`PaymentProvider`: `createCheckout`, `verifyWebhook`, `refund`). A Stripe Checkout
adapter is included. To use another gateway (e.g. a local provider), implement
the interface in `src/lib/payments/<name>.ts` and register it in
`src/lib/payments/index.ts`; checkout, webhooks and refunds need no other changes.

How payment state is decided:

- Placing an online order reserves stock and creates the order as
  `pending / payment pending`. The customer is redirected to the gateway.
- The order becomes **paid** only when a webhook with a **valid signature**
  arrives. `record_gateway_payment()` checks the amount and currency against the
  order total in the database and stores the event id, so retries and replays are
  ignored.
- The success page never marks anything paid. It reads the order from the
  database and shows "confirming payment" until the webhook lands.
- Staff cannot mark an online order paid. The database function refuses it.
- If the checkout session expires unpaid, the order is cancelled and its stock
  released (webhook, plus the daily cron as a backstop).

### Stripe — You do this

1. In the Stripe Dashboard (test mode first), copy the secret key into
   `STRIPE_SECRET_KEY` and set `PAYMENT_PROVIDER=stripe`.
2. **Developers → Webhooks → Add endpoint**:
   `https://shop.example.com/api/webhooks/stripe`, with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Confirm Stripe supports your store currency and country. If it doesn't (e.g. a
   PKR merchant account), use a local gateway adapter instead.
4. In **Admin → Settings**, enable **Online payments**. The admin page warns if
   the server has no gateway configured.
5. Local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Email provider

Transactional emails (order confirmation, status changes, low-stock alerts, Q&A
answers) are sent through Resend's HTTP API (`src/lib/email/send.ts`). Each
attempt is logged in `email_logs`. The status is `sent` only when the provider
returns a message id, otherwise `failed` or `skipped`.

**You do this:** create a Resend account, verify your sending domain (SPF/DKIM),
create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM`. To use another
provider, replace the `fetch` call in `sendEmail()`. The logging contract stays
the same.

Authentication emails (sign-up confirmation, password reset) are sent by
Supabase Auth. Configure custom SMTP there (SETUP.md §3).

## Scheduled jobs

- `vercel.json` runs `/api/cron/expire-orders` once a day (Vercel Hobby allows
  daily crons). It needs `CRON_SECRET`.
- For tighter timing, schedule it inside Supabase with `pg_cron`
  (**Database → Extensions → pg_cron**), then:

```sql
select cron.schedule('expire-unpaid-orders', '*/15 * * * *',
  $$select public.expire_stale_online_orders(120)$$);
```

## Production checklist

- [ ] Migrations applied to the production project; `seed.sql` **not** run (or demo products removed).
- [ ] First admin created via SQL (SETUP.md §5); no shared or test accounts left.
- [ ] Supabase Site URL and redirect URLs point at the production domain.
- [ ] Custom SMTP configured for Supabase Auth emails; email templates updated.
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production origin.
- [ ] Secrets set only in Vercel (never committed). `.env*` is git-ignored.
- [ ] Store settings filled in: name, logo, currency, time zone, contact, policies, shipping.
- [ ] Payment gateway in **live** mode with the live webhook secret; one real low-value order placed and refunded.
- [ ] Email domain verified; test order confirmation received.
- [ ] `CRON_SECRET` set; cron visible under Vercel → Settings → Cron Jobs.
- [ ] Supabase **Advisors → Security** shows no RLS warnings.
- [ ] MFA enabled on admin accounts; Supabase dashboard access limited to owners.
- [ ] Backups confirmed (below).
- [ ] `npm run test` passes on the release commit; Playwright suite run against a staging deployment.

## Backup and recovery

- **Automatic backups:** Supabase Pro and higher plans take daily backups, and
  Point-in-Time Recovery is an add-on. Free projects have no automatic backups,
  so use at least Pro for a live store.
- **Your own copies:** schedule a logical dump you control:

```bash
npx supabase db dump --linked -f backup-schema.sql
```

```bash
npx supabase db dump --linked --data-only -f backup-data.sql
```

  Store dumps encrypted, outside the Supabase account, and keep several days.
  Storage files (product images) are not in database dumps. Copy the `catalog`
  bucket separately (S3-compatible API or the dashboard).
- **Restore drill:** at least once, restore a dump into a fresh project, point a
  preview deployment at it, and place a test order.
- **Schema changes** go through new migration files only. Never edit the
  production schema by hand. To roll back, write a new migration that reverses
  the change.
- **Order data is append-only by design.** Orders are cancelled, not deleted;
  stock changes are recorded in `inventory_movements`; sensitive admin actions are
  in `audit_logs`. These are the first places to look when reconciling after an
  incident.
