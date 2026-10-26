-- Option filters for the storefront catalog: shoppers can narrow a category by
-- variant options such as Size, Color or Fits (the phone model a case is made for).
-- catalog_search gains p_options, e.g. {"Size": ["M", "L"], "Fits": ["iPhone 15"]}:
-- a product matches when, for every option named, one of its active variants
-- carries one of the listed values. catalog_option_facets lists the values on
-- offer in a category so the filter panel only shows choices that exist.

drop function if exists public.catalog_search(text, text, numeric, numeric, text, boolean, boolean, integer, integer);

create or replace function public.catalog_search(
  p_query text default null,
  p_category_slug text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_sort text default 'newest',
  p_in_stock boolean default false,
  p_featured boolean default false,
  p_limit integer default 24,
  p_offset integer default 0,
  p_options jsonb default null
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
      and (p_options is null or jsonb_typeof(p_options) <> 'object' or not exists (
        select 1 from jsonb_each(p_options) o(name, vals)
        where jsonb_typeof(o.vals) = 'array' and jsonb_array_length(o.vals) > 0
          and not exists (
            select 1 from public.product_variants pv
            where pv.product_id = p.id and pv.is_active
              and pv.options ->> o.name in (select jsonb_array_elements_text(o.vals))
          )
      ))
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

grant execute on function public.catalog_search(text, text, numeric, numeric, text, boolean, boolean, integer, integer, jsonb)
  to anon, authenticated;

create or replace function public.catalog_option_facets(p_category_slug text default null)
returns table (name text, value text, product_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive cat_tree as (
    select c.id from public.categories c where p_category_slug is not null and c.slug = p_category_slug
    union all
    select c.id from public.categories c join cat_tree t on c.parent_id = t.id
  )
  select o.key, o.value, count(distinct p.id)
  from public.products p
  join public.product_variants pv on pv.product_id = p.id and pv.is_active
  cross join lateral jsonb_each_text(pv.options) o
  where p.status = 'active'
    and (p_category_slug is null or p.category_id in (select cat_tree.id from cat_tree))
  group by o.key, o.value
  order by o.key, min(pv.position), o.value;
$$;

grant execute on function public.catalog_option_facets(text) to anon, authenticated;
