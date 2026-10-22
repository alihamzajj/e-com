-- =============================================================================
-- Commerce logic: pricing, quotes, order placement, inventory, payments,
-- refunds, fulfilment. All money math happens here, inside one transaction,
-- from database prices. Client-supplied totals are never read.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Pricing
-- A variant with its own price only uses its own sale price. A variant without
-- one inherits the product price and sale price (or its own sale override).
-- ---------------------------------------------------------------------------
create or replace function public.compute_unit_price(
  p_product_price numeric, p_product_sale numeric, p_variant_price numeric, p_variant_sale numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_variant_price is not null then
      case when p_variant_sale is not null and p_variant_sale < p_variant_price
           then p_variant_sale else p_variant_price end
    else
      case when coalesce(p_variant_sale, p_product_sale) is not null
                and coalesce(p_variant_sale, p_product_sale) < p_product_price
           then coalesce(p_variant_sale, p_product_sale) else p_product_price end
  end;
$$;

-- ---------------------------------------------------------------------------
-- Inventory movement log: every stock change on a variant is recorded.
-- Callers set app.inventory_reason / app.inventory_order_id for context.
-- ---------------------------------------------------------------------------
create or replace function public.product_variants_log_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.stock_quantity <> 0 then
      insert into public.inventory_movements (variant_id, quantity_change, quantity_after, reason, actor_id)
      values (new.id, new.stock_quantity, new.stock_quantity, 'initial', auth.uid());
    end if;
  elsif new.stock_quantity <> old.stock_quantity then
    insert into public.inventory_movements (variant_id, quantity_change, quantity_after, reason, order_id, actor_id, note)
    values (
      new.id,
      new.stock_quantity - old.stock_quantity,
      new.stock_quantity,
      coalesce(nullif(current_setting('app.inventory_reason', true), ''), 'adjustment'),
      nullif(current_setting('app.inventory_order_id', true), '')::uuid,
      auth.uid(),
      nullif(current_setting('app.inventory_note', true), '')
    );
  end if;
  return new;
end;
$$;

create trigger product_variants_inventory
  after insert or update of stock_quantity on public.product_variants
  for each row execute function public.product_variants_log_inventory();

-- ---------------------------------------------------------------------------
-- Coupon evaluation (internal)
-- ---------------------------------------------------------------------------
create or replace function public._evaluate_coupon(
  p_code text, p_subtotal numeric, p_user uuid, p_lock boolean
)
returns table (coupon_id uuid, code text, discount numeric, error text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.coupons%rowtype;
  v_used integer;
  v_discount numeric(12, 2);
begin
  if p_lock then
    select * into c from public.coupons where coupons.code = upper(trim(p_code)) for update;
  else
    select * into c from public.coupons where coupons.code = upper(trim(p_code));
  end if;

  if not found or not c.is_active then
    return query select null::uuid, upper(trim(p_code)), 0::numeric, 'COUPON_INVALID'; return;
  end if;
  if c.starts_at is not null and c.starts_at > now() then
    return query select c.id, c.code, 0::numeric, 'COUPON_NOT_STARTED'; return;
  end if;
  if c.ends_at is not null and c.ends_at <= now() then
    return query select c.id, c.code, 0::numeric, 'COUPON_EXPIRED'; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select c.id, c.code, 0::numeric, 'COUPON_USAGE_LIMIT'; return;
  end if;
  if p_user is not null then
    select count(*) into v_used from public.coupon_redemptions r
      where r.coupon_id = c.id and r.user_id = p_user;
    if v_used >= c.per_customer_limit then
      return query select c.id, c.code, 0::numeric, 'COUPON_ALREADY_USED'; return;
    end if;
  end if;
  if p_subtotal < c.min_order_total then
    return query select c.id, c.code, 0::numeric, 'COUPON_MIN_ORDER'; return;
  end if;

  if c.discount_type = 'percentage' then
    v_discount := round(p_subtotal * c.value / 100, 2);
    if c.max_discount is not null then
      v_discount := least(v_discount, c.max_discount);
    end if;
  else
    v_discount := c.value;
  end if;
  v_discount := least(v_discount, p_subtotal);

  return query select c.id, c.code, v_discount, null::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quote builder (internal). p_items: [{"variant_id": uuid, "quantity": int}]
-- Returns lines with availability plus totals. With p_lock the variant rows
-- and coupon row are locked FOR UPDATE (used by place_order).
-- ---------------------------------------------------------------------------
create or replace function public._build_quote(
  p_items jsonb, p_shipping_method text, p_coupon_code text, p_user uuid, p_lock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.store_settings%rowtype;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_issue_count integer := 0;
  v_item_count integer := 0;
  v_method jsonb;
  v_methods jsonb := '[]'::jsonb;
  v_coupon jsonb := null;
  v_free boolean;
  r record;
  cp record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = '22023';
  end if;

  select * into s from public.store_settings where id = 1;

  if p_lock then
    -- Lock in a stable order so concurrent checkouts cannot deadlock.
    perform 1 from public.product_variants v
      where v.id in (select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) e)
      order by v.id
      for update;
  end if;

  for r in
    with requested as (
      select (e ->> 'variant_id')::uuid as variant_id,
             sum(greatest(least((e ->> 'quantity')::integer, 99), 0))::integer as quantity
      from jsonb_array_elements(p_items) e
      group by 1
    )
    select q.variant_id, least(q.quantity, 99) as quantity,
           v.id is not null as found,
           v.product_id, p.category_id, p.name as product_name, p.slug as product_slug,
           v.title as variant_title, v.options, v.sku, v.stock_quantity,
           (v.is_active and p.status = 'active') as sellable,
           public.compute_unit_price(p.price, p.sale_price, v.price, v.sale_price) as unit_price,
           coalesce(v.price, p.price) as compare_at_price,
           p.cost_price,
           (select i.url from public.product_images i where i.product_id = p.id
              order by i.position, i.created_at limit 1) as image_url
    from requested q
    left join public.product_variants v on v.id = q.variant_id
    left join public.products p on p.id = v.product_id
    where q.quantity > 0
    order by p.name nulls last, v.position
  loop
    declare
      v_issue text := null;
    begin
      if not r.found or not r.sellable then
        v_issue := 'unavailable';
      elsif r.stock_quantity < r.quantity then
        v_issue := case when r.stock_quantity = 0 then 'out_of_stock' else 'insufficient_stock' end;
      end if;

      if v_issue is null then
        v_subtotal := v_subtotal + r.unit_price * r.quantity;
        v_item_count := v_item_count + r.quantity;
      else
        v_issue_count := v_issue_count + 1;
      end if;

      v_lines := v_lines || jsonb_build_object(
        'variant_id', r.variant_id,
        'product_id', r.product_id,
        'category_id', r.category_id,
        'product_name', coalesce(r.product_name, 'Unavailable item'),
        'product_slug', r.product_slug,
        'variant_title', r.variant_title,
        'options', coalesce(r.options, '{}'::jsonb),
        'sku', r.sku,
        'image_url', r.image_url,
        'unit_price', r.unit_price,
        'compare_at_price', r.compare_at_price,
        'unit_cost', r.cost_price,
        'quantity', r.quantity,
        'line_total', case when v_issue is null then r.unit_price * r.quantity else 0 end,
        'available_quantity', coalesce(r.stock_quantity, 0),
        'issue', v_issue
      );
    end;
  end loop;

  -- Coupon
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into cp from public._evaluate_coupon(p_coupon_code, v_subtotal, p_user, p_lock);
    v_discount := coalesce(cp.discount, 0);
    v_coupon := jsonb_build_object(
      'id', cp.coupon_id, 'code', cp.code, 'discount', v_discount,
      'valid', cp.error is null, 'error', cp.error
    );
  end if;

  -- Shipping
  v_free := s.free_shipping_threshold is not null and (v_subtotal - v_discount) >= s.free_shipping_threshold;
  select coalesce(jsonb_agg(
           m || jsonb_build_object('price', case when v_free then 0 else (m ->> 'price')::numeric end)
         ), '[]'::jsonb)
    into v_methods
    from jsonb_array_elements(s.shipping_methods) m;

  select m into v_method from jsonb_array_elements(v_methods) m
    where m ->> 'id' = coalesce(p_shipping_method, v_methods -> 0 ->> 'id')
    limit 1;

  if v_item_count = 0 then
    v_shipping := 0;
  elsif v_method is null then
    raise exception 'INVALID_SHIPPING_METHOD' using errcode = '22023';
  else
    v_shipping := (v_method ->> 'price')::numeric;
  end if;

  return jsonb_build_object(
    'currency', s.currency,
    'lines', v_lines,
    'item_count', v_item_count,
    'issue_count', v_issue_count,
    'subtotal', v_subtotal,
    'discount_total', v_discount,
    'shipping_total', v_shipping,
    'tax_total', 0,
    'total', v_subtotal - v_discount + v_shipping,
    'shipping_method', v_method,
    'shipping_methods', v_methods,
    'free_shipping_threshold', s.free_shipping_threshold,
    'coupon', v_coupon
  );
end;
$$;

-- Public quote: anyone can price a cart. Never mutates anything.
create or replace function public.quote_cart(
  p_items jsonb, p_shipping_method text default null, p_coupon_code text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public._build_quote(p_items, p_shipping_method, p_coupon_code, auth.uid(), false);
$$;

-- ---------------------------------------------------------------------------
-- Order placement
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := p_payload ->> 'idempotency_key';
  v_payment_method text := p_payload ->> 'payment_method';
  v_contact jsonb := p_payload -> 'contact';
  v_address jsonb := p_payload -> 'address';
  s public.store_settings%rowtype;
  v_existing public.orders%rowtype;
  v_quote jsonb;
  v_order public.orders%rowtype;
  v_line jsonb;
  v_coupon_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_key is null or char_length(v_key) not between 8 and 100 then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  -- Serialise retries of the same checkout submission.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_key, 0));

  select * into v_existing from public.orders where user_id = v_uid and idempotency_key = v_key;
  if found then
    return jsonb_build_object(
      'order_id', v_existing.id, 'order_number', v_existing.order_number,
      'total', v_existing.total, 'currency', v_existing.currency,
      'payment_method', v_existing.payment_method, 'duplicate', true
    );
  end if;

  perform public.enforce_rate_limit('place_order:' || v_uid::text, 10, 3600);

  select * into s from public.store_settings where id = 1;
  if v_payment_method = 'cod' and not s.cod_enabled then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = '22023';
  elsif v_payment_method = 'online' and not s.online_payments_enabled then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = '22023';
  elsif v_payment_method not in ('cod', 'online') or v_payment_method is null then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = '22023';
  end if;

  if coalesce(trim(v_contact ->> 'name'), '') = '' or coalesce(trim(v_contact ->> 'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or coalesce(trim(v_contact ->> 'phone'), '') = '' then
    raise exception 'INVALID_CONTACT' using errcode = '22023';
  end if;
  if coalesce(trim(v_address ->> 'line1'), '') = '' or coalesce(trim(v_address ->> 'city'), '') = ''
     or coalesce(trim(v_address ->> 'full_name'), '') = '' then
    raise exception 'INVALID_ADDRESS' using errcode = '22023';
  end if;

  v_quote := public._build_quote(
    p_payload -> 'items', p_payload ->> 'shipping_method', p_payload ->> 'coupon_code', v_uid, true
  );

  if (v_quote ->> 'issue_count')::integer > 0 then
    raise exception 'STOCK_UNAVAILABLE' using errcode = '22023',
      detail = (select jsonb_agg(jsonb_build_object('variant_id', l -> 'variant_id', 'issue', l -> 'issue',
                                                   'available', l -> 'available_quantity'))
                from jsonb_array_elements(v_quote -> 'lines') l where l ->> 'issue' is not null)::text;
  end if;
  if (v_quote ->> 'item_count')::integer = 0 then
    raise exception 'CART_EMPTY' using errcode = '22023';
  end if;
  if v_quote -> 'coupon' is not null and not (v_quote -> 'coupon' ->> 'valid')::boolean then
    raise exception '%', v_quote -> 'coupon' ->> 'error' using errcode = '22023';
  end if;
  v_coupon_id := nullif(v_quote -> 'coupon' ->> 'id', '')::uuid;

  insert into public.orders (
    user_id, idempotency_key, email, phone, customer_name, shipping_address,
    shipping_method, shipping_method_label, payment_method, payment_status, currency,
    subtotal, discount_total, shipping_total, tax_total, total, coupon_id, coupon_code, customer_note
  ) values (
    v_uid, v_key,
    lower(trim(v_contact ->> 'email')), left(trim(v_contact ->> 'phone'), 32), left(trim(v_contact ->> 'name'), 120),
    jsonb_build_object(
      'full_name', left(trim(v_address ->> 'full_name'), 120),
      'phone', left(trim(coalesce(v_address ->> 'phone', v_contact ->> 'phone')), 32),
      'line1', left(trim(v_address ->> 'line1'), 200),
      'line2', left(trim(coalesce(v_address ->> 'line2', '')), 200),
      'city', left(trim(v_address ->> 'city'), 80),
      'state', left(trim(coalesce(v_address ->> 'state', '')), 80),
      'postal_code', left(trim(coalesce(v_address ->> 'postal_code', '')), 20),
      'country', upper(left(trim(coalesce(v_address ->> 'country', 'PK')), 2))
    ),
    v_quote -> 'shipping_method' ->> 'id', v_quote -> 'shipping_method' ->> 'label',
    v_payment_method,
    case when v_payment_method = 'online' then 'pending' else 'unpaid' end,
    v_quote ->> 'currency',
    (v_quote ->> 'subtotal')::numeric, (v_quote ->> 'discount_total')::numeric,
    (v_quote ->> 'shipping_total')::numeric, 0, (v_quote ->> 'total')::numeric,
    v_coupon_id, v_quote -> 'coupon' ->> 'code',
    nullif(left(trim(coalesce(p_payload ->> 'customer_note', '')), 500), '')
  )
  returning * into v_order;

  perform set_config('app.inventory_reason', 'order', true);
  perform set_config('app.inventory_order_id', v_order.id::text, true);

  for v_line in select * from jsonb_array_elements(v_quote -> 'lines') loop
    insert into public.order_items (
      order_id, product_id, variant_id, category_id, product_name, product_slug, variant_title,
      options, sku, image_url, unit_price, unit_cost, quantity, line_total
    ) values (
      v_order.id, (v_line ->> 'product_id')::uuid, (v_line ->> 'variant_id')::uuid,
      nullif(v_line ->> 'category_id', '')::uuid,
      v_line ->> 'product_name', v_line ->> 'product_slug', v_line ->> 'variant_title',
      v_line -> 'options', v_line ->> 'sku', v_line ->> 'image_url',
      (v_line ->> 'unit_price')::numeric, nullif(v_line ->> 'unit_cost', '')::numeric,
      (v_line ->> 'quantity')::integer, (v_line ->> 'line_total')::numeric
    );

    -- Rows are locked; the CHECK (stock_quantity >= 0) is the last line of defence.
    update public.product_variants
      set stock_quantity = stock_quantity - (v_line ->> 'quantity')::integer
      where id = (v_line ->> 'variant_id')::uuid;

    update public.products
      set sold_count = sold_count + (v_line ->> 'quantity')::integer
      where id = (v_line ->> 'product_id')::uuid;
  end loop;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, amount)
    values (v_coupon_id, v_order.id, v_uid, v_order.discount_total);
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, note)
  values (v_order.id, null, 'pending', v_uid, 'Order placed');

  -- Remove purchased variants from the saved cart.
  delete from public.cart_items ci
    using public.carts c
    where ci.cart_id = c.id and c.user_id = v_uid
      and ci.variant_id in (select (l ->> 'variant_id')::uuid from jsonb_array_elements(v_quote -> 'lines') l);

  return jsonb_build_object(
    'order_id', v_order.id, 'order_number', v_order.order_number,
    'total', v_order.total, 'currency', v_order.currency,
    'payment_method', v_order.payment_method, 'duplicate', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Order state machine
-- ---------------------------------------------------------------------------
create or replace function public.order_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('pending', 'confirmed'), ('pending', 'cancelled'),
    ('confirmed', 'processing'), ('confirmed', 'shipped'), ('confirmed', 'cancelled'),
    ('processing', 'shipped'), ('processing', 'cancelled'),
    ('shipped', 'delivered'), ('shipped', 'returned'),
    ('delivered', 'returned')
  );
$$;

-- Internal: put stock back, release coupon, reverse popularity.
create or replace function public._restock_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  it record;
begin
  perform set_config('app.inventory_reason', p_reason, true);
  perform set_config('app.inventory_order_id', p_order_id::text, true);

  for it in
    select variant_id, product_id, quantity from public.order_items
    where order_id = p_order_id and variant_id is not null
    order by variant_id
  loop
    update public.product_variants set stock_quantity = stock_quantity + it.quantity where id = it.variant_id;
    update public.products set sold_count = greatest(sold_count - it.quantity, 0) where id = it.product_id;
  end loop;
end;
$$;

create or replace function public._release_coupon(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon uuid;
begin
  delete from public.coupon_redemptions where order_id = p_order_id returning coupon_id into v_coupon;
  if v_coupon is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = v_coupon;
  end if;
end;
$$;

-- Internal transition used by staff, customers and payment webhooks.
create or replace function public._transition_order(
  p_order_id uuid, p_to text, p_actor uuid, p_note text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  v_from text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := o.status;
  if o.status = p_to then
    return o;
  end if;
  if not public.order_transition_allowed(o.status, p_to) then
    raise exception 'INVALID_STATUS_TRANSITION: % -> %', o.status, p_to using errcode = '22023';
  end if;
  if o.payment_method = 'online' and p_to in ('confirmed', 'processing', 'shipped', 'delivered')
     and o.payment_status not in ('paid', 'partially_refunded') then
    raise exception 'PAYMENT_NOT_VERIFIED' using errcode = '22023';
  end if;

  if p_to = 'cancelled' then
    perform public._restock_order(o.id, 'cancellation');
    perform public._release_coupon(o.id);
  elsif p_to = 'returned' then
    perform public._restock_order(o.id, 'return');
  end if;

  update public.orders
    set status = p_to,
        cancelled_reason = case when p_to = 'cancelled' then coalesce(p_note, cancelled_reason) else cancelled_reason end,
        payment_status = case
          when p_to = 'cancelled' and payment_status in ('pending', 'unpaid') and payment_method = 'online' then 'failed'
          else payment_status end
    where id = o.id
    returning * into o;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, note)
  values (o.id, v_from, p_to, p_actor, left(p_note, 500));
  return o;
end;
$$;

-- Staff: change fulfilment status.
create or replace function public.admin_update_order_status(
  p_order_id uuid, p_status text, p_note text default null,
  p_tracking_number text default null, p_tracking_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  v_from text;
begin
  perform public.assert_permission('orders');
  select status into v_from from public.orders where id = p_order_id;
  o := public._transition_order(p_order_id, p_status, auth.uid(), p_note);

  if p_tracking_number is not null or p_tracking_url is not null then
    update public.orders
      set tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
          tracking_url = coalesce(nullif(trim(p_tracking_url), ''), tracking_url)
      where id = p_order_id
      returning * into o;
  end if;

  perform public.write_audit('status_change', 'orders', p_order_id::text,
    jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));
  return jsonb_build_object('id', o.id, 'status', o.status, 'payment_status', o.payment_status);
end;
$$;

-- Customer: cancel own order while it is still pending and not paid online.
create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if o.status <> 'pending' or o.payment_status in ('paid', 'partially_refunded') then
    raise exception 'ORDER_NOT_CANCELLABLE' using errcode = '22023';
  end if;
  o := public._transition_order(o.id, 'cancelled', auth.uid(),
         coalesce(nullif(left(trim(p_reason), 300), ''), 'Cancelled by customer'));
  return jsonb_build_object('id', o.id, 'status', o.status);
end;
$$;

create or replace function public.admin_add_order_note(p_order_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.assert_permission('orders');
  insert into public.order_notes (order_id, author_id, body)
  values (p_order_id, auth.uid(), trim(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

-- Staff: record cash collected for a COD order. Online orders are only marked
-- paid by a verified gateway event (record_gateway_payment).
create or replace function public.admin_record_cod_payment(p_order_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  perform public.assert_permission('orders');
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if o.payment_method <> 'cod' then
    raise exception 'ONLINE_PAYMENT_REQUIRES_GATEWAY_VERIFICATION' using errcode = '42501';
  end if;
  if o.status in ('cancelled', 'returned') then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = '22023';
  end if;
  if o.payment_status <> 'unpaid' then
    raise exception 'ALREADY_PAID' using errcode = '22023';
  end if;
  if p_amount is distinct from o.total then
    raise exception 'AMOUNT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.payments (order_id, provider, kind, status, amount, currency, recorded_by)
  values (o.id, 'cod', 'charge', 'succeeded', p_amount, o.currency, auth.uid());
  update public.orders set payment_status = 'paid', paid_total = p_amount where id = o.id;

  perform public.write_audit('cod_payment_recorded', 'orders', o.id::text, jsonb_build_object('amount', p_amount));
  return jsonb_build_object('id', o.id, 'payment_status', 'paid');
end;
$$;

-- Server (service role): link a gateway checkout session to an order.
create or replace function public.attach_payment_session(
  p_order_id uuid, p_provider text, p_provider_ref text, p_checkout_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.payment_method <> 'online' or o.payment_status not in ('pending', 'failed') then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = '22023';
  end if;
  -- Same session handed back again (gateway idempotency on a retried submit).
  if exists (select 1 from public.payments where provider = p_provider and kind = 'charge'
             and provider_ref = p_provider_ref and order_id = o.id and status = 'pending') then
    return;
  end if;
  -- Older open sessions for this order are superseded.
  update public.payments set status = 'cancelled'
    where order_id = o.id and kind = 'charge' and status = 'pending';
  insert into public.payments (order_id, provider, kind, status, amount, currency, provider_ref, checkout_url)
  values (o.id, p_provider, 'charge', 'pending', o.total, o.currency, p_provider_ref, p_checkout_url);
  update public.orders set payment_status = 'pending' where id = o.id;
end;
$$;

-- Server (service role): apply a verified gateway event exactly once.
-- p_outcome: 'succeeded' | 'failed' | 'expired'
create or replace function public.record_gateway_payment(
  p_provider text, p_event_id text, p_event_type text, p_order_id uuid,
  p_provider_ref text, p_amount numeric, p_currency text, p_outcome text, p_failure_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  v_inserted integer;
  v_result text;
begin
  insert into public.payment_webhook_events (provider, event_id, event_type, order_id, outcome)
  values (p_provider, p_event_id, p_event_type, p_order_id, 'processing')
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found or o.payment_method <> 'online' then
    v_result := 'order_not_found';
  elsif p_outcome = 'succeeded' then
    if o.payment_status in ('paid', 'partially_refunded', 'refunded') then
      v_result := 'already_paid';
    elsif p_amount is distinct from o.total or upper(p_currency) is distinct from o.currency then
      update public.payments set status = 'failed', failure_reason = 'Amount or currency mismatch'
        where provider = p_provider and kind = 'charge' and provider_ref = p_provider_ref;
      perform public.write_audit('payment_mismatch', 'orders', o.id::text, jsonb_build_object(
        'expected', o.total, 'received', p_amount, 'currency', p_currency, 'event', p_event_id));
      v_result := 'amount_mismatch';
    else
      insert into public.payments (order_id, provider, kind, status, amount, currency, provider_ref)
      values (o.id, p_provider, 'charge', 'succeeded', p_amount, o.currency, p_provider_ref)
      on conflict (provider, kind, provider_ref) where provider_ref is not null
      do update set status = 'succeeded', amount = excluded.amount, failure_reason = null;
      update public.orders set payment_status = 'paid', paid_total = p_amount where id = o.id;

      if o.status = 'pending' then
        perform public._transition_order(o.id, 'confirmed', null, 'Online payment verified');
        v_result := 'paid';
      else
        -- Paid after the order was cancelled (e.g. session expired): needs a refund.
        perform public.write_audit('paid_after_cancellation', 'orders', o.id::text,
          jsonb_build_object('event', p_event_id, 'amount', p_amount));
        v_result := 'paid_after_cancellation';
      end if;
    end if;
  elsif p_outcome = 'failed' then
    update public.payments set status = 'failed', failure_reason = left(p_failure_reason, 300)
      where provider = p_provider and kind = 'charge' and provider_ref = p_provider_ref and status = 'pending';
    if o.payment_status = 'pending' then
      update public.orders set payment_status = 'failed' where id = o.id;
    end if;
    v_result := 'failed';
  elsif p_outcome = 'expired' then
    update public.payments set status = 'cancelled', failure_reason = 'Checkout session expired'
      where provider = p_provider and kind = 'charge' and provider_ref = p_provider_ref and status = 'pending';
    -- Only cancel when no other payment attempt is still open or succeeded.
    if o.status = 'pending' and o.payment_status in ('pending', 'failed')
       and not exists (select 1 from public.payments p where p.order_id = o.id and p.kind = 'charge'
                       and p.status in ('pending', 'succeeded')) then
      perform public._transition_order(o.id, 'cancelled', null, 'Payment not completed');
      v_result := 'cancelled';
    else
      v_result := 'ignored';
    end if;
  else
    raise exception 'INVALID_OUTCOME' using errcode = '22023';
  end if;

  update public.payment_webhook_events set outcome = v_result
    where provider = p_provider and event_id = p_event_id;
  return v_result;
end;
$$;

-- Internal: apply a refund that has already happened (cash returned, or the
-- gateway confirmed it).
create or replace function public._apply_refund(
  p_order_id uuid, p_amount numeric, p_reason text, p_provider text, p_provider_ref text, p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > o.paid_total - o.refunded_total then
    raise exception 'INVALID_REFUND_AMOUNT' using errcode = '22023';
  end if;

  insert into public.payments (order_id, provider, kind, status, amount, currency, provider_ref, recorded_by, metadata)
  values (o.id, p_provider, 'refund', 'succeeded', p_amount, o.currency, p_provider_ref, p_actor,
          jsonb_build_object('reason', left(p_reason, 300)));

  update public.orders
    set refunded_total = refunded_total + p_amount,
        payment_status = case when refunded_total + p_amount >= paid_total then 'refunded' else 'partially_refunded' end
    where id = o.id
    returning * into o;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_actor, 'refund_recorded', 'orders', o.id::text,
          jsonb_build_object('amount', p_amount, 'provider', p_provider, 'reason', p_reason));

  return jsonb_build_object('id', o.id, 'refunded_total', o.refunded_total, 'payment_status', o.payment_status);
end;
$$;

-- Staff: record a refund paid outside a gateway (cash on delivery orders).
create or replace function public.admin_record_manual_refund(p_order_id uuid, p_amount numeric, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permission('orders');
  if (select payment_method from public.orders where id = p_order_id) <> 'cod' then
    raise exception 'ONLINE_REFUNDS_GO_THROUGH_GATEWAY' using errcode = '42501';
  end if;
  return public._apply_refund(p_order_id, p_amount, p_reason, 'manual', null, auth.uid());
end;
$$;

-- Server (service role): record a refund confirmed by the payment gateway.
create or replace function public.record_gateway_refund(
  p_order_id uuid, p_amount numeric, p_reason text, p_provider text, p_provider_ref text, p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.payments where provider = p_provider and kind = 'refund' and provider_ref = p_provider_ref) then
    return jsonb_build_object('id', p_order_id, 'duplicate', true);
  end if;
  return public._apply_refund(p_order_id, p_amount, p_reason, p_provider, p_provider_ref, p_actor);
end;
$$;

-- Server (service role / pg_cron): cancel online orders left unpaid.
create or replace function public.expire_stale_online_orders(p_minutes integer default 120)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  v_count integer := 0;
begin
  for o in
    select id from public.orders
    where payment_method = 'online' and status = 'pending' and payment_status in ('pending', 'failed')
      and placed_at < now() - make_interval(mins => p_minutes)
    order by placed_at
    for update skip locked
  loop
    perform public._transition_order(o.id, 'cancelled', null, 'Payment window expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff: stock adjustment with a reason (restock / adjustment).
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_stock(
  p_variant_id uuid, p_change integer, p_reason text, p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_after integer;
begin
  perform public.assert_permission('products');
  if p_reason not in ('restock', 'adjustment') or p_change = 0 then
    raise exception 'INVALID_ADJUSTMENT' using errcode = '22023';
  end if;
  perform set_config('app.inventory_reason', p_reason, true);
  perform set_config('app.inventory_note', coalesce(left(p_note, 300), ''), true);
  update public.product_variants
    set stock_quantity = stock_quantity + p_change
    where id = p_variant_id
    returning stock_quantity into v_after;
  if not found then
    raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_after;
exception
  when check_violation then
    raise exception 'STOCK_CANNOT_GO_NEGATIVE' using errcode = '22023';
end;
$$;

-- Admin: assign roles and permissions.
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text, p_permissions text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_role not in ('customer', 'staff', 'admin') then
    raise exception 'INVALID_ROLE' using errcode = '22023';
  end if;
  update public.profiles
    set role = p_role,
        permissions = case when p_role = 'staff' then coalesce(p_permissions, '{}') else '{}' end
    where id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;
