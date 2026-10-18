-- Calendar events: Fiji public holidays and the café's own events, shown on the staff calendar
-- and managed in Settings > Events and public holidays. Safe to run more than once.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  ends_on date,
  name text not null check (length(name) between 2 and 60),
  kind text not null default 'event' check (kind in ('holiday','event')),
  note text check (note is null or length(note) <= 200),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  check (ends_on is null or (ends_on >= day and ends_on - day <= 31)),
  unique (day, name)
);
alter table public.calendar_events add column if not exists updated_at timestamptz not null default now();
alter table public.calendar_events add column if not exists updated_by text;
alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_read on public.calendar_events;
create policy calendar_events_read on public.calendar_events for select using (true);
revoke insert, update, delete on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to anon, authenticated;

-- Private change log: who added, changed or removed which entry, with a copy of it. No app access.
create table if not exists public.calendar_event_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_label text,
  action text not null,
  snapshot jsonb not null
);
alter table public.calendar_event_log enable row level security;
revoke all on public.calendar_event_log from anon, authenticated;

-- Add or change an entry. Settings permission required.
create or replace function public.calendar_event_save(p_id uuid, p_day date, p_ends_on date, p_name text, p_kind text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, '')); v_note text := nullif(btrim(coalesce(p_note, '')), '');
        v_who text := coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff'); v_row public.calendar_events;
begin
  if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change Settings.'); end if;
  if length(v_name) < 2 or length(v_name) > 60 then return jsonb_build_object('ok', false, 'message', 'Give the event a name of 2 to 60 characters.'); end if;
  if p_kind not in ('holiday', 'event') then return jsonb_build_object('ok', false, 'message', 'Choose café event or public holiday.'); end if;
  if p_day is null then return jsonb_build_object('ok', false, 'message', 'Choose the date.'); end if;
  if p_ends_on is not null and p_ends_on < p_day then return jsonb_build_object('ok', false, 'message', 'The end date cannot be before the start date.'); end if;
  if p_ends_on is not null and p_ends_on - p_day > 31 then return jsonb_build_object('ok', false, 'message', 'An event can run for up to 31 days.'); end if;
  if v_note is not null and length(v_note) > 200 then return jsonb_build_object('ok', false, 'message', 'Keep the note under 200 characters.'); end if;
  if exists (select 1 from public.calendar_events where day = p_day and lower(name) = lower(v_name) and id is distinct from p_id) then
    return jsonb_build_object('ok', false, 'message', 'That event is already on the calendar for that date.');
  end if;
  if p_id is null then
    insert into public.calendar_events (day, ends_on, name, kind, note, source, updated_by)
    values (p_day, nullif(p_ends_on, p_day), v_name, p_kind, v_note, 'manual', v_who) returning * into v_row;
    insert into public.calendar_event_log (actor, actor_label, action, snapshot) values (auth.uid(), v_who, 'added', to_jsonb(v_row));
  else
    update public.calendar_events set day = p_day, ends_on = nullif(p_ends_on, p_day), name = v_name, kind = p_kind, note = v_note,
      updated_at = now(), updated_by = v_who where id = p_id returning * into v_row;
    if not found then return jsonb_build_object('ok', false, 'message', 'That entry no longer exists. Refresh Settings.'); end if;
    insert into public.calendar_event_log (actor, actor_label, action, snapshot) values (auth.uid(), v_who, 'changed', to_jsonb(v_row));
  end if;
  return jsonb_build_object('ok', true, 'id', v_row.id);
end $$;

-- Remove an entry. Settings permission required; a copy is kept in the change log.
create or replace function public.calendar_event_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_who text := coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff'); v_row public.calendar_events;
begin
  if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change Settings.'); end if;
  delete from public.calendar_events where id = p_id returning * into v_row;
  if not found then return jsonb_build_object('ok', false, 'message', 'That entry was already removed.'); end if;
  insert into public.calendar_event_log (actor, actor_label, action, snapshot) values (auth.uid(), v_who, 'removed', to_jsonb(v_row));
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.calendar_event_save(uuid, date, date, text, text, text) from public, anon;
revoke execute on function public.calendar_event_delete(uuid) from public, anon;
grant execute on function public.calendar_event_save(uuid, date, date, text, text, text) to authenticated;
grant execute on function public.calendar_event_delete(uuid) to authenticated;

-- 2026 Fiji public holidays as endorsed by Cabinet, plus New Year's Day 2027.
insert into public.calendar_events (day, name, kind, source) values
  ('2026-01-01','New Year''s Day','holiday','Cabinet'),
  ('2026-04-03','Good Friday','holiday','Cabinet'),
  ('2026-04-04','Easter Saturday','holiday','Cabinet'),
  ('2026-04-06','Easter Monday','holiday','Cabinet'),
  ('2026-05-15','Girmit Day','holiday','Cabinet'),
  ('2026-05-29','Ratu Sir Lala Sukuna Day','holiday','Cabinet'),
  ('2026-08-24','Prophet Mohammed''s Birthday','holiday','Cabinet'),
  ('2026-10-10','Fiji Day','holiday','Cabinet'),
  ('2026-11-09','Diwali','holiday','Cabinet'),
  ('2026-12-25','Christmas Day','holiday','Cabinet'),
  ('2026-12-28','Boxing Day','holiday','Cabinet'),
  ('2027-01-01','New Year''s Day','holiday','Fixed date')
on conflict (day, name) do nothing;
