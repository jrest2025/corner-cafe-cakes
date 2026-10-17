-- Shared, explicit staff favourites. No inferred customer classification.
create table if not exists public.customer_favourites (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  is_favourite boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.customer_favourites enable row level security;
revoke all on public.customer_favourites from public, anon, authenticated;
grant select,insert,update on public.customer_favourites to authenticated;
create policy customer_favourites_read on public.customer_favourites for select to authenticated
 using (public.has_perm('cust.view'));
create policy customer_favourites_add on public.customer_favourites for insert to authenticated
 with check (public.has_perm('cust.edit') and exists(select 1 from public.customers c where c.id=customer_id and c.archived_at is null and c.merged_into is null));
create policy customer_favourites_edit on public.customer_favourites for update to authenticated
 using (public.has_perm('cust.edit'))
 with check (public.has_perm('cust.edit') and exists(select 1 from public.customers c where c.id=customer_id and c.archived_at is null and c.merged_into is null));
create or replace function public.customer_favourite_stamp() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 new.updated_by=auth.uid(); new.updated_at=now(); return new;
end $$;
revoke all on function public.customer_favourite_stamp() from public,anon,authenticated;
create trigger customer_favourite_stamp before insert or update on public.customer_favourites
for each row execute function public.customer_favourite_stamp();
