-- Applied 17 Oct 2026 (approved by Roneel): the order and Change order functions accept the new allergy names
-- (Nuts, Gluten (coeliac), Dairy, Egg, Other) as well as the old ones. Since the 10:26 AM publish they refused the new names.
do $$ declare d text; f regprocedure; begin
  foreach f in array array['public._create_order(jsonb,order_source,uuid,text)'::regprocedure,
                           (select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'staff_amend_order')] loop
    d := pg_get_functiondef(f);
    d := replace(d, $q$('Vegetarian (eggless)','Gluten-free','Nut allergy','Other')$q$, $q$('Nuts','Gluten (coeliac)','Dairy','Egg','Other','Vegetarian (eggless)','Gluten-free','Nut allergy')$q$);
    execute d;
  end loop;
end $$;
