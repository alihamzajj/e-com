-- =============================================================================
-- Catalog search, reviews, product Q&A, moderation, admin reporting.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catalog search (SECURITY INVOKER: RLS still applies; only active products)
-- p_sort: newest | price_asc | price_desc | popular | rating | relevance
-- ---------------------------------------------------------------------------
create or replace function public.catalog_search(
  p_query text default null,
  p_category_slug text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_sort text default 'newest',
  p_in_stock boolean default false,
  p_featured boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, name text, slug text, short_description text,
  price numeric, sale_price numeric, effective_price numeric,
  min_variant_price numeric, max_variant_price numeric,
  rating_avg numeric, rating_count integer, sold_count integer,
  published_at timestamptz, category_name text, category_slug text,
  image_url text, image_alt text, total_stock bigint, low_stock_threshold integer,
  variant_count bigint, default_variant_id uuid, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive
  terms as (
    select string_agg(w || ':*', ' & ') as tsq
    from regexp_split_to_table(
      lower(regexp_replace(left(coalesce(p_query, ''), 100), '[^[:alnum:][:space:]]', ' ', 'g')), '\s+'
    ) w
    where w <> ''
  ),
  cat_tree as (
    select c.id from public.categories c where p_category_slug is not null and c.slug = p_category_slug
    union all
    select c.id from public.categories c join cat_tree t on c.parent_id = t.id
  ),
  base as (
    select p.*, c.name as category_name, c.slug as category_slug,
           case when t.tsq is null then 0 else ts_rank(p.search_vector, to_tsquery('simple', t.tsq)) end as rank,
           v.min_price, v.max_price, v.total_stock, v.variant_count, v.default_variant_id
    from public.products p
    cross join terms t
    left join public.categories c on c.id = p.category_id
    cross join lateral (
      select min(public.compute_unit_price(p.price, p.sale_price, pv.price, pv.sale_price)) as min_price,
             max(public.compute_unit_price(p.price, p.sale_price, pv.price, pv.sale_price)) as max_price,
             coalesce(sum(pv.stock_quantity), 0) as total_stock,
             count(*) as variant_count,
             (array_agg(pv.id order by (pv.stock_quantity > 0) desc, pv.position, pv.created_at))[1] as default_variant_id
      from public.product_variants pv
      where pv.product_id = p.id and pv.is_active
    ) v
    where p.status = 'active'
      and v.variant_count > 0
      and (t.tsq is null or p.search_vector @@ to_tsquery('simple', t.tsq))
      and (p_category_slug is null or p.category_id in (select cat_tree.id from cat_tree))
      and (p_min_price is null or v.min_price >= p_min_price)
      and (p_max_price is null or v.min_price <= p_max_price)
      and (not p_in_stock or v.total_stock > 0)
      and (not p_featured or p.is_featured)
  )
  select b.id, b.name, b.slug, b.short_description,
         b.price, b.sale_price, b.effective_price,
         b.min_price, b.max_price,
         b.rating_avg, b.rating_count, b.sold_count,
         b.published_at, b.category_name, b.category_slug,
         img.url, img.alt, b.total_stock, b.low_stock_threshold,
         b.variant_count, b.default_variant_id,
         count(*) over () as total_count
  from base b
  left join lateral (
    select i.url, i.alt from public.product_images i
    where i.product_id = b.id order by i.position, i.created_at limit 1
  ) img on true
  order by
    case when p_sort = 'price_asc' then b.min_price end asc nulls last,
    case when p_sort = 'price_desc' then b.min_price end desc nulls last,
    case when p_sort = 'popular' then b.sold_count end desc nulls last,
    case when p_sort = 'rating' then b.rating_avg end desc nulls last,
    case when p_sort = 'relevance' then b.rank end desc nulls last,
    b.published_at desc nulls last,
    b.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create or replace function public.refresh_product_rating(p_product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
    set rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r
                               where r.product_id = p_product_id and r.status = 'published'), 0),
        rating_count = (select count(*) from public.reviews r
                        where r.product_id = p_product_id and r.status = 'published')
    where p.id = p_product_id;
$$;

create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_product_rating(coalesce(new.product_id, old.product_id));
  return null;
end;
$$;

create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_rating();

-- Eligible = the customer has a delivered order that contains the product.
create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id
    where o.user_id = auth.uid() and o.status = 'delivered' and i.product_id = p_product_id
  );
$$;

create or replace function public.submit_review(
  p_product_id uuid, p_rating integer, p_title text, p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('review:' || v_uid::text, 10, 3600);

  select o.id into v_order from public.orders o join public.order_items i on i.order_id = o.id
    where o.user_id = v_uid and o.status = 'delivered' and i.product_id = p_product_id
    order by o.placed_at desc limit 1;
  if v_order is null then
    raise exception 'REVIEW_NOT_ELIGIBLE' using errcode = '42501';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'INVALID_RATING' using errcode = '22023';
  end if;

  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Verified buyer') into v_name
    from public.profiles where id = v_uid;

  insert into public.reviews (product_id, user_id, order_id, author_name, rating, title, body)
  values (p_product_id, v_uid, v_order, coalesce(v_name, 'Verified buyer'), p_rating,
          nullif(left(trim(p_title), 120), ''), nullif(left(trim(p_body), 3000), ''))
  on conflict (product_id, user_id) do update
    set rating = excluded.rating, title = excluded.title, body = excluded.body
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Product Q&A
-- ---------------------------------------------------------------------------
create or replace function public.ask_question(p_product_id uuid, p_body text, p_parent_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('question:' || v_uid::text, 5, 3600);

  if not exists (select 1 from public.products where id = p_product_id and status = 'active') then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.product_questions
    where id = p_parent_id and product_id = p_product_id and status = 'answered' and parent_id is null
  ) then
    raise exception 'INVALID_PARENT_QUESTION' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 5 and 1000 then
    raise exception 'INVALID_QUESTION' using errcode = '22023';
  end if;

  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Customer') into v_name
    from public.profiles where id = v_uid;

  insert into public.product_questions (product_id, user_id, parent_id, author_name, body)
  values (p_product_id, v_uid, p_parent_id, coalesce(v_name, 'Customer'), trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.answer_question(p_question_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.assert_permission('support');
  if char_length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'INVALID_ANSWER' using errcode = '22023';
  end if;
  insert into public.product_answers (question_id, author_id, body)
  values (p_question_id, auth.uid(), trim(p_body))
  returning id into v_id;
  update public.product_questions set status = 'answered' where id = p_question_id;
  perform public.write_audit('answer', 'product_questions', p_question_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

create or replace function public.moderate_question(p_question_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('support');
  if p_status not in ('pending', 'answered', 'hidden', 'spam') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  update public.product_questions set status = p_status where id = p_question_id;
  if p_status in ('hidden', 'spam') then
    update public.content_reports set status = 'resolved'
      where target_type = 'question' and target_id = p_question_id and status = 'open';
  end if;
  perform public.write_audit('moderate', 'product_questions', p_question_id::text,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.moderate_review(p_review_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('support');
  if p_status not in ('published', 'hidden') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  update public.reviews set status = p_status where id = p_review_id;
  if p_status = 'hidden' then
    update public.content_reports set status = 'resolved'
      where target_type = 'review' and target_id = p_review_id and status = 'open';
  end if;
  perform public.write_audit('moderate', 'reviews', p_review_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('report:' || v_uid::text, 10, 3600);
  if p_target_type = 'question' and not exists (
       select 1 from public.product_questions where id = p_target_id and status = 'answered') then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  elsif p_target_type = 'review' and not exists (
       select 1 from public.reviews where id = p_target_id and status = 'published') then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  elsif p_target_type not in ('question', 'review') then
    raise exception 'INVALID_TARGET' using errcode = '22023';
  end if;

  insert into public.content_reports (target_type, target_id, reporter_id, reason)
  values (p_target_type, p_target_id, v_uid, left(trim(p_reason), 300))
  on conflict (target_type, target_id, reporter_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 and p_target_type = 'question' then
    update public.product_questions set report_count = report_count + 1 where id = p_target_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin reporting
--
-- Definitions (documented in docs/METRICS.md):
--   counted order   = placed in range, status <> 'cancelled', and either cash on
--                     delivery or an online payment verified by the gateway.
--   gross sales     = sum(subtotal) of counted orders (item revenue, before
--                     discounts; excludes shipping and tax).
--   discounts       = sum(discount_total) of counted orders.
--   refunds         = sum(refunded_total) of counted orders (attributed to the
--                     order's placement date).
--   net sales       = gross sales - discounts - refunds.
--   AOV             = (gross sales - discounts) / counted orders.
--   gross profit    = sum((unit_price - unit_cost) * qty) - discounts, only when
--                     every counted line has a recorded unit cost.
-- ---------------------------------------------------------------------------
create or replace function public._orders_in_range(p_from timestamptz, p_to timestamptz)
returns setof public.orders
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.orders o where o.placed_at >= p_from and o.placed_at < p_to;
$$;

create or replace function public.admin_sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_summary jsonb;
  v_daily jsonb;
  v_monthly jsonb;
  v_top jsonb;
  v_categories jsonb;
  v_statuses jsonb;
  v_customers jsonb;
  v_low_stock jsonb;
  v_profit jsonb;
begin
  perform public.assert_permission('reports');
  if p_to <= p_from then
    raise exception 'INVALID_RANGE' using errcode = '22023';
  end if;
  if p_to - p_from > interval '400 days' then
    raise exception 'RANGE_TOO_LARGE' using errcode = '22023';
  end if;
  select timezone into v_tz from public.store_settings where id = 1;

  with counted as (
    select * from public._orders_in_range(p_from, p_to) o
    where o.status <> 'cancelled'
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))
  )
  select jsonb_build_object(
    'gross_sales', coalesce((select sum(subtotal) from counted), 0),
    'discounts', coalesce((select sum(discount_total) from counted), 0),
    'refunds', coalesce((select sum(refunded_total) from counted), 0),
    'shipping', coalesce((select sum(shipping_total) from counted), 0),
    'net_sales', coalesce((select sum(subtotal - discount_total - refunded_total) from counted), 0),
    'counted_orders', (select count(*) from counted),
    'average_order_value', coalesce((select round(sum(subtotal - discount_total) / nullif(count(*), 0), 2) from counted), 0),
    'total_orders', (select count(*) from public._orders_in_range(p_from, p_to)),
    'pending_orders', (select count(*) from public._orders_in_range(p_from, p_to) where status in ('pending', 'confirmed', 'processing', 'shipped')),
    'completed_orders', (select count(*) from public._orders_in_range(p_from, p_to) where status = 'delivered'),
    'cancelled_orders', (select count(*) from public._orders_in_range(p_from, p_to) where status = 'cancelled'),
    'returned_orders', (select count(*) from public._orders_in_range(p_from, p_to) where status = 'returned'),
    'awaiting_payment', (select count(*) from public._orders_in_range(p_from, p_to) where payment_method = 'online'
                          and payment_status in ('pending', 'failed') and status = 'pending'),
    'total_customers', (select count(*) from public.profiles where role = 'customer'),
    'new_customers', (select count(*) from public.profiles where role = 'customer'
                        and created_at >= p_from and created_at < p_to),
    'units_sold', coalesce((select sum(i.quantity) from public.order_items i join counted c on c.id = i.order_id), 0)
  ) into v_summary;

  -- Profit only when every counted line carries a unit cost.
  with counted as (
    select * from public._orders_in_range(p_from, p_to) o
    where o.status <> 'cancelled'
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))
  ), lines as (
    select i.* from public.order_items i join counted c on c.id = i.order_id
  )
  select jsonb_build_object(
    'available', (select count(*) from lines) > 0 and not exists (select 1 from lines where unit_cost is null),
    'lines_with_cost', (select count(*) from lines where unit_cost is not null),
    'lines_total', (select count(*) from lines),
    'cost_of_goods', (select sum(unit_cost * quantity) from lines),
    'gross_profit', case
      when (select count(*) from lines) > 0 and not exists (select 1 from lines where unit_cost is null)
      then (select sum((unit_price - unit_cost) * quantity) from lines)
           - coalesce((select sum(discount_total) from counted), 0)
      else null end
  ) into v_profit;

  with days as (
    select generate_series(
      (p_from at time zone v_tz)::date,
      ((p_to - interval '1 microsecond') at time zone v_tz)::date,
      interval '1 day'
    )::date as day
  ), per_day as (
    select (o.placed_at at time zone v_tz)::date as day,
           count(*) filter (where o.status <> 'cancelled'
             and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))) as orders,
           count(*) as all_orders,
           coalesce(sum(o.subtotal) filter (where o.status <> 'cancelled'
             and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))), 0) as gross,
           coalesce(sum(o.subtotal - o.discount_total - o.refunded_total) filter (where o.status <> 'cancelled'
             and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))), 0) as net,
           coalesce(sum(o.total - o.refunded_total) filter (where o.status <> 'cancelled'
             and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))), 0) as revenue
    from public._orders_in_range(p_from, p_to) o group by 1
  ), signups as (
    select (created_at at time zone v_tz)::date as day, count(*) as customers
    from public.profiles where role = 'customer' and created_at >= p_from and created_at < p_to
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'date', d.day, 'orders', coalesce(p.orders, 0), 'all_orders', coalesce(p.all_orders, 0),
           'gross_sales', coalesce(p.gross, 0), 'net_sales', coalesce(p.net, 0),
           'revenue', coalesce(p.revenue, 0), 'new_customers', coalesce(s.customers, 0)
         ) order by d.day), '[]'::jsonb)
    into v_daily
  from days d left join per_day p on p.day = d.day left join signups s on s.day = d.day;

  -- Last 12 calendar months ending with the month of p_to (store timezone).
  with months as (
    select generate_series(
      date_trunc('month', ((p_to - interval '1 microsecond') at time zone v_tz)) - interval '11 months',
      date_trunc('month', ((p_to - interval '1 microsecond') at time zone v_tz)),
      interval '1 month'
    ) as month
  ), per_month as (
    select date_trunc('month', o.placed_at at time zone v_tz) as month,
           count(*) as orders,
           sum(o.subtotal - o.discount_total - o.refunded_total) as net
    from public.orders o
    where o.status <> 'cancelled'
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))
      and o.placed_at >= ((date_trunc('month', ((p_to - interval '1 microsecond') at time zone v_tz)) - interval '11 months') at time zone v_tz)
      and o.placed_at < p_to
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(m.month, 'YYYY-MM'), 'orders', coalesce(p.orders, 0), 'net_sales', coalesce(p.net, 0)
         ) order by m.month), '[]'::jsonb)
    into v_monthly
  from months m left join per_month p on p.month = m.month;

  with counted as (
    select * from public._orders_in_range(p_from, p_to) o
    where o.status <> 'cancelled'
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))
  )
  select coalesce(jsonb_agg(t order by t.units desc, t.revenue desc), '[]'::jsonb) into v_top
  from (
    select i.product_id, max(i.product_name) as name, sum(i.quantity) as units, sum(i.line_total) as revenue
    from public.order_items i join counted c on c.id = i.order_id
    group by i.product_id
    order by units desc, revenue desc
    limit 10
  ) t;

  with counted as (
    select * from public._orders_in_range(p_from, p_to) o
    where o.status <> 'cancelled'
      and (o.payment_method = 'cod' or o.payment_status in ('paid', 'partially_refunded', 'refunded'))
  )
  select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) into v_categories
  from (
    select coalesce(cat.name, 'Uncategorised') as name, sum(i.line_total) as revenue, sum(i.quantity) as units
    from public.order_items i join counted c on c.id = i.order_id
    left join public.categories cat on cat.id = i.category_id
    group by 1
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', n) order by n desc), '[]'::jsonb)
    into v_statuses
  from (select status, count(*) as n from public._orders_in_range(p_from, p_to) group by status) s;

  select coalesce(jsonb_agg(t order by t.stock), '[]'::jsonb) into v_low_stock
  from (
    select v.id as variant_id, p.id as product_id, p.name, v.title as variant_title, v.sku,
           v.stock_quantity as stock, p.low_stock_threshold as threshold
    from public.product_variants v join public.products p on p.id = v.product_id
    where p.status = 'active' and v.is_active and v.stock_quantity <= p.low_stock_threshold
    order by v.stock_quantity, p.name
    limit 20
  ) t;

  select jsonb_build_object('timezone', v_tz, 'from', p_from, 'to', p_to) into v_customers;

  return jsonb_build_object(
    'range', v_customers,
    'summary', v_summary,
    'profit', v_profit,
    'daily', v_daily,
    'monthly', v_monthly,
    'top_products', v_top,
    'category_sales', v_categories,
    'status_breakdown', v_statuses,
    'low_stock', v_low_stock
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin customer directory
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_customers(
  p_search text default null, p_limit integer default 25, p_offset integer default 0
)
returns table (
  id uuid, email text, full_name text, phone text, role text, created_at timestamptz,
  order_count bigint, total_spent numeric, last_order_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('customers');
  return query
    select p.id, p.email, p.full_name, p.phone, p.role, p.created_at,
           coalesce(s.order_count, 0), coalesce(s.total_spent, 0), s.last_order_at,
           count(*) over ()
    from public.profiles p
    left join lateral (
      select count(*) as order_count,
             sum(o.total - o.refunded_total) filter (where o.status not in ('cancelled')) as total_spent,
             max(o.placed_at) as last_order_at
      from public.orders o where o.user_id = p.id
    ) s on true
    where p_search is null or p_search = ''
       or p.email ilike '%' || p_search || '%'
       or p.full_name ilike '%' || p_search || '%'
       or p.phone ilike '%' || p_search || '%'
    order by s.last_order_at desc nulls last, p.created_at desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;
