-- CRM step 2, tightened after the dry run.
-- Automatic only for a full Fiji mobile (679 and 7 digits). Short, foreign or odd numbers go to a manager.
-- Staff emails (@jacksfiji.com) are never copied onto a customer profile.
-- A manager making a new profile can correct the number; a number already on a profile is refused with a pointer to it.

create or replace function public._sheet_email(p text) returns text
language sql immutable set search_path = public as $$
  select case when e ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and e !~* '@jacksfiji\.com$' then e end
  from (select lower(nullif(trim(coalesce(p, '')), '')) e) s
$$;

create or replace function public._sheet_candidates(p_key text, p_email text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'customer_no', c.customer_no, 'full_name', c.full_name, 'phone', c.phone, 'email', c.email,
           'why', concat_ws(' and ', case when p_key is not null and (c.phone_key = p_key or c.alt_phone_key = p_key) then 'same mobile number' end,
                                     case when public._sheet_email(p_email) is not null and lower(c.email) = public._sheet_email(p_email) then 'same email' end))
         order by c.customer_no), '[]')
  from public.customers c
  where c.merged_into is null
    and ((p_key is not null and (c.phone_key = p_key or c.alt_phone_key = p_key))
         or (public._sheet_email(p_email) is not null and lower(c.email) = public._sheet_email(p_email)))
$$;

create or replace function public.register_link_customers() returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.register; v_c uuid; v_n int; v_named int; v_new int := 0; v_linked int := 0;
begin
  for g in
    select * from public.register r
     where r.review = 'ok' and r.order_id is null and r.phone_key ~ '^679[0-9]{7}$'
       and length(trim(coalesce(r.customer, ''))) >= 2
       and not exists (select 1 from public.register_customer x where x.rec_key = r.rec_key and x.undone_at is null)
     order by r.first_seen, r.rec_key
  loop
    select count(*), count(*) filter (where public._name_match(c.full_name, g.customer)),
           (array_agg(c.id) filter (where public._name_match(c.full_name, g.customer)))[1]
      into v_n, v_named, v_c
      from public.customers c
     where c.merged_into is null and (c.phone_key = g.phone_key or c.alt_phone_key = g.phone_key);
    if v_n = 0 then
      insert into public.customers (full_name, phone, phone_key, email, preferred_contact, customer_source)
      values (left(regexp_replace(trim(g.customer), '\s+', ' ', 'g'), 120), public._phone_display(g.phone_key), g.phone_key,
              public._sheet_email(g.email), 'whatsapp', 'sheet_import')
      returning id into v_c;
      insert into public.register_customer (rec_key, customer_id, how, decided_label) values (g.rec_key, v_c, 'auto_new', 'Automatic');
      v_new := v_new + 1;
    elsif v_n = 1 and v_named = 1 then
      insert into public.register_customer (rec_key, customer_id, how, decided_label) values (g.rec_key, v_c, 'auto_match', 'Automatic');
      v_linked := v_linked + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'new_profiles', v_new, 'linked', v_linked);
end $$;

create or replace function public.register_customer_review() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can match customers.'); end if;
  return jsonb_build_object('ok', true,
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object('rec_key', r.rec_key, 'reference', r.reference, 'source', r.source, 'sheet_row', r.sheet_row,
               'customer', r.customer, 'phone_key', r.phone_key, 'phone', public._phone_display(r.phone_key),
               'phone_ok', r.phone_key ~ '^679[0-9]{7}$', 'email', public._sheet_email(r.email),
               'staff_email', r.email is not null and public._sheet_email(r.email) is null and r.email ~* '@jacksfiji\.com',
               'cake', r.cake, 'size_inch', r.size_inch, 'fulfil_date', r.fulfil_date, 'order_date', r.order_date,
               'candidates', public._sheet_candidates(r.phone_key, r.email))
             order by r.fulfil_date desc nulls last, r.rec_key)
        from public.register r
       where r.review = 'ok' and r.order_id is null and coalesce(length(r.phone_key), 0) >= 7
         and not exists (select 1 from public.register_customer x where x.rec_key = r.rec_key and x.undone_at is null)), '[]'),
    'no_phone', (select count(*) from public.register r where r.review = 'ok' and r.order_id is null and coalesce(length(r.phone_key), 0) < 7),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('rec_key', x.rec_key, 'reference', r.reference, 'how', x.how, 'customer_no', c.customer_no,
               'customer', c.full_name, 'name_on_sheet', r.customer, 'by', x.decided_label, 'at', x.decided_at, 'note', x.note) order by x.decided_at desc)
        from (select * from public.register_customer where undone_at is null order by decided_at desc limit 30) x
        left join public.register r on r.rec_key = x.rec_key left join public.customers c on c.id = x.customer_id), '[]'));
end $$;

create or replace function public.register_customer_decide(p_rec_key text, p_action text, p_customer uuid, p_note text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.register; v_c uuid; v_name text; x public.register_customer; v_key text; v_email text; v_m jsonb;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can match customers.'); end if;
  select * into g from public.register where rec_key = p_rec_key;
  if not found then return public._err('record', 'That record was not found.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  if p_action = 'undo' then
    select * into x from public.register_customer where rec_key = p_rec_key and undone_at is null;
    if not found then return public._err('nothing', 'Nothing to undo.'); end if;
    update public.register_customer set undone_at = now(), undone_by = auth.uid() where id = x.id;
    insert into public.reg_history (rec_key, source, actor, actor_label, changes)
    values (p_rec_key, 'staff', auth.uid(), v_name, jsonb_build_object('customer_match', 'undone', 'was', x.how));
    return jsonb_build_object('ok', true, 'reference', g.reference);
  end if;
  if g.order_id is not null then return public._err('linked', 'This record is already an order in the app, so it follows that order''s customer.'); end if;
  if exists (select 1 from public.register_customer where rec_key = p_rec_key and undone_at is null) then
    return public._err('decided', 'This record already has a customer. Undo first to change it.');
  end if;
  if p_action = 'link' then
    select id into v_c from public.customers where id = p_customer and merged_into is null;
    if not found then return public._err('customer', 'Choose a customer.'); end if;
    insert into public.register_customer (rec_key, customer_id, how, note, decided_by, decided_label) values (p_rec_key, v_c, 'staff_link', nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name);
  elsif p_action = 'new' then
    if length(trim(coalesce(g.customer, ''))) < 2 then return public._err('name', 'The sheet has no name for this customer. Link it to a profile instead.'); end if;
    v_key := case when nullif(trim(coalesce(p_phone, '')), '') is not null then public._phone_key(p_phone)
                  when g.phone_key ~ '^679[0-9]{7}$' then g.phone_key end;
    if v_key is not null and v_key !~ '^[0-9]{7,15}$' then return public._err('phone', 'Enter a mobile number, for example 912 3456.', 'phone'); end if;
    if nullif(trim(coalesce(p_phone, '')), '') is not null and v_key !~ '^679[0-9]{7}$' and v_key !~ '^[1-9][0-9]{9,14}$' then
      return public._err('phone', 'That is not a full mobile number. A Fiji mobile has 7 digits; a foreign one needs its country code.', 'phone');
    end if;
    v_email := public._sheet_email(g.email);
    if v_key is null and v_email is null then
      return public._err('phone', 'The number on the sheet is not a full mobile number. Enter the right number, or link to a profile.', 'phone');
    end if;
    v_m := public._sheet_candidates(v_key, v_email);
    if jsonb_array_length(v_m) > 0 then
      return public._err('possible_duplicate', 'That number or email is already on a profile. Link to it instead.', 'phone', jsonb_build_object('matches', v_m));
    end if;
    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, customer_source, created_by, notes)
    values (left(regexp_replace(trim(g.customer), '\s+', ' ', 'g'), 120), public._phone_display(v_key), v_key, v_email,
            case when v_key is null then 'email' else 'whatsapp' end, 'sheet_import', auth.uid(),
            case when g.phone_key is distinct from v_key and g.phone_key is not null then 'Number on the sheet was ' || g.phone_key end)
    returning id into v_c;
    insert into public.register_customer (rec_key, customer_id, how, note, decided_by, decided_label) values (p_rec_key, v_c, 'staff_new', nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name);
  elsif p_action = 'none' then
    insert into public.register_customer (rec_key, customer_id, how, note, decided_by, decided_label) values (p_rec_key, null, 'left_unlinked', nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name);
  else
    return public._err('action', 'Unknown choice.');
  end if;
  insert into public.reg_history (rec_key, source, actor, actor_label, changes)
  values (p_rec_key, 'staff', auth.uid(), v_name, jsonb_build_object('customer_match', p_action, 'customer_id', v_c));
  return jsonb_build_object('ok', true, 'reference', g.reference, 'customer_id', v_c);
end $$;

revoke all on function public._sheet_email(text) from public, anon, authenticated;
revoke all on function public._sheet_candidates(text, text) from public, anon, authenticated;
-- The first version (no number field) now passes through to the new one.
create or replace function public.register_customer_decide(p_rec_key text, p_action text, p_customer uuid default null, p_note text default null)
returns jsonb language sql security definer set search_path = public as $$
  select public.register_customer_decide(p_rec_key, p_action, p_customer, p_note, null::text)
$$;
revoke all on function public.register_customer_decide(text, text, uuid, text, text) from public, anon;
grant execute on function public.register_customer_decide(text, text, uuid, text, text) to authenticated;

-- Every register refresh links new sheet records the same way.
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
select pg_temp.patch('register_rebuild',
  $p$  return jsonb_build_object('ok', true, 'added', v_added, 'changed', v_changed, 'removed', v_gone);$p$,
  $p$  perform public.register_link_customers();
  return jsonb_build_object('ok', true, 'added', v_added, 'changed', v_changed, 'removed', v_gone);$p$, 1);
