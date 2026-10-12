-- Corner Cafe Cakes: schema-only recovery snapshot of Supabase project ilbrfwxblhidtlsjgxlh (public schema).
-- Snapshot taken 2026-10-12. No row data, no customer data, no app_config values.
-- Row level security policies rebuilt from pg_policies (schemas public and storage). 29 policies.

CREATE POLICY "admin_read_audit" ON public.audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['admin'::staff_role]));

CREATE POLICY "managers_write_closed" ON public.closed_dates
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_closed" ON public.closed_dates
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "read_consents" ON public.customer_consents
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'marketing'::staff_role]));

CREATE POLICY "edit_customers" ON public.customers
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role]));

CREATE POLICY "read_customers" ON public.customers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'finance'::staff_role, 'marketing'::staff_role]));

CREATE POLICY "managers_write_zones" ON public.delivery_zones
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_zones" ON public.delivery_zones
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "admin_read_outbox" ON public.email_outbox
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['admin'::staff_role]));

CREATE POLICY "staff_read_briefs" ON public.kitchen_briefs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "managers_edit_locations" ON public.locations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_locations" ON public.locations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "staff read amendments" ON public.order_amendments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'finance'::staff_role]));

CREATE POLICY "staff_read_attachments" ON public.order_attachments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "staff_read_events" ON public.order_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "staff_read_items" ON public.order_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "staff_read_orders" ON public.orders
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "read_payments" ON public.payments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role, 'finance'::staff_role, 'front_of_house'::staff_role]));

CREATE POLICY "managers_write_sizes" ON public.product_sizes
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_sizes" ON public.product_sizes
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "managers_write_variants" ON public.product_variants
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_variants" ON public.product_variants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "managers_write_products" ON public.products
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['manager'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['manager'::staff_role]));

CREATE POLICY "staff_read_products" ON public.products
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "staff read sheet imports" ON public.sheet_order_imports
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_staff());

CREATE POLICY "admin_manage_staff" ON public.staff_profiles
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (has_role(VARIADIC ARRAY['admin'::staff_role]))
  WITH CHECK (has_role(VARIADIC ARRAY['admin'::staff_role]));

CREATE POLICY "read_own_or_manage" ON public.staff_profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR has_role(VARIADIC ARRAY['manager'::staff_role])));

CREATE POLICY "guests_upload_reference" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (((bucket_id = 'cake-references'::text) AND ((storage.foldername(name))[1] = 'incoming'::text) AND (array_length(storage.foldername(name), 1) = 2)));

CREATE POLICY "staff_read_references" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'cake-references'::text) AND is_staff()));

-- Table grants for roles anon and authenticated (information_schema.role_table_grants, schema public).
-- Listed for reference only; column-level grants (for example the customers update grant) are not included here, see migrations.sql.
-- authenticated  app_config             REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  audit_log              REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  closed_dates           DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  customer_consents      REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  customer_summary       DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  customers              REFERENCES, SELECT, TRIGGER, TRUNCATE
-- anon           delivery_zones         DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  delivery_zones         DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  email_outbox           REFERENCES, SELECT, TRIGGER, TRUNCATE
-- anon           kitchen_briefs         DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  kitchen_briefs         DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  locations              DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- anon           order_amendments       REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  order_amendments       REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  order_attachments      REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  order_events           REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  order_items            REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  orders                 REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  payments               REFERENCES, SELECT, TRIGGER, TRUNCATE
-- authenticated  product_sizes          DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  product_variants       DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  products               DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- anon           sheet_order_imports    DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  sheet_order_imports    DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- authenticated  staff_profiles         DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
