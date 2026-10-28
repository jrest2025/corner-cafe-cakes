-- Delete customer fix (20 October 2026, about 1:35 AM Fiji).
-- Live symptom (Roneel): the Delete permanently button did nothing. Every attempt was refused by the database with
-- "Marketing permission history cannot be edited or removed" (the marketing_consents protection trigger), so nothing
-- was deleted. Notes and follow-ups also have history rows that must be cleared first.
--
-- 1. The marketing permission protection stays on for everything, except a removal made by the customer delete itself
--    (it sets a flag for that one transaction only). Edits are still always refused.
-- 2. Notes, follow-ups and their history are cleared in the right order.

create or replace function public.protect_consents()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' and current_setting('cc.customer_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'Marketing permission history cannot be edited or removed. Record a new choice instead.';
end $function$;

create or replace function public._customer_purge(p_customer uuid, p_holder uuid, p_actor uuid, p_actor_name text, p_reason text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_moved int := 0; v_child uuid; v_no int;
begin
  -- Only for the rest of this transaction: lets this delete clear marketing permission history.
  perform set_config('cc.customer_purge', 'on', true);

  -- Profiles merged into this one go with it.
  for v_child in select id from public.customers where merged_into = p_customer loop
    v_moved := v_moved + public._customer_purge(v_child, p_holder, p_actor, p_actor_name, p_reason);
  end loop;
  select customer_no into v_no from public.customers where id = p_customer;

  -- Orders: keep them, attached to the holder. Soft-deleted orders are guarded against changes, so lift the
  -- deleted mark for the move and put the same value back.
  create temp table if not exists _cd_soft (id uuid primary key, deleted_at timestamptz) on commit drop;
  delete from _cd_soft;
  insert into _cd_soft select id, deleted_at from public.orders where customer_id = p_customer and deleted_at is not null;
  update public.orders o set deleted_at = null from _cd_soft s where o.id = s.id;
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
  select o.id, p_actor, p_actor_name, 'customer_deleted',
         jsonb_build_object('customer_no', v_no, 'reason', p_reason)
    from public.orders o where o.customer_id = p_customer;
  with m as (update public.orders set customer_id = p_holder where customer_id = p_customer returning 1)
  select v_moved + count(*) into v_moved from m;
  update public.orders o set deleted_at = s.deleted_at from _cd_soft s where o.id = s.id;

  update public.register_customer set customer_id = null where customer_id = p_customer;

  -- Contact log first (it points at notes and follow-ups), then follow-ups, then notes and their history.
  delete from public.customer_contacts
   where customer_id = p_customer
      or note_id in (select id from public.customer_notes where customer_id = p_customer)
      or task_id in (select id from public.customer_tasks where customer_id = p_customer)
      or next_task_id in (select id from public.customer_tasks where customer_id = p_customer);
  delete from public.customer_task_events
   where task_id in (select id from public.customer_tasks
                      where customer_id = p_customer
                         or note_id in (select id from public.customer_notes where customer_id = p_customer));
  delete from public.customer_tasks
   where customer_id = p_customer
      or note_id in (select id from public.customer_notes where customer_id = p_customer);
  delete from public.customer_note_events where note_id in (select id from public.customer_notes where customer_id = p_customer);
  delete from public.customer_note_photos where note_id in (select id from public.customer_notes where customer_id = p_customer);
  delete from public.customer_note_versions where note_id in (select id from public.customer_notes where customer_id = p_customer);
  delete from public.customer_notes where customer_id = p_customer;

  delete from public.customer_reminders where customer_id = p_customer;
  delete from public.customer_report_log where customer_id = p_customer;
  delete from public.customer_consents where customer_id = p_customer;
  delete from public.marketing_consents where customer_id = p_customer;
  delete from public.customer_favourites where customer_id = p_customer;
  delete from public.birthday_club_activity where customer_id = p_customer;
  delete from public.birthday_club_redemptions where customer_id = p_customer;
  delete from public.birthday_club_memberships where customer_id = p_customer;
  delete from public.customer_pair_decisions where a_id = p_customer or b_id = p_customer;
  delete from public.customer_merges where kept_id = p_customer or merged_id = p_customer;
  delete from public.customers where id = p_customer;
  return v_moved;
end $$;

revoke all on function public._customer_purge(uuid, uuid, uuid, text, text) from public, anon, authenticated;
