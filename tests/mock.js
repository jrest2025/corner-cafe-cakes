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
  window.__orders = orders;
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
    if (table === 'customers') { var ci2 = st.filters.filter(function (f) { return f[0] === 'id'; })[0]; return { data: Object.assign({}, prof[ci2 ? ci2[1] : 'c1']) }; }
    if (table === 'consent_now') { var cn2 = st.filters.filter(function (f) { return f[0] === 'customer_id'; })[0]; return { data: consentNow(cn2[1]) }; }
    if (table === 'marketing_consents') { var cm2 = st.filters.filter(function (f) { return f[0] === 'customer_id'; })[0]; return { data: consentLog.filter(function (l) { return l.customer_id === cm2[1]; }).slice().reverse() }; }
    if (table === 'locations') return { data: { id: 'l1', accepts_online: true, lead_days_standard: 2, lead_days_custom: 5, max_days_ahead: 90, collection_open: '09:00:00', collection_close: '20:00:00', slot_minutes: 60, daily_capacity: null, defaults_confirmed: false } };
    if (table === 'closed_dates') return { data: [] };
    if (table === 'delivery_zones') return { data: [{ id: 'z1', name: 'Nadi town', fee: 10, active: true, sort: 1 }, { id: 'z2', name: 'Denarau', fee: 15, active: true, sort: 2 }, { id: 'z3', name: 'Other area', fee: null, active: true, sort: 9 }] };
    if (table === 'products') return { data: [{ id: 'p1', name: 'Cheesecake', status: 'active', product_sizes: [{ id: 's1', size_inch: 6, price: 54, active: true }, { id: 's2', size_inch: 8, price: 95, active: true }, { id: 's3', size_inch: 10, price: 130, active: true }, { id: 's4', size_inch: 12, price: 155, active: true }] }] };
    return { data: [] };
  }
  function builder(table) {
    var st = { filters: [], head: false };
    var b = {
      select: function (_, o) { if (o && o.head) st.head = true; return b; },
      eq: function (k, v) { st.filters.push([k, v]); return b; }, ilike: function (k, v) { st.filters.push(['ilike:' + k, v]); return b; }, in: function (k, v) { st.filters.push(['in:' + k, v]); return b; }, or: function () { return b; }, gte: function (k, v) { st.filters.push(['gte:' + k, v]); return b; }, lte: function (k, v) { st.filters.push(['lte:' + k, v]); return b; }, not: function () { return b; },
      order: function () { return b; }, limit: function () { return b; }, update: function (u) { calls.push(['update', table, u]); return b; }, insert: function (u) { calls.push(['insert', table, u]); return b; }, delete: function () { calls.push(['delete', table]); return b; },
      single: function () { return b; }, maybeSingle: function () { return b; },
      then: function (ok, bad) { return Promise.resolve(result(table, st)).then(ok, bad); }
    };
    return b;
  }
  window.__teamRows = [{ user_id: 'u1', email: 'admin@example.com', full_name: 'Test Manager', role: 'admin', active: true }, { user_id: 'u2', email: 'fresh@example.com', full_name: null, role: null, active: null }];
  window.__ccsMock = {
    auth: { getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'u1', user_metadata: { must_change_password: !!window.__mustChange } } } } }); }, updateUser: function (a) { calls.push(['auth', 'updateUser', a]); if (window.__pwSame) return Promise.resolve({ error: { message: 'New password should be different from the old password.' } }); window.__mustChange = false; return Promise.resolve({ data: { user: { id: 'u1' } } }); }, signOut: function () { return Promise.resolve({}); }, signInWithPassword: function () { return Promise.resolve({}); } },
    from: builder,
    storage: { from: function () { return { createSignedUrls: function () { return Promise.resolve({ data: [] }); } }; } },
    functions: { invoke: function (name, opt) { calls.push(['fn', name, opt.body]); var b = opt.body;
      if (b.op === 'create' && b.email === 'taken@example.com') return Promise.resolve({ data: { ok: false, field: 'email', message: 'A login with this email already exists. Find it in the team list and give it a role there.' } });
      if (b.op === 'create') { window.__teamRows.push({ user_id: 'u' + (window.__teamRows.length + 1), email: b.email, full_name: b.name, role: b.role, active: true }); return Promise.resolve({ data: { ok: true, user_id: 'uX', email: b.email } }); }
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
      if (fn === 'get_order_setup') return Promise.resolve({ data: setup });
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
      if (fn === 'customer_sheet_orders') return Promise.resolve({ data: { ok: true, orders: args.p_customer === 'c1' ? [{ rec_key: 'sheet:walkin|2025-11-02T01:00:00Z', reference: 'W-0412', source: 'Walk-in sheet', fulfil_date: '2025-11-03', cake: 'Black Forest', size_inch: 8, value: 85, name_on_sheet: 'TEST CUST A', how: 'auto_match' }] : [] } });
      if (fn === 'customer_history') { var rl2 = window.__role || 'manager'; if (rl2 !== 'manager' && rl2 !== 'admin') return Promise.resolve({ data: { ok: false, message: 'Only a manager can see the change history.' } }); return Promise.resolve({ data: { ok: true, changes: custHistory } }); }
      if (fn === 'staff_set_channel_consent') { var pc2 = prof[args.p_customer]; args.p_channels.forEach(function (ch) { consentLog.push({ customer_id: args.p_customer, channel: ch, destination: ch === 'email' ? (pc2.email || '').toLowerCase() : pkey(pc2.phone), granted: args.p_granted, needs_reconfirm: false, source: 'Staff: Test Manager recorded a ' + (args.p_granted ? 'yes' : 'no'), recorded_at: new Date().toISOString() }); }); return Promise.resolve({ data: { ok: true, recorded: args.p_channels.length } }); }
      if (fn === 'staff_search_customers') return Promise.resolve({ data: (args.q.indexOf('0001') > -1 || args.q.toLowerCase().indexOf('customer a') > -1) ? [summary[0]] : [] });
      if (fn === 'calendar_counts') { var m = {}; orders.forEach(function (o) { if (o.order_status === 'cancelled' || o.order_status === 'declined' || o.required_date < args.p_from || o.required_date > args.p_to) return; var r = m[o.required_date] = m[o.required_date] || { day: o.required_date, orders: 0, cakes: 0, deliveries: 0, attention: 0, done: 0 }; r.orders++; r.cakes += o.order_items.reduce(function (s, i) { return s + (i.quantity || 1); }, 0); if (['awaiting_review', 'awaiting_quote', 'awaiting_deposit'].indexOf(o.order_status) > -1) r.attention++; }); return Promise.resolve({ data: Object.keys(m).map(function (k) { return m[k]; }) }); }
      if (fn === 'staff_create_order' && window.__createFail) return Promise.reject(new Error('Failed to fetch'));
      if (fn === 'staff_create_order' && args.p.rush && !(args.p.rush.approved_by || '').trim()) return Promise.resolve({ data: { ok: false, error: 'date', field: 'date', message: 'Enter who approved the short notice.' } });
      if (fn === 'staff_create_order') { var seen = calls.filter(function (c) { return c[1] === 'staff_create_order' && c[2].p.idempotency_key === args.p.idempotency_key; }).length; if (seen === 1) orders.push({ id: 'o9', reference: 'CC-1009', order_status: args.p.confirm_now ? 'confirmed' : 'awaiting_review', production_status: 'not_started', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: 'standard', source: args.p.source, created_at: new Date().toISOString(), required_date: args.p.date, required_time: args.p.time + ':00', estimate_total: 54 * args.p.quantity, has_dietary: false, version: 1, customers: { full_name: 'New Calendar Guest', phone: '912 0099' }, order_items: [{ product_name: 'Cheesecake', size_inch: args.p.size_inch, quantity: args.p.quantity, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] }); }
      if (fn === 'staff_create_order') return Promise.resolve({ data: { ok: true, order_id: 'o9', reference: 'CC-1009', status: args.p.confirm_now ? (args.p.deposit_required ? 'awaiting_deposit' : 'confirmed') : 'awaiting_review' } });
      if (fn === 'admin_list_users') return Promise.resolve({ data: window.__teamRows.slice() });
      if (fn === 'kitchen_board') return Promise.resolve({ data: { ok: true, today: T, orders: kitchenRows } });
      if (fn === 'staff_print_brief') { var o = orders.filter(function (x) { return x.id === args.p_order; })[0]; return Promise.resolve({ data: { ok: true, version: 2, new_version: true, changes: ['message', 'design'], snapshot: snap(o) } }); }
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
      if (fn === 'kitchen_ack_amendment') { if (!args.p_name || args.p_name.length < 2) return Promise.resolve({ data: { ok: false, error: 'name', message: 'Enter your name.' } }); kitchenRows[2].amend_pending = null; return Promise.resolve({ data: { ok: true, count: 1 } }); }
      return Promise.resolve({ data: { ok: true, status: 'confirmed', version: 2 } });
    }
  };
})();
