-- Delete customer fix 2 (20 October 2026, about 1:40 AM Fiji).
-- Live symptom (Roneel): still not deleting. Cause: the live API runs with a safety setting that refuses any DELETE
-- without a WHERE clause ("DELETE requires a WHERE clause"); one internal clean-up line had none. Rehearsals run
-- directly in the database did not have that setting, so they passed.
-- Also: customers linked to old order-sheet records (2 today) were blocked by a register rule; the link is now
-- marked "left unlinked" when the customer is deleted.

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
  delete from _cd_soft where true;
  insert into _cd_soft select id, deleted_at from public.orders where customer_id = p_customer and deleted_at is not null;
  update public.orders o set deleted_at = null from _cd_soft s where o.id = s.id;
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
  select o.id, p_actor, p_actor_name, 'customer_deleted',
         jsonb_build_object('customer_no', v_no, 'reason', p_reason)
    from public.orders o where o.customer_id = p_customer;
  with m as (update public.orders set customer_id = p_holder where customer_id = p_customer returning 1)
  select v_moved + count(*) into v_moved from m;
  update public.orders o set deleted_at = s.deleted_at from _cd_soft s where o.id = s.id;

  -- Old order-sheet links: an unlinked record must be marked as such.
  update public.register_customer set customer_id = null, how = 'left_unlinked' where customer_id = p_customer;

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
