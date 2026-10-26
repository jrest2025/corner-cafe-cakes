-- Corner Cafe WhatsApp Cloud API connector: single active business number.
-- Review and apply in a controlled release. This file has NOT been run against production.
-- Private in practice: RLS enabled and direct access revoked. Only server functions use these tables.

create table if not exists public.wa_connection (
  id smallint primary key default 1 check (id = 1),
  display_number text,
  phone_number_id text,
  waba_id text,
  verified_at timestamptz,
  enabled boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint wa_no_partial_configuration check (
    (display_number is null and phone_number_id is null and waba_id is null)
    or (display_number ~ '^\\+[1-9][0-9]{7,14}$' and phone_number_id ~ '^[0-9]{5,25}$' and waba_id ~ '^[0-9]{5,25}$')
  ),
  constraint wa_enable_only_verified check (not enabled or (verified_at is not null and phone_number_id is not null))
);
insert into public.wa_connection(id,enabled) values (1,false) on conflict(id) do nothing;
alter table public.wa_connection enable row level security;
revoke all on public.wa_connection from public, anon, authenticated;

create table if not exists public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  meta_message_id text unique,
  number_id text not null,
  peer_number text not null check (peer_number ~ '^\\+[1-9][0-9]{7,14}$'),
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  status text not null check (status in ('received','sending','sent','delivered','read','failed')),
  client_request_id uuid unique,
  staff_id uuid,
  error_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wa_messages_peer_recent on public.wa_messages(peer_number,created_at desc);
create index if not exists wa_messages_num_recent on public.wa_messages(number_id,created_at desc);
alter table public.wa_messages enable row level security;
revoke all on public.wa_messages from public, anon, authenticated;

comment on table public.wa_connection is 'Exactly one Corner Cafe WhatsApp business number. Meta token and webhook secrets live only in Supabase secrets, never in this table.';
comment on table public.wa_messages is 'Minimal WhatsApp communication log. Ambiguous shared customer numbers are intentionally not auto-attached to CRM profiles.';

-- Staff permissions, number verification, and all reads/writes are implemented
-- in the authenticated whatsapp-admin and signed whatsapp-webhook functions.
-- No automatic messages or database triggers are installed by this migration.
