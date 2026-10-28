-- Admin console Integrations panel: let managers read the system health check (28 October 2026).
-- Problem: the panel called ops_health directly. ops_health is locked to the server on purpose (it has no
-- permission check of its own), so every manager saw "Could not check" and the database logged
-- "permission denied for function ops_health".
-- Fix: a small door that checks the manager permission first, then returns the same health check.
-- Additive only: ops_health itself stays locked and unchanged.

create or replace function public.admin_ops_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_perm('mgmt.settings') then
    return public._err('forbidden', 'Only managers can see the system health.');
  end if;
  return public.ops_health();
end $$;

revoke execute on function public.admin_ops_health() from public, anon;
grant execute on function public.admin_ops_health() to authenticated, service_role;

-- Rollback: drop function public.admin_ops_health();
