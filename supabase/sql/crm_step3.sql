-- CRM step 3: customer workspace. Notes, enquiries, feedback and follow-ups.
-- Internal only: these tables are never read by emails, the guest page or kitchen briefs.
-- No direct table access; every read and write goes through the checked functions below.

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  order_id uuid references public.orders(id),
  kind text not null check (kind in ('note','enquiry','feedback')),
  feedback_tone text check (feedback_tone in ('positive','neutral','negative')),
  channel text check (channel in ('in_person','phone','whatsapp','email','social','other')),
  body text not null check (length(body) between 2 and 2000),
  created_by uuid not null,
  created_by_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by_label text,
  version int not null default 1,
  hidden_at timestamptz,
  hidden_by_label text,
  hidden_reason text,
  idem uuid unique
);
create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);
create index if not exists customer_notes_order_idx on public.customer_notes (order_id) where order_id is not null;

create table if not exists public.customer_note_versions (
  id bigserial primary key,
  note_id uuid not null references public.customer_notes(id),
  version int not null,
  body text not null,
  replaced_by_label text not null,
  replaced_at timestamptz not null default now(),
  reason text not null
);
create index if not exists customer_note_versions_note_idx on public.customer_note_versions (note_id, version);

create table if not exists public.customer_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  order_id uuid references public.orders(id),
  note_id uuid references public.customer_notes(id),
  title text not null check (length(title) between 3 and 200),
  due_on date not null,
  assigned_to uuid,
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  outcome text check (outcome is null or length(outcome) <= 1000),
  created_by uuid not null,
  created_by_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  done_at timestamptz,
  done_by_label text,
  version int not null default 1,
  idem uuid unique
);
create index if not exists customer_tasks_open_idx on public.customer_tasks (due_on) where status in ('open','in_progress');
create index if not exists customer_tasks_customer_idx on public.customer_tasks (customer_id);
create index if not exists customer_tasks_order_idx on public.customer_tasks (order_id) where order_id is not null;

create table if not exists public.customer_task_events (
  id bigserial primary key,
  task_id uuid not null references public.customer_tasks(id),
  at timestamptz not null default now(),
  by_label text not null,
  change jsonb not null
);
create index if not exists customer_task_events_task_idx on public.customer_task_events (task_id, at);

alter table public.customer_notes enable row level security;
alter table public.customer_note_versions enable row level security;
alter table public.customer_tasks enable row level security;
alter table public.customer_task_events enable row level security;
revoke all on public.customer_notes, public.customer_note_versions, public.customer_tasks, public.customer_task_events from anon, authenticated;
revoke all on sequence public.customer_note_versions_id_seq, public.customer_task_events_id_seq from anon, authenticated;

-- Helpers
create or replace function public._fiji_today() returns date language sql stable as $$
  select (now() at time zone 'Pacific/Fiji')::date
$$;

create or replace function public._me_label() returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(full_name), ''), 'Staff') from public.staff_profiles where user_id = auth.uid()
$$;
revoke all on function public._me_label() from public, anon, authenticated;

-- Refuses card or account numbers and passwords in free text. Returns null when the text is acceptable.
create or replace function public._note_problem(p text) returns text language plpgsql immutable as $$
declare d text; m text;
begin
  for m in select (regexp_matches(coalesce(p, ''), '[0-9][0-9 -]{11,}[0-9]', 'g'))[1] loop
    d := regexp_replace(m, '[^0-9]', '', 'g');
    if length(d) between 13 and 19 then
      return 'Do not record card or bank account numbers. Write "paid by card" instead.';
    end if;
  end loop;
  if p ~* '(password|passcode|pin number|cvv|cvc)\s*[:=]' then
    return 'Do not record passwords or PIN numbers.';
  end if;
  return null;
end $$;

create or replace function public._note_json(n public.customer_notes) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'tone', n.feedback_tone, 'channel', n.channel, 'body', case when n.hidden_at is null then n.body else null end,
    'order_id', n.order_id, 'order_ref', (select reference from public.orders o where o.id = n.order_id),
    'by', n.created_by_label, 'at', n.created_at, 'mine', n.created_by = auth.uid(),
    'edited_at', n.updated_at, 'edited_by', n.updated_by_label, 'version', n.version,
    'hidden', n.hidden_at is not null, 'hidden_by', n.hidden_by_label, 'hidden_reason', n.hidden_reason, 'hidden_at', n.hidden_at)
$$;
revoke all on function public._note_json(public.customer_notes) from public, anon, authenticated;

create or replace function public._task_json(t public.customer_tasks) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', t.id, 'customer_id', t.customer_id, 'title', t.title, 'due_on', t.due_on, 'status', t.status, 'outcome', t.outcome,
    'assigned_to', t.assigned_to, 'assignee', (select full_name from public.staff_profiles s where s.user_id = t.assigned_to),
    'mine', t.assigned_to = auth.uid(), 'by', t.created_by_label, 'at', t.created_at,
    'order_id', t.order_id, 'order_ref', (select reference from public.orders o where o.id = t.order_id),
    'done_at', t.done_at, 'done_by', t.done_by_label, 'version', t.version,
    'overdue', t.status in ('open','in_progress') and t.due_on < public._fiji_today())
$$;
revoke all on function public._task_json(public.customer_tasks) from public, anon, authenticated;

-- Read the workspace for one customer
create or replace function public.customer_workspace(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_mgr boolean := public.has_role('manager');
begin
  if not public.has_role('manager','front_of_house','marketing','finance') then
    return public._err('forbidden', 'Your login cannot see customer notes.');
  end if;
  if not exists (select 1 from public.customers where id = p_customer) then
    return public._err('not_found', 'That customer was not found.');
  end if;
  return jsonb_build_object('ok', true,
    'can_write', public.has_role('manager','front_of_house','marketing'),
    'is_manager', v_mgr,
    'notes', coalesce((select jsonb_agg(public._note_json(n) order by n.created_at desc)
                       from public.customer_notes n where n.customer_id = p_customer and (n.hidden_at is null or v_mgr)), '[]'),
    'tasks', coalesce((select jsonb_agg(public._task_json(t) order by (t.status in ('done','cancelled')), t.due_on, t.created_at)
                       from public.customer_tasks t where t.customer_id = p_customer), '[]'),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', s.user_id, 'name', s.full_name) order by s.full_name)
                       from public.staff_profiles s where s.active and s.role in ('admin','manager','front_of_house','marketing') and nullif(trim(s.full_name), '') is not null), '[]'));
end $$;
revoke all on function public.customer_workspace(uuid) from public, anon;
grant execute on function public.customer_workspace(uuid) to authenticated;

-- Add a note, enquiry or feedback
create or replace function public.customer_note_add(p_customer uuid, p_kind text, p_body text, p_order uuid default null,
  p_tone text default null, p_channel text default null, p_idem uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n public.customer_notes; v_body text := trim(coalesce(p_body, '')); v_bad text;
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot add notes.'); end if;
  if p_idem is not null then
    select * into n from public.customer_notes where idem = p_idem;
    if found then return jsonb_build_object('ok', true, 'note', public._note_json(n), 'repeat', true); end if;
  end if;
  if not exists (select 1 from public.customers where id = p_customer) then return public._err('not_found', 'That customer was not found.'); end if;
  if p_kind not in ('note','enquiry','feedback') then return public._err('kind', 'Choose note, enquiry or feedback.', 'kind'); end if;
  if length(v_body) < 2 then return public._err('body', 'Write the note first.', 'body'); end if;
  if length(v_body) > 2000 then return public._err('body', 'Keep it under 2,000 characters.', 'body'); end if;
  v_bad := public._note_problem(v_body);
  if v_bad is not null then return public._err('body', v_bad, 'body'); end if;
  if p_kind = 'feedback' and p_tone is null then return public._err('tone', 'Choose how the feedback felt: good, mixed or a complaint.', 'tone'); end if;
  if p_kind <> 'feedback' then p_tone := null; end if;
  if p_order is not null and not exists (select 1 from public.orders where id = p_order and customer_id = p_customer) then
    return public._err('order', 'That order belongs to a different customer.', 'order');
  end if;
  insert into public.customer_notes (customer_id, order_id, kind, feedback_tone, channel, body, created_by, created_by_label, idem)
  values (p_customer, p_order, p_kind, p_tone, nullif(p_channel, ''), v_body, auth.uid(), public._me_label(), p_idem)
  returning * into n;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;
revoke all on function public.customer_note_add(uuid, text, text, uuid, text, text, uuid) from public, anon;
grant execute on function public.customer_note_add(uuid, text, text, uuid, text, text, uuid) to authenticated;

-- Edit a note: the author or a manager. The old wording is kept.
create or replace function public.customer_note_edit(p_note uuid, p_version int, p_body text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n public.customer_notes; v_body text := trim(coalesce(p_body, '')); v_bad text;
begin
  select * into n from public.customer_notes where id = p_note for update;
  if not found then return public._err('not_found', 'That note was not found.'); end if;
  if not (public.has_role('manager') or (n.created_by = auth.uid() and public.has_role('front_of_house','marketing'))) then
    return public._err('forbidden', 'Only the person who wrote it or a manager can change a note.');
  end if;
  if n.hidden_at is not null then return public._err('hidden', 'This note was removed from view and cannot be changed.'); end if;
  if n.version <> p_version then
    return public._err('changed', 'Someone changed this note while you were typing. Your text is kept; check the new version first.', null, jsonb_build_object('note', public._note_json(n)));
  end if;
  if v_body = n.body then return public._err('same', 'Nothing has changed.', 'body'); end if;
  if length(v_body) < 2 or length(v_body) > 2000 then return public._err('body', 'Keep the note between 2 and 2,000 characters.', 'body'); end if;
  v_bad := public._note_problem(v_body);
  if v_bad is not null then return public._err('body', v_bad, 'body'); end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then return public._err('reason', 'Say briefly why it is being changed.', 'reason'); end if;
  insert into public.customer_note_versions (note_id, version, body, replaced_by_label, reason)
  values (n.id, n.version, n.body, public._me_label(), trim(p_reason));
  update public.customer_notes set body = v_body, version = version + 1, updated_at = now(), updated_by_label = public._me_label()
  where id = n.id returning * into n;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;
revoke all on function public.customer_note_edit(uuid, int, text, text) from public, anon;
grant execute on function public.customer_note_edit(uuid, int, text, text) to authenticated;

-- Remove a note from view (managers only). The wording is always kept for managers.
create or replace function public.customer_note_hide(p_note uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n public.customer_notes;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can remove a note.'); end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then return public._err('reason', 'Say briefly why it is being removed.', 'reason'); end if;
  update public.customer_notes set hidden_at = now(), hidden_by_label = public._me_label(), hidden_reason = trim(p_reason)
  where id = p_note and hidden_at is null returning * into n;
  if not found then return public._err('not_found', 'That note was not found or is already removed.'); end if;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;
revoke all on function public.customer_note_hide(uuid, text) from public, anon;
grant execute on function public.customer_note_hide(uuid, text) to authenticated;

-- Earlier wording of a note: managers, or the author
create or replace function public.customer_note_history(p_note uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare n public.customer_notes;
begin
  select * into n from public.customer_notes where id = p_note;
  if not found then return public._err('not_found', 'That note was not found.'); end if;
  if not (public.has_role('manager') or n.created_by = auth.uid()) then return public._err('forbidden', 'Only the author or a manager can see earlier wording.'); end if;
  return jsonb_build_object('ok', true, 'current', case when n.hidden_at is null or public.has_role('manager') then n.body end,
    'versions', coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'body', v.body, 'by', v.replaced_by_label, 'at', v.replaced_at, 'reason', v.reason) order by v.version desc)
                          from public.customer_note_versions v where v.note_id = n.id), '[]'));
end $$;
revoke all on function public.customer_note_history(uuid) from public, anon;
grant execute on function public.customer_note_history(uuid) to authenticated;

-- Add a follow-up
create or replace function public.customer_task_add(p_customer uuid, p_title text, p_due date, p_assignee uuid default null,
  p_order uuid default null, p_note uuid default null, p_idem uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.customer_tasks; v_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g'); v_bad text;
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot add follow-ups.'); end if;
  if p_idem is not null then
    select * into t from public.customer_tasks where idem = p_idem;
    if found then return jsonb_build_object('ok', true, 'task', public._task_json(t), 'repeat', true); end if;
  end if;
  if not exists (select 1 from public.customers where id = p_customer) then return public._err('not_found', 'That customer was not found.'); end if;
  if length(v_title) < 3 then return public._err('title', 'Say what needs doing, for example "Call back about the wedding cake quote".', 'title'); end if;
  if length(v_title) > 200 then return public._err('title', 'Keep it under 200 characters. Put detail in a note.', 'title'); end if;
  v_bad := public._note_problem(v_title);
  if v_bad is not null then return public._err('title', v_bad, 'title'); end if;
  if p_due is null then return public._err('due', 'Choose when it is due.', 'due'); end if;
  if p_due < public._fiji_today() then return public._err('due', 'The due date is in the past.', 'due'); end if;
  if p_due > public._fiji_today() + 400 then return public._err('due', 'Choose a date within about a year.', 'due'); end if;
  if p_assignee is not null and not exists (select 1 from public.staff_profiles where user_id = p_assignee and active and role in ('admin','manager','front_of_house','marketing')) then
    return public._err('assignee', 'That person cannot take follow-ups.', 'assignee');
  end if;
  if p_order is not null and not exists (select 1 from public.orders where id = p_order and customer_id = p_customer) then
    return public._err('order', 'That order belongs to a different customer.', 'order');
  end if;
  if p_note is not null and not exists (select 1 from public.customer_notes where id = p_note and customer_id = p_customer) then
    return public._err('note', 'That note belongs to a different customer.', 'note');
  end if;
  insert into public.customer_tasks (customer_id, order_id, note_id, title, due_on, assigned_to, created_by, created_by_label, idem)
  values (p_customer, p_order, p_note, v_title, p_due, p_assignee, auth.uid(), public._me_label(), p_idem) returning * into t;
  insert into public.customer_task_events (task_id, by_label, change)
  values (t.id, public._me_label(), jsonb_build_object('created', true, 'due_on', t.due_on, 'assigned_to', t.assigned_to));
  return jsonb_build_object('ok', true, 'task', public._task_json(t));
end $$;
revoke all on function public.customer_task_add(uuid, text, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.customer_task_add(uuid, text, date, uuid, uuid, uuid, uuid) to authenticated;

-- Change a follow-up: start, done, reopen, cancel, or move the date or person.
create or replace function public.customer_task_update(p_task uuid, p_version int, p_action text,
  p_due date default null, p_assignee uuid default null, p_outcome text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.customer_tasks; v_change jsonb := '{}'; v_out text := nullif(trim(coalesce(p_outcome, '')), ''); v_bad text;
begin
  select * into t from public.customer_tasks where id = p_task for update;
  if not found then return public._err('not_found', 'That follow-up was not found.'); end if;
  if not (public.has_role('manager') or (public.has_role('front_of_house','marketing')
          and (t.assigned_to = auth.uid() or t.created_by = auth.uid() or t.assigned_to is null))) then
    return public._err('forbidden', 'Only the person it is for, the person who set it, or a manager can change it.');
  end if;
  if t.version <> p_version then
    return public._err('changed', 'Someone else updated this follow-up. Check it again.', null, jsonb_build_object('task', public._task_json(t)));
  end if;
  if v_out is not null then
    v_bad := public._note_problem(v_out);
    if v_bad is not null then return public._err('outcome', v_bad, 'outcome'); end if;
    if length(v_out) > 1000 then return public._err('outcome', 'Keep the outcome under 1,000 characters.', 'outcome'); end if;
  end if;
  if p_action = 'start' then
    if t.status <> 'open' then return public._err('state', 'Only an open follow-up can be started.'); end if;
    t.status := 'in_progress';
  elsif p_action = 'done' then
    if t.status not in ('open','in_progress') then return public._err('state', 'This follow-up is already closed.'); end if;
    if v_out is null or length(v_out) < 3 then return public._err('outcome', 'Say what happened, for example "Called, customer will order next week".', 'outcome'); end if;
    t.status := 'done'; t.done_at := now(); t.done_by_label := public._me_label(); t.outcome := v_out;
  elsif p_action = 'cancel' then
    if t.status not in ('open','in_progress') then return public._err('state', 'This follow-up is already closed.'); end if;
    if v_out is null or length(v_out) < 3 then return public._err('outcome', 'Say why it is no longer needed.', 'outcome'); end if;
    t.status := 'cancelled'; t.done_at := now(); t.done_by_label := public._me_label(); t.outcome := v_out;
  elsif p_action = 'reopen' then
    if t.status not in ('done','cancelled') then return public._err('state', 'This follow-up is still open.'); end if;
    t.status := 'open'; t.done_at := null; t.done_by_label := null;
    if t.due_on < public._fiji_today() then t.due_on := public._fiji_today(); end if;
  elsif p_action = 'edit' then
    if t.status not in ('open','in_progress') then return public._err('state', 'Reopen it before changing the date or person.'); end if;
    if p_due is null then return public._err('due', 'Choose when it is due.', 'due'); end if;
    if p_due < public._fiji_today() then return public._err('due', 'The due date is in the past.', 'due'); end if;
    if p_assignee is not null and not exists (select 1 from public.staff_profiles where user_id = p_assignee and active and role in ('admin','manager','front_of_house','marketing')) then
      return public._err('assignee', 'That person cannot take follow-ups.', 'assignee');
    end if;
    if p_due = t.due_on and p_assignee is not distinct from t.assigned_to then return public._err('same', 'Nothing has changed.'); end if;
    v_change := jsonb_build_object('due_on', jsonb_build_object('from', t.due_on, 'to', p_due),
                                   'assigned_to', jsonb_build_object('from', t.assigned_to, 'to', p_assignee));
    t.due_on := p_due; t.assigned_to := p_assignee;
  else
    return public._err('action', 'Unknown change.');
  end if;
  update public.customer_tasks set status = t.status, due_on = t.due_on, assigned_to = t.assigned_to, outcome = t.outcome,
    done_at = t.done_at, done_by_label = t.done_by_label, version = version + 1, updated_at = now()
  where id = t.id returning * into t;
  insert into public.customer_task_events (task_id, by_label, change)
  values (t.id, public._me_label(), jsonb_build_object('action', p_action, 'outcome', v_out) || v_change);
  return jsonb_build_object('ok', true, 'task', public._task_json(t));
end $$;
revoke all on function public.customer_task_update(uuid, int, text, date, uuid, text) from public, anon;
grant execute on function public.customer_task_update(uuid, int, text, date, uuid, text) to authenticated;

-- Follow-ups for the Today page: mine plus unassigned (managers can ask for everyone's), overdue and due within p_days.
create or replace function public.my_followups(p_days int default 7, p_all boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_all boolean := coalesce(p_all, false) and public.has_role('manager');
begin
  if not public.has_role('manager','front_of_house','marketing') then
    return jsonb_build_object('ok', true, 'tasks', '[]'::jsonb, 'allowed', false);
  end if;
  return jsonb_build_object('ok', true, 'allowed', true, 'today', public._fiji_today(), 'all', v_all,
    'tasks', coalesce((select jsonb_agg(public._task_json(t) || jsonb_build_object('customer', c.full_name, 'customer_no', c.customer_no)
                                        order by t.due_on, t.created_at)
                       from public.customer_tasks t join public.customers c on c.id = t.customer_id
                       where t.status in ('open','in_progress')
                         and t.due_on <= public._fiji_today() + greatest(0, least(coalesce(p_days, 7), 60))
                         and (v_all or t.assigned_to = auth.uid() or t.assigned_to is null)), '[]'));
end $$;
revoke all on function public.my_followups(int, boolean) from public, anon;
grant execute on function public.my_followups(int, boolean) to authenticated;

-- Open follow-ups and notes linked to one order, for the order screen
create or replace function public.order_followups(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager','front_of_house','marketing','finance') then
    return jsonb_build_object('ok', true, 'tasks', '[]'::jsonb, 'notes', 0);
  end if;
  return jsonb_build_object('ok', true,
    'tasks', coalesce((select jsonb_agg(public._task_json(t) order by t.due_on) from public.customer_tasks t
                       where t.order_id = p_order and t.status in ('open','in_progress')), '[]'),
    'notes', (select count(*) from public.customer_notes n where n.order_id = p_order and n.hidden_at is null));
end $$;
revoke all on function public.order_followups(uuid) from public, anon;
grant execute on function public.order_followups(uuid) to authenticated;
