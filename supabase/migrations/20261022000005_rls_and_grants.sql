-- =============================================================================
-- Row Level Security and privileges.
-- Every table in the exposed schema has RLS enabled. Writes that need business
-- rules (orders, payments, stock, Q&A, reviews) go through SECURITY DEFINER
-- functions that check permissions themselves; the tables do not get direct
-- write policies for those operations.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.reviews enable row level security;
alter table public.product_questions enable row level security;
alter table public.product_answers enable row level security;
alter table public.content_reports enable row level security;
alter table public.support_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.email_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_permission('customers') or public.has_permission('orders'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Store settings: public read, settings permission to update
-- ---------------------------------------------------------------------------
create policy store_settings_read on public.store_settings for select to anon, authenticated using (true);
create policy store_settings_update on public.store_settings for update to authenticated
  using (public.has_permission('settings')) with check (public.has_permission('settings'));

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create policy categories_read on public.categories for select to anon, authenticated
  using (is_visible or public.has_permission('products'));
create policy categories_write on public.categories for all to authenticated
  using (public.has_permission('products')) with check (public.has_permission('products'));

create policy products_read on public.products for select to anon, authenticated
  using (status = 'active' or public.has_permission('products'));
create policy products_write on public.products for all to authenticated
  using (public.has_permission('products')) with check (public.has_permission('products'));

create policy product_variants_read on public.product_variants for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.has_permission('products')
  );
create policy product_variants_write on public.product_variants for all to authenticated
  using (public.has_permission('products')) with check (public.has_permission('products'));

create policy product_images_read on public.product_images for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
    or public.has_permission('products')
  );
create policy product_images_write on public.product_images for all to authenticated
  using (public.has_permission('products')) with check (public.has_permission('products'));

-- ---------------------------------------------------------------------------
-- Customer-owned data
-- ---------------------------------------------------------------------------
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy carts_own on public.carts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy cart_items_own on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Orders (read only; changes go through functions)
-- ---------------------------------------------------------------------------
create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('orders'));

create policy order_items_read on public.order_items for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or public.has_permission('orders')
  );

create policy order_status_history_read on public.order_status_history for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or public.has_permission('orders')
  );

create policy order_notes_staff on public.order_notes for select to authenticated
  using (public.has_permission('orders'));

create policy payments_read on public.payments for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or public.has_permission('orders')
  );

create policy payment_webhook_events_staff on public.payment_webhook_events for select to authenticated
  using (public.has_permission('orders'));

create policy coupon_redemptions_read on public.coupon_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('coupons') or public.has_permission('orders'));

create policy coupons_staff on public.coupons for all to authenticated
  using (public.has_permission('coupons')) with check (public.has_permission('coupons'));

create policy inventory_movements_staff on public.inventory_movements for select to authenticated
  using (public.has_permission('products'));

-- ---------------------------------------------------------------------------
-- Reviews & Q&A
-- ---------------------------------------------------------------------------
create policy reviews_read on public.reviews for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()) or public.has_permission('support'));
create policy reviews_delete_own on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('support'));

create policy product_questions_read on public.product_questions for select to anon, authenticated
  using (status = 'answered' or user_id = (select auth.uid()) or public.has_permission('support'));
create policy product_questions_staff_update on public.product_questions for update to authenticated
  using (public.has_permission('support')) with check (public.has_permission('support'));
create policy product_questions_delete on public.product_questions for delete to authenticated
  using (public.has_permission('support') or (user_id = (select auth.uid()) and status = 'pending'));

create policy product_answers_read on public.product_answers for select to anon, authenticated
  using (
    exists (select 1 from public.product_questions q where q.id = question_id
            and (q.status = 'answered' or q.user_id = (select auth.uid())))
    or public.has_permission('support')
  );
create policy product_answers_staff_update on public.product_answers for update to authenticated
  using (public.has_permission('support')) with check (public.has_permission('support'));
create policy product_answers_staff_delete on public.product_answers for delete to authenticated
  using (public.has_permission('support'));

create policy content_reports_staff on public.content_reports for select to authenticated
  using (public.has_permission('support'));
create policy content_reports_staff_update on public.content_reports for update to authenticated
  using (public.has_permission('support')) with check (public.has_permission('support'));

-- ---------------------------------------------------------------------------
-- Support, newsletter, logs
-- ---------------------------------------------------------------------------
create policy support_messages_read on public.support_messages for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('support') or public.has_permission('customers'));
create policy support_messages_staff_update on public.support_messages for update to authenticated
  using (public.has_permission('support')) with check (public.has_permission('support'));

create policy newsletter_staff on public.newsletter_subscribers for select to authenticated
  using (public.has_permission('customers'));

create policy email_logs_staff on public.email_logs for select to authenticated
  using (public.has_permission('orders'));

create policy audit_logs_admin on public.audit_logs for select to authenticated
  using (public.is_admin());

-- rate_limits: no policies -> only SECURITY DEFINER functions and the service role.

-- ---------------------------------------------------------------------------
-- Table privileges (explicit, so behaviour does not depend on project defaults)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.store_settings, public.categories, public.products, public.product_variants,
  public.product_images, public.reviews, public.product_questions, public.product_answers
  to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant update on public.store_settings to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants,
  public.product_images to authenticated;
grant select, insert, update, delete on public.addresses, public.carts, public.cart_items to authenticated;
grant select on public.orders, public.order_items, public.order_status_history, public.order_notes,
  public.payments, public.payment_webhook_events, public.coupon_redemptions,
  public.inventory_movements, public.content_reports, public.support_messages,
  public.newsletter_subscribers, public.email_logs, public.audit_logs to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant update, delete on public.product_questions, public.product_answers to authenticated;
grant delete on public.reviews to authenticated;
grant update on public.content_reports, public.support_messages to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Customers can only update harmless profile columns.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, marketing_opt_in) on public.profiles to authenticated;
-- Admin role changes go through admin_set_user_role().

-- ---------------------------------------------------------------------------
-- Function privileges. Postgres grants EXECUTE to PUBLIC by default; remove it
-- and grant back only what each audience needs.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Used inside RLS policies and by the app for UI decisions.
grant execute on function public.current_user_role(), public.is_staff(), public.is_admin(),
  public.has_permission(text) to anon, authenticated;
grant execute on function public.compute_unit_price(numeric, numeric, numeric, numeric) to anon, authenticated;

-- Storefront
grant execute on function public.catalog_search(text, text, numeric, numeric, text, boolean, boolean, integer, integer)
  to anon, authenticated;
grant execute on function public.quote_cart(jsonb, text, text) to anon, authenticated;

-- Signed-in customers
grant execute on function public.place_order(jsonb) to authenticated;
grant execute on function public.cancel_my_order(uuid, text) to authenticated;
grant execute on function public.submit_review(uuid, integer, text, text) to authenticated;
grant execute on function public.can_review_product(uuid) to authenticated;
grant execute on function public.ask_question(uuid, text, uuid) to authenticated;
grant execute on function public.report_content(text, uuid, text) to authenticated;

-- Staff (each checks its own permission)
grant execute on function public.admin_update_order_status(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_add_order_note(uuid, text) to authenticated;
grant execute on function public.admin_record_cod_payment(uuid, numeric) to authenticated;
grant execute on function public.admin_record_manual_refund(uuid, numeric, text) to authenticated;
grant execute on function public.admin_adjust_stock(uuid, integer, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text, text[]) to authenticated;
grant execute on function public.admin_sales_report(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_list_customers(text, integer, integer) to authenticated;
grant execute on function public.answer_question(uuid, text) to authenticated;
grant execute on function public.moderate_question(uuid, text) to authenticated;
grant execute on function public.moderate_review(uuid, text) to authenticated;

-- Server only (service role): payment gateway and maintenance.
grant execute on all functions in schema public to service_role;
-- (attach_payment_session, record_gateway_payment, record_gateway_refund,
--  expire_stale_online_orders, check_rate_limit are not granted to anon/authenticated.)

-- Future objects: do not auto-grant to client roles.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
