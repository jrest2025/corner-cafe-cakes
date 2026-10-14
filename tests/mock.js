// Fake Supabase client for local screen tests. Data is invented test data.
(function () {
  var T = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
  function add(n) { var d = new Date(T + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  var setup = { ok: true, location: { code: 'corner-cafe', name: 'Corner Café', phone: '+679 892 2760', address: 'Test Street, Suva', accepts_online: true, today: T, collection_open: '09:00', collection_close: '20:00', slot_minutes: 60, lead_days_standard: 2, lead_days_custom: 5, max_days_ahead: 90 }, closed_dates: [], full_dates: [], delivery_zones: [{ name: 'Nadi town', fee: 10 }, { name: 'Denarau', fee: 15 }, { name: 'Other area', fee: null }],
    products: [
      { code: 'cheesecake', name: 'Cheesecake', variants: [], lead_days: 2, supports_custom: true, supports_message: true, swatch: 'radial-gradient(circle at 50% 35%, #F3E3B8 0 55%, #C99A5B 56%)', sizes: [{ inch: 6, price: 54, serves: 'About 8–10 slices' }, { inch: 8, price: 95, serves: 'About 12–16 slices' }, { inch: 10, price: 130 }, { inch: 12, price: 155 }] },
      { code: 'red-velvet', name: 'Red Velvet', variants: [], lead_days: 2, supports_custom: true, supports_message: true, swatch: 'radial-gradient(circle at 50% 35%, #F7F1E6 0 40%, #9E2B2B 41%)', sizes: [{ inch: 6, price: 38 }, { inch: 8, price: 52 }, { inch: 10, price: 69 }, { inch: 12, price: 94 }] },
      { code: 'chocolate-mudcake-mocha', name: 'Chocolate, Mudcake or Mocha', choice_label: 'Which one?', variants: ['Chocolate', 'Mudcake', 'Mocha'], lead_days: 2, supports_custom: true, supports_message: true, swatch: 'radial-gradient(circle at 50% 35%, #7A4A2F 0 45%, #3A2216 46%)', sizes: [{ inch: 6, price: 42, serves: 'About 8–10 slices' }, { inch: 8, price: 68, serves: 'About 12–16 slices' }, { inch: 10, price: 83 }, { inch: 12, price: 108 }] }
    ] };

  // invented dashboard feed: deterministic pseudo-random orders over 26 months
  function dashFeed() {
    if (window.__dashFail) return { ok: false, message: 'Your login does not have access to the dashboard.' };
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var P = [['Cheesecake', [''], 54], ['Red Velvet', [''], 60], ['Chocolate, Mudcake or Mocha', ['Chocolate', 'Mudcake', 'Mocha'], 58], ['Strawberry', [''], 56], ['Black Forest or White Forest', ['Black Forest', 'White Forest'], 62]];
    var out = [], n = 0;
    for (var back = 790; back >= -20; back--) {
      var day = add(-back), k = rnd() < 0.55 ? 1 : rnd() < 0.5 ? 0 : 2;
      for (var j = 0; j < k; j++) {
        n++; var p = P[Math.floor(rnd() * (back > 400 ? 4 : 5))], size = [6, 8, 10][Math.floor(rnd() * 3)], q = rnd() < 0.15 ? 2 : 1, price = p[2] + (size - 6) * 7;
        var st = back > 0 ? (rnd() < 0.06 ? 'cancelled' : 'completed') : (rnd() < 0.7 ? 'confirmed' : 'awaiting_review');
        var src = rnd() < 0.55 ? 'online' : rnd() < 0.8 ? 'walk_in' : 'whatsapp', c = 'cust' + Math.floor(rnd() * 160), lead = Math.floor(rnd() * 12);
        var fin = st === 'completed' && rnd() < 0.08 ? price * q - 10 : null, imp = back > 120;
        var o = { i: 'd' + n, r: (imp ? 'H-' : 'CC-') + (1000 + n), src: src, st: st, ps: 'unpaid', fm: 'collection', od: add(-back - lead), odok: true, pd: day, pt: '14:00', est: price * q, fin: fin, fee: null, imp: imp, rev: rnd() < 0.05 ? 1 : 0, rush: false, c: c, cn: 'Test Guest ' + c.slice(4), cx: st === 'cancelled' ? (rnd() < 0.5 ? 'Customer changed plans' : null) : null, ca: day, ho: null, ra: null, it: [[p[0], p[1][Math.floor(rnd() * p[1].length)] || null, size, q, price]], pay: null };
        if (!imp && st !== 'cancelled') { o.pay = [['deposit', 20, add(-back - lead)]]; if (st === 'completed') { o.pay.push(['balance', price * q - 20 - (fin != null ? 10 : 0), day]); o.ho = day + 'T03:00:00Z'; o.ra = day + 'T01:00:00Z'; } }
        out.push(o);
      }
    }
    out[out.length - 40].pay.push(['refund', 15, add(-30)]);
    window.__dashLast = out;
    return { ok: true, generated_at: new Date().toISOString(), last_change: new Date().toISOString(), tests_excluded: 2, products: P.map(function (x) { return { n: x[0], on: true }; }).concat([{ n: 'Vanilla or Piña Colada', on: true }]), orders: out };
  }

  // invented register feed: the same invented orders in the register's shape, plus sheet-only records
  function regFeed() {
    var f = dashFeed(); if (!f.ok) return f;
    var T0 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
    var out = f.orders.map(function (o, n) {
      var sheet = o.imp, st = o.st === 'completed' ? 'completed' : o.st === 'cancelled' ? 'cancelled' : o.st === 'confirmed' ? 'confirmed' : 'received';
      var cp = o.st === 'cancelled' ? null : sheet ? (o.pd < T0 ? 'assumed' : 'pending') : o.st === 'completed' ? 'recorded' : o.pd < T0 ? 'not_recorded' : 'pending';
      if (sheet && st === 'completed') st = 'received';
      var paid = 0, ref = 0; (o.pay || []).forEach(function (p) { if (p[0] === 'refund') ref += p[1]; else paid += p[1]; });
      var tot = o.fin != null ? o.fin : o.est;
      return { k: (sheet ? 'sheet:x' : 'app:') + o.i, i: sheet ? (n % 3 ? null : o.i) : o.i, r: o.r, src: o.src === 'online' ? 'Online' : 'Walk-in', sys: sheet ? (o.src === 'online' ? 'Online sheet' : 'Walk-in sheet') : (o.src === 'online' ? 'Website' : 'Staff app'),
        st: st, cp: cp, od: o.od, odb: sheet ? 'Date taken by staff' : 'Entered in the system', odok: !(sheet && n % 5 === 0), pd: o.pd, pt: o.pt, fm: o.fm, c: o.c, cn: o.cn, it: o.it,
        lv: o.est, cv: o.fin, paid: sheet ? null : paid, ref: sheet ? null : ref, bal: sheet || st === 'cancelled' ? null : Math.max(tot - paid, 0), wn: [], pay: o.pay, ho: o.ho, ra: o.ra, rev: o.rev, cx: o.cx, ca: o.ca };
    });
    window.__regLast = out;
    var ago = function (m) { return new Date(Date.now() - m * 6e4).toISOString(); };
    return { ok: true, generated_at: new Date().toISOString(), tests_excluded: 2, products: f.products, orders: out, left_out: { needs_review: 3, excluded: 2 },
      sync: { online: { ok_at: ago(window.__syncStale ? 300 : 3), fail_at: null, fail_msg: null }, walkin: { ok_at: ago(4), fail_at: window.__syncFail ? ago(1) : null, fail_msg: window.__syncFail ? 'The sheet could not be opened' : null }, stale_minutes: 20, records: 580, needs_review: 3, excluded: 2 } };
  }
  var cmDone = {};
  var cmPending = [
    { rec_key: 'sheet:walkin|2026-06-18T08:19:37Z', reference: 'W-0517', source: 'Walk-in sheet', sheet_row: 517, customer: 'TEST CUSTMER A', phone: '912 0001', phone_key: '6799120001', phone_ok: true, email: null, staff_email: false, cake: 'Red Velvet', size_inch: 8, fulfil_date: '2026-06-09', order_date: '2026-06-05', candidates: [{ id: 'c1', customer_no: 101, full_name: 'Test Customer A', phone: '912 0001', email: 'a@example.com', why: 'same mobile number' }] },
    { rec_key: 'sheet:walkin|2026-08-01T22:08:20Z', reference: 'W-0602', source: 'Walk-in sheet', sheet_row: 602, customer: 'Test Short Number', phone: '+77234444', phone_key: '77234444', phone_ok: false, email: null, staff_email: true, cake: 'Mudcake', size_inch: 6, fulfil_date: '2026-07-24', order_date: null, candidates: [] }
  ];
  var regCards = [
    { rec_key: 'sheet:walkin|2026-05-02T01:00:00Z', reference: 'H-0310', source: 'Walk-in sheet', channel: 'Walk-in', sheet_row: 120, order_date: '2026-05-01', order_date_basis: 'Date taken by staff', fulfil_date: '2026-05-04', fulfil_time: '14:00', method: 'collection', customer: 'Test Guest One', phone_key: '6799120001', cake: 'Cheesecake', size_inch: 8, list_value: 95, confirmed_value: null, status: 'received', review: 'needs_review', flags: ['possible_duplicate'], warnings: [], duplicate_of: 'sheet:online|2026-04-30T22:00:00Z', staff_member: 'Staff A', raw: ['Staff A', 'Test', 'Guest One', '', '9120001', '', '', 'Cheesecake'],
      other: { rec_key: 'sheet:online|2026-04-30T22:00:00Z', reference: 'H-0301', source: 'Online sheet', sheet_row: 88, customer: 'Test Guest One', cake: 'Cheesecake', size_inch: 8, fulfil_date: '2026-05-04', order_date: '2026-04-30', status: 'received' } },
    { rec_key: 'sheet:online|2026-06-01T01:00:00Z', reference: 'H-0402', source: 'Online sheet', channel: 'Online', sheet_row: 140, order_date: '2026-06-01', order_date_basis: 'Form submission time', fulfil_date: null, fulfil_time: null, method: 'collection', customer: 'Test Guest Two', phone_key: '6799120002', cake: 'Red Velvet', size_inch: 6, list_value: 38, confirmed_value: null, status: 'received', review: 'needs_review', flags: ['no_fulfilment_date'], warnings: ['No pickup time'], duplicate_of: null, raw: ['Test', 'Guest Two'], other: null },
    { rec_key: 'sheet:online|2026-07-01T01:00:00Z', reference: 'H-0450', source: 'Online sheet', channel: 'Online', sheet_row: 150, order_date: '2026-07-01', order_date_basis: 'Form submission time', fulfil_date: '2026-07-03', method: 'collection', customer: 'Test Test', phone_key: '6799120003', cake: 'Strawberry', size_inch: 6, list_value: 40, status: 'received', review: 'needs_review', flags: ['possible_test'], warnings: [], raw: ['Test', 'Test'], other: null }
  ];
  var regDecisions = [];
  var cust = [{ id: 'c1', full_name: 'Test Customer A', phone: '912 0001', email: 'a@example.com', preferred_contact: 'whatsapp' }, { id: 'c2', full_name: 'Test Customer B', phone: '912 0002' }];
  var prof = {
    c1: { id: 'c1', customer_no: 101, full_name: 'Test Customer A', phone: '912 0001', alt_phone: null, email: 'a@example.com', preferred_contact: 'whatsapp', is_corporate: false, company: null, delivery_address: null, birth_day: null, birth_month: null, preferences: null, notes: 'Prefers less sweet icing', version: 3, review_flag: null, review_note: null, archived_at: null },
    c2: { id: 'c2', customer_no: 102, full_name: 'Test Customer B', phone: '912 0002', alt_phone: null, email: null, preferred_contact: 'whatsapp', is_corporate: false, company: null, delivery_address: null, birth_day: null, birth_month: null, preferences: null, notes: null, version: 1, review_flag: 'possible_duplicate', review_note: 'Same mobile number as 1 other profile with a different name. Check whether this is the same person.', archived_at: null }
  };
  var consentLog = [
    { customer_id: 'c1', channel: 'whatsapp', destination: '6799120001', granted: true, needs_reconfirm: true, source: 'Brought over from the first consent record', recorded_at: '2026-01-10T00:00:00Z' },
    { customer_id: 'c1', channel: 'sms', destination: '6799120001', granted: true, needs_reconfirm: true, source: 'Brought over from the first consent record', recorded_at: '2026-01-10T00:00:00Z' }
  ];
  var custHistory = [{ at: '2026-10-01T02:00:00Z', by: 'Test Manager', field: 'notes', from: null, to: 'Prefers less sweet icing' }];
  function pkey(p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 7 ? '679' + d : d; }
  function consentNow(id) {
    var c = prof[id] || {}, seen = {}, out = [];
    consentLog.filter(function (l) { return l.customer_id === id; }).slice().reverse().forEach(function (l) {
      var k = l.channel + '|' + l.destination; if (seen[k]) return; seen[k] = 1;
      out.push(Object.assign({}, l, { brand_code: 'corner-cafe', applies: l.destination === (l.channel === 'email' ? (c.email || '').toLowerCase() : pkey(c.phone)) }));
    });
    return out;
  }
  var orders = [
    { id: 'o1', reference: 'CC-1001', order_status: 'awaiting_review', payment_status: 'unpaid', order_type: 'standard', source: 'online', created_at: new Date().toISOString(), required_date: add(2), required_time: '14:00:00', estimate_total: 68, final_total: null, deposit_required: null, has_dietary: true, rush_override: false, version: 1, customer_id: 'c1', customers: cust[0], order_items: [{ product_name: 'Chocolate, Mudcake or Mocha', variant: 'Mudcake', size_inch: 8, quantity: 1, finish: 'standard', occasion: 'Birthday', cake_message: 'Happy 30th', dietary: ['Nut allergy'], serves_label: 'About 12–16 slices' }], order_events: [{ at: new Date().toISOString(), kind: 'created', actor_label: 'Guest (online)', detail: { source: 'online' } }], order_attachments: [], payments: [] },
    { id: 'o2', reference: 'CC-1002', order_status: 'awaiting_quote', payment_status: 'unpaid', order_type: 'custom', source: 'online', created_at: new Date().toISOString(), required_date: add(6), required_time: '11:00:00', estimate_total: 95, final_total: null, has_dietary: false, version: 1, customer_id: 'c2', customers: cust[1], order_items: [{ product_name: 'Cheesecake', size_inch: 8, quantity: 1, finish: 'custom', design_description: 'Gold and white, number 50 topper' }], order_events: [], order_attachments: [], payments: [] },
    { id: 'o3', reference: 'CC-1003', order_status: 'confirmed', production_status: 'quality_check', fulfilment_method: 'delivery', delivery_zone: 'Denarau', delivery_address: 'Test Resort, Denarau', delivery_fee: 15, delivery_contact: 'Front desk', brief_version: 1, kitchen_assignee: 'Baker One', payment_status: 'deposit_paid', order_type: 'standard', source: 'walk_in', created_at: new Date().toISOString(), required_date: T, required_time: '17:00:00', estimate_total: 52, final_total: 52, deposit_required: 26, has_dietary: false, version: 3, customer_id: 'c1', customers: cust[0], order_items: [{ product_name: 'Red Velvet', size_inch: 8, quantity: 1, finish: 'standard', cake_message: 'Happy Birthday Test' }], order_events: [{ at: new Date().toISOString(), kind: 'stage', actor_label: 'Baker One', detail: { from: 'decorating', to: 'quality_check' } }, { at: new Date().toISOString(), kind: 'brief_printed', actor_label: 'Test Manager', detail: { version: 1, new_version: true, changes: [] } }], order_attachments: [], payments: [{ amount: 26, kind: 'deposit', method: 'cash', recorded_at: new Date().toISOString() }] },
    { id: 'o4', reference: 'CC-1004', order_status: 'confirmed', production_status: 'ready', qc_by: 'Baker Two', qc_at: new Date().toISOString(), fulfilment_method: 'collection', brief_version: 2, payment_status: 'paid', order_type: 'custom', source: 'phone', created_at: new Date().toISOString(), required_date: T, required_time: '15:00:00', estimate_total: 95, final_total: 120, has_dietary: false, version: 5, customer_id: 'c2', customers: cust[1], order_items: [{ product_name: 'Cheesecake', size_inch: 8, quantity: 1, finish: 'custom', design_description: 'White with gold drip and a number 40 topper' }], order_events: [], order_attachments: [], payments: [{ amount: 120, kind: 'full', method: 'eftpos', recorded_at: new Date().toISOString() }] }
  ];
  orders.push(
    { id: 'o7', reference: 'CC-1007', order_status: 'confirmed', production_status: 'not_started', payment_status: 'paid', fulfilment_method: 'collection', order_type: 'standard', source: 'phone', created_at: new Date().toISOString(), required_date: add(2), required_time: '14:00:00', estimate_total: 162, final_total: 162, has_dietary: false, version: 1, customer_id: 'c2', customers: cust[1], order_items: [{ product_name: 'Cheesecake', size_inch: 6, quantity: 3, finish: 'standard', occasion: 'Office' }], order_amendments: [{ kitchen_ack_required: true, kitchen_ack_at: null }], order_events: [], order_attachments: [], payments: [] },
    { id: 'o8', reference: 'CC-1008', order_status: 'cancelled', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'standard', source: 'walk_in', created_at: new Date().toISOString(), required_date: add(2), required_time: '10:00:00', estimate_total: 76, has_dietary: false, version: 1, customer_id: 'c1', customers: cust[0], order_items: [{ product_name: 'Red Velvet', size_inch: 6, quantity: 2, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] },
    { id: 'o10', reference: 'CC-1013', order_status: 'confirmed', production_status: 'not_started', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'standard', source: 'whatsapp', created_at: new Date().toISOString(), required_date: add(2), required_time: '14:15:00', estimate_total: 42, final_total: 42, has_dietary: false, version: 1, customer_id: 'c1', customers: { full_name: 'Test Customer C', phone: '912 0003' }, order_items: [{ product_name: 'Chocolate, Mudcake or Mocha', variant: 'Mocha', size_inch: 6, quantity: 1, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] }
  );
  // Each order keeps the customer's email at the time of ordering (as the server does)
  orders.forEach(function (o) { if (o.contact_email === undefined && o.customers && o.customers.email) o.contact_email = o.customers.email; });
  window.__orders = orders;
  if (window.__reqOrders) {
    orders.push({ id: 'o11', reference: 'CC-1020', order_status: 'awaiting_approval', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'custom', source: 'phone', created_at: new Date().toISOString(), required_date: add(8), required_time: '14:00:00', estimate_total: 150, final_total: 150, delivery_fee: 0, has_dietary: false, version: 3, customer_id: 'c2', customers: cust[1], contact_name: cust[1].full_name, contact_email: 'guest@example.invalid', order_items: [{ product_id: null, product_name: 'Custom cake', variant: 'Lemon', size_inch: null, serves_label: 'About 30 people, two tiers', unit_price: 150, quantity: 1, finish: 'custom', design_description: 'Two tier, white and gold, fresh flowers' }], order_events: [], order_attachments: window.__photoUrls ? [{ id: 'a1', storage_path: 'incoming/a/1.png', created_at: '2026-10-10T01:00:00Z' }, { id: 'a2', storage_path: 'incoming/a/2.png', created_at: '2026-10-10T02:00:00Z' }, { id: 'a3', storage_path: 'incoming/a/3.png', created_at: '2026-10-10T03:00:00Z' }, { id: 'a9', storage_path: 'incoming/a/9.png', created_at: '2026-10-09T03:00:00Z', removed_at: '2026-10-11T00:00:00Z' }] : [], payments: [] });
    orders.push({ id: 'o12', reference: 'CC-1021', order_status: 'awaiting_quote', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'custom', source: 'walk_in', created_at: new Date().toISOString(), required_date: add(9), required_time: '11:00:00', estimate_total: 0, final_total: null, delivery_fee: 0, has_dietary: false, version: 1, customer_id: 'c2', customers: cust[1], contact_name: cust[1].full_name, order_items: [{ product_id: null, product_name: 'Custom cake', variant: null, size_inch: null, serves_label: '8 inch', unit_price: 0, quantity: 1, finish: 'custom', design_description: 'Football pitch with goal posts' }], order_events: [], order_attachments: [], payments: [] });
  }
  var older = { id: 'o6', reference: 'CC-0500', order_status: 'completed', payment_status: 'paid', production_status: 'ready', fulfilment_method: 'delivery', delivery_zone: 'Denarau', order_type: 'standard', source: 'phone', created_at: '2025-03-01T00:00:00Z', required_date: '2025-03-08', required_time: '15:00:00', estimate_total: 70, final_total: 70, customers: { full_name: 'Test Customer A', phone: '912 0001' }, order_items: [{ product_name: 'Red Velvet', variant: null, size_inch: 8, quantity: 1, finish: 'standard', occasion: 'Birthday' }] };
  function snap(o) { var i = o.order_items[0]; return { reference: o.reference, date: o.required_date, time: o.required_time.slice(0, 5), method: o.fulfilment_method || 'collection', area: o.delivery_zone || null, customer: (o.customers.full_name.split(' ')[0] + ' ' + o.customers.full_name.split(' ').slice(-1)[0].charAt(0) + '.'), cake: i.product_name, variant: i.variant || null, size: i.size_inch, quantity: i.quantity, serves: i.serves_label || null, finish: i.finish, design: i.design_description || null, message: i.cake_message || null, occasion: i.occasion || null, has_dietary: o.has_dietary, dietary: i.dietary || [], dietary_note: null, kitchen_notes: null, order_notes: o.customer_notes || null, rush: !!o.rush_override, photos: [] }; }
  var kitchenRows = [
    Object.assign(snap(orders[2]), { id: 'o3', status: 'confirmed', stage: 'quality_check', assignee: 'Baker One', brief_version: 1, brief_changed: true, late: false }),
    Object.assign(snap(orders[3]), { id: 'o4', status: 'confirmed', stage: 'ready', qc_by: 'Baker Two', ready_at: new Date().toISOString(), brief_version: 2, brief_changed: false, late: false }),
    Object.assign(snap(orders[0]), { id: 'o1', reference: 'CC-1010', date: add(-1), status: 'confirmed', stage: 'baking', brief_version: 1, late: true, amend_pending: [{ revision: 2, by: 'Test Manager', changes: [{ label: 'Cake message', from: '“Happy 30th”', to: '“Happy 40th Sam”' }, { label: 'Cake size', from: '8-inch', to: '10-inch' }] }] }),
    Object.assign(snap(orders[1]), { id: 'o2', reference: 'CC-1011', date: add(1), status: 'confirmed', stage: 'not_started', brief_version: 0, late: false }),
    Object.assign(snap(orders[1]), { id: 'o5', reference: 'CC-1012', date: T, status: 'completed', stage: 'ready', brief_version: 1, handed_over_at: new Date().toISOString(), late: false })
  ];
  var summary = [
    { id: 'c1', full_name: 'Test Customer A', phone: '912 0001', email: 'a@example.com', orders_count: 4, completed_count: 3, completed_spend: 214, average_spend: 71.33, cancelled_count: 0, last_order_at: new Date().toISOString(), favourite_cake: 'Mudcake', occasions: ['Birthday'], marketing_opt_in: true, consent_whatsapp: true, consent_sms: true, consent_reconfirm: true, customer_no: 101, seg_repeat: true, seg_birthday_buyer: true, seg_upcoming_occasion: true, next_occasion_date: add(12), first_source: 'online' },
    { id: 'c2', full_name: 'Test Customer B', phone: '912 0002', orders_count: 1, completed_count: 0, completed_spend: 0, cancelled_count: 0, last_order_at: new Date().toISOString(), favourite_cake: null, occasions: [], marketing_opt_in: false, customer_no: 102, first_source: 'online' }
  ];
  var calls = window.__calls = [];
  function result(table, st) {
    if (table === 'staff_profiles') return { data: { user_id: 'u1', full_name: 'Test Manager', role: window.__role || 'manager', active: true } };
    if (table === 'orders') {
      if (window.__contactDiff) { orders[0].contact_name = 'Sam Collecting'; orders[0].contact_phone = '912 0777'; orders[0].contact_email = null; }
      var lk = st.filters.filter(function (f) { return f[0] === 'ilike:reference'; })[0], ink = st.filters.filter(function (f) { return f[0] === 'in:customer_id'; })[0];
      if (lk) return { data: lk[1].toUpperCase().indexOf('0500') > -1 ? [older] : [] };
      if (ink) return { data: ink[1].indexOf('c1') > -1 ? [older, orders[0]] : [] };
      var idf = st.filters.filter(function (f) { return f[0] === 'id'; })[0];
      if (idf) return { data: orders.filter(function (o) { return o.id === idf[1]; })[0] };
      if (st.head) return { count: 4 };
      var g = st.filters.filter(function (f) { return f[0] === 'gte:required_date'; })[0], l = st.filters.filter(function (f) { return f[0] === 'lte:required_date'; })[0], rd = st.filters.filter(function (f) { return f[0] === 'required_date'; })[0];
      if (window.__calFail && (g || rd)) return { error: { message: 'Failed to fetch' } };
      if (g || rd) return { data: orders.filter(function (o) { return rd ? o.required_date === rd[1] : (o.required_date >= g[1] && o.required_date <= l[1]); }) };
      var cf = st.filters.filter(function (f) { return f[0] === 'customer_id'; })[0];
      if (cf) return { data: orders.filter(function (o) { return o.customer_id === cf[1]; }) };
      return { data: orders };
    }
    if (table === 'customer_summary') { var i = st.filters.filter(function (f) { return f[0] === 'id'; })[0]; return { data: i ? summary.filter(function (s) { return s.id === i[1]; })[0] : summary }; }
    if (table === 'customers') { var mi = st.filters.filter(function (f) { return f[0] === 'merged_into'; })[0]; if (mi) { var mg = (window.__cm && window.__cm.merged) || {}; return { data: Object.keys(mg).filter(function (k) { return mg[k] === mi[1]; }).map(function (k) { return { id: k, customer_no: (prof[k] || {}).customer_no, full_name: (prof[k] || {}).full_name }; }) }; } var ci2 = st.filters.filter(function (f) { return f[0] === 'id'; })[0]; var pr = Object.assign({}, prof[ci2 ? ci2[1] : 'c1']); if (window.__cm && window.__cm.merged[pr.id]) pr.merged_into = window.__cm.merged[pr.id]; return { data: pr }; }
    if (table === 'consent_now') { var cn2 = st.filters.filter(function (f) { return f[0] === 'customer_id'; })[0]; return { data: consentNow(cn2[1]) }; }
    if (table === 'marketing_consents') { var cm2 = st.filters.filter(function (f) { return f[0] === 'customer_id'; })[0]; return { data: consentLog.filter(function (l) { return l.customer_id === cm2[1]; }).slice().reverse() }; }
    if (table === 'locations') return { data: { id: 'l1', accepts_online: true, lead_days_standard: 2, lead_days_custom: 5, max_days_ahead: 90, collection_open: '09:00:00', collection_close: '20:00:00', slot_minutes: 60, daily_capacity: null, defaults_confirmed: false } };
    if (table === 'closed_dates') return { data: [] };
    if (table === 'delivery_zones') return { data: [{ id: 'z1', name: 'Nadi town', fee: 10, active: true, sort: 1 }, { id: 'z2', name: 'Denarau', fee: 15, active: true, sort: 2 }, { id: 'z3', name: 'Other area', fee: null, active: true, sort: 9 }] };
    if (table === 'products') return { data: [{ id: 'p1', name: 'Cheesecake', status: 'active', product_sizes: [{ id: 's1', size_inch: 6, price: 54, active: true }, { id: 's2', size_inch: 8, price: 95, active: true }, { id: 's3', size_inch: 10, price: 130, active: true }, { id: 's4', size_inch: 12, price: 155, active: true }], product_variants: [], sort: 1, supports_custom: true, supports_message: true, lead_days: 2 }, { id: 'p2', name: 'Black Forest or White Forest', status: 'active', choice_label: 'Which forest?', sort: 2, supports_custom: true, supports_message: true, product_variants: [{ id: 'v1', name: 'Black Forest', active: true, sort: 1 }, { id: 'v2', name: 'White Forest', active: true, sort: 2 }], product_sizes: [{ id: 's21', size_inch: 6, price: 42, active: true }, { id: 's22', size_inch: 8, price: 68, active: true }] }] };
    if (table === 'product_changes') return { data: [{ changed_at: '2026-10-12T22:00:00Z', changed_by_label: 'Test Manager', summary: ['8 inch price: $90 to $95'] }] };
    return { data: [] };
  }
  function builder(table) {
    var st = { filters: [], head: false };
    var b = {
      select: function (_, o) { if (o && o.head) st.head = true; return b; },
      eq: function (k, v) { st.filters.push([k, v]); return b; }, ilike: function (k, v) { st.filters.push(['ilike:' + k, v]); return b; }, in: function (k, v) { st.filters.push(['in:' + k, v]); return b; }, or: function () { return b; }, gte: function (k, v) { st.filters.push(['gte:' + k, v]); return b; }, lte: function (k, v) { st.filters.push(['lte:' + k, v]); return b; }, not: function () { return b; },
      order: function () { return b; }, limit: function () { return b; }, update: function (u) { calls.push(['update', table, u]); st.upd = u; return b; }, insert: function (u) { calls.push(['insert', table, u]); return b; }, delete: function () { calls.push(['delete', table]); return b; },
      single: function () { return b; }, maybeSingle: function () { return b; },
      then: function (ok, bad) {
        if (window.__failT && window.__failT[table]) return Promise.resolve({ error: { message: window.__failT[table] === 'denied' ? 'permission denied' : 'Failed to fetch' } }).then(ok, bad);
        var r = result(table, st); if (st.upd && table === 'locations' && r.data) r = { data: Object.assign({}, r.data, st.upd) };
        return Promise.resolve(r).then(ok, bad); }
    };
    return b;
  }
  window.__teamRows = [{ user_id: 'u1', email: 'admin@example.com', full_name: 'Test Manager', role: 'admin', active: true, level_id: 'lv-admin' }, { user_id: 'u2', email: 'fresh@example.com', full_name: null, role: null, active: null, level_id: null }];
  // Access levels: built in Admin, Counter, Kitchen; window.__grants overrides the signed-in person's abilities
  window.__levels = window.__levels || [{ id: 'lv-admin', name: 'Admin', grants: ['admin'], built_in: true }, { id: 'lv-counter', name: 'Counter', grants: ['front_of_house'], built_in: true }, { id: 'lv-kitchen', name: 'Kitchen', grants: ['kitchen'], built_in: true }];
  function lvPeople(id) { return window.__teamRows.filter(function (u) { return u.level_id === id && !u.removed; }).length; }
  function lvList() { return window.__levels.map(function (l) { return Object.assign({}, l, { people: lvPeople(l.id) }); }); }
  function lvPrimary(g) { return ['admin', 'manager', 'front_of_house', 'marketing', 'finance', 'kitchen'].filter(function (r) { return g.indexOf(r) > -1; })[0]; }
  window.__ccsMock = {
    auth: { getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'u1', user_metadata: { must_change_password: !!window.__mustChange } } } } }); }, updateUser: function (a) { calls.push(['auth', 'updateUser', a]); if (window.__pwSame) return Promise.resolve({ error: { message: 'New password should be different from the old password.' } }); window.__mustChange = false; return Promise.resolve({ data: { user: { id: 'u1' } } }); }, signOut: function () { return Promise.resolve({}); }, signInWithPassword: function () { return Promise.resolve({}); } },
    from: builder,
    storage: { from: function () { return {
      createSignedUrls: function (paths) { return Promise.resolve({ data: (paths || []).map(function (x, k) { return { signedUrl: window.__photoUrls ? (window.__photoUrls[x] || window.__photoUrls[k % 3]) : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E' }; }) }); },
      upload: function (path, file) { window.__uploads = window.__uploads || []; window.__uploads.push(path);
        return new Promise(function (res) { setTimeout(function () { res(/fail/.test(file && file.name) ? { error: { message: 'Upload failed' } } : { data: { path: path } }); }, 120); }); } }; } },
    functions: { invoke: function (name, opt) { calls.push(['fn', name, opt.body]); var b = opt.body;
      if (b.op === 'create' && b.email === 'taken@example.com') return Promise.resolve({ data: { ok: false, field: 'email', message: 'A login with this email already exists. Find it in the team list and give it a role there.' } });
      if (b.op === 'create') { var lvc = window.__levels.filter(function (l) { return l.id === b.level_id; })[0]; if (!lvc) return Promise.resolve({ data: { ok: false, field: 'role', message: 'Choose an access level.' } }); window.__teamRows.push({ user_id: 'u' + (window.__teamRows.length + 1), email: b.email, full_name: b.name, role: lvPrimary(lvc.grants), level_id: lvc.id, active: true }); return Promise.resolve({ data: { ok: true, user_id: 'uX', email: b.email } }); }
      if (b.op === 'remove') { if (b.user_id === 'u1') return Promise.resolve({ data: { ok: false, message: 'You cannot remove yourself.' } }); window.__teamRows.forEach(function (u) { if (u.user_id === b.user_id) { u.removed = true; u.active = false; } }); return Promise.resolve({ data: { ok: true } }); }
      if (b.op === 'reset') return Promise.resolve({ data: { ok: true } });
      if (name === 'sheet-backup') {
        var K = window.__bk = window.__bk || { robot: true, linked: false, err: null };
        var st = function (extra) { return Object.assign({ ok: true, robot_email: K.robot ? 'cakes-robot@test.iam.gserviceaccount.com' : null, linked: K.linked ? { url: 'https://docs.google.com/spreadsheets/d/ABC/edit', title: 'Cake backup', tab: 'Cake orders', linked_at: '2026-10-12T04:00:00Z' } : null, last_ok_at: K.linked ? '2026-10-12T04:05:00Z' : null, last_error: K.err, orders_copied: K.linked ? 9 : 0 }, extra || {}); };
        if (b.op === 'status') return Promise.resolve({ data: st() });
        if (b.op === 'link' && /NOSHARE/.test(b.url)) return Promise.resolve({ data: { ok: false, message: 'The robot cannot edit this sheet. In Google Sheets, press Share and add cakes-robot@test.iam.gserviceaccount.com as an Editor.' } });
        if (b.op === 'link') { K.linked = true; K.err = null; return Promise.resolve({ data: st({ written: 9 }) }); }
        if (b.op === 'copy') return Promise.resolve({ data: st({ written: 9 }) });
        if (b.op === 'unlink') { K.linked = false; return Promise.resolve({ data: st() }); }
      }
      return Promise.resolve({ data: { ok: false, message: 'Unknown request.' } }); } },
    rpc: function (fn, args) {
      if (window.__failR && window.__failR[fn]) { calls.push(['rpc-failed', fn, args]); return Promise.resolve({ error: { message: 'Failed to fetch' } }); }
      if (fn === 'dashboard_data') { calls.push(['rpc', fn, args]); return Promise.resolve({ data: dashFeed() }); }
      if (fn === 'dashboard_register') { calls.push(['rpc', fn, args]); return Promise.resolve({ data: regFeed() }); }
      if (fn === 'register_review_list') { calls.push(['rpc', fn, args]); var rl = window.__role || 'manager'; if (rl !== 'manager' && rl !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only managers can review register records.' } }); var rf = regFeed(); return Promise.resolve({ data: { ok: true, sync: Object.assign({}, rf.sync, { needs_review: regCards.length }), records: regCards.slice(), recent: regDecisions.slice() } }); }
      if (fn === 'register_decide') { calls.push(['rpc', fn, args]); if ((args.p_decision === 'duplicate' || args.p_decision === 'exclude') && !(args.p_note || '').trim()) return Promise.resolve({ data: { ok: false, message: 'Add a short reason.' } });
        var ci = regCards.findIndex(function (c) { return c.rec_key === args.p_rec_key; }), ref = ci > -1 ? regCards[ci].reference : 'H-0000';
        if (args.p_decision === 'undo') regDecisions = regDecisions.filter(function (d) { return d.rec_key !== args.p_rec_key; }); else { if (ci > -1) regCards.splice(ci, 1); regDecisions.unshift({ rec_key: args.p_rec_key, reference: ref, decision: args.p_decision, note: args.p_note, by: 'Test Manager', at: new Date().toISOString() }); }
        return Promise.resolve({ data: { ok: true, reference: ref } }); }
      if (fn === 'register_record') { calls.push(['rpc', fn, args]); var rc = regCards.filter(function (c) { return c.rec_key === args.p_rec_key; })[0] || Object.assign({}, regCards[0], { rec_key: args.p_rec_key, reference: 'H-0123', review: 'ok', flags: [], other: null, order_id: null });
        return Promise.resolve({ data: { ok: true, record: rc, history: [{ at: '2026-10-12T07:47:00Z', source: 'load', by: null, changes: { added: true } }, { at: '2026-10-12T08:10:00Z', source: 'sheet', by: null, changes: { size_inch: { from: 6, to: 8 } } }], versions: [{ at: 1 }, { at: 2 }] } }); }
      if (fn === 'admin_delete_order') { calls.push(['rpc', fn, args]); var od = orders.filter(function (x) { return x.id === args.p_order; })[0]; if (!od) return Promise.resolve({ data: { ok: false, message: 'That order was not found.' } }); if ((od.payments || []).length) return Promise.resolve({ data: { ok: false, message: 'This order has a payment recorded, so it cannot be deleted.' } });
        orders.splice(orders.indexOf(od), 1); window.__deleted = (window.__deleted || []).concat([{ id: od.id, reference: od.reference, customer: od.customers.full_name, date: od.required_date, deleted_at: new Date().toISOString(), deleted_by: 'Test Admin', reason: args.p_reason, o: od }]); return Promise.resolve({ data: { ok: true, reference: od.reference } }); }
      if (fn === 'admin_deleted_orders') return Promise.resolve({ data: { ok: true, orders: (window.__deleted || []).slice() } });
      if (fn === 'admin_restore_order') { calls.push(['rpc', fn, args]); var dx = (window.__deleted || []).filter(function (x) { return x.id === args.p_order; })[0]; window.__deleted = window.__deleted.filter(function (x) { return x !== dx; }); orders.push(dx.o); return Promise.resolve({ data: { ok: true, reference: dx.reference } }); }
      calls.push(['rpc', fn, args]);
      if (fn === 'get_order_setup') return Promise.resolve({ data: window.__setupGuest ? Object.assign({}, setup, { guest_emails: true }) : setup });
      if (fn === 'staff_update_customer') {
        var pc = prof[args.p_customer], chg = args.p_changes || {};
        if (window.__custStale && !window.__custStaleDone) { window.__custStaleDone = true; pc.version += 1; return Promise.resolve({ data: { ok: false, error: 'changed', message: 'Someone else changed this customer while you had it open. Your typing is kept. Check their latest details, then save again.', current: Object.assign({}, pc) } }); }
        if (args.p_version !== pc.version) return Promise.resolve({ data: { ok: false, error: 'changed', message: 'Someone else changed this customer while you had it open. Your typing is kept. Check their latest details, then save again.', current: Object.assign({}, pc) } });
        if ('birth_day' in chg && chg.birth_month === 2 && chg.birth_day > 29) return Promise.resolve({ data: { ok: false, error: 'birthday', field: 'birthday', message: 'That day does not exist in that month.' } });
        var oldKey = pkey(pc.phone); Object.keys(chg).forEach(function (k) { pc[k] = chg[k] === '' ? null : chg[k]; }); pc.version += 1;
        var moved = 'phone' in chg && pkey(chg.phone) !== oldKey && consentNow(args.p_customer).some(function (k) { return k.granted && k.destination === oldKey; });
        return Promise.resolve({ data: { ok: true, version: pc.version, changed: Object.keys(chg), orders_updated: args.p_active_orders ? 2 : 0, shared_phone: 0, consent_not_moved: moved } });
      }
      if (fn === 'staff_create_customer') {
        var cp = args.p || {}, ck = pkey(cp.phone), same = Object.keys(prof).filter(function (k) { return ck && pkey(prof[k].phone) === ck; });
        if (same.length && !args.p_confirm_new) return Promise.resolve({ data: { ok: false, error: 'possible_duplicate', message: 'This number or email is already on a customer profile.', matches: same.map(function (k) { return { id: k, customer_no: prof[k].customer_no, full_name: prof[k].full_name, phone: prof[k].phone, why: 'same mobile number' }; }) } });
        var nid = 'c9'; prof[nid] = Object.assign({ id: nid, customer_no: 389, customer_source: 'staff_added', version: 1, alt_phone: null, review_flag: null }, cp);
        summary.push({ id: nid, full_name: cp.full_name, phone: cp.phone, orders_count: 0, completed_count: 0, completed_spend: 0, cancelled_count: 0, occasions: [], customer_no: 389 });
        (cp.consent_channels || []).forEach(function (ch) { consentLog.push({ customer_id: nid, channel: ch, destination: ch === 'email' ? cp.email : ck, granted: true, needs_reconfirm: false, source: 'Staff: Test Manager recorded a yes when adding the customer', recorded_at: new Date().toISOString() }); });
        return Promise.resolve({ data: { ok: true, id: nid, customer_no: 389, shared_with: same.length } });
      }
      if (fn === 'register_customer_review') {
        var rl3 = window.__role || 'manager'; if (rl3 !== 'manager' && rl3 !== 'admin') return Promise.resolve({ data: { ok: false, error: 'forbidden', message: 'Only managers can match customers.' } });
        return Promise.resolve({ data: { ok: true, pending: cmPending.filter(function (x) { return !cmDone[x.rec_key]; }), no_phone: 53, recent: Object.keys(cmDone).map(function (k) { return cmDone[k]; }) } });
      }
      if (fn === 'register_customer_decide') {
        var cr = cmPending.filter(function (x) { return x.rec_key === args.p_rec_key; })[0];
        if (args.p_action === 'undo') { delete cmDone[args.p_rec_key]; return Promise.resolve({ data: { ok: true, reference: cr.reference } }); }
        if (args.p_action === 'new') {
          var nk = pkey(args.p_phone || (cr.phone_ok ? cr.phone : ''));
          if (!nk && !cr.email) return Promise.resolve({ data: { ok: false, error: 'phone', message: 'The number on the sheet is not a full mobile number. Enter the right number, or link to a profile.' } });
          var hit = Object.keys(prof).filter(function (k) { return nk && pkey(prof[k].phone) === nk; });
          if (hit.length) return Promise.resolve({ data: { ok: false, error: 'possible_duplicate', message: 'That number or email is already on a profile. Link to it instead.', matches: hit.map(function (k) { return { id: k, customer_no: prof[k].customer_no, full_name: prof[k].full_name }; }) } });
        }
        cmDone[args.p_rec_key] = { rec_key: args.p_rec_key, reference: cr.reference, name_on_sheet: cr.customer, how: { link: 'staff_link', new: 'staff_new', none: 'left_unlinked' }[args.p_action], customer_no: args.p_action === 'link' ? 101 : args.p_action === 'new' ? 390 : null, customer: args.p_action === 'link' ? 'Test Customer A' : args.p_action === 'new' ? cr.customer : null, by: 'Test Manager', at: new Date().toISOString() };
        return Promise.resolve({ data: { ok: true, reference: cr.reference, customer_id: args.p_action === 'link' ? args.p_customer : 'c10' } });
      }
      // CRM step 3 workspace (invented data)
      if (fn.indexOf('customer_note') === 0 || fn.indexOf('customer_task') === 0 || fn === 'customer_workspace' || fn === 'my_followups' || fn === 'order_followups') {
        var W = window.__ws = window.__ws || { notes: [{ id: 'n1', customer_id: 'c1', kind: 'enquiry', tone: null, channel: 'whatsapp', body: 'Asked about a two-tier cake for a 50th birthday in December.', by: 'Test Staff', at: '2026-10-01T02:00:00Z', mine: false, version: 1, hidden: false, order_id: null, order_ref: null }],
          tasks: [{ id: 't1', customer_id: 'c1', title: 'Send the two-tier quote', due_on: add(-1), status: 'open', assigned_to: 'u1', assignee: 'Test Manager', mine: true, by: 'Test Staff', at: '2026-10-01T02:00:00Z', version: 1, order_id: null, order_ref: null }], versions: {}, n: 1 };
        var role = window.__role || 'manager', mgr = role === 'manager' || role === 'admin', write = mgr || role === 'front_of_house' || role === 'marketing';
        var ok = function (d) { return Promise.resolve({ data: Object.assign({ ok: true }, d) }); }, no = function (code, msg, field) { return Promise.resolve({ data: { ok: false, error: code, message: msg, field: field || null } }); };
        var od = function (t) { return Object.assign({}, t, { overdue: (t.status === 'open' || t.status === 'in_progress') && t.due_on < T }); };
        if (fn === 'customer_workspace') { if (!write && role !== 'finance') return no('forbidden', 'Your login cannot see customer notes.'); return ok({ can_write: write, is_manager: mgr, notes: W.notes.filter(function (x) { return x.customer_id === args.p_customer && (!x.hidden || mgr); }).slice().reverse(), tasks: W.tasks.filter(function (x) { return x.customer_id === args.p_customer; }).map(od), staff: [{ id: 'u1', name: 'Test Manager' }, { id: 'u7', name: 'Test Staff' }] }); }
        if (!write && fn !== 'order_followups') return no('forbidden', 'Your login cannot do that.');
        if (fn === 'customer_note_add') {
          var dup = W.notes.filter(function (x) { return x.idem === args.p_idem; })[0]; if (dup) return ok({ note: dup, repeat: true });
          if (/[0-9][0-9 -]{11,}[0-9]/.test(args.p_body) && args.p_body.replace(/[^0-9]/g, '').length >= 13) return no('body', 'Do not record card or bank account numbers. Write "paid by card" instead.', 'body');
          if (args.p_kind === 'feedback' && !args.p_tone) return no('tone', 'Choose how the feedback felt.', 'tone');
          var ord = orders.filter(function (o) { return o.id === args.p_order; })[0];
          var nn = { id: 'n' + (++W.n + 100), customer_id: args.p_customer, kind: args.p_kind, tone: args.p_tone, channel: args.p_channel, body: args.p_body.trim(), by: 'Test Manager', at: new Date().toISOString(), mine: true, version: 1, hidden: false, order_id: args.p_order, order_ref: ord ? ord.reference : null, idem: args.p_idem };
          W.notes.push(nn); return ok({ note: nn });
        }
        if (fn === 'customer_note_edit') {
          var ne = W.notes.filter(function (x) { return x.id === args.p_note; })[0];
          if (ne.version !== args.p_version) return no('changed', 'Someone changed this note while you were typing.');
          if ((args.p_reason || '').trim().length < 3) return no('reason', 'Say briefly why it is being changed.', 'reason');
          (W.versions[ne.id] = W.versions[ne.id] || []).unshift({ version: ne.version, body: ne.body, by: 'Test Manager', at: new Date().toISOString(), reason: args.p_reason });
          ne.body = args.p_body.trim(); ne.version++; ne.edited_at = new Date().toISOString(); ne.edited_by = 'Test Manager'; return ok({ note: ne });
        }
        if (fn === 'customer_note_hide') { if (!mgr) return no('forbidden', 'Only a manager can remove a note.'); if ((args.p_reason || '').trim().length < 3) return no('reason', 'Say briefly why it is being removed.', 'reason'); var nh = W.notes.filter(function (x) { return x.id === args.p_note; })[0]; nh.hidden = true; nh.hidden_by = 'Test Manager'; nh.hidden_at = new Date().toISOString(); nh.hidden_reason = args.p_reason; return ok({ note: nh }); }
        if (fn === 'customer_note_history') { var nv = W.notes.filter(function (x) { return x.id === args.p_note; })[0]; return ok({ current: nv.body, versions: W.versions[args.p_note] || [] }); }
        if (fn === 'customer_task_add') {
          var tdup = W.tasks.filter(function (x) { return x.idem === args.p_idem; })[0]; if (tdup) return ok({ task: od(tdup), repeat: true });
          if (!args.p_due || args.p_due < T) return no('due', 'The due date is in the past.', 'due');
          var tord = orders.filter(function (o) { return o.id === args.p_order; })[0];
          var nt = { id: 't' + (++W.n + 100), customer_id: args.p_customer, title: args.p_title, due_on: args.p_due, status: 'open', assigned_to: args.p_assignee, assignee: args.p_assignee === 'u1' ? 'Test Manager' : args.p_assignee === 'u7' ? 'Test Staff' : null, mine: args.p_assignee === 'u1', by: 'Test Manager', at: new Date().toISOString(), version: 1, order_id: args.p_order, order_ref: tord ? tord.reference : null, note_id: args.p_note, idem: args.p_idem };
          W.tasks.push(nt); return ok({ task: od(nt) });
        }
        if (fn === 'customer_task_update') {
          var tu = W.tasks.filter(function (x) { return x.id === args.p_task; })[0];
          if (tu.version !== args.p_version) return no('changed', 'Someone else updated this follow-up. Check it again.');
          var a2 = args.p_action;
          if ((a2 === 'done' || a2 === 'cancel') && (!args.p_outcome || args.p_outcome.length < 3)) return no('outcome', 'Say what happened.', 'outcome');
          if (a2 === 'start') tu.status = 'in_progress';
          if (a2 === 'done' || a2 === 'cancel') { tu.status = a2 === 'done' ? 'done' : 'cancelled'; tu.outcome = args.p_outcome; tu.done_by = 'Test Manager'; tu.done_at = new Date().toISOString(); }
          if (a2 === 'reopen') { tu.status = 'open'; if (tu.due_on < T) tu.due_on = T; }
          if (a2 === 'edit') { if (args.p_due < T) return no('due', 'The due date is in the past.', 'due'); tu.due_on = args.p_due; tu.assigned_to = args.p_assignee; tu.mine = args.p_assignee === 'u1'; tu.assignee = args.p_assignee === 'u7' ? 'Test Staff' : args.p_assignee === 'u1' ? 'Test Manager' : null; }
          tu.version++; return ok({ task: od(tu) });
        }
        if (fn === 'my_followups') { var lim = add(args.p_days || 7); return ok({ allowed: true, all: !!args.p_all, tasks: W.tasks.filter(function (x) { return (x.status === 'open' || x.status === 'in_progress') && x.due_on <= lim && (args.p_all || x.mine || !x.assigned_to); }).map(function (x) { var c = prof[x.customer_id] || {}; return Object.assign(od(x), { customer: c.full_name || 'Customer', customer_no: c.customer_no }); }) }); }
        if (fn === 'order_followups') return ok({ tasks: W.tasks.filter(function (x) { return x.order_id === args.p_order && (x.status === 'open' || x.status === 'in_progress'); }).map(od), notes: W.notes.filter(function (x) { return x.order_id === args.p_order && !x.hidden; }).length });
      }
      // CRM step 5: report log, export log, role table, backup check (invented data)
      if (/^(customer_report_logged|customer_exports_list|role_permissions|backup_check)$/.test(fn)) {
        var S5r = window.__role || 'manager', s5Mgr = S5r === 'manager' || S5r === 'admin', s5Cust = s5Mgr || ['front_of_house', 'finance', 'marketing'].indexOf(S5r) > -1;
        var CM5 = window.__cm = window.__cm || { groups: [], exports: [], merges: [], dismissed: [], merged: {}, n: 0 }; CM5.reports = CM5.reports || [];
        var ok5 = function (d) { return Promise.resolve({ data: Object.assign({ ok: true }, d) }); }, no5 = function (c, m) { return Promise.resolve({ data: { ok: false, error: c, message: m } }); };
        if (fn === 'customer_report_logged') { if (!s5Cust) return no5('forbidden', 'Your login cannot print customer reports.'); if (window.__reportFail) return no5('merged', 'That profile was merged into another. Open the main profile.'); var pr5 = prof[args.p_customer] || {}; CM5.reports.push({ kind: 'report', id: CM5.reports.length + 1, at: new Date().toISOString(), by: 'Test Manager', mine: true, customer_id: args.p_customer, customer_no: pr5.customer_no, customer: pr5.full_name, sections: args.p_sections }); return ok5({ by: 'Test Manager', at: new Date().toISOString() }); }
        if (fn === 'customer_exports_list') { if (!s5Cust) return no5('forbidden', 'Your login cannot see the export log.'); var ex5 = (CM5.exports || []).map(function (e, i) { return { kind: 'export', id: i + 1, at: e.at || new Date(Date.now() - 3600000).toISOString(), by: 'Test Manager', mine: true, channel: e.channel, group: e.group ? 'Test group' : null, filter: e.filter || { spend_min: '100' }, reconfirm: e.include, count: e.rows, left_no: 1, left_re: 0 }; }); return ok5({ all: s5Mgr, rows: CM5.reports.concat(ex5).sort(function (a, b) { return a.at < b.at ? 1 : -1; }) }); }
        if (!s5Mgr) return no5('forbidden', 'Only a manager can see this.');
        if (fn === 'role_permissions') { var R5 = ['admin', 'manager', 'front_of_house', 'kitchen', 'finance', 'marketing'], mk = function (area, label, yes, part) { var c = {}; R5.forEach(function (r) { c[r] = r === 'admin' || yes.indexOf(r) > -1 ? 'yes' : (part || []).indexOf(r) > -1 ? 'partly' : 'no'; }); return { area: area, label: label, found: true, source: 'test', cells: c }; };
          return ok5({ roles: R5, checked_at: new Date().toISOString(), notes: ['Admin can do everything a manager can, plus team access.', 'Partly means some actions on that screen are manager only.'], rows: [mk('Orders', 'See orders', ['manager', 'front_of_house', 'finance', 'marketing']), mk('Orders', 'Confirm, decline, cancel, add a note', ['manager'], ['front_of_house']), mk('Kitchen', 'Kitchen board and stages', ['manager', 'front_of_house', 'kitchen']), mk('Customers', 'Export a contact list', ['manager', 'marketing']), mk('Reports', 'Dashboard', ['marketing'])] }); }
        if (fn === 'backup_check') return ok5({ checked_at: new Date().toISOString(), sheet: { linked: !!window.__sheetLinked, title: window.__sheetLinked ? 'Cake backup' : null, tab: 'Cake orders', last_ok_at: window.__sheetLinked ? new Date().toISOString() : null, last_error: null }, orders: 10, synced: window.__sheetLinked ? 10 : 0, pending: window.__sheetLinked ? 0 : 10,
          snapshots: [{ name: 'backup_20261013', tables: 46, rows: 5000, at: new Date().toISOString(), covers_crm: true }, { name: 'backup_20261012', tables: 11, rows: 1500, at: null, covers_crm: false }],
          drills: [{ at: new Date().toISOString(), snapshot: 'backup_20261013', passed: true, result: 'All 46 table counts match live.' }] });
      }
      // CRM step 4: filters, groups, export, duplicates (invented data)
      if (/^customer_(filter|filter_options|groups_list|group_save|group_archive|export_preview|export|duplicates|merge_preview|merge|merge_undo|pair_dismiss|pair_undismiss)$/.test(fn)) {
        var CMr = window.__role || 'manager', cmMgr = CMr === 'manager' || CMr === 'admin', cmMkt = cmMgr || CMr === 'marketing';
        var CM = window.__cm = window.__cm || { groups: [], exports: [], merges: [], dismissed: [], merged: {}, n: 0 };
        var okc = function (d) { return Promise.resolve({ data: Object.assign({ ok: true }, d) }); }, noc = function (code, msg, field) { return Promise.resolve({ data: { ok: false, error: code, message: msg, field: field || null } }); };
        var live = function () { return summary.filter(function (r) { return !CM.merged[r.id]; }); };
        var match = function (f) { return live().filter(function (r) {
          if (f.spend_min && !(r.completed_spend >= Number(f.spend_min))) return false;
          if (f.spend_max && !(r.completed_spend <= Number(f.spend_max))) return false;
          if (f.orders_min && !(r.orders_count >= Number(f.orders_min))) return false;
          if (f.segment && !r[f.segment]) return false;
          if (f.source && r.first_source !== f.source) return false;
          if (f.cake && r.favourite_cake !== f.cake) return false;
          if (f.consent === 'any' && !(r.consent_whatsapp || r.consent_sms)) return false;
          if (f.consent === 'whatsapp' && !r.consent_whatsapp) return false;
          if (f.consent === 'none' && (r.consent_whatsapp || r.consent_sms)) return false;
          return true; }); };
        var badf = function (f) { var k = Object.keys(f || {}).filter(function (x) { return ['spend_min', 'spend_max', 'orders_min', 'orders_max', 'quiet_days'].indexOf(x) > -1 && !/^\d+(\.\d{1,2})?$/.test(f[x]); })[0]; return k ? 'Use a plain number for ' + k.replace('_', ' ') + '.' : null; };
        if (CMr === 'kitchen') return noc('forbidden', 'Your login cannot see customers.');
        if (fn === 'customer_filter') { if (badf(args.p_filter)) return noc('filter', badf(args.p_filter)); var ms = match(args.p_filter); return okc({ count: ms.length, rows: ms.slice(0, args.p_limit || 500) }); }
        if (fn === 'customer_filter_options') return okc({ occasions: ['Anniversary', 'Birthday', 'Wedding'], cakes: ['Mudcake', 'Red Velvet', 'Cheesecake'] });
        if (fn === 'customer_groups_list') return okc({ can_edit: cmMkt, groups: CM.groups.filter(function (g) { return !g.archived; }).map(function (g) { return Object.assign({}, g, { count: match(g.filter).length }); }) });
        if (fn === 'customer_group_save') {
          if (!cmMkt) return noc('forbidden', 'Only a manager or marketing can save groups.');
          var gn = (args.p_name || '').trim(); if (gn.length < 2) return noc('name', 'Give the group a name of 2 to 60 characters.', 'name');
          if (!Object.keys(args.p_filter || {}).length) return noc('filter', 'Choose at least one filter before saving a group.');
          if (CM.groups.some(function (g) { return !g.archived && g.name.toLowerCase() === gn.toLowerCase() && g.id !== args.p_id; })) return noc('name', 'A group with that name already exists.', 'name');
          if (args.p_id) { var ge = CM.groups.filter(function (g) { return g.id === args.p_id; })[0]; if (ge.version !== args.p_version) return noc('changed', 'Someone else changed this group. Open it again.'); ge.name = gn; ge.filter = args.p_filter; ge.version++; ge.updated_by = 'Test Manager'; return okc({ id: ge.id, version: ge.version }); }
          var ng = { id: 'g' + (++CM.n), name: gn, filter: args.p_filter, version: 1, by: 'Test Manager', at: new Date().toISOString() }; CM.groups.push(ng); return okc({ id: ng.id, version: 1 });
        }
        if (fn === 'customer_group_archive') { var ga = CM.groups.filter(function (g) { return g.id === args.p_id; })[0]; if (!ga || ga.version !== args.p_version) return noc('changed', 'That group was changed or removed already.'); ga.archived = true; return okc({}); }
        var expRows = function (f, ch) { return match(f).map(function (r) { var yes = ch === 'whatsapp' ? r.consent_whatsapp : ch === 'sms' ? r.consent_sms : ch === 'email' ? r.consent_email : false; return { r: r, state: !yes ? 'no' : r.consent_reconfirm ? 'reconfirm' : 'yes' }; }); };
        if (fn === 'customer_export_preview') { if (!cmMkt) return noc('forbidden', 'Only a manager or marketing can export customers.'); var ep = expRows(args.p_filter, args.p_channel); var cnt = function (st) { return ep.filter(function (x) { return x.state === st; }).length; }; return okc({ yes: cnt('yes'), reconfirm: cnt('reconfirm'), no: cnt('no'), total: ep.length }); }
        if (fn === 'customer_export') {
          if (!cmMkt) return noc('forbidden', 'Only a manager or marketing can export customers.');
          var ex = expRows(args.p_filter, args.p_channel), rows = ex.filter(function (x) { return x.state === 'yes' || (args.p_include_reconfirm && x.state === 'reconfirm'); }).map(function (x) { return { customer_no: x.r.customer_no, full_name: x.r.full_name, destination: args.p_channel === 'email' ? x.r.email : x.r.phone, reconfirm: x.state === 'reconfirm', orders: x.r.orders_count, spend: x.r.completed_spend, last_order: (x.r.last_order_at || '').slice(0, 10) }; });
          CM.exports.push({ channel: args.p_channel, group: args.p_group, rows: rows.length, include: !!args.p_include_reconfirm }); return okc({ rows: rows, left_out_no: ex.filter(function (x) { return x.state === 'no'; }).length });
        }
        if (!cmMgr) return noc('forbidden', 'Only a manager can review duplicate customers.');
        var card = function (id) { var r = summary.filter(function (x) { return x.id === id; })[0] || {}, p = prof[id] || {}; return { id: id, customer_no: r.customer_no, full_name: r.full_name, phone: r.phone, email: r.email || null, orders: r.orders_count, spend: r.completed_spend, last_order_at: r.last_order_at, created_at: id === 'c1' ? '2025-01-01T00:00:00Z' : '2026-09-01T00:00:00Z', version: p.version || 1, notes_count: id === 'c1' ? 1 : 0, open_tasks: 0, sheet_orders: id === 'c1' ? 1 : 0, consents: id === 'c1' ? 2 : 0, source: 'sheet_import' }; };
        var pairKey = 'c1|c2';
        if (fn === 'customer_duplicates') return okc({ pairs: (CM.merged.c2 || CM.dismissed.some(function (d) { return !d.undone; })) ? [] : [{ a: card('c1'), b: card('c2'), reasons: ['Same mobile number', 'Same name'], strong: true }],
          merges: CM.merges.slice().reverse(), dismissed: CM.dismissed.filter(function (d) { return !d.undone; }) });
        if (fn === 'customer_merge_preview') return okc({ keep: card(args.p_keep), merge: card(args.p_merge), fills: args.p_keep === 'c2' ? { email: 'a@example.com', birth_day: 5, birth_month: 3 } : { notes: 'x' }, not_kept: [], moves: { orders: 1, notes: 0, tasks: 0, sheet_orders: 0, profiles: 0 } });
        if (fn === 'customer_merge') { if (window.__mergeStale) return noc('changed', 'One of these profiles changed while you were looking. Check the details again, then merge.'); CM.merged[args.p_merge] = args.p_keep; var mk = summary.filter(function (x) { return x.id === args.p_keep; })[0], mm = summary.filter(function (x) { return x.id === args.p_merge; })[0];
          CM.merges.push({ id: 'm' + (++CM.n), at: new Date().toISOString(), by: 'Test Manager', reason: args.p_reason, kept: { id: mk.id, customer_no: mk.customer_no, full_name: mk.full_name }, merged: { id: mm.id, customer_no: mm.customer_no, full_name: mm.full_name } }); return okc({ merge_id: 'm' + CM.n, moved: { orders: 1 } }); }
        if (fn === 'customer_merge_undo') { var mu = CM.merges.filter(function (m) { return m.id === args.p_merge; })[0]; if (mu.undone_at) return noc('done', 'This merge has already been undone.'); mu.undone_at = new Date().toISOString(); mu.undone_by = 'Test Manager'; mu.undo_result = { details_kept: ['email'] }; delete CM.merged[mu.merged.id]; return okc({ result: { details_kept: ['email'] } }); }
        if (fn === 'customer_pair_dismiss') { CM.dismissed.push({ id: 'd' + (++CM.n), at: new Date().toISOString(), by: 'Test Manager', note: args.p_note, a: { customer_no: 101, full_name: 'Test Customer A' }, b: { customer_no: 102, full_name: 'Test Customer B' } }); return okc({}); }
        if (fn === 'customer_pair_undismiss') { CM.dismissed.forEach(function (d) { if (d.id === args.p_id) d.undone = true; }); return okc({}); }
      }
      if (fn === 'customer_sheet_orders') return Promise.resolve({ data: { ok: true, orders: args.p_customer === 'c1' ? [{ rec_key: 'sheet:walkin|2025-11-02T01:00:00Z', reference: 'W-0412', source: 'Walk-in sheet', fulfil_date: '2025-11-03', cake: 'Black Forest', size_inch: 8, value: 85, name_on_sheet: 'TEST CUST A', how: 'auto_match' }] : [] } });
      if (fn === 'customer_history') { var rl2 = window.__role || 'manager'; if (rl2 !== 'manager' && rl2 !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only a manager can see the change history.' } }); return Promise.resolve({ data: { ok: true, changes: custHistory } }); }
      if (fn === 'staff_set_channel_consent') { var pc2 = prof[args.p_customer]; args.p_channels.forEach(function (ch) { consentLog.push({ customer_id: args.p_customer, channel: ch, destination: ch === 'email' ? (pc2.email || '').toLowerCase() : pkey(pc2.phone), granted: args.p_granted, needs_reconfirm: false, source: 'Staff: Test Manager recorded a ' + (args.p_granted ? 'yes' : 'no'), recorded_at: new Date().toISOString() }); }); return Promise.resolve({ data: { ok: true, recorded: args.p_channels.length } }); }
      if (fn === 'staff_search_customers') return Promise.resolve({ data: (args.q.indexOf('0001') > -1 || args.q.toLowerCase().indexOf('customer a') > -1) ? [summary[0]] : [] });
      if (fn === 'calendar_counts') { var m = {}; orders.forEach(function (o) { if (o.order_status === 'cancelled' || o.order_status === 'declined' || o.required_date < args.p_from || o.required_date > args.p_to) return; var r = m[o.required_date] = m[o.required_date] || { day: o.required_date, orders: 0, cakes: 0, deliveries: 0, attention: 0, done: 0 }; r.orders++; r.cakes += o.order_items.reduce(function (s, i) { return s + (i.quantity || 1); }, 0); if (['awaiting_review', 'awaiting_quote', 'awaiting_deposit'].indexOf(o.order_status) > -1) r.attention++; }); return Promise.resolve({ data: Object.keys(m).map(function (k) { return m[k]; }) }); }
      if (fn === 'staff_create_order' && window.__createFail) return Promise.reject(new Error('Failed to fetch'));
      if (fn === 'staff_create_order' && args.p.rush && !(args.p.rush.approved_by || '').trim()) return Promise.resolve({ data: { ok: false, error: 'date', field: 'date', message: 'Enter who approved the short notice.' } });
      if (fn === 'staff_create_order' && args.p.product_code === 'custom-cake') { if (calls.filter(function (c) { return c[1] === 'staff_create_order' && c[2].p.idempotency_key === args.p.idempotency_key; }).length === 1) orders.push({ id: 'o13', reference: 'CC-1022', order_status: args.p.price ? 'awaiting_approval' : 'awaiting_quote', production_status: 'not_started', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'custom', source: args.p.source, created_at: new Date().toISOString(), required_date: args.p.date, required_time: args.p.time + ':00', estimate_total: args.p.price || 0, final_total: args.p.price || null, delivery_fee: 0, has_dietary: false, version: 1, customers: { full_name: 'Custom Guest', phone: '912 0098' }, order_items: [{ product_id: null, product_name: 'Custom cake', variant: args.p.variant, size_inch: null, serves_label: args.p.size_note, quantity: args.p.quantity, finish: 'custom', design_description: args.p.design }], order_events: [], order_attachments: [], payments: [] }); return Promise.resolve({ data: { ok: true, order_id: 'o13', reference: 'CC-1022', status: args.p.price ? 'awaiting_approval' : 'awaiting_quote', estimate: args.p.price || 0 } }); }
      if (fn === 'staff_create_order') { var seen = calls.filter(function (c) { return c[1] === 'staff_create_order' && c[2].p.idempotency_key === args.p.idempotency_key; }).length; if (seen === 1) orders.push({ id: 'o9', reference: 'CC-1009', order_status: args.p.confirm_now ? 'confirmed' : 'awaiting_review', production_status: 'not_started', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'standard', source: args.p.source, created_at: new Date().toISOString(), required_date: args.p.date, required_time: args.p.time + ':00', estimate_total: 54 * args.p.quantity, has_dietary: false, version: 1, customers: { full_name: 'New Calendar Guest', phone: '912 0099' }, order_items: [{ product_name: 'Cheesecake', size_inch: args.p.size_inch, quantity: args.p.quantity, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] }); }
      if (fn === 'staff_create_order') return Promise.resolve({ data: { ok: true, order_id: 'o9', reference: 'CC-1009', status: args.p.confirm_now ? (args.p.deposit_required ? 'awaiting_deposit' : 'confirmed') : 'awaiting_review' } });
      if (fn === 'admin_list_users') return Promise.resolve({ data: window.__teamRows.slice() });
      if (fn === 'staff_order_emails') { var oe = orders.filter(function (x) { return x.id === args.p_order; })[0] || {}; return Promise.resolve({ data: { ok: true, guest_emails: window.__guestEmails !== false, emails: (window.__mails || {})[args.p_order] || (oe.contact_email ? [{ id: 'm1', kind: 'guest_received', to: oe.contact_email, status: window.__mailStatus || 'sent', attempts: 1, created_at: '2026-10-14T20:00:00Z', sent_at: '2026-10-14T20:00:05Z' }] : []) } }); }
      if (fn === 'staff_resend_email') { var or2 = orders.filter(function (x) { return x.id === args.p_order; })[0] || {}; if (!or2.contact_email) return Promise.resolve({ data: { ok: false, message: 'This order has no email address. Add one with Amend order first.' } }); return Promise.resolve({ data: { ok: true, kind: 'guest_received', to: or2.contact_email } }); }
      if (fn === 'my_access') { var mr = window.__role || 'manager'; var mg = window.__grants || [mr]; var ml = window.__levels.filter(function (l) { return l.grants.join() === mg.join(); })[0]; return Promise.resolve({ data: { ok: true, role: mr, grants: mg, level_id: ml ? ml.id : null, level_name: ml ? ml.name : window.__levelName || '' } }); }
      if (fn === 'admin_list_team') { if ((window.__role || 'manager') !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only an admin can manage the team.' } }); return Promise.resolve({ data: { ok: true, team: window.__teamRows.filter(function (u) { return !u.removed; }).map(function (u) { var l = window.__levels.filter(function (x) { return x.id === u.level_id; })[0]; return Object.assign({}, u, { level_name: l ? l.name : null }); }) } }); }
      if (fn === 'admin_levels') { if ((window.__role || 'manager') !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only an admin can manage access levels.' } }); return Promise.resolve({ data: { ok: true, levels: lvList() } }); }
      if (fn === 'admin_level_save') {
        if (window.__levels.some(function (l) { return l.name.toLowerCase() === args.p_name.toLowerCase() && l.id !== args.p_id; })) return Promise.resolve({ data: { ok: false, message: 'A level with this name already exists.' } });
        if (!args.p_id) { var nid = 'lv-' + (window.__levels.length + 1); window.__levels.push({ id: nid, name: args.p_name, grants: args.p_grants.slice(), built_in: false }); return Promise.resolve({ data: { ok: true, id: nid } }); }
        var le = window.__levels.filter(function (l) { return l.id === args.p_id; })[0]; if (le.built_in) return Promise.resolve({ data: { ok: false, message: 'Admin, Counter and Kitchen are built in and cannot be changed. Add a new level instead.' } });
        le.name = args.p_name; le.grants = args.p_grants.slice(); return Promise.resolve({ data: { ok: true, id: le.id } }); }
      if (fn === 'admin_level_delete') { var ld = window.__levels.filter(function (l) { return l.id === args.p_id; })[0]; if (!ld) return Promise.resolve({ data: { ok: false, message: 'That level was not found.' } }); if (ld.built_in) return Promise.resolve({ data: { ok: false, message: 'Admin, Counter and Kitchen are built in and cannot be deleted.' } }); var np = lvPeople(ld.id); if (np) return Promise.resolve({ data: { ok: false, message: np + (np === 1 ? ' person is' : ' people are') + ' on this level. Move them to another level first.' } }); window.__levels = window.__levels.filter(function (l) { return l !== ld; }); return Promise.resolve({ data: { ok: true } }); }
      if (fn === 'admin_set_staff_level') { var ls = window.__levels.filter(function (l) { return l.id === args.p_level; })[0]; if (!ls) return Promise.resolve({ data: { ok: false, message: 'Choose an access level.' } }); if (args.p_user === 'u1' && (ls.grants.indexOf('admin') < 0 || !args.p_active)) return Promise.resolve({ data: { ok: false, message: 'You cannot remove your own admin access.' } }); window.__teamRows.forEach(function (u) { if (u.user_id === args.p_user) { u.full_name = args.p_name; u.level_id = ls.id; u.role = lvPrimary(ls.grants); u.active = args.p_active; } }); return Promise.resolve({ data: { ok: true } }); }
      if (fn === 'kitchen_board') { if (window.__photoUrls) kitchenRows[0].photos = ['incoming/a/1.png', 'incoming/a/2.png']; return Promise.resolve({ data: { ok: true, today: T, orders: kitchenRows } }); }
      if (fn === 'staff_print_brief') { var o = orders.filter(function (x) { return x.id === args.p_order; })[0]; window.__briefCalls = (window.__briefCalls || 0) + 1; return Promise.resolve({ data: { ok: true, version: 2, new_version: true, changes: ['message', 'design'], first_printed_at: '2026-10-14T03:00:00Z', paper: 'A5', email: window.__briefEmail || { state: 'queued', to: 'roneel@jacksfiji.com', cc: 'cornercafe@jacksfiji.com' }, snapshot: Object.assign(snap(o), window.__candles ? { candles: window.__candles } : {}), slip: { name: 'Mere Tavola', phone: '+679 912 3456', price: window.__slipNoPrice ? null : 68, paid: window.__slipNoPrice ? 0 : 20, source: 'phone', method: o.fulfilment_method, address: o.fulfilment_method === 'delivery' ? 'Room 214, Sheraton Denarau' : null, receiver: o.fulfilment_method === 'delivery' ? 'Front desk' : null, taken_by: 'Ana Manager', ordered_at: '2026-10-12T22:15:00Z' } } }); }
      if (fn === 'staff_reminders_due') { if (window.__remFail) return Promise.resolve({ error: { message: 'Failed to fetch' } }); return Promise.resolve({ data: { ok: true, rows: (window.__remDone ? [] : [{ id: 'c1', name: 'Test Customer A', phone: '912 0001', date: summary[0].next_occasion_date, reason: 'Birthday for Mia', cake: 'Mudcake', reconfirm: false }, { id: 'c2', name: 'Test Customer B', phone: '912 0002', date: summary[0].next_occasion_date, reason: 'Anniversary', cake: null, reconfirm: true }]) } }); }
      if (fn === 'staff_mark_reminded') { window.__remMarked = args; window.__remDone = true; return Promise.resolve({ data: { ok: true } }); }
      if (fn === 'staff_save_product') { window.__menuSaved = args.p; if (window.__menuFail) return Promise.reject(new Error('Failed to fetch')); return Promise.resolve({ data: { ok: true, id: args.p.id || 'p9', created: !args.p.id, changed: true } }); }
      if (fn === 'staff_set_quote') { window.__quoteSet = args; var oq = orders.filter(function (x) { return x.id === args.p_order; })[0]; if (oq) { oq.final_total = args.p_price + Number(oq.delivery_fee || 0); oq.estimate_total = oq.final_total; oq.order_status = 'awaiting_approval'; oq.version++; if (args.p_size_note != null) { oq.order_items[0].serves_label = args.p_size_note; oq.order_items[0].variant = args.p_flavour; } } return Promise.resolve({ data: { ok: true, status: 'awaiting_approval', version: oq ? oq.version : 1, total: oq ? oq.final_total : args.p_price, can_email: !!(oq && oq.contact_email) } }); }
      if (fn === 'staff_order_action' && args.p_action === 'confirm' && window.__reqOrders) { window.__confirmArgs = args; var oc2 = orders.filter(function (x) { return x.id === args.p_order; })[0]; var st2 = args.p_deposit ? 'awaiting_deposit' : 'confirmed'; if (oc2) { oc2.order_status = st2; oc2.production_status = 'not_started'; oc2.version++; } return Promise.resolve({ data: { ok: true, status: st2, version: oc2 ? oc2.version : 2 } }); }
      if (fn === 'staff_remove_photo') { window.__photoRemoved = args; return Promise.resolve({ data: { ok: true, reference: 'CC-1020', brief_needs_reprint: false, left: 2 } }); }
      if (fn === 'staff_send_quote') { window.__quoteSent = (window.__quoteSent || 0) + 1; return Promise.resolve({ data: { ok: true, to: 'guest@example.invalid' } }); }
      if (fn === 'staff_set_candles') { window.__candlesSet = args; return Promise.resolve({ data: args.p_candles && args.p_candles.length > 60 ? { ok: false, error: 'candles', message: 'Keep the candles to 60 characters.' } : { ok: true, changed: true, brief_needs_reprint: true } }); }
      if (fn === 'kitchen_set_stage' && args.p_stage === 'ready' && !args.p_name) return Promise.resolve({ data: { ok: false, error: 'qc', message: 'Enter the name of the person who checked the cake.' } });
      if (fn === 'staff_set_fulfilment') return Promise.resolve({ data: { ok: true, total: 62 } });
      if (fn === 'staff_amend_order') {
        var ch = args.p_changes || {}, list = [];
        if (ch.time) list.push({ field: 'time', label: 'Collection time', from: '2:00pm', to: ch.time === '16:00' ? '4:00pm' : ch.time, kitchen: true });
        if (ch.size_inch) list.push({ field: 'size', label: 'Cake size', from: '8-inch', to: ch.size_inch + '-inch', kitchen: true });
        if (ch.message != null) list.push({ field: 'message', label: 'Cake message', from: 'None', to: '“' + ch.message + '”', kitchen: true });
        var after = ch.size_inch === 10 ? 83 : 68; if (after !== 68) list.push({ field: 'price', label: 'Order total', from: 'FJD 68.00', to: 'FJD ' + after + '.00', kitchen: false });
        if (!list.length) return Promise.resolve({ data: { ok: false, error: 'nothing', message: 'Nothing has changed yet.' } });
        if (window.__amendStale) return Promise.resolve({ data: { ok: false, error: 'changed', message: 'Someone else updated this order while you had it open. Check the latest details, then make your change again.' } });
        if (!args.p_commit) return Promise.resolve({ data: { ok: true, preview: true, changes: list, warnings: [], price_before: 68, price_after: after, paid: 0, balance_before: 68, balance_after: after, excess_paid: 0, kitchen_ack_required: false, needs_reprint: false, time_change_cause: ch.time ? (args.p_requested_by === 'guest' ? 'guest_request' : 'business_delay') : null, customer_record: false } });
        orders[0].revision = 1; orders[0].version = (orders[0].version || 1) + 1;
        orders[0].order_amendments = [{ revision: 1, amended_at: new Date().toISOString(), staff_label: 'Test Manager', requested_by: args.p_requested_by, reason: args.p_reason, time_change_cause: ch.time ? 'guest_request' : null, changes: list, excess_paid: 0, kitchen_ack_required: false, notification_status: 'Not sent: guest emails are off. Tell the customer by WhatsApp or phone.' }];
        return Promise.resolve({ data: { ok: true, revision: 1, reference: 'CC-1001', kitchen_ack_required: false, needs_reprint: false, balance_after: after, excess_paid: 0 } });
      }
      if (fn === 'staff_add_photos') { var po = orders.filter(function (x) { return x.id === args.p_order; })[0]; if (!po) return Promise.resolve({ data: { ok: false, message: 'That order was not found.' } });
        po.order_attachments = (po.order_attachments || []).concat(args.p_paths.map(function (x) { return { storage_path: x, file_name: x.replace(/^.*\//, '') }; }));
        return Promise.resolve({ data: { ok: true, added: args.p_paths.length, reference: po.reference } }); }
      // Backup Google Sheet (invented data): health, access code for administrators
      if (/^mirror_/.test(fn)) {
        var RM = window.__role || 'manager', aM = RM === 'admin', mM = aM || RM === 'manager';
        var MI = window.__mir = window.__mir || { state: 'not_set_up', minutes: null, last_ack_at: null, rows: null, sheet_url: null, sheet_title: null, last_error: null, emails_failed: 0, emails_waiting: 0 };
        window.__mirCode = window.__mirCode || 'ab12'.repeat(12);
        if (fn === 'mirror_health') return Promise.resolve({ data: mM ? Object.assign({ ok: true, is_admin: aM }, MI) : { ok: false, message: 'Only managers can see the backup status.' } });
        if (!aM) return Promise.resolve({ data: { ok: false, message: 'Only an administrator can see the setup code.' } });
        if (fn === 'mirror_new_code') window.__mirCode = 'cd34'.repeat(12);
        return Promise.resolve({ data: { ok: true, code: window.__mirCode, url: 'https://example.invalid/sheet-mirror' } });
      }
      // Order alerts (invented data)
      if (fn === 'admin_alert_settings' || fn === 'admin_alert_settings_save') {
        var RA = window.__role || 'manager', AL = window.__al = window.__al || { new_order: ['cafe@example.com'], kitchen: 'kitchen@example.com', kitchen_copy: '', test_mode: true, test_email: 'owner@example.com' };
        if (RA !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only an administrator can see order alerts.' } });
        if (fn === 'admin_alert_settings_save') {
          var v = (args.p_emails || []).map(function (x) { return String(x || '').trim().toLowerCase(); }).filter(Boolean);
          if (!v.length) return Promise.resolve({ data: { ok: false, message: 'Add at least one email address, or nobody hears about website orders.' } });
          var bad = v.filter(function (x) { return !/^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(x); })[0];
          if (bad) return Promise.resolve({ data: { ok: false, message: bad + ' is not an email address.' } });
          AL.new_order = v.filter(function (x, i) { return v.indexOf(x) === i; });
        }
        return Promise.resolve({ data: Object.assign({ ok: true }, JSON.parse(JSON.stringify(AL))) });
      }
      // Kitchen printing (invented data): settings, test slip, delivery log, resend, slip status, Printed tap
      if (/^(admin_print|admin_slip|slip_status|kitchen_confirm_printed)/.test(fn)) {
        var R = window.__role || 'manager', isA = R === 'admin', isM = isA || R === 'manager';
        var P = window.__pr = window.__pr || { primary: 'kitchen@example.com', backup: '', paper: 'A5', on_new: true, verified: true, verified_note: 'Test Manager · 1 Oct 9:00am', last_test: null, test_mode: true, test_email: 'test@example.com' };
        var LOG = window.__slipLog = window.__slipLog || [], ROWS = window.__slipRows = window.__slipRows || {};
        var no = function (m) { return Promise.resolve({ data: { ok: false, error: 'x', message: m } }); }, yes = function (d) { return Promise.resolve({ data: Object.assign({ ok: true }, d) }); };
        var re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (fn === 'admin_print_settings') return isA ? yes(P) : no('Only an administrator can see printing settings.');
        if (fn === 'admin_print_settings_save') { if (!isA) return no('Only an administrator can change printing settings.'); var q = args.p, pri = (q.primary || '').trim().toLowerCase(), bak = (q.backup || '').trim().toLowerCase();
          if (!pri) return no('Enter the kitchen printer email address.'); if (!re.test(pri)) return no('That kitchen printer email address does not look right.'); if (bak && !re.test(bak)) return no('That backup email address does not look right.'); if (bak && bak === pri) return no('The backup address is the same as the main one. Use a different address or leave it empty.');
          if (pri !== P.primary || bak !== P.backup || q.paper !== P.paper) { P.verified = false; P.verified_note = ''; } P.primary = pri; P.backup = bak; P.paper = q.paper; P.on_new = !!q.on_new; return yes(P); }
        if (fn === 'admin_print_test') { if (!isA) return no('Only an administrator can send a test slip.'); P.last_test = { at: new Date().toISOString(), status: 'sent', error: null }; LOG.unshift({ id: 't' + LOG.length, kind: 'kitchen_slip_test', status: 'sent', attempts: 1, created_at: new Date().toISOString(), version: 1 }); return yes({ to: P.primary, test_mode: P.test_mode, test_email: P.test_email }); }
        if (fn === 'admin_print_test_confirm') { if (!isA) return no('Only an administrator can confirm the test slip.'); if (!P.last_test) return no('Send a test slip first.'); P.verified = true; P.verified_note = 'Test Manager · today'; return yes(P); }
        if (fn === 'admin_slip_log') return isM ? yes({ rows: LOG.slice() }) : no('Only managers can see the slip delivery log.');
        if (fn === 'admin_slip_resend') { if (!isM) return no('Only managers can send a slip again.'); var lr = LOG.filter(function (x) { return x.order_id === args.p_order && x.kind === 'kitchen_slip'; })[0]; if (!lr) return no('No slip has been printed for this order yet.');
          LOG.unshift(Object.assign({}, lr, { id: 'r' + LOG.length, status: 'pending', attempts: 0, created_at: new Date().toISOString() })); return yes({ reference: lr.reference, version: lr.latest_version }); }
        if (fn === 'slip_status') { var out = {}; (args.p_orders || []).forEach(function (id) { if (ROWS[id]) out[id] = ROWS[id]; }); return yes({ paper: P.paper, rows: out }); }
        if (fn === 'kitchen_confirm_printed') { if (R === 'finance' || R === 'marketing') return no('You do not have access to the kitchen.'); var sr = ROWS[args.p_order]; if (!sr) return no('No slip has been printed for this order yet.'); if (sr.version !== args.p_version) return no('There is a newer slip (v' + sr.version + '). Print and confirm that one.');
          sr.confirmed_at = new Date().toISOString(); sr.confirmed_by = 'Test Kitchen'; return yes({ version: sr.version }); }
      }
      if (fn === 'kitchen_ack_amendment') { if (!args.p_name || args.p_name.length < 2) return Promise.resolve({ data: { ok: false, error: 'name', message: 'Enter your name.' } }); kitchenRows[2].amend_pending = null; return Promise.resolve({ data: { ok: true, count: 1 } }); }
      return Promise.resolve({ data: { ok: true, status: 'confirmed', version: 2 } });
    }
  };
})();
