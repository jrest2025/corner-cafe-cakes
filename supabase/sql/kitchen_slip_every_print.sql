-- Kitchen slip: every press of Print kitchen slip emails the slip PDF to the admin inbox and the counter inbox.
-- Before this, an email went only when a new slip version was made; pressing Print again for the same version sent nothing.
-- Additive only: staff_print_brief rewritten with the same signature (it now also says where the email went),
-- and the counter inbox filled in as the copy address if none was set. No tables or columns change.
--
-- Recipients: kitchen_slip_email (shown in Settings as Admin inbox) and kitchen_slip_backup_email (shown as Counter inbox, gets the same email).
-- A second press within 1 minute, or while the last email for that order is still sending, does not send a duplicate.
-- Rollback: restore the previous staff_print_brief from this repository's history.

insert into public.app_config (key, value) values ('kitchen_slip_backup_email', 'cornercafe@jacksfiji.com')
  on conflict (key) do update set value = excluded.value where coalesce(trim(public.app_config.value), '') = '';

create or replace function public.staff_print_brief(p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare o public.orders; b public.kitchen_briefs; v_snap jsonb; v_changes jsonb := '[]'; v_name text; v_new boolean := false; v_slip jsonb;
  v_to text; v_cc text; v_on boolean; v_email jsonb; v_row public.email_outbox;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot print kitchen briefs.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status not in ('confirmed','completed') then return public._err('status', 'A kitchen brief is available once the order is confirmed.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_snap := public._kitchen_snapshot(o.id);
  select * into b from public.kitchen_briefs where order_id = o.id order by version desc limit 1;
  if b.id is null or b.snapshot is distinct from v_snap then
    if b.id is not null then
      select coalesce(jsonb_agg(k), '[]') into v_changes from jsonb_object_keys(v_snap || b.snapshot) k where v_snap->k is distinct from b.snapshot->k;
    end if;
    insert into public.kitchen_briefs (order_id, version, snapshot, changes, printed_by, printed_by_label)
    values (o.id, coalesce(b.version, 0) + 1, v_snap, v_changes, auth.uid(), v_name) returning * into b;
    update public.orders set brief_version = b.version where id = o.id;
    v_new := true;  -- the kitchen_briefs trigger has queued the email for this new version
  end if;

  -- The email: on a new version the trigger queued it; on a repeat press, queue it here
  v_on := coalesce((select value from public.app_config where key = 'kitchen_slip_on_new'), 'true') = 'true';
  v_to := nullif(trim((select value from public.app_config where key = 'kitchen_slip_email')), '');
  v_cc := nullif(trim((select value from public.app_config where key = 'kitchen_slip_backup_email')), '');
  if v_cc is not null and v_to is not null and lower(v_cc) = lower(v_to) then v_cc := null; end if;
  if not v_on then
    v_email := jsonb_build_object('state', 'off');
  elsif v_to is null then
    v_email := jsonb_build_object('state', 'no_address');
  elsif not coalesce(o.reference ~ '^[A-Z]{1,4}-[0-9]{3,}$', false) then
    v_email := jsonb_build_object('state', 'no_reference');
  elsif v_new then
    v_email := jsonb_build_object('state', 'queued');
  elsif exists (select 1 from public.email_outbox where order_id = o.id and kind = 'kitchen_slip'
                 and (status in ('pending', 'sending') or created_at > now() - interval '1 minute')) then
    v_email := jsonb_build_object('state', 'recent');
  else
    insert into public.email_outbox (order_id, kind, to_email, cc, dedupe_key, status)
      values (o.id, 'kitchen_slip', v_to, case when v_cc is null then '{}'::text[] else array[v_cc] end,
        'kitchen_slip:' || o.id::text || ':p' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint || ':v' || b.version, 'pending')
      returning * into v_row;
    v_email := jsonb_build_object('state', 'queued');
  end if;
  v_email := v_email || jsonb_build_object('to', v_to, 'cc', v_cc);

  select jsonb_build_object(
    'name', coalesce(nullif(trim(o.contact_name), ''), c.full_name),
    'phone', coalesce(nullif(trim(o.contact_phone), ''), c.phone),
    'price', coalesce(o.final_total, o.estimate_total),
    'taken_by', case when o.source = 'online' then 'Website order' else coalesce(sp.full_name, 'Staff') end,
    'ordered_at', o.created_at,
    'source', o.source,
    'method', o.fulfilment_method,
    'address', case when o.fulfilment_method = 'delivery' then o.delivery_address end,
    'receiver', case when o.fulfilment_method = 'delivery' then o.delivery_contact end,
    'paid', coalesce((select sum(pm.amount) from public.payments pm where pm.order_id = o.id), 0))
    into v_slip
    from (select 1) x
    left join public.customers c on c.id = o.customer_id
    left join public.staff_profiles sp on sp.user_id = o.created_by;
  perform public._log(o.id, auth.uid(), v_name, 'brief_printed', jsonb_build_object('version', b.version, 'new_version', v_new, 'changes', v_changes, 'email', v_email->>'state'));
  return jsonb_build_object('ok', true, 'version', b.version, 'new_version', v_new, 'changes', b.changes,
                            'first_printed_at', b.printed_at, 'snapshot', v_snap, 'slip', v_slip, 'email', v_email,
                            'paper', coalesce((select value from public.app_config where key = 'kitchen_slip_paper'), 'A5'));
end $function$;
