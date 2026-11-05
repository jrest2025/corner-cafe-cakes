-- Corner Café cakes: Copy of customer emails takes up to 10 addresses (was three). 5 November 2026, approved by Roneel.
-- Only the save check changes; reading, permissions and the audit record are unchanged.

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
