-- Delete customer (20 October 2026).
-- Roneel: staff must be able to delete a customer record from the database (for example, customers who have left Fiji).
-- Decisions (Roneel, 20 October 2026): past orders are kept and shown as "Deleted customer"; managers and admins only
-- (same people who can merge customers: permission cust.merge).
--
-- What a delete does:
--   * Blocks if the customer still has open orders (waiting, quoted, awaiting deposit or confirmed). Staff finish or cancel those first.
--   * Moves the customer's orders (including soft-deleted ones) to one hidden "Deleted customer" holder record,
--     so revenue, analytics and order history stay correct. Each moved order gets an order history line.
--   * Deletes everything attached to the customer: notes, follow-ups, reminders, contact log, consents, favourites,
--     Birthday Club records, duplicate decisions and merge history. Register links are cleared.
--   * Profiles previously merged into this customer are deleted with it.
--   * Deletes the customer row. The existing audit trigger keeps a copy in audit_log; customer_deletions records who, when and why.

create table if not exists public.customer_deletions (
  id bigserial primary key,
  customer_no integer,
  deleted_by uuid,
  deleted_by_name text,
  reason text,
  orders_moved integer not null default 0,
  deleted_at timestamptz not null default now()
);
alter table public.customer_deletions enable row level security;
revoke all on public.customer_deletions from anon, authenticated;

-- One hidden holder for orders whose customer was deleted. Archived, so it never appears in the customer list,
-- follow-ups, customer numbers or exports.
insert into public.customers (full_name, email, preferred_contact, customer_no, customer_source, archived_at, archive_reason, notes)
select 'Deleted customer', 'deleted-customer@cornercafefiji.com', 'email', 0, 'staff_added', now(), 'system_deleted_holder',
       'System record. Holds past orders of customers who were deleted. Do not edit or merge.'
where not exists (select 1 from public.customers where archive_reason = 'system_deleted_holder');

create or replace function public._deleted_customer_holder()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select id from public.customers where archive_reason = 'system_deleted_holder' order by created_at limit 1
$$;

create or replace function public._customer_purge(p_customer uuid, p_holder uuid, p_actor uuid, p_actor_name text, p_reason text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_moved int := 0; v_child uuid; v_no int;
begin
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
  delete from public.customer_notes where customer_id = p_customer;
  delete from public.customer_tasks where customer_id = p_customer;
  delete from public.customer_reminders where customer_id = p_customer;
  delete from public.customer_contacts where customer_id = p_customer;
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

create or replace function public.customer_delete(p_customer uuid, p_version integer, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare c public.customers; v_holder uuid; v_open int; v_moved int; v_name text; v_reason text;
begin
  if not public.has_perm('cust.merge') then
    return public._err('forbidden', 'Only managers and admins can delete customers.');
  end if;
  v_holder := public._deleted_customer_holder();
  if v_holder is null then return public._err('setup', 'Customer delete is not set up yet. Please contact support.'); end if;
  select * into c from public.customers where id = p_customer for update;
  if not found then return public._err('customer', 'This customer has already been deleted.'); end if;
  if c.id = v_holder then return public._err('holder', 'This system record cannot be deleted.'); end if;
  if c.merged_into is not null then return public._err('merged', 'This profile was merged into another. Delete that profile instead.'); end if;
  if p_version is distinct from c.version then
    return public._err('changed', 'Someone changed this customer while you had it open. Close it, open it again, then delete.');
  end if;
  select count(*) into v_open from public.orders
   where customer_id in (select c.id union all select id from public.customers where merged_into = c.id)
     and deleted_at is null
     and order_status in ('awaiting_review','awaiting_quote','awaiting_approval','awaiting_deposit','confirmed');
  if v_open > 0 then
    return public._err('open_orders', 'This customer has ' || v_open || case when v_open = 1 then ' open order' else ' open orders' end
      || '. Complete or cancel ' || case when v_open = 1 then 'it' else 'them' end || ' first, then delete the customer.');
  end if;
  v_reason := nullif(left(trim(coalesce(p_reason, '')), 200), '');
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_moved := public._customer_purge(c.id, v_holder, auth.uid(), v_name, v_reason);
  insert into public.customer_deletions (customer_no, deleted_by, deleted_by_name, reason, orders_moved)
  values (c.customer_no, auth.uid(), v_name, v_reason, v_moved);
  return jsonb_build_object('ok', true, 'customer_no', c.customer_no, 'orders_kept', v_moved);
end $$;

revoke all on function public._customer_purge(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public._deleted_customer_holder() from public, anon, authenticated;
revoke all on function public.customer_delete(uuid, integer, text) from public, anon;
grant execute on function public.customer_delete(uuid, integer, text) to authenticated;

-- Keep the holder out of staff customer search.
create or replace function public.staff_search_customers(q text)
 returns setof customer_summary
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_q text := trim(coalesce(q, '')); v_low text; v_digits text; v_no int;
begin
  if not public.has_perm('cust.view') then return; end if;
  if length(v_q) < 2 then return; end if;
  v_low := lower(v_q);
  v_digits := regexp_replace(v_q, '[^0-9]', '', 'g');
  v_no := case when v_q ~* '^c-?[0-9]{1,9}$' then substring(v_q from '[0-9]+')::int end;
  return query
    select s.* from public.customer_summary s join public.customers c on c.id = s.id
    where c.archive_reason is distinct from 'system_deleted_holder' and (
          (v_no is not null and c.customer_no = v_no)
       or (v_no is null and length(v_digits) >= 3 and v_q !~* '^(cc|h)-' and v_q !~ '[a-zA-Z@]'
           and (position(v_digits in c.phone_key) > 0 or position(v_digits in coalesce(c.alt_phone_key, '')) > 0))
       or (v_low ~ '[a-z@]' and (position(v_low in lower(c.full_name)) > 0 or position(v_low in lower(coalesce(c.email, ''))) > 0
                                 or position(v_low in lower(coalesce(c.company, ''))) > 0))
       or (v_q ~* '^(cc|h)-[0-9]+$' and exists (select 1 from public.orders o where o.customer_id = c.id and o.deleted_at is null and lower(o.reference) = v_low)))
    order by (c.archived_at is not null), s.last_order_at desc nulls last
    limit 20;
end $function$;
