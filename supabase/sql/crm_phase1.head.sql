-- CRM Phase 1: the customer foundation.
-- Brands, safer customer profiles, an order contact snapshot, channel and brand consent, field history,
-- and order matching that never overwrites a profile.
-- Backup taken before this change: schema backup_20261012.

-- ---------------------------------------------------------------------------------------------
-- 1. Brands. Every location belongs to a brand, so a second restaurant can be added later.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(trim(name)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.brands enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'brands' and policyname = 'staff_read_brands') then
    create policy staff_read_brands on public.brands for select to authenticated using (public.is_staff());
  end if;
end $$;
insert into public.brands (code, name) values ('corner-cafe', 'Corner Café') on conflict (code) do nothing;

alter table public.locations add column if not exists brand_id uuid references public.brands(id);
update public.locations set brand_id = (select id from public.brands where code = 'corner-cafe') where brand_id is null;
alter table public.locations alter column brand_id set not null;

-- ---------------------------------------------------------------------------------------------
-- 2. Customer profiles. Shared phones are allowed (families, offices), so the one-profile-per-number rule goes.
--    A profile needs a mobile number or an email. Profiles are archived or merged, never deleted.
-- ---------------------------------------------------------------------------------------------
alter table public.customers drop constraint if exists customers_phone_key_key;
alter table public.customers alter column phone drop not null, alter column phone_key drop not null;
alter table public.customers
  add column if not exists customer_no integer generated always as identity,
  add column if not exists alt_phone text,
  add column if not exists alt_phone_key text,
  add column if not exists delivery_address text,
  add column if not exists birth_day smallint,
  add column if not exists birth_month smallint,
  add column if not exists preferences text,
  add column if not exists version integer not null default 1,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archive_reason text,
  add column if not exists merged_into uuid references public.customers(id),
  add column if not exists review_flag text,
  add column if not exists review_note text;

do $$
declare k text; d text;
begin
  for k, d in values
    ('customers_customer_no_key', 'unique (customer_no)'),
    ('customers_contact_present', 'check (phone_key is not null or email is not null)'),
    ('customers_phone_pair', 'check ((phone is null) = (phone_key is null))'),
    ('customers_alt_phone_check', 'check ((alt_phone is null) = (alt_phone_key is null) and (alt_phone_key is null or alt_phone_key ~ ''^[0-9]{7,15}$''))'),
    ('customers_birthday_check', 'check ((birth_day is null and birth_month is null) or (birth_month between 1 and 12 and birth_day between 1 and case when birth_month = 2 then 29 when birth_month in (4,6,9,11) then 30 else 31 end))'),
    ('customers_review_flag_check', 'check (review_flag is null or review_flag in (''possible_duplicate''))'),
    ('customers_text_lengths', 'check (length(coalesce(notes, '''')) <= 2000 and length(coalesce(preferences, '''')) <= 1000 and length(coalesce(delivery_address, '''')) <= 300 and length(coalesce(company, '''')) <= 120)'),
    ('customers_not_merged_into_self', 'check (merged_into is null or merged_into <> id)')
  loop
    if not exists (select 1 from pg_constraint where conname = k and conrelid = 'public.customers'::regclass) then
      execute format('alter table public.customers add constraint %I %s', k, d);
    end if;
  end loop;
end $$;
create index if not exists customers_phone_key_idx on public.customers (phone_key);
create index if not exists customers_alt_phone_key_idx on public.customers (alt_phone_key) where alt_phone_key is not null;
create index if not exists customers_company_idx on public.customers (lower(company)) where company is not null;
create index if not exists customers_merged_into_idx on public.customers (merged_into) where merged_into is not null;

-- Profiles are changed only through staff_update_customer, which checks the version and records every field.
alter policy edit_customers on public.customers using (false) with check (false);

-- ---------------------------------------------------------------------------------------------
-- 3. Order contact snapshot. Who ordered, as it was on the order. Editing a profile later does not rewrite it.
-- ---------------------------------------------------------------------------------------------
alter table public.orders
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_phone_key text,
  add column if not exists contact_email text,
  add column if not exists contact_company text,
  add column if not exists recipient_name text,
  add column if not exists collector_name text,
  add column if not exists collector_phone text,
  add column if not exists payer_name text;

-- Fill the snapshot for existing orders without touching their updated time, version or delete guard.
alter table public.orders disable trigger user;
update public.orders o set contact_name = c.full_name, contact_phone = c.phone, contact_phone_key = c.phone_key,
       contact_email = c.email, contact_company = c.company
  from public.customers c where c.id = o.customer_id and o.contact_name is null;
alter table public.orders enable trigger user;

-- Any order saved without a snapshot takes it from the profile at that moment.
create or replace function public.fill_order_contact() returns trigger
language plpgsql set search_path = public as $$
declare c public.customers;
begin
  if new.contact_name is null and new.customer_id is not null then
    select * into c from public.customers where id = new.customer_id;
    new.contact_name := c.full_name;
    new.contact_phone := coalesce(new.contact_phone, c.phone);
    new.contact_phone_key := coalesce(new.contact_phone_key, c.phone_key);
    new.contact_email := coalesce(new.contact_email, c.email);
    new.contact_company := coalesce(new.contact_company, c.company);
  end if;
  return new;
end $$;
create or replace trigger t_orders_fill_contact before insert on public.orders
  for each row execute function public.fill_order_contact();
alter table public.orders alter column contact_name set not null;
create index if not exists orders_contact_phone_key_idx on public.orders (contact_phone_key);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_reference_lower_idx on public.orders (lower(reference));

-- ---------------------------------------------------------------------------------------------
-- 4. Marketing permission by brand, channel and the exact number or email it was given for.
--    Rows are never edited: a change of mind is a new row. A new number or email starts with no permission.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.consent_wordings (
  code text primary key,
  brand_id uuid references public.brands(id),
  wording text not null,
  where_shown text not null,
  in_use_from date,
  notes text
);
alter table public.consent_wordings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'consent_wordings' and policyname = 'staff_read_wordings') then
    create policy staff_read_wordings on public.consent_wordings for select to authenticated using (public.is_staff());
  end if;
end $$;
insert into public.consent_wordings (code, brand_id, wording, where_shown, in_use_from, notes)
select x.code, b.id, x.wording, x.where_shown, x.in_use_from, x.notes
from public.brands b, (values
  ('walkin-sheet-legacy', 'Not recorded. Staff asked at the counter and marked yes in the walk-in cake order sheet.', 'Walk-in cake order sheet (Google Sheet)', null::date,
   'Brought over from the old sheet. Applies to Corner Café on the mobile number only, and needs reconfirming before use.'),
  ('online-form-v1', 'Send me Corner Café cake specials and reminders', 'Online cake order form', null::date,
   'Wording does not name the channel. Recorded for WhatsApp and SMS on the mobile number, and email when one was given.'),
  ('staff-app-v1', 'Customer agrees to receive cake specials and reminders', 'Staff app, new order', null::date,
   'Wording does not name the channel. Recorded for WhatsApp and SMS on the mobile number, and email when one was given.'),
  ('staff-recorded-v1', 'Staff recorded the customer''s own choice for the channel shown.', 'Staff app, customer profile', current_date, null)
) as x(code, wording, where_shown, in_use_from, notes)
where b.code = 'corner-cafe'
on conflict (code) do nothing;

create table if not exists public.marketing_consents (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers(id),
  brand_id uuid not null references public.brands(id),
  channel text not null check (channel in ('whatsapp','sms','email','call')),
  destination text not null check (length(destination) between 3 and 200),
  granted boolean not null,
  needs_reconfirm boolean not null default false,
  source text not null,
  wording_code text references public.consent_wordings(code),
  evidence text,
  order_id uuid references public.orders(id),
  legacy_consent_id bigint,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now()
);
create index if not exists marketing_consents_lookup_idx on public.marketing_consents (customer_id, brand_id, channel, destination, recorded_at desc);
create unique index if not exists marketing_consents_legacy_idx on public.marketing_consents (legacy_consent_id, channel, destination) where legacy_consent_id is not null;
alter table public.marketing_consents enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'marketing_consents' and policyname = 'read_marketing_consents') then
    create policy read_marketing_consents on public.marketing_consents for select to authenticated
      using (public.has_role('manager','front_of_house','marketing'));
  end if;
end $$;
create or replace function public.protect_consents() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'Marketing permission history cannot be edited or removed. Record a new choice instead.'; end $$;
create or replace trigger t_consents_protect before update or delete on public.marketing_consents
  for each row execute function public.protect_consents();

-- Old yes answers: Corner Café only, on the mobile number, by WhatsApp and SMS. Walk-in sheet answers need reconfirming.
insert into public.marketing_consents (customer_id, brand_id, channel, destination, granted, needs_reconfirm, source, wording_code, evidence, legacy_consent_id, recorded_by, recorded_at)
select cc.customer_id, b.id, ch.channel, ch.dest, cc.granted,
       cc.granted and not (cc.source = 'Online cake order form' or cc.source like 'Staff entered order%'),
       'Brought over from the first consent record',
       case when cc.source = 'Online cake order form' then 'online-form-v1'
            when cc.source like 'Staff entered order%' then 'staff-app-v1'
            when cc.source like 'Staff:%' then 'staff-recorded-v1'
            else 'walkin-sheet-legacy' end,
       cc.source, cc.id, cc.recorded_by, cc.recorded_at
from public.customer_consents cc
join public.customers c on c.id = cc.customer_id
cross join public.brands b
cross join lateral (values ('whatsapp', c.phone_key), ('sms', c.phone_key),
                           ('email', case when cc.source = 'Online cake order form' or cc.source like 'Staff entered order%' then lower(c.email) end)) ch(channel, dest)
where b.code = 'corner-cafe' and ch.dest is not null
on conflict do nothing;

-- Latest choice for each customer, brand, channel and destination, and whether it applies to the profile's current details.
create or replace view public.consent_now with (security_invoker = true) as
select k.*, b.code as brand_code,
       k.destination = case k.channel when 'email' then lower(c.email) else c.phone_key end as applies
from (select distinct on (m.customer_id, m.brand_id, m.channel, m.destination) m.*
        from public.marketing_consents m
       order by m.customer_id, m.brand_id, m.channel, m.destination, m.recorded_at desc, m.id desc) k
join public.customers c on c.id = k.customer_id
join public.brands b on b.id = k.brand_id;

-- Write consent rows for the channels given. Phone channels use the mobile number, email uses the email.
create or replace function public._add_consent(p_customer uuid, p_brand uuid, p_channels text[], p_granted boolean, p_reconfirm boolean,
  p_source text, p_wording text, p_evidence text, p_order uuid, p_actor uuid, p_phone_key text, p_email text)
returns integer language plpgsql security definer set search_path = public as $$
declare ch text; d text; n int := 0;
begin
  foreach ch in array p_channels loop
    d := case when ch = 'email' then lower(nullif(trim(p_email), '')) else nullif(p_phone_key, '') end;
    if d is not null then
      insert into public.marketing_consents (customer_id, brand_id, channel, destination, granted, needs_reconfirm, source, wording_code, evidence, order_id, recorded_by)
      values (p_customer, p_brand, ch, d, p_granted, p_granted and p_reconfirm, p_source, p_wording, p_evidence, p_order, p_actor);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Staff record a customer's choice, per channel, for the profile's current number or email.
create or replace function public.staff_set_channel_consent(p_customer uuid, p_channels text[], p_granted boolean, p_note text default null, p_brand text default 'corner-cafe')
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.customers; b public.brands; v_name text; n int; bad text;
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot change marketing preferences.'); end if;
  select * into c from public.customers where id = p_customer;
  if not found then return public._err('customer', 'Customer not found.'); end if;
  if c.merged_into is not null then return public._err('merged', 'This profile was merged into another. Open that profile instead.'); end if;
  select * into b from public.brands where code = p_brand and active;
  if not found then return public._err('brand', 'Choose a restaurant.'); end if;
  if coalesce(cardinality(p_channels), 0) = 0 then return public._err('channels', 'Choose at least one way to contact them.', 'channels'); end if;
  select x into bad from unnest(p_channels) x where x not in ('whatsapp','sms','email','call') limit 1;
  if bad is not null then return public._err('channels', 'Unknown contact channel.', 'channels'); end if;
  if p_granted and 'email' = any(p_channels) and c.email is null then return public._err('email', 'Add an email address to the profile first.', 'channels'); end if;
  if p_granted and exists (select 1 from unnest(p_channels) x where x <> 'email') and c.phone_key is null then
    return public._err('phone', 'Add a mobile number to the profile first.', 'channels');
  end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  n := public._add_consent(c.id, b.id, p_channels, p_granted, false,
         'Staff: ' || coalesce(v_name, 'staff') || case when p_granted then ' recorded a yes' else ' recorded a no' end,
         'staff-recorded-v1', nullif(trim(coalesce(p_note, '')), ''), null, auth.uid(), c.phone_key, c.email);
  return jsonb_build_object('ok', true, 'recorded', n);
end $$;

-- The original single switch now records WhatsApp and SMS (yes), or every channel (no).
create or replace function public.staff_set_consent(p_customer uuid, p_granted boolean, p_note text default null)
returns jsonb language sql security definer set search_path = public as $$
  select public.staff_set_channel_consent(p_customer,
    case when p_granted then array['whatsapp','sms'] else array['whatsapp','sms','email','call'] end, p_granted, p_note)
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. Matching an order to a profile. Link only when the mobile number belongs to exactly one profile
--    and the name agrees. Otherwise a new profile is made and flagged for review. Nothing is overwritten.
-- ---------------------------------------------------------------------------------------------
create or replace function public._name_key(p text) returns text
language sql immutable set search_path = public as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g'))
$$;

create or replace function public._name_match(a text, b text) returns boolean
language plpgsql immutable set search_path = public as $$
declare x text[] := string_to_array(public._name_key(a), ' '); y text[] := string_to_array(public._name_key(b), ' ');
begin
  if coalesce(cardinality(x), 0) = 0 or coalesce(cardinality(y), 0) = 0 then return false; end if;
  if array_to_string(x, ' ') = array_to_string(y, ' ') then return true; end if;
  if x[1] <> y[1] then return false; end if;
  if cardinality(x) = 1 or cardinality(y) = 1 then return true; end if;
  return left(x[cardinality(x)], 1) = left(y[cardinality(y)], 1);
end $$;

create or replace function public._match_customer(p_name text, p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  with same as (
    select c.id, public._name_match(c.full_name, p_name) as named
    from public.customers c
    where p_key is not null and c.phone_key = p_key and c.merged_into is null and c.archived_at is null)
  select jsonb_build_object(
    'id', case when (select count(*) from same where named) = 1 then (select id from same where named) end,
    'same_phone', (select count(*) from same),
    'named', (select count(*) from same where named))
$$;

-- ---------------------------------------------------------------------------------------------
-- 6. Field history for a profile, from the audit trail. Managers and admins.
-- ---------------------------------------------------------------------------------------------
create or replace function public.customer_history(p_customer uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can see the change history.'); end if;
  return jsonb_build_object('ok', true, 'changes', coalesce((
    select jsonb_agg(jsonb_build_object('at', a.at, 'by', coalesce(sp.full_name, case when a.actor_id is null then 'System' else 'Unknown' end),
             'field', f.key, 'from', a.old_data->f.key, 'to', a.new_data->f.key) order by a.at desc, a.id desc, f.key)
    from public.audit_log a
    cross join lateral jsonb_each(a.new_data) f
    left join public.staff_profiles sp on sp.user_id = a.actor_id
    where a.table_name = 'customers' and a.row_id = p_customer::text and a.action = 'update'
      and f.key not in ('updated_at', 'version', 'phone_key', 'alt_phone_key')
      and (a.old_data->f.key) is distinct from f.value), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------------
-- 7. Edit a profile. Version-checked, validated, and every field change is in the audit trail.
--    Active orders change only when staff choose that, and only their contact snapshot changes.
-- ---------------------------------------------------------------------------------------------
create or replace function public.staff_update_customer(p_customer uuid, p_version integer, p_changes jsonb, p_active_orders boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.customers; n public.customers; v_name text; v_key text; v_akey text; k text; v_orders int := 0; v_ch jsonb := '[]'::jsonb;
  v_shared int; v_consent_left boolean := false;
  allowed text[] := array['full_name','phone','alt_phone','email','preferred_contact','company','is_corporate','delivery_address','birth_day','birth_month','preferences','notes'];
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot edit customer details.'); end if;
  if jsonb_typeof(p_changes) is distinct from 'object' then return public._err('bad_input', 'Nothing to save.'); end if;
  for k in select jsonb_object_keys(p_changes) loop
    if not k = any(allowed) then return public._err('bad_input', 'That detail cannot be changed here: ' || k || '.'); end if;
  end loop;
  select * into c from public.customers where id = p_customer for update;
  if not found then return public._err('customer', 'Customer not found.'); end if;
  if c.merged_into is not null then return public._err('merged', 'This profile was merged into another. Open that profile instead.'); end if;
  if p_version is distinct from c.version then
    return public._err('changed', 'Someone else changed this customer while you had it open. Your typing is kept. Check their latest details, then save again.',
                       null, jsonb_build_object('current', to_jsonb(c)));
  end if;
  n := c;
  if p_changes ? 'full_name' then n.full_name := regexp_replace(trim(coalesce(p_changes->>'full_name', '')), '\s+', ' ', 'g'); end if;
  if p_changes ? 'phone' then n.phone := nullif(trim(coalesce(p_changes->>'phone', '')), ''); end if;
  if p_changes ? 'alt_phone' then n.alt_phone := nullif(trim(coalesce(p_changes->>'alt_phone', '')), ''); end if;
  if p_changes ? 'email' then n.email := lower(nullif(trim(coalesce(p_changes->>'email', '')), '')); end if;
  if p_changes ? 'preferred_contact' then n.preferred_contact := p_changes->>'preferred_contact'; end if;
  if p_changes ? 'company' then n.company := nullif(trim(coalesce(p_changes->>'company', '')), ''); end if;
  if p_changes ? 'is_corporate' then n.is_corporate := coalesce((p_changes->>'is_corporate')::boolean, false); end if;
  if p_changes ? 'delivery_address' then n.delivery_address := nullif(trim(coalesce(p_changes->>'delivery_address', '')), ''); end if;
  if p_changes ? 'birth_day' then n.birth_day := nullif(p_changes->>'birth_day', '')::smallint; end if;
  if p_changes ? 'birth_month' then n.birth_month := nullif(p_changes->>'birth_month', '')::smallint; end if;
  if p_changes ? 'preferences' then n.preferences := nullif(trim(coalesce(p_changes->>'preferences', '')), ''); end if;
  if p_changes ? 'notes' then n.notes := nullif(trim(coalesce(p_changes->>'notes', '')), ''); end if;

  if length(coalesce(n.full_name, '')) < 2 then return public._err('full_name', 'Enter the customer name.', 'full_name'); end if;
  if length(n.full_name) > 120 then return public._err('full_name', 'That name is too long.', 'full_name'); end if;
  v_key := case when n.phone is null then null else public._phone_key(n.phone) end;
  if n.phone is not null and v_key !~ '^[0-9]{7,15}$' then return public._err('phone', 'Enter a mobile number, for example 912 3456.', 'phone'); end if;
  v_akey := case when n.alt_phone is null then null else public._phone_key(n.alt_phone) end;
  if n.alt_phone is not null and v_akey !~ '^[0-9]{7,15}$' then return public._err('alt_phone', 'Check the other number.', 'alt_phone'); end if;
  if v_akey is not null and v_akey = v_key then return public._err('alt_phone', 'The other number is the same as the mobile number.', 'alt_phone'); end if;
  if n.email is not null and n.email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
  if v_key is null and n.email is null then return public._err('phone', 'Keep a mobile number or an email so the customer can be reached.', 'phone'); end if;
  if n.preferred_contact not in ('whatsapp','phone','email') then return public._err('preferred_contact', 'Choose WhatsApp, phone call or email.', 'preferred_contact'); end if;
  if n.preferred_contact = 'email' and n.email is null then return public._err('preferred_contact', 'Add an email address, or choose WhatsApp or a phone call.', 'preferred_contact'); end if;
  if n.preferred_contact <> 'email' and v_key is null then return public._err('preferred_contact', 'Add a mobile number, or choose email.', 'preferred_contact'); end if;
  if (n.birth_day is null) <> (n.birth_month is null) then return public._err('birthday', 'Give both the day and the month, or leave the birthday blank.', 'birthday'); end if;
  if n.birth_month is not null and (n.birth_month not between 1 and 12 or n.birth_day < 1
     or n.birth_day > case when n.birth_month = 2 then 29 when n.birth_month in (4,6,9,11) then 30 else 31 end) then
    return public._err('birthday', 'That day does not exist in that month.', 'birthday');
  end if;
  if length(coalesce(n.company, '')) > 120 then return public._err('company', 'That company name is too long.', 'company'); end if;
  if length(coalesce(n.delivery_address, '')) > 300 then return public._err('delivery_address', 'That address is too long.', 'delivery_address'); end if;
  if length(coalesce(n.preferences, '')) > 1000 then return public._err('preferences', 'Keep preferences under 1,000 characters.', 'preferences'); end if;
  if length(coalesce(n.notes, '')) > 2000 then return public._err('notes', 'Keep notes under 2,000 characters.', 'notes'); end if;

  select coalesce(jsonb_agg(f), '[]') into v_ch from unnest(allowed) f
   where (to_jsonb(n)->f) is distinct from (to_jsonb(c)->f);
  if jsonb_array_length(v_ch) = 0 then return public._err('nothing', 'Nothing has changed.'); end if;

  update public.customers set full_name = n.full_name, phone = n.phone, phone_key = v_key, alt_phone = n.alt_phone, alt_phone_key = v_akey,
    email = n.email, preferred_contact = n.preferred_contact, company = n.company, is_corporate = n.is_corporate,
    delivery_address = n.delivery_address, birth_day = n.birth_day, birth_month = n.birth_month,
    preferences = n.preferences, notes = n.notes, version = version + 1
  where id = c.id;

  -- Permission does not follow a new number or email.
  v_consent_left := (v_key is distinct from c.phone_key and exists (select 1 from public.consent_now k where k.customer_id = c.id and k.channel <> 'email' and k.destination = c.phone_key and k.granted))
                 or (n.email is distinct from c.email and exists (select 1 from public.consent_now k where k.customer_id = c.id and k.channel = 'email' and k.destination = lower(c.email) and k.granted));

  if coalesce(p_active_orders, false) and (n.full_name, v_key, n.email, n.company) is distinct from (c.full_name, c.phone_key, c.email, c.company) then
    select full_name into v_name from public.staff_profiles where user_id = auth.uid();
    with upd as (
      update public.orders o set contact_name = n.full_name, contact_phone = n.phone, contact_phone_key = v_key,
             contact_email = n.email, contact_company = n.company, version = o.version + 1
       where o.customer_id = c.id and o.deleted_at is null
         and o.order_status in ('awaiting_review','awaiting_quote','awaiting_approval','awaiting_deposit','confirmed')
       returning o.id, o.contact_name)
    select count(*) into v_orders from upd;
    insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
    select o.id, auth.uid(), v_name, 'contact_updated', jsonb_build_object('from', jsonb_build_object('name', c.full_name, 'phone', c.phone, 'email', c.email),
             'to', jsonb_build_object('name', n.full_name, 'phone', n.phone, 'email', n.email), 'reason', 'Customer profile edited')
      from public.orders o
     where o.customer_id = c.id and o.deleted_at is null
       and o.order_status in ('awaiting_review','awaiting_quote','awaiting_approval','awaiting_deposit','confirmed');
  end if;

  select count(*) into v_shared from public.customers x where v_key is not null and x.phone_key = v_key and x.id <> c.id and x.merged_into is null;
  return jsonb_build_object('ok', true, 'version', c.version + 1, 'changed', v_ch, 'orders_updated', v_orders,
    'shared_phone', v_shared, 'consent_not_moved', v_consent_left);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $$;

-- ---------------------------------------------------------------------------------------------
-- 8. Search by name, mobile (main or other), email, customer number, order number or company.
-- ---------------------------------------------------------------------------------------------
