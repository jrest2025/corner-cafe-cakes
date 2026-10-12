-- Rolled-back test for step 4. Invented customers only. Ends with an exception so nothing is kept.
do $t$
declare
  adm uuid := '37ea6462-d99a-4ea5-90d5-0191672cd2ff';
  x uuid; y uuid; z uuid; o1 uuid; o2 uuid; n1 uuid; t1 uuid; r jsonb; m uuid; loc uuid; out text := '';
  vx int; vy int; g uuid; gv int; fz uuid;
  procedure_ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select location_id into loc from public.orders limit 1;

  insert into public.customers (full_name, phone, phone_key, notes, first_source)
  values ('Testa Mergeson', '999 0001', '6799990001', 'Likes mocha', 'walk_in') returning id into x;
  insert into public.customers (full_name, phone, phone_key, email, birth_day, birth_month, notes, first_source, review_flag, review_note)
  values ('Testa Mergeson', '999 0001', '6799990001', 'testa@example.invalid', 5, 3, 'Prefers collection after 5pm', 'online', 'possible_duplicate', 'same mobile')
  returning id into y;
  insert into public.customers (full_name, phone, phone_key, first_source) values ('Zed Unrelated', '999 0002', '6799990002', 'walk_in') returning id into z;

  insert into public.orders (reference, location_id, customer_id, source, order_type, order_status, required_date, required_time, estimate_total, is_test, contact_name)
  values ('TEST-M1', loc, y, 'walk_in', 'standard', 'completed', current_date - 10, '12:00', 80, true, 'Testa Mergeson') returning id into o1;
  insert into public.orders (reference, location_id, customer_id, source, order_type, order_status, required_date, required_time, estimate_total, is_test, contact_name)
  values ('TEST-M2', loc, x, 'walk_in', 'standard', 'completed', current_date - 400, '12:00', 120, true, 'Testa Mergeson') returning id into o2;
  insert into public.customer_notes (customer_id, kind, body, created_by, created_by_label) values (y, 'note', 'Test note on Y', adm, 'Test') returning id into n1;
  insert into public.customer_tasks (customer_id, title, due_on, created_by, created_by_label) values (y, 'Call back test', current_date, adm, 'Test') returning id into t1;
  insert into public.marketing_consents (customer_id, brand_id, channel, destination, granted, source)
  select y, b.id, 'whatsapp', '6799990001', true, 'test' from public.brands b where b.code = 'corner-cafe';
  insert into public.marketing_consents (customer_id, brand_id, channel, destination, granted, source)
  select y, b.id, 'email', 'testa@example.invalid', true, 'test' from public.brands b where b.code = 'corner-cafe';

  -- 1 duplicates list finds the pair
  r := public.customer_duplicates();
  if not (r->>'ok')::boolean then raise exception 'dups not ok %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r->'pairs') p where (p#>>'{a,id}')::uuid in (x, y) and (p#>>'{b,id}')::uuid in (x, y)
                 and p->'reasons' ? 'Same mobile number') then raise exception 'pair not found'; end if;
  out := out || '1 ok; ';

  -- 2 preview
  r := public.customer_merge_preview(x, y);
  if (r#>>'{moves,orders}')::int <> 1 or (r#>>'{moves,notes}')::int <> 1 or (r#>>'{moves,tasks}')::int <> 1 then raise exception 'preview moves %', r; end if;
  if not (r->'fills' ? 'email' and r->'fills' ? 'birth_day' and r->'fills' ? 'notes') then raise exception 'preview fills %', r; end if;
  out := out || '2 ok; ';

  -- 3 stale version refused
  select version into vx from public.customers where id = x; select version into vy from public.customers where id = y;
  r := public.customer_merge(x, y, vx, vy + 5, null);
  if r->>'error' <> 'changed' then raise exception 'stale not refused %', r; end if;
  out := out || '3 ok; ';

  -- 4 merge
  r := public.customer_merge(x, y, vx, vy, 'Same person, test');
  if not (r->>'ok')::boolean then raise exception 'merge failed %', r; end if;
  m := (r->>'merge_id')::uuid;
  if (select customer_id from public.orders where id = o1) <> x then raise exception 'order not moved'; end if;
  if (select customer_id from public.customer_notes where id = n1) <> x then raise exception 'note not moved'; end if;
  if (select merged_into from public.customers where id = y) <> x then raise exception 'y not merged'; end if;
  if (select email from public.customers where id = x) <> 'testa@example.invalid' then raise exception 'email not filled'; end if;
  if (select notes from public.customers where id = x) not like 'Likes mocha%From C-%Prefers collection%' then raise exception 'notes not appended %', (select notes from public.customers where id = x); end if;
  if (select contact_name from public.orders where id = o1) <> 'Testa Mergeson' then raise exception 'order contact changed'; end if;
  -- consent read through the kept profile
  if not exists (select 1 from public.consent_now where customer_id = x and channel = 'whatsapp' and granted and applies) then raise exception 'consent not read through'; end if;
  if not exists (select 1 from public.consent_now where customer_id = x and channel = 'email' and granted and applies) then raise exception 'email consent not applied'; end if;
  if (select count(*) from public.marketing_consents where customer_id = x) <> 0 then raise exception 'consent copied'; end if;
  if (select orders_count from public.customer_summary where id = x) <> 2 then raise exception 'summary count'; end if;
  if exists (select 1 from public.customer_summary where id = y) then raise exception 'merged still listed'; end if;
  out := out || '4 ok; ';

  -- 5 merging an already merged profile refused
  r := public.customer_merge(z, y, 1, 1, null);
  if r->>'error' <> 'merged' then raise exception 'merged twice %', r; end if;
  out := out || '5 ok; ';

  -- 6 a detail changed after the merge is kept on undo; untouched ones go back
  update public.customers set birth_day = 9 where id = x;
  r := public.customer_merge_undo(m, 'test undo');
  if not (r->>'ok')::boolean then raise exception 'undo failed %', r; end if;
  if (select customer_id from public.orders where id = o1) <> y then raise exception 'order not back'; end if;
  if (select customer_id from public.orders where id = o2) <> x then raise exception 'own order moved'; end if;
  if (select customer_id from public.customer_tasks where id = t1) <> y then raise exception 'task not back'; end if;
  if (select merged_into from public.customers where id = y) is not null then raise exception 'y still merged'; end if;
  if (select email from public.customers where id = x) is not null then raise exception 'email not removed'; end if;
  if (select notes from public.customers where id = x) <> 'Likes mocha' then raise exception 'notes not restored'; end if;
  if (select birth_day from public.customers where id = x) <> 9 then raise exception 'changed birthday overwritten'; end if;
  if (select review_flag from public.customers where id = y) is distinct from 'possible_duplicate' then raise exception 'flag not restored'; end if;
  if not (r#>'{result,details_kept}' ? 'birth_day') then raise exception 'details kept not reported %', r; end if;
  r := public.customer_merge_undo(m, null);
  if r->>'error' <> 'done' then raise exception 'double undo %', r; end if;
  out := out || '6 ok; ';

  -- 7 not the same person: leaves the list, and can be undone
  r := public.customer_pair_dismiss(y, x, 'Mother and daughter');
  r := public.customer_duplicates();
  if exists (select 1 from jsonb_array_elements(r->'pairs') p where (p#>>'{a,id}')::uuid in (x, y) and (p#>>'{b,id}')::uuid in (x, y)) then raise exception 'dismissed pair still listed'; end if;
  r := public.customer_pair_undismiss((r#>>'{dismissed,0,id}')::uuid);
  if not (r->>'ok')::boolean then raise exception 'undismiss %', r; end if;
  out := out || '7 ok; ';

  -- 8 filters
  r := public.customer_filter('{"spend_min": "100", "source": "walk_in"}'::jsonb, 50);
  if not exists (select 1 from jsonb_array_elements(r->'rows') q where (q->>'id')::uuid = x) then raise exception 'filter missed x %', r->'count'; end if;
  if exists (select 1 from jsonb_array_elements(r->'rows') q where (q->>'id')::uuid = z) then raise exception 'filter wrong z'; end if;
  r := public.customer_filter('{"spend_min": "lots"}'::jsonb, 50);
  if r->>'error' <> 'filter' then raise exception 'bad number allowed'; end if;
  r := public.customer_filter('{"hack": 1}'::jsonb, 50);
  if r->>'error' <> 'filter' then raise exception 'unknown key allowed'; end if;
  r := public.customer_filter('{"consent": "whatsapp", "quiet_days": "5"}'::jsonb, 1000);
  if not exists (select 1 from jsonb_array_elements(r->'rows') q where (q->>'id')::uuid = y) then raise exception 'consent filter missed y'; end if;
  out := out || '8 ok; ';

  -- 9 groups
  r := public.customer_group_save(null, 'Test big spenders', '{"spend_min": "100"}'::jsonb, null);
  if not (r->>'ok')::boolean then raise exception 'group save %', r; end if;
  g := (r->>'id')::uuid; gv := (r->>'version')::int;
  r := public.customer_group_save(null, 'test BIG spenders', '{"spend_min": "50"}'::jsonb, null);
  if r->>'error' <> 'name' then raise exception 'duplicate name allowed'; end if;
  r := public.customer_group_save(g, 'Test big spenders', '{"spend_min": "90"}'::jsonb, gv + 3);
  if r->>'error' <> 'changed' then raise exception 'stale group save allowed'; end if;
  r := public.customer_groups_list();
  if not exists (select 1 from jsonb_array_elements(r->'groups') q where (q->>'id')::uuid = g) then raise exception 'group not listed'; end if;
  out := out || '9 ok; ';

  -- 10 export: only yes for the channel, logged
  r := public.customer_export('{"consent": "whatsapp", "quiet_days": "5"}'::jsonb, 'whatsapp', g, false);
  if not exists (select 1 from jsonb_array_elements(r->'rows') q where q->>'destination' = '999 0001') then raise exception 'export missing y %', r; end if;
  r := public.customer_export('{"source": "walk_in", "spend_min": "100"}'::jsonb, 'whatsapp', null, false);
  if exists (select 1 from jsonb_array_elements(r->'rows') q where q->>'full_name' = 'Testa Mergeson') then raise exception 'exported without permission'; end if;
  if (select count(*) from public.customer_exports where by_user = adm and at > now() - interval '1 minute') <> 2 then raise exception 'export not logged'; end if;
  r := public.customer_group_archive(g, gv);
  if not (r->>'ok')::boolean then raise exception 'archive %', r; end if;
  out := out || '10 ok; ';

  -- 11 roles: front of house cannot merge, export or save groups; can filter
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  r := public.customer_merge(x, y, 1, 1, null);
  if r->>'error' <> 'forbidden' then raise exception 'stranger merged %', r; end if;
  r := public.customer_filter('{}'::jsonb, 5);
  if r->>'error' <> 'forbidden' then raise exception 'stranger filtered'; end if;
  out := out || '11 ok; ';

  raise exception 'RESULT %', out;
end $t$;
