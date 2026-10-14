-- Google Sheet order mirror (business continuity).
-- The database stays the only master. A script inside the Google Sheet (in the owner's Drive) pulls a full,
-- read-only copy every minute through the sheet-mirror function and reports back. Additive only.

create table if not exists public.mirror_status (
  id int primary key default 1 check (id = 1),
  sheet_url text, sheet_title text,
  last_pull_at timestamptz, last_ack_at timestamptz, last_snapshot_at timestamptz,
  last_rows jsonb, last_error text, last_error_at timestamptz,
  updated_at timestamptz default now()
);
insert into public.mirror_status (id) values (1) on conflict (id) do nothing;
alter table public.mirror_status enable row level security;
revoke all on public.mirror_status from anon, authenticated;

-- Read-only access code used only by the Sheet's script (never shown to staff except an administrator setting it up)
insert into public.app_config (key, value) values ('mirror_key', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (key) do nothing;

create or replace function public._t12(t time) returns text language sql immutable as $$
  select case when t is null then '' else ltrim(to_char(t, 'FMHH12:MI'), '0') || lower(to_char(t, 'am')) end $$;

create or replace function public._status_label(s text) returns text language sql immutable as $$
  select case s when 'awaiting_review' then 'Check order' when 'awaiting_quote' then 'Needs a price' when 'awaiting_approval' then 'Waiting for approval'
    when 'awaiting_deposit' then 'Waiting for deposit' when 'confirmed' then 'Confirmed' when 'completed' then 'Handed over'
    when 'declined' then 'Declined' when 'cancelled' then 'Cancelled' else coalesce(s, '') end $$;

create or replace function public._stage_label(s text) returns text language sql immutable as $$
  select case s when 'not_started' then 'To start' when 'scheduled' then 'Scheduled' when 'preparing' then 'Preparing' when 'baking' then 'Baking'
    when 'assembling' then 'Assembling' when 'decorating' then 'Decorating' when 'in_production' then 'In production'
    when 'quality_check' then 'Quality check' when 'ready' then 'Ready' else coalesce(s, '') end $$;

-- Full snapshot: each tab is a header row plus rows, already sorted. Only service code can call it.
create or replace function public.mirror_snapshot() returns jsonb
language sql stable security definer set search_path to 'public' as $$
with t as (select (now() at time zone 'Pacific/Fiji')::date as today),
base as (
  select o.*, coalesce(nullif(trim(o.contact_name), ''), c.full_name, '') guest, coalesce(nullif(trim(o.contact_phone), ''), c.phone, '') phone,
    coalesce(nullif(trim(o.contact_email), ''), c.email, '') email, c.preferred_contact,
    i.product_name, i.variant, i.size_inch, i.quantity, i.finish, i.design_description, i.cake_message, i.candles, i.kitchen_notes,
    case when o.has_dietary then coalesce(nullif(concat_ws(', ', nullif(array_to_string(i.dietary, ', '), ''), nullif(i.dietary_note, '')), ''), 'Yes, see order') else 'None given' end diet,
    coalesce(o.final_total, o.estimate_total) total, coalesce((select sum(amount) from public.payments p where p.order_id = o.id), 0) paid,
    (select max(version) from public.kitchen_briefs k where k.order_id = o.id) slip_v,
    (select k.printed_confirmed_at is not null from public.kitchen_briefs k where k.order_id = o.id order by version desc limit 1) slip_printed
  from public.orders o left join public.customers c on c.id = o.customer_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by x.created_at limit 1) i on true
  where o.deleted_at is null and o.reference not like 'H-%' and not coalesce(o.is_test, false)
),
live as (select * from base where order_status not in ('declined', 'cancelled')),
cake as (select b.id, concat_ws(', ', coalesce(b.variant, b.product_name), b.size_inch || ' inch' || case when b.quantity > 1 then ' x ' || b.quantity else '' end) txt from base b)
select jsonb_build_object(
  'generated_at', now(),
  'generated_label', to_char(now() at time zone 'Pacific/Fiji', 'Dy DD Mon YYYY') || ', ' || public._t12((now() at time zone 'Pacific/Fiji')::time),
  'tabs', jsonb_build_object(
    'Today', (select jsonb_build_array(jsonb_build_array('Time', 'Order', 'Status', 'Collect or deliver', 'Guest', 'Phone', 'Cake', 'Inscription', 'Allergy or dietary', 'Kitchen stage', 'Slip', 'To pay', 'Notes'))
      || coalesce(jsonb_agg(jsonb_build_array(public._t12(b.required_time), b.reference, public._status_label(b.order_status::text), initcap(b.fulfilment_method), b.guest, b.phone, k.txt,
        coalesce(b.cake_message, ''), b.diet, public._stage_label(b.production_status::text), coalesce('v' || b.slip_v, 'Not printed'), greatest(b.total - b.paid, 0), coalesce(b.customer_notes, ''))
        order by b.required_time), '[]') from live b join cake k on k.id = b.id, t where b.required_date = t.today),
    'Upcoming', (select jsonb_build_array(jsonb_build_array('Date', 'Day', 'Time', 'Order', 'Status', 'Collect or deliver', 'Guest', 'Phone', 'Cake', 'Inscription', 'Allergy or dietary', 'Kitchen stage', 'Slip', 'To pay'))
      || coalesce(jsonb_agg(jsonb_build_array(to_char(b.required_date, 'YYYY-MM-DD'), to_char(b.required_date, 'Dy DD Mon'), public._t12(b.required_time), b.reference, public._status_label(b.order_status::text),
        initcap(b.fulfilment_method), b.guest, b.phone, k.txt, coalesce(b.cake_message, ''), b.diet, public._stage_label(b.production_status::text), coalesce('v' || b.slip_v, 'Not printed'), greatest(b.total - b.paid, 0))
        order by b.required_date, b.required_time), '[]') from live b join cake k on k.id = b.id, t where b.required_date > t.today and b.required_date <= t.today + 14 and b.order_status <> 'completed'),
    'Kitchen', (select jsonb_build_array(jsonb_build_array('Date', 'Day', 'Due', 'Ready by', 'Order', 'Cake', 'Flavour', 'Size', 'Quantity', 'Finish', 'Design', 'Inscription', 'Candles', 'Allergy or dietary', 'Kitchen notes', 'Stage', 'Slip', 'Slip printed'))
      || coalesce(jsonb_agg(jsonb_build_array(to_char(b.required_date, 'YYYY-MM-DD'), to_char(b.required_date, 'Dy DD Mon'), public._t12(b.required_time),
        public._t12(b.required_time - case when b.fulfilment_method = 'delivery' then interval '60 minutes' else interval '30 minutes' end), b.reference, b.product_name, coalesce(b.variant, ''),
        b.size_inch || ' inch', b.quantity, initcap(b.finish), coalesce(b.design_description, ''), coalesce(b.cake_message, ''), coalesce(b.candles, ''), b.diet, coalesce(b.kitchen_notes, ''),
        public._stage_label(b.production_status::text), coalesce('v' || b.slip_v, 'Not printed'), case when b.slip_printed then 'Yes' else 'No' end)
        order by b.required_date, b.required_time), '[]') from live b, t where b.order_status = 'confirmed' and b.required_date between t.today - 1 and t.today + 7),
    'All orders', (select jsonb_build_array(jsonb_build_array('Order', 'Created', 'Source', 'Status', 'Payment', 'Collect or deliver', 'Date', 'Time', 'Guest', 'Cake', 'Allergy or dietary', 'Total', 'Paid', 'Version', 'Last updated'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, to_char(b.created_at at time zone 'Pacific/Fiji', 'YYYY-MM-DD'), case b.source::text when 'online' then 'Website' when 'walk_in' then 'Walk-in' else initcap(replace(b.source::text, '_', ' ')) end,
        public._status_label(b.order_status::text), initcap(replace(b.payment_status::text, '_', ' ')), initcap(b.fulfilment_method), to_char(b.required_date, 'YYYY-MM-DD'), public._t12(b.required_time),
        b.guest, k.txt, b.diet, coalesce(b.total, 0), b.paid, b.version, to_char(b.updated_at at time zone 'Pacific/Fiji', 'YYYY-MM-DD') || ' ' || public._t12((b.updated_at at time zone 'Pacific/Fiji')::time))
        order by b.required_date desc, b.required_time desc), '[]') from base b join cake k on k.id = b.id),
    'Contacts', (select jsonb_build_array(jsonb_build_array('Order', 'Date', 'Guest', 'Phone', 'Email', 'Prefers'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, to_char(b.required_date, 'YYYY-MM-DD'), b.guest, b.phone, b.email, case b.preferred_contact when 'whatsapp' then 'WhatsApp' else initcap(coalesce(b.preferred_contact, '')) end)
        order by b.required_date, b.required_time), '[]') from live b, t where b.required_date >= t.today - 7 and b.order_status <> 'completed'),
    'Amendments', (select jsonb_build_array(jsonb_build_array('Order', 'Revision', 'When', 'By', 'Asked for by', 'Reason', 'What changed', 'Kitchen told'))
      || coalesce(jsonb_agg(jsonb_build_array(a.reference, a.revision, to_char(a.amended_at at time zone 'Pacific/Fiji', 'YYYY-MM-DD') || ' ' || public._t12((a.amended_at at time zone 'Pacific/Fiji')::time),
        coalesce(a.staff_label, ''), initcap(coalesce(a.requested_by, '')), coalesce(a.reason, ''),
        coalesce((select string_agg(coalesce(ch->>'label', ch->>'field', '') || ': ' || coalesce(ch->>'from', '') || ' to ' || coalesce(ch->>'to', ''), '; ') from jsonb_array_elements(case when jsonb_typeof(a.changes) = 'array' then a.changes else '[]' end) ch), ''),
        case when not coalesce(a.affects_kitchen, false) then 'Not needed' when a.kitchen_ack_at is not null then 'Yes, ' || coalesce(a.kitchen_ack_by, '') else 'Not yet' end)
        order by a.amended_at desc), '[]') from public.order_amendments a join public.orders o on o.id = a.order_id
        where o.deleted_at is null and not coalesce(o.is_test, false) and a.amended_at > now() - interval '90 days')
  ),
  'counts', jsonb_build_object('orders', (select count(*) from base), 'today', (select count(*) from live, t where required_date = t.today),
    'emails_failed', (select count(*) from public.email_outbox where status = 'failed' and attempts >= 5 and created_at > now() - interval '7 days'))
) $$;
revoke all on function public.mirror_snapshot() from public, anon, authenticated;

-- The Sheet's script reports what it wrote (or what went wrong)
create or replace function public.mirror_record(p_kind text, p_snapshot_at timestamptz, p_rows jsonb, p_error text, p_url text, p_title text) returns void
language sql security definer set search_path to 'public' as $$
  update public.mirror_status set
    last_pull_at = case when p_kind = 'pull' then now() else last_pull_at end,
    last_ack_at = case when p_kind = 'ack' and p_error is null then now() else last_ack_at end,
    last_snapshot_at = case when p_kind = 'ack' and p_error is null then p_snapshot_at else last_snapshot_at end,
    last_rows = case when p_kind = 'ack' and p_error is null then p_rows else last_rows end,
    last_error = case when p_kind = 'ack' then p_error else last_error end,
    last_error_at = case when p_kind = 'ack' and p_error is not null then now() else last_error_at end,
    sheet_url = coalesce(nullif(p_url, ''), sheet_url), sheet_title = coalesce(nullif(p_title, ''), sheet_title), updated_at = now()
  where id = 1 $$;
revoke all on function public.mirror_record(text, timestamptz, jsonb, text, text, text) from public, anon, authenticated;

-- Health for Settings: Connected and current / Delayed / Attention
create or replace function public.mirror_health() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare m public.mirror_status; v_age int; v_state text;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can see the backup status.'); end if;
  select * into m from public.mirror_status where id = 1;
  v_age := case when m.last_ack_at is null then null else extract(epoch from now() - m.last_ack_at)::int / 60 end;
  v_state := case when m.last_ack_at is null then 'not_set_up'
    when m.last_error_at is not null and m.last_error_at > m.last_ack_at then 'attention'
    when v_age <= 5 then 'current' when v_age <= 30 then 'delayed' else 'attention' end;
  return jsonb_build_object('ok', true, 'state', v_state, 'minutes', v_age, 'last_ack_at', m.last_ack_at, 'last_pull_at', m.last_pull_at,
    'last_error', m.last_error, 'last_error_at', m.last_error_at, 'rows', m.last_rows, 'sheet_url', m.sheet_url, 'sheet_title', m.sheet_title,
    'emails_failed', (select count(*) from public.email_outbox where status = 'failed' and attempts >= 5 and created_at > now() - interval '7 days'),
    'emails_waiting', (select count(*) from public.email_outbox where status in ('pending', 'sending') and created_at < now() - interval '10 minutes'),
    'is_admin', public.has_role('admin'));
end $$;
revoke all on function public.mirror_health() from public, anon;
grant execute on function public.mirror_health() to authenticated;

-- Administrators only: the access code to paste into the Sheet's script during setup
create or replace function public.mirror_setup_code() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an administrator can see the setup code.'); end if;
  return jsonb_build_object('ok', true, 'code', (select value from public.app_config where key = 'mirror_key'),
    'url', (select replace(value, '/send-emails', '/sheet-mirror') from public.app_config where key = 'function_url'));
end $$;
revoke all on function public.mirror_setup_code() from public, anon;
grant execute on function public.mirror_setup_code() to authenticated;

-- Administrators only: replace the access code (the old Sheet script stops working until the new code is pasted)
create or replace function public.mirror_new_code() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an administrator can change the setup code.'); end if;
  update public.app_config set value = encode(extensions.gen_random_bytes(24), 'hex') where key = 'mirror_key';
  insert into public.audit_log (table_name, row_id, action, actor_id) values ('app_config', 'mirror_key', 'rotated', auth.uid());
  return public.mirror_setup_code();
end $$;
revoke all on function public.mirror_new_code() from public, anon;
grant execute on function public.mirror_new_code() to authenticated;
