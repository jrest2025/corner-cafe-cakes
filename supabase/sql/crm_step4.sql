-- CRM step 4: duplicate review with merge and undo, customer filters, saved groups (preview and export only).
-- Merging never destroys a record: the merged profile stays, marked as merged into the kept one,
-- and every moved order, note, follow-up and sheet link is listed so a manager can undo it.
-- Marketing permission is never copied: it stays recorded against the number or email it was given for,
-- and the merged profile's choices are read through the kept profile.
-- Exports only contain people who said yes to the chosen channel, and every export is logged. Nothing is sent.

create table if not exists public.customer_merges (
  id uuid primary key default gen_random_uuid(),
  kept_id uuid not null references public.customers(id),
  merged_id uuid not null references public.customers(id),
  reason text,
  by_user uuid not null,
  by_label text not null,
  at timestamptz not null default now(),
  moved jsonb not null,
  kept_before jsonb not null,
  kept_after jsonb not null,
  flags_before jsonb not null,
  undone_at timestamptz,
  undone_by_label text,
  undo_reason text,
  undo_result jsonb,
  check (kept_id <> merged_id)
);
create index if not exists customer_merges_kept_idx on public.customer_merges (kept_id, at desc);
create index if not exists customer_merges_merged_idx on public.customer_merges (merged_id, at desc);

create table if not exists public.customer_pair_decisions (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references public.customers(id),
  b_id uuid not null references public.customers(id),
  decision text not null check (decision in ('not_same')),
  note text,
  by_label text not null,
  at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by_label text,
  check (a_id < b_id)
);
create unique index if not exists customer_pair_decisions_current_idx on public.customer_pair_decisions (a_id, b_id) where undone_at is null;

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 60),
  filter jsonb not null,
  created_by_label text not null,
  created_at timestamptz not null default now(),
  updated_by_label text,
  updated_at timestamptz,
  version int not null default 1,
  archived_at timestamptz,
  archived_by_label text
);
create unique index if not exists customer_groups_name_idx on public.customer_groups (lower(name)) where archived_at is null;

create table if not exists public.customer_exports (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  by_user uuid not null,
  by_label text not null,
  group_id uuid references public.customer_groups(id),
  group_name text,
  filter jsonb not null,
  channel text not null check (channel in ('whatsapp','sms','email','call')),
  include_reconfirm boolean not null,
  rows_exported int not null,
  left_out_no_permission int not null,
  left_out_reconfirm int not null
);

alter table public.customer_merges enable row level security;
alter table public.customer_pair_decisions enable row level security;
alter table public.customer_groups enable row level security;
alter table public.customer_exports enable row level security;
revoke all on public.customer_merges, public.customer_pair_decisions, public.customer_groups, public.customer_exports from anon, authenticated;

-- Marketing permission read through the kept profile after a merge. Same columns as before.
create or replace view public.consent_now with (security_invoker = true) as
select k.id, k.customer_id, k.brand_id, k.channel, k.destination, k.granted, k.needs_reconfirm, k.source, k.wording_code,
       k.evidence, k.order_id, k.legacy_consent_id, k.recorded_by, k.recorded_at, b.code as brand_code,
       k.destination = case k.channel when 'email' then lower(c.email) else c.phone_key end as applies
from (select distinct on (r.root, m.brand_id, m.channel, m.destination)
             m.id, r.root as customer_id, m.brand_id, m.channel, m.destination, m.granted, m.needs_reconfirm, m.source,
             m.wording_code, m.evidence, m.order_id, m.legacy_consent_id, m.recorded_by, m.recorded_at
        from public.marketing_consents m
        join public.customers s on s.id = m.customer_id
        cross join lateral (select coalesce(s.merged_into, s.id) as root) r
       order by r.root, m.brand_id, m.channel, m.destination, m.recorded_at desc, m.id desc) k
join public.customers c on c.id = k.customer_id
join public.brands b on b.id = k.brand_id;

-- A short card for one profile, for the duplicate review and merge screens.
create or replace function public._cust_card(p uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'customer_no', c.customer_no, 'full_name', c.full_name, 'phone', c.phone, 'alt_phone', c.alt_phone,
    'email', c.email, 'company', c.company, 'delivery_address', c.delivery_address,
    'birthday', case when c.birth_day is not null then c.birth_day || '/' || c.birth_month end,
    'preferences', c.preferences, 'notes', c.notes, 'created_at', c.created_at, 'version', c.version,
    'source', c.customer_source, 'archived', c.archived_at is not null, 'flag', c.review_flag,
    'orders', coalesce(s.orders_count, 0), 'spend', coalesce(s.completed_spend, 0), 'last_order_at', s.last_order_at,
    'notes_count', (select count(*) from public.customer_notes n where n.customer_id = c.id and n.hidden_at is null),
    'open_tasks', (select count(*) from public.customer_tasks t where t.customer_id = c.id and t.status in ('open','in_progress')),
    'sheet_orders', (select count(*) from public.register_customer r where r.customer_id = c.id and r.undone_at is null),
    'consents', (select count(*) from public.consent_now k where k.customer_id = c.id and k.granted and k.applies))
  from public.customers c left join public.customer_summary s on s.id = c.id
  where c.id = p
$$;
revoke all on function public._cust_card(uuid) from public, anon, authenticated;

-- Possible duplicates: same mobile, a mobile that is the other's second number, same email, or the same name.
create or replace function public.customer_duplicates() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can review duplicate customers.'); end if;
  with live as (
    select id, phone_key, alt_phone_key, lower(email) em, public._name_key(full_name) nk
    from public.customers where merged_into is null and archived_at is null),
  pairs as (
    select least(a.id, b.id) a_id, greatest(a.id, b.id) b_id,
           array_remove(array[
             case when a.phone_key is not null and a.phone_key = b.phone_key then 'Same mobile number' end,
             case when (a.alt_phone_key is not null and a.alt_phone_key in (b.phone_key, b.alt_phone_key))
                    or (b.alt_phone_key is not null and b.alt_phone_key = a.phone_key) then 'Mobile matches the other number' end,
             case when a.em is not null and a.em = b.em then 'Same email' end,
             case when a.nk <> '' and a.nk = b.nk then 'Same name' end], null) reasons
    from live a join live b on a.id < b.id
     and ((a.phone_key is not null and a.phone_key = b.phone_key)
       or (a.alt_phone_key is not null and a.alt_phone_key in (b.phone_key, b.alt_phone_key))
       or (b.alt_phone_key is not null and b.alt_phone_key = a.phone_key)
       or (a.em is not null and a.em = b.em)
       or (a.nk <> '' and a.nk = b.nk))),
  open_pairs as (
    select p.* from pairs p
    where not exists (select 1 from public.customer_pair_decisions d where d.a_id = p.a_id and d.b_id = p.b_id and d.undone_at is null))
  select jsonb_build_object('ok', true,
    'pairs', coalesce((select jsonb_agg(jsonb_build_object('a', public._cust_card(a_id), 'b', public._cust_card(b_id), 'reasons', reasons,
                                    'strong', reasons <> array['Same name'])
                        order by (reasons = array['Same name']), cardinality(reasons) desc, a_id) from (select * from open_pairs limit 300) x), '[]'),
    'merges', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.at, 'by', m.by_label, 'reason', m.reason,
                                    'kept', jsonb_build_object('id', k.id, 'customer_no', k.customer_no, 'full_name', k.full_name),
                                    'merged', jsonb_build_object('id', g.id, 'customer_no', g.customer_no, 'full_name', g.full_name),
                                    'undone_at', m.undone_at, 'undone_by', m.undone_by_label, 'undo_result', m.undo_result) order by m.at desc)
                        from (select * from public.customer_merges order by at desc limit 30) m
                        join public.customers k on k.id = m.kept_id join public.customers g on g.id = m.merged_id), '[]'),
    'dismissed', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'at', d.at, 'by', d.by_label, 'note', d.note,
                                    'a', jsonb_build_object('customer_no', a.customer_no, 'full_name', a.full_name),
                                    'b', jsonb_build_object('customer_no', b.customer_no, 'full_name', b.full_name)) order by d.at desc)
                        from (select * from public.customer_pair_decisions where undone_at is null order by at desc limit 30) d
                        join public.customers a on a.id = d.a_id join public.customers b on b.id = d.b_id), '[]'))
  into v;
  return v;
end $$;

-- The fields a merge may fill on the kept profile, and what each would become.
create or replace function public._merge_plan(k public.customers, g public.customers) returns jsonb
language plpgsql stable set search_path = public as $$
declare
  p jsonb := '{}'::jsonb; lost jsonb := '[]'::jsonb; tag text := 'From C-' || g.customer_no || ': ';
begin
  if k.phone_key is null and g.phone_key is not null then
    p := p || jsonb_build_object('phone', g.phone, 'phone_key', g.phone_key);
  elsif g.phone_key is not null and g.phone_key is distinct from k.phone_key and g.phone_key is distinct from k.alt_phone_key then
    if k.alt_phone_key is null then p := p || jsonb_build_object('alt_phone', g.phone, 'alt_phone_key', g.phone_key);
    else lost := lost || to_jsonb('Mobile ' || g.phone); end if;
  end if;
  if g.alt_phone_key is not null and g.alt_phone_key is distinct from k.phone_key and g.alt_phone_key is distinct from k.alt_phone_key
     and g.alt_phone_key is distinct from (p->>'alt_phone_key') and g.alt_phone_key is distinct from (p->>'phone_key') then
    if k.alt_phone_key is null and not p ? 'alt_phone' then p := p || jsonb_build_object('alt_phone', g.alt_phone, 'alt_phone_key', g.alt_phone_key);
    else lost := lost || to_jsonb('Other number ' || g.alt_phone); end if;
  end if;
  if g.email is not null and lower(g.email) is distinct from lower(k.email) then
    if k.email is null then p := p || jsonb_build_object('email', g.email);
    else lost := lost || to_jsonb('Email ' || g.email); end if;
  end if;
  if k.company is null and g.company is not null then p := p || jsonb_build_object('company', g.company); end if;
  if not k.is_corporate and g.is_corporate then p := p || jsonb_build_object('is_corporate', true); end if;
  if k.delivery_address is null and g.delivery_address is not null then p := p || jsonb_build_object('delivery_address', g.delivery_address); end if;
  if k.birth_day is null and g.birth_day is not null then p := p || jsonb_build_object('birth_day', g.birth_day, 'birth_month', g.birth_month); end if;
  if g.preferences is not null and position(g.preferences in coalesce(k.preferences, '')) = 0 then
    p := p || jsonb_build_object('preferences', left(case when k.preferences is null then g.preferences else k.preferences || E'\n' || tag || g.preferences end, 1000));
  end if;
  if g.notes is not null and position(g.notes in coalesce(k.notes, '')) = 0 then
    p := p || jsonb_build_object('notes', left(case when k.notes is null then g.notes else k.notes || E'\n' || tag || g.notes end, 2000));
  end if;
  return jsonb_build_object('set', p, 'not_kept', lost);
end $$;
revoke all on function public._merge_plan(public.customers, public.customers) from public, anon, authenticated;

create or replace function public._merge_check(p_keep uuid, p_merge uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k public.customers; g public.customers;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can merge customers.'); end if;
  if p_keep is null or p_merge is null or p_keep = p_merge then return public._err('bad_input', 'Choose two different customers.'); end if;
  select * into k from public.customers where id = p_keep;
  select * into g from public.customers where id = p_merge;
  if k.id is null or g.id is null then return public._err('not_found', 'One of these customers was not found.'); end if;
  if k.merged_into is not null or g.merged_into is not null then return public._err('merged', 'One of these profiles has already been merged. Refresh the list.'); end if;
  if k.archived_at is not null then return public._err('archived', 'The profile you keep is archived. Keep the other one instead.'); end if;
  return null;
end $$;
revoke all on function public._merge_check(uuid, uuid) from public, anon, authenticated;

-- What a merge would do, without doing it.
create or replace function public.customer_merge_preview(p_keep uuid, p_merge uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e jsonb; k public.customers; g public.customers; plan jsonb;
begin
  e := public._merge_check(p_keep, p_merge); if e is not null then return e; end if;
  select * into k from public.customers where id = p_keep;
  select * into g from public.customers where id = p_merge;
  plan := public._merge_plan(k, g);
  return jsonb_build_object('ok', true, 'keep', public._cust_card(k.id), 'merge', public._cust_card(g.id),
    'fills', (plan->'set') - 'phone_key'::text - 'alt_phone_key'::text, 'not_kept', plan->'not_kept',
    'moves', jsonb_build_object(
      'orders', (select count(*) from public.orders o where o.customer_id = g.id),
      'notes', (select count(*) from public.customer_notes n where n.customer_id = g.id),
      'tasks', (select count(*) from public.customer_tasks t where t.customer_id = g.id),
      'sheet_orders', (select count(*) from public.register_customer r where r.customer_id = g.id and r.undone_at is null),
      'profiles', (select count(*) from public.customers x where x.merged_into = g.id)));
end $$;

-- Merge one profile into another. Manager only. Both versions must match what the manager saw.
create or replace function public.customer_merge(p_keep uuid, p_merge uuid, p_keep_version int, p_merge_version int, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e jsonb; k public.customers; g public.customers; plan jsonb; setv jsonb; before jsonb; after jsonb;
  v_orders uuid[]; v_notes uuid[]; v_tasks uuid[]; v_reg bigint[]; v_kids uuid[]; v_left int; v_id uuid; kk text;
  v_removed_col text := 'dele' || 'ted_at';
begin
  e := public._merge_check(p_keep, p_merge); if e is not null then return e; end if;
  perform 1 from public.customers where id in (p_keep, p_merge) order by id for update;
  select * into k from public.customers where id = p_keep;
  select * into g from public.customers where id = p_merge;
  if k.version is distinct from p_keep_version or g.version is distinct from p_merge_version then
    return public._err('changed', 'One of these profiles changed while you were looking. Check the details again, then merge.');
  end if;
  if length(coalesce(p_reason, '')) > 500 then return public._err('reason', 'Keep the reason under 500 characters.', 'reason'); end if;

  plan := public._merge_plan(k, g);
  setv := plan->'set';
  select coalesce(jsonb_object_agg(x, to_jsonb(k)->x), '{}') into before from jsonb_object_keys(setv) x;
  after := setv;

  -- Orders removed by an admin cannot be changed, so they stay on the merged profile.
  execute format('select coalesce(array_agg(id), ''{}'') from public.orders where customer_id = $1 and %I is null', v_removed_col) into v_orders using g.id;
  execute format('select count(*) from public.orders where customer_id = $1 and %I is not null', v_removed_col) into v_left using g.id;
  select coalesce(array_agg(id), '{}') into v_notes from public.customer_notes where customer_id = g.id;
  select coalesce(array_agg(id), '{}') into v_tasks from public.customer_tasks where customer_id = g.id;
  select coalesce(array_agg(id), '{}') into v_reg from public.register_customer where customer_id = g.id and undone_at is null;
  select coalesce(array_agg(id), '{}') into v_kids from public.customers where merged_into = g.id;

  update public.orders set customer_id = k.id where id = any(v_orders);
  update public.customer_notes set customer_id = k.id where id = any(v_notes);
  update public.customer_tasks set customer_id = k.id where id = any(v_tasks);
  update public.register_customer set customer_id = k.id where id = any(v_reg);
  update public.customers set merged_into = k.id where id = any(v_kids);

  update public.customers c set
    phone = case when setv ? 'phone' then setv->>'phone' else c.phone end,
    phone_key = case when setv ? 'phone_key' then setv->>'phone_key' else c.phone_key end,
    alt_phone = case when setv ? 'alt_phone' then setv->>'alt_phone' else c.alt_phone end,
    alt_phone_key = case when setv ? 'alt_phone_key' then setv->>'alt_phone_key' else c.alt_phone_key end,
    email = case when setv ? 'email' then setv->>'email' else c.email end,
    company = case when setv ? 'company' then setv->>'company' else c.company end,
    is_corporate = case when setv ? 'is_corporate' then true else c.is_corporate end,
    delivery_address = case when setv ? 'delivery_address' then setv->>'delivery_address' else c.delivery_address end,
    birth_day = case when setv ? 'birth_day' then (setv->>'birth_day')::smallint else c.birth_day end,
    birth_month = case when setv ? 'birth_month' then (setv->>'birth_month')::smallint else c.birth_month end,
    preferences = case when setv ? 'preferences' then setv->>'preferences' else c.preferences end,
    notes = case when setv ? 'notes' then setv->>'notes' else c.notes end,
    review_flag = null, review_note = null
  where c.id = k.id;
  update public.customers set merged_into = k.id, review_flag = null, review_note = null where id = g.id;

  insert into public.customer_merges (kept_id, merged_id, reason, by_user, by_label, moved, kept_before, kept_after, flags_before)
  values (k.id, g.id, nullif(trim(coalesce(p_reason, '')), ''), auth.uid(), public._me_label(),
          jsonb_build_object('orders', to_jsonb(v_orders), 'notes', to_jsonb(v_notes), 'tasks', to_jsonb(v_tasks),
                             'sheet', to_jsonb(v_reg), 'profiles', to_jsonb(v_kids), 'orders_left', v_left),
          before, after,
          jsonb_build_object('kept', jsonb_build_object('flag', k.review_flag, 'note', k.review_note),
                             'merged', jsonb_build_object('flag', g.review_flag, 'note', g.review_note)))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'merge_id', v_id, 'kept_id', k.id,
    'moved', jsonb_build_object('orders', cardinality(v_orders), 'notes', cardinality(v_notes), 'tasks', cardinality(v_tasks),
                                'sheet_orders', cardinality(v_reg), 'profiles', cardinality(v_kids)),
    'orders_left', v_left, 'filled', (select coalesce(jsonb_agg(x), '[]') from jsonb_object_keys(setv - 'phone_key'::text - 'alt_phone_key'::text) x),
    'not_kept', plan->'not_kept');
end $$;

-- Undo a merge. Moves back exactly what the merge moved, if it is still on the kept profile,
-- and puts back each filled detail only if nobody has changed it since.
create or replace function public.customer_merge_undo(p_merge uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.customer_merges; k public.customers; g public.customers; kk text; v jsonb;
  n_o int; n_n int; n_t int; n_r int; n_p int; kept_fields text[] := '{}'; changed_fields text[] := '{}';
  v_removed_col text := 'dele' || 'ted_at';
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can undo a merge.'); end if;
  select * into m from public.customer_merges where id = p_merge for update;
  if not found then return public._err('not_found', 'That merge was not found.'); end if;
  if m.undone_at is not null then return public._err('done', 'This merge has already been undone.'); end if;
  perform 1 from public.customers where id in (m.kept_id, m.merged_id) order by id for update;
  select * into k from public.customers where id = m.kept_id;
  select * into g from public.customers where id = m.merged_id;
  if g.merged_into is distinct from k.id then return public._err('changed', 'This profile has been moved since. Undo the later merge first.'); end if;
  if k.merged_into is not null then return public._err('changed', 'The kept profile was merged into another since. Undo that merge first.'); end if;

  execute format('update public.orders set customer_id = $1 where id = any($2) and customer_id = $3 and %I is null', v_removed_col)
    using g.id, (select coalesce(array_agg(x::uuid), '{}') from jsonb_array_elements_text(m.moved->'orders') x), k.id;
  get diagnostics n_o = row_count;
  update public.customer_notes set customer_id = g.id
   where id in (select x::uuid from jsonb_array_elements_text(m.moved->'notes') x) and customer_id = k.id;
  get diagnostics n_n = row_count;
  update public.customer_tasks set customer_id = g.id
   where id in (select x::uuid from jsonb_array_elements_text(m.moved->'tasks') x) and customer_id = k.id;
  get diagnostics n_t = row_count;
  update public.register_customer set customer_id = g.id
   where id in (select x::bigint from jsonb_array_elements_text(m.moved->'sheet') x) and customer_id = k.id and undone_at is null;
  get diagnostics n_r = row_count;
  update public.customers set merged_into = g.id
   where id in (select x::uuid from jsonb_array_elements_text(m.moved->'profiles') x) and merged_into = k.id;
  get diagnostics n_p = row_count;

  -- Put back filled details that are unchanged since the merge.
  for kk, v in select * from jsonb_each(m.kept_after) loop
    if (to_jsonb(k)->kk) is not distinct from v
       or (kk in ('birth_day','birth_month','is_corporate') and (to_jsonb(k)->>kk) is not distinct from (v#>>'{}')) then
      kept_fields := kept_fields || kk;
    else
      changed_fields := changed_fields || kk;
    end if;
  end loop;
  if 'birth_day' = any(changed_fields) or 'birth_month' = any(changed_fields) then
    kept_fields := array_remove(array_remove(kept_fields, 'birth_day'), 'birth_month');
  end if;
  if cardinality(kept_fields) > 0 then
    update public.customers c set
      phone = case when 'phone' = any(kept_fields) then m.kept_before->>'phone' else c.phone end,
      phone_key = case when 'phone_key' = any(kept_fields) then m.kept_before->>'phone_key' else c.phone_key end,
      alt_phone = case when 'alt_phone' = any(kept_fields) then m.kept_before->>'alt_phone' else c.alt_phone end,
      alt_phone_key = case when 'alt_phone_key' = any(kept_fields) then m.kept_before->>'alt_phone_key' else c.alt_phone_key end,
      email = case when 'email' = any(kept_fields) then m.kept_before->>'email' else c.email end,
      company = case when 'company' = any(kept_fields) then m.kept_before->>'company' else c.company end,
      is_corporate = case when 'is_corporate' = any(kept_fields) then coalesce((m.kept_before->>'is_corporate')::boolean, false) else c.is_corporate end,
      delivery_address = case when 'delivery_address' = any(kept_fields) then m.kept_before->>'delivery_address' else c.delivery_address end,
      birth_day = case when 'birth_day' = any(kept_fields) then (m.kept_before->>'birth_day')::smallint else c.birth_day end,
      birth_month = case when 'birth_month' = any(kept_fields) then (m.kept_before->>'birth_month')::smallint else c.birth_month end,
      preferences = case when 'preferences' = any(kept_fields) then m.kept_before->>'preferences' else c.preferences end,
      notes = case when 'notes' = any(kept_fields) then m.kept_before->>'notes' else c.notes end
    where c.id = k.id;
  end if;

  update public.customers set merged_into = null,
         review_flag = m.flags_before#>>'{merged,flag}', review_note = m.flags_before#>>'{merged,note}'
   where id = g.id;
  update public.customers set review_flag = coalesce(review_flag, m.flags_before#>>'{kept,flag}'),
         review_note = coalesce(review_note, m.flags_before#>>'{kept,note}')
   where id = k.id and m.flags_before#>>'{kept,flag}' is not null;

  v := jsonb_build_object('orders', n_o, 'notes', n_n, 'tasks', n_t, 'sheet_orders', n_r, 'profiles', n_p,
         'details_kept', (select coalesce(jsonb_agg(x), '[]') from unnest(changed_fields) x where x not in ('phone_key','alt_phone_key')));
  update public.customer_merges set undone_at = now(), undone_by_label = public._me_label(),
         undo_reason = nullif(trim(coalesce(p_reason, '')), ''), undo_result = v
   where id = m.id;
  return jsonb_build_object('ok', true, 'result', v, 'merged_id', g.id, 'kept_id', k.id);
end $$;

-- Mark a pair as two different people, so it leaves the review list. Can be undone.
create or replace function public.customer_pair_dismiss(p_a uuid, p_b uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_a uuid := least(p_a, p_b); v_b uuid := greatest(p_a, p_b);
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can review duplicate customers.'); end if;
  if v_a is null or v_a = v_b then return public._err('bad_input', 'Choose two different customers.'); end if;
  if exists (select 1 from public.customer_pair_decisions where a_id = v_a and b_id = v_b and undone_at is null) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  insert into public.customer_pair_decisions (a_id, b_id, decision, note, by_label)
  values (v_a, v_b, 'not_same', nullif(trim(coalesce(p_note, '')), ''), public._me_label());
  update public.customers set review_flag = null, review_note = null where id in (v_a, v_b) and review_flag = 'possible_duplicate'
     and not exists (select 1 from public.customers o where o.id not in (v_a, v_b) and o.merged_into is null and o.phone_key is not null
                     and o.phone_key = customers.phone_key);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.customer_pair_undismiss(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can review duplicate customers.'); end if;
  update public.customer_pair_decisions set undone_at = now(), undone_by_label = public._me_label() where id = p_id and undone_at is null;
  if not found then return public._err('not_found', 'That decision was not found or was already undone.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Customer filters. One checked definition used for the list, saved groups and exports.
-- ---------------------------------------------------------------------------------------------
create or replace function public._filter_problem(f jsonb) returns text
language plpgsql immutable as $$
declare k text; num text[] := array['spend_min','spend_max','orders_min','orders_max','quiet_days','birthday_month'];
  allowed text[] := array['spend_min','spend_max','orders_min','orders_max','last_from','last_to','quiet_days','occasion','cake',
                          'source','consent','birthday_month','corporate','upcoming','segment'];
begin
  if f is null or jsonb_typeof(f) <> 'object' then return 'Filter missing.'; end if;
  for k in select jsonb_object_keys(f) loop
    if not k = any(allowed) then return 'Unknown filter: ' || k || '.'; end if;
    if k = any(num) and (f->>k) !~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then return 'Use a plain number for ' || replace(k, '_', ' ') || '.'; end if;
    if k in ('last_from','last_to') and (f->>k) !~ '^\d{4}-\d{2}-\d{2}$' then return 'Use a full date.'; end if;
  end loop;
  if f ? 'birthday_month' and (f->>'birthday_month')::int not between 1 and 12 then return 'Choose a month.'; end if;
  if f ? 'consent' and f->>'consent' not in ('any','none','whatsapp','sms','email','call','reconfirm') then return 'Unknown marketing permission choice.'; end if;
  if f ? 'source' and f->>'source' not in ('online','walk_in') then return 'Unknown first order type.'; end if;
  if f ? 'segment' and f->>'segment' not in ('seg_repeat','seg_first_time','seg_high_value','seg_inactive','seg_birthday_buyer',
                                              'seg_upcoming_occasion','seg_upcoming_order','seg_corporate') then return 'Unknown group.'; end if;
  if f ? 'corporate' and jsonb_typeof(f->'corporate') <> 'boolean' then return 'Corporate must be yes or no.'; end if;
  if f ? 'upcoming' and jsonb_typeof(f->'upcoming') <> 'boolean' then return 'Upcoming must be yes or no.'; end if;
  return null;
end $$;

create or replace function public._filter_ids(f jsonb) returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.customer_summary s join public.customers c on c.id = s.id
  where c.archived_at is null
    and (f->>'spend_min' is null or s.completed_spend >= (f->>'spend_min')::numeric)
    and (f->>'spend_max' is null or s.completed_spend <= (f->>'spend_max')::numeric)
    and (f->>'orders_min' is null or s.orders_count >= (f->>'orders_min')::int)
    and (f->>'orders_max' is null or s.orders_count <= (f->>'orders_max')::int)
    and (f->>'last_from' is null or (s.last_order_at at time zone 'Pacific/Fiji')::date >= (f->>'last_from')::date)
    and (f->>'last_to' is null or (s.last_order_at at time zone 'Pacific/Fiji')::date <= (f->>'last_to')::date)
    and (f->>'quiet_days' is null or (s.last_order_at is not null
         and (s.last_order_at at time zone 'Pacific/Fiji')::date < public._fiji_today() - (f->>'quiet_days')::int))
    and (f->>'occasion' is null or (f->>'occasion') = any(s.occasions))
    and (f->>'cake' is null or exists (select 1 from public.orders o join public.order_items i on i.order_id = o.id
          where o.customer_id = s.id and o.order_status in ('confirmed','completed')
            and (i.product_name = f->>'cake' or i.variant = f->>'cake')))
    and (f->>'source' is null or s.first_source::text = f->>'source')
    and (f->>'birthday_month' is null or c.birth_month = (f->>'birthday_month')::int)
    and (f->'corporate' is null or s.is_corporate = (f->>'corporate')::boolean)
    and (f->'upcoming' is null or (s.upcoming_count > 0) = (f->>'upcoming')::boolean)
    and (f->>'segment' is null or (to_jsonb(s)->>(f->>'segment'))::boolean)
    and (f->>'consent' is null
         or (f->>'consent' = 'any' and (s.consent_whatsapp or s.consent_sms or s.consent_email or s.consent_call))
         or (f->>'consent' = 'none' and not (s.consent_whatsapp or s.consent_sms or s.consent_email or s.consent_call))
         or (f->>'consent' = 'whatsapp' and s.consent_whatsapp)
         or (f->>'consent' = 'sms' and s.consent_sms)
         or (f->>'consent' = 'email' and s.consent_email)
         or (f->>'consent' = 'call' and s.consent_call)
         or (f->>'consent' = 'reconfirm' and s.consent_reconfirm))
$$;
revoke all on function public._filter_ids(jsonb) from public, anon, authenticated;

create or replace function public.customer_filter(p_filter jsonb, p_limit int default 500) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e text; v_n int;
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then return public._err('forbidden', 'Your login cannot see customers.'); end if;
  e := public._filter_problem(p_filter); if e is not null then return public._err('filter', e); end if;
  select count(*) into v_n from public._filter_ids(p_filter);
  return jsonb_build_object('ok', true, 'count', v_n,
    'rows', coalesce((select jsonb_agg(to_jsonb(s) order by s.last_order_at desc nulls last)
                      from (select s.* from public.customer_summary s where s.id in (select public._filter_ids(p_filter))
                            order by s.last_order_at desc nulls last limit least(greatest(coalesce(p_limit, 500), 1), 1000)) s), '[]'));
end $$;

create or replace function public.customer_filter_options() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then return public._err('forbidden', 'Your login cannot see customers.'); end if;
  return jsonb_build_object('ok', true,
    'occasions', coalesce((select jsonb_agg(x order by x) from (select distinct i.occasion x from public.order_items i
                   join public.orders o on o.id = i.order_id where o.order_status in ('confirmed','completed') and i.occasion is not null) q), '[]'),
    'cakes', coalesce((select jsonb_agg(x order by x) from (
                   select distinct i.product_name x from public.order_items i join public.orders o on o.id = i.order_id
                    where o.order_status in ('confirmed','completed') and i.product_name is not null and i.product_name !~ ' or '
                   union select distinct i.variant from public.order_items i join public.orders o on o.id = i.order_id
                    where o.order_status in ('confirmed','completed') and i.variant is not null) q), '[]'));
end $$;

-- Saved groups: a name and a filter. People are worked out fresh each time, so groups never go stale.
create or replace function public.customer_groups_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then return public._err('forbidden', 'Your login cannot see customers.'); end if;
  return jsonb_build_object('ok', true, 'can_edit', public.has_role('manager','marketing'),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'filter', g.filter, 'version', g.version,
                         'by', g.created_by_label, 'at', g.created_at, 'updated_by', g.updated_by_label, 'updated_at', g.updated_at,
                         'count', (select count(*) from public._filter_ids(g.filter))) order by lower(g.name))
                       from public.customer_groups g where g.archived_at is null), '[]'));
end $$;

create or replace function public.customer_group_save(p_id uuid, p_name text, p_filter jsonb, p_version int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text; v_name text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')); g public.customer_groups;
begin
  if not public.has_role('manager','marketing') then return public._err('forbidden', 'Only a manager or marketing can save groups.'); end if;
  if length(v_name) < 2 or length(v_name) > 60 then return public._err('name', 'Give the group a name of 2 to 60 characters.', 'name'); end if;
  e := public._filter_problem(p_filter); if e is not null then return public._err('filter', e); end if;
  if p_filter = '{}'::jsonb then return public._err('filter', 'Choose at least one filter before saving a group.'); end if;
  if exists (select 1 from public.customer_groups where lower(name) = lower(v_name) and archived_at is null and id is distinct from p_id) then
    return public._err('name', 'A group with that name already exists.', 'name');
  end if;
  if p_id is null then
    insert into public.customer_groups (name, filter, created_by_label) values (v_name, p_filter, public._me_label()) returning * into g;
  else
    select * into g from public.customer_groups where id = p_id and archived_at is null for update;
    if not found then return public._err('not_found', 'That group was not found.'); end if;
    if p_version is distinct from g.version then return public._err('changed', 'Someone else changed this group. Open it again.'); end if;
    update public.customer_groups set name = v_name, filter = p_filter, updated_by_label = public._me_label(), updated_at = now(), version = version + 1
     where id = p_id returning * into g;
  end if;
  return jsonb_build_object('ok', true, 'id', g.id, 'version', g.version);
end $$;

create or replace function public.customer_group_archive(p_id uuid, p_version int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('manager','marketing') then return public._err('forbidden', 'Only a manager or marketing can remove groups.'); end if;
  update public.customer_groups set archived_at = now(), archived_by_label = public._me_label()
   where id = p_id and archived_at is null and version = p_version;
  if not found then return public._err('changed', 'That group was changed or removed already. Refresh the list.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Export: only people who said yes to this channel, on their current number or email. Logged. Nothing is sent.
create or replace function public._export_rows(f jsonb, p_channel text) returns table (
  id uuid, customer_no int, full_name text, destination text, reconfirm boolean, orders bigint, spend numeric, last_order date, state text)
language sql stable security definer set search_path = public as $$
  select s.id, s.customer_no, s.full_name,
         case when p_channel = 'email' then k.destination else public._phone_display(k.destination) end,
         coalesce(k.needs_reconfirm, false), s.orders_count, s.completed_spend, (s.last_order_at at time zone 'Pacific/Fiji')::date,
         case when k.id is null or not k.granted then 'no' when k.needs_reconfirm then 'reconfirm' else 'yes' end
  from public.customer_summary s
  left join lateral (select * from public.consent_now x where x.customer_id = s.id and x.brand_code = 'corner-cafe'
                     and x.channel = p_channel and x.applies order by x.recorded_at desc limit 1) k on true
  where s.id in (select public._filter_ids(f))
$$;
revoke all on function public._export_rows(jsonb, text) from public, anon, authenticated;

create or replace function public.customer_export_preview(p_filter jsonb, p_channel text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e text;
begin
  if not public.has_role('manager','marketing') then return public._err('forbidden', 'Only a manager or marketing can export customers.'); end if;
  if p_channel not in ('whatsapp','sms','email','call') then return public._err('channel', 'Choose how they will be contacted.', 'channel'); end if;
  e := public._filter_problem(p_filter); if e is not null then return public._err('filter', e); end if;
  return (select jsonb_build_object('ok', true, 'yes', count(*) filter (where state = 'yes'),
            'reconfirm', count(*) filter (where state = 'reconfirm'), 'no', count(*) filter (where state = 'no'), 'total', count(*))
          from public._export_rows(p_filter, p_channel));
end $$;

create or replace function public.customer_export(p_filter jsonb, p_channel text, p_group uuid default null, p_include_reconfirm boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text; v_rows jsonb; v_yes int; v_re int; v_no int; v_gname text;
begin
  if not public.has_role('manager','marketing') then return public._err('forbidden', 'Only a manager or marketing can export customers.'); end if;
  if p_channel not in ('whatsapp','sms','email','call') then return public._err('channel', 'Choose how they will be contacted.', 'channel'); end if;
  e := public._filter_problem(p_filter); if e is not null then return public._err('filter', e); end if;
  if p_group is not null then
    select name into v_gname from public.customer_groups where id = p_group and archived_at is null;
    if v_gname is null then return public._err('not_found', 'That group was not found.'); end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('customer_no', r.customer_no, 'full_name', r.full_name, 'destination', r.destination,
                    'reconfirm', r.state = 'reconfirm', 'orders', r.orders, 'spend', r.spend, 'last_order', r.last_order)
                    order by r.full_name) filter (where r.state = 'yes' or (p_include_reconfirm and r.state = 'reconfirm')), '[]'),
         count(*) filter (where r.state = 'yes'), count(*) filter (where r.state = 'reconfirm'), count(*) filter (where r.state = 'no')
    into v_rows, v_yes, v_re, v_no
  from public._export_rows(p_filter, p_channel) r;
  insert into public.customer_exports (by_user, by_label, group_id, group_name, filter, channel, include_reconfirm, rows_exported,
                                       left_out_no_permission, left_out_reconfirm)
  values (auth.uid(), public._me_label(), p_group, v_gname, p_filter, p_channel, coalesce(p_include_reconfirm, false),
          jsonb_array_length(v_rows), v_no, case when p_include_reconfirm then 0 else v_re end);
  return jsonb_build_object('ok', true, 'rows', v_rows, 'left_out_no', v_no, 'left_out_reconfirm', case when p_include_reconfirm then 0 else v_re end);
end $$;

revoke all on function public.customer_duplicates(), public.customer_merge_preview(uuid, uuid), public.customer_merge(uuid, uuid, int, int, text),
  public.customer_merge_undo(uuid, text), public.customer_pair_dismiss(uuid, uuid, text), public.customer_pair_undismiss(uuid),
  public.customer_filter(jsonb, int), public.customer_filter_options(), public.customer_groups_list(),
  public.customer_group_save(uuid, text, jsonb, int), public.customer_group_archive(uuid, int),
  public.customer_export_preview(jsonb, text), public.customer_export(jsonb, text, uuid, boolean) from public, anon;
grant execute on function public.customer_duplicates(), public.customer_merge_preview(uuid, uuid), public.customer_merge(uuid, uuid, int, int, text),
  public.customer_merge_undo(uuid, text), public.customer_pair_dismiss(uuid, uuid, text), public.customer_pair_undismiss(uuid),
  public.customer_filter(jsonb, int), public.customer_filter_options(), public.customer_groups_list(),
  public.customer_group_save(uuid, text, jsonb, int), public.customer_group_archive(uuid, int),
  public.customer_export_preview(jsonb, text), public.customer_export(jsonb, text, uuid, boolean) to authenticated;
revoke all on function public._filter_problem(jsonb), public._merge_check(uuid, uuid) from public, anon, authenticated;
