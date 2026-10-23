-- =============================================================================
-- Core schema: catalog, customers, carts, orders, payments, content, settings.
-- Money is numeric(12,2) everywhere. Timestamps are timestamptz (stored in UTC,
-- displayed in store_settings.timezone by the app).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  -- Fine-grained permissions for staff. Admins implicitly hold all of them.
  permissions text[] not null default '{}'
    check (permissions <@ array['products', 'orders', 'customers', 'support', 'coupons', 'reports', 'settings']::text[]),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Store settings (single row, public, never holds secrets)
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Ghani Traders' check (char_length(store_name) between 1 and 60),
  tagline text not null default '',
  logo_url text,
  currency text not null default 'PKR' check (currency ~ '^[A-Z]{3}$'),
  locale text not null default 'en-PK',
  timezone text not null default 'Asia/Karachi',
  contact_email text,
  contact_phone text,
  contact_address text,
  social_links jsonb not null default '{}'::jsonb,
  -- [{ "id": "standard", "label": "Standard", "price": 250, "eta": "3-5 business days" }]
  shipping_methods jsonb not null default
    '[{"id":"standard","label":"Standard delivery","price":250,"eta":"3–5 business days"},{"id":"express","label":"Express delivery","price":600,"eta":"1–2 business days"}]'::jsonb,
  free_shipping_threshold numeric(12, 2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  cod_enabled boolean not null default true,
  online_payments_enabled boolean not null default false,
  newsletter_enabled boolean not null default true,
  low_stock_alert_email text,
  hero jsonb not null default '{}'::jsonb,
  promo jsonb not null default '{}'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
insert into public.store_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 1000),
  image_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories (parent_id);
create index categories_visible_idx on public.categories (is_visible, sort_order);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text check (char_length(short_description) <= 300),
  description text check (char_length(description) <= 10000),
  -- [{ "label": "Switches", "value": "Linear, 45g" }]
  specifications jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) = 'array'),
  -- Ordered option names used by variants, e.g. {"Color","Layout"}
  option_names text[] not null default '{}',
  price numeric(12, 2) not null check (price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  cost_price numeric(12, 2) check (cost_price is null or cost_price >= 0),
  effective_price numeric(12, 2) generated always as (coalesce(sale_price, price)) stored,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_featured boolean not null default false,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  sold_count integer not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_status_created_idx on public.products (status, created_at desc);
create index products_status_price_idx on public.products (status, effective_price);
create index products_status_sold_idx on public.products (status, sold_count desc);
create index products_featured_idx on public.products (status, is_featured) where is_featured;
create index products_search_idx on public.products using gin (search_vector);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.products_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger products_published_at before insert or update of status on public.products
  for each row execute function public.products_set_published_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (char_length(sku) between 1 and 64),
  title text not null default 'Default' check (char_length(title) between 1 and 120),
  -- {"Color": "Black", "Layout": "75%"}; empty for single-variant products
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price numeric(12, 2) check (price is null or price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id, position);
create unique index product_variants_options_uidx on public.product_variants (product_id, options);
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  alt text check (char_length(alt) <= 200),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------
-- Customer data
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text check (char_length(label) <= 40),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null check (char_length(phone) between 5 and 32),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 80),
  state text check (char_length(state) <= 80),
  postal_code text check (char_length(postal_code) <= 20),
  country text not null default 'PK' check (country ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_uidx on public.addresses (user_id) where is_default;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index cart_items_variant_idx on public.cart_items (variant_id);
create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description text check (char_length(description) <= 200),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  value numeric(12, 2) not null check (value > 0),
  max_discount numeric(12, 2) check (max_discount is null or max_discount > 0),
  min_order_total numeric(12, 2) not null default 0 check (min_order_total >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index coupons_code_uidx on public.coupons (code);
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('GT-' || nextval('public.order_number_seq')::text),
  user_id uuid references auth.users (id) on delete set null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 32),
  customer_name text not null check (char_length(customer_name) <= 120),
  shipping_address jsonb not null,
  shipping_method text not null,
  shipping_method_label text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  payment_method text not null check (payment_method in ('cod', 'online')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'partially_refunded', 'refunded')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12, 2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(12, 2) not null default 0 check (tax_total >= 0),
  total numeric(12, 2) not null check (total >= 0),
  paid_total numeric(12, 2) not null default 0 check (paid_total >= 0),
  refunded_total numeric(12, 2) not null default 0 check (refunded_total >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  customer_note text check (char_length(customer_note) <= 500),
  tracking_number text check (char_length(tracking_number) <= 100),
  tracking_url text check (char_length(tracking_url) <= 500),
  cancelled_reason text,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount_total + shipping_total + tax_total),
  check (discount_total <= subtotal),
  check (refunded_total <= paid_total),
  unique (user_id, idempotency_key)
);
create index orders_user_placed_idx on public.orders (user_id, placed_at desc);
create index orders_placed_idx on public.orders (placed_at desc);
create index orders_status_idx on public.orders (status, placed_at desc);
create index orders_payment_status_idx on public.orders (payment_status);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  -- Snapshots: an order must not change when the catalog does.
  product_name text not null,
  product_slug text,
  variant_title text,
  options jsonb not null default '{}'::jsonb,
  sku text not null,
  image_url text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  check (line_total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_user_idx on public.coupon_redemptions (coupon_id, user_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (provider in ('cod', 'stripe', 'manual')),
  kind text not null default 'charge' check (kind in ('charge', 'refund')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  provider_ref text,
  checkout_url text,
  failure_reason text,
  recorded_by uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id, created_at);
create unique index payments_provider_ref_uidx on public.payments (provider, kind, provider_ref)
  where provider_ref is not null;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Every processed webhook event id is stored once: replays become no-ops.
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references public.orders (id) on delete set null,
  outcome text not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity_change integer not null check (quantity_change <> 0),
  quantity_after integer not null,
  reason text not null check (reason in ('initial', 'order', 'cancellation', 'return', 'restock', 'adjustment')),
  order_id uuid references public.orders (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- ---------------------------------------------------------------------------
-- Reviews and Q&A
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 3000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id, status, created_at desc);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  parent_id uuid references public.product_questions (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body text not null check (char_length(body) between 5 and 1000),
  -- pending: waiting for staff (visible to its author only); answered: public;
  -- hidden / spam: removed by a moderator.
  status text not null default 'pending' check (status in ('pending', 'answered', 'hidden', 'spam')),
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_questions_product_idx on public.product_questions (product_id, status, created_at desc);
create index product_questions_status_idx on public.product_questions (status, created_at);
create index product_questions_parent_idx on public.product_questions (parent_id);
create trigger product_questions_updated_at before update on public.product_questions
  for each row execute function public.set_updated_at();

create table public.product_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.product_questions (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Store team',
  body text not null check (char_length(body) between 1 and 3000),
  is_official boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_answers_question_idx on public.product_answers (question_id, created_at);
create trigger product_answers_updated_at before update on public.product_answers
  for each row execute function public.set_updated_at();

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('question', 'review')),
  target_id uuid not null,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 300),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);
create index content_reports_status_idx on public.content_reports (status, created_at);

-- ---------------------------------------------------------------------------
-- Support, newsletter, email log, audit, rate limits
-- ---------------------------------------------------------------------------
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'open', 'resolved')),
  staff_note text check (char_length(staff_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_messages_status_idx on public.support_messages (status, created_at desc);
create index support_messages_user_idx on public.support_messages (user_id);
create index support_messages_email_idx on public.support_messages (lower(email));
create trigger support_messages_updated_at before update on public.support_messages
  for each row execute function public.set_updated_at();

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);
create unique index newsletter_subscribers_email_uidx on public.newsletter_subscribers (lower(email));

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_logs_order_idx on public.email_logs (order_id);
create trigger email_logs_updated_at before update on public.email_logs
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
