-- =============================================================================
-- Auth helpers, role protection, audit triggers, rate limiting.
-- =============================================================================

-- New auth user -> profile row. Role always starts as 'customer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their login email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Role checks. SECURITY DEFINER so they can read profiles regardless of RLS,
-- STABLE so Postgres can cache them per statement inside policies.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or (role = 'staff' and p_permission = any (permissions)))
  );
$$;

create or replace function public.assert_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(p_permission) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role escalation guard: only admins (or the service role / SQL editor, where
-- auth.uid() is null) can change role or permissions.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.permissions is distinct from old.permissions
      or new.id is distinct from old.id or new.email is distinct from old.email)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'FORBIDDEN: role, permissions and email can only be changed by an administrator'
      using errcode = '42501';
  end if;
  if auth.uid() is not null and auth.uid() = old.id and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'An administrator cannot remove their own admin role' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.profiles_guard_role();

create or replace function public.profiles_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := 'customer';
    new.permissions := '{}';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_insert before insert on public.profiles
  for each row execute function public.profiles_guard_insert();

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Generic row-change audit for admin-managed tables. Records changed columns only.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_old jsonb;
  v_new jsonb;
  v_key text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - 'search_vector';
    perform public.write_audit('create', tg_table_name, v_new ->> 'id', v_new);
    return new;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old) - 'search_vector';
    perform public.write_audit('delete', tg_table_name, v_old ->> 'id', v_old);
    return old;
  end if;

  v_old := to_jsonb(old) - 'search_vector' - 'updated_at';
  v_new := to_jsonb(new) - 'search_vector' - 'updated_at';
  for v_key in select jsonb_object_keys(v_new) loop
    if v_new -> v_key is distinct from v_old -> v_key then
      v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
    end if;
  end loop;
  if v_changes <> '{}'::jsonb then
    perform public.write_audit('update', tg_table_name, v_new ->> 'id', v_changes);
  end if;
  return new;
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_row_change();
create trigger audit_store_settings after update on public.store_settings
  for each row execute function public.audit_row_change();

create or replace function public.audit_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.permissions is distinct from old.permissions then
    perform public.write_audit('role_change', 'profiles', new.id::text, jsonb_build_object(
      'from', jsonb_build_object('role', old.role, 'permissions', old.permissions),
      'to', jsonb_build_object('role', new.role, 'permissions', new.permissions)
    ));
  end if;
  return new;
end;
$$;

create trigger audit_profiles_role after update on public.profiles
  for each row execute function public.audit_profile_role();

-- ---------------------------------------------------------------------------
-- Fixed-window rate limiter. Returns true when the call is allowed.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                 else r.hits + 1
               end,
        window_start = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                 else r.window_start
               end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

create or replace function public.enforce_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.check_rate_limit(p_key, p_max, p_window_seconds) then
    raise exception 'RATE_LIMITED' using errcode = 'P0429';
  end if;
end;
$$;
