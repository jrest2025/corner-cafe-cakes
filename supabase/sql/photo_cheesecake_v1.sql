-- Corner Café cakes: Cheesecake photo on the order page (16 October 2026). Run on the live database 16 October 2026, 11:41 PM.
-- Only fills the photo if none is set, or if it is one of our pinned hosted photos. A photo uploaded in the staff app is never replaced.
do $photo_cheesecake_v1$
begin
  update public.products set image_url = 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@86c5d0908d4154f0f0604306ac83884f84fdec15/dist/brand/cakes/cheesecake.jpg'
  where code = 'cheesecake' and (image_url is null or image_url like 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@%');
  if not exists (select 1 from public.products where code = 'cheesecake' and image_url is not null) then
    raise exception 'Cheesecake still has no photo';
  end if;
  raise notice 'Cheesecake photo set.';
end $photo_cheesecake_v1$;

select code, image_url from public.products where code = 'cheesecake';
