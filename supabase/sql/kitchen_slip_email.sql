-- Kitchen slip PDF emailed to the printer PC when staff print a new slip version. Additive only. Applied 14 Oct 2026.
insert into public.app_config (key, value) values ('kitchen_slip_email', 'roneel@jacksfiji.com') on conflict (key) do nothing;

create or replace function public.queue_kitchen_slip_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_to text; v_ref text; v_ok boolean;
begin
  v_to := nullif(trim((select value from public.app_config where key = 'kitchen_slip_email')), '');
  if v_to is null then return null; end if;
  select reference into v_ref from public.orders where id = new.order_id;
  v_ok := coalesce(v_ref ~ '^[A-Z]{1,4}-[0-9]{3,}$', false);
  -- One email per order and slip version: reprints of the same version are not sent again
  insert into public.email_outbox (order_id, kind, to_email, dedupe_key, status, last_error, attempts)
  values (new.order_id, 'kitchen_slip', v_to, 'kitchen_slip:' || new.order_id::text || ':v' || new.version,
          case when v_ok then 'pending' else 'failed' end,
          case when v_ok then null else 'No valid order number: slip not sent. Fix the order, then print again.' end,
          case when v_ok then 0 else 5 end)
  on conflict (dedupe_key) do nothing;
  return null;
end $$;
revoke all on function public.queue_kitchen_slip_email() from public, anon, authenticated;

create trigger t_kitchen_slip_email after insert on public.kitchen_briefs
  for each row execute function public.queue_kitchen_slip_email();
