-- Corner Cafe cakes: database times read "3:00 PM" (was "3:00pm" / "3:00 pm").
-- One atomic, self-checking block. If any check fails, nothing changes.
do $$
declare
  r record; d text; n text; changed int := 0;
begin
  for r in
    select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('_fmt_time','_t12','_create_order','staff_order_action','admin_print_test_confirm')
  loop
    d := pg_get_functiondef(r.oid);
    n := d;
    n := replace(n, $q$ltrim(to_char(t, 'FMHH12:MI'), '0') || case when t < '12:00' then 'am' else 'pm' end$q$,
                    $q$to_char(t, 'FMHH12:MI') || case when t < '12:00' then ' AM' else ' PM' end$q$);
    n := replace(n, $q$ltrim(to_char(t, 'FMHH12:MI'), '0') || lower(to_char(t, 'am'))$q$,
                    $q$to_char(t, 'FMHH12:MI') || case when t < '12:00' then ' AM' else ' PM' end$q$);
    n := replace(n, $q$lower(to_char(loc.collection_open, 'FMHH12:MI AM'))$q$, $q$to_char(loc.collection_open, 'FMHH12:MI AM')$q$);
    n := replace(n, $q$lower(to_char(loc.collection_close, 'FMHH12:MI AM'))$q$, $q$to_char(loc.collection_close, 'FMHH12:MI AM')$q$);
    n := replace(n, $q$'DD Mon FMHH12:MIam'$q$, $q$'DD Mon FMHH12:MI AM'$q$);
    if n <> d then execute n; changed := changed + 1; end if;
  end loop;

  -- checks
  if changed <> 5 then raise exception 'Expected 5 functions changed, got %', changed; end if;
  if public._t12('15:00') <> '3:00 PM' then raise exception '_t12 gave %', public._t12('15:00'); end if;
  if public._t12('09:30') <> '9:30 AM' then raise exception '_t12 gave %', public._t12('09:30'); end if;
  if public._t12('12:00') <> '12:00 PM' then raise exception '_t12 noon gave %', public._t12('12:00'); end if;
  if public._t12(null) <> '' then raise exception '_t12 null not empty'; end if;
  if public._fmt_time('15:00') <> '3:00 PM' then raise exception '_fmt_time gave %', public._fmt_time('15:00'); end if;
  if public._fmt_time('00:15') <> '12:15 AM' then raise exception '_fmt_time midnight gave %', public._fmt_time('00:15'); end if;
  if exists (
    select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.prokind = 'f'
      and (pg_get_functiondef(p.oid) like '%FMHH12:MIam%' or pg_get_functiondef(p.oid) like '%lower(to_char(loc.collection_%')
  ) then raise exception 'Lowercase time text still present'; end if;

  raise notice 'times_ampm: 5 functions now give times like 3:00 PM';
end $$;
