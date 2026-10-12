-- Security tidy-up, batch 1 (approved 12 October 2026). Additive and reversible.
-- 1. The public (anon) role keeps no table rights on tables created after the original revoke.
revoke all on table public.delivery_zones, public.kitchen_briefs, public.sheet_order_imports, public.order_amendments from anon;

-- 2. Fixed search path on the three functions the security advisor flagged.
alter function public.protect_events() set search_path = public;
alter function public.protect_amendments() set search_path = public;
alter function public._fmt_time(time without time zone) set search_path = public;

-- 3. Kitchen logins read orders only through the kitchen board, which carries no prices or payments.
--    Direct reads of orders, cake lines, activity history and sheet imports are limited to the other roles.
--    (Admin passes every has_role check.)
alter policy staff_read_orders on public.orders
  using (public.has_role('manager', 'front_of_house', 'finance', 'marketing'));
alter policy staff_read_items on public.order_items
  using (public.has_role('manager', 'front_of_house', 'finance', 'marketing'));
alter policy staff_read_events on public.order_events
  using (public.has_role('manager', 'front_of_house', 'finance', 'marketing'));
alter policy "staff read sheet imports" on public.sheet_order_imports
  using (public.has_role('manager', 'front_of_house', 'finance'));

-- 4. Indexes for foreign keys the performance advisor flagged.
create index if not exists staff_profiles_location_id_idx on public.staff_profiles (location_id);
create index if not exists customer_consents_recorded_by_idx on public.customer_consents (recorded_by);
create index if not exists orders_created_by_idx on public.orders (created_by);
create index if not exists orders_confirmed_by_idx on public.orders (confirmed_by);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_attachments_order_id_idx on public.order_attachments (order_id);
create index if not exists order_events_actor_id_idx on public.order_events (actor_id);
create index if not exists payments_recorded_by_idx on public.payments (recorded_by);
create index if not exists email_outbox_order_id_idx on public.email_outbox (order_id);
create index if not exists sheet_order_imports_order_id_idx on public.sheet_order_imports (order_id);

-- To undo item 3: alter each policy back to using (public.is_staff()).
