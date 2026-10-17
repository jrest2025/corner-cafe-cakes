-- Administrator Settings removal. Orders/payments are never deleted by this API.
create schema if not exists staff_config_api;
revoke all on schema staff_config_api from public, anon;
grant usage on schema staff_config_api to authenticated;
create table if not exists staff_config_api.removal_log (
 id uuid primary key default gen_random_uuid(),
 kind text not null, entry_id uuid not null, removed_by uuid not null,
 removed_at timestamptz not null default now(), snapshot jsonb not null
);
alter table staff_config_api.removal_log enable row level security;
revoke all on staff_config_api.removal_log from public, anon, authenticated;

create or replace function staff_config_api.remove_setting(p_kind text,p_id uuid,p_expected text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_table text; r jsonb; v_name text; v_product public.products; v_code text; v_before jsonb; v_count int;
begin
 if auth.uid() is null or not public.has_role('admin'::public.staff_role) then
  return jsonb_build_object('ok',false,'message','Only an administrator can remove Settings entries.');
 end if;
 v_table := case p_kind when 'cake' then 'products' when 'size' then 'product_sizes' when 'flavour' then 'product_variants' when 'area' then 'delivery_zones' when 'closed' then 'closed_dates' when 'occasion' then 'occasions' when 'date' then 'occasion_dates' end;
 if v_table is null or p_id is null then return jsonb_build_object('ok',false,'message','Choose a valid Settings entry.'); end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table) into r using p_id;
 if r is null then return jsonb_build_object('ok',false,'message','This entry was already removed. Refresh Settings.'); end if;
 v_name:=coalesce(r->>'name',r->>'label',r->>'closed_on',r->>'starts_on',r->>'size_inch');
 if p_expected is distinct from v_name then return jsonb_build_object('ok',false,'message','This entry has changed. Refresh Settings and check it again.'); end if;
 v_before:=r;
 if p_kind='cake' then
  if r->>'code'='custom' then return jsonb_build_object('ok',false,'message','The custom cake entry is needed for custom orders. Take it off sale instead.'); end if;
  if exists(select 1 from public.order_items where product_id=p_id) or exists(select 1 from public.catalogue_items where product_id=p_id) then return jsonb_build_object('ok',false,'message','This cake is used by orders or a catalogue. Open its edit screen and take it off sale instead.'); end if;
  v_before:=r||jsonb_build_object('sizes',(select jsonb_agg(to_jsonb(s)) from public.product_sizes s where product_id=p_id),'flavours',(select jsonb_agg(to_jsonb(s)) from public.product_variants s where product_id=p_id),'changes',(select jsonb_agg(to_jsonb(s)) from public.product_changes s where product_id=p_id));
  delete from public.product_changes where product_id=p_id;
 elsif p_kind in ('size','flavour') then
  select * into v_product from public.products where id=(r->>'product_id')::uuid for update;
  if exists(select 1 from public.catalogue_items where product_id=v_product.id) or exists(select 1 from public.order_items i where i.product_id=v_product.id and (p_kind='size' and i.size_inch=(r->>'size_inch')::int or p_kind='flavour' and lower(trim(i.variant))=lower(trim(r->>'name')))) then
   return jsonb_build_object('ok',false,'message','This option is used by orders or a catalogue. Open the cake and turn off Offered for this option instead.');
  end if;
  if p_kind='size' and (r->>'active')::boolean and v_product.status='active' and (select count(*) from public.product_sizes where product_id=v_product.id and active)<=1 then
   return jsonb_build_object('ok',false,'message','This is the last offered size. Take the cake off sale or add another size first.');
  end if;
 elsif p_kind='area' then
  if exists(select 1 from public.orders where delivery_zone=r->>'name') then return jsonb_build_object('ok',false,'message','This area is used by orders. Turn off Offered in Delivery areas instead.'); end if;
 elsif p_kind='occasion' then
  v_code:=r->>'code';
  if (r->>'system')::boolean or r->>'merged_into' is not null or exists(select 1 from public.occasions where merged_into=v_code) then return jsonb_build_object('ok',false,'message','This occasion is needed by the system or a merged history. It cannot be deleted.'); end if;
  if exists(select 1 from public.order_items i where i.occasion_code=v_code or lower(trim(i.occasion))=lower(trim(r->>'label')) or lower(trim(i.occasion))=lower(v_code) or exists(select 1 from jsonb_array_elements_text(coalesce(nullif(r->'aliases','null'::jsonb),'[]'::jsonb)) x where lower(trim(x.value))=lower(trim(i.occasion)))) then return jsonb_build_object('ok',false,'message','This occasion is used by orders. Open its edit screen and archive it instead.'); end if;
  v_before:=r||jsonb_build_object('dates',(select jsonb_agg(to_jsonb(d)) from public.occasion_dates d where occasion_code=v_code));
  delete from public.occasion_dates where occasion_code=v_code;
 end if;
 execute format('delete from public.%I where id=$1',v_table) using p_id;
 get diagnostics v_count=row_count;
 if v_count<>1 then raise exception 'Settings entry was not removed'; end if;
 insert into staff_config_api.removal_log(kind,entry_id,removed_by,snapshot) values(p_kind,p_id,auth.uid(),v_before);
 return jsonb_build_object('ok',true,'message','Removed from Settings.');
exception when foreign_key_violation then
 return jsonb_build_object('ok',false,'message','This entry is linked to other records. Take it off sale or archive it instead.');
end $$;
revoke all on function staff_config_api.remove_setting(text,uuid,text) from public,anon;
grant execute on function staff_config_api.remove_setting(text,uuid,text) to authenticated;
create or replace function public.admin_remove_setting(p_kind text,p_id uuid,p_expected text)
returns jsonb language sql security invoker set search_path='' as $$ select staff_config_api.remove_setting(p_kind,p_id,p_expected) $$;
revoke all on function public.admin_remove_setting(text,uuid,text) from public,anon;
grant execute on function public.admin_remove_setting(text,uuid,text) to authenticated;
