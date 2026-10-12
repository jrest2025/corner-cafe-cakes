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

create or replace view public.customer_summary with (security_invoker = true) as
WITH o AS (
         SELECT o.customer_id,
            o.id,
            o.order_status,
            o.required_date,
            o.created_at,
            COALESCE(o.final_total, o.estimate_total) AS value,
            i.product_name,
            COALESCE(i.variant, i.product_name) AS cake,
            i.occasion,
            i.cake_message
           FROM (orders o
             LEFT JOIN LATERAL ( SELECT x.product_name,
                    x.variant,
                    x.occasion,
                    x.cake_message
                   FROM order_items x
                  WHERE (x.order_id = o.id)
                  ORDER BY x.created_at
                 LIMIT 1) i ON (true))
          WHERE (o.deleted_at IS NULL)
        ), agg AS (
         SELECT o.customer_id,
            count(*) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS orders_count,
            count(*) FILTER (WHERE (o.order_status = 'completed'::order_status)) AS completed_count,
            (COALESCE(sum(o.value) FILTER (WHERE (o.order_status = 'completed'::order_status)), (0)::numeric))::numeric(10,2) AS completed_spend,
            count(*) FILTER (WHERE (o.order_status = 'cancelled'::order_status)) AS cancelled_count,
            count(*) FILTER (WHERE ((o.order_status = ANY (ARRAY['awaiting_review'::order_status, 'awaiting_quote'::order_status, 'awaiting_approval'::order_status, 'awaiting_deposit'::order_status, 'confirmed'::order_status])) AND (o.required_date >= ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date))) AS upcoming_count,
            min(o.created_at) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS first_order_at,
            max(o.created_at) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS last_order_at,
            max(o.required_date) FILTER (WHERE (o.order_status = 'completed'::order_status)) AS last_completed_for,
            bool_or(((o.occasion = 'Birthday'::text) AND (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status])))) AS birthday_buyer,
            mode() WITHIN GROUP (ORDER BY o.cake) FILTER (WHERE (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status]))) AS favourite_cake,
            array_remove(array_agg(DISTINCT o.occasion) FILTER (WHERE (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status]))), NULL::text) AS occasions
           FROM o
          GROUP BY o.customer_id
        ), occ AS (
         SELECT DISTINCT ON (o.customer_id) o.customer_id,
            _next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) AS next_occasion_date,
            (
                CASE
                    WHEN (o.occasion = 'Wedding'::text) THEN 'Wedding anniversary'::text
                    ELSE o.occasion
                END ||
                CASE
                    WHEN ((o.occasion = ANY (ARRAY['Birthday'::text, 'Anniversary'::text])) AND (o.cake_message IS NOT NULL)) THEN ((' ("'::text || o.cake_message) || '")'::text)
                    ELSE ''::text
                END) AS retarget_reason
           FROM o
          WHERE ((o.occasion IS NOT NULL) AND (o.order_status = 'completed'::order_status) AND (_next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) IS NOT NULL))
          ORDER BY o.customer_id, (_next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date))
        ), cons AS (
         SELECT k.customer_id,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'whatsapp'::text)), false) AS wa,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'sms'::text)), false) AS sms,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'email'::text)), false) AS em,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'call'::text)), false) AS call,
            COALESCE(bool_or((k.granted AND k.needs_reconfirm)), false) AS reconfirm
           FROM consent_now k
          WHERE (k.applies AND (k.brand_code = 'corner-cafe'::text))
          GROUP BY k.customer_id
        ), lead AS (
         SELECT COALESCE(( SELECT (app_config.value)::integer AS value
                   FROM app_config
                  WHERE (app_config.key = 'retarget_lead_days'::text)), 14) AS days,
            COALESCE(( SELECT (app_config.value)::integer AS value
                   FROM app_config
                  WHERE (app_config.key = 'retarget_window_days'::text)), 30) AS win
        )
 SELECT c.id,
    c.full_name,
    c.phone,
    c.email,
    c.preferred_contact,
    c.is_corporate,
    c.company,
    c.first_source,
    c.created_at,
    COALESCE(a.orders_count, (0)::bigint) AS orders_count,
    COALESCE(a.completed_count, (0)::bigint) AS completed_count,
    COALESCE(a.completed_spend, (0)::numeric) AS completed_spend,
        CASE
            WHEN (COALESCE(a.completed_count, (0)::bigint) > 0) THEN round((a.completed_spend / (a.completed_count)::numeric), 2)
            ELSE NULL::numeric
        END AS average_spend,
    COALESCE(a.cancelled_count, (0)::bigint) AS cancelled_count,
    COALESCE(a.upcoming_count, (0)::bigint) AS upcoming_count,
    a.first_order_at,
    a.last_order_at,
    a.favourite_cake,
    COALESCE(a.occasions, '{}'::text[]) AS occasions,
    oc.next_occasion_date,
    (COALESCE(cn.wa, false) OR COALESCE(cn.sms, false)) AS marketing_opt_in,
    (COALESCE(a.completed_count, (0)::bigint) = 1) AS seg_first_time,
    (COALESCE(a.completed_count, (0)::bigint) >= 2) AS seg_repeat,
    (COALESCE(a.completed_spend, (0)::numeric) >= COALESCE(( SELECT (app_config.value)::numeric AS value
           FROM app_config
          WHERE (app_config.key = 'high_value_spend'::text)), (300)::numeric)) AS seg_high_value,
    ((a.last_completed_for IS NOT NULL) AND (a.last_completed_for < (((now() AT TIME ZONE 'Pacific/Fiji'::text))::date - COALESCE(( SELECT (app_config.value)::integer AS value
           FROM app_config
          WHERE (app_config.key = 'inactive_days'::text)), 180)))) AS seg_inactive,
    COALESCE(a.birthday_buyer, false) AS seg_birthday_buyer,
    (COALESCE(a.upcoming_count, (0)::bigint) > 0) AS seg_upcoming_order,
    ((c.phone_key ~~ '679%'::text) AND (oc.next_occasion_date IS NOT NULL) AND (COALESCE(a.upcoming_count, (0)::bigint) = 0) AND ((oc.next_occasion_date - ( SELECT lead.days
           FROM lead)) <= (((now() AT TIME ZONE 'Pacific/Fiji'::text))::date + ( SELECT lead.win
           FROM lead)))) AS seg_upcoming_occasion,
    c.is_corporate AS seg_corporate,
    oc.retarget_reason,
    GREATEST((oc.next_occasion_date - ( SELECT lead.days
           FROM lead)), ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) AS contact_on,
    (c.phone_key !~~ '679%'::text) AS is_overseas,
    c.customer_no,
    c.alt_phone,
    c.delivery_address,
    c.birth_day,
    c.birth_month,
    c.preferences,
    c.notes,
    c.version,
    c.archived_at,
    c.merged_into,
    c.review_flag,
    c.review_note,
    a.last_completed_for,
    COALESCE(cn.wa, false) AS consent_whatsapp,
    COALESCE(cn.sms, false) AS consent_sms,
    COALESCE(cn.em, false) AS consent_email,
    COALESCE(cn.call, false) AS consent_call,
    COALESCE(cn.reconfirm, false) AS consent_reconfirm
   FROM (((customers c
     LEFT JOIN agg a ON ((a.customer_id = c.id)))
     LEFT JOIN occ oc ON ((oc.customer_id = c.id)))
     LEFT JOIN cons cn ON ((cn.customer_id = c.id)))
  WHERE (c.merged_into IS NULL);


create or replace function public.staff_search_customers(q text)
returns setof public.customer_summary language plpgsql stable security definer set search_path = public as $$
declare v_q text := trim(coalesce(q, '')); v_low text; v_digits text; v_no int;
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then return; end if;
  if length(v_q) < 2 then return; end if;
  v_low := lower(v_q);
  v_digits := regexp_replace(v_q, '[^0-9]', '', 'g');
  v_no := case when v_q ~* '^c-?[0-9]{1,9}$' then substring(v_q from '[0-9]+')::int end;
  return query
    select s.* from public.customer_summary s join public.customers c on c.id = s.id
    where (v_no is not null and c.customer_no = v_no)
       or (v_no is null and length(v_digits) >= 3 and v_q !~* '^(cc|h)-' and v_q !~ '[a-zA-Z@]'
           and (position(v_digits in c.phone_key) > 0 or position(v_digits in coalesce(c.alt_phone_key, '')) > 0))
       or (v_low ~ '[a-z@]' and (position(v_low in lower(c.full_name)) > 0 or position(v_low in lower(coalesce(c.email, ''))) > 0
                                 or position(v_low in lower(coalesce(c.company, ''))) > 0))
       or (v_q ~* '^(cc|h)-[0-9]+$' and exists (select 1 from public.orders o where o.customer_id = c.id and o.deleted_at is null and lower(o.reference) = v_low))
    order by (c.archived_at is not null), s.last_order_at desc nulls last
    limit 20;
end $$;


-- Changes existing functions in place. Each change must match the live definition the expected number of times.
create or replace function pg_temp.patch(p_name text, p_old text, p_new text, p_count int) returns void
language plpgsql as $$
declare f oid; d text; n int;
begin
  select p.oid into strict f from pg_proc p where p.proname = p_name and p.pronamespace = 'public'::regnamespace;
  d := pg_get_functiondef(f);
  n := (length(d) - length(replace(d, p_old, ''))) / greatest(length(p_old), 1);
  if n <> p_count then raise exception 'Patch for % matched % times, expected %: %', p_name, n, p_count, left(p_old, 80); end if;
  execute replace(d, p_old, p_new);
end $$;


-- ---------------------------------------------------------------------------------------------
-- 9. Existing functions: orders keep their own contact; profiles are matched, never overwritten.
-- ---------------------------------------------------------------------------------------------

-- _create_order
select pg_temp.patch('_create_order', $p$  v_path text; v_mins int; v_deposit numeric; v_pay jsonb; v_res jsonb; v_msg text; v_dietary_answer text; v_del jsonb;
$p$, $p$  v_path text; v_mins int; v_deposit numeric; v_pay jsonb; v_res jsonb; v_msg text; v_dietary_answer text; v_del jsonb;
  v_match jsonb; v_contact_email text; v_cphone text; v_ckey text; v_company text;
$p$, 1);
select pg_temp.patch('_create_order', $p$  -- Customer: match on mobile number
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email into v_cust, v_cust_email from public.customers where id = (p->>'customer_id')::uuid;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_cust_email is null and v_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      update public.customers set email = v_email where id = v_cust; v_cust_email := v_email;
    end if;
  else$p$, $p$  -- Customer: a profile staff chose, or a match on mobile number and name. An order never overwrites a profile.
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email, full_name, phone, phone_key, company into v_cust, v_cust_email, v_name, v_cphone, v_ckey, v_company
      from public.customers where id = (p->>'customer_id')::uuid and merged_into is null;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
    if v_email is not null and v_cust_email is null then
      update public.customers set email = v_email, version = version + 1 where id = v_cust; v_cust_email := v_email;
    end if;
    v_contact_email := coalesce(v_email, v_cust_email);
  else$p$, 1);
select pg_temp.patch('_create_order', $p$      select count(*) into v_count from public.orders o join public.customers c on c.id = o.customer_id
        where c.phone_key = v_key and o.created_at > now() - interval '1 hour';$p$, $p$      select count(*) into v_count from public.orders o
        where o.contact_phone_key = v_key and o.created_at > now() - interval '1 hour';$p$, 1);
select pg_temp.patch('_create_order', $p$    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
    values (v_name, v_phone, v_key, v_email,
            case when coalesce((p->'customer'->>'whatsapp')::boolean, true) then 'whatsapp' else 'phone' end, p_source)
    on conflict (phone_key) do update
      set email = coalesce(public.customers.email, excluded.email),
          full_name = case when v_staff then excluded.full_name else public.customers.full_name end
    returning id, email into v_cust, v_cust_email;
  end if;$p$, $p$    v_match := public._match_customer(v_name, v_key);
    v_cust := nullif(v_match->>'id', '')::uuid;
    if v_cust is null then
      insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source, created_by, review_flag, review_note)
      values (v_name, v_phone, v_key, v_email,
              case when coalesce((p->'customer'->>'whatsapp')::boolean, true) then 'whatsapp' else 'phone' end, p_source, p_actor,
              case when (v_match->>'same_phone')::int > 0 then 'possible_duplicate' end,
              case when (v_match->>'same_phone')::int > 0 then
                'Same mobile number as ' || (v_match->>'same_phone') || ' other profile' || case when (v_match->>'same_phone')::int > 1 then 's' else '' end ||
                case when (v_match->>'named')::int > 1 then ' with the same name' else ' with a different name' end || '. Check whether this is the same person.' end)
      returning id, email into v_cust, v_cust_email;
    else
      select email into v_cust_email from public.customers where id = v_cust;
      -- Staff may fill a missing email. Online orders never change a profile.
      if v_staff and v_email is not null and v_cust_email is null then
        update public.customers set email = v_email, version = version + 1 where id = v_cust; v_cust_email := v_email;
      end if;
    end if;
    v_cphone := v_phone; v_ckey := v_key;
    v_contact_email := coalesce(v_email, v_cust_email);
  end if;$p$, 1);
select pg_temp.patch('_create_order', $p$estimate_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact)$p$, $p$estimate_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact,
    contact_name, contact_phone, contact_phone_key, contact_email, contact_company)$p$, 1);
select pg_temp.patch('_create_order', $p$coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact')$p$, $p$coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact',
    v_name, v_cphone, v_ckey, v_contact_email, v_company)$p$, 1);
select pg_temp.patch('_create_order', $p$  if v_opt then
    insert into public.customer_consents (customer_id, granted, source, recorded_by)
    values (v_cust, true, case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end, p_actor);
  end if;$p$, $p$  if v_opt then
    perform public._add_consent(v_cust, loc.brand_id, array['whatsapp','sms','email'], true, false,
      case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end,
      case when v_staff then 'staff-app-v1' else 'online-form-v1' end, 'Ticked on order ' || v_ref, v_order, p_actor, v_ckey, v_contact_email);
  end if;$p$, 1);
select pg_temp.patch('_create_order', $p$  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_cust_email);$p$, $p$  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_contact_email);$p$, 1);

-- import_sheet_order_create
select pg_temp.patch('import_sheet_order_create', $p$  v_dietary text[];
$p$, $p$  v_dietary text[]; v_match jsonb;
$p$, 1);
select pg_temp.patch('import_sheet_order_create', $p$  insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
  values (v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email, 'whatsapp', (p->>'source')::public.order_source)
  on conflict (phone_key) do update set email = coalesce(public.customers.email, excluded.email)
  returning id into v_cust;$p$, $p$  v_match := public._match_customer(v_name, v_pkey);
  v_cust := nullif(v_match->>'id', '')::uuid;
  if v_cust is null then
    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source, review_flag, review_note)
    values (v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email, 'whatsapp', (p->>'source')::public.order_source,
            case when (v_match->>'same_phone')::int > 0 then 'possible_duplicate' end,
            case when (v_match->>'same_phone')::int > 0 then 'Same mobile number as another profile. Check whether this is the same person.' end)
    returning id into v_cust;
  end if;$p$, 1);
select pg_temp.patch('import_sheet_order_create', $p$    estimate_total, final_total, has_dietary, customer_notes, internal_notes, marketing_opt_in, fulfilment_method, delivery_address,
    confirmed_at, cancelled_at, created_at)$p$, $p$    estimate_total, final_total, has_dietary, customer_notes, internal_notes, marketing_opt_in, fulfilment_method, delivery_address,
    confirmed_at, cancelled_at, created_at, contact_name, contact_phone, contact_phone_key, contact_email)$p$, 1);
select pg_temp.patch('import_sheet_order_create', $p$    coalesce(nullif(p->>'submitted_at','')::timestamptz, now()))
  returning id into v_order;$p$, $p$    coalesce(nullif(p->>'submitted_at','')::timestamptz, now()),
    v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email)
  returning id into v_order;$p$, 1);
select pg_temp.patch('import_sheet_order_create', $p$    insert into public.customer_consents (customer_id, granted, source) values (v_cust, true, 'Walk-in cake order sheet');$p$, $p$    perform public._add_consent(v_cust, loc.brand_id, array['whatsapp','sms'], true, true, 'Walk-in cake order sheet',
      'walkin-sheet-legacy', 'Marked yes in the sheet', v_order, null, v_pkey, null);$p$, 1);

-- import_sheet_match
select pg_temp.patch('import_sheet_match', $p$  select o.id into v_existing from public.orders o join public.customers c on c.id = o.customer_id
   where c.phone_key = p->'customer'->>'phone_key'$p$, $p$  select o.id into v_existing from public.orders o
   where o.contact_phone_key = p->'customer'->>'phone_key'$p$, 1);

-- _kitchen_snapshot
select pg_temp.patch('_kitchen_snapshot', $p$'customer', split_part(trim(c.full_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(c.full_name), ' ', 2), ''), 1) || '.', ''),$p$, $p$'customer', split_part(trim(o.contact_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(o.contact_name), ' ', 2), ''), 1) || '.', ''),$p$, 1);
select pg_temp.patch('_kitchen_snapshot', $p$  join public.customers c on c.id = o.customer_id
$p$, $p$$p$, 1);

-- email_payload
select pg_temp.patch('email_payload', $p$'customer', jsonb_build_object('full_name', c.full_name, 'phone', c.phone, 'email', c.email, 'preferred_contact', c.preferred_contact,$p$, $p$'customer', jsonb_build_object('full_name', o.contact_name, 'phone', o.contact_phone, 'email', o.contact_email, 'preferred_contact', c.preferred_contact,$p$, 1);
select pg_temp.patch('email_payload', $p$(select count(*) from public.orders x where x.customer_id = c.id and$p$, $p$(select count(*) from public.orders x where x.customer_id = o.customer_id and$p$, 1);
select pg_temp.patch('email_payload', $p$  join public.customers c on c.id = o.customer_id
$p$, $p$  left join public.customers c on c.id = o.customer_id
$p$, 1);

-- _record_payment
select pg_temp.patch('_record_payment', $p$    select email into v_cust_email from public.customers where id = o.customer_id;
$p$, $p$    v_cust_email := o.contact_email;
$p$, 1);

-- staff_order_action
select pg_temp.patch('staff_order_action', $p$  select email into v_email from public.customers where id = o.customer_id;
$p$, $p$  v_email := o.contact_email;
$p$, 1);

-- staff_amend_order
select pg_temp.patch('staff_amend_order', $p$n_cname text; n_cemail text; n_price numeric;$p$, $p$n_cname text; n_cemail text; n_cphone text; n_ckey text; n_price numeric;$p$, 1);
select pg_temp.patch('staff_amend_order', $p$  n_cname := case when p_changes ? 'customer_name' then trim(p_changes->>'customer_name') else c.full_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else c.email end;$p$, $p$  n_cname := case when p_changes ? 'customer_name' then regexp_replace(trim(p_changes->>'customer_name'), '\s+', ' ', 'g') else o.contact_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else o.contact_email end;
  n_cphone := case when p_changes ? 'customer_phone' then nullif(trim(p_changes->>'customer_phone'), '') else o.contact_phone end;
  n_ckey := case when p_changes ? 'customer_phone' then public._phone_key(n_cphone) else o.contact_phone_key end;$p$, 1);
select pg_temp.patch('staff_amend_order', $p$  if n_cemail is not null and n_cemail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;$p$, $p$  if n_cemail is not null and n_cemail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;
  if p_changes ? 'customer_phone' and (n_cphone is null or n_ckey !~ '^[0-9]{7,15}$') then return public._err('customer_phone', 'Enter a mobile number, for example 912 3456.', 'customer_phone'); end if;$p$, 1);
select pg_temp.patch('staff_amend_order', $p$  if n_cname is distinct from c.full_name then ch := ch || jsonb_build_object('field','customer_name','label','Customer name','from',c.full_name,'to',n_cname,'kitchen',false); end if;
  if n_cemail is distinct from c.email then ch := ch || jsonb_build_object('field','customer_email','label','Customer email','from',coalesce(c.email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;$p$, $p$  if n_cname is distinct from o.contact_name then ch := ch || jsonb_build_object('field','customer_name','label','Contact name on this order','from',o.contact_name,'to',n_cname,'kitchen',false); end if;
  if n_ckey is distinct from o.contact_phone_key then ch := ch || jsonb_build_object('field','customer_phone','label','Contact mobile on this order','from',coalesce(o.contact_phone,'None'),'to',coalesce(n_cphone,'None'),'kitchen',false); end if;
  if n_cemail is distinct from o.contact_email then ch := ch || jsonb_build_object('field','customer_email','label','Contact email on this order','from',coalesce(o.contact_email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;$p$, 1);
select pg_temp.patch('staff_amend_order', $p$      'customer_record', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email')));$p$, $p$      'contact_only', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email','customer_phone')));$p$, 1);
select pg_temp.patch('staff_amend_order', $p$  if n_cname is distinct from c.full_name or n_cemail is distinct from c.email then
    update public.customers set full_name = n_cname, email = n_cemail where id = c.id;
  end if;$p$, $p$  -- The customer's profile is not changed here. Staff edit the profile separately.
  if (n_cname, n_cemail, n_ckey) is distinct from (o.contact_name, o.contact_email, o.contact_phone_key) then
    update public.orders set contact_name = n_cname, contact_email = n_cemail, contact_phone = n_cphone, contact_phone_key = n_ckey where id = o.id;
  end if;$p$, 1);

-- dashboard_data
select pg_temp.patch('dashboard_data', $p$'c', o.customer_id, 'cn', c.full_name,$p$, $p$'c', o.customer_id, 'cn', o.contact_name,$p$, 1);

-- admin_deleted_orders
select pg_temp.patch('admin_deleted_orders', $p$'id', o.id, 'reference', o.reference, 'customer', c.full_name,$p$, $p$'id', o.id, 'reference', o.reference, 'customer', o.contact_name,$p$, 1);

-- sheet_backup_rows_data
select pg_temp.patch('sheet_backup_rows_data', $p$        coalesce(c.full_name, ''),
        coalesce(c.phone, ''),
        coalesce(c.email, ''),$p$, $p$        coalesce(o.contact_name, c.full_name, ''),
        coalesce(o.contact_phone, c.phone, ''),
        coalesce(o.contact_email, c.email, ''),$p$, 1);

-- register_rebuild
select pg_temp.patch('register_rebuild', $p$    c.full_name, nullif(c.phone_key, ''), c.email,
$p$, $p$    coalesce(o.contact_name, c.full_name), nullif(coalesce(o.contact_phone_key, c.phone_key), ''), coalesce(o.contact_email, c.email),
$p$, 2);


-- ---------------------------------------------------------------------------------------------
-- 10. Access. Signed-in staff call these; each checks the role itself.
-- ---------------------------------------------------------------------------------------------
revoke all on function public._add_consent(uuid, uuid, text[], boolean, boolean, text, text, text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public._match_customer(text, text) from public, anon, authenticated;
revoke all on function public.fill_order_contact() from public, anon, authenticated;
revoke all on function public.protect_consents() from public, anon, authenticated;
revoke all on function public.staff_update_customer(uuid, integer, jsonb, boolean) from public, anon;
revoke all on function public.customer_history(uuid) from public, anon;
revoke all on function public.staff_set_channel_consent(uuid, text[], boolean, text, text) from public, anon;
revoke all on function public.staff_set_consent(uuid, boolean, text) from public, anon;
grant execute on function public.staff_update_customer(uuid, integer, jsonb, boolean) to authenticated;
grant execute on function public.customer_history(uuid) to authenticated;
grant execute on function public.staff_set_channel_consent(uuid, text[], boolean, text, text) to authenticated;
grant execute on function public.staff_set_consent(uuid, boolean, text) to authenticated;
grant select on public.brands, public.consent_wordings, public.marketing_consents, public.consent_now to authenticated;
revoke all on public.brands, public.consent_wordings, public.marketing_consents, public.consent_now from anon;
