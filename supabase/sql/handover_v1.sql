-- Corner Café cakes: shift handover notes
-- The outgoing person writes a short note; the incoming person taps "Read and taken over", which records their name and the time.
-- Notes are kept, so there is a record of who handed over what. Staff reach them only through the three functions below.
-- Who can use them: anyone who can see orders or the kitchen (the existing ord.view and kit.view switches).
-- Runs as one block: if any check at the end fails, nothing is changed.
do $ho$
begin
  create table if not exists public.shift_handovers (
    id uuid primary key default gen_random_uuid(),
    shift text not null check (shift in ('morning', 'afternoon', 'evening')),
    note text not null check (length(trim(note)) between 2 and 1000),
    written_by uuid not null,
    written_by_name text not null,
    created_at timestamptz not null default now(),
    taken_by uuid,
    taken_by_name text,
    taken_at timestamptz
  );
  create index if not exists shift_handovers_created on public.shift_handovers (created_at desc);
  alter table public.shift_handovers enable row level security;
  revoke all on public.shift_handovers from anon, authenticated;

  execute $f$
    create or replace function public.handover_list()
     returns jsonb language plpgsql stable security definer set search_path to 'public' as $b$
    begin
      if not (public.has_perm('ord.view') or public.has_perm('kit.view')) then return public._err('forbidden', 'Your login cannot see handover notes.'); end if;
      return jsonb_build_object('ok', true, 'notes', coalesce((
        select jsonb_agg(jsonb_build_object('id', h.id, 'shift', h.shift, 'note', h.note, 'by', h.written_by_name, 'at', h.created_at,
                 'taken_by', h.taken_by_name, 'taken_at', h.taken_at, 'mine', h.written_by = auth.uid()) order by h.created_at desc)
        from (select * from public.shift_handovers where created_at > now() - interval '3 days' order by created_at desc limit 20) h), '[]'));
    end $b$
  $f$;

  execute $f$
    create or replace function public.handover_add(p_shift text, p_note text)
     returns jsonb language plpgsql security definer set search_path to 'public' as $b$
    declare v_name text; v_id uuid;
    begin
      if not (public.has_perm('ord.view') or public.has_perm('kit.view')) then return public._err('forbidden', 'Your login cannot write handover notes.'); end if;
      if p_shift not in ('morning', 'afternoon', 'evening') then return public._err('shift', 'Choose the shift.'); end if;
      if length(trim(coalesce(p_note, ''))) < 2 then return public._err('note', 'Write the handover note.', 'note'); end if;
      if length(p_note) > 1000 then return public._err('note', 'Keep the note to 1000 characters.', 'note'); end if;
      select full_name into v_name from public.staff_profiles where user_id = auth.uid() and active;
      if v_name is null then return public._err('forbidden', 'Your login cannot write handover notes.'); end if;
      insert into public.shift_handovers (shift, note, written_by, written_by_name) values (p_shift, trim(p_note), auth.uid(), v_name) returning id into v_id;
      return jsonb_build_object('ok', true, 'id', v_id);
    end $b$
  $f$;

  execute $f$
    create or replace function public.handover_take(p_id uuid)
     returns jsonb language plpgsql security definer set search_path to 'public' as $b$
    declare v_name text; h public.shift_handovers;
    begin
      if not (public.has_perm('ord.view') or public.has_perm('kit.view')) then return public._err('forbidden', 'Your login cannot take over a shift.'); end if;
      select * into h from public.shift_handovers where id = p_id for update;
      if not found then return public._err('not_found', 'That handover note was not found.'); end if;
      if h.taken_at is not null then return jsonb_build_object('ok', true, 'already', true, 'taken_by', h.taken_by_name, 'taken_at', h.taken_at); end if;
      select full_name into v_name from public.staff_profiles where user_id = auth.uid() and active;
      if v_name is null then return public._err('forbidden', 'Your login cannot take over a shift.'); end if;
      update public.shift_handovers set taken_by = auth.uid(), taken_by_name = v_name, taken_at = now() where id = p_id;
      return jsonb_build_object('ok', true, 'taken_by', v_name, 'taken_at', now());
    end $b$
  $f$;

  revoke all on function public.handover_list() from public, anon;
  revoke all on function public.handover_add(text, text) from public, anon;
  revoke all on function public.handover_take(uuid) from public, anon;
  grant execute on function public.handover_list() to authenticated;
  grant execute on function public.handover_add(text, text) to authenticated;
  grant execute on function public.handover_take(uuid) to authenticated;

  -- Checks
  if to_regclass('public.shift_handovers') is null then raise exception 'Handover table missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.shift_handovers'::regclass) then raise exception 'Row security is off on handover notes'; end if;
  if has_table_privilege('anon', 'public.shift_handovers', 'select') then raise exception 'Handover notes would be readable without signing in'; end if;
  if has_function_privilege('anon', 'public.handover_list()', 'execute') then raise exception 'Handover list would be open without signing in'; end if;
  raise notice 'Shift handover installed.';
end $ho$;

select 'Shift handover installed' as result;
