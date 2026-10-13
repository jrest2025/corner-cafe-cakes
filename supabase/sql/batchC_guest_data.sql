-- Batch C: capture guest data when taking an order, and a reminders list for bringing guests back.
alter table public.orders add column if not exists heard_from text;
alter table public.orders add column if not exists occasion_for text;
alter table public.orders add column if not exists occasion_date date;
alter table public.orders add constraint orders_heard_from_chk check (heard_from is null or heard_from in ('facebook','instagram','google','friend','walked_past','returning','other')) not valid;
alter table public.orders validate constraint orders_heard_from_chk;
alter table public.orders add constraint orders_occasion_for_len check (occasion_for is null or length(occasion_for) <= 60) not valid;
alter table public.orders validate constraint orders_occasion_for_len;

-- Reminders sent by staff (by hand, on WhatsApp); stops the same guest being reminded twice for one occasion
create table if not exists public.customer_reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  occasion_date date not null,
  channel text not null default 'whatsapp',
  sent_by uuid, sent_by_label text,
  sent_at timestamptz not null default now(),
  unique (customer_id, occasion_date)
);
alter table public.customer_reminders enable row level security;
create policy staff_read_reminders on public.customer_reminders for select to authenticated using (public.has_role('manager','front_of_house','marketing'));

-- Occasion dates: use the celebration date given at the counter when there is one, otherwise the pickup date (as before);
-- the reason shown to staff names whose occasion it is.
do $do$
declare d text := pg_get_viewdef('public.customer_summary'::regclass); d2 text;
begin
  d2 := replace(d, 'i.cake_message
           FROM (orders o', 'i.cake_message,
            o.occasion_date,
            o.occasion_for
           FROM (orders o');
  if d2 = d then raise exception 'customer_summary: order columns not found'; end if;
  d := d2; d2 := replace(d, '_next_occasion(o.occasion, o.required_date,', '_next_occasion(o.occasion, COALESCE(o.occasion_date, o.required_date),');
  if d2 = d then raise exception 'customer_summary: occasion date not found'; end if;
  d := d2; d2 := replace(d, 'ELSE ''''::text
                END) AS retarget_reason', 'ELSE ''''::text
                END || CASE WHEN (o.occasion_for IS NOT NULL) THEN ('' for ''::text || o.occasion_for) ELSE ''''::text END) AS retarget_reason');
  if d2 = d then raise exception 'customer_summary: reason not found'; end if;
  execute 'create or replace view public.customer_summary with (security_invoker = true) as ' || d2;
end $do$;

-- Taking an order also records how they heard about us, whose occasion it is and its date,
-- and, for an existing guest asked at the counter, their answer about offers and reminders.
create or replace function public.staff_create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare v_src public.order_source; v_name text; v_res jsonb; v_by text; v_candles text; v_heard text; v_ofor text; v_odate date; v_oid uuid;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  v_src := coalesce(nullif(p->>'source', ''), 'walk_in')::public.order_source;
  if v_src = 'online' then v_src := 'walk_in'; end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_by := nullif(trim(coalesce(p->'rush'->>'approved_by', '')), '');
  if jsonb_typeof(p->'rush') = 'object' and (v_by is null or length(v_by) < 2) then
    return public._err('date', 'Enter who approved the short notice.', 'date');
  end if;
  if p->>'has_dietary' = 'yes' then
    if coalesce(jsonb_array_length(case when jsonb_typeof(p->'dietary') = 'array' then p->'dietary' end), 0) = 0
       and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet');
    end if;
    if jsonb_typeof(p->'dietary') = 'array' and p->'dietary' ? 'Other' and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet');
    end if;
  end if;
  v_candles := nullif(trim(coalesce(p->>'candles', '')), '');
  if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
  v_heard := nullif(p->>'heard_from', '');
  if v_heard is not null and v_heard not in ('facebook','instagram','google','friend','walked_past','returning','other') then return public._err('heard_from', 'Unknown answer for how they heard about us.'); end if;
  v_ofor := nullif(trim(coalesce(p->>'occasion_for', '')), '');
  if length(coalesce(v_ofor, '')) > 60 then return public._err('occasion_for', 'Keep the name to 60 characters.', 'occasion'); end if;
  if nullif(p->>'occasion_date', '') is not null then
    if p->>'occasion_date' !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('occasion_date', 'Check the occasion date.', 'occasion'); end if;
    v_odate := (p->>'occasion_date')::date;
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);
  if coalesce((v_res->>'ok')::boolean, false) and not coalesce((v_res->>'duplicate')::boolean, false) then
    v_oid := (v_res->>'order_id')::uuid;
    if v_by is not null then
      update public.orders set rush_approved_by = v_by where id = v_oid and rush_override;
      if found then
        perform public._log(v_oid, auth.uid(), v_name, 'rush_approved',
          jsonb_build_object('approved_by', v_by, 'reason', (select rush_reason from public.orders where id = v_oid)));
      end if;
    end if;
    if v_candles is not null then update public.order_items set candles = v_candles where order_id = v_oid; end if;
    if v_heard is not null or v_ofor is not null or v_odate is not null then
      update public.orders set heard_from = v_heard, occasion_for = v_ofor, occasion_date = v_odate where id = v_oid;
    end if;
    if nullif(p->>'customer_id', '') is not null and p->>'consent' in ('yes', 'no') then
      perform public.staff_set_consent((p->>'customer_id')::uuid, p->>'consent' = 'yes', 'Asked when taking order ' || coalesce(v_res->>'reference', ''));
    end if;
  end if;
  return v_res;
exception when invalid_text_representation then return public._err('bad_input', 'Unknown order source.');
end $function$;

-- Reminders due: guests who agreed to messages and whose occasion is coming up, not yet reminded for it
create or replace function public.staff_reminders_due()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot see reminders.'); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name, 'phone', s.phone, 'date', s.next_occasion_date, 'reason', s.retarget_reason,
           'cake', s.favourite_cake, 'reconfirm', s.consent_reconfirm) order by s.next_occasion_date, s.full_name)
    from (select * from public.customer_summary x
          where x.seg_upcoming_occasion and x.marketing_opt_in
            and not exists (select 1 from public.customer_reminders r where r.customer_id = x.id and r.occasion_date = x.next_occasion_date)
          order by x.next_occasion_date limit 200) s), '[]'));
end $$;

create or replace function public.staff_mark_reminded(p_customer uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot record reminders.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  insert into public.customer_reminders (customer_id, occasion_date, sent_by, sent_by_label) values (p_customer, p_date, auth.uid(), v_name)
  on conflict (customer_id, occasion_date) do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.staff_reminders_due(), public.staff_mark_reminded(uuid, date) from public, anon;
grant execute on function public.staff_reminders_due(), public.staff_mark_reminded(uuid, date) to authenticated;
