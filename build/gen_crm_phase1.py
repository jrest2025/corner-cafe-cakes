"""Builds supabase/sql/crm_phase1.sql: the hand-written head, the summary view and search, then the existing
functions that read or write customers, changed so orders keep their own contact details and profiles are never
overwritten. Each change must match the live definition exactly once, or the build stops."""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAP = (ROOT / 'supabase/snapshot/functions.sql').read_text()
HEAD = (ROOT / 'supabase/sql/crm_phase1.head.sql').read_text()

def fn(name):
    m = re.search(r'^CREATE OR REPLACE FUNCTION public\.' + re.escape(name) + r'\(.*?^\$function\$;?\s*$', SNAP, re.S | re.M)
    if not m: sys.exit('function not found: ' + name)
    t = m.group(0).rstrip()
    return t if t.endswith(';') else t + ';'

def q(x):
    if '$p$' in x: sys.exit('dollar tag clash')
    return '$p$' + x + '$p$'

def patch(name, *pairs, count=1):
    """Checks each change against the saved live definition, then emits a patch applied to the live definition."""
    t = fn(name); lines = [f'-- {name}']
    for old, new in pairs:
        n = t.count(old)
        if n != count: sys.exit(f'{name}: expected {count} match, found {n}: {old[:80]!r}')
        t = t.replace(old, new)
        lines.append(f"select pg_temp.patch('{name}', {q(old)}, {q(new)}, {count});")
    return '\n'.join(lines) + '\n'

out = [HEAD]
PATCHER = r"""
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
"""

# ---------- summary view and search ----------
view = (ROOT / 'supabase/snapshot/views.sql').read_text()
v = view.split("-- view customer_summary ['security_invoker=true']\n", 1)[1]
v = v.split('\n-- view ', 1)[0].strip().rstrip(';')
def vrep(old, new):
    global v
    if v.count(old) != 1: sys.exit('view: ' + old[:60])
    v = v.replace(old, new)
vrep("""cons AS (
         SELECT DISTINCT ON (customer_consents.customer_id) customer_consents.customer_id,
            customer_consents.granted,
            customer_consents.recorded_at
           FROM customer_consents
          ORDER BY customer_consents.customer_id, customer_consents.recorded_at DESC
        )""", """cons AS (
         SELECT k.customer_id,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'whatsapp'::text)), false) AS wa,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'sms'::text)), false) AS sms,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'email'::text)), false) AS em,
            COALESCE(bool_or(k.granted) FILTER (WHERE (k.channel = 'call'::text)), false) AS call,
            COALESCE(bool_or((k.granted AND k.needs_reconfirm)), false) AS reconfirm
           FROM consent_now k
          WHERE (k.applies AND (k.brand_code = 'corner-cafe'::text))
          GROUP BY k.customer_id
        )""")
vrep("COALESCE(cn.granted, false) AS marketing_opt_in,", "(COALESCE(cn.wa, false) OR COALESCE(cn.sms, false)) AS marketing_opt_in,")
vrep("    (c.phone_key !~~ '679%'::text) AS is_overseas\n",
     "    (c.phone_key !~~ '679%'::text) AS is_overseas,\n"
     "    c.customer_no,\n    c.alt_phone,\n    c.delivery_address,\n    c.birth_day,\n    c.birth_month,\n    c.preferences,\n    c.notes,\n"
     "    c.version,\n    c.archived_at,\n    c.merged_into,\n    c.review_flag,\n    c.review_note,\n    a.last_completed_for,\n"
     "    COALESCE(cn.wa, false) AS consent_whatsapp,\n    COALESCE(cn.sms, false) AS consent_sms,\n    COALESCE(cn.em, false) AS consent_email,\n"
     "    COALESCE(cn.call, false) AS consent_call,\n    COALESCE(cn.reconfirm, false) AS consent_reconfirm\n")
vrep("     LEFT JOIN cons cn ON ((cn.customer_id = c.id)))", "     LEFT JOIN cons cn ON ((cn.customer_id = c.id)))\n  WHERE (c.merged_into IS NULL)")
out.append('create or replace view public.customer_summary with (security_invoker = true) as\n' + v + ';\n')

out.append(r"""
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
""")

out.append(PATCHER)
out.append('\n-- ---------------------------------------------------------------------------------------------\n'
           '-- 9. Existing functions: orders keep their own contact; profiles are matched, never overwritten.\n'
           '-- ---------------------------------------------------------------------------------------------\n')

# _create_order
out.append(patch('_create_order',
 ("  v_path text; v_mins int; v_deposit numeric; v_pay jsonb; v_res jsonb; v_msg text; v_dietary_answer text; v_del jsonb;\n",
  "  v_path text; v_mins int; v_deposit numeric; v_pay jsonb; v_res jsonb; v_msg text; v_dietary_answer text; v_del jsonb;\n"
  "  v_match jsonb; v_contact_email text; v_cphone text; v_ckey text; v_company text;\n"),
 ("""  -- Customer: match on mobile number
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email into v_cust, v_cust_email from public.customers where id = (p->>'customer_id')::uuid;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_cust_email is null and v_email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then
      update public.customers set email = v_email where id = v_cust; v_cust_email := v_email;
    end if;
  else""",
  """  -- Customer: a profile staff chose, or a match on mobile number and name. An order never overwrites a profile.
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email, full_name, phone, phone_key, company into v_cust, v_cust_email, v_name, v_cphone, v_ckey, v_company
      from public.customers where id = (p->>'customer_id')::uuid and merged_into is null;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_email !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
    if v_email is not null and v_cust_email is null then
      update public.customers set email = v_email, version = version + 1 where id = v_cust; v_cust_email := v_email;
    end if;
    v_contact_email := coalesce(v_email, v_cust_email);
  else"""),
 ("""      select count(*) into v_count from public.orders o join public.customers c on c.id = o.customer_id
        where c.phone_key = v_key and o.created_at > now() - interval '1 hour';""",
  """      select count(*) into v_count from public.orders o
        where o.contact_phone_key = v_key and o.created_at > now() - interval '1 hour';"""),
 ("""    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
    values (v_name, v_phone, v_key, v_email,
            case when coalesce((p->'customer'->>'whatsapp')::boolean, true) then 'whatsapp' else 'phone' end, p_source)
    on conflict (phone_key) do update
      set email = coalesce(public.customers.email, excluded.email),
          full_name = case when v_staff then excluded.full_name else public.customers.full_name end
    returning id, email into v_cust, v_cust_email;
  end if;""",
  """    v_match := public._match_customer(v_name, v_key);
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
  end if;"""),
 ("estimate_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact)",
  "estimate_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact,\n    contact_name, contact_phone, contact_phone_key, contact_email, contact_company)"),
 ("coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact')",
  "coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact',\n    v_name, v_cphone, v_ckey, v_contact_email, v_company)"),
 ("""  if v_opt then
    insert into public.customer_consents (customer_id, granted, source, recorded_by)
    values (v_cust, true, case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end, p_actor);
  end if;""",
  """  if v_opt then
    perform public._add_consent(v_cust, loc.brand_id, array['whatsapp','sms','email'], true, false,
      case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end,
      case when v_staff then 'staff-app-v1' else 'online-form-v1' end, 'Ticked on order ' || v_ref, v_order, p_actor, v_ckey, v_contact_email);
  end if;"""),
 ("""  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_cust_email);""",
  """  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_contact_email);"""),
))

# import_sheet_order_create
out.append(patch('import_sheet_order_create',
 ("  v_dietary text[];\n", "  v_dietary text[]; v_match jsonb;\n"),
 ("""  insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
  values (v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email, 'whatsapp', (p->>'source')::public.order_source)
  on conflict (phone_key) do update set email = coalesce(public.customers.email, excluded.email)
  returning id into v_cust;""",
  """  v_match := public._match_customer(v_name, v_pkey);
  v_cust := nullif(v_match->>'id', '')::uuid;
  if v_cust is null then
    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source, review_flag, review_note)
    values (v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email, 'whatsapp', (p->>'source')::public.order_source,
            case when (v_match->>'same_phone')::int > 0 then 'possible_duplicate' end,
            case when (v_match->>'same_phone')::int > 0 then 'Same mobile number as another profile. Check whether this is the same person.' end)
    returning id into v_cust;
  end if;"""),
 ("""    estimate_total, final_total, has_dietary, customer_notes, internal_notes, marketing_opt_in, fulfilment_method, delivery_address,
    confirmed_at, cancelled_at, created_at)""",
  """    estimate_total, final_total, has_dietary, customer_notes, internal_notes, marketing_opt_in, fulfilment_method, delivery_address,
    confirmed_at, cancelled_at, created_at, contact_name, contact_phone, contact_phone_key, contact_email)"""),
 ("""    coalesce(nullif(p->>'submitted_at','')::timestamptz, now()))
  returning id into v_order;""",
  """    coalesce(nullif(p->>'submitted_at','')::timestamptz, now()),
    v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email)
  returning id into v_order;"""),
 ("""    insert into public.customer_consents (customer_id, granted, source) values (v_cust, true, 'Walk-in cake order sheet');""",
  """    perform public._add_consent(v_cust, loc.brand_id, array['whatsapp','sms'], true, true, 'Walk-in cake order sheet',
      'walkin-sheet-legacy', 'Marked yes in the sheet', v_order, null, v_pkey, null);"""),
))

# import_sheet_match: match on the order's own number
out.append(patch('import_sheet_match',
 ("""  select o.id into v_existing from public.orders o join public.customers c on c.id = o.customer_id
   where c.phone_key = p->'customer'->>'phone_key'""",
  """  select o.id into v_existing from public.orders o
   where o.contact_phone_key = p->'customer'->>'phone_key'"""),
))

# Kitchen snapshot: the name on the order
out.append(patch('_kitchen_snapshot',
 ("'customer', split_part(trim(c.full_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(c.full_name), ' ', 2), ''), 1) || '.', ''),",
  "'customer', split_part(trim(o.contact_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(o.contact_name), ' ', 2), ''), 1) || '.', ''),"),
 ("  join public.customers c on c.id = o.customer_id\n", ""),
))

# Emails: the contact on the order
out.append(patch('email_payload',
 ("'customer', jsonb_build_object('full_name', c.full_name, 'phone', c.phone, 'email', c.email, 'preferred_contact', c.preferred_contact,",
  "'customer', jsonb_build_object('full_name', o.contact_name, 'phone', o.contact_phone, 'email', o.contact_email, 'preferred_contact', c.preferred_contact,"),
 ("(select count(*) from public.orders x where x.customer_id = c.id and",
  "(select count(*) from public.orders x where x.customer_id = o.customer_id and"),
 ("  join public.customers c on c.id = o.customer_id\n", "  left join public.customers c on c.id = o.customer_id\n"),
))
out.append(patch('_record_payment',
 ("    select email into v_cust_email from public.customers where id = o.customer_id;\n", "    v_cust_email := o.contact_email;\n"),
))
out.append(patch('staff_order_action',
 ("  select email into v_email from public.customers where id = o.customer_id;\n", "  v_email := o.contact_email;\n"),
))

# Amendments change the contact on this order only
out.append(patch('staff_amend_order',
 ("n_cname text; n_cemail text; n_price numeric;", "n_cname text; n_cemail text; n_cphone text; n_ckey text; n_price numeric;"),
 ("""  n_cname := case when p_changes ? 'customer_name' then trim(p_changes->>'customer_name') else c.full_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else c.email end;""",
  """  n_cname := case when p_changes ? 'customer_name' then regexp_replace(trim(p_changes->>'customer_name'), '\\s+', ' ', 'g') else o.contact_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else o.contact_email end;
  n_cphone := case when p_changes ? 'customer_phone' then nullif(trim(p_changes->>'customer_phone'), '') else o.contact_phone end;
  n_ckey := case when p_changes ? 'customer_phone' then public._phone_key(n_cphone) else o.contact_phone_key end;"""),
 ("""  if n_cemail is not null and n_cemail !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;""",
  """  if n_cemail is not null and n_cemail !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;
  if p_changes ? 'customer_phone' and (n_cphone is null or n_ckey !~ '^[0-9]{7,15}$') then return public._err('customer_phone', 'Enter a mobile number, for example 912 3456.', 'customer_phone'); end if;"""),
 ("""  if n_cname is distinct from c.full_name then ch := ch || jsonb_build_object('field','customer_name','label','Customer name','from',c.full_name,'to',n_cname,'kitchen',false); end if;
  if n_cemail is distinct from c.email then ch := ch || jsonb_build_object('field','customer_email','label','Customer email','from',coalesce(c.email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;""",
  """  if n_cname is distinct from o.contact_name then ch := ch || jsonb_build_object('field','customer_name','label','Contact name on this order','from',o.contact_name,'to',n_cname,'kitchen',false); end if;
  if n_ckey is distinct from o.contact_phone_key then ch := ch || jsonb_build_object('field','customer_phone','label','Contact mobile on this order','from',coalesce(o.contact_phone,'None'),'to',coalesce(n_cphone,'None'),'kitchen',false); end if;
  if n_cemail is distinct from o.contact_email then ch := ch || jsonb_build_object('field','customer_email','label','Contact email on this order','from',coalesce(o.contact_email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;"""),
 ("""      'customer_record', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email')));""",
  """      'contact_only', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email','customer_phone')));"""),
 ("""  if n_cname is distinct from c.full_name or n_cemail is distinct from c.email then
    update public.customers set full_name = n_cname, email = n_cemail where id = c.id;
  end if;""",
  """  -- The customer's profile is not changed here. Staff edit the profile separately.
  if (n_cname, n_cemail, n_ckey) is distinct from (o.contact_name, o.contact_email, o.contact_phone_key) then
    update public.orders set contact_name = n_cname, contact_email = n_cemail, contact_phone = n_cphone, contact_phone_key = n_ckey where id = o.id;
  end if;"""),
))

# Reports and lists show the name on the order
out.append(patch('dashboard_data', ("'c', o.customer_id, 'cn', c.full_name,", "'c', o.customer_id, 'cn', o.contact_name,")))
out.append(patch('admin_deleted_orders', ("'id', o.id, 'reference', o.reference, 'customer', c.full_name,", "'id', o.id, 'reference', o.reference, 'customer', o.contact_name,")))
out.append(patch('sheet_backup_rows_data',
 ("""        coalesce(c.full_name, ''),
        coalesce(c.phone, ''),
        coalesce(c.email, ''),""",
  """        coalesce(o.contact_name, c.full_name, ''),
        coalesce(o.contact_phone, c.phone, ''),
        coalesce(o.contact_email, c.email, ''),"""),
))
out.append(patch('register_rebuild', ("    c.full_name, nullif(c.phone_key, ''), c.email,\n",
  "    coalesce(o.contact_name, c.full_name), nullif(coalesce(o.contact_phone_key, c.phone_key), ''), coalesce(o.contact_email, c.email),\n"), count=2))

out.append(r"""
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
""")

(ROOT / 'supabase/sql/crm_phase1.sql').write_text('\n'.join(out))
print('written', sum(len(x) for x in out), 'characters')
