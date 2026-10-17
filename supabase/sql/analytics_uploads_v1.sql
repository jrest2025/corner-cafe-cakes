-- Analytics uploads v1 (17 Oct 2026, approved by Roneel: "yes" to the reporting storage and the upload screen)
-- Two new tables, both closed to direct access (no policies); everything goes through the functions below.
-- Live orders, customers, payments and the register itself are NOT changed: corrections sit beside the register
-- and only the Analytics figures read them. Every upload is recorded and can be undone as a whole.

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset text not null,
  template text,
  file_name text,
  file_hash text,
  rows_sent int not null default 0,
  rows_accepted int not null default 0,
  rows_refused int not null default 0,
  problems jsonb not null default '[]',
  status text not null default 'loaded' check (status in ('loaded', 'undone')),
  by_user uuid,
  by_label text,
  at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by text
);
alter table public.import_batches enable row level security;
create index if not exists import_batches_hash on public.import_batches (dataset, file_hash) where status = 'loaded';

create table if not exists public.reg_corrections (
  id bigserial primary key,
  batch_id uuid not null references public.import_batches (id),
  rec_key text not null,
  field text not null check (field in ('order_date', 'pickup_date', 'price', 'occasion', 'decision')),
  value text,
  old_value text,
  at timestamptz not null default now()
);
alter table public.reg_corrections enable row level security;
create index if not exists reg_corrections_key on public.reg_corrections (rec_key, field, at desc);

-- The value in force for each record and field: the latest correction from an upload that has not been undone
create or replace function public._reg_fix(p_rec_key text)
returns table (od date, pd date, price numeric, oc text, dcs text)
language sql stable security definer set search_path = public as $$
  with e as (
    select distinct on (c.field) c.field, c.value
    from public.reg_corrections c join public.import_batches b on b.id = c.batch_id and b.status = 'loaded'
    where c.rec_key = p_rec_key
    order by c.field, c.at desc, c.id desc)
  select (select value from e where field = 'order_date')::date,
         (select value from e where field = 'pickup_date')::date,
         (select value from e where field = 'price')::numeric,
         (select value from e where field = 'occasion'),
         (select value from e where field = 'decision')
$$;
revoke all on function public._reg_fix(text) from public, anon, authenticated;

-- Upload: the cleaning sheet for walk-in and online sheet orders (template CC-CLEAN-WALKIN-1)
-- p = { file_name, file_hash, rows: [ { row, record, order_date, pickup_date, occasion, price, decision } ] }
create or replace function public.analytics_import_cleaning(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_batch uuid; r jsonb; g public.register; n_ok int := 0; probs jsonb := '[]'; k int := 0;
  v_od date; v_pd date; v_price numeric; v_oc text; v_dec text; fx record; changed boolean;
begin
  if not public.has_perm('mgmt.register') then return public._err('forbidden', 'Only managers can upload corrections.'); end if;
  if jsonb_typeof(p->'rows') <> 'array' or jsonb_array_length(p->'rows') = 0 then return public._err('rows', 'The file has no rows to load.'); end if;
  if jsonb_array_length(p->'rows') > 5000 then return public._err('rows', 'The file has more than 5,000 rows. Split it and upload each part.'); end if;
  if coalesce(p->>'file_hash', '') <> '' and exists (select 1 from public.import_batches where dataset = 'cake_cleaning' and file_hash = p->>'file_hash' and status = 'loaded') then
    return public._err('duplicate', 'This exact file has already been loaded. Nothing was changed.');
  end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  insert into public.import_batches (dataset, template, file_name, file_hash, rows_sent, by_user, by_label)
  values ('cake_cleaning', 'CC-CLEAN-WALKIN-1', left(p->>'file_name', 200), p->>'file_hash', jsonb_array_length(p->'rows'), auth.uid(), v_name)
  returning id into v_batch;
  for r in select * from jsonb_array_elements(p->'rows') loop
    k := k + 1;
    select * into g from public.register where rec_key = r->>'record';
    if not found then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Record not found in the system. Was the Record column changed?'); continue; end if;
    begin
      v_od := nullif(r->>'order_date', '')::date; v_pd := nullif(r->>'pickup_date', '')::date; v_price := nullif(r->>'price', '')::numeric;
    exception when others then
      probs := probs || jsonb_build_object('row', r->'row', 'message', 'A date or price could not be read.'); continue;
    end;
    v_oc := null;
    if coalesce(r->>'occasion', '') <> '' then
      select code into v_oc from public.occasions where lower(label) = lower(trim(r->>'occasion'));
      if v_oc is null then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Occasion "' || left(r->>'occasion', 40) || '" is not on the list.'); continue; end if;
    end if;
    v_dec := nullif(trim(coalesce(r->>'decision', '')), '');
    if v_dec is not null and v_dec not in ('Keep', 'Delete') then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Decision must be Keep or Delete.'); continue; end if;
    if v_price is not null and (v_price < 0 or v_price > 5000) then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Price must be between 0 and 5,000 dollars.'); continue; end if;
    if v_pd is not null and (v_pd < date '2015-01-01' or v_pd > current_date + 400) then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Pickup date is outside the possible range.'); continue; end if;
    if v_od is not null and (v_od < date '2015-01-01' or v_od > current_date or v_od > coalesce(v_pd, g.fulfil_date, v_od)) then probs := probs || jsonb_build_object('row', r->'row', 'message', 'Order date is in the future or after the pickup date.'); continue; end if;
    select * into fx from public._reg_fix(g.rec_key);
    changed := false;
    if v_od is not null and v_od is distinct from coalesce(fx.od, case when g.order_date_basis <> 'Sheet entry time' then g.order_date end) then
      insert into public.reg_corrections (batch_id, rec_key, field, value, old_value) values (v_batch, g.rec_key, 'order_date', v_od::text, coalesce(fx.od, g.order_date)::text); changed := true; end if;
    if v_pd is not null and v_pd is distinct from coalesce(fx.pd, g.fulfil_date) then
      insert into public.reg_corrections (batch_id, rec_key, field, value, old_value) values (v_batch, g.rec_key, 'pickup_date', v_pd::text, coalesce(fx.pd, g.fulfil_date)::text); changed := true; end if;
    if v_price is not null and v_price is distinct from coalesce(fx.price, coalesce(g.confirmed_value, g.list_value) / nullif(coalesce(g.qty, 1), 0)) then
      insert into public.reg_corrections (batch_id, rec_key, field, value, old_value) values (v_batch, g.rec_key, 'price', v_price::text, coalesce(fx.price, coalesce(g.confirmed_value, g.list_value) / nullif(coalesce(g.qty, 1), 0))::text); changed := true; end if;
    if v_oc is not null and v_oc is distinct from fx.oc then
      insert into public.reg_corrections (batch_id, rec_key, field, value, old_value) values (v_batch, g.rec_key, 'occasion', v_oc, fx.oc); changed := true; end if;
    if v_dec is not null and v_dec is distinct from coalesce(fx.dcs, 'Keep') then
      insert into public.reg_corrections (batch_id, rec_key, field, value, old_value) values (v_batch, g.rec_key, 'decision', v_dec, coalesce(fx.dcs, 'Keep')); changed := true; end if;
    n_ok := n_ok + 1;
  end loop;
  update public.import_batches set rows_accepted = n_ok, rows_refused = jsonb_array_length(probs), problems = probs where id = v_batch;
  return jsonb_build_object('ok', true, 'batch', v_batch, 'accepted', n_ok, 'refused', jsonb_array_length(probs), 'problems', probs,
    'changes', (select count(*) from public.reg_corrections where batch_id = v_batch));
end $$;
revoke all on function public.analytics_import_cleaning(jsonb) from public, anon;
grant execute on function public.analytics_import_cleaning(jsonb) to authenticated;

create or replace function public.analytics_imports()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.register')) then return public._err('forbidden', 'Your login cannot see uploads.'); end if;
  return jsonb_build_object('ok', true, 'can_upload', public.has_perm('mgmt.register'), 'list', (select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'dataset', b.dataset, 'file', b.file_name, 'at', b.at, 'by', b.by_label, 'sent', b.rows_sent, 'ok', b.rows_accepted, 'refused', b.rows_refused,
    'changes', (select count(*) from public.reg_corrections c where c.batch_id = b.id), 'status', b.status, 'undone_at', b.undone_at, 'undone_by', b.undone_by
  ) order by b.at desc), '[]') from (select * from public.import_batches order by at desc limit 50) b));
end $$;
revoke all on function public.analytics_imports() from public, anon;
grant execute on function public.analytics_imports() to authenticated;

create or replace function public.analytics_import_undo(p_batch uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.has_perm('mgmt.register') then return public._err('forbidden', 'Only managers can undo an upload.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  update public.import_batches set status = 'undone', undone_at = now(), undone_by = v_name where id = p_batch and status = 'loaded';
  if not found then return public._err('batch', 'That upload was not found or is already undone.'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.analytics_import_undo(uuid) from public, anon;
grant execute on function public.analytics_import_undo(uuid) to authenticated;

-- Analytics data: the same as before, with corrections applied (order date, pickup date, price, occasion, removed records)
create or replace function public.dashboard_register()
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
    begin
      if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then
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
        'corrections', (select count(distinct c.rec_key) from public.reg_corrections c join public.import_batches b on b.id = c.batch_id and b.status = 'loaded'),
        'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
        'occasions', (select coalesce(jsonb_agg(jsonb_build_object('c', code, 'l', label) order by sort), '[]') from public.occasions where active),
        'orders', (select coalesce(jsonb_agg(jsonb_build_object(
            'k', g.rec_key, 'i', g.order_id, 'r', g.reference, 'src', g.channel, 'sys', g.source, 'st', g.status, 'cp', g.completion,
            'od', coalesce(fx.od, g.order_date), 'odb', case when fx.od is not null then 'Corrected' else g.order_date_basis end,
            'odok', coalesce(fx.od, g.order_date) is not null and (fx.od is not null or g.order_date_basis <> 'Sheet entry time')
                    and (coalesce(fx.pd, g.fulfil_date) is null or coalesce(fx.od, g.order_date) <= coalesce(fx.pd, g.fulfil_date)),
            'pd', coalesce(fx.pd, g.fulfil_date), 'pt', g.fulfil_time, 'fm', g.method,
            'c', g.phone_key, 'cn', g.customer,
            'it', jsonb_build_array(jsonb_build_array(coalesce(g.cake_group, 'Cake'), g.cake, g.size_inch, coalesce(g.qty, 1),
                   coalesce(fx.price, case when coalesce(g.qty, 1) > 0 then coalesce(g.confirmed_value, g.list_value) / coalesce(g.qty, 1) end))),
            'lv', coalesce(fx.price * coalesce(g.qty, 1), g.list_value), 'cv', coalesce(fx.price * coalesce(g.qty, 1), g.confirmed_value),
            'paid', g.paid, 'ref', g.refunded, 'bal', g.balance,
            'wn', g.warnings, 'pay', g.extra->'pay', 'ho', g.extra->'ho', 'ra', g.extra->'ra', 'rev', coalesce((g.extra->>'rev')::int, 0),
            'cx', coalesce(g.extra->>'cx', g.status_note), 'ca', g.extra->'ca',
            'oc', coalesce(fx.oc, oi.occasion_code, 'not_specified'), 'ocd', oi.occasion_detail, 'cmp', o.campaign,
            'fix', fx.od is not null or fx.pd is not null or fx.price is not null or fx.oc is not null
          ) order by coalesce(fx.pd, g.fulfil_date)), '[]')
          from public.register g
          left join public.orders o on o.id = g.order_id
          left join lateral (select x.occasion_code, x.occasion_detail from public.order_items x where x.order_id = g.order_id order by x.created_at limit 1) oi on true
          left join lateral public._reg_fix(g.rec_key) fx on true
          where g.review = 'ok' and coalesce(fx.pd, g.fulfil_date) is not null and coalesce(fx.dcs, 'Keep') <> 'Delete')
      );
    end $function$;
