-- view customer_summary ['security_invoker=true']
 WITH o AS (
         SELECT o.customer_id,
            o.id,
            o.order_status,
            o.required_date,
            o.created_at,
            COALESCE(o.final_total, o.estimate_total) AS value,
            i.product_name,
            COALESCE(i.variant, i.product_name) AS cake,
            i.occasion,
            i.cake_message
           FROM (orders o
             LEFT JOIN LATERAL ( SELECT x.product_name,
                    x.variant,
                    x.occasion,
                    x.cake_message
                   FROM order_items x
                  WHERE (x.order_id = o.id)
                  ORDER BY x.created_at
                 LIMIT 1) i ON (true))
          WHERE (o.deleted_at IS NULL)
        ), agg AS (
         SELECT o.customer_id,
            count(*) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS orders_count,
            count(*) FILTER (WHERE (o.order_status = 'completed'::order_status)) AS completed_count,
            (COALESCE(sum(o.value) FILTER (WHERE (o.order_status = 'completed'::order_status)), (0)::numeric))::numeric(10,2) AS completed_spend,
            count(*) FILTER (WHERE (o.order_status = 'cancelled'::order_status)) AS cancelled_count,
            count(*) FILTER (WHERE ((o.order_status = ANY (ARRAY['awaiting_review'::order_status, 'awaiting_quote'::order_status, 'awaiting_approval'::order_status, 'awaiting_deposit'::order_status, 'confirmed'::order_status])) AND (o.required_date >= ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date))) AS upcoming_count,
            min(o.created_at) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS first_order_at,
            max(o.created_at) FILTER (WHERE (o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status]))) AS last_order_at,
            max(o.required_date) FILTER (WHERE (o.order_status = 'completed'::order_status)) AS last_completed_for,
            bool_or(((o.occasion = 'Birthday'::text) AND (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status])))) AS birthday_buyer,
            mode() WITHIN GROUP (ORDER BY o.cake) FILTER (WHERE (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status]))) AS favourite_cake,
            array_remove(array_agg(DISTINCT o.occasion) FILTER (WHERE (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status]))), NULL::text) AS occasions
           FROM o
          GROUP BY o.customer_id
        ), occ AS (
         SELECT DISTINCT ON (o.customer_id) o.customer_id,
            _next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) AS next_occasion_date,
            (
                CASE
                    WHEN (o.occasion = 'Wedding'::text) THEN 'Wedding anniversary'::text
                    ELSE o.occasion
                END ||
                CASE
                    WHEN ((o.occasion = ANY (ARRAY['Birthday'::text, 'Anniversary'::text])) AND (o.cake_message IS NOT NULL)) THEN ((' ("'::text || o.cake_message) || '")'::text)
                    ELSE ''::text
                END) AS retarget_reason
           FROM o
          WHERE ((o.occasion IS NOT NULL) AND (o.order_status = 'completed'::order_status) AND (_next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) IS NOT NULL))
          ORDER BY o.customer_id, (_next_occasion(o.occasion, o.required_date, ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date))
        ), cons AS (
         SELECT DISTINCT ON (customer_consents.customer_id) customer_consents.customer_id,
            customer_consents.granted,
            customer_consents.recorded_at
           FROM customer_consents
          ORDER BY customer_consents.customer_id, customer_consents.recorded_at DESC
        ), lead AS (
         SELECT COALESCE(( SELECT (app_config.value)::integer AS value
                   FROM app_config
                  WHERE (app_config.key = 'retarget_lead_days'::text)), 14) AS days,
            COALESCE(( SELECT (app_config.value)::integer AS value
                   FROM app_config
                  WHERE (app_config.key = 'retarget_window_days'::text)), 30) AS win
        )
 SELECT c.id,
    c.full_name,
    c.phone,
    c.email,
    c.preferred_contact,
    c.is_corporate,
    c.company,
    c.first_source,
    c.created_at,
    COALESCE(a.orders_count, (0)::bigint) AS orders_count,
    COALESCE(a.completed_count, (0)::bigint) AS completed_count,
    COALESCE(a.completed_spend, (0)::numeric) AS completed_spend,
        CASE
            WHEN (COALESCE(a.completed_count, (0)::bigint) > 0) THEN round((a.completed_spend / (a.completed_count)::numeric), 2)
            ELSE NULL::numeric
        END AS average_spend,
    COALESCE(a.cancelled_count, (0)::bigint) AS cancelled_count,
    COALESCE(a.upcoming_count, (0)::bigint) AS upcoming_count,
    a.first_order_at,
    a.last_order_at,
    a.favourite_cake,
    COALESCE(a.occasions, '{}'::text[]) AS occasions,
    oc.next_occasion_date,
    COALESCE(cn.granted, false) AS marketing_opt_in,
    (COALESCE(a.completed_count, (0)::bigint) = 1) AS seg_first_time,
    (COALESCE(a.completed_count, (0)::bigint) >= 2) AS seg_repeat,
    (COALESCE(a.completed_spend, (0)::numeric) >= COALESCE(( SELECT (app_config.value)::numeric AS value
           FROM app_config
          WHERE (app_config.key = 'high_value_spend'::text)), (300)::numeric)) AS seg_high_value,
    ((a.last_completed_for IS NOT NULL) AND (a.last_completed_for < (((now() AT TIME ZONE 'Pacific/Fiji'::text))::date - COALESCE(( SELECT (app_config.value)::integer AS value
           FROM app_config
          WHERE (app_config.key = 'inactive_days'::text)), 180)))) AS seg_inactive,
    COALESCE(a.birthday_buyer, false) AS seg_birthday_buyer,
    (COALESCE(a.upcoming_count, (0)::bigint) > 0) AS seg_upcoming_order,
    ((c.phone_key ~~ '679%'::text) AND (oc.next_occasion_date IS NOT NULL) AND (COALESCE(a.upcoming_count, (0)::bigint) = 0) AND ((oc.next_occasion_date - ( SELECT lead.days
           FROM lead)) <= (((now() AT TIME ZONE 'Pacific/Fiji'::text))::date + ( SELECT lead.win
           FROM lead)))) AS seg_upcoming_occasion,
    c.is_corporate AS seg_corporate,
    oc.retarget_reason,
    GREATEST((oc.next_occasion_date - ( SELECT lead.days
           FROM lead)), ((now() AT TIME ZONE 'Pacific/Fiji'::text))::date) AS contact_on,
    (c.phone_key !~~ '679%'::text) AS is_overseas
   FROM (((customers c
     LEFT JOIN agg a ON ((a.customer_id = c.id)))
     LEFT JOIN occ oc ON ((oc.customer_id = c.id)))
     LEFT JOIN cons cn ON ((cn.customer_id = c.id)));