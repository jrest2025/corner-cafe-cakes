-- Batch 1 (A1): dietary "Yes" needs a named need or written details; "Other" always needs written details.
-- Staff create: checked in the wrapper before the order is made. Sheet imports and guest orders are not affected.
-- Staff amend: the existing check is tightened in place.
do $m$
declare d text; o_old text; o_new text;
begin
  -- Amend
  select pg_get_functiondef('public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)'::regprocedure) into d;
  o_old := $q$if n_hasdiet and cardinality(n_diet) = 0 and n_dnote is null then return public._err('diet', 'Say which dietary need or allergy applies.', 'diet'); end if;$q$;
  o_new := $q$if n_hasdiet and cardinality(n_diet) = 0 and length(coalesce(n_dnote, '')) < 3 then return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet'); end if;
  if n_hasdiet and 'Other' = any(n_diet) and length(coalesce(n_dnote, '')) < 3 then return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet'); end if;$q$;
  if position(o_old in d) = 0 then raise exception 'amend check not found'; end if;
  execute replace(d, o_old, o_new);

  -- Create
  select pg_get_functiondef('public.staff_create_order(jsonb)'::regprocedure) into d;
  o_old := $q$  v_res := public._create_order(p, v_src, auth.uid(), v_name);$q$;
  o_new := $q$  if p->>'has_dietary' = 'yes' then
    if coalesce(jsonb_array_length(case when jsonb_typeof(p->'dietary') = 'array' then p->'dietary' end), 0) = 0
       and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet');
    end if;
    if jsonb_typeof(p->'dietary') = 'array' and p->'dietary' ? 'Other' and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet');
    end if;
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);$q$;
  if position(o_old in d) = 0 then raise exception 'create call not found'; end if;
  execute replace(d, o_old, o_new);
end $m$;
