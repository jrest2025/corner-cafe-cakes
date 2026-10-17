-- Customer concerns: photos, and "What will we do better next time?" (approved by Roneel, 17 Oct 2026). STATUS: applied 17 Oct 2026 at publish (migration customer_feedback_photos_learning).
-- Builds on customer_feedback.sql (applied). Additive only: a private bucket, two storage policies, one table, one column,
-- new functions, and create-or-replace of _note_json. feedback_resolve gets a new six-argument version (with the learning);
-- the five-argument one stays for any old screen still open and keeps working.
-- Photos: up to 5 when the concern is logged (stage 'concern') and up to 5 when it is put right (stage 'resolution').
-- Staff only, stored privately, shown through short-lived signed links, never in emails or on kitchen slips.

-- 1. Private bucket (5 MB photos, same types as order photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-photos', 'feedback-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 2. Storage policies: staff who can see orders or customers can add and view; nobody can change or delete through the API
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'staff_add_feedback_photos') then
    create policy staff_add_feedback_photos on storage.objects for insert to authenticated
      with check (bucket_id = 'feedback-photos' and (storage.foldername(name))[1] = 'fb' and array_length(storage.foldername(name), 1) = 2
                  and (public.has_perm('ord.view') or public.has_perm('cust.view')));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'staff_read_feedback_photos') then
    create policy staff_read_feedback_photos on storage.objects for select to authenticated
      using (bucket_id = 'feedback-photos' and (public.has_perm('ord.view') or public.has_perm('cust.view')));
  end if;
end $$;

-- 3. Photos on a concern. Removing one hides it (removed_at); the file stays for the record.
create table if not exists public.customer_note_photos (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.customer_notes(id),
  stage text not null check (stage in ('concern', 'resolution')),
  storage_path text not null unique,
  file_name text check (file_name is null or length(file_name) <= 200),
  added_by uuid,
  added_by_label text,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_label text
);
alter table public.customer_note_photos enable row level security;
create index if not exists customer_note_photos_note on public.customer_note_photos (note_id) where removed_at is null;

-- 4. "What will we do better next time?" Shared with the team; never names anyone.
alter table public.customer_notes add column if not exists learning text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'customer_notes_learning_len') then
    alter table public.customer_notes add constraint customer_notes_learning_len check (learning is null or length(learning) <= 1000);
  end if;
end $$;

-- 5. The note as the app sees it: now with the learning and its photos
create or replace function public._note_json(n customer_notes) returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'tone', n.feedback_tone, 'channel', n.channel, 'body', case when n.hidden_at is null then n.body else null end,
    'order_id', n.order_id, 'order_ref', (select reference from public.orders o where o.id = n.order_id),
    'by', n.created_by_label, 'at', n.created_at, 'mine', n.created_by = auth.uid(),
    'edited_at', n.updated_at, 'edited_by', n.updated_by_label, 'version', n.version,
    'hidden', n.hidden_at is not null, 'hidden_by', n.hidden_by_label, 'hidden_reason', n.hidden_reason, 'hidden_at', n.hidden_at,
    'customer_id', n.customer_id, 'status', n.status, 'owner_id', n.owner_id, 'owner', n.owner_label, 'owner_mine', n.owner_id = auth.uid(),
    'actions', to_jsonb(n.actions), 'amount', n.amount, 'resolution', n.resolution, 'learning', n.learning,
    'resolved_at', n.resolved_at, 'resolved_by', n.resolved_by_label,
    'photos', case when n.hidden_at is null then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'stage', p.stage, 'path', p.storage_path, 'name', p.file_name,
        'by', p.added_by_label, 'at', p.added_at, 'mine', p.added_by = auth.uid()) order by p.added_at)
      from public.customer_note_photos p where p.note_id = n.id and p.removed_at is null), '[]'::jsonb) else '[]'::jsonb end)
$function$;

-- 6. Attach an uploaded photo to a concern
create or replace function public.feedback_photo_add(p_note uuid, p_stage text, p_path text, p_name text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes; v_count int;
begin
  if not (public.has_perm('ord.view') or public.has_perm('cust.view')) then return public._err('forbidden', 'Your login cannot add photos here.'); end if;
  select * into n from public.customer_notes where id = p_note;
  if not found or n.hidden_at is not null or n.kind <> 'feedback' then return public._err('not_found', 'That feedback was not found.'); end if;
  if p_stage not in ('concern', 'resolution') then return public._err('stage', 'Unknown photo type.'); end if;
  if p_path is null or p_path !~ '^fb/[0-9a-f-]{36}/[a-z0-9._-]{1,80}$' then return public._err('path', 'That photo could not be added. Try choosing it again.'); end if;
  if not exists (select 1 from storage.objects where bucket_id = 'feedback-photos' and name = p_path) then return public._err('path', 'The photo did not finish uploading. Try again.'); end if;
  if exists (select 1 from public.customer_note_photos where storage_path = p_path) then
    return jsonb_build_object('ok', true, 'repeat', true, 'note', public._note_json(n));
  end if;
  perform 1 from public.customer_notes where id = p_note for update;
  select count(*) into v_count from public.customer_note_photos where note_id = p_note and stage = p_stage and removed_at is null;
  if v_count >= 5 then return public._err('max', 'You can add up to 5 photos here.'); end if;
  insert into public.customer_note_photos (note_id, stage, storage_path, file_name, added_by, added_by_label)
  values (p_note, p_stage, p_path, nullif(left(trim(coalesce(p_name, '')), 200), ''), auth.uid(), public._me_label());
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 7. Take a photo off a concern (whoever added it, or someone who can change orders). The file is kept.
create or replace function public.feedback_photo_remove(p_photo uuid) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare ph public.customer_note_photos; n public.customer_notes;
begin
  select * into ph from public.customer_note_photos where id = p_photo and removed_at is null;
  if not found then return public._err('not_found', 'That photo was not found or is already removed.'); end if;
  if not (public.has_perm('ord.edit') or (ph.added_by = auth.uid() and (public.has_perm('ord.view') or public.has_perm('cust.view')))) then
    return public._err('forbidden', 'Only the person who added it or someone who can change orders can remove a photo.');
  end if;
  update public.customer_note_photos set removed_at = now(), removed_by_label = public._me_label() where id = ph.id;
  select * into n from public.customer_notes where id = ph.note_id;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- 8. Put it right: what we did, how, and (optional) what we will do better next time
create or replace function public.feedback_resolve(p_note uuid, p_version integer, p_actions text[], p_amount numeric, p_resolution text, p_learning text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n public.customer_notes; v_txt text := trim(coalesce(p_resolution, '')); v_learn text := nullif(trim(coalesce(p_learning, '')), ''); v_acts text[];
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'A team member who can change orders records how it was put right.'); end if;
  select * into n from public.customer_notes where id = p_note for update;
  if not found or n.hidden_at is not null then return public._err('not_found', 'That concern was not found.'); end if;
  if n.status is distinct from 'open' then return public._err('closed', 'This concern has already been put right.'); end if;
  if p_version is not null and n.version <> p_version then
    return public._err('changed', 'Someone updated this concern while you were working on it. Have a look at the latest first.', null, jsonb_build_object('note', public._note_json(n)));
  end if;
  select coalesce(array_agg(distinct a order by a), '{}') into v_acts from unnest(coalesce(p_actions, '{}')) a where a is not null and a <> '';
  if cardinality(v_acts) = 0 then return public._err('actions', 'Choose what we did for the customer.', 'actions'); end if;
  if not v_acts <@ array['apologised','remade','refund','voucher','other'] then return public._err('actions', 'Unknown action.', 'actions'); end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 10000) then return public._err('amount', 'Enter an amount between 0 and 10,000.', 'amount'); end if;
  if length(v_txt) < 3 then return public._err('resolution', 'Write a short note on how we put it right.', 'resolution'); end if;
  if length(v_txt) > 1000 then return public._err('resolution', 'Keep the note under 1,000 characters.', 'resolution'); end if;
  if public._note_problem(v_txt) is not null then return public._err('resolution', public._note_problem(v_txt), 'resolution'); end if;
  if v_learn is not null and length(v_learn) > 1000 then return public._err('learning', 'Keep it under 1,000 characters.', 'learning'); end if;
  if v_learn is not null and public._note_problem(v_learn) is not null then return public._err('learning', public._note_problem(v_learn), 'learning'); end if;
  update public.customer_notes set status = 'resolved', actions = v_acts, amount = round(p_amount, 2), resolution = v_txt, learning = v_learn,
    resolved_at = now(), resolved_by = auth.uid(), resolved_by_label = public._me_label(), version = version + 1, updated_at = now(), updated_by_label = public._me_label()
  where id = n.id returning * into n;
  insert into public.customer_note_events (note_id, actor_id, actor_label, kind, detail)
  values (n.id, auth.uid(), public._me_label(), 'resolved', jsonb_build_object('actions', v_acts, 'amount', n.amount, 'resolution', v_txt, 'learning', v_learn));
  if n.order_id is not null then perform public._log(n.order_id, auth.uid(), public._me_label(), 'complaint_resolved', jsonb_build_object('note_id', n.id, 'actions', v_acts, 'amount', n.amount)); end if;
  return jsonb_build_object('ok', true, 'note', public._note_json(n));
end $$;

-- No REVOKE/GRANT: every function checks the caller's permission itself; the photo table has row security with no policies.
