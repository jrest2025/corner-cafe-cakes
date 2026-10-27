-- Release F1 (28 Oct 2026): Cake Enquiries, phase 1. PREVIEW until "deploy".
-- New, separate tables: an enquiry is interest before an order. Orders, payments and customers are not changed.
-- Every change is written through the functions below (staff only) and leaves a dated event, so the funnel can later be
-- read from real events, not guessed from current statuses. Converting links an existing order to the enquiry; the order
-- itself is created by the normal New order screen.
-- Rollback: supabase/sql/release_f1_enquiries_20261028_rollback.sql (drops only the new objects).

create sequence if not exists public.enquiry_ref_seq start 1001;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('EQ-' || nextval('public.enquiry_ref_seq')),
  customer_id uuid references public.customers(id),
  contact_name text,
  contact_phone text,
  contact_phone_key text,
  contact_other text,
  source text not null default 'unknown'
    check (source in ('walk_in','phone','whatsapp','messenger','instagram','website','email','other','unknown')),
  campaign text,
  occasion_code text,
  required_date date,
  cake_note text,
  notes text,
  quoted_value numeric(10,2) check (quoted_value is null or quoted_value >= 0),
  quoted_at timestamptz,
  status text not null default 'new' check (status in ('new','discussion','quoted','follow_up','converted','closed')),
  close_reason text check (close_reason is null or close_reason in ('price','cake_unavailable','design_unavailable','date_unavailable',
    'other_supplier','changed_plans','no_response','comparing','cannot_meet','other','unknown')),
  close_reason_by text check (close_reason_by is null or close_reason_by in ('customer','staff')),
  close_note text,
  closed_at timestamptz,
  order_id uuid unique references public.orders(id),
  converted_at timestamptz,
  last_contact_at timestamptz,
  is_test boolean not null default false,
  idem uuid unique,
  created_by uuid default auth.uid(),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint enquiries_converted_has_order check ((status = 'converted') = (order_id is not null)),
  constraint enquiries_someone check (customer_id is not null or coalesce(btrim(contact_name), '') <> ''
    or coalesce(contact_phone_key, '') <> '' or coalesce(btrim(contact_other), '') <> '')
);
create index if not exists enquiries_status_i on public.enquiries (status, created_at desc);
create index if not exists enquiries_phone_i on public.enquiries (contact_phone_key) where contact_phone_key is not null;
create index if not exists enquiries_customer_i on public.enquiries (customer_id) where customer_id is not null;

create table if not exists public.enquiry_events (
  id bigserial primary key,
  enquiry_id uuid not null references public.enquiries(id),
  at timestamptz not null default now(),
  by_id uuid default auth.uid(),
  by_name text,
  kind text not null check (kind in ('created','edit','status','quote','note','contact','close','reopen','convert')),
  from_status text,
  to_status text,
  note text,
  data jsonb
);
create index if not exists enquiry_events_i on public.enquiry_events (enquiry_id, at);

alter table public.enquiries enable row level security;
alter table public.enquiry_events enable row level security;
drop policy if exists enquiries_staff_read on public.enquiries;
create policy enquiries_staff_read on public.enquiries for select to authenticated using (public.is_staff());
drop policy if exists enquiry_events_staff_read on public.enquiry_events;
create policy enquiry_events_staff_read on public.enquiry_events for select to authenticated using (public.is_staff());
revoke all on public.enquiries, public.enquiry_events from anon;
revoke insert, update, delete, truncate on public.enquiries, public.enquiry_events from authenticated;
grant select on public.enquiries, public.enquiry_events to authenticated;
revoke all on sequence public.enquiry_ref_seq from anon, authenticated;

-- ---------- helpers ----------
create or replace function public._enq_me()
 returns text language sql stable security definer set search_path to 'public' as $f$
  select coalesce((select nullif(btrim(full_name), '') from public.staff_profiles where user_id = auth.uid()), 'Staff')
$f$;

create or replace function public._enq_today()
 returns date language sql stable as $f$ select (now() at time zone 'Pacific/Fiji')::date $f$;

create or replace function public._enq_open(p_status text)
 returns boolean language sql immutable as $f$ select p_status in ('new','discussion','quoted','follow_up') $f$;

create or replace function public._enq_event(p_id uuid, p_kind text, p_from text, p_to text, p_note text, p_data jsonb)
 returns void language sql security definer set search_path to 'public' as $f$
  insert into public.enquiry_events (enquiry_id, kind, from_status, to_status, note, data, by_name)
  values (p_id, p_kind, p_from, p_to, nullif(btrim(coalesce(p_note, '')), ''), p_data, public._enq_me())
$f$;

create or replace function public._enq_json(e public.enquiries)
 returns jsonb language sql stable security definer set search_path to 'public' as $f$
  select to_jsonb(e) - 'idem' || jsonb_build_object(
    'occasion_label', (select o.label from public.occasions o where o.code = e.occasion_code),
    'customer_name', (select c.full_name from public.customers c where c.id = e.customer_id),
    'order_reference', (select o.reference from public.orders o where o.id = e.order_id),
    'display_name', coalesce(nullif(btrim(e.contact_name), ''), (select c.full_name from public.customers c where c.id = e.customer_id),
                             public._phone_display(e.contact_phone_key), nullif(btrim(e.contact_other), ''), e.reference))
$f$;

-- ---------- save (new or edit) ----------
create or replace function public.enquiry_save(p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries; v_key text; v_cust uuid; v_date date; v_occ text; v_src text; v_quote numeric; v_new boolean; v_changed text[] := '{}'; v_from text;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  v_new := (p->>'id') is null;
  if not v_new then
    select * into e from public.enquiries where id = (p->>'id')::uuid for update;
    if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
    if e.status = 'converted' then return public._err('converted', 'This enquiry is already an order. Change the order instead.'); end if;
    if (p ? 'version') and (p->>'version')::int <> e.version then
      return public._err('conflict', 'Someone else changed this enquiry. It has been reloaded.', null, jsonb_build_object('enquiry', public._enq_json(e)));
    end if;
  elsif (p->>'idem') is not null then
    select * into e from public.enquiries where idem = (p->>'idem')::uuid;
    if found then return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e), 'repeat', true); end if;
  end if;

  -- validate what was sent (keys left out keep their current value when editing)
  if p ? 'contact_phone' then
    v_key := nullif(public._phone_key(p->>'contact_phone'), '');
    if v_key is not null and length(v_key) < 7 then return public._err('phone', 'That phone number looks too short.', 'contact_phone'); end if;
  end if;
  if p ? 'source' then
    v_src := coalesce(nullif(p->>'source', ''), 'unknown');
    if v_src not in ('walk_in','phone','whatsapp','messenger','instagram','website','email','other','unknown') then return public._err('source', 'Pick where the enquiry came from.', 'source'); end if;
  end if;
  if p ? 'required_date' and nullif(p->>'required_date', '') is not null then
    begin v_date := (p->>'required_date')::date; exception when others then return public._err('date', 'That date is not valid.', 'required_date'); end;
    if v_date < public._enq_today() and (v_new or v_date is distinct from e.required_date) then
      return public._err('date', 'The pickup date has already passed.', 'required_date');
    end if;
  end if;
  if p ? 'occasion_code' and nullif(p->>'occasion_code', '') is not null then
    select code into v_occ from public.occasions where code = p->>'occasion_code' and archived_at is null;
    if v_occ is null then return public._err('occasion', 'Pick an occasion from the list.', 'occasion_code'); end if;
  end if;
  if p ? 'quoted_value' and nullif(p->>'quoted_value', '') is not null then
    begin v_quote := round((p->>'quoted_value')::numeric, 2); exception when others then return public._err('quote', 'Type the price as a number.', 'quoted_value'); end;
    if v_quote < 0 or v_quote > 100000 then return public._err('quote', 'Type the price as a number.', 'quoted_value'); end if;
  end if;

  if v_new then
    v_key := coalesce(v_key, null);
    if coalesce(btrim(p->>'contact_name'), '') = '' and v_key is null and coalesce(btrim(p->>'contact_other'), '') = '' and (p->>'customer_id') is null then
      return public._err('contact', 'Add a name or a phone number.', 'contact_name');
    end if;
    v_cust := nullif(p->>'customer_id', '')::uuid;
    if v_cust is null and v_key is not null then
      select c.id into v_cust from public.customers c
      where (c.phone_key = v_key or c.alt_phone_key = v_key) and c.archived_at is null and c.merged_into is null
      order by c.created_at limit 1;
    end if;
    -- the same person may ask twice about one cake: show what is already open instead of counting it twice
    if not coalesce((p->>'force')::boolean, false) and (v_key is not null or v_cust is not null) then
      if exists (select 1 from public.enquiries x where public._enq_open(x.status) and not x.is_test
                 and (x.contact_phone_key = v_key or x.customer_id = v_cust) and x.created_at > now() - interval '30 days') then
        return public._err('duplicate', 'This customer already has an open enquiry.', null, jsonb_build_object('matches',
          (select jsonb_agg(public._enq_json(x) order by x.created_at desc) from public.enquiries x
           where public._enq_open(x.status) and not x.is_test and (x.contact_phone_key = v_key or x.customer_id = v_cust) and x.created_at > now() - interval '30 days')));
      end if;
    end if;
    insert into public.enquiries (customer_id, contact_name, contact_phone, contact_phone_key, contact_other, source, campaign, occasion_code,
      required_date, cake_note, notes, quoted_value, quoted_at, status, is_test, idem, created_by_name)
    values (v_cust, nullif(btrim(p->>'contact_name'), ''), nullif(btrim(p->>'contact_phone'), ''), v_key, nullif(btrim(p->>'contact_other'), ''),
      coalesce(v_src, 'unknown'), nullif(btrim(p->>'campaign'), ''), v_occ, v_date, nullif(btrim(p->>'cake_note'), ''), nullif(btrim(p->>'notes'), ''),
      v_quote, case when v_quote is not null then now() end, case when v_quote is not null then 'quoted' else 'new' end,
      coalesce((p->>'is_test')::boolean, false), nullif(p->>'idem', '')::uuid, public._enq_me())
    returning * into e;
    perform public._enq_event(e.id, 'created', null, e.status, null, jsonb_build_object('source', e.source));
    return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
  end if;

  -- edit
  v_from := e.status;
  if p ? 'contact_name' and nullif(btrim(p->>'contact_name'), '') is distinct from e.contact_name then e.contact_name := nullif(btrim(p->>'contact_name'), ''); v_changed := v_changed || 'name'::text; end if;
  if p ? 'contact_phone' and v_key is distinct from e.contact_phone_key then e.contact_phone := nullif(btrim(p->>'contact_phone'), ''); e.contact_phone_key := v_key; v_changed := v_changed || 'phone'::text; end if;
  if p ? 'contact_other' and nullif(btrim(p->>'contact_other'), '') is distinct from e.contact_other then e.contact_other := nullif(btrim(p->>'contact_other'), ''); v_changed := v_changed || 'contact'::text; end if;
  if p ? 'source' and v_src is distinct from e.source then e.source := v_src; v_changed := v_changed || 'source'::text; end if;
  if p ? 'campaign' and nullif(btrim(p->>'campaign'), '') is distinct from e.campaign then e.campaign := nullif(btrim(p->>'campaign'), ''); v_changed := v_changed || 'campaign'::text; end if;
  if p ? 'occasion_code' and v_occ is distinct from e.occasion_code then e.occasion_code := v_occ; v_changed := v_changed || 'occasion'::text; end if;
  if p ? 'required_date' and v_date is distinct from e.required_date then e.required_date := v_date; v_changed := v_changed || 'date'::text; end if;
  if p ? 'cake_note' and nullif(btrim(p->>'cake_note'), '') is distinct from e.cake_note then e.cake_note := nullif(btrim(p->>'cake_note'), ''); v_changed := v_changed || 'cake'::text; end if;
  if p ? 'notes' and nullif(btrim(p->>'notes'), '') is distinct from e.notes then e.notes := nullif(btrim(p->>'notes'), ''); v_changed := v_changed || 'notes'::text; end if;
  if e.customer_id is null and coalesce(btrim(e.contact_name), '') = '' and e.contact_phone_key is null and coalesce(btrim(e.contact_other), '') = '' then
    return public._err('contact', 'Keep a name or a phone number.', 'contact_name');
  end if;
  if p ? 'quoted_value' and v_quote is distinct from e.quoted_value then
    e.quoted_value := v_quote; e.quoted_at := case when v_quote is not null then now() end;
    if v_quote is not null and e.status in ('new','discussion','follow_up') then e.status := 'quoted'; end if;
    perform public._enq_event(e.id, 'quote', v_from, e.status, null, jsonb_build_object('value', v_quote));
  end if;
  if cardinality(v_changed) = 0 and e.status = v_from and not (p ? 'quoted_value') then
    return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e), 'unchanged', true);
  end if;
  e.updated_at := now(); e.version := e.version + 1;
  update public.enquiries set contact_name = e.contact_name, contact_phone = e.contact_phone, contact_phone_key = e.contact_phone_key,
    contact_other = e.contact_other, source = e.source, campaign = e.campaign, occasion_code = e.occasion_code, required_date = e.required_date,
    cake_note = e.cake_note, notes = e.notes, quoted_value = e.quoted_value, quoted_at = e.quoted_at, status = e.status,
    updated_at = e.updated_at, version = e.version
  where id = e.id;
  if cardinality(v_changed) > 0 then perform public._enq_event(e.id, 'edit', null, null, null, jsonb_build_object('fields', to_jsonb(v_changed))); end if;
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

-- ---------- status, notes, close, reopen ----------
create or replace function public.enquiry_set_status(p_id uuid, p_status text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries; v_from text;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  if not public._enq_open(p_status) then return public._err('status', 'Use Close or Convert to order for that.'); end if;
  select * into e from public.enquiries where id = p_id for update;
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  if not public._enq_open(e.status) then return public._err('status', 'Reopen this enquiry first.'); end if;
  if e.status = p_status then return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e)); end if;
  v_from := e.status;
  update public.enquiries set status = p_status, updated_at = now(), version = version + 1 where id = p_id returning * into e;
  perform public._enq_event(p_id, 'status', v_from, p_status, null, null);
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

create or replace function public.enquiry_note(p_id uuid, p_note text, p_contact boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  if coalesce(btrim(p_note), '') = '' and not coalesce(p_contact, false) then return public._err('note', 'Type a note first.'); end if;
  if length(coalesce(p_note, '')) > 2000 then return public._err('note', 'Keep the note under 2,000 characters.'); end if;
  select * into e from public.enquiries where id = p_id for update;
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  if coalesce(p_contact, false) then
    update public.enquiries set last_contact_at = now(), updated_at = now(), version = version + 1 where id = p_id returning * into e;
  else
    update public.enquiries set updated_at = now(), version = version + 1 where id = p_id returning * into e;
  end if;
  perform public._enq_event(p_id, case when coalesce(p_contact, false) then 'contact' else 'note' end, null, null, p_note, null);
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

create or replace function public.enquiry_close(p_id uuid, p_reason text, p_reason_by text, p_note text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries; v_from text;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  if p_reason is not null and p_reason not in ('price','cake_unavailable','design_unavailable','date_unavailable','other_supplier','changed_plans',
     'no_response','comparing','cannot_meet','other','unknown') then return public._err('reason', 'Pick a reason from the list.'); end if;
  if p_reason_by is not null and p_reason_by not in ('customer','staff') then return public._err('reason', 'Pick who gave the reason.'); end if;
  select * into e from public.enquiries where id = p_id for update;
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  if e.status = 'converted' then return public._err('converted', 'This enquiry is already an order.'); end if;
  if e.status = 'closed' then return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e)); end if;
  v_from := e.status;
  update public.enquiries set status = 'closed', close_reason = p_reason,
    close_reason_by = case when p_reason is null or p_reason = 'unknown' then null else p_reason_by end,
    close_note = nullif(btrim(coalesce(p_note, '')), ''), closed_at = now(), updated_at = now(), version = version + 1
  where id = p_id returning * into e;
  perform public._enq_event(p_id, 'close', v_from, 'closed', p_note, jsonb_build_object('reason', p_reason, 'by', e.close_reason_by));
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

create or replace function public.enquiry_reopen(p_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  select * into e from public.enquiries where id = p_id for update;
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  if e.status <> 'closed' then return public._err('status', 'Only a closed enquiry can be reopened.'); end if;
  if e.required_date is not null and e.required_date < public._enq_today() then
    update public.enquiries set required_date = null where id = p_id;   -- the old pickup date has passed; ask again
  end if;
  update public.enquiries set status = 'follow_up', close_reason = null, close_reason_by = null, close_note = null, closed_at = null,
    updated_at = now(), version = version + 1 where id = p_id returning * into e;
  perform public._enq_event(p_id, 'reopen', 'closed', 'follow_up', null, null);
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

-- ---------- convert: link the order made on the New order screen ----------
create or replace function public.enquiry_link_order(p_id uuid, p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare e public.enquiries; o public.orders; v_from text; v_other text;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  select * into e from public.enquiries where id = p_id for update;          -- one conversion at a time
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  if e.status = 'converted' then
    if e.order_id = p_order then return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e), 'repeat', true); end if;
    return public._err('already', 'This enquiry is already linked to order ' || coalesce((select reference from public.orders where id = e.order_id), '') || '.');
  end if;
  select * into o from public.orders where id = p_order;
  if not found or o.deleted_at is not null then return public._err('order', 'That order was not found.'); end if;
  if o.order_status in ('cancelled','declined') then return public._err('order', 'That order is cancelled.'); end if;
  select reference into v_other from public.enquiries where order_id = p_order and id <> p_id;
  if v_other is not null then return public._err('order_taken', 'That order is already linked to enquiry ' || v_other || '.'); end if;
  v_from := e.status;
  update public.enquiries set status = 'converted', order_id = p_order, converted_at = now(),
    customer_id = coalesce(customer_id, o.customer_id), close_reason = null, close_reason_by = null, close_note = null, closed_at = null,
    updated_at = now(), version = version + 1
  where id = p_id returning * into e;
  perform public._enq_event(p_id, 'convert', v_from, 'converted', null, jsonb_build_object('order', o.reference, 'order_id', o.id));
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e));
end $function$;

-- ---------- read ----------
create or replace function public.enquiry_list(p_view text default 'open', p_q text default null, p_limit int default 150)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_q text := nullif(btrim(coalesce(p_q, '')), ''); v_k text;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  v_k := nullif(public._phone_key(v_q), '');
  return jsonb_build_object('ok', true,
    'counts', (select jsonb_build_object(
        'open', count(*) filter (where public._enq_open(status)),
        'new', count(*) filter (where status = 'new'),
        'converted', count(*) filter (where status = 'converted'),
        'closed', count(*) filter (where status = 'closed'),
        'all', count(*)) from public.enquiries where not is_test),
    'rows', coalesce((select jsonb_agg(public._enq_json(x.e) order by (x.e).created_at desc) from (
        select e from public.enquiries e
        where not e.is_test
          and case coalesce(p_view, 'open') when 'open' then public._enq_open(e.status) when 'all' then true else e.status = p_view end
          and (v_q is null or e.reference ilike v_q || '%' or e.contact_name ilike '%' || v_q || '%' or e.cake_note ilike '%' || v_q || '%'
               or (length(v_k) >= 4 and e.contact_phone_key like '%' || v_k || '%')
               or exists (select 1 from public.customers c where c.id = e.customer_id and c.full_name ilike '%' || v_q || '%'))
        order by e.created_at desc limit least(greatest(coalesce(p_limit, 150), 1), 500)) x), '[]'::jsonb));
end $function$;

create or replace function public.enquiry_get(p_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare e public.enquiries;
begin
  if not public.is_staff() then return public._err('forbidden', 'Please sign in again.'); end if;
  select * into e from public.enquiries where id = p_id;
  if not found then return public._err('not_found', 'That enquiry is no longer there.'); end if;
  return jsonb_build_object('ok', true, 'enquiry', public._enq_json(e),
    'events', coalesce((select jsonb_agg(jsonb_build_object('at', v.at, 'by', v.by_name, 'kind', v.kind, 'from', v.from_status, 'to', v.to_status, 'note', v.note, 'data', v.data) order by v.at desc, v.id desc)
                        from public.enquiry_events v where v.enquiry_id = e.id), '[]'::jsonb),
    'order', (select jsonb_build_object('id', o.id, 'reference', o.reference, 'status', o.order_status, 'required_date', o.required_date, 'total', coalesce(o.final_total, o.estimate_total))
              from public.orders o where o.id = e.order_id),
    'customer', (select jsonb_build_object('id', c.id, 'name', c.full_name, 'phone', c.phone,
                   'orders', (select count(*) from public.orders o where o.customer_id = c.id and o.deleted_at is null and not coalesce(o.is_test, false)))
                 from public.customers c where c.id = e.customer_id),
    'others', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'reference', x.reference, 'status', x.status, 'created_at', x.created_at, 'cake_note', x.cake_note) order by x.created_at desc)
                        from public.enquiries x where x.id <> e.id and not x.is_test
                          and ((e.customer_id is not null and x.customer_id = e.customer_id) or (e.contact_phone_key is not null and x.contact_phone_key = e.contact_phone_key))), '[]'::jsonb),
    -- orders this person placed since asking, not yet linked: offered as "Already ordered? Link it"
    'candidates', case when public._enq_open(e.status) or e.status = 'closed' then coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'reference', o.reference, 'required_date', o.required_date, 'created_at', o.created_at) order by o.created_at desc)
                        from (select o.* from public.orders o
                              where o.deleted_at is null and not coalesce(o.is_test, false) and o.order_status not in ('cancelled','declined')
                                and o.created_at >= e.created_at - interval '1 day'
                                and ((e.customer_id is not null and o.customer_id = e.customer_id) or (e.contact_phone_key is not null and o.contact_phone_key = e.contact_phone_key))
                                and not exists (select 1 from public.enquiries x where x.order_id = o.id)
                              order by o.created_at desc limit 5) o), '[]'::jsonb) else '[]'::jsonb end);
end $function$;

revoke all on function public._enq_me(), public._enq_event(uuid, text, text, text, text, jsonb), public._enq_json(public.enquiries) from public, anon, authenticated;
revoke all on function public.enquiry_save(jsonb), public.enquiry_set_status(uuid, text), public.enquiry_note(uuid, text, boolean),
  public.enquiry_close(uuid, text, text, text), public.enquiry_reopen(uuid), public.enquiry_link_order(uuid, uuid),
  public.enquiry_list(text, text, int), public.enquiry_get(uuid) from public, anon;
grant execute on function public.enquiry_save(jsonb), public.enquiry_set_status(uuid, text), public.enquiry_note(uuid, text, boolean),
  public.enquiry_close(uuid, text, text, text), public.enquiry_reopen(uuid), public.enquiry_link_order(uuid, uuid),
  public.enquiry_list(text, text, int), public.enquiry_get(uuid) to authenticated;
