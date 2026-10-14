-- Stage 1, Order Received: "Not sure" for allergies, and email status with Resend on each order.
-- Additive only: one new nullable column, two new functions, and the two order-entry functions rewritten with the same
-- signatures (they now accept "Not sure" for allergies). Existing orders are untouched.
--
-- Allergies "Not sure": saved as a dietary order (so it is never treated as safe) with the note
-- "Allergies not confirmed yet. Check with the customer before baking." That note then shows on the order,
-- the kitchen board, the kitchen slip and the emails with no other changes. orders.dietary_status keeps the
-- answer itself (yes, no or unsure) so the order can be flagged for follow-up.
--
-- Rollback: the two order-entry functions can be restored from git (previous definitions are in this repo history);
-- the column and new functions can stay, as nothing else depends on them.

alter table public.orders add column if not exists dietary_status text check (dietary_status in ('yes', 'no', 'unsure'));

create or replace function public._diet_unsure(p jsonb)
 returns jsonb language sql immutable set search_path to 'public'
as $$
  select case when p->>'has_dietary' = 'unsure'
    then p || jsonb_build_object('has_dietary', 'yes',
                                 'dietary_note', trim(both ' ' from 'Allergies not confirmed yet. Check with the customer before baking. ' || coalesce(p->>'dietary_note', '')))
    else p end
$$;

create or replace function public.staff_create_order(p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_src public.order_source; v_name text; v_res jsonb; v_by text; v_candles text; v_heard text; v_ofor text; v_odate date; v_oid uuid; v_answer text := p->>'has_dietary';
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  v_src := coalesce(nullif(p->>'source', ''), 'walk_in')::public.order_source;
  if v_src = 'online' then v_src := 'walk_in'; end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_by := nullif(trim(coalesce(p->'rush'->>'approved_by', '')), '');
  if jsonb_typeof(p->'rush') = 'object' and (v_by is null or length(v_by) < 2) then
    return public._err('date', 'Enter who approved the short notice.', 'date');
  end if;
  if p->>'has_dietary' = 'yes' then
    if coalesce(jsonb_array_length(case when jsonb_typeof(p->'dietary') = 'array' then p->'dietary' end), 0) = 0
       and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet');
    end if;
    if jsonb_typeof(p->'dietary') = 'array' and p->'dietary' ? 'Other' and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet');
    end if;
  end if;
  p := public._diet_unsure(p);
  v_candles := nullif(trim(coalesce(p->>'candles', '')), '');
  if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
  v_heard := nullif(p->>'heard_from', '');
  if v_heard is not null and v_heard not in ('facebook','instagram','google','friend','walked_past','returning','other') then return public._err('heard_from', 'Unknown answer for how they heard about us.'); end if;
  v_ofor := nullif(trim(coalesce(p->>'occasion_for', '')), '');
  if length(coalesce(v_ofor, '')) > 60 then return public._err('occasion_for', 'Keep the name to 60 characters.', 'occasion'); end if;
  if nullif(p->>'occasion_date', '') is not null then
    if p->>'occasion_date' !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('occasion_date', 'Check the occasion date.', 'occasion'); end if;
    v_odate := (p->>'occasion_date')::date;
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);
  if coalesce((v_res->>'ok')::boolean, false) and not coalesce((v_res->>'duplicate')::boolean, false) then
    v_oid := (v_res->>'order_id')::uuid;
    if v_answer in ('yes', 'no', 'unsure') then update public.orders set dietary_status = v_answer where id = v_oid; end if;
    if v_by is not null then
      update public.orders set rush_approved_by = v_by where id = v_oid and rush_override;
      if found then
        perform public._log(v_oid, auth.uid(), v_name, 'rush_approved',
          jsonb_build_object('approved_by', v_by, 'reason', (select rush_reason from public.orders where id = v_oid)));
      end if;
    end if;
    if v_candles is not null then update public.order_items set candles = v_candles where order_id = v_oid; end if;
    if v_heard is not null or v_ofor is not null or v_odate is not null then
      update public.orders set heard_from = v_heard, occasion_for = v_ofor, occasion_date = v_odate where id = v_oid;
    end if;
    if nullif(p->>'customer_id', '') is not null and p->>'consent' in ('yes', 'no') then
      perform public.staff_set_consent((p->>'customer_id')::uuid, p->>'consent' = 'yes', 'Asked when taking order ' || coalesce(v_res->>'reference', ''));
    end if;
  end if;
  return v_res;
exception when invalid_text_representation then return public._err('bad_input', 'Unknown order source.');
end $function$;

create or replace function public.submit_online_order(p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_res jsonb; v_candles text := nullif(trim(coalesce(p->>'candles', '')), ''); v_answer text := p->>'has_dietary';
begin
  if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
  v_res := public._create_order(public._diet_unsure(p) - 'candles', 'online', null, 'Guest (online)');
  if coalesce((v_res->>'ok')::boolean, false) and v_res ? 'order_id' and not coalesce((v_res->>'duplicate')::boolean, false) then
    if v_candles is not null then update public.order_items set candles = v_candles where order_id = (v_res->>'order_id')::uuid and candles is null; end if;
    if v_answer in ('yes', 'no', 'unsure') then update public.orders set dietary_status = v_answer where id = (v_res->>'order_id')::uuid; end if;
  end if;
  return v_res;
end $function$;

-- Staff: the emails for one order, newest first (status only; the email itself is not stored)
create or replace function public.staff_order_emails(p_order uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Your login cannot see order emails.'); end if;
  return jsonb_build_object('ok', true,
    'guest_emails', coalesce((select value from public.app_config where key = 'guest_emails'), 'false') = 'true',
    'emails', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'to', e.to_email, 'status', e.status, 'attempts', e.attempts,
      'created_at', e.created_at, 'sent_at', e.sent_at, 'error', case when e.status = 'failed' then left(e.last_error, 160) end) order by e.created_at desc)
      from public.email_outbox e where e.order_id = p_order and e.kind like 'guest\_%'), '[]'::jsonb));
end $$;

-- Staff: send the customer's latest email again (for example after a failure or a new email address)
create or replace function public.staff_resend_email(p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare o public.orders; v_kind text; v_name text;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Your login cannot send order emails.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null;
  if not found then return public._err('missing', 'That order was not found.'); end if;
  if coalesce(o.contact_email, '') = '' then return public._err('no_email', 'This order has no email address. Add one with Amend order first.'); end if;
  if coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return public._err('off', 'Customer emails are switched off.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and status in ('pending', 'sending')) then
    return public._err('busy', 'An email for this order is already on its way.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and created_at > now() - interval '2 minutes') then
    return public._err('soon', 'An email went to this customer in the last 2 minutes. Wait a moment before sending again.'); end if;
  select kind into v_kind from public.email_outbox where order_id = p_order and kind in ('guest_received', 'guest_confirmed', 'guest_deposit_needed', 'guest_declined', 'guest_cancelled')
    order by created_at desc limit 1;
  if v_kind is null then
    v_kind := case o.order_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed'
                when 'declined' then 'guest_declined' when 'cancelled' then 'guest_cancelled' else 'guest_received' end;
  end if;
  perform public._queue_email(p_order, v_kind, o.contact_email, true);
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(p_order, auth.uid(), v_name, 'email_resent', jsonb_build_object('kind', v_kind, 'to', o.contact_email));
  return jsonb_build_object('ok', true, 'kind', v_kind, 'to', o.contact_email);
end $$;

grant execute on function public.staff_order_emails(uuid) to authenticated;
grant execute on function public.staff_resend_email(uuid) to authenticated;
revoke execute on function public.staff_order_emails(uuid) from anon;
revoke execute on function public.staff_resend_email(uuid) from anon;
revoke all on function public._diet_unsure(jsonb) from public, anon;
