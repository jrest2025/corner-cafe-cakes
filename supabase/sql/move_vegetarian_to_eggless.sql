-- Applied 17 Oct 2026 (approved by Roneel): old orders with "Vegetarian" in the allergy list moved to the Eggless cake requirement.
-- 55 orders had only "Vegetarian": allergy flag cleared. 1 order also had "Gluten- Free": that stays as an allergy.
-- Before values kept in public._bk_veg_to_eggless_20261017 (item_id, order_id, dietary, requirements, has_dietary).
create table if not exists public._bk_veg_to_eggless_20261017 as
  select i.id item_id, i.order_id, i.dietary, i.requirements, o.has_dietary
  from order_items i join orders o on o.id=i.order_id where 'Vegetarian' = any(i.dietary);
alter table public._bk_veg_to_eggless_20261017 enable row level security;
update order_items i set
  requirements = (select array_agg(distinct x) from unnest(coalesce(i.requirements,'{}') || array['eggless']) x),
  dietary = array_remove(i.dietary, 'Vegetarian')
where 'Vegetarian' = any(i.dietary);
update orders o set has_dietary = false
where o.id in (select order_id from public._bk_veg_to_eggless_20261017)
  and not exists (select 1 from order_items i where i.order_id=o.id and (coalesce(array_length(i.dietary,1),0) > 0 or coalesce(i.dietary_note,'') <> ''));
