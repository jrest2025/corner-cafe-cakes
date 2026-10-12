-- CRM step 1: where each customer came from, and adding a customer without an order.

alter table public.customers add column if not exists customer_source text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'customers_source_check' and conrelid = 'public.customers'::regclass) then
    alter table public.customers add constraint customers_source_check
      check (customer_source is null or customer_source in ('online_order','staff_order','sheet_import','staff_added'));
  end if;
end $$;

-- Fill in for existing profiles without touching their versions, history or updated times.
alter table public.customers disable trigger user;
update public.customers c set customer_source = case
    when (select o.reference from public.orders o where o.customer_id = c.id order by o.created_at limit 1) like 'H-%' then 'sheet_import'
    when c.first_source = 'online' then 'online_order'
    else 'staff_order' end
 where customer_source is null;
alter table public.customers enable trigger user;

create or replace function public.fill_customer_source() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.customer_source is null then
    new.customer_source := case when new.first_source is null then 'staff_added'
                                when new.first_source = 'online' then 'online_order' else 'staff_order' end;
  end if;
  return new;
end $$;
create or replace trigger t_customers_source before insert on public.customers
  for each row execute function public.fill_customer_source();
revoke all on function public.fill_customer_source() from public, anon, authenticated;

-- Add a customer by hand. Warns when the number or email is already on a profile, and only goes ahead when staff confirm.
create or replace function public.staff_create_customer(p jsonb, p_confirm_new boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n public.customers; v_key text; v_akey text; v_id uuid; v_no int; v_name text; v_matches jsonb; ch text; bad text;
  v_channels text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'consent_channels', '[]')) x), '{}');
  b public.brands;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot add customers.'); end if;
  n.full_name := regexp_replace(trim(coalesce(p->>'full_name', '')), '\s+', ' ', 'g');
  n.phone := nullif(trim(coalesce(p->>'phone', '')), '');
  n.alt_phone := nullif(trim(coalesce(p->>'alt_phone', '')), '');
  n.email := lower(nullif(trim(coalesce(p->>'email', '')), ''));
  n.company := nullif(trim(coalesce(p->>'company', '')), '');
  n.is_corporate := coalesce((p->>'is_corporate')::boolean, false);
  n.delivery_address := nullif(trim(coalesce(p->>'delivery_address', '')), '');
  n.birth_day := nullif(p->>'birth_day', '')::smallint;
  n.birth_month := nullif(p->>'birth_month', '')::smallint;
  n.preferences := nullif(trim(coalesce(p->>'preferences', '')), '');
  n.notes := nullif(trim(coalesce(p->>'notes', '')), '');

  if length(coalesce(n.full_name, '')) < 2 then return public._err('full_name', 'Enter the customer name.', 'full_name'); end if;
  if length(n.full_name) > 120 then return public._err('full_name', 'That name is too long.', 'full_name'); end if;
  v_key := case when n.phone is null then null else public._phone_key(n.phone) end;
  if n.phone is not null and v_key !~ '^[0-9]{7,15}$' then return public._err('phone', 'Enter a mobile number, for example 912 3456.', 'phone'); end if;
  v_akey := case when n.alt_phone is null then null else public._phone_key(n.alt_phone) end;
  if n.alt_phone is not null and v_akey !~ '^[0-9]{7,15}$' then return public._err('alt_phone', 'Check the other number.', 'alt_phone'); end if;
  if v_akey is not null and v_akey = v_key then return public._err('alt_phone', 'The other number is the same as the mobile number.', 'alt_phone'); end if;
  if n.email is not null and n.email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
  if v_key is null and n.email is null then return public._err('phone', 'Enter a mobile number or an email so the customer can be reached.', 'phone'); end if;
  n.preferred_contact := coalesce(nullif(p->>'preferred_contact', ''), case when v_key is null then 'email' else 'whatsapp' end);
  if n.preferred_contact not in ('whatsapp','phone','email') then return public._err('preferred_contact', 'Choose WhatsApp, phone call or email.', 'preferred_contact'); end if;
  if n.preferred_contact = 'email' and n.email is null then return public._err('preferred_contact', 'Add an email address, or choose WhatsApp or a phone call.', 'preferred_contact'); end if;
  if n.preferred_contact <> 'email' and v_key is null then return public._err('preferred_contact', 'Add a mobile number, or choose email.', 'preferred_contact'); end if;
  if (n.birth_day is null) <> (n.birth_month is null) then return public._err('birthday', 'Give both the day and the month, or leave the birthday blank.', 'birthday'); end if;
  if n.birth_month is not null and (n.birth_month not between 1 and 12 or n.birth_day < 1
     or n.birth_day > case when n.birth_month = 2 then 29 when n.birth_month in (4,6,9,11) then 30 else 31 end) then
    return public._err('birthday', 'That day does not exist in that month.', 'birthday');
  end if;
  if length(coalesce(n.company, '')) > 120 or length(coalesce(n.delivery_address, '')) > 300
     or length(coalesce(n.preferences, '')) > 1000 or length(coalesce(n.notes, '')) > 2000 then
    return public._err('too_long', 'One of the details is too long.');
  end if;
  select x into bad from unnest(v_channels) x where x not in ('whatsapp','sms','email','call') limit 1;
  if bad is not null then return public._err('channels', 'Unknown contact channel.', 'channels'); end if;
  if 'email' = any(v_channels) and n.email is null then return public._err('channels', 'Add an email address to record a yes for email.', 'channels'); end if;
  if exists (select 1 from unnest(v_channels) x where x <> 'email') and v_key is null then
    return public._err('channels', 'Add a mobile number to record a yes for WhatsApp, SMS or calls.', 'channels');
  end if;

  -- Same number or email already on a profile: show them first. Names alone never count as a match.
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'customer_no', c.customer_no, 'full_name', c.full_name, 'phone', c.phone, 'email', c.email,
           'why', concat_ws(' and ', case when v_key is not null and (c.phone_key = v_key or c.alt_phone_key = v_key) then 'same mobile number' end,
                                     case when n.email is not null and lower(c.email) = n.email then 'same email' end)) order by c.customer_no), '[]')
    into v_matches
    from public.customers c
   where c.merged_into is null
     and ((v_key is not null and (c.phone_key = v_key or c.alt_phone_key = v_key))
          or (v_akey is not null and (c.phone_key = v_akey or c.alt_phone_key = v_akey))
          or (n.email is not null and lower(c.email) = n.email));
  if jsonb_array_length(v_matches) > 0 and not coalesce(p_confirm_new, false) then
    return public._err('possible_duplicate', 'This number or email is already on a customer profile. Check it is not the same person.', null,
                       jsonb_build_object('matches', v_matches));
  end if;

  insert into public.customers (full_name, phone, phone_key, alt_phone, alt_phone_key, email, preferred_contact, company, is_corporate,
    delivery_address, birth_day, birth_month, preferences, notes, created_by, customer_source)
  values (n.full_name, n.phone, v_key, n.alt_phone, v_akey, n.email, n.preferred_contact, n.company, n.is_corporate,
    n.delivery_address, n.birth_day, n.birth_month, n.preferences, n.notes, auth.uid(), 'staff_added')
  returning id, customer_no into v_id, v_no;

  if cardinality(v_channels) > 0 then
    select * into b from public.brands where code = coalesce(nullif(p->>'brand', ''), 'corner-cafe');
    select full_name into v_name from public.staff_profiles where user_id = auth.uid();
    perform public._add_consent(v_id, b.id, v_channels, true, false,
      'Staff: ' || coalesce(v_name, 'staff') || ' recorded a yes when adding the customer', 'staff-recorded-v1', null, null, auth.uid(), v_key, n.email);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'customer_no', v_no, 'shared_with', jsonb_array_length(v_matches));
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $$;
revoke all on function public.staff_create_customer(jsonb, boolean) from public, anon;
grant execute on function public.staff_create_customer(jsonb, boolean) to authenticated;

