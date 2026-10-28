-- Analytics feed: add 'rush' (short-notice order a manager said yes to) to each record (26 October 2026).
-- Used by the "By booking time" view to mark those days. One extra key; nothing else in the feed changes.
do $mig$
declare d text; n text;
begin
  d := pg_get_functiondef('public.dashboard_register()'::regprocedure);
  n := replace(d, $a$'cmp', o.campaign,$a$, $b$'cmp', o.campaign, 'rush', coalesce(o.rush_override, false),$b$);
  if n = d or (length(n) - length(replace(n, $c$'rush', coalesce(o.rush_override, false)$c$, ''))) <> length($c$'rush', coalesce(o.rush_override, false)$c$) then
    raise exception 'dashboard_register has changed; rush not added';
  end if;
  execute n;
end $mig$;
