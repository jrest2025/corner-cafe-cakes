-- STATUS: prepared and dry-run tested 17 Oct 2026; applied at publish time.
-- Customer feedback and complaint follow-up (approved by Roneel, 17 Oct 2026). STATUS: prepared and dry-run tested, NOT applied yet.
-- Feedback is a customer note of kind 'feedback' (Happy / Mixed / Complaint), saved against the order and its customer.
-- A complaint (tone 'negative') is Open until someone with the Change order permission (ord.edit) marks it Resolved,
-- recording what was done (apology, remake, refund, voucher, other), any amount, and a note. Refunds here are a record only:
-- nothing is written to payments. Open complaints show in Needs attention and Today until resolved.
-- Additive only: new columns, one new audit table, new functions, create-or-replace of three existing functions, two triggers.

-- 1. Columns on customer_notes (only used for complaints)
alter table public.customer_notes add column if not exists status text;               -- 'open' | 'resolved' (complaints only)
alter table public.customer_notes add column if not exists owner_id uuid;
alter table public.customer_notes add column if not exists owner_label text;
alter table public.customer_notes add column if not exists actions text[];
alter table public.customer_notes add column if not exists amount numeric(10,2);
alter table public.customer_notes add column if not exists resolution text;
alter table public.customer_notes add column if not exists resolved_at timestamptz;
alter table public.customer_notes add column if not exists resolved_by uuid;
alter table public.customer_notes add column if not exists resolved_by_label text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'customer_notes_status_check') then
    alter table public.customer_notes add constraint customer_notes_status_check check (status is null or status in ('open', 'resolved'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customer_notes_actions_check') then
    alter table public.customer_notes add constraint customer_notes_actions_check check (actions is null or actions <@ array['apologised','remade','refund','voucher','other']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customer_notes_amount_check') then
    alter table public.customer_notes add constraint customer_notes_amount_check check (amount is null or (amount >= 0 and amount <= 10000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customer_notes_resolution_len') then
    alter table public.customer_notes add constraint customer_notes_resolution_len check (resolution is null or length(resolution) <= 1000);
  end if;
end $$;
create index if not exists customer_notes_open_complaints on public.customer_notes (created_at) where status = 'open' and hidden_at is null;
create index if not exists customer_notes_order on public.customer_notes (order_id) where order_id is not null;

-- 2. Audit of every complaint step (logged, owner changed, resolved, reopened). Read only through the functions below.
create table if not exists public.customer_note_events (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.customer_notes(id),
  at timestamptz not null default now(),
  actor_id uuid,
  actor_label text,
  kind text not null check (kind in ('complaint_logged','owner_changed','resolved','reopened')),
  detail jsonb not null default '{}'::jsonb
);
alter table public.customer_note_events enable row level security;
create index if not exists customer_note_events_note on public.customer_note_events (note_id, at);

-- 3. A complaint opens itself, owned by the person who logged it (both the order and the customer-profile paths)
create or replace function public._fb_defaults() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.kind = 'feedback' and new.feedback_tone = 'negative' and new.status is null then
    new.status := 'open';
    new.owner_id := coalesce(new.owner_id, new.created_by);
    new.owner_label := coalesce(new.owner_label, new.created_by_label);
  end if;
  return new;
end $$;
create or replace trigger customer_notes_fb_defaults before insert on public.customer_notes for each row execute function public._fb_defaults();

create or replace function public._fb_logged() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'open' then
    insert into public.customer_note_events (note_id, actor_id, actor_label, kind, detail)
    values (new.id, new.created_by, new.created_by_label, 'complaint_logged', jsonb_build_object('channel', new.channel));
    if new.order_id is not null then
      perform public._log(new.order_id, new.created_by, new.created_by_label, 'complaint_logged', jsonb_build_object('note_id', new.id));
    end if;
  end if;
  return new;
end $$;
create or replace trigger customer_notes_fb_logged after insert on public.customer_notes for each row execute function public._fb_logged();

-- 4. The note as the app sees it: the existing fields plus the complaint follow-up
create or replace function public._note_json(n customer_notes) returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'tone', n.feedback_tone, 'channel', n.channel, 'body', case when n.hidden_at is null then n.body else null end,
    'order_id', n.order_id, 'order_ref', (select reference from public.orders o where o.id = n.order_id),
    'by', n.created_by_label, 'at', n.created_at, 'mine', n.created_by = auth.uid(),
    'edited_at', n.updated_at, 'edited_by', n.updated_by_label, 'version', n.version,
    'hidden', n.hidden_at is not null, 'hidden_by', n.hidden_by_label, 'hidden_reason', n.hidden_reason, 'hidden_at', n.hidden_at,
    'customer_id', n.customer_id, 'status', n.status, 'owner_id', n.owner_id, 'owner', n.owner_label, 'owner_mine', n.owner_id = auth.uid(),
    'actions', to_jsonb(n.actions), 'amount', n.amount, 'resolution', n.resolution,
    'resolved_at', n.resolved_at, 'resolved_by', n.resolved_by_label)
$function$;

-- Staff who can own a complaint (active, with the order permission)
create or replace function public._fb_staff() returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.user_id, 'name', s.full_name) order by s.full_name), '[]')
  from public.staff_profiles s
  where (public.has_perm('ord.view') or public.has_perm('cust.view')) and s.active and s.removed_at is null and nullif(trim(s.full_name), '') is not null and public._perm_of(s.user_id, 'ord.edit')
$$;

-- 5. Log feedback from an order (the customer comes from the order) or from a customer profile
create or replace function public.feedback_add(p_order uuid, p_tone text, p_body text, p_channel text default null, p_idem uuid default null, p_customer uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes; v_body text := trim(coalesce(p_body, '')); v_bad text; v_cust uuid;
begin
  if not (public.has_perm('ord.view') or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot record customer feedback.'); end if;
  if p_idem is not null then
    select * into n from public.customer_notes where idem = p_idem;
    if found then return jsonb_build_object('ok', true, 'note', public._note_json(n), 'repeat', true); end if;
  end if;
  if p_order is not null then
    select customer_id into v_cust from public.orders where id = p_order and deleted_at is null;
    if not found then return public._err('order', 'That order was not found.', 'order'); end if;
    if v_cust is null then return public._err('order', 'That order has no customer to record feedback against.', 'order'); end if;
    if p_customer is not null and p_customer <> v_cust then return public._err('order', 'That order belongs to a different customer.', 'order'); end if;
  else
    v_cust := p_customer;
    if v_cust is null or not exists (select 1 from public.customers where id = v_cust) then return public._err('not_found', 'That customer was not found.'); end if;
  end if;
  if p_tone is null or p_tone not in ('positive', 'neutral', 'negative') then return public._err('tone', 'Choose Happy, Mixed or Complaint.', 'tone'); end if;
  if length(v_body) < 2 then return public._err('body', 'Write what the customer said.', 'body'); end if;
  if length(v_body) > 2000 then return public._err('body', 'Keep it under 2,000 characters.', 'body'); end if;
  v_bad := public._note_problem(v_body);
  if v_bad is not null then return public._err('body', v_bad, 'body'); end if;
  if nullif(p_channel, '') is not null and p_channel not in ('in_person','phone','whatsapp','email','social','other') then return public._err('channel', 'Choose how they told us.', 'channel'); end if;
  insert into public.customer_notes (customer_id, order_id, kind, feedback_tone, channel, body, created_by, created_by_label, idem)
  values (v_cust, p_order, 'feedback', p_tone, nullif(p_channel, ''), v_body, auth.uid(), public._me_label(), p_idem)
  returning * into n;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 6. Feedback on one order (newest first)
create or replace function public.feedback_list(p_order uuid) returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not (public.has_perm('ord.view') or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot see customer feedback.'); end if;
  return jsonb_build_object('ok', true, 'can_resolve', public.has_perm('ord.edit'), 'staff', public._fb_staff(),
    'notes', coalesce((select jsonb_agg(public._note_json(n) order by (n.status = 'open') desc nulls last, n.created_at desc)
                       from public.customer_notes n where n.order_id = p_order and n.kind = 'feedback' and n.hidden_at is null), '[]'));
end $$;

-- 7. Every open complaint, oldest first (for Needs attention and Today)
create or replace function public.feedback_open() returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not (public.has_perm('ord.view') or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot see customer feedback.'); end if;
  return jsonb_build_object('ok', true, 'can_resolve', public.has_perm('ord.edit'),
    'complaints', coalesce((select jsonb_agg(public._note_json(n) || jsonb_build_object(
        'customer_name', coalesce(nullif(o.contact_name, ''), c.full_name),
        'required_date', o.required_date, 'required_time', o.required_time) order by n.created_at)
      from public.customer_notes n
      join public.customers c on c.id = n.customer_id
      left join public.orders o on o.id = n.order_id
      where n.kind = 'feedback' and n.status = 'open' and n.hidden_at is null), '[]'));
end $$;

-- 8. Mark a complaint resolved: what was done is required
create or replace function public.feedback_resolve(p_note uuid, p_version integer, p_actions text[], p_amount numeric, p_resolution text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes; v_txt text := trim(coalesce(p_resolution, '')); v_acts text[];
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot close complaints. Ask a manager or a team member who can change orders.'); end if;
  select * into n from public.customer_notes where id = p_note for update;
  if not found or n.hidden_at is not null then return public._err('not_found', 'That complaint was not found.'); end if;
  if n.status is distinct from 'open' then return public._err('closed', 'This complaint is already resolved.'); end if;
  if p_version is not null and n.version <> p_version then
    return public._err('changed', 'Someone changed this complaint while you were working on it. Check it again.', null, jsonb_build_object('note', public._note_json(n)));
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into v_acts from unnest(coalesce(p_actions, '{}')) a where a is not null and a <> '';
  if cardinality(v_acts) = 0 then return public._err('actions', 'Choose what we did for the customer.', 'actions'); end if;
  if not v_acts <@ array['apologised','remade','refund','voucher','other'] then return public._err('actions', 'Unknown action.', 'actions'); end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 10000) then return public._err('amount', 'Enter an amount between 0 and 10,000.', 'amount'); end if;
  if length(v_txt) < 3 then return public._err('resolution', 'Write a short note on how it was resolved.', 'resolution'); end if;
  if length(v_txt) > 1000 then return public._err('resolution', 'Keep the note under 1,000 characters.', 'resolution'); end if;
  if public._note_problem(v_txt) is not null then return public._err('resolution', public._note_problem(v_txt), 'resolution'); end if;
  update public.customer_notes set status = 'resolved', actions = v_acts, amount = round(p_amount, 2), resolution = v_txt,
    resolved_at = now(), resolved_by = auth.uid(), resolved_by_label = public._me_label(), version = version + 1, updated_at = now(), updated_by_label = public._me_label()
  where id = n.id returning * into n;
  insert into public.customer_note_events (note_id, actor_id, actor_label, kind, detail)
  values (n.id, auth.uid(), public._me_label(), 'resolved', jsonb_build_object('actions', v_acts, 'amount', n.amount, 'resolution', v_txt));
  if n.order_id is not null then perform public._log(n.order_id, auth.uid(), public._me_label(), 'complaint_resolved', jsonb_build_object('note_id', n.id, 'actions', v_acts, 'amount', n.amount)); end if;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 9. Reopen a complaint closed by mistake (the earlier resolution stays in the audit)
create or replace function public.feedback_reopen(p_note uuid, p_reason text) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes;
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot reopen complaints.'); end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then return public._err('reason', 'Say briefly why it is being reopened.', 'reason'); end if;
  update public.customer_notes set status = 'open', version = version + 1, updated_at = now(), updated_by_label = public._me_label()
  where id = p_note and status = 'resolved' and hidden_at is null returning * into n;
  if not found then return public._err('not_found', 'That complaint was not found or is already open.'); end if;
  insert into public.customer_note_events (note_id, actor_id, actor_label, kind, detail)
  values (n.id, auth.uid(), public._me_label(), 'reopened', jsonb_build_object('reason', trim(p_reason), 'was', jsonb_build_object('actions', n.actions, 'amount', n.amount, 'resolution', n.resolution)));
  if n.order_id is not null then perform public._log(n.order_id, auth.uid(), public._me_label(), 'complaint_reopened', jsonb_build_object('note_id', n.id, 'reason', trim(p_reason))); end if;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 10. Change who looks after a complaint (anyone who can close complaints, or the current owner)
create or replace function public.feedback_set_owner(p_note uuid, p_owner uuid) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes; v_name text;
begin
  select * into n from public.customer_notes where id = p_note for update;
  if not found or n.hidden_at is not null or n.status is distinct from 'open' then return public._err('not_found', 'That open complaint was not found.'); end if;
  if not (public.has_perm('ord.edit') or n.owner_id = auth.uid()) then return public._err('forbidden', 'Only the owner or someone who can change orders can hand this on.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = p_owner and active and removed_at is null and public._perm_of(user_id, 'ord.edit');
  if v_name is null then return public._err('owner', 'Choose a team member who can change orders.', 'owner'); end if;
  update public.customer_notes set owner_id = p_owner, owner_label = v_name, version = version + 1, updated_at = now(), updated_by_label = public._me_label()
  where id = n.id returning * into n;
  insert into public.customer_note_events (note_id, actor_id, actor_label, kind, detail)
  values (n.id, auth.uid(), public._me_label(), 'owner_changed', jsonb_build_object('owner', v_name));
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 11. The customer profile also needs to know who may close complaints and who can own them
do $$ declare d text; begin
  d := pg_get_functiondef('public.customer_workspace(uuid)'::regprocedure);
  if position('can_resolve' in d) > 0 then return; end if;
  d := replace(d, $q$    'is_manager', v_mgr,$q$, $q$    'is_manager', v_mgr,
    'can_resolve', public.has_perm('ord.edit'),
    'fb_staff', public._fb_staff(),$q$);
  if position('can_resolve' in d) = 0 then raise exception 'customer_workspace patch did not apply'; end if;
  execute d;
end $$;

-- No REVOKE/GRANT here: new functions get the project's default execute rights, and every function above checks
-- the caller's permission itself (has_perm), so a visitor without a staff login only gets "forbidden" or an empty list.
