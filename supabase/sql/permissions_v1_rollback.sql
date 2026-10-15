-- Rollback for permissions_v1.sql: Customers functions and read rules go back to the old level ticks.
-- The new tables, switches and the permissions screen functions stay (harmless); drop them separately if wanted.
do $rb$
declare r record; d text;
begin
  for r in select * from (values
    ('crm_home(boolean)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('crm_home(boolean)', $a$(public.has_perm('cust.oversee') or public.has_perm('mgmt.analytics'))$a$, $b$public.has_role('manager','marketing')$b$),
    ('crm_home(boolean)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('customer_duplicates()', $a$has_perm('cust.merge')$a$, $b$has_role('manager')$b$),
    ('_merge_check(uuid,uuid)', $a$has_perm('cust.merge')$a$, $b$has_role('manager')$b$),
    ('customer_merge_undo(uuid,text)', $a$has_perm('cust.merge')$a$, $b$has_role('manager')$b$),
    ('customer_pair_dismiss(uuid,uuid,text)', $a$has_perm('cust.merge')$a$, $b$has_role('manager')$b$),
    ('customer_pair_undismiss(uuid)', $a$has_perm('cust.merge')$a$, $b$has_role('manager')$b$),
    ('customer_export(jsonb,text,uuid,boolean)', $a$has_perm('cust.export')$a$, $b$has_role('manager','marketing')$b$),
    ('customer_export_preview(jsonb,text)', $a$has_perm('cust.export')$a$, $b$has_role('manager','marketing')$b$),
    ('customer_exports_list(integer)', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_exports_list(integer)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('customer_filter(jsonb,integer)', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_filter_options()', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_group_archive(uuid,integer)', $a$has_perm('cust.export')$a$, $b$has_role('manager','marketing')$b$),
    ('customer_group_save(uuid,text,jsonb,integer)', $a$has_perm('cust.export')$a$, $b$has_role('manager','marketing')$b$),
    ('customer_groups_list()', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_groups_list()', $a$has_perm('cust.export')$a$, $b$has_role('manager','marketing')$b$),
    ('customer_history(uuid)', $a$has_perm('cust.comms')$a$, $b$has_role('manager')$b$),
    ('customer_note_add(uuid,text,text,uuid,text,text,uuid)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('customer_note_edit(uuid,integer,text,text)', $a$has_perm('cust.followup')$a$, $b$has_role('front_of_house','marketing')$b$),
    ('customer_note_edit(uuid,integer,text,text)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('customer_note_hide(uuid,text)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('customer_note_history(uuid)', $a$has_perm('cust.comms')$a$, $b$has_role('manager')$b$),
    ('customer_report_logged(uuid,text[])', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_sheet_orders(uuid)', $a$has_perm('cust.history')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('customer_task_add(uuid,text,date,uuid,uuid,uuid,uuid)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('customer_task_update(uuid,integer,text,date,uuid,text)', $a$has_perm('cust.followup')$a$, $b$has_role('front_of_house','marketing')$b$),
    ('customer_task_update(uuid,integer,text,date,uuid,text)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('customer_workspace(uuid)', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','marketing','finance')$b$),
    ('customer_workspace(uuid)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('customer_workspace(uuid)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('my_followups(integer,boolean)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('my_followups(integer,boolean)', $a$has_perm('cust.oversee')$a$, $b$has_role('manager')$b$),
    ('order_followups(uuid)', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','marketing','finance')$b$),
    ('staff_create_customer(jsonb,boolean)', $a$has_perm('cust.create')$a$, $b$has_role('manager','front_of_house')$b$),
    ('staff_mark_reminded(uuid,date)', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('staff_reminders_due()', $a$has_perm('cust.followup')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('staff_search_customers(text)', $a$has_perm('cust.view')$a$, $b$has_role('manager','front_of_house','finance','marketing')$b$),
    ('staff_set_channel_consent(uuid,text[],boolean,text,text)', $a$has_perm('cust.consent')$a$, $b$has_role('manager','front_of_house','marketing')$b$),
    ('staff_update_customer(uuid,integer,jsonb,boolean)', $a$has_perm('cust.edit')$a$, $b$has_role('manager','front_of_house')$b$)
  ) t(sig, old, new) loop
    d := pg_get_functiondef(('public.' || r.sig)::regprocedure);
    if position(r.old in d) > 0 then d := replace(d, r.old, r.new); execute d; end if;
  end loop;
  execute $X$drop policy if exists read_customers on public.customers$X$;
  execute $X$create policy read_customers on public.customers for select using (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'finance'::staff_role, 'marketing'::staff_role]))$X$;
  execute $X$drop policy if exists read_consents on public.customer_consents$X$;
  execute $X$create policy read_consents on public.customer_consents for select using (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'marketing'::staff_role]))$X$;
  execute $X$drop policy if exists read_marketing_consents on public.marketing_consents$X$;
  execute $X$create policy read_marketing_consents on public.marketing_consents for select using (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'marketing'::staff_role]))$X$;
  execute $X$drop policy if exists staff_read_reminders on public.customer_reminders$X$;
  execute $X$create policy staff_read_reminders on public.customer_reminders for select using (has_role(VARIADIC ARRAY['manager'::staff_role, 'front_of_house'::staff_role, 'marketing'::staff_role]))$X$;
end $rb$;
