-- Run after settings_remove.sql, inside a transaction that is rolled back.
do $$
declare u uuid; p uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); f uuid:=gen_random_uuid(); z uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); d uuid:=gen_random_uuid(); l uuid; r jsonb; used record;
begin
 select user_id into u from public.staff_profiles where role='admin' and active and removed_at is null limit 1;
 if u is null then raise exception 'No admin test identity'; end if;
 select id into l from public.locations where code='corner-cafe';
 insert into public.products(id,code,name,status) values(p,'zz_admin_remove_test','Settings removal fixture','hidden');
 insert into public.product_sizes(id,product_id,size_inch,price,active) values(s,p,6,10,true);
 insert into public.product_variants(id,product_id,name) values(f,p,'Fixture flavour');
 insert into public.delivery_zones(id,location_id,name,active) values(z,l,'Settings removal fixture',false);
 insert into public.closed_dates(id,location_id,closed_on,reason) values(c,l,'2099-11-13','Settings removal fixture');
 insert into public.occasions(id,code,label,category,active,sort) values(o,'zz_remove_test','Settings removal fixture','other',false,990);
 insert into public.occasion_dates(id,occasion_code,year,starts_on) values(d,'zz_remove_test',2099,'2099-11-12');
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 r:=public.admin_remove_setting('cake',p,'Settings removal fixture');
 if coalesce((r->>'ok')::boolean,true) then raise exception 'Unprivileged removal allowed'; end if;
 if not exists(select 1 from public.products where id=p) then raise exception 'Unprivileged call changed data'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 r:=public.admin_remove_setting('cake',p,'Wrong old name');if coalesce((r->>'ok')::boolean,true) then raise exception 'Stale entry removed';end if;
 r:=public.admin_remove_setting('orders',p,'Settings removal fixture');if coalesce((r->>'ok')::boolean,true) then raise exception 'Non-settings table allowed';end if;
 select pr.id,pr.name into used from public.products pr where exists(select 1 from public.order_items i where i.product_id=pr.id) limit 1;
 if used.id is null then raise exception 'No used product found to test protection';end if;
 r:=public.admin_remove_setting('cake',used.id,used.name);if coalesce((r->>'ok')::boolean,true) then raise exception 'Used cake removed';end if;
 r:=public.admin_remove_setting('size',s,'6');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Size remove failed: %',r;end if;
 r:=public.admin_remove_setting('flavour',f,'Fixture flavour');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Flavour remove failed: %',r;end if;
 r:=public.admin_remove_setting('area',z,'Settings removal fixture');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Area remove failed: %',r;end if;
 r:=public.admin_remove_setting('closed',c,'2099-11-13');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Closed remove failed: %',r;end if;
 r:=public.admin_remove_setting('date',d,'2099-11-12');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Date remove failed: %',r;end if;
 r:=public.admin_remove_setting('occasion',o,'Settings removal fixture');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Occasion remove failed: %',r;end if;
 r:=public.admin_remove_setting('cake',p,'Settings removal fixture');if not coalesce((r->>'ok')::boolean,false) then raise exception 'Cake remove failed: %',r;end if;
 if (select count(*) from staff_config_api.removal_log where removed_by=u and entry_id in(p,s,f,z,c,o,d))<>7 then raise exception 'Removal log missing';end if;
 if exists(select 1 from public.products where id=p) or exists(select 1 from public.occasion_dates where id=d) then raise exception 'Removed entries still present';end if;
 if has_function_privilege('anon','public.admin_remove_setting(text,uuid,text)','execute') or has_function_privilege('anon','staff_config_api.remove_setting(text,uuid,text)','execute') then raise exception 'Anonymous execute allowed';end if;
 if not has_function_privilege('authenticated','public.admin_remove_setting(text,uuid,text)','execute') then raise exception 'Signed in execute missing';end if;
end $$;
