-- Website: customers can ask for a custom cake that is not on the menu, like staff can at the counter.
-- It always arrives as Needs a price (the website can never set a price). Staff add the price, email it, and confirm as usual.
-- Edits two lines inside _create_order in place; everything else in that function stays exactly as it is now.
-- The block stops with an error and changes nothing if either line is not found.
-- No tables, columns or data change. Rollback: run the same block with the replacements the other way round.

do $migrate$
declare d text;
  a_old text := $x$v_req := v_staff and p->>'product_code' = 'custom-cake';$x$;
  a_new text := $x$v_req := p->>'product_code' = 'custom-cake';  -- staff and website$x$;
  b_old text := $x$v_price := round(nullif(p->>'price', '')::numeric, 2);$x$;
  b_new text := $x$v_price := case when v_staff then round(nullif(p->>'price', '')::numeric, 2) end;  -- the website never sets a price$x$;
begin
  d := pg_get_functiondef('public._create_order(jsonb, order_source, uuid, text)'::regprocedure);
  if position(a_old in d) = 0 then raise exception 'Line 1 not found: nothing changed'; end if;
  if position(b_old in d) = 0 then raise exception 'Line 2 not found: nothing changed'; end if;
  d := replace(replace(d, a_old, a_new), b_old, b_new);
  execute d;
end
$migrate$;
