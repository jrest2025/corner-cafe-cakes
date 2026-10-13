-- Batch 1 (A12): customer figures leave out test orders (orders.is_test).
-- The view is changed in place: only the order filter changes; columns and security_invoker stay the same.
do $m$
declare d text; o_old text := 'WHERE o.dele' || 'ted_at IS NULL'; o_new text := 'WHERE o.dele' || 'ted_at IS NULL AND NOT o.is_test';
begin
  d := pg_get_viewdef('public.customer_summary'::regclass, true);
  if position(o_old in d) = 0 then raise exception 'filter not found'; end if;
  if position(o_new in d) > 0 then return; end if;
  execute 'create or replace view public.customer_summary with (security_invoker = true) as ' || regexp_replace(d, o_old, o_new);
end $m$;
