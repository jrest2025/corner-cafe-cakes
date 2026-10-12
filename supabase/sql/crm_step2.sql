-- CRM step 2: sheet orders that never became app orders are attached to customer profiles.
-- Clear cases are done automatically: a sheet record whose mobile is on no profile gets a new profile;
-- one whose mobile is on exactly one profile with the same name is linked to it.
-- Everything else waits for a manager. Records with no mobile stay as guest purchases without a profile.

create table if not exists public.register_customer (
  id bigint generated always as identity primary key,
  rec_key text not null,
  customer_id uuid references public.customers(id),
  how text not null check (how in ('auto_match','auto_new','staff_link','staff_new','left_unlinked')),
  note text,
  decided_by uuid references auth.users(id),
  decided_label text,
  decided_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references auth.users(id),
  check ((how = 'left_unlinked') = (customer_id is null))
);
create index if not exists register_customer_customer_idx on public.register_customer (customer_id) where undone_at is null;
create unique index if not exists register_customer_current_idx on public.register_customer (rec_key) where undone_at is null;
alter table public.register_customer enable row level security;
-- No direct access: read and change only through the functions below.

-- Fiji mobiles shown as 912 3456, others with a plus sign.
create or replace function public._phone_display(p_key text) returns text
language sql immutable set search_path = public as $$
  select case when p_key ~ '^679[0-9]{7}$' then substr(p_key, 4, 3) || ' ' || substr(p_key, 7) when p_key is null then null else '+' || p_key end
$$;

-- Profiles that could be the customer on a sheet record (same mobile, main or other number).
create or replace function public._register_candidates(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'customer_no', c.customer_no, 'full_name', c.full_name, 'phone', c.phone, 'email', c.email)
         order by c.customer_no), '[]')
  from public.customers c
  where p_key is not null and c.merged_into is null and (c.phone_key = p_key or c.alt_phone_key = p_key)
$$;

create or replace function public.register_link_customers() returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.register; v_c uuid; v_n int; v_named int; v_new int := 0; v_linked int := 0; v_email text;
begin
  for g in
    select * from public.register r
     where r.review = 'ok' and r.order_id is null and coalesce(length(r.phone_key), 0) >= 7
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
      v_email := lower(nullif(trim(coalesce(g.email, '')), ''));
      if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_email := null; end if;
      insert into public.customers (full_name, phone, phone_key, email, preferred_contact, customer_source)
      values (left(regexp_replace(trim(g.customer), '\s+', ' ', 'g'), 120), public._phone_display(g.phone_key), g.phone_key, v_email, 'whatsapp', 'sheet_import')
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

-- Sheet records waiting for a manager to say which customer they belong to.
create or replace function public.register_customer_review() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can match customers.'); end if;
  return jsonb_build_object('ok', true,
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object('rec_key', r.rec_key, 'reference', r.reference, 'source', r.source, 'sheet_row', r.sheet_row,
               'customer', r.customer, 'phone_key', r.phone_key, 'email', r.email, 'cake', r.cake, 'size_inch', r.size_inch,
               'fulfil_date', r.fulfil_date, 'order_date', r.order_date, 'candidates', public._register_candidates(r.phone_key))
             order by r.fulfil_date desc nulls last, r.rec_key)
        from public.register r
       where r.review = 'ok' and r.order_id is null and coalesce(length(r.phone_key), 0) >= 7
         and not exists (select 1 from public.register_customer x where x.rec_key = r.rec_key and x.undone_at is null)), '[]'),
    'no_phone', (select count(*) from public.register r where r.review = 'ok' and r.order_id is null and coalesce(length(r.phone_key), 0) < 7),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('rec_key', x.rec_key, 'reference', r.reference, 'how', x.how, 'customer_no', c.customer_no,
               'customer', c.full_name, 'by', x.decided_label, 'at', x.decided_at, 'note', x.note) order by x.decided_at desc)
        from (select * from public.register_customer where how in ('staff_link','staff_new','left_unlinked') and undone_at is null order by decided_at desc limit 20) x
        left join public.register r on r.rec_key = x.rec_key left join public.customers c on c.id = x.customer_id), '[]'));
end $$;

-- A manager decides: link to a profile, make a new profile, leave it unlinked, or undo.
create or replace function public.register_customer_decide(p_rec_key text, p_action text, p_customer uuid default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.register; v_c uuid; v_name text; x public.register_customer;
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
    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, customer_source, created_by)
    values (left(regexp_replace(trim(g.customer), '\s+', ' ', 'g'), 120),
            case when length(coalesce(g.phone_key, '')) >= 7 then public._phone_display(g.phone_key) end, case when length(coalesce(g.phone_key, '')) >= 7 then g.phone_key end,
            case when lower(trim(coalesce(g.email, ''))) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(trim(g.email)) end,
            'whatsapp', 'sheet_import', auth.uid())
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
exception when check_violation then
  return public._err('contact', 'The sheet has no usable mobile or email for a new profile. Link it to a profile instead.');
end $$;

-- Sheet orders on a customer's profile (only the ones that never became app orders; app orders show as orders).
create or replace function public.customer_sheet_orders(p_customer uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.has_role('manager','front_of_house','finance','marketing') then public._err('forbidden', 'Not allowed.')
  else jsonb_build_object('ok', true, 'orders', coalesce((
    select jsonb_agg(jsonb_build_object('rec_key', r.rec_key, 'reference', r.reference, 'source', r.source, 'fulfil_date', r.fulfil_date,
             'order_date', r.order_date, 'cake', r.cake, 'size_inch', r.size_inch, 'qty', r.qty, 'status', r.status,
             'value', coalesce(r.confirmed_value, r.list_value), 'name_on_sheet', r.customer, 'how', x.how)
           order by r.fulfil_date desc nulls last)
      from public.register_customer x join public.register r on r.rec_key = x.rec_key
     where x.customer_id = p_customer and x.undone_at is null and r.review = 'ok' and r.order_id is null), '[]')) end
$$;

revoke all on function public._register_candidates(text) from public, anon, authenticated;
revoke all on function public.register_link_customers() from public, anon, authenticated;
revoke all on function public.register_customer_review() from public, anon;
revoke all on function public.register_customer_decide(text, text, uuid, text) from public, anon;
revoke all on function public.customer_sheet_orders(uuid) from public, anon;
grant execute on function public.register_customer_review() to authenticated;
grant execute on function public.register_customer_decide(text, text, uuid, text) to authenticated;
grant execute on function public.customer_sheet_orders(uuid) to authenticated;

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
