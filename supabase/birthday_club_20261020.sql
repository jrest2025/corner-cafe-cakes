-- Corner Café Birthday Club (20 October 2026). Applied as migrations birthday_club_20261020, birthday_club_20261020_fix1
-- (call times to the millisecond, so the latest call shows; "already" is false for a new member) and
-- birthday_club_20261020_fix2 (using the offer adds 1 to the order's version, as every other change to an order does)
-- and birthday_club_20261020_fix3_no_website (the website box is not offered for now, so its function is closed; see the end).
-- Roneel: "can we build a birthday club into the dashboard for the customers.. we can always call them up and wish them
-- and offer something". His choices: customers join at the counter and on the website; one offer for everyone, a free
-- cupcake with a cake ordered within 2 weeks of the birthday, once a year; members appear on the call list a week before
-- their birthday, with birthdays today at the top.
--
-- Builds on the switched-off foundation of 19 October (birthday_club_* tables, master switch OFF). Additive only:
--   * birthday_club_activity gains the call result (outcome, channel, the birthday it was for, who called).
--   * birthday_club_memberships gains the wording the customer agreed to, and when and why they left.
--   * Two wordings: what staff and the website say when someone joins.
--   * The "birthday_cupcake" offer becomes "A free cupcake with a cake" (14 days before to 14 days after the birthday)
--     and, with the "Birthday Club" level, is made active. The other two levels and their offers stay off.
--   * Functions below. Every one checks the master switch, which stays OFF until Roneel approves the release.
-- Joining records the customer's own yes to a birthday call or WhatsApp with the club offer. It is a separate, narrow
-- permission: it does not add to or widen marketing permission (consent_now), so it never puts anyone on other lists.
-- A member who later unsubscribes from all Corner Café marketing is left off the call list.
-- Access: anyone who can see customers sees the club; anyone who can follow up customers records calls; anyone who can
-- edit customers adds and removes members; anyone who can create orders joins a customer and uses the offer on New order.

-- ---------- tables ----------
alter table public.birthday_club_activity
  add column if not exists outcome text check (outcome in ('wished', 'no_answer', 'not_interested', 'messaged')),
  add column if not exists channel text check (channel in ('phone', 'whatsapp', 'in_person')),
  add column if not exists birthday date,
  add column if not exists staff_label text;
alter table public.birthday_club_activity drop constraint if exists birthday_club_activity_kind_check;
alter table public.birthday_club_activity add constraint birthday_club_activity_kind_check
  check (kind in ('contact_planned', 'contact_completed', 'contact_attempt', 'offer_sent', 'offer_redeemed', 'offer_voided', 'joined', 'left', 'note'));
create index if not exists birthday_club_activity_birthday_idx on public.birthday_club_activity (customer_id, birthday);

alter table public.birthday_club_memberships
  add column if not exists wording_code text,
  add column if not exists left_at timestamptz,
  add column if not exists left_reason text check (left_reason is null or length(left_reason) <= 300);

insert into public.consent_wordings (code, brand_id, wording, where_shown, in_use_from, notes)
select v.code, b.id, v.wording, v.where_shown, date '2026-10-20', 'Birthday Club only. It does not add marketing permission.'
from (values
  ('birthday-club-staff-v1', 'The customer said yes to joining the Corner Café Birthday Club: we may call or WhatsApp them in the week before their birthday with the club offer.', 'Staff app: New order, customer profile and Birthday Club'),
  ('birthday-club-online-v1', 'Join our Birthday Club. We’ll call or WhatsApp you in the week before your birthday with a free cupcake offer.', 'Online cake order form')
) v(code, wording, where_shown)
cross join public.brands b where b.code = 'corner-cafe'
on conflict (code) do nothing;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'birthday_club_memberships_wording_fk') then
    alter table public.birthday_club_memberships add constraint birthday_club_memberships_wording_fk foreign key (wording_code) references public.consent_wordings (code);
  end if;
end $$;

update public.birthday_club_offers
   set title = 'A free cupcake with a cake',
       description = 'One free cupcake with a cake ordered within 2 weeks of the birthday, before or after. Once a year.',
       valid_days_before = 14, valid_days_after = 14, max_redemptions_per_birthday = 1, requires_cake_order = true, active = true
 where code = 'birthday_cupcake';
update public.birthday_club_tiers set active = true where code = 'club';

comment on table public.birthday_club_memberships is 'Corner Café Birthday Club members. Joining records the customer''s own yes to a birthday call or WhatsApp with the club offer (wording_code). It does not add or widen marketing permission in consent_now. Status left keeps the history.';
comment on table public.birthday_club_activity is 'Birthday Club history: joined, left, calls (outcome, channel, the birthday they were for) and offers used. No automatic messaging.';

-- ---------- helpers ----------
-- A birthday in a given year; 29 February counts as 28 February in other years
create or replace function public._bc_birthday_in(p_day integer, p_month integer, p_year integer) returns date
language sql immutable set search_path to 'public' as $$
  select make_date(p_year, p_month,
    case when p_month = 2 and p_day = 29 and not ((p_year % 4 = 0 and p_year % 100 <> 0) or p_year % 400 = 0) then 28 else p_day end)
$$;

-- The next birthday on or after a day
create or replace function public._bc_next(p_day integer, p_month integer, p_from date) returns date
language sql immutable set search_path to 'public' as $$
  select case when public._bc_birthday_in(p_day, p_month, extract(year from p_from)::int) >= p_from
              then public._bc_birthday_in(p_day, p_month, extract(year from p_from)::int)
              else public._bc_birthday_in(p_day, p_month, extract(year from p_from)::int + 1) end
$$;

-- The birthday whose offer window (p_before days before to p_after days after) contains a day, or null
create or replace function public._bc_window(p_day integer, p_month integer, p_date date, p_before integer, p_after integer) returns date
language sql immutable set search_path to 'public' as $$
  select b from (select public._bc_birthday_in(p_day, p_month, y) as b
                   from generate_series(extract(year from p_date)::int - 1, extract(year from p_date)::int + 1) y) x
   where p_date between b - p_before and b + p_after
   order by abs(p_date - b) limit 1
$$;

create or replace function public._bc_valid(p_day integer, p_month integer) returns boolean
language sql immutable set search_path to 'public' as $$
  select p_month between 1 and 12 and p_day >= 1 and p_day <= case when p_month = 2 then 29 when p_month in (4, 6, 9, 11) then 30 else 31 end
$$;

-- The live offer, only while the master switch, the offer switch, the offer and its level are all on
create or replace function public._bc_offer() returns public.birthday_club_offers
language sql stable security definer set search_path to 'public' as $$
  select o.* from public.birthday_club_offers o
    join public.birthday_club_tiers t on t.code = o.tier_code
    cross join public.birthday_club_settings s
   where o.code = 'birthday_cupcake' and o.active and t.active and s.enabled and s.rewards_redemption_enabled
   limit 1
$$;

-- Has the member asked for no Corner Café offers since joining (the unsubscribe link switches off all marketing)?
create or replace function public._bc_stopped(p_customer uuid, p_since timestamptz) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.consent_now k
                  where k.customer_id = p_customer and not k.granted and k.wording_code = 'email-unsubscribe-v1' and k.recorded_at > p_since)
$$;

-- Join (or rejoin) a customer. The caller checks access and the switch.
create or replace function public._bc_join(p_customer uuid, p_day integer, p_month integer, p_via text, p_wording text, p_order uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare c public.customers; m public.birthday_club_memberships; v_was text;
begin
  select * into c from public.customers where id = p_customer;
  if not found then return public._err('not_found', 'That customer was not found.'); end if;
  if c.merged_into is not null then select * into c from public.customers where id = c.merged_into; end if;
  if c.archived_at is not null then return public._err('archived', 'That customer is archived, so they cannot join.'); end if;
  if p_day is null or p_month is null or not public._bc_valid(p_day, p_month) then
    return public._err('birthday', 'Choose their birthday: the day and the month.', 'birthday');
  end if;
  if c.birth_day is distinct from p_day or c.birth_month is distinct from p_month then
    update public.customers set birth_day = p_day, birth_month = p_month where id = c.id;
  end if;
  select * into m from public.birthday_club_memberships where customer_id = c.id for update;
  if found then
    v_was := m.status;
    update public.birthday_club_memberships
       set status = 'active', joined_at = case when status = 'active' then joined_at else now() end,
           joined_via = case when status = 'active' then joined_via else p_via end,
           consent_recorded_at = now(), wording_code = p_wording, added_by = coalesce(auth.uid(), added_by),
           left_at = null, left_reason = null, updated_at = now()
     where customer_id = c.id returning * into m;
  else
    insert into public.birthday_club_memberships (customer_id, status, joined_at, joined_via, consent_recorded_at, added_by, wording_code)
    values (c.id, 'active', now(), p_via, now(), auth.uid(), p_wording) returning * into m;
  end if;
  if v_was is distinct from 'active' then
    insert into public.birthday_club_activity (customer_id, kind, happened_at, order_id, note, created_by, staff_label)
    values (c.id, 'joined', clock_timestamp(), p_order, case p_via when 'customer' then 'Joined on the website' else 'Joined at the counter' end, auth.uid(),
            case when auth.uid() is null then 'Customer (online)' else public._me_label() end);
  end if;
  return jsonb_build_object('ok', true, 'customer_id', c.id, 'already', coalesce(v_was = 'active', false), 'day', p_day, 'month', p_month,
    'next', public._bc_next(p_day, p_month, public._fiji_today()));
end $$;

-- ---------- the Birthday Club page, Today and New order ----------
create or replace function public.birthday_club_home(p_days integer default 7) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  s public.birthday_club_settings; o public.birthday_club_offers;
  v_t date := public._fiji_today(); v_days int := greatest(0, least(coalesce(p_days, 7), 31));
  v_call boolean := public.has_perm('cust.followup'); v_join boolean := public.has_perm('cust.edit');
  v_members jsonb; v_due jsonb; v_recent jsonb; v_counts jsonb;
begin
  if not (v_call or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot see the Birthday Club.'); end if;
  select * into s from public.birthday_club_settings where id;
  select * into o from public._bc_offer();
  if not coalesce(s.enabled, false) then
    return jsonb_build_object('ok', true, 'enabled', false, 'today', v_t, 'can_call', v_call, 'can_join', v_join);
  end if;

  with mem as (
    select m.customer_id as id, c.full_name as name, c.phone, c.customer_no as no, c.preferred_contact as pref,
           c.birth_day as d, c.birth_month as mo, m.joined_at, m.joined_via as via,
           case when c.birth_day is not null and c.birth_month is not null then public._bc_next(c.birth_day, c.birth_month, v_t - 3) end as bday,
           public._bc_stopped(c.id, m.joined_at) as stopped
      from public.birthday_club_memberships m join public.customers c on c.id = m.customer_id
     where m.status = 'active' and c.merged_into is null and c.archived_at is null
  ), info as (
    select mem.*, (mem.bday - v_t) as in_days,
           (select jsonb_build_object('outcome', a.outcome, 'channel', a.channel, 'at', a.happened_at, 'by', a.staff_label)
              from public.birthday_club_activity a
             where a.customer_id = mem.id and a.birthday = mem.bday and a.kind in ('contact_completed', 'contact_attempt')
             order by a.happened_at desc limit 1) as last,
           (select jsonb_build_object('ref', ord.reference, 'at', r.redeemed_at)
              from public.birthday_club_redemptions r left join public.orders ord on ord.id = r.order_id
             where r.customer_id = mem.id and r.status = 'redeemed' and r.birthday_year = extract(year from mem.bday)::int
             order by r.redeemed_at desc limit 1) as used,
           (select count(*) from public.orders x where x.customer_id = mem.id and x.deleted_at is null and x.order_status not in ('cancelled', 'declined')) as orders,
           (select max(x.created_at) from public.orders x where x.customer_id = mem.id and x.deleted_at is null) as last_order
      from mem
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'phone', i.phone, 'no', i.no, 'pref', i.pref,
        'day', i.d, 'month', i.mo, 'birthday', i.bday, 'in_days', i.in_days, 'joined_at', i.joined_at, 'via', i.via,
        'stopped', i.stopped, 'last', i.last, 'used', i.used, 'orders', i.orders, 'last_order', i.last_order)
        order by i.bday nulls last, i.name) from info i), '[]'),
    coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'phone', i.phone, 'no', i.no, 'pref', i.pref,
        'day', i.d, 'month', i.mo, 'birthday', i.bday, 'in_days', i.in_days, 'last', i.last, 'used', i.used,
        'orders', i.orders, 'last_order', i.last_order)
        order by case when i.in_days = 0 then 0 when i.in_days < 0 then 2 else 1 end, i.in_days, i.name)
        from info i where i.bday is not null and not i.stopped and i.in_days between -3 and v_days), '[]')
    into v_members, v_due;

  select coalesce(jsonb_agg(jsonb_build_object('name', c.full_name, 'id', a.customer_id, 'kind', a.kind, 'outcome', a.outcome,
           'channel', a.channel, 'at', a.happened_at, 'by', a.staff_label) order by a.happened_at desc), '[]')
    into v_recent
    from (select * from public.birthday_club_activity order by happened_at desc limit 12) a
    join public.customers c on c.id = a.customer_id;

  select jsonb_build_object(
      'members', (select count(*) from public.birthday_club_memberships m join public.customers c on c.id = m.customer_id
                   where m.status = 'active' and c.merged_into is null and c.archived_at is null),
      'joined_month', (select count(*) from public.birthday_club_activity a where a.kind = 'joined'
                        and (a.happened_at at time zone 'Pacific/Fiji')::date >= date_trunc('month', v_t)::date),
      'calls_month', (select count(*) from public.birthday_club_activity a where a.kind in ('contact_completed', 'contact_attempt')
                        and (a.happened_at at time zone 'Pacific/Fiji')::date >= date_trunc('month', v_t)::date),
      'wished_month', (select count(*) from public.birthday_club_activity a where a.outcome in ('wished', 'messaged')
                        and (a.happened_at at time zone 'Pacific/Fiji')::date >= date_trunc('month', v_t)::date),
      'offers_year', (select count(*) from public.birthday_club_redemptions r where r.status = 'redeemed'
                        and (r.redeemed_at at time zone 'Pacific/Fiji')::date >= date_trunc('year', v_t)::date),
      'offer_value_year', (select coalesce(sum(coalesce(ord.final_total, ord.estimate_total)), 0) from public.birthday_club_redemptions r
                        join public.orders ord on ord.id = r.order_id
                        where r.status = 'redeemed' and ord.order_status not in ('cancelled', 'declined') and ord.deleted_at is null
                          and (r.redeemed_at at time zone 'Pacific/Fiji')::date >= date_trunc('year', v_t)::date))
    into v_counts;

  return jsonb_build_object('ok', true, 'enabled', true, 'joining', coalesce(s.enrollment_enabled, false),
    'offer_on', o.code is not null, 'today', v_t, 'days', v_days, 'can_call', v_call, 'can_join', v_join,
    'offer', case when o.code is not null then jsonb_build_object('title', o.title, 'description', o.description,
                   'before', o.valid_days_before, 'after', o.valid_days_after) end,
    'members', v_members, 'due', v_due, 'recent', v_recent, 'counts', v_counts);
end $$;

-- New order: is this customer a member, and can this order have the free cupcake?
create or replace function public.birthday_club_status(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare s public.birthday_club_settings; o public.birthday_club_offers; c public.customers; m public.birthday_club_memberships;
        v_t date := public._fiji_today(); v_b date; v_used text;
begin
  if not (public.has_perm('ord.create') or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot see the Birthday Club.'); end if;
  select * into s from public.birthday_club_settings where id;
  if not coalesce(s.enabled, false) then return jsonb_build_object('ok', true, 'enabled', false); end if;
  select * into o from public._bc_offer();
  select * into c from public.customers where id = p_customer;
  if not found then return public._err('not_found', 'That customer was not found.'); end if;
  if c.merged_into is not null then select * into c from public.customers where id = c.merged_into; end if;
  select * into m from public.birthday_club_memberships where customer_id = c.id;
  if not found or m.status <> 'active' then
    return jsonb_build_object('ok', true, 'enabled', true, 'joining', s.enrollment_enabled, 'offer_on', o.code is not null,
      'member', false, 'day', c.birth_day, 'month', c.birth_month,
      'offer', case when o.code is not null then jsonb_build_object('title', o.title, 'before', o.valid_days_before, 'after', o.valid_days_after) end);
  end if;
  if o.code is not null and c.birth_day is not null and c.birth_month is not null and not public._bc_stopped(c.id, m.joined_at) then
    v_b := public._bc_window(c.birth_day, c.birth_month, v_t, o.valid_days_before, o.valid_days_after);
  end if;
  if v_b is not null then
    select coalesce(ord.reference, 'an order') into v_used from public.birthday_club_redemptions r left join public.orders ord on ord.id = r.order_id
     where r.customer_id = c.id and r.birthday_year = extract(year from v_b)::int and r.status = 'redeemed' limit 1;
  end if;
  return jsonb_build_object('ok', true, 'enabled', true, 'joining', s.enrollment_enabled, 'offer_on', o.code is not null,
    'member', true, 'day', c.birth_day, 'month', c.birth_month,
    'next', case when c.birth_day is not null then public._bc_next(c.birth_day, c.birth_month, v_t) end,
    'offer', case when o.code is not null then jsonb_build_object('title', o.title, 'before', o.valid_days_before, 'after', o.valid_days_after,
               'birthday', v_b, 'eligible', v_b is not null and v_used is null, 'used', v_used) end);
end $$;

-- ---------- joining and leaving ----------
create or replace function public.birthday_club_join(p_customer uuid, p_day integer, p_month integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s public.birthday_club_settings;
begin
  if not public.has_perm('cust.edit') then return public._err('forbidden', 'Your login cannot add Birthday Club members.'); end if;
  select * into s from public.birthday_club_settings where id;
  if not coalesce(s.enabled and s.enrollment_enabled, false) then return public._err('off', 'The Birthday Club is not taking new members right now.'); end if;
  return public._bc_join(p_customer, p_day, p_month, 'staff', 'birthday-club-staff-v1', null);
end $$;

-- New order: join the order's customer once the order is saved (they may be new)
create or replace function public.birthday_club_join_order(p_order uuid, p_day integer, p_month integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s public.birthday_club_settings; ord public.orders;
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  select * into s from public.birthday_club_settings where id;
  if not coalesce(s.enabled and s.enrollment_enabled, false) then return public._err('off', 'The Birthday Club is not taking new members right now.'); end if;
  select * into ord from public.orders where id = p_order and deleted_at is null;
  if not found or ord.customer_id is null then return public._err('not_found', 'That order was not found.'); end if;
  return public._bc_join(ord.customer_id, p_day, p_month, 'staff', 'birthday-club-staff-v1', ord.id);
end $$;

-- The website: join the customer of an online order placed in the last hour (the order's id is only known to its sender).
-- An existing member keeps the birthday already saved.
create or replace function public.birthday_club_join_online(p_order uuid, p_day integer, p_month integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare s public.birthday_club_settings; ord public.orders;
begin
  select * into s from public.birthday_club_settings where id;
  if not coalesce(s.enabled and s.enrollment_enabled, false) then return public._err('off', 'The Birthday Club is not taking new members right now.'); end if;
  select * into ord from public.orders where id = p_order and deleted_at is null and source = 'online' and created_at > now() - interval '60 minutes';
  if not found or ord.customer_id is null then return public._err('not_found', 'That order was not found.'); end if;
  if exists (select 1 from public.birthday_club_memberships where customer_id = ord.customer_id and status = 'active') then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  return public._bc_join(ord.customer_id, p_day, p_month, 'customer', 'birthday-club-online-v1', ord.id) - 'customer_id' - 'next';
end $$;

create or replace function public.birthday_club_leave(p_customer uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare m public.birthday_club_memberships; v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
begin
  if not public.has_perm('cust.edit') then return public._err('forbidden', 'Your login cannot remove Birthday Club members.'); end if;
  select * into m from public.birthday_club_memberships where customer_id = p_customer for update;
  if not found or m.status <> 'active' then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.birthday_club_memberships set status = 'left', left_at = now(), left_reason = v_reason, updated_at = now() where customer_id = p_customer;
  insert into public.birthday_club_activity (customer_id, kind, happened_at, note, created_by, staff_label)
  values (p_customer, 'left', clock_timestamp(), coalesce(v_reason, 'Left the Birthday Club'), auth.uid(), public._me_label());
  return jsonb_build_object('ok', true);
end $$;

-- ---------- calls ----------
create or replace function public.birthday_club_contact(p_customer uuid, p_outcome text, p_channel text, p_note text default null, p_idem uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare s public.birthday_club_settings; c public.customers; m public.birthday_club_memberships; v_b date; v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_body text; v_bad text;
begin
  if not public.has_perm('cust.followup') then return public._err('forbidden', 'Your login cannot record customer calls.'); end if;
  select * into s from public.birthday_club_settings where id;
  if not coalesce(s.enabled, false) then return public._err('off', 'The Birthday Club is switched off.'); end if;
  if p_outcome not in ('wished', 'no_answer', 'not_interested', 'messaged') then return public._err('outcome', 'Choose what happened.', 'outcome'); end if;
  if p_channel not in ('phone', 'whatsapp', 'in_person') then return public._err('channel', 'Choose how you contacted them.', 'channel'); end if;
  if v_note is not null then
    if length(v_note) > 500 then return public._err('note', 'Keep the note under 500 characters.', 'note'); end if;
    v_bad := public._note_problem(v_note); if v_bad is not null then return public._err('note', v_bad, 'note'); end if;
  end if;
  if p_idem is not null and exists (select 1 from public.customer_notes where idem = p_idem) then
    return jsonb_build_object('ok', true, 'repeat', true);
  end if;
  select * into c from public.customers where id = p_customer and merged_into is null;
  select * into m from public.birthday_club_memberships where customer_id = p_customer;
  if c.id is null or m.customer_id is null or m.status <> 'active' then return public._err('not_member', 'They are not in the Birthday Club.'); end if;
  if c.birth_day is null or c.birth_month is null then return public._err('birthday', 'Their birthday is not saved. Add it on their profile first.'); end if;
  v_b := public._bc_next(c.birth_day, c.birth_month, public._fiji_today() - 3);
  insert into public.birthday_club_activity (customer_id, kind, happened_at, outcome, channel, birthday, note, created_by, staff_label)
  values (c.id, case when p_outcome = 'no_answer' then 'contact_attempt' else 'contact_completed' end, clock_timestamp(), p_outcome, p_channel, v_b,
          v_note, auth.uid(), public._me_label());
  v_body := 'Birthday Club (birthday ' || to_char(v_b, 'FMDD FMMonth') || '): ' ||
    case p_outcome when 'wished' then 'wished them a happy birthday and offered the free cupcake with a cake'
                   when 'messaged' then 'sent a birthday message with the free cupcake offer'
                   when 'not_interested' then 'wished them a happy birthday; not interested in the offer'
                   else 'called, no answer' end ||
    case p_channel when 'whatsapp' then ' (WhatsApp)' when 'in_person' then ' (in person)' else ' (phone call)' end || '.' ||
    coalesce(' ' || v_note, '');
  insert into public.customer_notes (customer_id, kind, channel, body, created_by, created_by_label, idem)
  values (c.id, 'note', p_channel, left(v_body, 2000), auth.uid(), public._me_label(), p_idem);
  return jsonb_build_object('ok', true, 'birthday', v_b);
end $$;

-- ---------- the offer ----------
-- Is this order's customer due the free cupcake: a member, the order placed within the window of a birthday, not used
-- for that birthday yet?
create or replace function public._bc_order_offer(ord public.orders) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare o public.birthday_club_offers; c public.customers; m public.birthday_club_memberships; v_day date; v_b date; v_used text;
begin
  select * into o from public._bc_offer();
  if o.code is null then return jsonb_build_object('eligible', false, 'reason', 'off'); end if;
  select * into c from public.customers where id = ord.customer_id;
  if c.merged_into is not null then select * into c from public.customers where id = c.merged_into; end if;
  select * into m from public.birthday_club_memberships where customer_id = c.id;
  if m.customer_id is null or m.status <> 'active' then return jsonb_build_object('eligible', false, 'reason', 'not_member'); end if;
  if c.birth_day is null or c.birth_month is null then return jsonb_build_object('eligible', false, 'reason', 'no_birthday'); end if;
  v_day := (coalesce(ord.taken_at, ord.created_at) at time zone 'Pacific/Fiji')::date;
  v_b := public._bc_window(c.birth_day, c.birth_month, v_day, o.valid_days_before, o.valid_days_after);
  if v_b is null then return jsonb_build_object('eligible', false, 'reason', 'outside', 'next', public._bc_next(c.birth_day, c.birth_month, v_day)); end if;
  select coalesce(x.reference, 'an order') into v_used from public.birthday_club_redemptions r left join public.orders x on x.id = r.order_id
   where r.customer_id = c.id and r.birthday_year = extract(year from v_b)::int and r.status = 'redeemed' limit 1;
  if v_used is not null then return jsonb_build_object('eligible', false, 'reason', 'used', 'used', v_used, 'birthday', v_b); end if;
  return jsonb_build_object('eligible', true, 'birthday', v_b, 'customer_id', c.id, 'title', o.title, 'offer_code', o.code);
end $$;

-- The order sheet: can the free cupcake be added to this order?
create or replace function public.birthday_club_order_offer(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare ord public.orders; r jsonb; v_done text;
begin
  if not public.has_perm('ord.view') then return public._err('forbidden', 'Your login cannot see orders.'); end if;
  select * into ord from public.orders where id = p_order and deleted_at is null;
  if not found then return public._err('not_found', 'That order was not found.'); end if;
  select x.status into v_done from public.birthday_club_redemptions x where x.order_id = ord.id and x.status = 'redeemed' limit 1;
  if v_done is not null then return jsonb_build_object('ok', true, 'eligible', false, 'reason', 'this_order', 'added', true); end if;
  if ord.order_status in ('cancelled', 'declined', 'completed') then return jsonb_build_object('ok', true, 'eligible', false, 'reason', 'closed'); end if;
  r := public._bc_order_offer(ord);
  return jsonb_build_object('ok', true, 'can_add', public.has_perm('ord.create')) || (r - 'customer_id' - 'offer_code');
end $$;

-- Use the offer on an order: once per birthday; the kitchen slip says "Birthday Club: add 1 free cupcake"
create or replace function public.birthday_club_redeem(p_order uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare ord public.orders; r jsonb; v_b date; v_item uuid; v_line text := 'Birthday Club: add 1 free cupcake';
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into ord from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('not_found', 'That order was not found.'); end if;
  if exists (select 1 from public.birthday_club_redemptions x where x.order_id = ord.id and x.status = 'redeemed') then
    return jsonb_build_object('ok', true, 'already', true, 'message', 'The free cupcake is already on this order.');
  end if;
  if ord.order_status in ('cancelled', 'declined', 'completed') then return public._err('closed', 'This order is closed, so the offer cannot be added.'); end if;
  r := public._bc_order_offer(ord);
  if not coalesce((r->>'eligible')::boolean, false) then
    return public._err(coalesce(r->>'reason', 'not_eligible'),
      case r->>'reason' when 'off' then 'The Birthday Club offer is switched off.'
                        when 'not_member' then 'This customer is not in the Birthday Club.'
                        when 'no_birthday' then 'Their birthday is not saved.'
                        when 'outside' then 'The offer is for cakes ordered within 2 weeks of their birthday.'
                        when 'used' then 'They already had the free cupcake for this birthday (' || (r->>'used') || ').'
                        else 'This order cannot have the Birthday Club offer.' end);
  end if;
  v_b := (r->>'birthday')::date;
  begin
    insert into public.birthday_club_redemptions (customer_id, offer_code, birthday_year, order_id, redeemed_by, status, note)
    values ((r->>'customer_id')::uuid, r->>'offer_code', extract(year from v_b)::int, ord.id, auth.uid(), 'redeemed', 'Birthday ' || to_char(v_b, 'FMDD FMMonth YYYY'));
  exception when unique_violation then
    return public._err('used', 'They already had the free cupcake for this birthday.');
  end;
  select id into v_item from public.order_items where order_id = ord.id order by created_at, id limit 1;
  if v_item is not null then
    update public.order_items
       set kitchen_notes = case when kitchen_notes is null or btrim(kitchen_notes) = '' then v_line
                                when position(v_line in kitchen_notes) > 0 then kitchen_notes
                                else left(kitchen_notes || ' · ' || v_line, 1000) end
     where id = v_item;
  end if;
  -- a change to the order like any other (version + 1), so Change order made from an older copy asks to check the latest
  update public.orders set updated_at = now(), version = version + 1 where id = ord.id;
  insert into public.birthday_club_activity (customer_id, kind, happened_at, order_id, birthday, note, created_by, staff_label)
  values ((r->>'customer_id')::uuid, 'offer_redeemed', clock_timestamp(), ord.id, v_b, r->>'title', auth.uid(), public._me_label());
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
  values (ord.id, auth.uid(), public._me_label(), 'birthday_offer', jsonb_build_object('title', r->>'title', 'birthday', v_b));
  return jsonb_build_object('ok', true, 'message', 'Free cupcake added. The kitchen slip says "Birthday Club: add 1 free cupcake".');
end $$;

-- ---------- access ----------
revoke all on function public._bc_birthday_in(integer, integer, integer) from public, anon, authenticated;
revoke all on function public._bc_next(integer, integer, date) from public, anon, authenticated;
revoke all on function public._bc_window(integer, integer, date, integer, integer) from public, anon, authenticated;
revoke all on function public._bc_valid(integer, integer) from public, anon, authenticated;
revoke all on function public._bc_offer() from public, anon, authenticated;
revoke all on function public._bc_stopped(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._bc_join(uuid, integer, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public._bc_order_offer(public.orders) from public, anon, authenticated;
revoke all on function public.birthday_club_home(integer) from public, anon;
revoke all on function public.birthday_club_status(uuid) from public, anon;
revoke all on function public.birthday_club_join(uuid, integer, integer) from public, anon;
revoke all on function public.birthday_club_join_order(uuid, integer, integer) from public, anon;
revoke all on function public.birthday_club_join_online(uuid, integer, integer) from public;
revoke all on function public.birthday_club_leave(uuid, text) from public, anon;
revoke all on function public.birthday_club_contact(uuid, text, text, text, uuid) from public, anon;
revoke all on function public.birthday_club_order_offer(uuid) from public, anon;
revoke all on function public.birthday_club_redeem(uuid) from public, anon;
grant execute on function public.birthday_club_home(integer) to authenticated;
grant execute on function public.birthday_club_status(uuid) to authenticated;
grant execute on function public.birthday_club_join(uuid, integer, integer) to authenticated;
grant execute on function public.birthday_club_join_order(uuid, integer, integer) to authenticated;
grant execute on function public.birthday_club_join_online(uuid, integer, integer) to anon, authenticated;
grant execute on function public.birthday_club_leave(uuid, text) to authenticated;
grant execute on function public.birthday_club_contact(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.birthday_club_order_offer(uuid) to authenticated;
grant execute on function public.birthday_club_redeem(uuid) to authenticated;

-- fix3 (20 October 8:08 PM, Roneel: "remove that on the form .. lets build the birthday club foundation first"): the
-- website box is not offered for now, so nobody can join through it. The box is parked on branch
-- parked/birthday-club-website-20261020; grant this again (to anon) when it comes back.
revoke execute on function public.birthday_club_join_online(uuid, integer, integer) from public, anon, authenticated;
