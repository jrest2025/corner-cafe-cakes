-- Rollback for release_c_20261028.sql. The history already recorded is kept (audit_log is never deleted).
drop function if exists public.settings_restore(bigint);
drop function if exists public.settings_history(text, bigint, int);
drop function if exists public._settings_item(text, jsonb);
drop function if exists public._settings_area(text);
drop trigger if exists t_audit_promo_cards on public.promo_cards;
drop trigger if exists t_audit_calendar_events on public.calendar_events;
drop trigger if exists t_audit_catalogue_items on public.catalogue_items;
drop trigger if exists t_audit_catalogue_item_options on public.catalogue_item_options;
create or replace function public.write_audit()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'user_id'),
          lower(tg_op),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $function$;
