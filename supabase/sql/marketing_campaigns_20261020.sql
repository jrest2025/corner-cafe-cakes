-- Marketing campaigns (20 October 2026).
-- Roneel: "plug a marketing campaign into the Analytics dashboard". A manager adds a campaign once (name, dates, where it
-- runs, spend, the occasion it promotes); the app gives it a link and a QR code; orders that come from it are tagged;
-- Analytics, Marketing shows what each campaign brought in.
--
-- Additive only: one new table and six functions. Nothing about existing orders changes.
--   * Website orders already save the campaign named in their link (orders.campaign, ?campaign= or ?utm_campaign=).
--   * Staff can tag a counter, phone or WhatsApp order with a running campaign when they enter it (order_set_campaign),
--     like order_set_taken: within two hours of entering it, never overwriting a different campaign, with a history line.
--   * Nothing is ever erased. Removing a campaign hides it (removed_at); a campaign that already brought in orders is
--     kept. Its code stays reserved, so a printed QR code can never point at a different campaign later.
-- Access: Analytics viewers can see campaigns; managers with Analytics can add, change and remove them; anyone who can
-- create orders can see which campaigns are running today and tag a new order.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,59}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  starts_on date not null,
  ends_on date not null,
  channels text[] not null default '{}',
  spend numeric(12,2) check (spend is null or spend >= 0),
  occasion_code text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_name text,
  check (ends_on >= starts_on and ends_on - starts_on <= 366)
);
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon, authenticated;

-- A campaign's code is what goes in its link: lower case, letters, numbers and dashes, with the year, unique for ever.
create or replace function public._campaign_code(p_name text, p_start date) returns text
language plpgsql stable security definer set search_path to 'public' as $$
declare
  base text := btrim(regexp_replace(regexp_replace(lower(coalesce(p_name, '')), '[''’]', '', 'g'), '[^a-z0-9]+', '-', 'g'), '-');
  yr text := to_char(coalesce(p_start, (now() at time zone 'Pacific/Fiji')::date), 'YYYY');
  v text; n int := 1;
begin
  if char_length(base) < 2 then base := 'campaign'; end if;
  if base !~ '(^|-)20[0-9]{2}(-|$)' then base := btrim(left(base, 49), '-') || '-' || yr; end if;
  base := btrim(left(base, 54), '-');
  v := base;
  while exists (select 1 from public.campaigns where code = v) loop
    n := n + 1; v := base || '-' || n;
  end loop;
  return v;
end $$;

create or replace function public._campaign_json(c public.campaigns) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'starts_on', c.starts_on, 'ends_on', c.ends_on,
    'channels', to_jsonb(c.channels), 'spend', c.spend, 'occasion', c.occasion_code, 'created_by', c.created_by_name,
    'created_at', c.created_at, 'updated_at', c.updated_at)
$$;

-- For Analytics, Marketing: every campaign that has not been removed, newest first
create or replace function public.campaign_list() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then
    return jsonb_build_object('ok', false, 'message', 'Your login does not have access to campaigns.');
  end if;
  return jsonb_build_object('ok', true, 'today', (now() at time zone 'Pacific/Fiji')::date,
    'can_edit', public.has_perm('mgmt.analytics'),
    'campaigns', coalesce((select jsonb_agg(public._campaign_json(c) order by c.starts_on desc, c.created_at desc)
      from public.campaigns c where c.removed_at is null), '[]'::jsonb),
    'removed', coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name))
      from public.campaigns c where c.removed_at is not null), '[]'::jsonb));
end $$;

-- Add (no id) or change (with id) a campaign. The code, and so the link and QR code, never change.
create or replace function public.campaign_save(p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_start date; v_end date; v_spend numeric; v_occ text := nullif(btrim(coalesce(p->>'occasion', '')), '');
  v_channels text[] := '{}'; v_allowed text[] := array['facebook','instagram','tiktok','google','whatsapp','email','print','radio','in_cafe','other'];
  c public.campaigns; v_who text;
begin
  if not public.has_perm('mgmt.analytics') then return jsonb_build_object('ok', false, 'message', 'Only managers can add or change campaigns.'); end if;
  begin v_id := nullif(p->>'id', '')::uuid;
  exception when others then return jsonb_build_object('ok', false, 'message', 'That campaign no longer exists.'); end;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then return jsonb_build_object('ok', false, 'field', 'name', 'message', 'Give the campaign a name (2 to 80 characters).'); end if;
  begin
    v_start := (p->>'starts_on')::date; v_end := (p->>'ends_on')::date;
  exception when others then return jsonb_build_object('ok', false, 'field', 'dates', 'message', 'Choose when the campaign starts and ends.'); end;
  if v_start is null or v_end is null then return jsonb_build_object('ok', false, 'field', 'dates', 'message', 'Choose when the campaign starts and ends.'); end if;
  if v_end < v_start then return jsonb_build_object('ok', false, 'field', 'dates', 'message', 'The end date cannot be before the start date.'); end if;
  if v_end - v_start > 366 then return jsonb_build_object('ok', false, 'field', 'dates', 'message', 'A campaign can run for at most a year.'); end if;
  if jsonb_typeof(p->'channels') = 'array' then
    select coalesce(array_agg(distinct x), '{}') into v_channels from jsonb_array_elements_text(p->'channels') x where x = any (v_allowed);
  end if;
  if nullif(btrim(coalesce(p->>'spend', '')), '') is not null then
    begin v_spend := round(replace(replace(btrim(p->>'spend'), ',', ''), '$', '')::numeric, 2);
    exception when others then return jsonb_build_object('ok', false, 'field', 'spend', 'message', 'Enter the spend as a number of Fiji dollars, or leave it empty.'); end;
    if v_spend < 0 or v_spend > 1000000 then return jsonb_build_object('ok', false, 'field', 'spend', 'message', 'Enter the spend as a number of Fiji dollars, or leave it empty.'); end if;
  end if;
  if v_occ is not null and not exists (select 1 from public.occasions where code = v_occ) then v_occ := null; end if;
  v_who := coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff');
  if v_id is null then
    insert into public.campaigns (code, name, starts_on, ends_on, channels, spend, occasion_code, created_by, created_by_name)
    values (public._campaign_code(v_name, v_start), v_name, v_start, v_end, v_channels, v_spend, v_occ, auth.uid(), v_who)
    returning * into c;
  else
    update public.campaigns set name = v_name, starts_on = v_start, ends_on = v_end, channels = v_channels, spend = v_spend,
      occasion_code = v_occ, updated_at = now()
    where id = v_id and removed_at is null returning * into c;
    if not found then return jsonb_build_object('ok', false, 'message', 'That campaign no longer exists.'); end if;
  end if;
  return jsonb_build_object('ok', true, 'campaign', public._campaign_json(c));
end $$;

-- Remove a campaign added by mistake. It is hidden, never erased; one that already brought in orders is kept.
create or replace function public.campaign_remove(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare c public.campaigns; n int;
begin
  if not public.has_perm('mgmt.analytics') then return jsonb_build_object('ok', false, 'message', 'Only managers can remove campaigns.'); end if;
  select * into c from public.campaigns where id = p_id and removed_at is null;
  if not found then return jsonb_build_object('ok', true); end if;
  select count(*) into n from public.orders where campaign = c.code and deleted_at is null;
  if n > 0 then
    return jsonb_build_object('ok', false, 'message', n || case when n = 1 then ' order came' else ' orders came' end ||
      ' from this campaign, so it is kept. To stop it, change its end date.');
  end if;
  update public.campaigns set removed_at = now(), updated_at = now(),
    removed_by_name = coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff')
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- For the New order form: the campaigns running today (Fiji time), newest first
create or replace function public.campaigns_active() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare d date := (now() at time zone 'Pacific/Fiji')::date;
begin
  if not public.has_perm('ord.create') then return jsonb_build_object('ok', false, 'message', 'Your login cannot create orders.'); end if;
  return jsonb_build_object('ok', true, 'campaigns', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'name', name) order by starts_on desc, name)
    from public.campaigns where removed_at is null and d between starts_on and ends_on), '[]'::jsonb));
end $$;

-- Tag an order the staff have just entered with the campaign the customer came from
create or replace function public.order_set_campaign(p_order uuid, p_code text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare o public.orders; c public.campaigns; v_code text := lower(btrim(coalesce(p_code, '')));
begin
  if not public.has_perm('ord.create') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change this.'); end if;
  select * into c from public.campaigns where code = v_code and removed_at is null;
  if not found then return jsonb_build_object('ok', false, 'message', 'That campaign no longer exists.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found or o.deleted_at is not null then return jsonb_build_object('ok', false, 'message', 'That order no longer exists.'); end if;
  if o.campaign = v_code then return jsonb_build_object('ok', true); end if;
  if o.campaign is not null then return jsonb_build_object('ok', false, 'message', 'This order already came from another campaign.'); end if;
  if o.created_at < now() - interval '2 hours' then return jsonb_build_object('ok', false, 'message', 'The campaign can only be added when the order is entered.'); end if;
  update public.orders set campaign = v_code where id = p_order;
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
  values (p_order, auth.uid(), coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff'), 'campaign',
          jsonb_build_object('code', v_code, 'name', c.name));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._campaign_code(text, date) from public, anon, authenticated;
revoke all on function public._campaign_json(public.campaigns) from public, anon, authenticated;
revoke all on function public.campaign_list() from public, anon;
revoke all on function public.campaign_save(jsonb) from public, anon;
revoke all on function public.campaign_remove(uuid) from public, anon;
revoke all on function public.campaigns_active() from public, anon;
revoke all on function public.order_set_campaign(uuid, text) from public, anon;
grant execute on function public.campaign_list() to authenticated;
grant execute on function public.campaign_save(jsonb) to authenticated;
grant execute on function public.campaign_remove(uuid) to authenticated;
grant execute on function public.campaigns_active() to authenticated;
grant execute on function public.order_set_campaign(uuid, text) to authenticated;
