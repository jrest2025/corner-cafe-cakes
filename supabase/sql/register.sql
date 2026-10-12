-- Master Cake Register
-- One record per cake order line from: the Online sheet, the Walk-in sheet, the website and the staff app.
-- Sheet rows are kept exactly as typed (first version and every amendment). The register is rebuilt from them,
-- from the orders in the app, and from manager review decisions. Every change to a record is logged.
-- Nothing in here sends emails or changes orders.

alter table public.orders add column if not exists deleted_at timestamptz;

create table if not exists public.reg_rows (
  key text primary key,                       -- sheet + submission time (or row number when there is none)
  sheet text not null check (sheet in ('online', 'walkin')),
  sheet_row int,
  import_key text,
  raw jsonb not null,                         -- cells as they are now
  raw_first jsonb not null,                   -- cells as first seen; never changed
  parsed jsonb not null,
  hash text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  changed_at timestamptz,
  missing_since timestamptz
);
create table if not exists public.reg_row_versions (
  id bigserial primary key, key text not null, at timestamptz not null default now(), sheet_row int, raw jsonb not null, parsed jsonb not null
);
create index if not exists reg_row_versions_key on public.reg_row_versions (key, at);

create table if not exists public.reg_links (
  key text primary key, order_id uuid not null unique, how text not null, at timestamptz not null default now()
);
create table if not exists public.reg_refs (rec_key text primary key, reference text not null unique);
create sequence if not exists public.reg_ref_seq;

create table if not exists public.register (
  rec_key text primary key,
  reference text,
  source text not null,
  channel text not null,
  sheet_row int,
  order_id uuid,
  order_date date,
  order_date_basis text,
  fulfil_date date,
  fulfil_time text,
  method text,
  customer text,
  phone_key text,
  email text,
  cake text,
  cake_group text,
  flavour text,
  size_inch int,
  qty int,
  list_value numeric,
  confirmed_value numeric,
  status text,
  completion text,
  paid numeric,
  refunded numeric,
  balance numeric,
  review text not null default 'ok',
  flags text[] not null default '{}',
  warnings text[] not null default '{}',
  duplicate_of text,
  staff_member text,
  status_note text,
  extra jsonb not null default '{}',
  sig text not null,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists register_fulfil on public.register (fulfil_date);

create table if not exists public.reg_history (
  id bigserial primary key, rec_key text not null, at timestamptz not null default now(),
  source text not null, actor uuid, actor_label text, changes jsonb not null
);
create index if not exists reg_history_key on public.reg_history (rec_key, at);

create table if not exists public.reg_decisions (
  rec_key text primary key,
  decision text not null check (decision in ('not_duplicate', 'duplicate', 'exclude', 'accept')),
  duplicate_of text, flags_cleared text[] not null default '{}', note text,
  by_user uuid, by_label text, at timestamptz not null default now()
);

create table if not exists public.reg_sync_runs (
  id bigserial primary key, at timestamptz not null default now(), sheet text not null,
  ok boolean not null, received int, new_rows int, changed_rows int, missing_rows int, message text
);
create index if not exists reg_sync_runs_at on public.reg_sync_runs (sheet, at desc);

create table if not exists public.reg_meta (k text primary key, v text, at timestamptz not null default now());

alter table public.reg_rows enable row level security;
alter table public.reg_row_versions enable row level security;
alter table public.reg_links enable row level security;
alter table public.reg_refs enable row level security;
alter table public.register add column if not exists cake_group text;
alter table public.register enable row level security;
alter table public.reg_history enable row level security;
alter table public.reg_decisions enable row level security;
alter table public.reg_sync_runs enable row level security;
alter table public.reg_meta enable row level security;

-- References for sheet rows that have no order in the app continue the H- numbering of the imported history
do $$
declare v int;
begin
  select coalesce(max(substring(reference from '^H-(\d+)$')::int), 0) into v from public.orders where reference ~ '^H-\d+$';
  if (select last_value from public.reg_ref_seq) < v + 1 and not (select is_called from public.reg_ref_seq) then
    perform setval('public.reg_ref_seq', v + 1, false);
  end if;
end $$;

-- Order status words used in the register
create or replace function public._reg_status(s text) returns text language sql immutable as $$
  select case s when 'completed' then 'completed' when 'cancelled' then 'cancelled' when 'declined' then 'cancelled'
    when 'confirmed' then 'confirmed' when 'awaiting_deposit' then 'confirmed' else 'received' end
$$;

-- Rebuild the register from sheet rows, app orders and review decisions. Logs every change.
create or replace function public.register_rebuild(p_source text default 'refresh', p_actor uuid default null, p_label text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date; v_added int := 0; v_changed int := 0; v_gone int := 0;
begin
  perform pg_advisory_xact_lock(4242001);

  -- Link sheet rows to orders: rows brought in by the sheet feed, then the imported history (same sheet, row, phone and date)
  insert into public.reg_links (key, order_id, how)
  select rr.key, s.order_id, 'sheet feed' from public.reg_rows rr join public.sheet_order_imports s on s.import_key = rr.import_key
  where not exists (select 1 from public.reg_links l where l.key = rr.key or l.order_id = s.order_id)
  on conflict do nothing;
  insert into public.reg_links (key, order_id, how)
  select distinct on (o.id) rr.key, o.id, 'history import'
  from public.orders o
  join public.customers c on c.id = o.customer_id
  join public.reg_rows rr on rr.sheet = case when o.internal_notes like '%walk-in cake order sheet%' then 'walkin' else 'online' end
    and rr.sheet_row = (regexp_match(o.internal_notes, 'sheet, row (\d+)'))[1]::int
    -- The earlier import resolved some dates the sheet row does not state, so a missing sheet date does not block the link
    and ((rr.parsed->>'fd') is null or (rr.parsed->>'fd')::date = o.required_date)
    -- Phone must agree; the earlier import added a country code (61 for Australia) to some numbers
    and (length(coalesce(c.phone_key, '')) < 7 or length(coalesce(rr.parsed->>'pk', '')) < 7
         or c.phone_key = rr.parsed->>'pk'
         or (length(rr.parsed->>'pk') >= 8 and right(c.phone_key, length(rr.parsed->>'pk')) = rr.parsed->>'pk')
         or (length(c.phone_key) >= 8 and right(rr.parsed->>'pk', length(c.phone_key)) = c.phone_key))
  where o.reference ~ '^H-\d+$' and o.internal_notes like 'Imported history from the %'
    and not exists (select 1 from public.reg_links l where l.order_id = o.id or l.key = rr.key)
  order by o.id, rr.sheet_row
  on conflict do nothing;

  -- References for unlinked sheet rows
  insert into public.reg_refs (rec_key, reference)
  select 'sheet:' || rr.key, 'H-' || lpad(nextval('public.reg_ref_seq')::text, 4, '0')
  from (select key from public.reg_rows rr0 where not exists (select 1 from public.reg_links l where l.key = rr0.key)
        and not exists (select 1 from public.reg_refs f where f.rec_key = 'sheet:' || rr0.key) order by first_seen, sheet, sheet_row) rr
  on conflict do nothing;

  create temp table t_reg on commit drop as
  with pay as (
    select order_id, sum(amount) filter (where kind::text not in ('refund', 'adjustment')) paid, sum(amount) filter (where kind::text = 'refund') refunded,
           jsonb_agg(jsonb_build_array(kind, amount, (recorded_at at time zone 'Pacific/Fiji')::date) order by recorded_at) list
    from public.payments group by order_id
  ), act as (
    select order_id, true active from public.order_events where kind not in ('imported', 'sheet_linked', 'created') group by order_id
  ), item as (
    select distinct on (order_id) order_id, product_name, variant, size_inch, unit_price,
           (select sum(coalesce(quantity, 1)) from public.order_items x where x.order_id = i.order_id) qty
    from public.order_items i order by order_id, created_at
  ), prod as (select code, name from public.products),
  sheet as (
    select 'sheet:' || rr.key rec_key, rr.key, rr.sheet, rr.sheet_row, rr.parsed p, rr.missing_since, o.*,
           o.id is not null and (o.reference !~ '^H-\d+$' or coalesce(a.active, false)) app_active,
           pay.paid, pay.refunded, pay.list pay_list, f.reference new_ref, pr.name product_name_full
    from public.reg_rows rr
    left join public.reg_links l on l.key = rr.key
    left join public.orders o on o.id = l.order_id
    left join act a on a.order_id = o.id
    left join pay on pay.order_id = o.id
    left join public.reg_refs f on f.rec_key = 'sheet:' || rr.key
    left join prod pr on pr.code = rr.parsed->>'pc'
  )
  select s.rec_key,
    coalesce(s.reference, s.new_ref) reference,
    case s.sheet when 'online' then 'Online sheet' else 'Walk-in sheet' end source,
    case s.sheet when 'online' then 'Online' else 'Walk-in' end channel,
    s.sheet_row, s.id order_id,
    (s.p->>'od')::date order_date, s.p->>'odb' order_date_basis,
    case when s.app_active then s.required_date else (s.p->>'fd')::date end fulfil_date,
    case when s.app_active then to_char(s.required_time, 'HH24:MI') else s.p->>'ft' end fulfil_time,
    case when s.app_active then s.fulfilment_method else s.p->>'m' end method,
    s.p->>'n' customer, nullif(s.p->>'pk', '') phone_key, s.p->>'e' email,
    case when (s.p->>'cu')::boolean then 'Custom cake' else coalesce(s.p->>'v', s.product_name_full, s.p->>'cl') end cake,
    case when (s.p->>'cu')::boolean then 'Custom cake' else coalesce(s.product_name_full, s.p->>'cl') end cake_group,
    case when (s.p->>'cu')::boolean then null else s.p->>'cl' end flavour,
    (s.p->>'sz')::int size_inch, coalesce((s.p->>'q')::int, 1) qty,
    (s.p->>'lp')::numeric * coalesce((s.p->>'q')::int, 1) list_value,
    case when s.app_active then s.final_total else (s.p->>'cv')::numeric end confirmed_value,
    case when s.app_active then public._reg_status(s.order_status::text) else s.p->>'st' end status,
    case
      when s.app_active then case when s.order_status::text = 'completed' then 'recorded' when s.order_status::text in ('cancelled', 'declined') then null
                                  when s.required_date < v_today then 'not_recorded' else 'pending' end
      when s.p->>'st' in ('cancelled', 'not_confirmed') or s.p->>'fd' is null then null
      when (s.p->>'fd')::date < v_today then 'assumed' else 'pending' end completion,
    case when s.app_active then coalesce(s.paid, 0) end paid,
    case when s.app_active then coalesce(s.refunded, 0) end refunded,
    case when s.app_active and s.order_status::text not in ('cancelled', 'declined')
         then greatest(coalesce(s.final_total, s.estimate_total, 0) - coalesce(s.paid, 0), 0) end balance,
    array(select jsonb_array_elements_text(coalesce(s.p->'flags', '[]')))
      || case when s.missing_since is not null then array['removed_from_sheet'] else '{}'::text[] end flags,
    array(select jsonb_array_elements_text(coalesce(s.p->'warnings', '[]'))) warnings,
    s.p->>'staff' staff_member, s.p->>'sn' status_note,
    s.p->>'dh' dup_hash, s.is_test, s.deleted_at,
    jsonb_build_object('pay', s.pay_list, 'ho', s.handed_over_at, 'ra', s.ready_at, 'rev', coalesce(s.revision, 0),
      'cx', case when s.app_active then s.decline_reason end, 'ca', (s.cancelled_at at time zone 'Pacific/Fiji')::date,
      'live', s.app_active, 'ins', s.p->>'ins') extra
  from sheet s
  union all
  -- Orders that exist only in the app (website and staff app)
  select 'app:' || o.id, o.reference,
    case when o.source::text = 'online' then 'Website' else 'Staff app' end,
    case when o.source::text = 'online' then 'Online' else 'Walk-in' end,
    null, o.id, (o.created_at at time zone 'Pacific/Fiji')::date, 'Entered in the system',
    o.required_date, to_char(o.required_time, 'HH24:MI'), o.fulfilment_method,
    c.full_name, nullif(c.phone_key, ''), c.email,
    coalesce(i.variant, i.product_name), coalesce(i.product_name, 'Cake'), case when i.variant is not null then i.product_name end,
    i.size_inch, coalesce(i.qty, 1)::int, o.estimate_total, o.final_total,
    public._reg_status(o.order_status::text),
    case when o.order_status::text = 'completed' then 'recorded' when o.order_status::text in ('cancelled', 'declined') then null
         when o.required_date < v_today then 'not_recorded' else 'pending' end,
    coalesce(pay.paid, 0), coalesce(pay.refunded, 0),
    case when o.order_status::text not in ('cancelled', 'declined') then greatest(coalesce(o.final_total, o.estimate_total, 0) - coalesce(pay.paid, 0), 0) end,
    '{}'::text[], '{}'::text[], null, null, null, o.is_test, o.deleted_at,
    jsonb_build_object('pay', pay.list, 'ho', o.handed_over_at, 'ra', o.ready_at, 'rev', coalesce(o.revision, 0),
      'cx', o.decline_reason, 'ca', (o.cancelled_at at time zone 'Pacific/Fiji')::date, 'live', true)
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  left join item i on i.order_id = o.id
  left join pay on pay.order_id = o.id
  where o.reference !~ '^H-\d+$' and not exists (select 1 from public.reg_links l where l.order_id = o.id)
  union all
  -- Imported history whose sheet row can no longer be found
  select 'hist:' || o.id, o.reference,
    case when o.internal_notes like '%walk-in cake order sheet%' then 'Walk-in sheet' else 'Online sheet' end,
    case when o.internal_notes like '%walk-in cake order sheet%' then 'Walk-in' else 'Online' end,
    (regexp_match(o.internal_notes, 'sheet, row (\d+)'))[1]::int, o.id, null, null,
    o.required_date, to_char(o.required_time, 'HH24:MI'), o.fulfilment_method,
    c.full_name, nullif(c.phone_key, ''), c.email,
    coalesce(i.variant, i.product_name), coalesce(i.product_name, 'Cake'), case when i.variant is not null then i.product_name end,
    i.size_inch, coalesce(i.qty, 1)::int, o.estimate_total, null, 'received',
    case when o.required_date < v_today then 'assumed' else 'pending' end, null, null, null,
    array['not_found_in_sheet'], '{}'::text[], null, null, null, o.is_test, o.deleted_at, jsonb_build_object('live', false)
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  left join item i on i.order_id = o.id
  where o.reference ~ '^H-\d+$' and not exists (select 1 from public.reg_links l where l.order_id = o.id)
    and exists (select 1 from public.reg_sync_runs sr where sr.ok
                and sr.sheet = case when o.internal_notes like '%walk-in cake order sheet%' then 'walkin' else 'online' end);

  alter table t_reg add column review text, add column duplicate_of text, add column rank int;

  -- An imported-history order whose sheet row still exists but no longer matches it (different phone or date): a manager decides
  update t_reg t set flags = array['imported_twice'], duplicate_of = 'sheet:' || rr.key
  from public.orders o, public.reg_rows rr
  where t.rec_key like 'hist:%' and o.id = t.order_id
    and rr.sheet = case when o.internal_notes like '%walk-in cake order sheet%' then 'walkin' else 'online' end
    and rr.sheet_row = (regexp_match(o.internal_notes, 'sheet, row (\d+)'))[1]::int and rr.missing_since is null;

  -- Rows typed in twice: identical content in the same sheet
  update t_reg t set flags = t.flags || array['identical_row'], duplicate_of = d.first_key
  from (select rec_key, first_value(rec_key) over (partition by dup_hash order by sheet_row, rec_key) first_key,
               count(*) over (partition by dup_hash) n
        from t_reg where dup_hash is not null and not coalesce(is_test, false) and deleted_at is null) d
  where d.rec_key = t.rec_key and d.n > 1 and d.first_key <> t.rec_key;

  -- Possible duplicates: same phone, same fulfilment date, same cake and size, across every source
  update t_reg t set flags = t.flags || array['possible_duplicate'], duplicate_of = coalesce(t.duplicate_of, d.first_key)
  from (select rec_key,
               first_value(rec_key) over w first_key, count(*) over (partition by phone_key, fulfil_date, lower(cake), coalesce(size_inch, 0)) n
        from t_reg
        where phone_key is not null and length(phone_key) >= 7 and fulfil_date is not null
          and not coalesce(is_test, false) and deleted_at is null and coalesce(status, '') <> 'cancelled'
        window w as (partition by phone_key, fulfil_date, lower(cake), coalesce(size_inch, 0)
                     order by (rec_key like 'app:%') desc, (extra->>'live')::boolean desc nulls last, order_date nulls last, sheet_row nulls last, rec_key)) d
  where d.rec_key = t.rec_key and d.n > 1 and d.first_key <> t.rec_key and not ('identical_row' = any (t.flags));

  -- Apply manager decisions
  update t_reg t set flags = array(select f from unnest(t.flags) f where f not in ('identical_row', 'possible_duplicate'))
  from public.reg_decisions r where r.rec_key = t.rec_key and r.decision = 'not_duplicate';
  update t_reg t set flags = array(select f from unnest(t.flags) f where not (f = any (r.flags_cleared)))
  from public.reg_decisions r where r.rec_key = t.rec_key and r.decision = 'accept';
  update t_reg t set review = case r.decision when 'duplicate' then 'duplicate' else 'excluded' end,
                     duplicate_of = case when r.decision = 'duplicate' then coalesce(r.duplicate_of, t.duplicate_of) else t.duplicate_of end
  from public.reg_decisions r where r.rec_key = t.rec_key and r.decision in ('duplicate', 'exclude');
  update t_reg set review = 'excluded', flags = flags || array['test_order'] where review is null and coalesce(is_test, false);
  update t_reg set review = 'excluded', flags = flags || array['deleted_in_app'] where review is null and deleted_at is not null;
  update t_reg set review = case when cardinality(flags) > 0 then 'needs_review' else 'ok' end where review is null;
  update t_reg set duplicate_of = null where review = 'ok';

  -- Write changes and log them
  with src as (
    select t.*, md5(concat_ws('|', reference, source, channel, sheet_row, order_id, order_date, order_date_basis, fulfil_date, fulfil_time, method,
             customer, phone_key, email, cake, cake_group, flavour, size_inch, qty, list_value, confirmed_value, status, completion, paid, refunded, balance,
             review, array_to_string(flags, ','), array_to_string(warnings, ','), duplicate_of, staff_member, status_note, extra::text)) new_sig
    from t_reg t
  ), changed as (
    select s.*, g.sig old_sig, to_jsonb(g) old_row from src s left join public.register g on g.rec_key = s.rec_key
    where g.rec_key is null or g.sig <> s.new_sig
  ), logged as (
    insert into public.reg_history (rec_key, source, actor, actor_label, changes)
    select c.rec_key, p_source, p_actor, p_label,
      case when c.old_sig is null then jsonb_build_object('added', true)
      else (select coalesce(jsonb_object_agg(k, jsonb_build_object('from', c.old_row->k, 'to', to_jsonb(c)->k)), '{}')
            from unnest(array['reference','order_date','fulfil_date','fulfil_time','method','customer','phone_key','email','cake','flavour','size_inch','qty',
                              'list_value','confirmed_value','status','completion','paid','refunded','balance','review','flags','duplicate_of','status_note']) k
            where (c.old_row->k) is distinct from (to_jsonb(c)->k)) end
    from changed c
    returning 1
  ), up as (
    insert into public.register as g (rec_key, reference, source, channel, sheet_row, order_id, order_date, order_date_basis, fulfil_date, fulfil_time, method,
      customer, phone_key, email, cake, cake_group, flavour, size_inch, qty, list_value, confirmed_value, status, completion, paid, refunded, balance,
      review, flags, warnings, duplicate_of, staff_member, status_note, extra, sig, updated_at)
    select rec_key, reference, source, channel, sheet_row, order_id, order_date, order_date_basis, fulfil_date, fulfil_time, method,
      customer, phone_key, email, cake, cake_group, flavour, size_inch, qty, list_value, confirmed_value, status, completion, paid, refunded, balance,
      review, flags, warnings, duplicate_of, staff_member, status_note, extra, new_sig, now()
    from changed
    on conflict (rec_key) do update set reference = excluded.reference, source = excluded.source, channel = excluded.channel,
      sheet_row = excluded.sheet_row, order_id = excluded.order_id, order_date = excluded.order_date, order_date_basis = excluded.order_date_basis,
      fulfil_date = excluded.fulfil_date, fulfil_time = excluded.fulfil_time, method = excluded.method, customer = excluded.customer,
      phone_key = excluded.phone_key, email = excluded.email, cake = excluded.cake, cake_group = excluded.cake_group, flavour = excluded.flavour, size_inch = excluded.size_inch,
      qty = excluded.qty, list_value = excluded.list_value, confirmed_value = excluded.confirmed_value, status = excluded.status,
      completion = excluded.completion, paid = excluded.paid, refunded = excluded.refunded, balance = excluded.balance, review = excluded.review,
      flags = excluded.flags, warnings = excluded.warnings, duplicate_of = excluded.duplicate_of, staff_member = excluded.staff_member,
      status_note = excluded.status_note, extra = excluded.extra, sig = excluded.sig, updated_at = now()
    returning (xmax = 0) inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into v_added, v_changed from up;

  -- Imported-history placeholders whose sheet row has now been found are replaced by the sheet record
  with merged as (
    delete from public.register g where g.rec_key like 'hist:%' and not exists (select 1 from t_reg t where t.rec_key = g.rec_key)
      and exists (select 1 from public.reg_links l where l.order_id = g.order_id)
    returning g.rec_key, g.order_id
  )
  insert into public.reg_history (rec_key, source, actor, actor_label, changes)
  select m.rec_key, p_source, p_actor, p_label, jsonb_build_object('replaced_by', 'sheet:' || l.key) from merged m join public.reg_links l on l.order_id = m.order_id;

  -- Records whose source has gone (for example an app order turned into a test): kept, excluded and logged
  with gone as (
    update public.register g set review = 'excluded', flags = array['no_longer_in_source'], updated_at = now(),
      sig = md5(g.sig || 'gone')
    where not exists (select 1 from t_reg t where t.rec_key = g.rec_key) and not ('no_longer_in_source' = any (g.flags))
    returning g.rec_key
  ), logged as (
    insert into public.reg_history (rec_key, source, actor, actor_label, changes)
    select rec_key, p_source, p_actor, p_label, jsonb_build_object('removed', 'The source record no longer exists') from gone returning 1
  )
  select count(*) into v_gone from logged;

  insert into public.reg_meta (k, v, at) values ('last_rebuild', p_source, now())
  on conflict (k) do update set v = excluded.v, at = now();
  return jsonb_build_object('ok', true, 'added', v_added, 'changed', v_changed, 'removed', v_gone);
end $$;

-- Called by the sheet feed: stores the rows exactly as sent, keeps every amendment, notes rows that disappeared, then rebuilds.
create or replace function public.register_ingest(p_sheet text, p_rows jsonb, p_full boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_new int := 0; v_changed int := 0; v_missing int := 0; v_n int := jsonb_array_length(coalesce(p_rows, '[]')); r jsonb;
begin
  if p_sheet not in ('online', 'walkin') then raise exception 'unknown sheet'; end if;
  perform pg_advisory_xact_lock(4242001);
  create temp table t_in on commit drop as
  select x->>'key' key, (x->>'row')::int sheet_row, x->>'import_key' import_key, x->'raw' raw, x->'p' parsed, md5((x->'raw')::text) hash
  from jsonb_array_elements(coalesce(p_rows, '[]')) x;
  if exists (select key from t_in group by key having count(*) > 1) then
    -- Two rows with the same submission time: fall back to the row number for the later ones
    update t_in t set key = t.key || '#row' || t.sheet_row
    where exists (select 1 from t_in u where u.key = t.key and u.sheet_row < t.sheet_row);
  end if;

  insert into public.reg_row_versions (key, sheet_row, raw, parsed)
  select t.key, t.sheet_row, t.raw, t.parsed from t_in t left join public.reg_rows rr on rr.key = t.key
  where rr.key is null or rr.hash <> t.hash;
  get diagnostics v_changed = row_count;

  with up as (
    insert into public.reg_rows as rr (key, sheet, sheet_row, import_key, raw, raw_first, parsed, hash)
    select key, p_sheet, sheet_row, import_key, raw, raw, parsed, hash from t_in
    on conflict (key) do update set sheet_row = excluded.sheet_row, import_key = excluded.import_key, last_seen = now(), missing_since = null,
      raw = excluded.raw, parsed = excluded.parsed,
      changed_at = case when rr.hash <> excluded.hash then now() else rr.changed_at end, hash = excluded.hash
    returning (xmax = 0) inserted
  ) select count(*) filter (where inserted) into v_new from up;
  v_changed := v_changed - v_new;

  if p_full then
    update public.reg_rows set missing_since = now()
    where sheet = p_sheet and missing_since is null and not exists (select 1 from t_in t where t.key = reg_rows.key);
    get diagnostics v_missing = row_count;
  end if;

  insert into public.reg_sync_runs (sheet, ok, received, new_rows, changed_rows, missing_rows)
  values (p_sheet, true, v_n, v_new, v_changed, v_missing);
  r := public.register_rebuild('sheet sync');
  return jsonb_build_object('ok', true, 'received', v_n, 'new', v_new, 'changed', v_changed, 'missing', v_missing, 'register', r);
end $$;

create or replace function public.register_sync_failed(p_sheet text, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into public.reg_sync_runs (sheet, ok, message) values (coalesce(p_sheet, 'unknown'), false, left(coalesce(p_message, 'Unknown error'), 500));
$$;

-- Sync health for staff screens
create or replace function public._register_sync() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'online', (select jsonb_build_object('ok_at', max(at) filter (where ok), 'fail_at', max(at) filter (where not ok),
               'fail_msg', (select message from public.reg_sync_runs f where f.sheet = 'online' and not f.ok order by at desc limit 1)) from public.reg_sync_runs where sheet = 'online'),
    'walkin', (select jsonb_build_object('ok_at', max(at) filter (where ok), 'fail_at', max(at) filter (where not ok),
               'fail_msg', (select message from public.reg_sync_runs f where f.sheet = 'walkin' and not f.ok order by at desc limit 1)) from public.reg_sync_runs where sheet = 'walkin'),
    'rebuilt_at', (select at from public.reg_meta where k = 'last_rebuild'),
    'stale_minutes', 20,
    'records', (select count(*) from public.register where review <> 'excluded' and review <> 'duplicate'),
    'needs_review', (select count(*) from public.register where review = 'needs_review'),
    'excluded', (select count(*) from public.register where review in ('excluded', 'duplicate')))
$$;

create or replace function public.register_status() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager', 'marketing', 'finance') then return public._err('forbidden', 'Your login cannot see the cake register.'); end if;
  return jsonb_build_object('ok', true) || public._register_sync();
end $$;

-- Manager review
create or replace function public.register_review_list() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can review register records.'); end if;
  if coalesce((select at from public.reg_meta where k = 'last_rebuild'), 'epoch') < now() - interval '2 minutes' then
    perform public.register_rebuild('refresh');
  end if;
  return jsonb_build_object('ok', true, 'sync', public._register_sync(), 'records', coalesce((
    select jsonb_agg(public._register_card(g) order by g.fulfil_date nulls first, g.rec_key) from public.register g where g.review = 'needs_review'), '[]'),
    'recent', coalesce((
    select jsonb_agg(x order by x->>'at' desc) from (
      select jsonb_build_object('rec_key', d.rec_key, 'reference', g.reference, 'decision', d.decision, 'note', d.note, 'by', d.by_label, 'at', d.at) x
      from public.reg_decisions d left join public.register g on g.rec_key = d.rec_key order by d.at desc limit 20) z), '[]'));
end $$;

create or replace function public._register_card(g public.register) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('rec_key', g.rec_key, 'reference', g.reference, 'source', g.source, 'channel', g.channel, 'sheet_row', g.sheet_row,
    'order_id', g.order_id, 'order_date', g.order_date, 'order_date_basis', g.order_date_basis, 'fulfil_date', g.fulfil_date,
    'fulfil_time', g.fulfil_time, 'method', g.method, 'customer', g.customer, 'phone_key', g.phone_key, 'cake', g.cake, 'flavour', g.flavour,
    'size_inch', g.size_inch, 'list_value', g.list_value, 'confirmed_value', g.confirmed_value, 'status', g.status, 'status_note', g.status_note,
    'review', g.review, 'flags', g.flags, 'warnings', g.warnings, 'duplicate_of', g.duplicate_of, 'staff_member', g.staff_member,
    'raw', (select rr.raw from public.reg_rows rr where 'sheet:' || rr.key = g.rec_key),
    'other', (select jsonb_build_object('rec_key', o.rec_key, 'reference', o.reference, 'source', o.source, 'sheet_row', o.sheet_row,
                'customer', o.customer, 'cake', o.cake, 'size_inch', o.size_inch, 'fulfil_date', o.fulfil_date, 'order_date', o.order_date, 'status', o.status)
              from public.register o where o.rec_key = g.duplicate_of))
$$;

create or replace function public.register_decide(p_rec_key text, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.register; v_name text; r jsonb;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can review register records.'); end if;
  select * into g from public.register where rec_key = p_rec_key;
  if not found then return public._err('record', 'That record was not found.'); end if;
  if p_decision not in ('not_duplicate', 'duplicate', 'exclude', 'accept', 'undo') then return public._err('decision', 'Unknown choice.'); end if;
  if p_decision in ('duplicate', 'exclude') and length(trim(coalesce(p_note, ''))) < 3 then
    return public._err('note', 'Add a short reason.', 'note');
  end if;
  if p_decision = 'duplicate' and g.duplicate_of is null then return public._err('decision', 'There is no matching record to merge this into.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  if p_decision = 'undo' then
    delete from public.reg_decisions where rec_key = p_rec_key;
  else
    insert into public.reg_decisions (rec_key, decision, duplicate_of, flags_cleared, note, by_user, by_label)
    values (p_rec_key, p_decision, case when p_decision = 'duplicate' then g.duplicate_of end, g.flags, nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name)
    on conflict (rec_key) do update set decision = excluded.decision, duplicate_of = excluded.duplicate_of, flags_cleared = excluded.flags_cleared,
      note = excluded.note, by_user = excluded.by_user, by_label = excluded.by_label, at = now();
  end if;
  insert into public.reg_history (rec_key, source, actor, actor_label, changes)
  values (p_rec_key, 'review', auth.uid(), v_name, jsonb_build_object('decision', p_decision, 'note', p_note));
  r := public.register_rebuild('review', auth.uid(), v_name);
  return jsonb_build_object('ok', true, 'reference', g.reference);
end $$;

create or replace function public.register_record(p_rec_key text) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager', 'marketing', 'finance') then return public._err('forbidden', 'Your login cannot open register records.'); end if;
  return jsonb_build_object('ok', true,
    'record', (select public._register_card(g) from public.register g where g.rec_key = p_rec_key),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', h.at, 'source', h.source, 'by', h.actor_label, 'changes', h.changes) order by h.at desc)
                from public.reg_history h where h.rec_key = p_rec_key), '[]'),
    'versions', coalesce((select jsonb_agg(jsonb_build_object('at', v.at, 'row', v.sheet_row, 'raw', v.raw) order by v.at desc)
                from public.reg_row_versions v where 'sheet:' || v.key = p_rec_key), '[]'));
end $$;

-- Everything the Master Cake Register Google Sheet shows. Used by the sheet feed only.
create or replace function public.register_export() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('generated_at', now(), 'sync', public._register_sync(),
    'records', coalesce((select jsonb_agg(jsonb_build_array(
        g.reference, g.channel, g.source, g.sheet_row, g.order_date, g.order_date_basis, g.fulfil_date, g.fulfil_time,
        case g.method when 'delivery' then 'Delivery' else 'Collection' end, g.customer, g.phone_key, g.email, g.cake, g.flavour, g.size_inch, g.qty,
        g.list_value, g.confirmed_value,
        case g.status when 'received' then 'Received' when 'confirmed' then 'Confirmed' when 'not_confirmed' then 'Quoted or enquiry, not confirmed'
          when 'cancelled' then 'Cancelled' when 'completed' then 'Collected or delivered' else g.status end,
        case g.completion when 'recorded' then 'Recorded in the app' when 'assumed' then 'Past date, not recorded (sheet)'
          when 'not_recorded' then 'Past date, not marked collected' when 'pending' then 'Still to come' else '' end,
        g.paid, g.refunded, g.balance,
        case g.review when 'ok' then 'OK' when 'needs_review' then 'Needs review' when 'duplicate' then 'Duplicate (left out)' else 'Left out' end,
        array_to_string(g.flags, ', '), (select d.reference from public.register d where d.rec_key = g.duplicate_of),
        array_to_string(g.warnings, '; '), g.staff_member, g.status_note, g.updated_at, g.rec_key)
      order by g.fulfil_date nulls first, g.reference) from public.register g), '[]'),
    'history', coalesce((select jsonb_agg(jsonb_build_array(h.at, g.reference, h.source, h.actor_label, h.changes::text) order by h.at desc)
      from (select * from public.reg_history order by at desc limit 1000) h left join public.register g on g.rec_key = h.rec_key), '[]'))
$$;

revoke all on function public.register_rebuild(text, uuid, text) from public, anon, authenticated;
revoke all on function public.register_ingest(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.register_sync_failed(text, text) from public, anon, authenticated;
revoke all on function public.register_export() from public, anon, authenticated;
revoke all on function public._register_sync() from public, anon, authenticated;
revoke all on function public._register_card(public.register) from public, anon, authenticated;
revoke all on function public.register_status() from public, anon;
revoke all on function public.register_review_list() from public, anon;
revoke all on function public.register_decide(text, text, text) from public, anon;
revoke all on function public.register_record(text) from public, anon;
grant execute on function public.register_status() to authenticated;
grant execute on function public.register_review_list() to authenticated;
grant execute on function public.register_decide(text, text, text) to authenticated;
grant execute on function public.register_record(text) to authenticated;

-- Dashboard feed (replaces dashboard_data once the new staff screens are published): the Master Cake Register is the only source. Records needing review, duplicates and exclusions are counted, not used.
create or replace function public.dashboard_register()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('marketing') then
    return jsonb_build_object('ok', false, 'message', 'Your login does not have access to the dashboard.');
  end if;
  if coalesce((select at from public.reg_meta where k = 'last_rebuild'), 'epoch') < now() - interval '2 minutes' then
    perform public.register_rebuild('refresh');
  end if;
  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'sync', public._register_sync(),
    'master_url', (select v from public.reg_meta where k = 'master_sheet_url'),
    'left_out', (select jsonb_object_agg(review, n) from (select review, count(*) n from public.register where review <> 'ok' group by review) x),
    'tests_excluded', (select count(*) from public.register where 'test_order' = any (flags)),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
        'k', g.rec_key, 'i', g.order_id, 'r', g.reference, 'src', g.channel, 'sys', g.source, 'st', g.status, 'cp', g.completion,
        'od', g.order_date, 'odb', g.order_date_basis,
        'odok', g.order_date is not null and g.order_date_basis <> 'Sheet entry time' and (g.fulfil_date is null or g.order_date <= g.fulfil_date),
        'pd', g.fulfil_date, 'pt', g.fulfil_time, 'fm', g.method,
        'c', g.phone_key, 'cn', g.customer,
        'it', jsonb_build_array(jsonb_build_array(coalesce(g.cake_group, 'Cake'), g.cake, g.size_inch, coalesce(g.qty, 1),
               case when coalesce(g.qty, 1) > 0 then coalesce(g.confirmed_value, g.list_value) / coalesce(g.qty, 1) end)),
        'lv', g.list_value, 'cv', g.confirmed_value, 'paid', g.paid, 'ref', g.refunded, 'bal', g.balance,
        'wn', g.warnings, 'pay', g.extra->'pay', 'ho', g.extra->'ho', 'ra', g.extra->'ra', 'rev', coalesce((g.extra->>'rev')::int, 0),
        'cx', coalesce(g.extra->>'cx', g.status_note), 'ca', g.extra->'ca'
      ) order by g.fulfil_date), '[]') from public.register g where g.review = 'ok' and g.fulfil_date is not null)
  );
end $$;
revoke all on function public.dashboard_register() from public, anon;
grant execute on function public.dashboard_register() to authenticated;

-- Staging for the one-time history load (rows exactly as read from the sheets)
create table if not exists public.reg_load (sheet text not null, sheet_row int not null, raw jsonb not null, primary key (sheet, sheet_row));
alter table public.reg_load enable row level security;
