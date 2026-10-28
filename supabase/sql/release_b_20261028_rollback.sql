-- Rollback for release_b_20261028.sql
do $m$
declare d text; n text;
begin
  d := pg_get_functiondef('public.get_order_setup(text)'::regprocedure);
  n := regexp_replace(d, $r$\n    'occasions', coalesce\(\(select jsonb_agg\(jsonb_build_object\('code', o\.code, 'label', o\.label\).*?'\[\]'\),\n    'delivery_zones',$r$, $s$ 'delivery_zones',$s$);
  if n = d then raise exception 'occasions block not found'; end if;
  execute n;
end $m$;
update public.locations set collection_open = time '09:00' where code = 'corner-cafe' and collection_open = time '08:00';
update public.occasions set featured = false where code in ('baby_shower', 'graduation');
update public.occasions set sort = 20 where code = 'birthday' and sort = 5;
