-- Release B (Settings audit, 28 Oct 2026). PREVIEW: applied only when Roneel says "deploy".
-- 1. get_order_setup also returns the occasion list from Settings (additive: older app versions ignore it).
-- 2. Settings values, as agreed: first collection 8 AM; Baby shower and Graduation shown on the order forms and
--    Birthday first, so both forms keep today's choices in today's order.
-- Rollback: supabase/sql/release_b_20261028_rollback.sql
do $m$
declare d text; n text;
begin
  d := pg_get_functiondef('public.get_order_setup(text)'::regprocedure);
  if md5(d) <> 'ce0e47209b857d155c5926f1ea977dd6' then raise exception 'get_order_setup changed since review'; end if;
  n := replace(d, $a$    'ok', true, 'delivery_zones',$a$, $b$    'ok', true,
    'occasions', coalesce((select jsonb_agg(jsonb_build_object('code', o.code, 'label', o.label) order by o.sort, o.label)
      from public.occasions o where o.active and o.featured and o.archived_at is null and o.merged_into is null and o.code <> 'not_specified'), '[]'),
    'delivery_zones',$b$);
  if n = d then raise exception 'get_order_setup anchor not found'; end if;
  execute n;
end $m$;

update public.locations set collection_open = time '08:00' where code = 'corner-cafe' and collection_open = time '09:00';
update public.occasions set featured = true where code in ('baby_shower', 'graduation') and not featured;
update public.occasions set sort = 5 where code = 'birthday' and sort = 20;
