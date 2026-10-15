-- Corner Café cake CRM, first release: Customer Overview and Follow-ups.
-- Adds one new table (customer_contacts) and three functions. Nothing existing is changed or removed.
-- No messages are sent to customers by anything in this file. Staff make every contact and record it.
-- Safe to run more than once.
-- Rollback: drop function public.crm_home(boolean); drop function public.crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid);
--           drop function public._crm_card(uuid); drop table public.customer_contacts;

-- 1. Every contact staff record: who, how, what happened, and whether the customer was actually reached.
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  kind text not null check (kind in ('task','quote','occasion','last_year','lapsed','other')),
  reason text,
  order_id uuid references public.orders(id),
  task_id uuid references public.customer_tasks(id),
  note_id uuid references public.customer_notes(id),
  next_task_id uuid references public.customer_tasks(id),
  channel text not null check (channel in ('phone','whatsapp','email','in_person')),
  outcome text not null check (outcome in ('interested','quote','later','ordered','not_interested','no_answer','left_message')),
  reached boolean not null,
  staff_id uuid,
  staff_label text,
  at timestamptz not null default now(),
  idem uuid unique
);
create index if not exists customer_contacts_customer_at on public.customer_contacts (customer_id, at desc);
create index if not exists customer_contacts_at on public.customer_contacts (at desc);
alter table public.customer_contacts enable row level security;
revoke all on public.customer_contacts from anon, authenticated;

-- 2. One customer as a card: contact details, permission, last cake
create or replace function public._crm_card(p_customer uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.full_name, 'no', s.customer_no, 'phone', s.phone, 'email', s.email, 'pref', s.preferred_contact,
    'wa', s.consent_whatsapp, 'sms', s.consent_sms, 'em', s.consent_email, 'call', s.consent_call,
    'orders', s.completed_count, 'spend', s.completed_spend, 'upcoming', s.upcoming_count,
    'cake', l.cake, 'last_value', l.v, 'last_date', l.d, 'last_order', l.id, 'corporate', s.is_corporate)
  from public.customer_summary s
  left join lateral (
    select o.id, o.required_date d, coalesce(o.final_total, o.estimate_total) v,
           (select coalesce(i.variant, i.product_name) from public.order_items i where i.order_id = o.id order by i.created_at limit 1) cake
    from public.orders o where o.customer_id = s.id and o.order_status = 'completed' and o.deleted_at is null and not o.is_test
    order by o.required_date desc limit 1) l on true
  where s.id = p_customer
$$;

-- 3. The Customers home: figures for managers, who to contact and why, and recent activity
create or replace function public.crm_home(p_all boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_t date := public._fiji_today();
  v_m0 date := date_trunc('month', public._fiji_today())::date;
  v_pm0 date := (date_trunc('month', public._fiji_today()) - interval '1 month')::date;
  v_pmt date;
  v_mgr boolean := public.has_role('manager');
  v_all boolean := coalesce(p_all, false) and public.has_role('manager');
  v_me uuid := auth.uid();
  v_kpi jsonb := null;
  v_tasks jsonb; v_quotes jsonb; v_occ jsonb; v_ly jsonb; v_lapsed jsonb; v_recent jsonb;
  v_occ_noperm int; v_ly_noperm int;
begin
  if not public.has_role('manager','front_of_house','marketing') then
    return public._err('forbidden', 'Your login cannot see customer follow-ups.');
  end if;
  v_pmt := least(v_pm0 + (v_t - v_m0), v_m0 - 1);

  -- Figures (managers and marketing only)
  if public.has_role('manager','marketing') then
    with o as (
      select o.customer_id c, o.order_status st, o.required_date d, coalesce(o.final_total, o.estimate_total, 0) v
      from public.orders o join public.customers cu on cu.id = o.customer_id and cu.merged_into is null and cu.archived_at is null
      where o.deleted_at is null and not o.is_test),
    f as (
      select c, min(d) filter (where st not in ('cancelled','declined')) first_d,
             min(d) filter (where st = 'completed') first_done, count(*) filter (where st = 'completed') done_n
      from o group by c)
    select jsonb_build_object(
      'month_from', v_m0, 'prev_from', v_pm0, 'prev_to', v_pmt,
      'customers', (select count(*) from f where first_d is not null),
      'new_month', (select count(*) from f where first_d between v_m0 and v_t),
      'new_prev', (select count(*) from f where first_d between v_pm0 and v_pmt),
      'returning_month', (select count(distinct o.c) from o join f using (c) where o.st = 'completed' and o.d between v_m0 and v_t and f.first_done < v_m0),
      'returning_prev', (select count(distinct o.c) from o join f using (c) where o.st = 'completed' and o.d between v_pm0 and v_pmt and f.first_done < v_pm0),
      'returning_rev_month', (select coalesce(sum(o.v), 0) from o join f using (c) where o.st = 'completed' and o.d between v_m0 and v_t and f.first_done < o.d),
      'returning_rev_prev', (select coalesce(sum(o.v), 0) from o join f using (c) where o.st = 'completed' and o.d between v_pm0 and v_pmt and f.first_done < o.d),
      'repeat_customers', (select count(*) from f where done_n >= 2),
      'buyers', (select count(*) from f where done_n >= 1),
      'fu_due_today', (select count(*) from public.customer_tasks where status in ('open','in_progress') and due_on = v_t),
      'fu_overdue', (select count(*) from public.customer_tasks where status in ('open','in_progress') and due_on < v_t),
      'fu_done_month', (select count(*) from public.customer_tasks where status = 'done' and (done_at at time zone 'Pacific/Fiji')::date >= v_m0),
      'contacts_month', (select count(*) from public.customer_contacts where (at at time zone 'Pacific/Fiji')::date >= v_m0),
      'reached_month', (select count(*) from public.customer_contacts where reached and (at at time zone 'Pacific/Fiji')::date >= v_m0),
      'ordered_month', (select count(*) from public.customer_contacts where outcome = 'ordered' and (at at time zone 'Pacific/Fiji')::date >= v_m0))
    into v_kpi;
  end if;

  -- Follow-ups already set (overdue, today, next 7 days): mine and unassigned, or everyone's for a manager who asks
  select coalesce(jsonb_agg(public._crm_card(t.customer_id) || jsonb_build_object(
           'kind', 'task', 'reason', t.title, 'task', public._task_json(t),
           'order_id', t.order_id, 'order_ref', (select reference from public.orders where id = t.order_id),
           'pri', case when t.due_on < v_t then 'high' else 'normal' end,
           'why', case when t.due_on < v_t then 'Follow-up is overdue, was due ' || to_char(t.due_on, 'FMDay FMDD FMMonth')
                       when t.due_on = v_t then 'Follow-up due today' else 'Follow-up due ' || to_char(t.due_on, 'FMDay FMDD FMMonth') end)
         order by t.due_on, t.created_at), '[]')
  into v_tasks
  from public.customer_tasks t join public.customers c on c.id = t.customer_id and c.merged_into is null
  where t.status in ('open','in_progress') and t.due_on <= v_t + 7
    and (v_all or t.assigned_to = v_me or t.assigned_to is null);

  -- Quotes sent and waiting for the customer's reply (service contact, no marketing permission needed)
  select coalesce(jsonb_agg(public._crm_card(o.customer_id) || jsonb_build_object(
           'kind', 'quote', 'order_id', o.id, 'order_ref', o.reference,
           'reason', 'Quote ' || o.reference || ' for ' || to_char(o.required_date, 'FMDay FMDD FMMonth') || ' is waiting for their reply',
           'quote_value', coalesce(o.final_total, o.estimate_total),
           'pri', case when v_t - (o.updated_at at time zone 'Pacific/Fiji')::date >= 2 or o.required_date <= v_t + 7 then 'high' else 'normal' end,
           'why', case when v_t - (o.updated_at at time zone 'Pacific/Fiji')::date >= 2
                       then 'Quote sent ' || (v_t - (o.updated_at at time zone 'Pacific/Fiji')::date) || ' days ago, no reply yet'
                       else 'Quote sent recently' end)
         order by o.required_date), '[]')
  into v_quotes
  from public.orders o
  where o.order_status = 'awaiting_approval' and o.deleted_at is null and not o.is_test and o.required_date >= v_t
    and o.customer_id is not null
    and not exists (select 1 from public.customer_tasks k where k.order_id = o.id and k.status in ('open','in_progress'))
    and not exists (select 1 from public.customer_contacts k where k.order_id = o.id and k.at > now() - interval '2 days');

  -- Sales follow-ups only for customers who agreed to hear from us, and not if someone is already on it
  with busy as (
    select customer_id c from public.customer_tasks where status in ('open','in_progress')
    union select customer_id from public.customer_contacts where at > now() - interval '21 days'
    union select customer_id from public.customer_reminders where sent_at > now() - interval '30 days'),
  base as (
    select s.* , (s.consent_whatsapp or s.consent_sms or s.consent_email or s.consent_call) perm
    from public.customer_summary s
    where s.archived_at is null and s.upcoming_count = 0 and s.id not in (select c from busy)),
  occ as (
    select b.* from base b where b.next_occasion_date between v_t and v_t + 30),
  ly as (
    select b.*, x.d ly_date, x.cake ly_cake from base b
    join lateral (
      select o.required_date d, (select coalesce(i.variant, i.product_name) from public.order_items i where i.order_id = o.id order by i.created_at limit 1) cake
      from public.orders o where o.customer_id = b.id and o.order_status = 'completed' and o.deleted_at is null and not o.is_test
        and o.required_date between v_t - 365 and v_t - 335 order by o.required_date limit 1) x on true
    where b.last_completed_for < v_t - 60 and b.id not in (select id from occ))
  select
    (select coalesce(jsonb_agg(public._crm_card(occ.id) || jsonb_build_object('kind', 'occasion',
       'reason', coalesce(occ.retarget_reason, 'Celebration') || ' on ' || to_char(occ.next_occasion_date, 'FMDay FMDD FMMonth'),
       'occasion_date', occ.next_occasion_date,
       'pri', case when occ.next_occasion_date <= v_t + 14 then 'high' else 'normal' end,
       'why', case when occ.next_occasion_date <= v_t + 14 then 'Occasion in ' || (occ.next_occasion_date - v_t) || ' days, no cake ordered yet'
                   else 'Occasion in ' || (occ.next_occasion_date - v_t) || ' days' end) order by occ.next_occasion_date), '[]') from occ where occ.perm),
    (select count(*) from occ where not occ.perm),
    (select coalesce(jsonb_agg(public._crm_card(ly.id) || jsonb_build_object('kind', 'last_year',
       'reason', 'Ordered ' || coalesce(ly.ly_cake, 'a cake') || ' for ' || to_char(ly.ly_date, 'FMDD FMMonth YYYY'),
       'pri', 'normal', 'why', 'Ordered around this time last year, nothing booked yet') order by ly.ly_date), '[]') from ly where ly.perm),
    (select count(*) from ly where not ly.perm)
  into v_occ, v_occ_noperm, v_ly, v_ly_noperm;

  -- Regular customers who have gone quiet (3 or more cakes, none in the last 4 months)
  with busy as (
    select customer_id c from public.customer_tasks where status in ('open','in_progress')
    union select customer_id from public.customer_contacts where at > now() - interval '21 days'
    union select customer_id from public.customer_reminders where sent_at > now() - interval '30 days')
  select coalesce(jsonb_agg(public._crm_card(s.id) || jsonb_build_object('kind', 'lapsed',
           'reason', 'Regular customer, ' || s.completed_count || ' cakes, last one ' || to_char(s.last_completed_for, 'FMDD FMMonth YYYY'),
           'pri', 'low', 'why', 'Usually orders, nothing for ' || ((v_t - s.last_completed_for) / 30) || ' months')
         order by s.completed_spend desc), '[]')
  into v_lapsed
  from public.customer_summary s
  where s.archived_at is null and s.upcoming_count = 0 and s.completed_count >= 3 and s.last_completed_for < v_t - 120
    and (s.consent_whatsapp or s.consent_sms or s.consent_email or s.consent_call)
    and (s.next_occasion_date is null or s.next_occasion_date not between v_t and v_t + 30)
    and s.id not in (select c from busy);

  -- Recent activity across customers
  select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into v_recent from (
    select e from (
      select jsonb_build_object('at', k.at, 'kind', 'contact', 'customer_id', k.customer_id, 'name', c.full_name, 'by', k.staff_label,
        'text', initcap(replace(k.channel, '_', ' ')) || ': ' || case k.outcome when 'interested' then 'interested' when 'quote' then 'wants a quote' when 'later' then 'will order later'
          when 'ordered' then 'has already ordered' when 'not_interested' then 'not interested' when 'no_answer' then 'no answer' else 'left a message' end) e, k.at
      from public.customer_contacts k join public.customers c on c.id = k.customer_id
      union all
      select jsonb_build_object('at', t.done_at, 'kind', 'task_done', 'customer_id', t.customer_id, 'name', c.full_name, 'by', t.done_by_label, 'text', 'Follow-up done: ' || t.title), t.done_at
      from public.customer_tasks t join public.customers c on c.id = t.customer_id where t.status = 'done'
        and not exists (select 1 from public.customer_contacts k where k.task_id = t.id and abs(extract(epoch from k.at - t.done_at)) < 60)
      union all
      select jsonb_build_object('at', n.created_at, 'kind', 'note', 'customer_id', n.customer_id, 'name', c.full_name, 'by', n.created_by_label,
        'text', initcap(n.kind) || ' added'), n.created_at
      from public.customer_notes n join public.customers c on c.id = n.customer_id
      where n.hidden_at is null and not exists (select 1 from public.customer_contacts k where k.note_id = n.id)
      union all
      select jsonb_build_object('at', r.sent_at, 'kind', 'reminder', 'customer_id', r.customer_id, 'name', c.full_name, 'by', r.sent_by_label, 'text', 'Occasion reminder sent by ' || r.channel), r.sent_at
      from public.customer_reminders r join public.customers c on c.id = r.customer_id
      union all
      select jsonb_build_object('at', o.created_at, 'kind', 'order', 'customer_id', o.customer_id, 'name', c.full_name, 'order_id', o.id,
        'text', 'New order ' || o.reference || case when (select count(*) from public.orders z where z.customer_id = o.customer_id and z.deleted_at is null and not z.is_test and z.order_status not in ('cancelled','declined')) > 1 then ', returning customer' else ', first order' end), o.created_at
      from public.orders o join public.customers c on c.id = o.customer_id
      where o.deleted_at is null and not o.is_test and o.created_at > now() - interval '60 days'
        and not exists (select 1 from public.sheet_order_imports si where si.order_id = o.id)
      union all
      select jsonb_build_object('at', ev.at, 'kind', 'collected', 'customer_id', o.customer_id, 'name', c.full_name, 'order_id', o.id, 'by', ev.actor_label,
        'text', 'Collected ' || o.reference), ev.at
      from public.order_events ev join public.orders o on o.id = ev.order_id join public.customers c on c.id = o.customer_id
      where ev.kind = 'collected' and ev.at > now() - interval '60 days' and not o.is_test
    ) u order by u.at desc nulls last limit 15) y(x);

  return jsonb_build_object('ok', true, 'today', v_t, 'is_manager', v_mgr, 'all', v_all,
    'kpi', v_kpi, 'tasks', v_tasks, 'quotes', v_quotes, 'occasions', v_occ, 'occasions_no_permission', v_occ_noperm,
    'last_year', v_ly, 'last_year_no_permission', v_ly_noperm, 'lapsed', v_lapsed, 'recent', v_recent);
end $$;

-- 4. Record one contact in a single step: the note, the follow-up closed or moved, the next step, and the contact record
create or replace function public.crm_record_contact(
  p_customer uuid, p_kind text, p_reason text, p_channel text, p_outcome text, p_note text default null,
  p_task uuid default null, p_task_version integer default null, p_order uuid default null,
  p_next_due date default null, p_next_title text default null, p_idem uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_t date := public._fiji_today();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_reason text := nullif(regexp_replace(trim(coalesce(p_reason, '')), '\s+', ' ', 'g'), '');
  v_reached boolean := p_outcome not in ('no_answer','left_message');
  v_ch text; v_out text; v_body text; v_bad text; v_next date; v_title text;
  t public.customer_tasks; n public.customer_notes; nt public.customer_tasks; k public.customer_contacts;
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot record customer contact.'); end if;
  if p_idem is not null then
    select * into k from public.customer_contacts where idem = p_idem;
    if found then return jsonb_build_object('ok', true, 'repeat', true, 'message', 'Already saved.'); end if;
  end if;
  if not exists (select 1 from public.customers where id = p_customer and merged_into is null) then return public._err('not_found', 'That customer was not found.'); end if;
  if p_kind not in ('task','quote','occasion','last_year','lapsed','other') then return public._err('kind', 'Unknown follow-up type.'); end if;
  if p_channel not in ('phone','whatsapp','email','in_person') then return public._err('channel', 'Choose how you contacted them.', 'channel'); end if;
  if p_outcome not in ('interested','quote','later','ordered','not_interested','no_answer','left_message') then return public._err('outcome', 'Choose what happened.', 'outcome'); end if;
  if v_note is not null then
    if length(v_note) > 1000 then return public._err('note', 'Keep the note under 1,000 characters.', 'note'); end if;
    v_bad := public._note_problem(v_note); if v_bad is not null then return public._err('note', v_bad, 'note'); end if;
  end if;
  if v_reason is not null and length(v_reason) > 200 then v_reason := left(v_reason, 200); end if;
  if p_order is not null and not exists (select 1 from public.orders where id = p_order and customer_id = p_customer) then
    return public._err('order', 'That order belongs to a different customer.');
  end if;
  v_next := coalesce(p_next_due, case when not v_reached then v_t + 2 end);
  if v_next is not null and (v_next < v_t or v_next > v_t + 400) then return public._err('next', 'Choose a date from today to about a year ahead.', 'next'); end if;
  if v_reached and p_outcome in ('interested','quote','later') and v_next is null then return public._err('next', 'Choose when to follow up next.', 'next'); end if;

  if p_task is not null then
    select * into t from public.customer_tasks where id = p_task and customer_id = p_customer for update;
    if not found then return public._err('not_found', 'That follow-up was not found.'); end if;
    if not (public.has_role('manager') or t.assigned_to = auth.uid() or t.created_by = auth.uid() or t.assigned_to is null) then
      return public._err('forbidden', 'Only the person it is for, the person who set it, or a manager can record this.');
    end if;
    if t.status not in ('open','in_progress') then return public._err('state', 'This follow-up is already closed.'); end if;
    if p_task_version is not null and t.version <> p_task_version then return public._err('changed', 'Someone else updated this follow-up. Check it again.'); end if;
  end if;

  v_ch := case p_channel when 'phone' then 'Phone call' when 'whatsapp' then 'WhatsApp' when 'email' then 'Email' else 'In person' end;
  v_out := case p_outcome when 'interested' then 'Interested' when 'quote' then 'Wants a quote' when 'later' then 'Will order later'
           when 'ordered' then 'Has already ordered' when 'not_interested' then 'Not interested' when 'no_answer' then 'No answer' else 'Left a message' end;
  v_body := 'Follow-up' || coalesce(' (' || v_reason || ')', '') || '. ' || v_ch || ': ' || v_out || '.' || coalesce(' ' || v_note, '');

  insert into public.customer_notes (customer_id, order_id, kind, channel, body, created_by, created_by_label)
  values (p_customer, coalesce(p_order, t.order_id), 'note', p_channel, left(v_body, 2000), auth.uid(), public._me_label())
  returning * into n;

  if p_task is not null then
    if v_reached then
      update public.customer_tasks set status = 'done', done_at = now(), done_by_label = public._me_label(),
        outcome = left(v_ch || ': ' || v_out || coalesce('. ' || v_note, ''), 1000), version = version + 1, updated_at = now()
      where id = t.id returning * into t;
      insert into public.customer_task_events (task_id, by_label, change) values (t.id, public._me_label(), jsonb_build_object('action', 'done', 'outcome', t.outcome, 'channel', p_channel));
    else
      update public.customer_tasks set due_on = v_next, version = version + 1, updated_at = now() where id = t.id returning * into t;
      insert into public.customer_task_events (task_id, by_label, change) values (t.id, public._me_label(), jsonb_build_object('action', 'attempt', 'outcome', v_out, 'channel', p_channel, 'due_on', v_next));
    end if;
  elsif not v_reached then
    v_title := left('Try again: ' || coalesce(v_reason, 'follow-up'), 200);
    insert into public.customer_tasks (customer_id, order_id, note_id, title, due_on, assigned_to, created_by, created_by_label)
    values (p_customer, p_order, n.id, v_title, v_next, auth.uid(), auth.uid(), public._me_label()) returning * into nt;
    insert into public.customer_task_events (task_id, by_label, change) values (nt.id, public._me_label(), jsonb_build_object('created', true, 'due_on', nt.due_on, 'from_contact', true));
  end if;

  if v_reached and p_outcome in ('interested','quote','later') then
    v_title := left(coalesce(nullif(trim(coalesce(p_next_title, '')), ''),
      case p_outcome when 'quote' then 'Send a quote' when 'interested' then 'Follow up: they were interested' else 'Check in about their next cake' end), 200);
    insert into public.customer_tasks (customer_id, order_id, note_id, title, due_on, assigned_to, created_by, created_by_label)
    values (p_customer, coalesce(p_order, t.order_id), n.id, v_title, v_next, auth.uid(), auth.uid(), public._me_label()) returning * into nt;
    insert into public.customer_task_events (task_id, by_label, change) values (nt.id, public._me_label(), jsonb_build_object('created', true, 'due_on', nt.due_on, 'from_contact', true));
  end if;

  insert into public.customer_contacts (customer_id, kind, reason, order_id, task_id, note_id, next_task_id, channel, outcome, reached, staff_id, staff_label, idem)
  values (p_customer, p_kind, v_reason, coalesce(p_order, t.order_id), t.id, n.id, nt.id, p_channel, p_outcome, v_reached, auth.uid(), public._me_label(), p_idem)
  returning * into k;

  return jsonb_build_object('ok', true, 'reached', v_reached,
    'message', case when nt.id is not null then 'Saved. Next follow-up set for ' || to_char(nt.due_on, 'FMDay FMDD FMMonth') || '.'
                    when t.id is not null and not v_reached then 'Saved. Moved to ' || to_char(t.due_on, 'FMDay FMDD FMMonth') || '.'
                    else 'Saved to the customer''s profile.' end);
end $$;

revoke all on function public._crm_card(uuid) from public, anon;
revoke all on function public.crm_home(boolean) from public, anon;
revoke all on function public.crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid) from public, anon;
grant execute on function public.crm_home(boolean) to authenticated;
grant execute on function public.crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid) to authenticated;
