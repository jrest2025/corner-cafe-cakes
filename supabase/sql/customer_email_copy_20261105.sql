-- Corner Café cakes: team copy of every customer email (5 November 2026, scope approved by Roneel).
-- Settings, Copy of customer emails: up to 10 addresses (raised from three the same day), admins only, every change recorded in the audit log.
-- The email sender sends each customer email exactly as before, then a separate copy to these addresses, so the customer
-- never sees them. Empty means no copies (the starting state). Nothing else changes.
-- Runs as one block: if any step fails, nothing is changed.

insert into public.app_config (key, value) values ('guest_email_copy', '') on conflict (key) do nothing;

-- Read (admins only): the addresses and who last changed them
create or replace function public.admin_email_copy() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $f$
declare v_last jsonb;
begin
  if auth.uid() is null or not public.has_perm('mgmt.system') then return public._err('forbidden', 'Only an admin can see this setting.'); end if;
  select jsonb_build_object('at', a.at, 'by', coalesce(sp.full_name, '')) into v_last
    from public.audit_log a left join public.staff_profiles sp on sp.user_id = a.actor_id
    where a.table_name = 'app_config' and a.row_id = 'customer_email_copy' order by a.at desc limit 1;
  return jsonb_build_object('ok', true, 'emails', coalesce((select value from public.app_config where key = 'guest_email_copy'), ''), 'last', v_last);
end $f$;

-- Save (admins only), with an audit record of the old and new addresses
create or replace function public.admin_email_copy_save(p_emails text) returns jsonb
language plpgsql security definer set search_path to 'public' as $f$
declare v_list text[]; v_new text; v_old text; e text; re text := '^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$';
begin
  if auth.uid() is null or not public.has_perm('mgmt.system') then return public._err('forbidden', 'Only an admin can change this setting.'); end if;
  select coalesce(array_agg(distinct x), '{}') into v_list
    from unnest(regexp_split_to_array(lower(trim(coalesce(p_emails, ''))), '[\s,;]+')) x where x <> '';
  if array_length(v_list, 1) > 10 then return public._err('emails', 'Use up to 10 email addresses.', 'emails'); end if;
  foreach e in array v_list loop
    if e !~ re then return public._err('emails', e || ' does not look like an email address.', 'emails'); end if;
  end loop;
  v_new := array_to_string(v_list, ', ');
  v_old := coalesce((select value from public.app_config where key = 'guest_email_copy'), '');
  if v_new is distinct from v_old then
    insert into public.app_config (key, value) values ('guest_email_copy', v_new) on conflict (key) do update set value = excluded.value;
    insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor_id)
      values ('app_config', 'customer_email_copy', 'update', jsonb_build_object('emails', v_old), jsonb_build_object('emails', v_new), auth.uid());
  end if;
  return public.admin_email_copy();
end $f$;

revoke all on function public.admin_email_copy() from public, anon;
revoke all on function public.admin_email_copy_save(text) from public, anon;
grant execute on function public.admin_email_copy() to authenticated;
grant execute on function public.admin_email_copy_save(text) to authenticated;
