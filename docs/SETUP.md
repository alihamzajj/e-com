# Setup guide

This guide takes you from an empty Supabase project to a running store. Every
step that needs an account or a secret is marked **You do this**.

## 1. Create the Supabase project — You do this

1. Go to <https://supabase.com/dashboard> → **New project**. Pick a region close
   to your customers and save the database password somewhere safe.
2. Open **Project Settings → API Keys** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (or legacy `anon` key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key (or legacy `service_role` key) → `SUPABASE_SECRET_KEY`
     (server-only — never put it in a `NEXT_PUBLIC_` variable).

## 2. Apply the database migrations

The schema lives in `supabase/migrations/` and must only change through new
migration files. Pick **one** of the two options.

**Option A — Supabase CLI (recommended).**

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase db push
```

**Option B — SQL Editor (no CLI).** Generate one file containing every migration
in order, then paste it into **SQL Editor → New query** on a *new, empty* project
and run it once:

```bash
npm run db:bundle
```

The output is `supabase/bundle/setup.sql`. It runs inside a single transaction,
so either everything is created or nothing is.

**Demo catalog (optional, development/staging only).** `supabase/seed.sql` adds
demo categories, products, stock and a `WELCOME10` coupon. It adds **no** orders,
customers or reviews. Run it in the SQL Editor, or with the CLI:
`npx supabase db reset` on a local stack. Don't run it on a production store that
already has a catalog.

**Updating a project that is already set up.** `setup.sql` is for a new, empty
project only. When a later migration is added (for example
`20261026000007_catalog_option_filters.sql`, which adds the Size / Colour / phone
model filters), paste just that file into **SQL Editor → New query** and run it.

**Expanded catalog (leather jackets, belts, wallets, shoes, watches, mobile
accessories).** Run `supabase/seed-catalog-expansion.sql` in the SQL Editor after
`supabase/seed-store.sql` and the migration above. It adds the category tree and the
new products, moves the starter products into their subcategories, and leaves
anything you changed in the admin alone. It is safe to run twice. After editing
`src/features/catalog/demo-data.ts`, regenerate it with `npm run db:catalog`.

## 3. Configure authentication — You do this

**Authentication → URL Configuration**

- Site URL: your production URL, e.g. `https://shop.example.com`
- Redirect URLs: add
  - `http://localhost:3000/**`
  - `https://<your-vercel-project>.vercel.app/**` (preview deployments)
  - `https://shop.example.com/**`

**Authentication → Providers → Email**: keep *Confirm email* enabled.

**Authentication → Email Templates** (recommended, makes links work across
devices). Change the link in *Confirm signup* to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account">Confirm your email</a>
```

and in *Reset password* to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset your password</a>
```

The default templates also work: `/auth/confirm` accepts both `token_hash` and
`code` links.

**Production email delivery.** Supabase's built-in mailer is rate-limited and
meant for testing. For production, set a custom SMTP server under
**Authentication → SMTP Settings** (Resend, Postmark, SES…).

## 4. Storage

The migration creates a public bucket named `catalog`: 5 MB per file, and only
JPEG, PNG, WebP and AVIF are accepted. Policies let staff with the `products`
permission write `products/…` and `categories/…`, and staff with `settings` write
`store/…`. Customers and visitors can only read files by URL. The upload action
re-checks size, MIME type and the file's magic bytes on the server before
uploading. Nothing else to configure.

## 5. Create the first administrator — You do this

No admin account exists by default and no credentials are hard-coded.

1. Run the app (step 6) and **sign up** normally with the owner's email, then
   confirm the email.
2. In **Supabase → SQL Editor**, promote that account (only the project owner can
   run this):

```sql
update public.profiles
set role = 'admin', permissions = '{}'
where id = (select id from auth.users where email = 'owner@example.com');
```

3. Sign out and back in, then open `/admin`.

After that, promote staff from **Admin → Staff**. Staff only get the permissions
you tick (`products`, `orders`, `customers`, `support`, `coupons`, `reports`,
`settings`). Only admins can change roles. The database enforces this, not just
the UI.

**Optional hardening:** once the owner account exists, consider turning off
public sign-ups for staff-only environments, and enable MFA for admin accounts
(**Authentication → Multi-Factor**).

## 6. Run locally

```bash
cp .env.example .env.local
```

Fill in the Supabase values (step 1) and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, then:

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. Without Supabase variables the site still renders
an empty store. That's useful for UI work, but sign-in, cart and checkout need a
project.

## 7. Store settings

Sign in as admin → **Admin → Settings** to set the store name, logo, currency
(ISO code, e.g. `PKR`), locale (e.g. `en-PK`), time zone, contact details,
shipping methods and prices, the free-shipping threshold, payment methods, hero
and promo content, and the policy pages.

## 8. Online payments (optional)

See [DEPLOYMENT.md → Payments](./DEPLOYMENT.md#payment-gateway). Cash on delivery
works without any gateway.

## 9. Emails (optional)

See [DEPLOYMENT.md → Email](./DEPLOYMENT.md#email-provider). Without a provider,
order emails are recorded as `skipped` in `email_logs` and are never reported as
sent.
