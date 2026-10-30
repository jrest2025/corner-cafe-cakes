do $m$ declare d text; begin
select pg_get_functiondef('public._delivery_check(uuid,text,text,text,numeric,text)'::regprocedure) into d;
if strpos(d,'v_fee := round(coalesce(z.fee, p_fee), 2);')=0 then raise exception 'Delivery helper changed'; end if;
execute replace(d,'v_fee := round(coalesce(z.fee, p_fee), 2);','v_fee := round(case when p_fee=0 and auth.uid() is not null and (public.has_perm(''ord.create'') or public.has_perm(''ord.edit'')) then 0 else coalesce(z.fee,p_fee) end, 2);');
select pg_get_functiondef('public.staff_create_order(jsonb)'::regprocedure) into d;
if strpos(d,'v_res := public._create_order(p, v_src, auth.uid(), v_name);')=0 or strpos(d,'v_oid := (v_res->>''order_id'')::uuid;')=0 then raise exception 'Staff order changed'; end if;
d:=replace(d,'v_res := public._create_order(p, v_src, auth.uid(), v_name);',
'if p->''delivery''->>''method'' = ''delivery'' and p->''delivery''->>''fee'' = ''0'' and length(trim(coalesce(p->''delivery''->>''waiver_reason'', ''''))) < 3 then return public._err(''fee'', ''Give a reason for complimentary delivery.'', ''fee''); end if;'||chr(10)||'  v_res := public._create_order(p, v_src, auth.uid(), v_name);');
d:=replace(d,'v_oid := (v_res->>''order_id'')::uuid;',
'v_oid := (v_res->>''order_id'')::uuid;'||chr(10)||
'    if p->''delivery''->>''method'' = ''delivery'' and p->''delivery''->>''fee'' = ''0'' then perform public._log(v_oid,auth.uid(),v_name,''delivery_waived'',jsonb_build_object(''zone'',p->''delivery''->>''zone'',''reason'',trim(p->''delivery''->>''waiver_reason''),''standard_fee'',(select z.fee from public.delivery_zones z join public.orders o on o.location_id=z.location_id where o.id=v_oid and z.name=p->''delivery''->>''zone''))); end if;');
execute d;
end $m$;
create function public.staff_set_fulfilment_with_waiver(p_order uuid,p_version integer,p_method text,p_zone text default null,p_address text default null,p_fee numeric default null,p_contact text default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public' as $f$
declare r jsonb; n text; normal_fee numeric;
begin
if auth.uid() is null or not public.has_perm('ord.edit') then return public._err('forbidden','Not authorized.'); end if;
if p_method is distinct from 'delivery' or p_fee is distinct from 0 then return public._err('fee','Choose complimentary delivery.'); end if;
if length(trim(coalesce(p_reason,''))) < 3 or length(p_reason)>200 then return public._err('fee','Give a short reason for complimentary delivery.','fee'); end if;
select z.fee into normal_fee from public.delivery_zones z join public.orders o on o.location_id=z.location_id where o.id=p_order and z.name=p_zone and z.active;
if normal_fee is null then return public._err('zone','Choose a valid delivery area.'); end if;
r:=public.staff_set_fulfilment(p_order,p_version,p_method,p_zone,p_address,p_fee,p_contact);
if coalesce((r->>'ok')::boolean,false) then
select full_name into n from public.staff_profiles where user_id=auth.uid();
perform public._log(p_order,auth.uid(),n,'delivery_waived',jsonb_build_object('zone',p_zone,'standard_fee',normal_fee,'reason',trim(p_reason)));
end if;
return r;
end $f$;
revoke all on function public.staff_set_fulfilment_with_waiver(uuid,integer,text,text,text,numeric,text,text) from public,anon;
grant execute on function public.staff_set_fulfilment_with_waiver(uuid,integer,text,text,text,numeric,text,text) to authenticated;