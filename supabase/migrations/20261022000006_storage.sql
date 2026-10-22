-- =============================================================================
-- Storage: one public bucket for catalog and brand images.
--   products/<product_id>/<file>   -> products permission
--   categories/<category_id>/<file> -> products permission
--   store/<file>                    -> settings permission
-- Size and MIME type are enforced by the bucket and again by the server action.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy catalog_staff_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog' and (
      ((storage.foldername(name))[1] in ('products', 'categories') and public.has_permission('products'))
      or ((storage.foldername(name))[1] = 'store' and public.has_permission('settings'))
    )
  );

create policy catalog_staff_update on storage.objects for update to authenticated
  using (
    bucket_id = 'catalog' and (
      ((storage.foldername(name))[1] in ('products', 'categories') and public.has_permission('products'))
      or ((storage.foldername(name))[1] = 'store' and public.has_permission('settings'))
    )
  );

create policy catalog_staff_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'catalog' and (
      ((storage.foldername(name))[1] in ('products', 'categories') and public.has_permission('products'))
      or ((storage.foldername(name))[1] = 'store' and public.has_permission('settings'))
    )
  );

-- Staff can list files they manage; the public reads files by URL only.
create policy catalog_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'catalog' and public.is_staff());
