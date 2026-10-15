-- Staff and admin functions: only logged-in users can call them.
-- Before this, these functions could also be called by anyone with the public website key (each one still checked the staff role inside,
-- so nothing could be changed, but they should not be reachable at all without a login).
-- Permissions only: no tables, columns or data change. The staff app keeps working because logged-in staff keep access.
-- The guest website functions (get_catalogue, get_order_setup, submit_online_order, log_catalogue_generation) are not touched.
-- Rollback: grant execute on function ... to public; for each line below.

revoke execute on function public.staff_set_quote(uuid, integer, numeric, text, text) from public, anon;
revoke execute on function public.staff_send_quote(uuid) from public, anon;
revoke execute on function public.staff_remove_photo(uuid) from public, anon;
revoke execute on function public.staff_resend_email(uuid) from public, anon;
revoke execute on function public.staff_order_emails(uuid) from public, anon;
revoke execute on function public.admin_level_delete(uuid) from public, anon;
revoke execute on function public.admin_level_save(uuid, text, text[]) from public, anon;
revoke execute on function public.admin_levels() from public, anon;
revoke execute on function public.admin_list_team() from public, anon;
revoke execute on function public.admin_set_staff_level(uuid, text, uuid, boolean) from public, anon;
revoke execute on function public.my_access() from public, anon;

grant execute on function public.staff_set_quote(uuid, integer, numeric, text, text) to authenticated;
grant execute on function public.staff_send_quote(uuid) to authenticated;
grant execute on function public.staff_remove_photo(uuid) to authenticated;
grant execute on function public.staff_resend_email(uuid) to authenticated;
grant execute on function public.staff_order_emails(uuid) to authenticated;
grant execute on function public.admin_level_delete(uuid) to authenticated;
grant execute on function public.admin_level_save(uuid, text, text[]) to authenticated;
grant execute on function public.admin_levels() to authenticated;
grant execute on function public.admin_list_team() to authenticated;
grant execute on function public.admin_set_staff_level(uuid, text, uuid, boolean) to authenticated;
grant execute on function public.my_access() to authenticated;
