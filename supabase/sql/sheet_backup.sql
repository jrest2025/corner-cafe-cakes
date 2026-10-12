-- Google Sheet backup of cake orders.
-- One linked sheet at a time. Every 5 minutes the sheet-backup Edge Function copies new and changed orders into it.
-- Historical orders (references starting H-) are left out: they already live in the old sheets.

create table if not exists public.sheet_backup (
  id int primary key default 1 check (id = 1),
  spreadsheet_id text,
  spreadsheet_title text,
  tab_name text not null default 'Cake orders',
  linked_by uuid references auth.users(id),
  linked_at timestamptz,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  last_written int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.sheet_backup (id) values (1) on conflict do nothing;

-- What was last written for each order, so only new or changed orders are sent.
create table if not exists public.sheet_backup_rows (
  order_id uuid primary key references public.orders(id) on delete cascade,
  hash text not null,
  synced_at timestamptz not null default now()
);

alter table public.sheet_backup enable row level security;
alter table public.sheet_backup_rows enable row level security;
revoke all on public.sheet_backup, public.sheet_backup_rows from anon, authenticated;

create or replace function public._sentence(t text) returns text language sql immutable set search_path = public as $$
  select upper(left(replace(t, '_', ' '), 1)) || lower(substr(replace(t, '_', ' '), 2))
$$;

-- One sheet row per order, in the same order as the header row in the Edge Function.
create or replace function public.sheet_backup_rows_data()
returns table (order_id uuid, reference text, cells jsonb, hash text)
language sql stable security definer set search_path = public as $$
  with base as (
    select o.id, o.reference,
      jsonb_build_array(
        o.reference,
        to_char(o.created_at at time zone 'Pacific/Fiji', 'YYYY-MM-DD HH24:MI'),
        case o.source::text when 'online' then 'Website' when 'walk_in' then 'Staff entry' else public._sentence(o.source::text) end,
        public._sentence(o.order_status::text),
        public._sentence(o.payment_status::text),
        initcap(o.fulfilment_method),
        to_char(o.required_date, 'YYYY-MM-DD'),
        to_char(o.required_time, 'HH24:MI'),
        coalesce(c.full_name, ''),
        coalesce(c.phone, ''),
        coalesce(c.email, ''),
        coalesce(case c.preferred_contact when 'whatsapp' then 'WhatsApp' else public._sentence(c.preferred_contact) end, ''),
        coalesce(c.company, ''),
        coalesce(it.cake, ''), coalesce(it.flavour, ''), coalesce(it.size, ''), coalesce(it.serves, ''), coalesce(it.qty, ''),
        coalesce(it.finish, ''), coalesce(it.design, ''), coalesce(it.message, ''), coalesce(it.occasion, ''),
        coalesce(it.dietary, ''), coalesce(it.dietary_note, ''),
        coalesce(ph.names, ''),
        coalesce(o.delivery_zone, ''), coalesce(o.delivery_address, ''), coalesce(o.delivery_contact, ''),
        coalesce(o.delivery_fee::text, ''),
        coalesce(o.estimate_total::text, ''), coalesce(o.final_total::text, ''),
        coalesce(o.customer_notes, ''),
        case when o.marketing_opt_in then 'Yes' else 'No' end,
        to_char(o.updated_at at time zone 'Pacific/Fiji', 'YYYY-MM-DD HH24:MI')
      ) as cells
    from public.orders o
    left join public.customers c on c.id = o.customer_id
    left join lateral (
      select
        string_agg(i.product_name, E'\n' order by i.created_at) cake,
        string_agg(coalesce(i.variant, ''), E'\n' order by i.created_at) flavour,
        string_agg(i.size_inch || ' inch', E'\n' order by i.created_at) size,
        string_agg(coalesce(i.serves_label, ''), E'\n' order by i.created_at) serves,
        string_agg(i.quantity::text, E'\n' order by i.created_at) qty,
        string_agg(initcap(i.finish), E'\n' order by i.created_at) finish,
        string_agg(coalesce(i.design_description, ''), E'\n' order by i.created_at) design,
        string_agg(coalesce(i.cake_message, ''), E'\n' order by i.created_at) message,
        string_agg(coalesce(i.occasion, ''), E'\n' order by i.created_at) occasion,
        string_agg(coalesce(nullif(array_to_string(i.dietary, ', '), ''), case when o.has_dietary then 'Yes' else 'None' end), E'\n' order by i.created_at) dietary,
        string_agg(coalesce(i.dietary_note, ''), E'\n' order by i.created_at) dietary_note
      from public.order_items i where i.order_id = o.id
    ) it on true
    left join lateral (
      select count(*) || ' photo' || case when count(*) = 1 then '' else 's' end || ': ' || string_agg(coalesce(a.file_name, regexp_replace(a.storage_path, '^.*/', '')), ', ' order by a.created_at) names
      from public.order_attachments a where a.order_id = o.id having count(*) > 0
    ) ph on true
    where o.reference not like 'H-%'
  )
  select id, reference, cells, md5(cells::text) from base order by reference;
$$;
revoke all on function public.sheet_backup_rows_data() from public, anon, authenticated;
grant execute on function public.sheet_backup_rows_data() to service_role;

-- Every 5 minutes, only while a sheet is linked.
insert into public.app_config (key, value)
select 'sheet_backup_url', replace(value, '/send-emails', '/sheet-backup') from public.app_config where key = 'function_url'
on conflict (key) do nothing;

select cron.schedule('cakes-sheet-backup', '*/5 * * * *', $cron$
  select net.http_post(
    url := (select value from public.app_config where key = 'sheet_backup_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from public.app_config where key = 'cron_key')),
    body := '{"op":"sync"}'::jsonb)
  where exists (select 1 from public.sheet_backup where spreadsheet_id is not null);
$cron$);
