// Test copy only: makes the harness remember one new order through its whole life (create, confirm, pay, kitchen, print, hand over).
// Invented data. Nothing here talks to the real database.
(function () {
  var M = window.__ccsMock; if (!M) return;
  var base = M.rpc.bind(M), orders = window.__orders, J = window.__journey = { order: null, brief: 0, events: [] };
  var now = function () { return new Date().toISOString(); };
  var ok = function (d) { return Promise.resolve({ data: Object.assign({ ok: true }, d || {}) }); };
  var ev = function (o, kind, detail) { o.order_events.push({ at: now(), kind: kind, detail: detail || {}, actor_label: 'Test Manager' }); };
  function setupProduct(code) { var s = (J.setup && J.setup.products) || []; return s.filter(function (p) { return p.code === code; })[0] || null; }
  function row(o) {
    var i = o.order_items[0];
    return { id: o.id, reference: o.reference, date: o.required_date, time: o.required_time.slice(0, 5), method: o.fulfilment_method, area: null, customer: o.customers.full_name.split(' ')[0] + ' ' + o.customers.full_name.split(' ').slice(-1)[0].charAt(0) + '.',
      cake: i.product_name, variant: i.variant || null, size: i.size_inch, quantity: i.quantity, serves: null, finish: i.finish, design: i.design_description || null, message: i.cake_message || null, occasion: i.occasion || null,
      has_dietary: o.has_dietary, dietary: i.dietary || [], dietary_note: i.dietary_note || null, kitchen_notes: null, order_notes: o.customer_notes || null, rush: false, photos: [],
      status: o.order_status, stage: o.production_status, assignee: o.kitchen_assignee || null, qc_by: o.qc_by || null, brief_version: o.brief_version || 0, brief_changed: false, late: false,
      handed_over_at: o.handed_over_at || null };
  }
  function paid(o) { return o.payments.reduce(function (s, p) { return s + Number(p.amount); }, 0); }
  function total(o) { return Number(o.final_total != null ? o.final_total : o.estimate_total); }
  M.rpc = function (fn, args) {
    var o = J.order;
    if (fn === 'get_order_setup') return base(fn, args).then(function (r) { J.setup = r && r.data; return r; });
    if (fn === 'staff_create_order') {
      var p = args.p; window.__calls.push(['rpc', fn, args]);
      if (o) return ok({ order_id: o.id, reference: o.reference, status: o.order_status });
      var pr = setupProduct(p.product_code) || { name: p.product_code, sizes: [] }, sz = (pr.sizes || []).filter(function (z) { return Number(z.inch) === Number(p.size_inch); })[0];
      var custom = p.finish === 'custom', est = (sz ? Number(sz.price) : 0) * (p.quantity || 1);
      var st = custom ? 'awaiting_quote' : p.confirm_now ? (p.deposit_required ? 'awaiting_deposit' : 'confirmed') : 'awaiting_review';
      o = J.order = { id: 'o9', reference: 'CC-1009', order_status: st, production_status: 'not_started', payment_status: 'unpaid', fulfilment_method: 'collection', order_type: custom ? 'custom' : 'standard',
        source: p.source, created_at: now(), required_date: p.date, required_time: p.time + ':00', estimate_total: est, final_total: null, deposit_required: null, has_dietary: p.has_dietary === 'yes', version: 1,
        customer_notes: p.notes || null, brief_version: 0,
        customers: { id: 'c9', full_name: (p.customer && p.customer.name) || 'Guest', phone: (p.customer && p.customer.phone) || '', email: (p.customer && p.customer.email) || null, preferred_contact: p.customer && p.customer.whatsapp ? 'whatsapp' : 'phone' },
        order_items: [{ product_name: pr.name, variant: p.variant || null, size_inch: p.size_inch, quantity: p.quantity, finish: p.finish, design_description: p.design || null, cake_message: p.message || null, candles: p.candles || null,
          occasion: p.occasion || null, dietary: p.dietary || [], dietary_note: p.dietary_note || null }],
        order_events: [], order_attachments: [], payments: [], order_amendments: [] };
      ev(o, 'created', { source: p.source }); orders.unshift(o);
      return ok({ order_id: o.id, reference: o.reference, status: st });
    }
    if (o && args && args.p_order === o.id) {
      window.__calls.push(['rpc', fn, args]);
      if (fn === 'staff_order_action') {
        var a = args.p_action; o.version++;
        if (a === 'confirm') { if (args.p_final_total != null) o.final_total = Number(args.p_final_total); o.deposit_required = args.p_deposit ? Number(args.p_deposit) : null; o.order_status = o.deposit_required ? 'awaiting_deposit' : 'confirmed'; ev(o, o.deposit_required ? 'awaiting_deposit' : 'confirmed', { final_total: o.final_total, deposit_required: o.deposit_required }); }
        else if (a === 'collected') { if (o.production_status !== 'ready') return ok({ ok: false, message: 'The cake is not ready yet.' }); if (paid(o) < total(o)) return ok({ ok: false, message: 'The balance is still owing.' }); o.order_status = 'completed'; o.handed_over_at = now(); o.handover_to = args.p_note || null; ev(o, 'collected', { method: 'collection', to: args.p_note }); }
        else if (a === 'note') { o.internal_notes = (o.internal_notes ? o.internal_notes + '\n' : '') + args.p_note; ev(o, 'note', { note: args.p_note }); }
        return ok({ status: o.order_status, version: o.version });
      }
      if (fn === 'staff_record_payment') {
        o.payments.push({ amount: Number(args.p_amount), method: args.p_method, kind: args.p_kind, paid_at: now(), reference: args.p_reference || null }); o.version++;
        var bal = Math.max(total(o) - paid(o), 0); o.payment_status = bal <= 0 ? 'paid' : 'deposit_paid';
        if (o.order_status === 'awaiting_deposit' && paid(o) >= (o.deposit_required || 0)) o.order_status = 'confirmed';
        ev(o, 'payment_recorded', { amount: Number(args.p_amount), kind: args.p_kind, method: args.p_method });
        return ok({ balance: bal });
      }
      if (fn === 'kitchen_set_stage') {
        if (args.p_stage === 'ready' && !args.p_name) return ok({ ok: false, error: 'qc', message: 'Enter the name of the person who checked the cake.' });
        o.production_status = args.p_stage; if (args.p_stage === 'ready') { o.qc_by = args.p_name; o.qc_at = now(); }
        ev(o, 'stage', { to: args.p_stage, qc_by: args.p_name || undefined }); return ok({});
      }
      if (fn === 'staff_print_brief') {
        o.brief_version = (o.brief_version || 0) + 1; var s = row(o); s.candles = o.order_items[0].candles; s.reference = o.reference;
        ev(o, 'brief_printed', { version: o.brief_version, new_version: true });
        return ok({ version: o.brief_version, new_version: true, changes: [], snapshot: s,
          slip: { name: o.customers.full_name, phone: o.customers.phone, price: o.final_total != null ? o.final_total : null, paid: paid(o), source: o.source, method: 'collection', taken_by: 'Test Manager', ordered_at: o.created_at } });
      }
    }
    if (fn === 'kitchen_board' && o && (o.order_status === 'confirmed' || o.order_status === 'completed')) {
      return base(fn, args).then(function (r) { if (r && r.data && r.data.orders) r.data.orders = r.data.orders.filter(function (x) { return x.id !== o.id; }).concat([row(o)]); return r; });
    }
    return base(fn, args);
  };
})();
