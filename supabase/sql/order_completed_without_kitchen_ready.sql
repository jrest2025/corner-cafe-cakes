-- 17 Oct 2026 (applied live): "Order completed" no longer waits for the kitchen to mark the cake Ready.
-- Removes only the kitchen Ready check from staff_order_action('collected'). Payment in full and
-- "who received the cake" are still required. Completing still sets production_status = 'ready'.
do $$
declare d text; n text; oid_ regprocedure := 'public.staff_order_action(uuid,text,integer,numeric,numeric,text)'::regprocedure;
begin
  d := pg_get_functiondef(oid_);
  n := regexp_replace(d, E'\\n\\s*if o\\.production_status <> ''ready'' then return public\\._err\\(''stage'', ''The kitchen has not marked this cake Ready yet\\. The quality check comes first\\.''\\); end if;', '');
  if n = d then raise exception 'Ready check not found, nothing changed'; end if;
  execute n;
end $$;
