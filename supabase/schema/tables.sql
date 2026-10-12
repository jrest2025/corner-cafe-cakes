-- Corner Cafe Cakes: schema-only recovery snapshot of Supabase project ilbrfwxblhidtlsjgxlh (public schema).
-- Snapshot taken 2026-10-12. No row data, no customer data, no app_config values.
-- Reconstructed table definitions (columns, defaults, nullability, constraints), indexes, triggers, view, enums, sequences and cron jobs.
-- Built from the catalogue for reference and recovery; migrations.sql remains the authoritative build order.

-- ===== Enum types =====
CREATE TYPE public.fulfilment_status AS ENUM ('pending', 'ready', 'collected', 'delivered', 'no_show');
CREATE TYPE public.order_source AS ENUM ('online', 'walk_in', 'phone', 'whatsapp', 'social', 'corporate');
CREATE TYPE public.order_status AS ENUM ('awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit', 'confirmed', 'completed', 'declined', 'cancelled');
CREATE TYPE public.order_type AS ENUM ('standard', 'custom');
CREATE TYPE public.payment_kind AS ENUM ('deposit', 'balance', 'full', 'refund', 'adjustment');
CREATE TYPE public.payment_method AS ENUM ('cash', 'eftpos', 'bank_transfer', 'other');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'deposit_paid', 'paid', 'refunded');
CREATE TYPE public.production_status AS ENUM ('not_started', 'scheduled', 'preparing', 'baking', 'assembling', 'decorating', 'in_production', 'quality_check', 'ready');
CREATE TYPE public.staff_role AS ENUM ('admin', 'manager', 'front_of_house', 'kitchen', 'finance', 'marketing');

-- ===== Sequences =====
CREATE SEQUENCE public.audit_log_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE public.customer_consents_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE public.order_events_id_seq START 1 INCREMENT 1;
CREATE SEQUENCE public.order_ref_seq START 1001 INCREMENT 1;

-- ===== Tables =====
CREATE TABLE public.app_config (
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT app_config_pkey PRIMARY KEY (key)
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  at timestamp with time zone DEFAULT now() NOT NULL,
  actor_id uuid,
  table_name text NOT NULL,
  row_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.closed_dates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  location_id uuid NOT NULL,
  closed_on date NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT closed_dates_pkey PRIMARY KEY (id),
  CONSTRAINT closed_dates_location_id_closed_on_key UNIQUE (location_id, closed_on),
  CONSTRAINT closed_dates_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);
ALTER TABLE public.closed_dates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customer_consents (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id uuid NOT NULL,
  channel text DEFAULT 'marketing'::text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL,
  recorded_by uuid,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_consents_pkey PRIMARY KEY (id),
  CONSTRAINT customer_consents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT customer_consents_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id),
  CONSTRAINT customer_consents_channel_check CHECK ((channel = 'marketing'::text))
);
ALTER TABLE public.customer_consents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  phone_key text NOT NULL,
  email text,
  preferred_contact text DEFAULT 'whatsapp'::text NOT NULL,
  is_corporate boolean DEFAULT false NOT NULL,
  company text,
  notes text,
  first_source order_source,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_phone_key_key UNIQUE (phone_key),
  CONSTRAINT customers_email_check CHECK (((email IS NULL) OR (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  CONSTRAINT customers_full_name_check CHECK (((length(TRIM(BOTH FROM full_name)) >= 1) AND (length(TRIM(BOTH FROM full_name)) <= 120))),
  CONSTRAINT customers_phone_key_check CHECK ((phone_key ~ '^[0-9]{7,15}$'::text)),
  CONSTRAINT customers_preferred_contact_check CHECK ((preferred_contact = ANY (ARRAY['whatsapp'::text, 'phone'::text, 'email'::text])))
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.delivery_zones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  location_id uuid NOT NULL,
  name text NOT NULL,
  fee numeric(10,2),
  active boolean DEFAULT true NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT delivery_zones_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_zones_location_id_name_key UNIQUE (location_id, name),
  CONSTRAINT delivery_zones_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT delivery_zones_fee_check CHECK (((fee IS NULL) OR (fee >= (0)::numeric)))
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_outbox (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid,
  kind text NOT NULL,
  to_email text NOT NULL,
  cc text[] DEFAULT '{}'::text[] NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  last_error text,
  provider_message_id text,
  dedupe_key text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  CONSTRAINT email_outbox_pkey PRIMARY KEY (id),
  CONSTRAINT email_outbox_dedupe_key_key UNIQUE (dedupe_key),
  CONSTRAINT email_outbox_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT email_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.import_stage (
  chunk integer NOT NULL,
  data jsonb NOT NULL,
  loaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT import_stage_pkey PRIMARY KEY (chunk)
);
ALTER TABLE public.import_stage ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kitchen_briefs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changes jsonb DEFAULT '[]'::jsonb NOT NULL,
  printed_by uuid,
  printed_by_label text,
  printed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT kitchen_briefs_pkey PRIMARY KEY (id),
  CONSTRAINT kitchen_briefs_order_id_version_key UNIQUE (order_id, version),
  CONSTRAINT kitchen_briefs_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
ALTER TABLE public.kitchen_briefs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.locations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  timezone text DEFAULT 'Pacific/Fiji'::text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  accepts_online boolean DEFAULT true NOT NULL,
  collection_open time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
  collection_close time without time zone DEFAULT '20:00:00'::time without time zone NOT NULL,
  slot_minutes integer DEFAULT 60 NOT NULL,
  lead_days_standard integer DEFAULT 2 NOT NULL,
  lead_days_custom integer DEFAULT 5 NOT NULL,
  max_days_ahead integer DEFAULT 90 NOT NULL,
  daily_capacity integer,
  alert_email text,
  order_page_url text,
  defaults_confirmed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_code_key UNIQUE (code),
  CONSTRAINT locations_check CHECK ((collection_close > collection_open)),
  CONSTRAINT locations_code_check CHECK ((code ~ '^[a-z0-9-]+$'::text)),
  CONSTRAINT locations_daily_capacity_check CHECK (((daily_capacity IS NULL) OR (daily_capacity > 0))),
  CONSTRAINT locations_lead_days_custom_check CHECK ((lead_days_custom >= 0)),
  CONSTRAINT locations_lead_days_standard_check CHECK ((lead_days_standard >= 0)),
  CONSTRAINT locations_max_days_ahead_check CHECK ((max_days_ahead > 0)),
  CONSTRAINT locations_slot_minutes_check CHECK ((slot_minutes = ANY (ARRAY[15, 30, 60])))
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_amendments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  reference text NOT NULL,
  revision integer NOT NULL,
  amended_at timestamp with time zone DEFAULT now() NOT NULL,
  staff_id uuid,
  staff_label text,
  requested_by text NOT NULL,
  reason text NOT NULL,
  time_change_cause text,
  changes jsonb NOT NULL,
  price_before numeric,
  price_after numeric,
  paid numeric,
  balance_before numeric,
  balance_after numeric,
  excess_paid numeric,
  affects_kitchen boolean DEFAULT false NOT NULL,
  kitchen_ack_required boolean DEFAULT false NOT NULL,
  kitchen_ack_by text,
  kitchen_ack_at timestamp with time zone,
  needs_reprint boolean DEFAULT false NOT NULL,
  notification_status text,
  CONSTRAINT order_amendments_pkey PRIMARY KEY (id),
  CONSTRAINT order_amendments_order_id_revision_key UNIQUE (order_id, revision),
  CONSTRAINT order_amendments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT order_amendments_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 3)),
  CONSTRAINT order_amendments_requested_by_check CHECK ((requested_by = ANY (ARRAY['guest'::text, 'staff'::text, 'other'::text]))),
  CONSTRAINT order_amendments_time_change_cause_check CHECK ((time_change_cause = ANY (ARRAY['guest_request'::text, 'business_delay'::text, 'other'::text])))
);
ALTER TABLE public.order_amendments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  purpose text DEFAULT 'reference'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT order_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT order_attachments_storage_path_key UNIQUE (storage_path),
  CONSTRAINT order_attachments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id uuid NOT NULL,
  at timestamp with time zone DEFAULT now() NOT NULL,
  actor_id uuid,
  actor_label text NOT NULL,
  kind text NOT NULL,
  detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT order_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id),
  CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  variant text,
  size_inch integer NOT NULL,
  serves_label text,
  unit_price numeric(10,2) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  finish text NOT NULL,
  design_description text,
  cake_message text,
  occasion text,
  dietary text[] DEFAULT '{}'::text[] NOT NULL,
  dietary_note text,
  kitchen_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT order_items_cake_message_check CHECK (((cake_message IS NULL) OR (length(cake_message) <= 60))),
  CONSTRAINT order_items_finish_check CHECK ((finish = ANY (ARRAY['standard'::text, 'custom'::text]))),
  CONSTRAINT order_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 50))),
  CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reference text NOT NULL,
  location_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  source order_source NOT NULL,
  order_type order_type NOT NULL,
  order_status order_status NOT NULL,
  payment_status payment_status DEFAULT 'unpaid'::payment_status NOT NULL,
  production_status production_status DEFAULT 'not_started'::production_status NOT NULL,
  fulfilment_status fulfilment_status DEFAULT 'pending'::fulfilment_status NOT NULL,
  fulfilment_method text DEFAULT 'collection'::text NOT NULL,
  required_date date NOT NULL,
  required_time time without time zone NOT NULL,
  estimate_total numeric(10,2) NOT NULL,
  final_total numeric(10,2),
  deposit_required numeric(10,2),
  currency text DEFAULT 'FJD'::text NOT NULL,
  has_dietary boolean DEFAULT false NOT NULL,
  customer_notes text,
  internal_notes text,
  decline_reason text,
  rush_override boolean DEFAULT false NOT NULL,
  rush_reason text,
  marketing_opt_in boolean DEFAULT false NOT NULL,
  idempotency_key uuid,
  manage_token uuid DEFAULT gen_random_uuid() NOT NULL,
  created_by uuid,
  confirmed_at timestamp with time zone,
  confirmed_by uuid,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  delivery_zone text,
  delivery_address text,
  delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
  delivery_contact text,
  kitchen_assignee text,
  qc_by text,
  qc_at timestamp with time zone,
  ready_at timestamp with time zone,
  handover_to text,
  handed_over_at timestamp with time zone,
  handed_over_by uuid,
  brief_version integer DEFAULT 0 NOT NULL,
  revision integer DEFAULT 0 NOT NULL,
  amended_at timestamp with time zone,
  original_required_date date,
  original_required_time time without time zone,
  rush_approved_by text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key),
  CONSTRAINT orders_reference_key UNIQUE (reference),
  CONSTRAINT orders_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id),
  CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT orders_deposit_required_check CHECK (((deposit_required IS NULL) OR (deposit_required >= (0)::numeric))),
  CONSTRAINT orders_estimate_total_check CHECK ((estimate_total >= (0)::numeric)),
  CONSTRAINT orders_final_total_check CHECK (((final_total IS NULL) OR (final_total >= (0)::numeric))),
  CONSTRAINT orders_fulfilment_method_check CHECK ((fulfilment_method = ANY (ARRAY['collection'::text, 'delivery'::text])))
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  kind payment_kind NOT NULL,
  method payment_method NOT NULL,
  amount numeric(10,2) NOT NULL,
  reference text,
  note text,
  recorded_by uuid NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  idempotency_key uuid,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id),
  CONSTRAINT payments_amount_check CHECK ((amount <> (0)::numeric))
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_sizes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  size_inch integer NOT NULL,
  serves_label text,
  price numeric(10,2) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT product_sizes_pkey PRIMARY KEY (id),
  CONSTRAINT product_sizes_product_id_size_inch_key UNIQUE (product_id, size_inch),
  CONSTRAINT product_sizes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_sizes_price_check CHECK ((price >= (0)::numeric)),
  CONSTRAINT product_sizes_size_inch_check CHECK (((size_inch >= 4) AND (size_inch <= 24)))
);
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_variants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  name text NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_name_key UNIQUE (product_id, name),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'Celebration cake'::text NOT NULL,
  description text,
  choice_label text,
  dietary_info text,
  allergen_info text,
  lead_days integer,
  supports_custom boolean DEFAULT true NOT NULL,
  supports_message boolean DEFAULT true NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  swatch text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  image_url text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_code_key UNIQUE (code),
  CONSTRAINT products_image_url_check CHECK (((image_url IS NULL) OR (image_url ~ '^https://'::text))),
  CONSTRAINT products_lead_days_check CHECK (((lead_days IS NULL) OR (lead_days >= 0))),
  CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'hidden'::text, 'retired'::text])))
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sheet_order_imports (
  import_key text NOT NULL,
  order_id uuid NOT NULL,
  sheet text NOT NULL,
  sheet_row integer,
  imported_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT sheet_order_imports_pkey PRIMARY KEY (import_key),
  CONSTRAINT sheet_order_imports_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT sheet_order_imports_sheet_check CHECK ((sheet = ANY (ARRAY['online'::text, 'walkin'::text])))
);
ALTER TABLE public.sheet_order_imports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_profiles (
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  role staff_role NOT NULL,
  location_id uuid,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT staff_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT staff_profiles_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- ===== Views =====
CREATE VIEW public.customer_summary WITH (security_invoker=true) AS
 WITH o AS (
         SELECT o.customer_id,
            o.id,
            o.order_status,
            o.required_date,
            o.created_at,
            COALESCE(o.final_total, o.estimate_total) AS value,
            i.product_name,
            COALESCE(i.variant, i.product_name) AS cake,
            i.occasion,
            i.cake_message
           FROM orders o
             LEFT JOIN LATERAL ( SELECT x.product_name,
                    x.variant,
                    x.occasion,
                    x.cake_message
                   FROM order_items x
                  WHERE x.order_id = o.id
                  ORDER BY x.created_at
                 LIMIT 1) i ON true
        ), agg AS (
         SELECT o.customer_id,
            count(*) FILTER (WHERE o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status])) AS orders_count,
            count(*) FILTER (WHERE o.order_status = 'completed'::order_status) AS completed_count,
            COALESCE(sum(o.value) FILTER (WHERE o.order_status = 'completed'::order_status), 0::numeric)::numeric(10,2) AS completed_spend,
            count(*) FILTER (WHERE o.order_status = 'cancelled'::order_status) AS cancelled_count,
            count(*) FILTER (WHERE (o.order_status = ANY (ARRAY['awaiting_review'::order_status, 'awaiting_quote'::order_status, 'awaiting_approval'::order_status, 'awaiting_deposit'::order_status, 'confirmed'::order_status])) AND o.required_date >= (now() AT TIME ZONE 'Pacific/Fiji'::text)::date) AS upcoming_count,
            min(o.created_at) FILTER (WHERE o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status])) AS first_order_at,
            max(o.created_at) FILTER (WHERE o.order_status <> ALL (ARRAY['declined'::order_status, 'cancelled'::order_status])) AS last_order_at,
            max(o.required_date) FILTER (WHERE o.order_status = 'completed'::order_status) AS last_completed_for,
            bool_or(o.occasion = 'Birthday'::text AND (o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status]))) AS birthday_buyer,
            mode() WITHIN GROUP (ORDER BY o.cake) FILTER (WHERE o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status])) AS favourite_cake,
            array_remove(array_agg(DISTINCT o.occasion) FILTER (WHERE o.order_status = ANY (ARRAY['confirmed'::order_status, 'completed'::order_status])), NULL::text) AS occasions
           FROM o
          GROUP BY o.customer_id
        ), occ AS (
         SELECT DISTINCT ON (o.customer_id) o.customer_id,
            _next_occasion(o.occasion, o.required_date, (now() AT TIME ZONE 'Pacific/Fiji'::text)::date) AS next_occasion_date,
                CASE
                    WHEN o.occasion = 'Wedding'::text THEN 'Wedding anniversary'::text
                    ELSE o.occasion
                END ||
                CASE
                    WHEN (o.occasion = ANY (ARRAY['Birthday'::text, 'Anniversary'::text])) AND o.cake_message IS NOT NULL THEN (' ("'::text || o.cake_message) || '")'::text
                    ELSE ''::text
                END AS retarget_reason
           FROM o
          WHERE o.occasion IS NOT NULL AND o.order_status = 'completed'::order_status AND _next_occasion(o.occasion, o.required_date, (now() AT TIME ZONE 'Pacific/Fiji'::text)::date) IS NOT NULL
          ORDER BY o.customer_id, (_next_occasion(o.occasion, o.required_date, (now() AT TIME ZONE 'Pacific/Fiji'::text)::date))
        ), cons AS (
         SELECT DISTINCT ON (customer_consents.customer_id) customer_consents.customer_id,
            customer_consents.granted,
            customer_consents.recorded_at
           FROM customer_consents
          ORDER BY customer_consents.customer_id, customer_consents.recorded_at DESC
        ), lead AS (
         SELECT COALESCE(( SELECT app_config.value::integer AS value
                   FROM app_config
                  WHERE app_config.key = 'retarget_lead_days'::text), 14) AS days,
            COALESCE(( SELECT app_config.value::integer AS value
                   FROM app_config
                  WHERE app_config.key = 'retarget_window_days'::text), 30) AS win
        )
 SELECT c.id,
    c.full_name,
    c.phone,
    c.email,
    c.preferred_contact,
    c.is_corporate,
    c.company,
    c.first_source,
    c.created_at,
    COALESCE(a.orders_count, 0::bigint) AS orders_count,
    COALESCE(a.completed_count, 0::bigint) AS completed_count,
    COALESCE(a.completed_spend, 0::numeric) AS completed_spend,
        CASE
            WHEN COALESCE(a.completed_count, 0::bigint) > 0 THEN round(a.completed_spend / a.completed_count::numeric, 2)
            ELSE NULL::numeric
        END AS average_spend,
    COALESCE(a.cancelled_count, 0::bigint) AS cancelled_count,
    COALESCE(a.upcoming_count, 0::bigint) AS upcoming_count,
    a.first_order_at,
    a.last_order_at,
    a.favourite_cake,
    COALESCE(a.occasions, '{}'::text[]) AS occasions,
    oc.next_occasion_date,
    COALESCE(cn.granted, false) AS marketing_opt_in,
    COALESCE(a.completed_count, 0::bigint) = 1 AS seg_first_time,
    COALESCE(a.completed_count, 0::bigint) >= 2 AS seg_repeat,
    COALESCE(a.completed_spend, 0::numeric) >= COALESCE(( SELECT app_config.value::numeric AS value
           FROM app_config
          WHERE app_config.key = 'high_value_spend'::text), 300::numeric) AS seg_high_value,
    a.last_completed_for IS NOT NULL AND a.last_completed_for < ((now() AT TIME ZONE 'Pacific/Fiji'::text)::date - COALESCE(( SELECT app_config.value::integer AS value
           FROM app_config
          WHERE app_config.key = 'inactive_days'::text), 180)) AS seg_inactive,
    COALESCE(a.birthday_buyer, false) AS seg_birthday_buyer,
    COALESCE(a.upcoming_count, 0::bigint) > 0 AS seg_upcoming_order,
    c.phone_key ~~ '679%'::text AND oc.next_occasion_date IS NOT NULL AND COALESCE(a.upcoming_count, 0::bigint) = 0 AND (oc.next_occasion_date - (( SELECT lead.days
           FROM lead))) <= ((now() AT TIME ZONE 'Pacific/Fiji'::text)::date + (( SELECT lead.win
           FROM lead))) AS seg_upcoming_occasion,
    c.is_corporate AS seg_corporate,
    oc.retarget_reason,
    GREATEST(oc.next_occasion_date - (( SELECT lead.days
           FROM lead)), (now() AT TIME ZONE 'Pacific/Fiji'::text)::date) AS contact_on,
    c.phone_key !~~ '679%'::text AS is_overseas
   FROM customers c
     LEFT JOIN agg a ON a.customer_id = c.id
     LEFT JOIN occ oc ON oc.customer_id = c.id
     LEFT JOIN cons cn ON cn.customer_id = c.id;

-- ===== Indexes (pg_indexes, schema public; includes indexes that back primary key and unique constraints) =====
-- CREATE UNIQUE INDEX app_config_pkey ON public.app_config USING btree (key)
-- CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)
-- CREATE UNIQUE INDEX closed_dates_location_id_closed_on_key ON public.closed_dates USING btree (location_id, closed_on)
-- CREATE UNIQUE INDEX closed_dates_pkey ON public.closed_dates USING btree (id)
-- CREATE INDEX customer_consents_customer_idx ON public.customer_consents USING btree (customer_id, recorded_at DESC)
-- CREATE UNIQUE INDEX customer_consents_pkey ON public.customer_consents USING btree (id)
-- CREATE INDEX customers_email_idx ON public.customers USING btree (lower(email))
-- CREATE INDEX customers_name_idx ON public.customers USING btree (lower(full_name))
-- CREATE UNIQUE INDEX customers_phone_key_key ON public.customers USING btree (phone_key)
-- CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)
-- CREATE UNIQUE INDEX delivery_zones_location_id_name_key ON public.delivery_zones USING btree (location_id, name)
-- CREATE UNIQUE INDEX delivery_zones_pkey ON public.delivery_zones USING btree (id)
-- CREATE UNIQUE INDEX email_outbox_dedupe_key_key ON public.email_outbox USING btree (dedupe_key)
-- CREATE UNIQUE INDEX email_outbox_pkey ON public.email_outbox USING btree (id)
-- CREATE INDEX email_outbox_status_idx ON public.email_outbox USING btree (status)
-- CREATE UNIQUE INDEX import_stage_pkey ON public.import_stage USING btree (chunk)
-- CREATE UNIQUE INDEX kitchen_briefs_order_id_version_key ON public.kitchen_briefs USING btree (order_id, version)
-- CREATE UNIQUE INDEX kitchen_briefs_pkey ON public.kitchen_briefs USING btree (id)
-- CREATE UNIQUE INDEX locations_code_key ON public.locations USING btree (code)
-- CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id)
-- CREATE UNIQUE INDEX order_amendments_order_id_revision_key ON public.order_amendments USING btree (order_id, revision)
-- CREATE UNIQUE INDEX order_amendments_pkey ON public.order_amendments USING btree (id)
-- CREATE UNIQUE INDEX order_attachments_pkey ON public.order_attachments USING btree (id)
-- CREATE UNIQUE INDEX order_attachments_storage_path_key ON public.order_attachments USING btree (storage_path)
-- CREATE INDEX order_events_order_idx ON public.order_events USING btree (order_id, at)
-- CREATE UNIQUE INDEX order_events_pkey ON public.order_events USING btree (id)
-- CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id)
-- CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)
-- CREATE INDEX orders_customer_idx ON public.orders USING btree (customer_id)
-- CREATE UNIQUE INDEX orders_idempotency_key_key ON public.orders USING btree (idempotency_key)
-- CREATE INDEX orders_location_date_idx ON public.orders USING btree (location_id, required_date)
-- CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)
-- CREATE UNIQUE INDEX orders_reference_key ON public.orders USING btree (reference)
-- CREATE INDEX orders_status_idx ON public.orders USING btree (order_status)
-- CREATE UNIQUE INDEX payments_idempotency_key_key ON public.payments USING btree (idempotency_key)
-- CREATE INDEX payments_order_idx ON public.payments USING btree (order_id)
-- CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id)
-- CREATE UNIQUE INDEX product_sizes_pkey ON public.product_sizes USING btree (id)
-- CREATE UNIQUE INDEX product_sizes_product_id_size_inch_key ON public.product_sizes USING btree (product_id, size_inch)
-- CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id)
-- CREATE UNIQUE INDEX product_variants_product_id_name_key ON public.product_variants USING btree (product_id, name)
-- CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code)
-- CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)
-- CREATE UNIQUE INDEX sheet_order_imports_pkey ON public.sheet_order_imports USING btree (import_key)
-- CREATE UNIQUE INDEX staff_profiles_pkey ON public.staff_profiles USING btree (user_id)

-- ===== Triggers (pg_get_triggerdef, non-internal) =====
CREATE TRIGGER t_bootstrap_admin AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION bootstrap_admin();
CREATE TRIGGER t_audit_closed AFTER INSERT OR DELETE OR UPDATE ON public.closed_dates FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_audit_customers AFTER DELETE OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_audit_zones AFTER INSERT OR DELETE OR UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_outbox_kick AFTER INSERT ON public.email_outbox FOR EACH STATEMENT EXECUTE FUNCTION kick_email_sender();
CREATE TRIGGER t_audit_locations AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_locations_touch BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_amendments_protect BEFORE DELETE OR UPDATE ON public.order_amendments FOR EACH ROW EXECUTE FUNCTION protect_amendments();
CREATE TRIGGER t_events_protect BEFORE DELETE OR UPDATE ON public.order_events FOR EACH ROW EXECUTE FUNCTION protect_events();
CREATE TRIGGER t_orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_payments_immutable BEFORE DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION block_payment_change();
CREATE TRIGGER t_audit_sizes AFTER INSERT OR DELETE OR UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_sizes_touch BEFORE UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_audit_variants AFTER INSERT OR DELETE OR UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_audit_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER t_products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_audit_staff AFTER INSERT OR DELETE OR UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION write_audit();

-- ===== Cron jobs (cron.job) =====
-- jobname: cakes-email-retry | schedule: */5 * * * * | active: True
-- SELECT cron.schedule('cakes-email-retry', '*/5 * * * *', $c$
--   select net.http_post(
--     url := (select value from public.app_config where key = 'function_url'),
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from public.app_config where key = 'cron_key')),
--     body := '{"op":"process"}'::jsonb)
--   where exists (select 1 from public.email_outbox where status in ('pending','sending') or (status = 'failed' and attempts < 5));
-- $c$);
