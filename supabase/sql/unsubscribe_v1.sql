-- Corner Café cakes: unsubscribe from offers (17 October 2026).
-- 1. Two consent wordings on record:
--      online-form-v3: the order form wording now ends "You can unsubscribe at any time." (live since 16 October)
--      email-unsubscribe-v1: the customer used the unsubscribe link in a Corner Café email
-- 2. New online orders record online-form-v3, and it counts for Jack's Restaurants offers in emails (cross_sell_wording).
-- 3. unsubscribe_by_order(order, via): withdraws every marketing permission the customer still has with that brand
--    (email, SMS, WhatsApp, call), adds a line to the order history, and returns only ok / already. No personal details are returned.
--    Only the unsubscribe Edge Function can run it (service role). Order emails (received, confirmed, thank you) are not affected.
-- Runs as one block: if any check at the end fails, nothing is changed.
do $unsubscribe_v1$
declare v_brand uuid; v_def text; v_bad int;
begin
  select brand_id into v_brand from public.locations where code = 'corner-cafe';
  if v_brand is null then raise exception 'Corner Café location not found'; end if;

  -- 1. Wordings
  insert into public.consent_wordings (code, brand_id, wording, where_shown, in_use_from, notes) values
    ('online-form-v3', v_brand, 'Send me Corner Café cake specials and reminders, and offers from Jack''s Restaurants. You can unsubscribe at any time.',
     'Online cake order form', '2026-10-16', 'Same as online-form-v2 with the unsubscribe sentence added.'),
    ('email-unsubscribe-v1', v_brand, 'The customer used the unsubscribe link in a Corner Café cake email. All marketing for this brand is switched off.',
     'Unsubscribe link in Corner Café cake emails, and the email app''s own Unsubscribe button', '2026-10-17', 'Withdrawal only.')
  on conflict (code) do nothing;

  -- 2. New online orders record the new wording
  v_def := pg_get_functiondef('public._create_order'::regproc);
  if (length(v_def) - length(replace(v_def, '''online-form-v2''', ''))) / length('''online-form-v2''') <> 1 then
    raise exception 'Expected exactly one online-form-v2 in _create_order';
  end if;
  execute replace(v_def, '''online-form-v2''', '''online-form-v3''');

  update public.app_config set value = value || ',online-form-v3'
  where key = 'cross_sell_wording' and position('online-form-v3' in value) = 0;

  -- 3. Unsubscribe
  execute $fn$
  create or replace function public.unsubscribe_by_order(p_order uuid, p_via text default 'page')
  returns jsonb language plpgsql security definer set search_path to 'public' as $b$
  declare o record; c record; v_live text[];
  begin
    select ord.id, ord.reference, ord.customer_id, l.brand_id into o
      from public.orders ord join public.locations l on l.id = ord.location_id where ord.id = p_order;
    if not found or o.customer_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
    select * into c from public.customers
      where id = (select coalesce(merged_into, id) from public.customers where id = o.customer_id);
    select coalesce(array_agg(distinct cn.channel), '{}') into v_live
      from public.consent_now cn where cn.customer_id = c.id and cn.brand_id = o.brand_id and cn.granted and cn.applies;
    if cardinality(v_live) = 0 then return jsonb_build_object('ok', true, 'already', true); end if;
    perform public._add_consent(c.id, o.brand_id, v_live, false, false,
      'Unsubscribe link in a Corner Café email' || case when p_via = 'one-click' then ' (the email app''s Unsubscribe button)' else '' end,
      'email-unsubscribe-v1', 'Order ' || o.reference, o.id, null, c.phone_key, c.email);
    insert into public.order_events (order_id, actor_label, kind, detail)
    values (o.id, 'Customer', 'note', jsonb_build_object('note', 'Customer unsubscribed from Corner Café offers using the link in an email', 'channels', v_live, 'via', p_via));
    return jsonb_build_object('ok', true, 'already', false);
  end $b$;
  $fn$;
  revoke all on function public.unsubscribe_by_order(uuid, text) from public, anon, authenticated;
  grant execute on function public.unsubscribe_by_order(uuid, text) to service_role;

  -- Checks
  select count(*) into v_bad from public.consent_wordings where code in ('online-form-v3', 'email-unsubscribe-v1');
  if v_bad <> 2 then raise exception 'Wordings missing'; end if;
  if position('online-form-v3' in pg_get_functiondef('public._create_order'::regproc)) = 0 then raise exception '_create_order not updated'; end if;
  if (select position('online-form-v3' in value) from public.app_config where key = 'cross_sell_wording') = 0 then raise exception 'cross_sell_wording not updated'; end if;
  if has_function_privilege('anon', 'public.unsubscribe_by_order(uuid, text)', 'execute') then raise exception 'unsubscribe_by_order open to the public'; end if;
  raise notice 'Unsubscribe ready.';
end $unsubscribe_v1$;
