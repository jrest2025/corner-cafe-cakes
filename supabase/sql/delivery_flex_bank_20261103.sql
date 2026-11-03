-- Delivery flexibility and bank details for customer emails (3 Nov 2026, approved scope by Roneel)
-- 1. Staff can type a delivery area that is not on the list (a one-off "other area"), with its own charge.
--    It never joins the permanent list; only managers edit that list (Settings, Delivery areas).
-- 2. Staff can set a different delivery charge for a listed area, with a short reason. Recorded in the order history:
--    the area's usual charge, the new charge, the reason, who and when. No manager sign-off (Roneel: not strict, just audited).
-- 3. Bank details for customer emails live in one place (payment_settings). Only admins can change them; every change is in the audit log.
-- Website guests are unchanged: they can only choose a listed area, at that area's set charge.
-- Additive: older staff app code keeps working with these functions.

-- ---------- 1 and 2: the delivery check ----------
create or replace function public._delivery_check(p_loc uuid, p_method text, p_zone text, p_address text, p_fee numeric, p_contact text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare z public.delivery_zones; v_fee numeric; v_zone text := nullif(trim(coalesce(p_zone, '')), '');
  v_staff boolean := auth.uid() is not null and (public.has_perm('ord.create') or public.has_perm('ord.edit'));
begin
  if coalesce(p_method, 'collection') = 'collection' then
    return jsonb_build_object('ok', true, 'method', 'collection', 'fee', 0);
  end if;
  if p_method <> 'delivery' then return public._err('method', 'Choose collection or delivery.', 'method'); end if;
  select * into z from public.delivery_zones where location_id = p_loc and name = v_zone and active;
  if not found then
    -- Staff only: an area that is not on the list
    if not v_staff or v_zone is null then return public._err('zone', 'Choose a delivery area.', 'zone'); end if;
    if length(v_zone) < 2 or length(v_zone) > 60 then return public._err('zone', 'Type the delivery area (2 to 60 letters).', 'zone'); end if;
  end if;
  if length(trim(coalesce(p_address, ''))) < 5 then return public._err('address', 'Enter the delivery address.', 'address'); end if;
  -- Staff may set any charge (the reason is checked by the calling function); guests always pay the area's set charge
  v_fee := round(case when v_staff then coalesce(p_fee, z.fee) else z.fee end, 2);
  if v_fee is null or v_fee < 0 then return public._err('fee', 'Enter the delivery charge.', 'fee'); end if;
  return jsonb_build_object('ok', true, 'method', 'delivery', 'zone', coalesce(z.name, v_zone), 'address', trim(p_address), 'fee', v_fee,
                            'contact', nullif(trim(coalesce(p_contact, '')), ''), 'custom', z.id is null, 'standard_fee', z.fee);
end $$;
revoke all on function public._delivery_check(uuid, text, text, text, numeric, text) from public, anon, authenticated;

-- ---------- New order: a different charge needs a reason; the change is logged ----------
do $m$ declare d text; begin
  select pg_get_functiondef('public.staff_create_order(jsonb)'::regprocedure) into d;
  if strpos(d, 'v_pay jsonb;') = 0
     or strpos(d, '  v_res := public._create_order(p, v_src, auth.uid(), v_name);') = 0
     or strpos(d, 'perform public._log(v_oid,auth.uid(),v_name,''delivery_waived''') = 0 then
    raise exception 'staff_create_order has changed; review this migration';
  end if;
  d := replace(d, 'v_pay jsonb;', 'v_pay jsonb; v_std numeric; v_dfee numeric; v_custom boolean;');
  d := replace(d, '  v_res := public._create_order(p, v_src, auth.uid(), v_name);',
'  if p->''delivery''->>''method'' = ''delivery'' and coalesce(p->''delivery''->>''fee'', '''') ~ ''^\d+(\.\d{1,2})?$'' then
    v_dfee := round((p->''delivery''->>''fee'')::numeric, 2);
    select z.fee into v_std from public.delivery_zones z join public.locations l on l.id = z.location_id
      where l.code = ''corner-cafe'' and z.name = trim(p->''delivery''->>''zone'') and z.active;
    v_custom := not found;
    if v_dfee <> 0 and not v_custom and v_std is not null and v_dfee <> v_std
       and length(trim(coalesce(p->''delivery''->>''fee_reason'', ''''))) < 3 then
      return public._err(''fee'', ''Give a short reason for the different delivery charge.'', ''fee'');
    end if;
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);');
  d := replace(d, '    if jsonb_array_length(coalesce(v_treats->''lines'', ''[]'')) > 0 then',
'    if v_dfee is not null and v_dfee <> 0 and (v_custom or v_dfee is distinct from v_std) then
      perform public._log(v_oid, auth.uid(), v_name, ''delivery_fee_changed'', jsonb_build_object(''zone'', trim(p->''delivery''->>''zone''),
        ''custom'', v_custom, ''standard_fee'', v_std, ''fee'', v_dfee, ''reason'', nullif(trim(coalesce(p->''delivery''->>''fee_reason'', '''')), '''')));
    end if;
    if jsonb_array_length(coalesce(v_treats->''lines'', ''[]'')) > 0 then');
  if strpos(d, 'delivery_fee_changed') = 0 or strpos(d, 'v_custom := not found;') = 0 then raise exception 'staff_create_order patch did not apply'; end if;
  execute d;
end $m$;

-- ---------- Change collection or delivery on an order (the order panel) ----------
create or replace function public.staff_set_fulfilment_v2(p_order uuid, p_version integer, p_method text, p_zone text default null, p_address text default null,
  p_fee numeric default null, p_contact text default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $f$
declare o public.orders; r jsonb; n text; v_std numeric; v_custom boolean := false; v_new numeric; v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null or not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into o from public.orders where id = p_order;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_method = 'delivery' then
    select z.fee into v_std from public.delivery_zones z where z.location_id = o.location_id and z.name = trim(coalesce(p_zone, '')) and z.active;
    v_custom := not found;
    v_new := round(coalesce(p_fee, v_std), 2);
    -- A reason is needed when a listed area gets a charge other than its usual one, and that is a change for this order
    if not v_custom and v_std is not null and v_new is not null and v_new <> v_std
       and (o.fulfilment_method is distinct from 'delivery' or o.delivery_zone is distinct from trim(p_zone) or o.delivery_fee is distinct from v_new)
       and length(coalesce(v_reason, '')) < 3 then
      return public._err('fee', case when v_new = 0 then 'Give a short reason for complimentary delivery.' else 'Give a short reason for the different delivery charge.' end, 'fee');
    end if;
    if length(coalesce(v_reason, '')) > 200 then return public._err('fee', 'Keep the reason to 200 characters.', 'fee'); end if;
  end if;
  r := public.staff_set_fulfilment(p_order, p_version, p_method, p_zone, p_address, p_fee, p_contact);
  if coalesce((r->>'ok')::boolean, false) and p_method = 'delivery' and v_new is not null
     and (v_custom or v_new is distinct from v_std)
     and (o.fulfilment_method is distinct from 'delivery' or o.delivery_zone is distinct from trim(p_zone) or o.delivery_fee is distinct from v_new) then
    select full_name into n from public.staff_profiles where user_id = auth.uid();
    perform public._log(p_order, auth.uid(), n, case when v_new = 0 and not v_custom then 'delivery_waived' else 'delivery_fee_changed' end,
      jsonb_build_object('zone', trim(p_zone), 'custom', v_custom, 'standard_fee', v_std, 'fee', v_new, 'reason', v_reason));
  end if;
  return r;
end $f$;
revoke all on function public.staff_set_fulfilment_v2(uuid, integer, text, text, text, numeric, text, text) from public, anon;
grant execute on function public.staff_set_fulfilment_v2(uuid, integer, text, text, text, numeric, text, text) to authenticated;

-- ---------- Change order: allow an area that is not on the list (its charge must be entered) ----------
do $m$ declare d text; a text := '      if not found then return public._err(''zone'', ''Choose a delivery area.'', ''zone''); end if;'; begin
  select pg_get_functiondef('public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)'::regprocedure) into d;
  if strpos(d, a) = 0 or strpos(d, '      v_std_fee := z.fee;') = 0 then raise exception 'staff_amend_order has changed; review this migration'; end if;
  d := replace(d, a, '      if not found and (n_zone is null or length(n_zone) < 2 or length(n_zone) > 60) then return public._err(''zone'', ''Choose or type a delivery area.'', ''zone''); end if;');
  execute d;
end $m$;

-- ---------- 3: bank details for customer emails ----------
create table if not exists public.payment_settings (
  location_id uuid primary key references public.locations(id) on delete cascade,
  bank_name text not null check (length(trim(bank_name)) >= 2),
  account_name text not null check (length(trim(account_name)) >= 2),
  account_number text not null check (account_number ~ '^[0-9 -]{5,30}$'),
  bsb text, swift text,
  show_in_emails boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_by_name text
);
alter table public.payment_settings enable row level security;
drop policy if exists staff_read_payment_settings on public.payment_settings;
create policy staff_read_payment_settings on public.payment_settings for select to authenticated using (public.is_staff());
-- No write policy: changes only through admin_set_payment_settings
drop trigger if exists t_audit_payment_settings on public.payment_settings;
create trigger t_audit_payment_settings after insert or update or delete on public.payment_settings for each row execute function public.write_audit();

create or replace function public.admin_set_payment_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $f$
declare v_loc uuid; v_name text; t text;
begin
  if auth.uid() is null or not public.has_perm('mgmt.system') then return public._err('forbidden', 'Only an admin can change the bank details.'); end if;
  select id into v_loc from public.locations where code = 'corner-cafe';
  if length(trim(coalesce(p->>'bank_name', ''))) < 2 then return public._err('bank_name', 'Enter the bank name.', 'bank_name'); end if;
  if length(trim(coalesce(p->>'account_name', ''))) < 2 then return public._err('account_name', 'Enter the account name.', 'account_name'); end if;
  if coalesce(trim(p->>'account_number'), '') !~ '^[0-9 -]{5,30}$' then return public._err('account_number', 'Check the account number (numbers only).', 'account_number'); end if;
  foreach t in array array['bank_name','account_name','bsb','swift'] loop
    if length(coalesce(p->>t, '')) > 80 then return public._err(t, 'Keep each detail under 80 characters.', t); end if;
  end loop;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  insert into public.payment_settings as s (location_id, bank_name, account_name, account_number, bsb, swift, show_in_emails, updated_at, updated_by, updated_by_name)
  values (v_loc, trim(p->>'bank_name'), trim(p->>'account_name'), trim(p->>'account_number'), nullif(trim(coalesce(p->>'bsb', '')), ''),
          nullif(upper(trim(coalesce(p->>'swift', ''))), ''), coalesce((p->>'show_in_emails')::boolean, true), now(), auth.uid(), v_name)
  on conflict (location_id) do update set bank_name = excluded.bank_name, account_name = excluded.account_name, account_number = excluded.account_number,
    bsb = excluded.bsb, swift = excluded.swift, show_in_emails = excluded.show_in_emails, updated_at = now(), updated_by = auth.uid(), updated_by_name = v_name;
  return jsonb_build_object('ok', true);
end $f$;
revoke all on function public.admin_set_payment_settings(jsonb) from public, anon;
grant execute on function public.admin_set_payment_settings(jsonb) to authenticated;

-- The café's account, as supplied by Roneel on 3 Nov 2026 (screenshot of the official bank details)
insert into public.payment_settings (location_id, bank_name, account_name, account_number, bsb, swift, updated_by_name)
select id, 'Westpac Banking Corporation', 'Jacks Restaurant Limited', '9800440860', '03-9004', 'WPACFJFX', 'Set up from the official bank details (Roneel, 3 Nov 2026)'
from public.locations where code = 'corner-cafe'
on conflict (location_id) do nothing;
