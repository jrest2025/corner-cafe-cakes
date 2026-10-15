-- Corner Café cake emails: fewer, clearer emails (Online: received, confirmed, thank-you. Staff-entered: confirmed, thank-you).
-- Additive only: one new column, one new table, new functions, and small in-place edits to two existing functions.
-- No existing data is changed except the order page link (it pointed to /cakes instead of the order form).
--
-- 1. Staff-entered orders (walk-in, phone, WhatsApp, social, corporate) no longer get an automatic "Order received" email.
--    Staff can still send it on purpose with Send again.
-- 2. Hold the thank-you: a switch on the order stops the thank-you and review email (for a complaint or problem).
-- 3. Updated confirmation: staff send it after changing a confirmed order's collection details. Never automatic.
-- 4. Cross-selling cards: the approved cards from the group reservations emails, copied here so the cake system stands alone.
--    Shown only in the confirmation and thank-you emails, and only to customers whose latest email permission
--    was given with wording that covers Jack's Restaurants (set in app_config cross_sell_wording; nobody qualifies until then).
-- Rollback: drop the new functions and table, drop the column, and run the two in-place edits the other way round.

-- 1. No automatic "Order received" for staff-entered orders
do $m$
declare d text;
  a_old text := $x$  if p_kind like 'guest\_%' and coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return; end if;$x$;
  a_new text := $x$  if p_kind like 'guest\_%' and coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return; end if;
  -- Staff-entered orders: the customer is already talking to staff, so no automatic "Order received" (staff can still send it on purpose)
  if p_kind = 'guest_received' and not p_repeatable and exists (select 1 from public.orders where id = p_order and source <> 'online') then return; end if;$x$;
begin
  d := pg_get_functiondef('public._queue_email(uuid, text, text, boolean)'::regprocedure);
  if position(a_old in d) = 0 then raise exception '_queue_email: line not found, nothing changed'; end if;
  execute replace(d, a_old, a_new);
end $m$;

-- 2. Hold the thank-you
alter table public.orders add column if not exists hold_thanks boolean not null default false;

do $m$
declare d text;
  a_old text := $x$      and coalesce(o.contact_email, '') <> ''$x$;
  a_new text := $x$      and coalesce(o.contact_email, '') <> ''
      and not o.hold_thanks  -- staff held it (complaint or problem)$x$;
begin
  d := pg_get_functiondef('public.queue_thank_you_emails()'::regprocedure);
  if position(a_old in d) = 0 then raise exception 'queue_thank_you_emails: line not found, nothing changed'; end if;
  execute replace(d, a_old, a_new);
end $m$;

create or replace function public.staff_set_hold_thanks(p_order uuid, p_hold boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare o public.orders; v_name text;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Your login cannot change this.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('missing', 'That order was not found.'); end if;
  if o.hold_thanks = p_hold then return jsonb_build_object('ok', true, 'hold', p_hold); end if;
  update public.orders set hold_thanks = p_hold where id = p_order;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(p_order, auth.uid(), v_name, case when p_hold then 'thanks_held' else 'thanks_released' end, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'hold', p_hold);
end $f$;

-- 3. Updated confirmation, sent by staff on purpose
create or replace function public.staff_send_update(p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare o public.orders; v_name text;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Your login cannot send order emails.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null;
  if not found then return public._err('missing', 'That order was not found.'); end if;
  if o.order_status not in ('confirmed', 'awaiting_deposit') then return public._err('status', 'Only a confirmed order gets an updated confirmation.'); end if;
  if coalesce(o.contact_email, '') = '' then return public._err('no_email', 'This order has no email address.'); end if;
  if coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return public._err('off', 'Customer emails are switched off.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and status in ('pending', 'sending')) then
    return public._err('busy', 'An email for this order is already on its way.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and created_at > now() - interval '2 minutes') then
    return public._err('soon', 'An email went to this customer in the last 2 minutes. Wait a moment before sending again.'); end if;
  perform public._queue_email(p_order, 'guest_updated', o.contact_email, true);
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(p_order, auth.uid(), v_name, 'email_update_sent', jsonb_build_object('to', o.contact_email));
  return jsonb_build_object('ok', true, 'to', o.contact_email);
end $f$;

revoke execute on function public.staff_set_hold_thanks(uuid, boolean) from public, anon;
revoke execute on function public.staff_send_update(uuid) from public, anon;
grant execute on function public.staff_set_hold_thanks(uuid, boolean) to authenticated;
grant execute on function public.staff_send_update(uuid) to authenticated;

-- Send again also knows the updated confirmation
do $m$
declare d text;
  a_old text := $x$kind in ('guest_received', 'guest_quote', 'guest_confirmed', 'guest_deposit_needed', 'guest_declined', 'guest_cancelled')$x$;
  a_new text := $x$kind in ('guest_received', 'guest_quote', 'guest_confirmed', 'guest_updated', 'guest_deposit_needed', 'guest_declined', 'guest_cancelled')$x$;
begin
  d := pg_get_functiondef('public.staff_resend_email(uuid)'::regprocedure);
  if position(a_old in d) = 0 then raise exception 'staff_resend_email: line not found, nothing changed'; end if;
  execute replace(d, a_old, a_new);
end $m$;

-- 4. Cross-selling cards (approved copy from the group reservations emails; Corner Café's own cake card is left out)
create table if not exists public.promo_cards (
  code text primary key, venue_code text not null, title text not null, blurb text not null, image_url text, link_url text not null,
  link_label text not null, occasions text[], sort_order int not null default 100, is_active boolean not null default true,
  updated_at timestamptz not null default now());
alter table public.promo_cards enable row level security;
revoke all on public.promo_cards from anon, authenticated;
insert into public.promo_cards (code, venue_code, title, blurb, image_url, link_url, link_label, occasions, sort_order) values
 ('bonefish', 'bonefish', 'Bonefish Seafood Restaurant', 'Fresh seafood by the water on Port Denarau Marina, from kokoda to lobster.',
  'https://cdn.prod.website-files.com/6932473cba9fc286f207ea0b/6aca249cefb0fb0adbaa6126_20260508_TF_Bonefish-6%20(1)-p-1080.jpg', 'https://www.bonefishfiji.com/', 'Explore Bonefish', null, 10),
 ('cantina', 'cantina', 'Cantina Grill & Bar', 'Grills and cocktails on the marina, made for a long lunch or a sundowner.',
  'https://cdn.prod.website-files.com/68b554433da90fc7575a933e/6920fe6e9eefa4a9946eeaab_Facebook_Coverpage-p-1080.jpg', 'https://www.cantinafiji.com/', 'Explore Cantina', null, 11),
 ('indigo', 'indigo', 'Indigo Indian Asian Restaurant & Bar', 'Indian and Asian favourites, from rich curries to masala crab.',
  'https://cdn.prod.website-files.com/6a0e8dfbff6ba8aca30e7104/6a0e8fd518a6eab7468d2e27_indigo_Masala_Crab_hero%20-p-1080.jpg', 'https://www.indigofiji.com/', 'Explore Indigo', null, 12),
 ('mamacita', 'mamacita', 'Mamacita Mexican Restaurant & Bar', 'Sizzling fajitas, tacos and margaritas, made for sharing.',
  'https://cdn.prod.website-files.com/6a0f7b78bf6e7e71543c645f/6aac7876ae91a7b8a710df85_mamacita-fajita-p-1080.jpg', 'https://www.mamacitafiji.com/', 'Explore Mamacita', null, 13),
 ('chefs_catering_events', 'chefs_catering', 'Planning something bigger?', 'Private dining and events by Chefs Catering Fiji.',
  'https://cdn.prod.website-files.com/6a0afe25d2f1212db6f93a0e/6aab972372084335dbd5bac1_pdr-catering-1-p-1080.jpg', 'https://www.chefscateringfiji.com/enquire.html', 'Plan an event',
  array['Wedding', 'Office', 'Anniversary', 'Graduation'], 5)
on conflict (code) do nothing;

-- Which permission wording covers Jack's Restaurants offers (nobody qualifies until the new wording is in use)
insert into public.app_config (key, value) values ('cross_sell_wording', 'online-form-v2,staff-app-v2,staff-recorded-v2') on conflict (key) do nothing;

-- The email sender gets the cards and whether this customer may see them
do $m$
declare d text;
  a_old text := $x$    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails','review_link'))$x$;
  a_new text := $x$    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails','review_link')),
    'cross_sell_ok', coalesce((select mc.granted and mc.wording_code = any(string_to_array((select value from public.app_config where key = 'cross_sell_wording'), ','))
        from public.marketing_consents mc where mc.customer_id = o.customer_id and mc.brand_id = l.brand_id and mc.channel = 'email'
        order by mc.recorded_at desc limit 1), false),
    'promo_cards', coalesce((select jsonb_agg(to_jsonb(pc) order by pc.sort_order) from public.promo_cards pc where pc.is_active), '[]'::jsonb)$x$;
begin
  d := pg_get_functiondef('public.email_payload(uuid)'::regprocedure);
  if position(a_old in d) = 0 then raise exception 'email_payload: line not found, nothing changed'; end if;
  execute replace(d, a_old, a_new);
end $m$;

-- The order page link in emails pointed to the cakes page, not the order form
update public.locations set order_page_url = 'https://www.cornercafefiji.com/order-cake' where code = 'corner-cafe' and order_page_url = 'https://www.cornercafefiji.com/cakes';

-- 5. New permission wording: "Send me Corner Café cake specials and reminders, and offers from Jack's Restaurants".
--    New agreements are recorded under version 2 wording codes; earlier agreements keep their original wording code.
insert into public.consent_wordings (code, brand_id, wording, where_shown, notes, in_use_from)
select x.code, b.id, x.wording, x.where_shown, x.notes, current_date from public.brands b,
 (values
  ('online-form-v2', 'Send me Corner Café cake specials and reminders, and offers from Jack''s Restaurants', 'Online cake order form',
   'Covers Corner Café and the other Jack''s Restaurants. Recorded for WhatsApp and SMS on the mobile number, and email when one was given.'),
  ('staff-app-v2', 'Customer agrees to receive cake specials and reminders, and offers from Jack''s Restaurants', 'Staff app, new order',
   'Covers Corner Café and the other Jack''s Restaurants. Recorded for WhatsApp and SMS on the mobile number, and email when one was given.'),
  ('staff-recorded-v2', 'Staff recorded the customer''s own choice for the channel shown, covering Corner Café cake offers and offers from Jack''s Restaurants.', 'Staff app, customer profile', null)
 ) as x(code, wording, where_shown, notes)
where b.code = 'corner-cafe'
on conflict (code) do nothing;
do $m$
declare d text;
begin
  d := pg_get_functiondef('public._create_order(jsonb, order_source, uuid, text)'::regprocedure);
  if position($x$'staff-app-v1' else 'online-form-v1'$x$ in d) = 0 then raise exception '_create_order: wording line not found, nothing changed'; end if;
  execute replace(d, $x$'staff-app-v1' else 'online-form-v1'$x$, $x$'staff-app-v2' else 'online-form-v2'$x$);
  d := pg_get_functiondef('public.staff_set_channel_consent(uuid, text[], boolean, text, text)'::regprocedure);
  if position($x$'staff-recorded-v1'$x$ in d) = 0 then raise exception 'staff_set_channel_consent: wording line not found, nothing changed'; end if;
  execute replace(d, $x$'staff-recorded-v1'$x$, $x$'staff-recorded-v2'$x$);
end $m$;
