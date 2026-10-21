-- Email templates for customer emails (22 October 2026)
-- Settings, Communications, Email templates in the staff app. Additive only: two new tables, one new nullable
-- column on email_outbox, and new functions. No existing table, trigger, function or email changes here.
-- Who may edit: anyone with the Settings switch (mgmt.settings): Admin, Group Management and Restaurant Manager.
-- With nothing published, every email keeps its standard wording.

create table if not exists public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('guest_received','guest_quote','guest_deposit_needed','guest_confirmed',
                                     'guest_updated','guest_declined','guest_cancelled','guest_thanks')),
  version int not null,
  status text not null check (status in ('draft','published','archived')),
  subject text check (char_length(subject) <= 200),
  preheader text check (char_length(preheader) <= 250),
  label text check (char_length(label) <= 60),
  heading text check (char_length(heading) <= 160),
  tagline text check (char_length(tagline) <= 160),
  intro text check (char_length(intro) <= 8000),
  closing text check (char_length(closing) <= 8000),
  note text check (char_length(note) <= 300),
  created_by uuid, created_by_name text, created_at timestamptz not null default now(),
  updated_by uuid, updated_by_name text, updated_at timestamptz not null default now(),
  published_by uuid, published_by_name text, published_at timestamptz,
  archived_by uuid, archived_by_name text, archived_at timestamptz,
  unique (kind, version)
);
create unique index if not exists email_template_one_published on public.email_template_versions (kind) where status = 'published';
create unique index if not exists email_template_one_draft on public.email_template_versions (kind) where status = 'draft';

-- Optional emails can be switched off. Only the thank-you email is optional; order emails always go.
create table if not exists public.email_template_switches (
  kind text primary key check (kind in ('guest_thanks')),
  enabled boolean not null default true,
  updated_by uuid, updated_by_name text, updated_at timestamptz not null default now()
);

-- Which wording each email went out with (empty = standard wording)
alter table public.email_outbox add column if not exists template_version_id uuid references public.email_template_versions(id) on delete set null;

alter table public.email_template_versions enable row level security;
alter table public.email_template_switches enable row level security;
revoke all on public.email_template_versions from anon, authenticated;
revoke all on public.email_template_switches from anon, authenticated;

create or replace function public._tpl_me() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_name text;
begin
  if auth.uid() is null or not public._perm_of(auth.uid(), 'mgmt.settings') then return null; end if;
  select coalesce(nullif(trim(full_name), ''), 'Staff') into v_name from public.staff_profiles where user_id = auth.uid();
  return jsonb_build_object('id', auth.uid(), 'name', coalesce(v_name, 'Staff'));
end $$;

create or replace function public._tpl_row(v public.email_template_versions) returns jsonb language sql stable as $$
  select case when v.id is null then null else jsonb_build_object('id', v.id, 'version', v.version, 'status', v.status,
    'subject', v.subject, 'preheader', v.preheader, 'label', v.label, 'heading', v.heading, 'tagline', v.tagline,
    'intro', v.intro, 'closing', v.closing, 'note', v.note,
    'created_at', v.created_at, 'created_by_name', v.created_by_name, 'updated_at', v.updated_at, 'updated_by_name', v.updated_by_name,
    'published_at', v.published_at, 'published_by_name', v.published_by_name, 'archived_at', v.archived_at, 'archived_by_name', v.archived_by_name) end
$$;

-- Everything the Email templates screen needs
create or replace function public.email_tpl_home() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me jsonb := public._tpl_me();
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can manage email templates.'); end if;
  return jsonb_build_object('ok', true, 'kinds', coalesce((
    select jsonb_object_agg(k.kind, jsonb_build_object(
      'enabled', coalesce((select s.enabled from public.email_template_switches s where s.kind = k.kind), true),
      'published', (select public._tpl_row(v) from public.email_template_versions v where v.kind = k.kind and v.status = 'published'),
      'draft', (select public._tpl_row(v) from public.email_template_versions v where v.kind = k.kind and v.status = 'draft'),
      'history', coalesce((select jsonb_agg(public._tpl_row(v) order by v.version desc) from (select * from public.email_template_versions v
                  where v.kind = k.kind and v.status <> 'draft' order by v.version desc limit 20) v), '[]'::jsonb),
      'sent_30d', (select count(*) from public.email_outbox o where o.kind = k.kind and o.status = 'sent' and o.sent_at > now() - interval '30 days')))
    from unnest(array['guest_received','guest_quote','guest_deposit_needed','guest_confirmed','guest_updated','guest_declined','guest_cancelled','guest_thanks']) k(kind)), '{}'::jsonb));
end $$;

-- Save the draft (one draft per email; saving again updates it)
create or replace function public.email_tpl_save(p_kind text, p_fields jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me(); v public.email_template_versions;
  f jsonb := coalesce(p_fields, '{}'::jsonb);
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can change email templates.'); end if;
  select * into v from public.email_template_versions where kind = p_kind and status = 'draft' for update;
  if v.id is null then
    insert into public.email_template_versions (kind, version, status, created_by, created_by_name, updated_by, updated_by_name)
    values (p_kind, coalesce((select max(version) from public.email_template_versions where kind = p_kind), 0) + 1, 'draft',
            (me->>'id')::uuid, me->>'name', (me->>'id')::uuid, me->>'name') returning * into v;
  end if;
  update public.email_template_versions set
    subject = nullif(f->>'subject', ''), preheader = nullif(f->>'preheader', ''), label = nullif(f->>'label', ''),
    heading = nullif(f->>'heading', ''), tagline = nullif(f->>'tagline', ''), intro = nullif(f->>'intro', ''),
    closing = nullif(f->>'closing', ''), note = nullif(f->>'note', ''),
    updated_by = (me->>'id')::uuid, updated_by_name = me->>'name', updated_at = now()
  where id = v.id returning * into v;
  return jsonb_build_object('ok', true, 'draft', public._tpl_row(v));
end $$;

-- Publish the draft: it is used from the next email of that kind
create or replace function public.email_tpl_publish(p_kind text, p_draft uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me(); v public.email_template_versions;
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can publish email templates.'); end if;
  select * into v from public.email_template_versions where kind = p_kind and status = 'draft' for update;
  if v.id is null or v.id <> p_draft then return jsonb_build_object('ok', false, 'message', 'This draft has changed. Reload and check it before publishing.'); end if;
  if coalesce(v.subject, '') = '' and coalesce(v.heading, '') = '' and coalesce(v.intro, '') = '' and coalesce(v.closing, '') = ''
     and coalesce(v.preheader, '') = '' and coalesce(v.label, '') = '' and coalesce(v.tagline, '') = '' then
    return jsonb_build_object('ok', false, 'message', 'This draft is empty. Use Standard wording instead.');
  end if;
  update public.email_template_versions set status = 'archived', archived_at = now(), archived_by = (me->>'id')::uuid, archived_by_name = me->>'name'
    where kind = p_kind and status = 'published';
  update public.email_template_versions set status = 'published', published_at = now(), published_by = (me->>'id')::uuid, published_by_name = me->>'name'
    where id = v.id returning * into v;
  insert into public.audit_log (actor_id, table_name, row_id, action, new_data)
    values ((me->>'id')::uuid, 'email_template_versions', v.id::text, 'publish', jsonb_build_object('kind', p_kind, 'version', v.version));
  return jsonb_build_object('ok', true, 'published', public._tpl_row(v));
end $$;

create or replace function public.email_tpl_discard(p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me();
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can change email templates.'); end if;
  delete from public.email_template_versions where kind = p_kind and status = 'draft';
  return jsonb_build_object('ok', true);
end $$;

-- Start a draft from an earlier version (to bring it back, or to build on it)
create or replace function public.email_tpl_copy(p_version uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me(); src public.email_template_versions;
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can change email templates.'); end if;
  select * into src from public.email_template_versions where id = p_version;
  if src.id is null then return jsonb_build_object('ok', false, 'message', 'That version was not found.'); end if;
  return public.email_tpl_save(src.kind, jsonb_build_object('subject', src.subject, 'preheader', src.preheader, 'label', src.label, 'heading', src.heading,
    'tagline', src.tagline, 'intro', src.intro, 'closing', src.closing, 'note', 'From version ' || src.version));
end $$;

-- Go back to the standard wording: the published version is archived (it stays in the history)
create or replace function public.email_tpl_standard(p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me(); n int;
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can change email templates.'); end if;
  update public.email_template_versions set status = 'archived', archived_at = now(), archived_by = (me->>'id')::uuid, archived_by_name = me->>'name'
    where kind = p_kind and status = 'published';
  get diagnostics n = row_count;
  if n > 0 then insert into public.audit_log (actor_id, table_name, row_id, action, new_data)
    values ((me->>'id')::uuid, 'email_template_versions', p_kind, 'standard_wording', jsonb_build_object('kind', p_kind)); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Switch an optional email on or off (order emails cannot be switched off)
create or replace function public.email_tpl_switch(p_kind text, p_on boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare me jsonb := public._tpl_me();
begin
  if me is null then return jsonb_build_object('ok', false, 'message', 'Only someone with the Settings switch can change this.'); end if;
  if p_kind <> 'guest_thanks' then return jsonb_build_object('ok', false, 'message', 'Order emails always go to customers and cannot be switched off.'); end if;
  insert into public.email_template_switches (kind, enabled, updated_by, updated_by_name, updated_at)
    values (p_kind, coalesce(p_on, true), (me->>'id')::uuid, me->>'name', now())
    on conflict (kind) do update set enabled = excluded.enabled, updated_by = excluded.updated_by, updated_by_name = excluded.updated_by_name, updated_at = now();
  insert into public.audit_log (actor_id, table_name, row_id, action, new_data)
    values ((me->>'id')::uuid, 'email_template_switches', p_kind, case when p_on then 'switch_on' else 'switch_off' end, jsonb_build_object('kind', p_kind));
  return jsonb_build_object('ok', true, 'enabled', coalesce(p_on, true));
end $$;

revoke all on function public._tpl_me(), public._tpl_row(public.email_template_versions) from public, anon, authenticated;
revoke all on function public.email_tpl_home(), public.email_tpl_save(text, jsonb), public.email_tpl_publish(text, uuid), public.email_tpl_discard(text),
  public.email_tpl_copy(uuid), public.email_tpl_standard(text), public.email_tpl_switch(text, boolean) from public, anon;
grant execute on function public.email_tpl_home(), public.email_tpl_save(text, jsonb), public.email_tpl_publish(text, uuid), public.email_tpl_discard(text),
  public.email_tpl_copy(uuid), public.email_tpl_standard(text), public.email_tpl_switch(text, boolean) to authenticated;
