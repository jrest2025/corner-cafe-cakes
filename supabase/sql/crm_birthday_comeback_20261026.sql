-- Birthday comeback list (26 October 2026, approved by Roneel: "yes please" to the Birthday comeback list).
-- Customers whose last birthday cake was about a year ago, with the anniversary coming up, who have not ordered
-- again since. Read only: nothing is changed or sent. For each person it says whether they can be messaged now
-- (WhatsApp permission given), should be checked first (permission carried over from the old order sheets, marked
-- for reconfirming), or should be asked first (no permission on record).
-- Also returns, for each of the next 12 months, how many customers' birthdays come round again (the outlook).

create or replace function public.crm_birthday_comeback(p_days integer default 60)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_t date := public._fiji_today();
  v_days int := greatest(7, least(coalesce(p_days, 60), 120));
  v_rows jsonb; v_months jsonb; v_sum jsonb;
begin
  if not (public.has_perm('cust.view') or public.has_perm('cust.followup')) then
    return public._err('forbidden', 'Your login cannot see customer lists.');
  end if;

  with last_bday as (                       -- each customer's most recent birthday cake
    select distinct on (o.customer_id)
           o.customer_id, coalesce(o.occasion_date, o.required_date) as d, o.reference,
           coalesce(o.final_total, o.estimate_total, 0) as amount, oi.product_name, oi.size_inch
      from public.orders o join public.order_items oi on oi.order_id = o.id
     where o.is_test = false and o.deleted_at is null and o.customer_id is not null
       and o.order_status::text not in ('cancelled', 'declined')
       and oi.occasion = 'Birthday'
       and coalesce(o.occasion_date, o.required_date) between date '2015-01-01' and v_t
     order by o.customer_id, coalesce(o.occasion_date, o.required_date) desc, o.created_at desc
  ), due as (
    select b.*,
           case when (b.d + make_interval(years => (extract(year from v_t) - extract(year from b.d))::int))::date >= v_t
                then (b.d + make_interval(years => (extract(year from v_t) - extract(year from b.d))::int))::date
                else (b.d + make_interval(years => (extract(year from v_t) - extract(year from b.d))::int + 1))::date end as next_d
      from last_bday b
  ), still_open as (                             -- leave out anyone who has already ordered again or has a cake booked
    select d.* from due d
     where d.d <= v_t - 300                  -- about a year ago, not a cake from the last few months
       and not exists (select 1 from public.orders x
                        where x.customer_id = d.customer_id and x.is_test = false and x.deleted_at is null
                          and x.order_status::text not in ('cancelled', 'declined')
                          and (x.created_at >= (v_t - 60)::timestamptz or x.required_date >= v_t))
  ), people_all as (                       -- for the 12-month outlook: every customer's next birthday
    select d.next_d, d.amount from due d join public.customers c on c.id = d.customer_id
     where c.archived_at is null and c.merged_into is null and d.next_d > d.d
  ), people as (
    select o.*, c.full_name, c.customer_no, c.phone,
           case when exists (select 1 from public.consent_now k where k.customer_id = c.id and k.brand_code = 'corner-cafe'
                               and k.channel = 'whatsapp' and k.granted and k.applies and not k.needs_reconfirm) then 'yes'
                when exists (select 1 from public.consent_now k where k.customer_id = c.id and k.brand_code = 'corner-cafe'
                               and k.channel = 'whatsapp' and k.granted and k.applies) then 'check'
                else 'ask' end as message,
           (select count(*) from public.orders y where y.customer_id = c.id and y.is_test = false and y.deleted_at is null
              and y.order_status::text not in ('cancelled', 'declined')) as orders,
           (select coalesce(sum(coalesce(y.final_total, y.estimate_total, 0)), 0) from public.orders y where y.customer_id = c.id
              and y.is_test = false and y.deleted_at is null and y.order_status::text not in ('cancelled', 'declined')) as spent
      from still_open o join public.customers c on c.id = o.customer_id
     where c.archived_at is null and c.merged_into is null
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.customer_id, 'no', p.customer_no, 'name', p.full_name, 'phone', p.phone,
        'next', p.next_d, 'in_days', p.next_d - v_t, 'last', p.d, 'ref', p.reference,
        'cake', p.product_name, 'size', p.size_inch, 'amount', p.amount,
        'orders', p.orders, 'spent', p.spent, 'message', p.message) order by p.next_d, p.full_name)
       from people p where p.next_d <= v_t + v_days), '[]'::jsonb),
    (select jsonb_build_object('people', count(*), 'can_message', count(*) filter (where p.message = 'yes'),
            'check_first', count(*) filter (where p.message = 'check'), 'ask_first', count(*) filter (where p.message = 'ask'),
            'value', coalesce(round(sum(p.amount), 2), 0))
       from people p where p.next_d <= v_t + v_days),
    (select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'people',
            (select count(*) from people_all p where date_trunc('month', p.next_d) = m),
            'value', (select coalesce(round(sum(p.amount)), 0) from people_all p where date_trunc('month', p.next_d) = m)) order by m)
       from generate_series(date_trunc('month', v_t), date_trunc('month', v_t) + interval '11 months', interval '1 month') m)
  into v_rows, v_sum, v_months;

  return jsonb_build_object('ok', true, 'today', v_t, 'days', v_days, 'summary', v_sum, 'months', v_months, 'people', v_rows);
end $$;

revoke all on function public.crm_birthday_comeback(integer) from public, anon;
grant execute on function public.crm_birthday_comeback(integer) to authenticated;
