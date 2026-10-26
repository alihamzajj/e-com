-- Review photos: verified buyers can attach up to 4 photos to their review.
--   Files live in the public catalog bucket under reviews/<user_id>/<file>, and
--   storage RLS lets each customer write only inside their own folder.
--   reviews.photos keeps the storage paths; the app turns them into public URLs.
--   submit_review gains p_photos (null keeps a review's existing photos, an
--   empty array removes them) and checks every path belongs to the caller.

alter table public.reviews
  add column if not exists photos text[] not null default '{}'
  check (cardinality(photos) <= 4);

drop function if exists public.submit_review(uuid, integer, text, text);

create or replace function public.submit_review(
  p_product_id uuid, p_rating integer, p_title text, p_body text, p_photos text[] default null
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
  v_path text;
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
  if p_photos is not null then
    if cardinality(p_photos) > 4 then
      raise exception 'TOO_MANY_PHOTOS' using errcode = '22023';
    end if;
    foreach v_path in array p_photos loop
      if v_path is null or v_path !~ ('^reviews/' || v_uid::text || '/[0-9a-f-]{36}\.(jpg|png|webp|avif)$') then
        raise exception 'INVALID_PHOTO' using errcode = '22023';
      end if;
    end loop;
  end if;

  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Verified buyer') into v_name
    from public.profiles where id = v_uid;

  insert into public.reviews (product_id, user_id, order_id, author_name, rating, title, body, photos)
  values (p_product_id, v_uid, v_order, coalesce(v_name, 'Verified buyer'), p_rating,
          nullif(left(trim(p_title), 120), ''), nullif(left(trim(p_body), 3000), ''), coalesce(p_photos, '{}'))
  on conflict (product_id, user_id) do update
    set rating = excluded.rating, title = excluded.title, body = excluded.body,
        photos = case when p_photos is null then public.reviews.photos else excluded.photos end
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.submit_review(uuid, integer, text, text, text[]) to authenticated;

-- Customers upload and remove photos in their own reviews/<user_id>/ folder only.
create policy catalog_review_photo_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog'
    and (storage.foldername(name))[1] = 'reviews'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy catalog_review_photo_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'catalog'
    and (storage.foldername(name))[1] = 'reviews'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Removing a file also needs read access to it.
create policy catalog_review_photo_select on storage.objects for select to authenticated
  using (
    bucket_id = 'catalog'
    and (storage.foldername(name))[1] = 'reviews'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
