-- Thank-you and Google review email, sent once per order at 10:00am Fiji time
-- the morning after the cake is collected or delivered.
-- Only orders completed after this feature started (app_config.thanks_from), so
-- the 490 imported historical orders are never emailed.

insert into public.app_config (key, value) values
  ('review_link', 'https://g.page/r/CSbzvUjiTLEzEBM/review'),
  ('thanks_from', now()::text)
on conflict (key) do nothing;

create or replace function public.email_payload(p_order uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'manage_token' - 'idempotency_key',
    'item', to_jsonb(i),
    'customer', jsonb_build_object('full_name', o.contact_name, 'phone', o.contact_phone, 'email', o.contact_email, 'preferred_contact', c.preferred_contact,
                                   'past_orders', (select count(*) from public.orders x where x.customer_id = o.customer_id and x.id <> o.id and x.deleted_at is null and x.order_status not in ('declined','cancelled'))),
    'location', jsonb_build_object('name', l.name, 'address', l.address, 'phone', l.phone, 'email', l.email, 'order_page_url', l.order_page_url),
    'paid_total', (select coalesce(sum(amount), 0) from public.payments where order_id = o.id),
    'attachments', (select count(*) from public.order_attachments where order_id = o.id),
    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails','review_link'))
  )
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  join public.locations l on l.id = o.location_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by created_at limit 1) i on true
  where o.id = p_order
$function$;

create or replace function public.queue_thank_you_emails()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare r record; n integer := 0;
  v_from timestamptz := (select value::timestamptz from public.app_config where key = 'thanks_from');
begin
  if v_from is null then return 0; end if;
  for r in
    select o.id, o.contact_email from public.orders o
    where o.order_status = 'completed' and o.fulfilment_status in ('collected','delivered')
      and o.completed_at >= greatest(v_from, now() - interval '3 days')
      and (o.completed_at at time zone 'Pacific/Fiji')::date < (now() at time zone 'Pacific/Fiji')::date
      and o.deleted_at is null and not coalesce(o.is_test, false)
      and coalesce(o.contact_email, '') <> ''
  loop
    perform public._queue_email(r.id, 'guest_thanks', r.contact_email);
    n := n + 1;
  end loop;
  return n;
end $function$;
revoke all on function public.queue_thank_you_emails() from public, anon, authenticated;

-- 22:00 UTC = 10:00am Fiji (Fiji has no daylight saving at present)
select cron.schedule('cakes-thank-you', '0 22 * * *', 'select public.queue_thank_you_emails()');
