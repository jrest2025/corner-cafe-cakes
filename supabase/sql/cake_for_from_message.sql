-- Cake for, from the cake message (18 October 2026).
-- Online orders ask no extra questions. For Birthday, Anniversary and Wedding orders the occasion date
-- defaults to the collection date, and "who the cake is for" is read from the cake message
-- ("Happy Birthday Mere" -> Mere). Staff can correct it on the order; every correction is logged.
-- Nothing here overwrites a name or date that staff or a guest already entered.

alter table public.orders add column if not exists occasion_for_from_message boolean not null default false;

-- Reads a name out of a cake message. Returns null when there is no clear name.
create or replace function public.cc_cake_for(p_msg text)
returns text language plpgsql immutable set search_path to 'public' as $$
declare
  m text := btrim(regexp_replace(coalesce(p_msg, ''), '\s+', ' ', 'g'));
  n text;
begin
  if m = '' then return null; end if;
  -- First sentence only: stop at a full stop, exclamation mark, line break or comma-style break.
  m := btrim(split_part(regexp_replace(m, '[.!?\n]+', '|', 'g'), '|', 1));
  -- "Happy (6th) Birthday (dear) Name", "Happy Anniversary Name", "Happy 3rd year birthday Name"
  n := substring(m from '(?i)^hap+(?:y|iest)\s+(?:(?:\d+\s*(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|sweet\s+\d+)\s+)?(?:years?\s+)?(?:birthday|bithday|birthdy|bday|b''day|anniversary|wedding\s+day)\s*,?\s*(?:to\s+)?(?:dear\s+|our\s+|my\s+)?(.+)$');
  -- "Happy 70th Nanna", "Happy 50th Roneeta"
  if n is null then n := substring(m from '(?i)^happy\s+\d+\s*(?:st|nd|rd|th)?\s+(.+)$'); end if;
  -- "HBD Raj", "HB Mere"
  if n is null then n := substring(m from '(?i)^h\.?b\.?d?\.?\s+(.+)$'); end if;
  if n is null then return null; end if;
  -- Keep just the name: stop at a comma, a dash, or a sign-off ("Mere, love Mum", "Mere - from us").
  -- Drop hearts and decorations ("*heart*", "<3", emoji) before reading the name.
  n := btrim(regexp_replace(regexp_replace(n, '\*[^*]*\*?|<3|[^[:alpha:][:space:]&/,''.-]+', ' ', 'g'), '\s+', ' ', 'g'));
  n := split_part(split_part(n, ',', 1), ' - ', 1);
  n := regexp_replace(n, '(?i)\s+(love|from|with|xo+|lots|we\s+love)\y.*$', '');
  n := btrim(regexp_replace(n, '[\s,;:~*\-]+$', ''));
  -- Not a name: empty, too long, or a generic ending.
  if n = '' or length(n) > 40 or array_length(regexp_split_to_array(n, '\s+'), 1) > 4 then return null; end if;
  if n ~* '^(to you|you|all|everyone|and|from|with|love|year|years|birthday|anniversary)\y' then return null; end if;
  if n ~ '^[0-9]' or n ~* '^(anniv|birth|bday|bithday|birthdy|wedding)' then return null; end if;
  -- ALL CAPS becomes Title Case; anything else keeps the guest's spelling.
  if n = upper(n) or n = lower(n) then n := initcap(lower(n)); end if;
  return n;
end $$;

-- After an item is saved: fill the occasion date and the name when they are empty.
create or replace function public._fill_cake_for()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_name text;
begin
  if coalesce(new.occasion_code, '') not in ('birthday', 'anniversary', 'wedding') then return new; end if;
  v_name := public.cc_cake_for(new.cake_message);
  update public.orders o set
    occasion_date = coalesce(o.occasion_date, o.required_date),
    occasion_for = case when nullif(btrim(coalesce(o.occasion_for, '')), '') is null and v_name is not null then v_name else o.occasion_for end,
    occasion_for_from_message = case when nullif(btrim(coalesce(o.occasion_for, '')), '') is null and v_name is not null then true else o.occasion_for_from_message end
  where o.id = new.order_id
    and (o.occasion_date is null or (nullif(btrim(coalesce(o.occasion_for, '')), '') is null and v_name is not null))
    -- Once staff have set or cleared the name themselves, it is never filled in again.
    and not exists (select 1 from public.order_events e where e.order_id = o.id and e.kind = 'cake_for_changed');
  return new;
end $$;

drop trigger if exists t_order_items_cake_for on public.order_items;
create trigger t_order_items_cake_for after insert on public.order_items
  for each row execute function public._fill_cake_for();

-- Staff correction: one field, permission-checked, logged in the order history.
create or replace function public.staff_set_cake_for(p_order uuid, p_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_name text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
  v_who text := coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff');
  v_old text;
begin
  if not public.has_perm('ord.edit') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change orders.'); end if;
  if v_name is not null and length(v_name) > 60 then return jsonb_build_object('ok', false, 'message', 'Keep the name under 60 characters.'); end if;
  select occasion_for into v_old from public.orders where id = p_order and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'That order no longer exists. Refresh the page.'); end if;
  if v_old is not distinct from v_name then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  update public.orders set occasion_for = v_name, occasion_for_from_message = false where id = p_order;
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail)
  values (p_order, auth.uid(), v_who, 'cake_for_changed', jsonb_build_object('from', v_old, 'to', v_name));
  return jsonb_build_object('ok', true, 'name', v_name);
end $$;

revoke all on function public.cc_cake_for(text) from public, anon;
revoke all on function public._fill_cake_for() from public, anon, authenticated;
revoke all on function public.staff_set_cake_for(uuid, text) from public, anon;
grant execute on function public.cc_cake_for(text) to authenticated;
grant execute on function public.staff_set_cake_for(uuid, text) to authenticated;
