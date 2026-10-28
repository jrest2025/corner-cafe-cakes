-- Cancellation reasons (26 October 2026, approved by Roneel: "there should be an order cancellation option for any
-- orders with reason", "Tap a reason").
-- Staff tap a reason in the Cancel order panel; the add-on (src/staff.order-tools.js) writes the note as
-- "<Reason label>" or "<Reason label>: <extra words>". The existing cancel action is unchanged except that it now also
-- records which reason was chosen, so reports can count cancellations by reason. A typed note without a known label
-- (the app without the add-on) is recorded as 'other'. Nothing else in staff_order_action changes.

alter table public.orders add column if not exists cancel_reason text;
alter table public.orders drop constraint if exists orders_cancel_reason_chk;
alter table public.orders add constraint orders_cancel_reason_chk check (cancel_reason is null or cancel_reason in
  ('customer_cancelled', 'duplicate', 'date_unavailable', 'deposit_not_paid', 'kitchen_cannot_make', 'other'));
comment on column public.orders.cancel_reason is 'Why the order was cancelled (tapped by staff). Set by staff_order_action(cancel).';

create or replace function public._cancel_reason_code(p_note text)
returns text language sql immutable set search_path = public as $$
  select case
    when n ~* '^customer cancelled(:|$)' then 'customer_cancelled'
    when n ~* '^duplicate order(:|$)' then 'duplicate'
    when n ~* '^date or time not available(:|$)' then 'date_unavailable'
    when n ~* '^deposit not paid(:|$)' then 'deposit_not_paid'
    when n ~* '^kitchen cannot make it(:|$)' then 'kitchen_cannot_make'
    else 'other' end
  from (select btrim(coalesce(p_note, '')) as n) x
$$;
revoke all on function public._cancel_reason_code(text) from public, anon;

do $mig$
declare d text; n text;
begin
  d := pg_get_functiondef('public.staff_order_action(uuid,text,integer,numeric,numeric,text)'::regprocedure);
  n := replace(d,
    $a$update public.orders set order_status = 'cancelled', cancelled_at = now(), version = version + 1 where id = o.id;$a$,
    $b$update public.orders set order_status = 'cancelled', cancelled_at = now(), cancel_reason = public._cancel_reason_code(p_note), version = version + 1 where id = o.id;$b$);
  n := replace(n,
    $a$perform public._log(o.id, auth.uid(), v_name, 'cancelled', jsonb_build_object('note', p_note, 'paid_total', v_paid));$a$,
    $b$perform public._log(o.id, auth.uid(), v_name, 'cancelled', jsonb_build_object('note', p_note, 'paid_total', v_paid, 'reason', public._cancel_reason_code(p_note)));$b$);
  if n = d or position('cancel_reason = public._cancel_reason_code' in n) = 0 or position($c$'reason', public._cancel_reason_code$c$ in n) = 0 then
    raise exception 'staff_order_action has changed; cancel reason not applied';
  end if;
  execute n;
end $mig$;
