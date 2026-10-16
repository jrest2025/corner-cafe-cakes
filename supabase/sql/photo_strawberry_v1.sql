-- Corner Café cakes: Strawberry cake photo on the order page (16 October 2026).
-- Only fills the photo if none is set, or if it is one of our pinned hosted photos. A photo uploaded in the staff app is never replaced.
do $photo_strawberry_v1$
begin
  update public.products set image_url = 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@3b90be54a752ae3901cebea0f78408cfbd65dcc1/dist/brand/cakes/strawberry.jpg'
  where code = 'strawberry' and (image_url is null or image_url like 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@%');
  if not exists (select 1 from public.products where code = 'strawberry' and image_url is not null) then
    raise exception 'Strawberry still has no photo';
  end if;
  raise notice 'Strawberry photo set.';
end $photo_strawberry_v1$;

select code, image_url from public.products where code = 'strawberry';
