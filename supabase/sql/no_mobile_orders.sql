-- STATUS: prepared and dry-run tested 17 Oct 2026, NOT applied yet (No mobile work is parked).
-- Counter orders from customers with no mobile (approved by Roneel, 17 Oct 2026). Staff form only; the website still needs a mobile.
-- Staff tap "No mobile?" and either type another number (landline or a family member's: an ordinary phone order),
-- or choose "No phone": with an email the order is saved against that email; with nothing at all it is saved under one
-- shared record "No contact (walk-in orders)" (the café's own number, never messaged), the real name stays on the order,
-- and no email or message is ever sent. Customers need a phone or an email (customers_contact_present), so the shared
-- record carries the café's number instead of changing that rule.
do $$ declare v_id uuid; d text; begin
  if not exists (select 1 from public.app_config where key = 'no_contact_customer') then
    insert into public.customers (full_name, phone, phone_key, preferred_contact, customer_source, notes)
    values ('No contact (walk-in orders)', '+679 892 2760', public._phone_key('+679 892 2760'), 'phone', 'staff_added',
            'Holds counter orders from customers with no phone or email. The number is the café''s own. The real name is on each order. Never message this record.')
    returning id into v_id;
    insert into public.app_config (key, value) values ('no_contact_customer', v_id::text);
  end if;
  d := pg_get_functiondef('public._create_order(jsonb,order_source,uuid,text)'::regprocedure);
  if position('no_contact_customer' in d) > 0 then return; end if;
  d := replace(d, $q$    v_key := public._phone_key(v_phone);
    if v_key !~$q$, $q$    if v_staff and coalesce((p->'customer'->>'no_contact')::boolean, false) and v_phone = '' then
      -- No phone (counter only). With an email: that customer by email, or a new one. With nothing: the shared no-contact record.
      v_cphone := null; v_ckey := null;
      if v_email is not null then
        if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
        select id, email into v_cust, v_cust_email from public.customers where lower(email) = v_email and merged_into is null order by created_at limit 1;
        if v_cust is null then
          insert into public.customers (full_name, email, preferred_contact, first_source, created_by)
          values (v_name, v_email, 'email', p_source, p_actor) returning id, email into v_cust, v_cust_email;
        end if;
        v_contact_email := v_email;
      else
        select nullif(value, '')::uuid into v_cust from public.app_config where key = 'no_contact_customer';
        if v_cust is null then return public._err('phone', 'Orders with no contact are not set up yet. Enter a phone number or email.', 'phone'); end if;
        v_contact_email := null; v_cust_email := null;
      end if;
    else
    v_key := public._phone_key(v_phone);
    if v_key !~$q$);
  d := replace(d, $q$    v_cphone := v_phone; v_ckey := v_key;
    v_contact_email := coalesce(v_email, v_cust_email);
  end if;$q$, $q$    v_cphone := v_phone; v_ckey := v_key;
    v_contact_email := coalesce(v_email, v_cust_email);
    end if;
  end if;$q$);
  if position('no_contact_customer' in d) = 0 or position(E'    end if;\n  end if;\n\n  -- Create the order' in d) = 0 then raise exception 'patch did not apply'; end if;
  execute d;
end $$;
