-- 28 Oct 2026 (Roneel): corporate and bulk festive orders. Additive only.
-- A website treat order becomes a bulk request when the customer says it is for a business, or orders 20 or more goodies.
-- Bulk requests keep the normal checks (prices, dates, notice) and add: company, email, collect or delivery (+ address),
-- payment preference (collect, invoice, deposit). Staff agree a quote (bulk discount) with the new 'quote' action;
-- the list price is kept in list_total. Existing orders and the normal flow are unchanged.

alter table public.treat_orders
  add column if not exists kind text not null default 'standard',
  add column if not exists company text,
  add column if not exists email text,
  add column if not exists fulfilment text not null default 'collect',
  add column if not exists delivery_address text,
  add column if not exists pay_pref text,
  add column if not exists list_total numeric;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'treat_orders_kind_chk') then
    alter table public.treat_orders add constraint treat_orders_kind_chk check (kind in ('standard', 'bulk'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'treat_orders_fulfilment_chk') then
    alter table public.treat_orders add constraint treat_orders_fulfilment_chk check (fulfilment in ('collect', 'delivery'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'treat_orders_pay_pref_chk') then
    alter table public.treat_orders add constraint treat_orders_pay_pref_chk check (pay_pref is null or pay_pref in ('collect', 'invoice', 'deposit'));
  end if;
end $$;

create or replace function public.submit_treat_order(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare r jsonb; v_biz boolean := false; v_qty int := 0; v_bulk boolean; v_company text; v_email text; v_ful text; v_addr text; v_pay text;
begin
  begin v_biz := coalesce((p->>'business')::boolean, false); exception when others then v_biz := false; end;
  select coalesce(sum(case when (x->>'quantity') ~ '^[0-9]{1,4}$' then (x->>'quantity')::int else 0 end), 0) into v_qty
    from jsonb_array_elements(case when jsonb_typeof(p->'treats') = 'array' then p->'treats' else '[]'::jsonb end) x;
  v_bulk := v_biz or v_qty >= 20;
  if v_bulk then
    v_company := nullif(left(trim(coalesce(p->>'company', '')), 120), '');
    v_email := nullif(left(trim(coalesce(p->>'email', '')), 160), '');
    v_ful := case when p->>'fulfilment' = 'delivery' then 'delivery' else 'collect' end;
    v_addr := nullif(left(trim(coalesce(p->>'address', '')), 300), '');
    v_pay := case when p->>'pay' in ('collect', 'invoice', 'deposit') then p->>'pay' end;
    if v_biz and v_company is null then return public._err('company', 'Enter your company name.', 'company'); end if;
    if v_email is not null and v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
    if v_pay = 'invoice' and v_email is null then return public._err('email', 'Add an email address for the invoice.', 'email'); end if;
    if v_ful = 'delivery' and coalesce(length(v_addr), 0) < 5 then return public._err('address', 'Enter the delivery address.', 'address'); end if;
  end if;
  r := public._create_treat_order(p, false, null, 'Guest (online)');
  if v_bulk and coalesce((r->>'ok')::boolean, false) and not coalesce((r->>'duplicate')::boolean, false) then
    update public.treat_orders set kind = 'bulk', company = v_company, email = v_email, fulfilment = v_ful,
      delivery_address = case when v_ful = 'delivery' then v_addr end, pay_pref = v_pay, list_total = total
      where id = (r->>'id')::uuid;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail)
      values ((r->>'id')::uuid, 'Guest (online)', 'bulk', jsonb_build_object('company', v_company, 'fulfilment', v_ful, 'pay', v_pay, 'items', v_qty));
  end if;
  if coalesce((r->>'ok')::boolean, false) then r := r || jsonb_build_object('bulk', v_bulk); end if;
  return r;
end $function$;

-- Staff: 'quote' sets the agreed total for a bulk order (bulk discount). Everything else is as before.
create or replace function public.staff_treat_order_action(p_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric, p_method text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t public.treat_orders; v_label text; v_amt numeric;
begin
  select * into t from public.treat_orders where id = p_id for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  if p_action = 'pay' then
    if not public.has_perm('ord.payments') then return public._err('forbidden', 'Your login cannot record payments.'); end if;
    if t.status = 'cancelled' then return public._err('status', 'This order is cancelled.'); end if;
    v_amt := round(coalesce(p_amount, 0), 2);
    if v_amt <= 0 then return public._err('amount', 'Enter the amount paid.', 'amount'); end if;
    if t.paid + v_amt > t.total + 0.005 then return public._err('amount', format('Only $%s is still to pay.', to_char(t.total - t.paid, 'FM999990.00')), 'amount'); end if;
    if coalesce(p_method, '') not in ('cash', 'eftpos', 'mpaisa', 'bank_transfer', 'other') then return public._err('method', 'Choose how they paid.', 'method'); end if;
    update public.treat_orders set paid = paid + v_amt, updated_at = now() where id = t.id;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (t.id, v_label, 'paid', jsonb_build_object('amount', v_amt, 'method', p_method));
  elsif p_action = 'quote' then
    if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
    if t.kind <> 'bulk' then return public._err('kind', 'Quotes are for bulk orders.'); end if;
    if t.status not in ('new', 'confirmed') then return public._err('status', 'This order is already closed.'); end if;
    v_amt := round(coalesce(p_amount, 0), 2);
    if v_amt <= 0 then return public._err('amount', 'Enter the agreed total.', 'amount'); end if;
    if v_amt > coalesce(t.list_total, t.total) + 0.005 then return public._err('amount', format('The list price is $%s. Enter that or less.', to_char(coalesce(t.list_total, t.total), 'FM999990.00')), 'amount'); end if;
    if v_amt + 0.005 < t.paid then return public._err('amount', format('They have already paid $%s.', to_char(t.paid, 'FM999990.00')), 'amount'); end if;
    update public.treat_orders set total = v_amt, list_total = coalesce(list_total, total), updated_at = now() where id = t.id;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (t.id, v_label, 'quote', jsonb_build_object('total', v_amt, 'list', coalesce(t.list_total, t.total), 'note', p_note));
  else
    if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
    if p_action = 'confirm' then
      if t.status <> 'new' then return public._err('status', 'Only a new request can be confirmed.'); end if;
      update public.treat_orders set status = 'confirmed', confirmed_at = now(), confirmed_by_label = v_label, updated_at = now() where id = t.id;
    elsif p_action = 'collected' then
      if t.status not in ('new', 'confirmed') then return public._err('status', 'This order is already closed.'); end if;
      update public.treat_orders set status = 'collected', collected_at = now(), collected_by_label = v_label, updated_at = now() where id = t.id;
    elsif p_action = 'cancel' then
      if t.status in ('collected', 'cancelled') then return public._err('status', 'This order is already closed.'); end if;
      if length(trim(coalesce(p_note, ''))) < 2 then return public._err('note', 'Say why it is cancelled.', 'note'); end if;
      update public.treat_orders set status = 'cancelled', cancel_reason = left(trim(p_note), 200), updated_at = now() where id = t.id;
    else return public._err('action', 'Unknown action.'); end if;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (t.id, v_label, p_action, case when p_note is not null then jsonb_build_object('note', p_note) end);
  end if;
  select * into t from public.treat_orders where id = p_id;
  return jsonb_build_object('ok', true, 'status', t.status, 'paid', t.paid, 'total', t.total);
end $function$;
