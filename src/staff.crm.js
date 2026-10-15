
  // ---------- customer workspace: notes, enquiries, feedback, follow-ups (CRM step 3) ----------
  var WS_KIND = { note: 'Note', enquiry: 'Enquiry', feedback: 'Feedback' };
  var WS_TONE = { positive: 'Happy', neutral: 'Mixed', negative: 'Complaint' };
  var WS_CHANNEL = [['', 'Not recorded'], ['in_person', 'In person'], ['phone', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['social', 'Social media'], ['other', 'Other']];
  var WS_TASK = { open: 'To do', in_progress: 'Started', done: 'Done', cancelled: 'No longer needed' };
  var WS_DUE = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['3', 'In 3 days'], ['7', 'Next week'], ['other', 'Other date']];
  var WS_HINT = 'Internal only. Never shown to the customer, in emails or on kitchen slips. Keep it factual. No card numbers, passwords or health details. Allergies go on the order.';

  function wsCanRead() { return can('manager', 'front_of_house', 'marketing', 'finance'); }
  function wsForm() {
    var s = S.sheet;
    if (!s.wsForm) s.wsForm = { kind: 'note', tone: null, follow: false, dueKind: 'tomorrow', idem: uuid(), tidem: uuid() };
    return s.wsForm;
  }
  function wsLoad(id) {
    if (!wsCanRead()) return Promise.resolve();
    return sb.rpc('customer_workspace', { p_customer: id }).then(function (r) {
      if (!S.sheet || S.sheet.type !== 'customer' || S.sheet.id !== id) return;
      if (r.error) throw r.error;
      if (!r.data.ok) { S.sheet.wsErr = r.data.message; renderSheet(); return; }
      S.sheet.ws = r.data; S.sheet.wsErr = null; renderSheet();
    }).catch(function (e) { console.error(e); if (S.sheet && S.sheet.id === id) { S.sheet.wsErr = 'Notes and follow-ups could not load. Check the connection and try again.'; renderSheet(); } });
  }
  function wsDueDate(kind) {
    var t = today();
    return kind === 'today' ? t : kind === 'tomorrow' ? addDays(t, 1) : kind === '3' ? addDays(t, 3) : kind === '7' ? addDays(t, 7) : val('ws-due');
  }
  function wsDueLabel(task) {
    var t = today();
    if (task.status === 'done' || task.status === 'cancelled') return WS_TASK[task.status];
    if (task.due_on < t) return 'Overdue, was due ' + nice(task.due_on);
    if (task.due_on === t) return 'Due today';
    if (task.due_on === addDays(t, 1)) return 'Due tomorrow';
    return 'Due ' + nice(task.due_on);
  }
  function wsWho(task) { return task.assigned_to ? (task.mine ? 'You' : (task.assignee || 'Staff')) : 'Anyone'; }
  function wsStaffOptions(sel, withAnyone) {
    var ws = S.sheet && S.sheet.ws, list = (ws && ws.staff) || [];
    var me = S.me && S.me.user_id;
    var opts = [['me', 'Me']].concat(withAnyone ? [['', 'Anyone on the team']] : []).concat(list.filter(function (p) { return p.id !== me; }).map(function (p) { return [p.id, p.name]; }));
    return opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (sel === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function wsAssignee(v) { return v === 'me' ? (S.me && S.me.user_id) : (v || null); }

  // Small summary on the Overview tab
  function cpJump(v) { if (S.sheet && S.sheet.type === 'customer' && ['overview', 'orders', 'notes', 'comms'].indexOf(v) > -1) { S.sheet.sec = Object.assign(S.sheet.sec || {}, { cust: v }); renderSheet(); } setTimeout(function () { var el = document.getElementById('cp-' + v); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); }
  function wsOverview(d) {
    var ws = S.sheet.ws, t = today();
    var upcoming = d.orders.filter(function (o) { return o.required_date >= t && OPEN_STATUSES.indexOf(o.order_status) > -1; }).sort(function (a, b) { return a.required_date < b.required_date ? -1 : 1; });
    var open = ws ? ws.tasks.filter(function (x) { return x.status === 'open' || x.status === 'in_progress'; }) : [];
    var late = open.filter(function (x) { return x.overdue; }).length;
    var last = ws ? ws.notes.filter(function (n) { return !n.hidden; })[0] : null;
    var h = '<section class="ccs-box ws-glance"><h3>Coming up</h3><dl class="ccs-kv">' +
      '<dt>Next order</dt><dd>' + (upcoming.length ? '<button type="button" class="ccs-link" data-act="open-order" data-id="' + upcoming[0].id + '">' + esc(nice(upcoming[0].required_date) + ' · ' + upcoming[0].reference) + '</button>' + (upcoming.length > 1 ? ' <span class="ccs-hint">and ' + (upcoming.length - 1) + ' more</span>' : '') : 'None booked') + '</dd>';
    if (wsCanRead()) h += '<dt>Follow-ups</dt><dd>' + (!ws ? (S.sheet.wsErr ? 'Could not load' : 'Loading…') : open.length ? '<button type="button" class="ccs-link" data-act="ws-tab" data-v="notes">' + open.length + ' open' + (late ? ', ' + late + ' overdue' : '') + '</button>' : 'None open') + '</dd>' +
      '<dt>Last note</dt><dd>' + (last ? esc(WS_KIND[last.kind] + ', ' + stamp(last.at) + ': ' + (last.body.length > 90 ? last.body.slice(0, 90) + '…' : last.body)) : (ws ? 'No notes yet' : '')) + '</dd>';
    return h + '</dl></section>';
  }

  // The Notes and follow-ups tab
  function wsView() {
    var s = S.sheet, d = s.data, ws = s.ws;
    if (s.wsErr) return '<div class="ccs-empty"><b>' + esc(s.wsErr) + '</b><button type="button" class="ccs-btn" data-act="ws-reload">Try again</button></div>';
    if (!ws) return '<p class="ccs-loading">Loading notes and follow-ups…</p>';
    var h = '';
    if (ws.can_write && !d.c.archived_at) h += wsAddForm(d);
    var open = ws.tasks.filter(function (x) { return x.status === 'open' || x.status === 'in_progress'; });
    var closed = ws.tasks.filter(function (x) { return x.status === 'done' || x.status === 'cancelled'; });
    h += '<section class="ccs-box"><h3>Follow-ups</h3>' + (open.length ? '<div class="ws-tasks">' + open.map(wsTaskRow).join('') + '</div>' : '<p class="ccs-quiet">No open follow-ups.</p>') +
      (closed.length ? '<details class="ccs-more"' + (s.wsShowDone ? ' open' : '') + ' data-wsdone><summary>Done and closed (' + closed.length + ')</summary><div class="ws-tasks">' + closed.map(wsTaskRow).join('') + '</div></details>' : '') + '</section>';
    var notes = ws.notes;
    h += '<section class="ccs-box"><h3>Notes, enquiries and feedback</h3>' + (notes.length ? '<div class="ws-notes">' + notes.map(wsNoteRow).join('') + '</div>' : '<p class="ccs-quiet">Nothing recorded yet.</p>') + '</section>';
    return h;
  }
  function wsAddForm(d) {
    var f = wsForm(), s = S.sheet;
    var h = '<section class="ccs-panel ws-add"><b>' + (f.noteDone ? 'Add a follow-up' : 'Add to this customer') + '</b>' + (f.noteDone && s.wsAddInfo ? '<p class="ccs-note">' + esc(s.wsAddInfo) + ' <button type="button" class="ccs-link" data-act="ws-form-reset">Cancel</button></p>' : '') + '' + (f.noteDone ? '' : '<div class="ccs-chips" role="group" aria-label="What are you adding">' +
      [['note', 'Note'], ['enquiry', 'Enquiry'], ['feedback', 'Feedback']].map(function (k) { return '<button type="button" class="ccs-chip" data-act="ws-kind" data-v="' + k[0] + '" aria-pressed="' + (f.kind === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>');
    if (f.noteDone) return h + wsFollowFields(f) + wsAddTail(f);
    if (f.kind === 'feedback') h += '<div class="ccs-field"><span class="ccs-label">How was it?</span><div class="ccs-chips" role="group" aria-label="Feedback">' +
      [['positive', 'Happy'], ['neutral', 'Mixed'], ['negative', 'Complaint']].map(function (k) { return '<button type="button" class="ccs-chip" data-act="ws-tone" data-v="' + k[0] + '" aria-pressed="' + (f.tone === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' + wsErr('tone') + '</div>';
    h += '<div class="ccs-field"><label class="ccs-label" for="ws-body">' + (f.kind === 'enquiry' ? 'What did they ask about?' : f.kind === 'feedback' ? 'What did they say?' : 'Note') + '</label><textarea class="ccs-input" id="ws-body" maxlength="2000" placeholder="' + (f.kind === 'enquiry' ? 'For example: asked about a three-tier wedding cake for 120 people in March' : f.kind === 'feedback' ? 'For example: loved the mocha cake, icing a little sweet' : 'For example: prefers collecting after 5pm') + '"></textarea>' + wsErr('body') + '<span class="ccs-hint">' + WS_HINT + '</span></div>';
    h += '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ws-channel">How did it come in?</label><select class="ccs-input" id="ws-channel">' + WS_CHANNEL.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="ws-order">About an order (optional)</label><select class="ccs-input" id="ws-order"><option value="">Not about one order</option>' +
      d.orders.slice(0, 30).map(function (o) { return '<option value="' + o.id + '">' + esc(o.reference + ' · ' + nice(o.required_date) + ' · ' + cakeLine((o.order_items || [])[0])) + '</option>'; }).join('') + '</select>' + wsErr('order') + '</div></div>';
    h += '<label class="ccs-check"><input type="checkbox" id="ws-follow" data-wsc="follow"' + (f.follow ? ' checked' : '') + '> Someone needs to follow this up</label>';
    if (f.follow) h += wsFollowFields(f);
    return h + wsAddTail(f);
  }
  function wsFollowFields(f) {
    return '<div class="ws-follow"><div class="ccs-field"><label class="ccs-label" for="ws-title">What needs doing?</label><input class="ccs-input" id="ws-title" maxlength="200" autocomplete="off" placeholder="For example: send a quote by WhatsApp"></div>' + wsErr('title') +
      '<div class="ccs-field"><span class="ccs-label">When?</span><div class="ccs-chips" role="group" aria-label="Due">' + WS_DUE.map(function (k) { return '<button type="button" class="ccs-chip" data-act="ws-due" data-v="' + k[0] + '" aria-pressed="' + (f.dueKind === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      (f.dueKind === 'other' ? '<input class="ccs-input" id="ws-due" type="date" min="' + today() + '" max="' + addDays(today(), 400) + '" style="max-width:220px">' : '') + wsErr('due') + '</div>' +
      '<div class="ccs-field"><label class="ccs-label" for="ws-assignee">Who will do it?</label><select class="ccs-input" id="ws-assignee">' + wsStaffOptions(f.assignee || 'me', true) + '</select>' + wsErr('assignee') + '</div></div>';
  }
  function wsAddTail(f) {
    var s = S.sheet, h = '';
    if (s.wsAddErr && !s.wsAddField) h += '<p class="ccs-err" role="alert">' + esc(s.wsAddErr) + '</p>';
    return h + '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-save">' + (f.noteDone ? 'Save follow-up' : 'Save ' + WS_KIND[f.kind].toLowerCase() + (f.follow ? ' and follow-up' : '')) + '</button></div></section>';
  }
  function wsErr(field) { var s = S.sheet; return s.wsAddErr && s.wsAddField === field ? '<p class="ccs-err" role="alert">' + esc(s.wsAddErr) + '</p>' : ''; }

  function wsTaskRow(t) {
    var s = S.sheet, ws = s.ws, active = t.status === 'open' || t.status === 'in_progress';
    var mayChange = ws.is_manager || (ws.can_write && (t.mine || !t.assigned_to || t.by === (S.me && S.me.full_name)));
    var cls = 'ws-task' + (t.overdue ? ' is-late' : '') + (active ? '' : ' is-closed');
    var h = '<div class="' + cls + '"><div class="ws-task-top"><b>' + esc(t.title) + '</b><span class="ws-due">' + esc(wsDueLabel(t)) + '</span></div>' +
      '<p class="ccs-hint">' + esc((active ? 'For ' + wsWho(t) : (t.done_by ? 'Closed by ' + t.done_by + ', ' + stamp(t.done_at) : '')) + (t.status === 'in_progress' ? ' · Started' : '') + ' · Set by ' + t.by) +
      (t.order_ref ? ' · <button type="button" class="ccs-link" data-act="open-order" data-id="' + t.order_id + '">' + esc(t.order_ref) + '</button>' : '') + '</p>' +
      (t.outcome ? '<p class="ws-outcome">' + esc(t.outcome) + '</p>' : '');
    var m = s.wsTask && s.wsTask.id === t.id ? s.wsTask.mode : null;
    if (m === 'done' || m === 'cancel') {
      h += '<div class="ccs-panel"><div class="ccs-field"><label class="ccs-label" for="ws-out">' + (m === 'done' ? 'What happened?' : 'Why is it no longer needed?') + '</label><textarea class="ccs-input" id="ws-out" maxlength="1000" data-autofocus placeholder="' + (m === 'done' ? 'For example: called, customer will order next week' : 'For example: customer ordered elsewhere') + '"></textarea></div>' +
        (s.wsTaskErr ? '<p class="ccs-err" role="alert">' + esc(s.wsTaskErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn' + (m === 'cancel' ? ' ccs-danger' : '') + '" data-act="ws-task-go" data-id="' + t.id + '" data-v="' + m + '">' + (m === 'done' ? 'Mark done' : 'Close it') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-task-mode" data-v="">Back</button></div></div>';
    } else if (m === 'edit') {
      h += '<div class="ccs-panel"><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ws-tdue">Due</label><input class="ccs-input" id="ws-tdue" type="date" min="' + today() + '" value="' + esc(t.due_on) + '"></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ws-tass">Who will do it?</label><select class="ccs-input" id="ws-tass">' + wsStaffOptions(t.assigned_to ? (t.mine ? 'me' : t.assigned_to) : '', true) + '</select></div></div>' +
        (s.wsTaskErr ? '<p class="ccs-err" role="alert">' + esc(s.wsTaskErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-task-go" data-id="' + t.id + '" data-v="edit">Save</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-task-mode" data-v="">Back</button></div></div>';
    } else if (mayChange) {
      h += '<div class="ccs-actions-row ws-acts">' + (active ? (t.status === 'open' ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-task-go" data-id="' + t.id + '" data-v="start">Start</button>' : '') +
        '<button type="button" class="ccs-btn ccs-small" data-act="ws-task-mode" data-id="' + t.id + '" data-v="done">Done</button>' +
        '<button type="button" class="ccs-link" data-act="ws-task-mode" data-id="' + t.id + '" data-v="edit">Change date or person</button>' +
        '<button type="button" class="ccs-link ccs-red" data-act="ws-task-mode" data-id="' + t.id + '" data-v="cancel">No longer needed</button>'
        : '<button type="button" class="ccs-link" data-act="ws-task-go" data-id="' + t.id + '" data-v="reopen">Reopen</button>') + '</div>';
    }
    return h + '</div>';
  }

  function wsNoteRow(n) {
    var s = S.sheet, ws = s.ws;
    var meta = esc(n.by + ', ' + stamp(n.at)) + (n.channel ? ' · ' + esc((WS_CHANNEL.filter(function (c) { return c[0] === n.channel; })[0] || [0, ''])[1]) : '') +
      (n.order_ref ? ' · <button type="button" class="ccs-link" data-act="open-order" data-id="' + n.order_id + '">' + esc(n.order_ref) + '</button>' : '') +
      (n.edited_at ? ' · Changed by ' + esc(n.edited_by) + ', ' + esc(stamp(n.edited_at)) : '');
    var h = '<article class="ws-note' + (n.hidden ? ' is-hidden' : '') + '"><div class="ccs-tags"><span class="ccs-tag">' + WS_KIND[n.kind] + '</span>' + (n.tone ? '<span class="ccs-pill ' + (n.tone === 'negative' ? 's-alert' : n.tone === 'positive' ? 's-good' : 's-off') + '">' + WS_TONE[n.tone] + '</span>' : '') + '</div>';
    if (n.hidden) return h + '<p class="ccs-hint">Removed from view by ' + esc(n.hidden_by) + ', ' + esc(stamp(n.hidden_at)) + ': ' + esc(n.hidden_reason) + '. Only managers see this line.</p>' +
      '<p class="ccs-hint">' + meta + ' <button type="button" class="ccs-link" data-act="ws-hist" data-id="' + n.id + '">' + (s.wsHist && s.wsHist.id === n.id ? 'Hide wording' : 'See wording') + '</button></p>' + wsHistBox(n) + '</article>';
    if (s.wsEdit === n.id) {
      h += '<div class="ccs-field"><label class="ccs-label" for="ws-ebody">Note</label><textarea class="ccs-input" id="ws-ebody" maxlength="2000" data-autofocus>' + esc(n.body) + '</textarea></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ws-ereason">Why are you changing it?</label><input class="ccs-input" id="ws-ereason" maxlength="200" autocomplete="off" placeholder="For example: wrong date written"></div>' +
        '<p class="ccs-hint">The old wording is kept and managers can see it.</p>' + (s.wsNoteErr ? '<p class="ccs-err" role="alert">' + esc(s.wsNoteErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-edit-save" data-id="' + n.id + '">Save change</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-edit" data-id="">Cancel</button></div>';
      return h + '</article>';
    }
    if (s.wsHide === n.id) {
      h += '<p class="ws-body">' + esc(n.body) + '</p><div class="ccs-panel"><div class="ccs-field"><label class="ccs-label" for="ws-hreason">Why remove it from view?</label><input class="ccs-input" id="ws-hreason" maxlength="200" data-autofocus autocomplete="off" placeholder="For example: written on the wrong customer"></div>' +
        '<p class="ccs-hint">Staff will no longer see it. Managers can still read it.</p>' + (s.wsNoteErr ? '<p class="ccs-err" role="alert">' + esc(s.wsNoteErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="ws-hide-save" data-id="' + n.id + '">Remove from view</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-hide" data-id="">Back</button></div></div>';
      return h + '</article>';
    }
    h += '<p class="ws-body">' + esc(n.body) + '</p><p class="ccs-hint">' + meta + '</p>';
    var acts = '';
    if (ws.is_manager || (n.mine && ws.can_write)) acts += '<button type="button" class="ccs-link" data-act="ws-edit" data-id="' + n.id + '">Change</button>';
    if (n.edited_at && (ws.is_manager || n.mine)) acts += '<button type="button" class="ccs-link" data-act="ws-hist" data-id="' + n.id + '">' + (s.wsHist && s.wsHist.id === n.id ? 'Hide earlier wording' : 'Earlier wording') + '</button>';
    if (ws.can_write) acts += '<button type="button" class="ccs-link" data-act="ws-follow-from" data-id="' + n.id + '">Add follow-up</button>';
    if (ws.is_manager) acts += '<button type="button" class="ccs-link ccs-red" data-act="ws-hide" data-id="' + n.id + '">Remove</button>';
    if (acts) h += '<div class="ccs-actions-row ws-acts">' + acts + '</div>';
    return h + wsHistBox(n) + '</article>';
  }
  function wsHistBox(n) {
    var hs = S.sheet.wsHist;
    if (!hs || hs.id !== n.id) return '';
    if (!hs.data) return '<p class="ccs-loading">Loading…</p>';
    if (!hs.data.ok) return '<p class="ccs-err">' + esc(hs.data.message) + '</p>';
    return '<div class="ws-hist">' + (n.hidden && hs.data.current ? '<p><b>Wording:</b> ' + esc(hs.data.current) + '</p>' : '') +
      (hs.data.versions.length ? hs.data.versions.map(function (v) { return '<p><span class="ccs-hint">Version ' + v.version + ', replaced by ' + esc(v.by) + ', ' + esc(stamp(v.at)) + ' (' + esc(v.reason) + ')</span><br>' + esc(v.body) + '</p>'; }).join('') : '<p class="ccs-hint">No earlier wording.</p>') + '</div>';
  }

  function wsSaveAdd(b) {
    var s = S.sheet, f = wsForm(), cid = s.id;
    var body = val('ws-body').trim(), title = f.follow ? val('ws-title').trim() : '', due = f.follow ? wsDueDate(f.dueKind) : null;
    s.wsAddErr = null; s.wsAddField = null;
    var bad = function (field, msg) { s.wsAddErr = msg; s.wsAddField = field; clearBusy(); renderSheet(); };
    if (f.kind === 'feedback' && !f.tone) return bad('tone', 'Choose Happy, Mixed or Complaint.');
    if (body.length < 2) return bad('body', f.kind === 'enquiry' ? 'Write what they asked about.' : 'Write the ' + WS_KIND[f.kind].toLowerCase() + ' first.');
    if (f.follow && title.length < 3) return bad('title', 'Say what needs doing.');
    if (f.follow && !due) return bad('due', 'Choose the date.');
    f.assignee = val('ws-assignee') || '';
    markBusy(b, 'Saving…');
    var order = val('ws-order') || null;
    sb.rpc('customer_note_add', { p_customer: cid, p_kind: f.kind, p_body: body, p_order: order, p_tone: f.kind === 'feedback' ? f.tone : null, p_channel: val('ws-channel') || null, p_idem: f.idem }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) return bad(r.data.field || null, r.data.message);
      if (!f.follow) return null;
      return sb.rpc('customer_task_add', { p_customer: cid, p_title: title, p_due: due, p_assignee: wsAssignee(f.assignee), p_order: order, p_note: r.data.note.id, p_idem: f.tidem }).then(function (t) {
        if (t.error) throw t.error;
        if (!t.data.ok) { bad(t.data.field || null, 'The ' + WS_KIND[f.kind].toLowerCase() + ' is saved. The follow-up was not: ' + t.data.message); f.noteDone = true; return false; }
        return null;
      });
    }).then(function (res) {
      if (res === false || s !== S.sheet) return;
      if (s.wsAddErr) return;
      clearBusy();
      toast(WS_KIND[f.kind] + ' saved' + (f.follow ? ' with a follow-up' : ''));
      ['ws-body', 'ws-title', 'ws-due', 'ws-order', 'ws-channel', 'ws-assignee'].forEach(function (k) { delete S.dirty[k]; });
      s.wsForm = null; wsLoad(cid); fuStale();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  // A note was saved but its follow-up failed: retry only the follow-up
  function wsTaskOnly(b) {
    var s = S.sheet, f = wsForm(), title = val('ws-title').trim(), due = wsDueDate(f.dueKind);
    if (title.length < 3) { s.wsAddErr = 'Say what needs doing.'; s.wsAddField = 'title'; return renderSheet(); }
    markBusy(b, 'Saving…');
    sb.rpc('customer_task_add', { p_customer: s.id, p_title: title, p_due: due, p_assignee: wsAssignee(val('ws-assignee')), p_order: f.fromOrder || null, p_note: f.fromNote || null, p_idem: f.tidem }).then(function (t) {
      if (t.error) throw t.error;
      clearBusy();
      if (!t.data.ok) { s.wsAddErr = t.data.message; s.wsAddField = t.data.field || null; return renderSheet(); }
      toast('Follow-up saved'); ['ws-title', 'ws-due', 'ws-assignee'].forEach(function (k) { delete S.dirty[k]; });
      s.wsForm = null; s.wsAddErr = null; s.wsAddInfo = null; wsLoad(s.id); fuStale();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function wsTaskGo(b, id, action) {
    var s = S.sheet, t = s.ws.tasks.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var args = { p_task: id, p_version: t.version, p_action: action, p_due: null, p_assignee: null, p_outcome: null };
    if (action === 'done' || action === 'cancel') { args.p_outcome = val('ws-out').trim(); if (args.p_outcome.length < 3) { s.wsTaskErr = action === 'done' ? 'Say what happened.' : 'Say why it is no longer needed.'; return renderSheet(); } }
    if (action === 'edit') { args.p_due = val('ws-tdue'); args.p_assignee = wsAssignee(val('ws-tass')); if (!args.p_due) { s.wsTaskErr = 'Choose the date.'; return renderSheet(); } }
    markBusy(b, 'Saving…');
    sb.rpc('customer_task_update', args).then(function (r) {
      if (r.error) throw r.error;
      clearBusy();
      if (!r.data.ok) {
        s.wsTaskErr = r.data.message;
        if (r.data.error === 'changed') { s.wsTask = null; toast(r.data.message, true); wsLoad(s.id); return; }
        return renderSheet();
      }
      toast({ start: 'Marked as started', done: 'Follow-up done', cancel: 'Follow-up closed', reopen: 'Follow-up reopened', edit: 'Follow-up changed' }[action]);
      delete S.dirty['ws-out']; delete S.dirty['ws-tdue']; delete S.dirty['ws-tass'];
      s.wsTask = null; s.wsTaskErr = null; wsLoad(s.id); fuStale();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function wsAct(a, b, v) {
    if (a.indexOf('ws-crm-') === 0) return crmAct(a, b, v);
    var s = S.sheet, id = b.dataset.id;
    if (a === 'ws-open') { var tab = b.dataset.tab || 'notes'; openCustomer(id).then(function () { if (S.sheet && S.sheet.id === id) { S.sheet.tab = tab; renderSheet(); cpJump(tab); } }); if (S.sheet) S.sheet.tab = tab; return; }
    if (a === 'ws-fu-all') { S.fu.all = !S.fu.all; S.fu.at = 0; fuLoad(); return; }
    if (a === 'ws-fu-reload') { S.fu.at = 0; fuLoad(); return; }
    if (!s || s.type !== 'customer') return;
    if (a === 'ws-tab') { s.tab = v; cpJump(v); return; }
    if (a === 'ws-reload') { s.wsErr = null; s.ws = null; renderSheet(); wsLoad(s.id); return; }
    if (a === 'ws-kind') { var f = wsForm(); f.kind = v; if (v !== 'feedback') f.tone = null; s.wsAddErr = null; renderSheet(); return; }
    if (a === 'ws-tone') { wsForm().tone = v; if (s.wsAddField === 'tone') s.wsAddErr = null; renderSheet(); return; }
    if (a === 'ws-due') { wsForm().dueKind = v; renderSheet(); if (v === 'other') { var dd = document.getElementById('ws-due'); if (dd) dd.focus(); } return; }
    if (a === 'ws-form-reset') { s.wsForm = null; s.wsAddInfo = null; s.wsAddErr = null; ['ws-title', 'ws-due', 'ws-assignee'].forEach(function (k) { delete S.dirty[k]; }); renderSheet(); return; }
    if (a === 'ws-save') { if (wsForm().noteDone) wsTaskOnly(b); else wsSaveAdd(b); return; }
    if (a === 'ws-follow-from') {
      var n = s.ws.notes.filter(function (x) { return x.id === id; })[0]; if (!n) return;
      s.wsForm = { kind: n.kind, tone: n.tone, follow: true, dueKind: 'tomorrow', idem: uuid(), tidem: uuid(), noteDone: true, fromNote: n.id, fromOrder: n.order_id };
      s.wsAddErr = null; s.wsAddField = null; s.wsAddInfo = 'Add the follow-up for the ' + WS_KIND[n.kind].toLowerCase() + ' from ' + stamp(n.at) + '. The ' + WS_KIND[n.kind].toLowerCase() + ' itself is already saved.';
      renderSheet(); var ti = document.getElementById('ws-title'); if (ti) { ti.focus(); ti.scrollIntoView && ti.scrollIntoView({ block: 'center' }); } return;
    }
    if (a === 'ws-task-mode') { s.wsTask = v ? { id: id, mode: v } : null; s.wsTaskErr = null; delete S.dirty['ws-out']; renderSheet(); return; }
    if (a === 'ws-task-go') { wsTaskGo(b, id, v); return; }
    if (a === 'ws-edit') { if (!id && hasTyping() && !confirmDiscard(b)) return; s.wsEdit = id || null; s.wsHide = null; s.wsNoteErr = null; delete S.dirty['ws-ebody']; delete S.dirty['ws-ereason']; renderSheet(); return; }
    if (a === 'ws-hide') { s.wsHide = id || null; s.wsEdit = null; s.wsNoteErr = null; renderSheet(); return; }
    if (a === 'ws-edit-save') {
      var nn = s.ws.notes.filter(function (x) { return x.id === id; })[0]; if (!nn) return;
      markBusy(b, 'Saving…');
      sb.rpc('customer_note_edit', { p_note: id, p_version: nn.version, p_body: val('ws-ebody'), p_reason: val('ws-ereason') }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { s.wsNoteErr = r.data.message; S.dirty['ws-ebody'] = val('ws-ebody'); S.dirty['ws-ereason'] = val('ws-ereason'); return renderSheet(); }
        toast('Note changed. The old wording is kept.'); s.wsEdit = null; s.wsNoteErr = null; delete S.dirty['ws-ebody']; delete S.dirty['ws-ereason']; s.wsHist = null; wsLoad(s.id);
      }).catch(function (e) { clearBusy(); fail(e); });
      return;
    }
    if (a === 'ws-hide-save') {
      markBusy(b, 'Removing…');
      sb.rpc('customer_note_hide', { p_note: id, p_reason: val('ws-hreason') }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { s.wsNoteErr = r.data.message; return renderSheet(); }
        toast('Removed from view'); s.wsHide = null; s.wsNoteErr = null; delete S.dirty['ws-hreason']; wsLoad(s.id);
      }).catch(function (e) { clearBusy(); fail(e); });
      return;
    }
    if (a === 'ws-hist') {
      if (s.wsHist && s.wsHist.id === id) { s.wsHist = null; return renderSheet(); }
      s.wsHist = { id: id, data: null }; renderSheet();
      sb.rpc('customer_note_history', { p_note: id }).then(function (r) { if (r.error) throw r.error; if (S.sheet === s && s.wsHist && s.wsHist.id === id) { s.wsHist.data = r.data; renderSheet(); } })
        .catch(function (e) { var m = readErr(e, 'the note history'); if (m == null) return; if (S.sheet === s && s.wsHist && s.wsHist.id === id) { s.wsHist = null; renderSheet(); toast(m + ' Tap History again to retry.', true); } });
      return;
    }
    if (a === 'ws-repeat') { repeatOrder(id); return; }
  }

  // Repeat order: a new draft with today's prices and products. Dates, message and dietary needs are asked again.
  function repeatOrder(oid) {
    var cd = S.sheet && S.sheet.data; if (!cd) return;
    var o = cd.orders.filter(function (x) { return x.id === oid; })[0]; if (!o) return;
    if (draftHasContent()) { goTab('new'); toast('You have an unfinished order. Finish or clear it first.', true); return; }
    var it = (o.order_items || [])[0] || {}, miss = [];
    D = freshDraft(); D.phone = cd.c.phone || '';
    D.customer = { id: cd.c.id, full_name: cd.c.full_name, phone: cd.c.phone || '', orders_count: cd.sum.orders_count, favourite_cake: cd.sum.favourite_cake };
    var p = ((S.setup && S.setup.products) || []).filter(function (x) { return x.name === it.product_name; })[0];
    if (p) {
      D.product = p.code;
      if (it.variant && p.variants.length) { if (p.variants.indexOf(it.variant) > -1) D.variant = it.variant; else miss.push(it.variant + ' is no longer offered'); }
      var sz = p.sizes.filter(function (x) { return Number(x.inch) === Number(it.size_inch); })[0];
      if (sz) D.size = sz.inch; else if (it.size_inch) miss.push(it.size_inch + ' inch is no longer offered for ' + p.name);
      D.qty = Math.max(1, Math.min(50, Number(it.quantity) || 1));
      if (it.finish === 'custom' && !p.supports_custom) miss.push('Custom designs are no longer offered for ' + p.name);
      else D.finish = it.finish || null;
      D.design = it.design_description || '';
    } else miss.push((it.product_name || 'That cake') + ' is no longer on sale. Choose a cake.');
    if (o.fulfilment_method === 'delivery') {
      var z = ((S.setup && S.setup.delivery_zones) || []).filter(function (x) { return x.name === o.delivery_zone; })[0];
      if (z) { D.method = 'delivery'; D.zone = z.name; D.address = o.delivery_address || ''; D.contact = o.delivery_contact || ''; }
      else miss.push('Delivery to ' + (o.delivery_zone || 'that area') + ' is no longer offered');
    }
    D.repeat = { ref: o.reference, line: cakeLine(it), message: it.cake_message || '', occasion: it.occasion || '',
      diet: o.has_dietary ? ([].concat(it.dietary || [], it.dietary_note ? [it.dietary_note] : []).join(', ') || 'yes, see the old order') : '', missing: miss };
    var cakeOk = D.product && D.size && (!p || !p.variants.length || D.variant);
    D.step = cakeOk ? 2 : 1; D.reached = D.step;
    saveDraft(); goTab('new'); window.scrollTo(0, 0);
  }
  function repeatNote() {
    var r = D.repeat; if (!r || D.result) return '';
    return '<div class="ccs-note ws-repeatnote"><b>Repeating ' + esc(r.ref) + '</b> (' + esc(r.line) + '). Prices are today\'s. Choose a new date and ask again about the message and dietary needs.' +
      '<ul class="ccs-plain">' + (r.message ? '<li>Last message: “' + esc(r.message) + '”</li>' : '') + (r.occasion ? '<li>Last occasion: ' + esc(r.occasion) + '</li>' : '') +
      (r.diet ? '<li>Last time, dietary: ' + esc(r.diet) + '</li>' : '') + r.missing.map(function (m) { return '<li class="ws-miss">' + esc(m) + '</li>'; }).join('') + '</ul></div>';
  }

  // Today page: follow-ups due
  S.fu = { data: null, at: 0, loading: false, err: false, all: false };
  function fuStale() { S.fu.at = 0; }
  function fuLoad() {
    if (!can('manager', 'front_of_house', 'marketing') || S.fu.loading) return;
    S.fu.loading = true;
    sb.rpc('my_followups', { p_days: 7, p_all: !!S.fu.all }).then(function (r) {
      S.fu.loading = false; if (r.error) throw r.error;
      S.fu.data = r.data; S.fu.at = Date.now(); S.fu.err = false; if (S.tab === 'today') view();
    }).catch(function (e) { S.fu.loading = false; S.fu.err = true; S.fu.at = Date.now(); console.error(e); if (S.tab === 'today') view(); });
  }
  function fuPanel() {
    if (!can('manager', 'front_of_house', 'marketing')) return '';
    if (!S.fu.loading && Date.now() - S.fu.at > 60000) setTimeout(fuLoad, 0);
    var d = S.fu.data, t = today();
    var head = '<div class="ccs-card-head"><h2>Follow-ups</h2>' + (can('manager') ? '<button type="button" class="ccs-link" data-act="ws-fu-all">' + (S.fu.all ? 'Show only mine' : 'Show everyone\'s') + '</button>' : '') + '</div>';
    if (S.fu.err && !d) return '<section class="ccs-panel-card ws-fu">' + head + '<p class="ccs-quiet">Could not load follow-ups. <button type="button" class="ccs-link" data-act="ws-fu-reload">Try again</button></p></section>';
    if (!d) return '<section class="ccs-panel-card ws-fu">' + head + '<p class="ccs-loading">Loading…</p></section>';
    var list = d.tasks || [];
    var late = list.filter(function (x) { return x.due_on < t; }), now_ = list.filter(function (x) { return x.due_on === t; }), soon = list.filter(function (x) { return x.due_on > t; });
    var row = function (x) {
      return '<button type="button" class="ccs-mini ws-furow' + (x.due_on < t ? ' is-late' : '') + '" data-act="ws-open" data-id="' + x.customer_id + '" data-tab="notes"><span class="ccs-mini-t">' + esc(x.due_on < t ? 'Overdue' : x.due_on === t ? 'Today' : nice(x.due_on)) + '</span>' +
        '<span class="ccs-mini-m"><b>' + esc(x.title) + '</b><span>' + esc(x.customer + ' · ' + custNo(x.customer_no) + (x.order_ref ? ' · ' + x.order_ref : '') + ' · For ' + wsWho(x)) + '</span></span></button>';
    };
    var sub = function (label, arr) { return arr.length ? '<p class="ws-fu-h">' + label + ' (' + arr.length + ')</p><div class="ccs-minis">' + arr.slice(0, 8).map(row).join('') + '</div>' : ''; };
    return '<section class="ccs-panel-card ws-fu">' + head + (list.length ? sub('Overdue', late) + sub('Due today', now_) + sub('Next 7 days', soon) :
      '<p class="ccs-quiet">All caught up.</p>') + '</section>';
  }

  // Order screen: open follow-ups linked to this order
  function orderFuLoad(id) {
    if (!wsCanRead()) return;
    sb.rpc('order_followups', { p_order: id }).then(function (r) {
      if (r.error) throw r.error;
      if (S.sheet && S.sheet.type === 'order' && S.sheet.id === id) { S.sheet.fu = r.data; renderSheet(); }
    }).catch(function (e) { console.error(e); });
  }
  function orderFuBox(o) {
    var f = S.sheet.fu; if (!o.customer_id || !wsCanRead()) return '';
    var tasks = (f && f.tasks) || [];
    return '<div class="ws-orderfu">' + (tasks.length ? '<p class="ccs-label">Open follow-ups for this order</p><ul class="ccs-plain">' + tasks.map(function (x) { return '<li' + (x.overdue ? ' class="ws-miss"' : '') + '>' + esc(x.title + ' · ' + wsDueLabel(x) + ' · For ' + wsWho(x)) + '</li>'; }).join('') + '</ul>' : '') +
      '<button type="button" class="ccs-link" data-act="ws-open" data-id="' + o.customer_id + '" data-tab="notes">Notes and follow-ups' + (f && f.notes ? ' (' + f.notes + ' about this order)' : '') + '</button></div>';
  }

  // ---------- customers list: filters, saved groups, export, duplicate review (CRM step 4) ----------
  // One filter definition, checked by the database, drives the list, saved groups and exports.
  // Exports only include people who said yes to the chosen channel. Every export is recorded. Nothing is sent from here.
  var CM_CONSENT = [['', 'Any'], ['any', 'Agreed to at least one'], ['whatsapp', 'WhatsApp yes'], ['sms', 'SMS yes'], ['email', 'Email yes'], ['call', 'Phone call yes'], ['reconfirm', 'Needs reconfirming'], ['none', 'No permission']];
  var CM_CHANNEL = [['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'], ['call', 'Phone call']];
  var CM_SEGMAP = { seg_repeat: 1, seg_first_time: 1, seg_high_value: 1, seg_inactive: 1, seg_birthday_buyer: 1, seg_upcoming_occasion: 1, seg_upcoming_order: 1, seg_corporate: 1 };
  function clState() {
    var c = S.cust;
    if (!c.flt) { c.flt = {}; c.mode = 'list'; c.groups = null; c.opts = null; c.groupId = null; c.panel = null; c.exp = null; c.err = null; c.count = null; }
    return c;
  }
  function clGroup() { var c = clState(); return c.groupId && c.groups ? c.groups.filter(function (g) { return g.id === c.groupId; })[0] : null; }
  // The filter actually sent: the Show choice plus the extra filters.
  function clFilter() {
    var c = clState(), f = {};
    if (CM_SEGMAP[c.seg]) f.segment = c.seg;
    if (c.seg === 'marketing_opt_in') f.consent = 'any';
    Object.keys(c.flt).forEach(function (k) { if (c.flt[k] !== '' && c.flt[k] != null) f[k] = c.flt[k]; });
    return f;
  }
  function clLoad() {
    var c = clState(); c.loaded = false; c.err = null; c.loadErr = null; view();
    if (!c.groups) clGroupsLoad();
    return sb.rpc('customer_filter', { p_filter: clFilter(), p_limit: 500 }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) { c.rows = []; c.count = 0; c.err = r.data.message; } else { c.rows = r.data.rows || []; c.count = r.data.count; }
      c.loaded = true; if (S.tab === 'customers') view();
    }).catch(function (e) { var m = readErr(e, 'customers'); if (m == null) return; c.loadErr = m; if (S.tab === 'customers') view(); });
  }
  function clGroupsLoad() {
    var c = clState();
    return sb.rpc('customer_groups_list').then(function (r) {
      if (r.error) throw r.error;
      if (r.data.ok) { c.groups = r.data.groups || []; c.canGroup = r.data.can_edit; if (S.tab === 'customers') view(); }
    }).catch(function (e) { console.error(e); });
  }
  function clOptsLoad() {
    var c = clState(); if (c.opts) return;
    c.opts = { occasions: [], cakes: [], loading: true };
    sb.rpc('customer_filter_options').then(function (r) { if (r.error) throw r.error; if (r.data.ok) { c.opts = r.data; if (S.tab === 'customers') view(); } }).catch(function (e) { c.opts = null; console.error(e); });
  }
  // The Show list: quick groups, then saved groups
  function clShowSelect() {
    var c = clState(), sel = c.groupId ? 'g:' + c.groupId : c.seg;
    var h = '<label class="ccs-show" for="ccs-seg"><span>Show</span><select class="ccs-input" id="ccs-seg">' + SEGS.map(function (s) { return '<option value="' + s[0] + '"' + (sel === s[0] && !c.q ? ' selected' : '') + '>' + (s[0] === 'all' ? 'All customers' : s[1]) + '</option>'; }).join('');
    if (c.groups && c.groups.length) h += '<optgroup label="Saved groups">' + c.groups.map(function (g) { return '<option value="g:' + g.id + '"' + (sel === 'g:' + g.id ? ' selected' : '') + '>' + esc(g.name) + ' (' + g.count + ')</option>'; }).join('') + '</optgroup>';
    return h + '</select></label>';
  }
  function clSegChange(v) {
    var c = clState(); c.q = ''; c.panel = null; c.exp = null;
    if (v.indexOf('g:') === 0) { var g = (c.groups || []).filter(function (x) { return x.id === v.slice(2); })[0]; c.groupId = g ? g.id : null; c.seg = 'all'; c.flt = g ? Object.assign({}, g.filter) : {}; if (c.flt.segment) { c.seg = c.flt.segment; delete c.flt.segment; } }
    else { c.groupId = null; c.seg = v; c.flt = {}; }
    loadCustomers();
  }
  var CM_LABEL = {
    spend_min: function (v) { return 'Spend from ' + money(v); }, spend_max: function (v) { return 'Spend up to ' + money(v); },
    orders_min: function (v) { return 'At least ' + v + ' orders'; }, orders_max: function (v) { return 'At most ' + v + ' orders'; },
    last_from: function (v) { return 'Last order from ' + nice(v); }, last_to: function (v) { return 'Last order up to ' + nice(v); },
    quiet_days: function (v) { return 'No order in the last ' + v + ' days'; }, occasion: function (v) { return 'Occasion: ' + v; }, cake: function (v) { return 'Cake: ' + v; },
    source: function (v) { return v === 'online' ? 'First ordered online' : 'First ordered at the counter'; },
    consent: function (v) { return (CM_CONSENT.filter(function (x) { return x[0] === v; })[0] || [0, v])[1]; },
    birthday_month: function (v) { return 'Birthday in ' + MONTHS[Number(v) - 1]; },
    corporate: function (v) { return v ? 'Corporate' : 'Not corporate'; }, upcoming: function (v) { return v ? 'Has an order coming' : 'No order coming'; }
  };
  function clChips() {
    var c = clState(), keys = Object.keys(c.flt).filter(function (k) { return c.flt[k] !== '' && c.flt[k] != null && CM_LABEL[k]; });
    if (!keys.length) return '';
    return '<div class="cm-chips" aria-label="Filters in use">' + keys.map(function (k) { return '<span class="cm-chip">' + esc(CM_LABEL[k](c.flt[k])) + '<button type="button" class="cm-x" data-act="ws-cm-unset" data-v="' + k + '" aria-label="Remove ' + esc(CM_LABEL[k](c.flt[k])) + '">×</button></span>'; }).join('') +
      '<button type="button" class="ccs-link" data-act="ws-cm-clear">Clear filters</button></div>';
  }
  function clToolbar() {
    var c = clState(), g = clGroup(), nf = Object.keys(c.flt).length;
    var mayExport = can('manager', 'marketing'), mayGroup = can('manager', 'marketing');
    var h = '<div class="ccs-ctool">' + clShowSelect() +
      '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-panel" data-v="filter" aria-expanded="' + (c.panel === 'filter') + '">Filters' + (nf ? ' (' + nf + ')' : '') + '</button>' +
      (c.loaded ? '<span class="ccs-ccount"><b>' + c.count + '</b> customer' + (c.count === 1 ? '' : 's') + (c.count > c.rows.length ? ', showing the latest ' + c.rows.length : '') + '</span>' : '<span class="ccs-ccount"></span>') +
      '<span class="ccs-ctool-actions">' +
      (mayGroup && (nf || CM_SEGMAP[c.seg]) ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-panel" data-v="save">' + (g ? 'Update group' : 'Save as group') + '</button>' : '') +
      '<span class="ccs-tools"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-tools" aria-haspopup="true" aria-expanded="' + !!c.tools + '">Tools</button>' +
      (c.tools ? '<span class="ccs-tools-menu" role="menu">' +
        (mayExport && c.loaded && c.count ? '<button type="button" role="menuitem" data-act="ws-cm-panel" data-v="export"><b>Export a contact list</b><span>Only guests who agreed to that channel</span></button>' : '') +
        (can('manager') ? '<button type="button" role="menuitem" data-act="ws-cm-dups"><b>Possible duplicates</b><span>Guests entered twice</span></button>' : '') +
        '<button type="button" role="menuitem" data-act="ws-cm-s5-log"><b>Export log</b><span>Who exported or printed what</span></button></span>' : '') +
      '</span></span></div>';
    if (g) h += '<p class="ccs-hint cm-gline">Saved group <b>' + esc(g.name) + '</b>, made by ' + esc(g.by) + (g.updated_by ? ', last changed by ' + esc(g.updated_by) : '') + '. The list is worked out fresh each time, so new customers who match join it.</p>';
    h += clChips();
    if (c.panel === 'filter') h += clFilterPanel();
    if (c.panel === 'save') h += clSavePanel();
    if (c.panel === 'export') h += clExportPanel();
    if (c.err) h += '<p class="ccs-err" role="alert">' + esc(c.err) + '</p>';
    return h;
  }
  function clInput(id, label, v, type, extra) {
    return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><input class="ccs-input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '></div>';
  }
  function clSelect(id, label, opts, v) {
    return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><select class="ccs-input" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v == null ? '' : v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
  }
  function clFilterPanel() {
    var c = clState(), f = c.flt, o = c.opts || { occasions: [], cakes: [] }; clOptsLoad();
    var yn = [['', 'Any'], ['true', 'Yes'], ['false', 'No']];
    var num = ' inputmode="decimal" autocomplete="off"';
    return '<section class="ccs-panel cm-filter" aria-label="Filters"><b>Filter customers</b>' +
      '<div class="ccs-row">' + clInput('cm-spend-min', 'Spend from (FJD)', f.spend_min, 'text', num) + clInput('cm-spend-max', 'Spend up to (FJD)', f.spend_max, 'text', num) +
      clInput('cm-orders-min', 'At least this many orders', f.orders_min, 'text', num) + clInput('cm-orders-max', 'At most this many orders', f.orders_max, 'text', num) + '</div>' +
      '<div class="ccs-row">' + clInput('cm-last-from', 'Last order from', f.last_from, 'date') + clInput('cm-last-to', 'Last order up to', f.last_to, 'date') +
      clInput('cm-quiet', 'No order in the last (days)', f.quiet_days, 'text', num) + '</div>' +
      '<div class="ccs-row">' + clSelect('cm-occasion', 'Occasion', [['', 'Any']].concat((o.occasions || []).map(function (x) { return [x, x]; })), f.occasion) +
      clSelect('cm-cake', 'Has ordered this cake', [['', 'Any']].concat((o.cakes || []).map(function (x) { return [x, x]; })), f.cake) +
      clSelect('cm-source', 'First ordered', [['', 'Any'], ['online', 'Online'], ['walk_in', 'At the counter or by phone']], f.source) + '</div>' +
      '<div class="ccs-row">' + clSelect('cm-consent', 'Marketing permission', CM_CONSENT, f.consent) +
      clSelect('cm-bmonth', 'Birthday month', [['', 'Any']].concat(MONTHS.map(function (m, i) { return [String(i + 1), m]; })), f.birthday_month) +
      clSelect('cm-corp', 'Corporate customer', yn, f.corporate == null ? '' : String(f.corporate)) +
      clSelect('cm-upcoming', 'Has an order coming', yn, f.upcoming == null ? '' : String(f.upcoming)) + '</div>' +
      '<p class="ccs-hint">Spend counts collected orders only. Orders from the old sheets are not counted yet.</p>' +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-apply">Show customers</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-panel" data-v="">Close</button></div></section>';
  }
  function clReadPanel() {
    var f = {}, put = function (k, v) { v = String(v || '').trim(); if (v !== '') f[k] = v; };
    put('spend_min', val('cm-spend-min').replace(/[$,\s]/g, '')); put('spend_max', val('cm-spend-max').replace(/[$,\s]/g, ''));
    put('orders_min', val('cm-orders-min')); put('orders_max', val('cm-orders-max'));
    put('last_from', val('cm-last-from')); put('last_to', val('cm-last-to')); put('quiet_days', val('cm-quiet'));
    put('occasion', val('cm-occasion')); put('cake', val('cm-cake')); put('source', val('cm-source')); put('consent', val('cm-consent')); put('birthday_month', val('cm-bmonth'));
    if (val('cm-corp')) f.corporate = val('cm-corp') === 'true';
    if (val('cm-upcoming')) f.upcoming = val('cm-upcoming') === 'true';
    var bad = ['spend_min', 'spend_max', 'orders_min', 'orders_max', 'quiet_days'].filter(function (k) { return f[k] != null && !/^\d{1,7}(\.\d{1,2})?$/.test(f[k]); })[0];
    if (bad) return { err: 'Use a plain number for ' + { spend_min: 'spend from', spend_max: 'spend up to', orders_min: 'at least', orders_max: 'at most', quiet_days: 'no order in the last' }[bad] + '.' };
    if (f.spend_min && f.spend_max && Number(f.spend_min) > Number(f.spend_max)) return { err: 'Spend from is more than spend up to.' };
    if (f.last_from && f.last_to && f.last_from > f.last_to) return { err: 'The first date is after the second.' };
    return { f: f };
  }
  function clSavePanel() {
    var c = clState(), g = clGroup();
    return '<section class="ccs-panel" aria-label="Save group"><b>' + (g ? 'Update ' + esc(g.name) : 'Save these filters as a group') + '</b>' +
      clInput('cm-gname', 'Group name', g ? g.name : '', 'text', ' maxlength="60" autocomplete="off" placeholder="For example: Birthday buyers, no order in 6 months"') +
      '<p class="ccs-hint">A group saves the filters, not a fixed list. Saving does not contact anyone.</p>' + (c.gErr ? '<p class="ccs-err" role="alert">' + esc(c.gErr) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-gsave" data-v="' + (g ? 'update' : 'new') + '">' + (g ? 'Save changes' : 'Save group') + '</button>' +
      (g ? '<button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-gsave" data-v="new">Save as a new group</button>' : '') +
      '<button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-panel" data-v="">Cancel</button>' +
      (g ? '<button type="button" class="ccs-link ccs-red" data-act="ws-cm-garchive">Remove group</button>' : '') + '</div></section>';
  }
  function clExportPanel() {
    var c = clState(), e = c.exp || (c.exp = { channel: null, pre: null, inc: false });
    var h = '<section class="ccs-panel cm-export" aria-label="Export"><b>Export a contact list</b><p class="ccs-hint">Choose how these customers will be contacted. Only people who said yes to that channel, on the number or email they gave, are included. Nothing is sent from here, and the export is recorded with your name.</p>' +
      '<div class="ccs-chips" role="group" aria-label="Channel">' + CM_CHANNEL.map(function (x) { return '<button type="button" class="ccs-chip" data-act="ws-cm-ech" data-v="' + x[0] + '" aria-pressed="' + (e.channel === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (e.channel && !e.pre) h += '<p class="ccs-loading">Checking permission…</p>';
    if (e.pre && e.pre.ok) {
      var ch = (CM_CHANNEL.filter(function (x) { return x[0] === e.channel; })[0] || [0, ''])[1];
      h += '<ul class="ccs-plain cm-explist"><li><b>' + e.pre.yes + '</b> can be contacted by ' + esc(ch) + '.</li>' +
        (e.pre.no ? '<li><b>' + e.pre.no + '</b> left out: no permission for ' + esc(ch) + '.</li>' : '') +
        (e.pre.reconfirm ? '<li><b>' + e.pre.reconfirm + '</b> said yes on the old walk-in sheet and need reconfirming. Left out unless you tick below.</li>' : '') + '</ul>';
      if (e.pre.reconfirm) h += '<label class="ccs-check"><input type="checkbox" data-wsc="cm-inc"' + (e.inc ? ' checked' : '') + '> Include the ' + e.pre.reconfirm + ' who need reconfirming. Use this only to ask them to confirm, not for an offer.</label>';
      var n = e.pre.yes + (e.inc ? e.pre.reconfirm : 0);
      h += n ? '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-export" data-v="file">Download file (' + n + ')</button>' +
        (e.channel !== 'email' ? '<button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-export" data-v="copy">Copy numbers</button>' : '') + '</div>' : '<p class="ccs-quiet">Nobody in this list can be contacted by ' + esc(ch) + '.</p>';
    }
    if (e.pre && !e.pre.ok) h += '<p class="ccs-err" role="alert">' + esc(e.pre.message) + '</p>';
    return h + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-panel" data-v="">Close</button></div></section>';
  }
  function clExport(b, how) {
    var c = clState(), e = c.exp; if (!e || !e.channel) return;
    markBusy(b, 'Preparing…');
    sb.rpc('customer_export', { p_filter: clFilter(), p_channel: e.channel, p_group: c.groupId, p_include_reconfirm: !!e.inc }).then(function (r) {
      if (r.error) throw r.error; clearBusy();
      if (!r.data.ok) { e.pre = { ok: false, message: r.data.message }; return view(); }
      var rows = r.data.rows || [];
      if (how === 'copy') {
        copyText(rows.map(function (x) { var d = digits(x.destination); return d.length === 7 ? '+679' + d : '+' + d; }).join('\n'), clN(rows.length, 'number') + ' copied. The export is recorded.');
        return;
      }
      var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var label = (CM_CHANNEL.filter(function (x) { return x[0] === e.channel; })[0] || [0, ''])[1];
      var csv = ['Customer,Name,' + label + ',Needs reconfirming,Orders,Spend FJD,Last order'].concat(rows.map(function (x) { return [custNo(x.customer_no), x.full_name, x.destination, x.reconfirm ? 'Yes' : 'No', x.orders, x.spend, x.last_order || ''].map(q).join(','); })).join('\n');
      var g = clGroup(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'corner-cafe-' + (g ? g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'customers') + '-' + e.channel + '-' + today() + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      toast(clN(rows.length, 'customer') + ' exported. The export is recorded.');
    }).catch(function (x) { clearBusy(); fail(x); });
  }
  function clPreview() {
    var c = clState(), e = c.exp, ch = e.channel;
    sb.rpc('customer_export_preview', { p_filter: clFilter(), p_channel: ch }).then(function (r) {
      if (r.error) throw r.error;
      if (c.exp === e && e.channel === ch) { e.pre = r.data; view(); }
    }).catch(function (x) { var m = readErr(x, 'the permission check'); if (m == null) return; if (c.exp === e && e.channel === ch) { e.pre = { ok: false, message: m + ' Choose the channel again to retry.' }; view(); } });
  }

  // Duplicate review (managers)
  function clDupsLoad() {
    var c = clState(); c.dups = null; c.dupErr = null; c.dupRetry = false; view();
    return sb.rpc('customer_duplicates').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) c.dupErr = r.data.message; else c.dups = r.data;
      if (S.tab === 'customers') view();
    }).catch(function (e) { var m = readErr(e, 'the duplicate list'); if (m == null) return; c.dupErr = m; c.dupRetry = true; if (S.tab === 'customers') view(); });
  }
  function clCard(p, side, keep) {
    var row = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + esc(v) + '</dd>' : ''; };
    return '<div class="cm-side' + (keep ? ' is-keep' : '') + '"><p class="cm-who"><b>' + esc(p.full_name) + '</b> <span class="ccs-hint">' + esc(custNo(p.customer_no)) + '</span></p><dl class="ccs-kv">' +
      row('Mobile', p.phone) + row('Other number', p.alt_phone) + row('Email', p.email) + row('Company', p.company) + row('Birthday', p.birthday) +
      '<dt>Orders</dt><dd>' + p.orders + ', ' + money(p.spend) + (p.last_order_at ? ', last ' + esc(stamp(p.last_order_at).split(',')[0]) : '') + '</dd>' +
      (p.sheet_orders ? '<dt>Old sheets</dt><dd>' + clN(p.sheet_orders, 'order') + '</dd>' : '') +
      (p.notes_count || p.open_tasks ? '<dt>Notes</dt><dd>' + clN(p.notes_count, 'note') + ', ' + clN(p.open_tasks, 'open follow-up') + '</dd>' : '') +
      '<dt>Marketing</dt><dd>' + (p.consents ? p.consents + ' yes' : 'None') + '</dd>' +
      '<dt>Added</dt><dd>' + esc(stamp(p.created_at).split(',')[0]) + (p.source ? ', ' + esc(CUSTOMER_SOURCE[p.source] || p.source) : '') + '</dd></dl>' +
      '<button type="button" class="ccs-link" data-act="open-customer" data-id="' + p.id + '">Open profile</button></div>';
  }
  function clN(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function clPairKey(p) { return p.a.id + '|' + p.b.id; }
  function clDefaultKeep(p) { return p.a.orders !== p.b.orders ? (p.a.orders > p.b.orders ? 'a' : 'b') : (p.a.created_at <= p.b.created_at ? 'a' : 'b'); }
  function clPairCard(p) {
    var c = clState(), key = clPairKey(p), m = c.merge && c.merge.key === key ? c.merge : null, nd = c.notSame === key;
    var h = '<article class="ccs-box cm-pair"><div class="ccs-tags">' + p.reasons.map(function (r) { return '<span class="ccs-tag">' + esc(r) + '</span>'; }).join('') + '</div>' +
      '<div class="cm-sides">' + clCard(p.a, 'a', m && m.keep === 'a') + clCard(p.b, 'b', m && m.keep === 'b') + '</div>';
    if (m) h += clMergePanel(p, m);
    else if (nd) h += '<div class="ccs-panel">' + clInput('cm-ns-note', 'Why are they different people? (optional)', '', 'text', ' maxlength="300" autocomplete="off" placeholder="For example: mother and daughter share the number"') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-notsame-go" data-id="' + key + '">Not the same person</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-notsame" data-id="">Back</button></div></div>';
    else h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-merge" data-id="' + key + '">Same person, merge</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-notsame" data-id="' + key + '">Not the same person</button></div>';
    return h + '</article>';
  }
  function clMergePanel(p, m) {
    var keep = p[m.keep], other = p[m.keep === 'a' ? 'b' : 'a'], pv = m.pre;
    var h = '<div class="ccs-panel cm-merge"><b>Merge into one profile</b><div class="ccs-chips" role="group" aria-label="Which profile to keep">' +
      ['a', 'b'].map(function (s) { return '<button type="button" class="ccs-chip" data-act="ws-cm-keep" data-v="' + s + '" aria-pressed="' + (m.keep === s) + '">Keep ' + esc(custNo(p[s].customer_no) + ' ' + p[s].full_name) + '</button>'; }).join('') + '</div>';
    if (!pv) return h + '<p class="ccs-loading">Checking what moves…</p></div>';
    if (!pv.ok) return h + '<p class="ccs-err" role="alert">' + esc(pv.message) + '</p></div>';
    var mv = pv.moves, lines = [];
    if (mv.orders) lines.push(mv.orders + ' order' + (mv.orders === 1 ? '' : 's'));
    if (mv.sheet_orders) lines.push(mv.sheet_orders + ' old sheet order' + (mv.sheet_orders === 1 ? '' : 's'));
    if (mv.notes) lines.push(mv.notes + ' note' + (mv.notes === 1 ? '' : 's'));
    if (mv.tasks) lines.push(mv.tasks + ' follow-up' + (mv.tasks === 1 ? '' : 's'));
    var fl = Object.keys(pv.fills || {}).map(function (k) { return (FIELD_LABEL[k] || k.replace('_', ' ')) ; }).filter(function (x, i, a) { return a.indexOf(x) === i && x !== 'Birthday month'; }).map(function (x) { return x === 'Birthday day' ? 'Birthday' : x; });
    h += '<ul class="ccs-plain cm-explist"><li>' + esc(custNo(other.customer_no) + ' ' + other.full_name) + ' is marked as merged into ' + esc(custNo(keep.customer_no)) + '. It is kept, not erased.</li>' +
      '<li>Moves across: ' + (lines.length ? esc(lines.join(', ')) : 'nothing') + '. Each order keeps the name and number it was placed with.</li>' +
      (fl.length ? '<li>Fills in on ' + esc(custNo(keep.customer_no)) + ': ' + esc(fl.join(', ')) + '. Notes and preferences are added, not replaced.</li>' : '') +
      ((pv.not_kept || []).length ? '<li class="ws-miss">Not copied, already has one: ' + esc(pv.not_kept.join(', ')) + '. It stays on the merged profile and its orders.</li>' : '') +
      '<li>Marketing permission stays with the number or email it was given for. Nothing new is recorded.</li></ul>' +
      clInput('cm-mreason', 'Why are they the same person? (optional)', '', 'text', ' maxlength="300" autocomplete="off" placeholder="For example: same number, customer confirmed"') +
      '<p class="ccs-hint">A manager can undo this from the list below.</p>' + (m.err ? '<p class="ccs-err" role="alert">' + esc(m.err) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-merge-go">Merge</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-merge" data-id="">Cancel</button></div></div>';
    return h;
  }
  function clMergePreview() {
    var c = clState(), m = c.merge, p = clFindPair(m.key); if (!p) return;
    var keep = p[m.keep], other = p[m.keep === 'a' ? 'b' : 'a'];
    m.pre = null; view();
    sb.rpc('customer_merge_preview', { p_keep: keep.id, p_merge: other.id }).then(function (r) {
      if (r.error) throw r.error; if (c.merge === m) { m.pre = r.data; view(); }
    }).catch(function (e) { var t = readErr(e, 'the merge check'); if (t == null) return; if (c.merge === m) { m.pre = { ok: false, message: t + ' Tap Keep again to retry.' }; view(); } });
  }
  function clFindPair(key) { var c = clState(); return ((c.dups && c.dups.pairs) || []).filter(function (p) { return clPairKey(p) === key; })[0]; }
  function clDupsView() {
    var c = clState(), d = c.dups;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Possible duplicate customers</h1><p class="ccs-sub">Profiles that share a mobile number, email or name. Check before merging: families and offices often share a number.</p></div>' +
      '<div class="ccs-headacts"><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-list">Back to customers</button></div></div>';
    if (c.dupErr) return h + (c.dupRetry ? loadErr(c.dupErr, 'dups-reload') : '<div class="ccs-empty"><b>' + esc(c.dupErr) + '</b></div>');
    if (!d) return h + '<p class="ccs-loading">Looking for duplicates…</p>';
    var strong = d.pairs.filter(function (p) { return p.strong; }), weak = d.pairs.filter(function (p) { return !p.strong; });
    h += strong.length ? '<h2 class="rg-h">Same mobile or email (' + strong.length + ')</h2>' + strong.map(clPairCard).join('') : '<p class="ccs-quiet">No profiles share a mobile number or email.</p>';
    if (weak.length) h += '<h2 class="rg-h">Same name only (' + weak.length + ')</h2><p class="ccs-hint">A shared name alone is weak evidence. Merge only if the orders or details show it is the same person.</p>' +
      (c.weakOpen ? weak.map(clPairCard).join('') + '<button type="button" class="ccs-link" data-act="ws-cm-weak">Hide these</button>' : '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-weak">Show ' + weak.length + ' name matches</button>');
    if (d.merges.length) h += '<h2 class="rg-h">Recent merges</h2><div class="ccs-history">' + d.merges.map(function (m) {
      var nm = function (x) { return custNo(x.customer_no) + ' ' + x.full_name; };
      return '<div><span>' + esc(stamp(m.at)) + '</span><span>' + esc(nm(m.merged) + ' merged into ' + nm(m.kept) + ' by ' + m.by + (m.reason ? ': ' + m.reason : '')) +
        (m.undone_at ? ' <span class="ccs-hint">Undone by ' + esc(m.undone_by) + ', ' + esc(stamp(m.undone_at)) + (m.undo_result && m.undo_result.details_kept && m.undo_result.details_kept.length ? '. Kept because they were changed since: ' + esc(m.undo_result.details_kept.join(', ')) : '') + '</span>'
          : ' <button type="button" class="ccs-link" data-act="ws-cm-undo" data-id="' + m.id + '">Undo</button>') + '</span></div>';
    }).join('') + '</div>';
    if (d.dismissed.length) h += '<h2 class="rg-h">Marked as different people</h2><div class="ccs-history">' + d.dismissed.map(function (x) {
      return '<div><span>' + esc(stamp(x.at)) + '</span><span>' + esc(custNo(x.a.customer_no) + ' ' + x.a.full_name + ' and ' + custNo(x.b.customer_no) + ' ' + x.b.full_name + ' · ' + x.by + (x.note ? ': ' + x.note : '')) +
        ' <button type="button" class="ccs-link" data-act="ws-cm-unnotsame" data-id="' + x.id + '">Undo</button></span></div>';
    }).join('') + '</div>';
    return h;
  }

  function clAct(a, b, v) {
    if (a.indexOf('ws-cm-s5-') === 0) return s5Act(a, b, v);
    var c = clState(), id = b.dataset.id;
    if (a === 'ws-cm-panel') { c.panel = v || null; c.gErr = null; if (v === 'export') c.exp = null; if (v === 'filter') clOptsLoad(); view(); return; }
    if (a === 'ws-cm-apply') { var rp = clReadPanel(); if (rp.err) { c.err = rp.err; return view(); } c.flt = rp.f; c.panel = null; c.exp = null; loadCustomers(); return; }
    if (a === 'ws-cm-unset') { delete c.flt[v]; c.exp = null; loadCustomers(); return; }
    if (a === 'ws-cm-clear') { c.flt = {}; c.exp = null; if (c.groupId) { c.groupId = null; } loadCustomers(); return; }
    if (a === 'ws-cm-ech') { c.exp = { channel: v, pre: null, inc: false }; view(); clPreview(); return; }
    if (a === 'ws-cm-export') { clExport(b, v); return; }
    if (a === 'ws-cm-gsave') {
      var g = v === 'update' ? clGroup() : null, name = val('cm-gname').trim();
      if (name.length < 2) { c.gErr = 'Give the group a name.'; return view(); }
      markBusy(b, 'Saving…');
      sb.rpc('customer_group_save', { p_id: g ? g.id : null, p_name: name, p_filter: clFilter(), p_version: g ? g.version : null }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { c.gErr = r.data.message; return view(); }
        c.panel = null; c.gErr = null; c.groupId = r.data.id; toast(g ? 'Group updated' : 'Group saved');
        clGroupsLoad();
      }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
    if (a === 'ws-cm-garchive') {
      var ga = clGroup(); if (!ga) return;
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to remove the group'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Remove group'; } }, 4000); return; }
      markBusy(b, 'Removing…');
      sb.rpc('customer_group_archive', { p_id: ga.id, p_version: ga.version }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { c.gErr = r.data.message; return view(); }
        toast('Group removed. No customers were changed.'); c.groupId = null; c.panel = null; c.flt = {}; c.seg = 'all'; clGroupsLoad(); loadCustomers();
      }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
    if (a === 'ws-cm-dups-open') { c.mode = 'dups'; c.merge = null; goTab('customers'); if (S.tab === 'customers') clDupsLoad(); return; }
    if (a === 'ws-cm-weak') { c.weakOpen = !c.weakOpen; view(); return; }
    if (a === 'ws-cm-dups') { c.mode = 'dups'; c.merge = null; c.notSame = null; window.scrollTo(0, 0); clDupsLoad(); return; }
    if (a === 'ws-cm-list') { c.mode = 'list'; c.merge = null; if (c.loaded) view(); else loadCustomers(); window.scrollTo(0, 0); return; }
    if (a === 'ws-cm-merge') { if (!id) { c.merge = null; return view(); } var pm = clFindPair(id); if (!pm) return; c.notSame = null; c.merge = { key: id, keep: clDefaultKeep(pm), pre: null }; clMergePreview(); return; }
    if (a === 'ws-cm-keep') { if (!c.merge) return; c.merge.keep = v; c.merge.err = null; clMergePreview(); return; }
    if (a === 'ws-cm-merge-go') {
      var m = c.merge, pg = m && clFindPair(m.key); if (!pg || !m.pre || !m.pre.ok) return;
      var k = pg[m.keep], o = pg[m.keep === 'a' ? 'b' : 'a'];
      markBusy(b, 'Merging…');
      sb.rpc('customer_merge', { p_keep: k.id, p_merge: o.id, p_keep_version: m.pre.keep.version, p_merge_version: m.pre.merge.version, p_reason: val('cm-mreason') || null }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { m.err = r.data.message; return view(); }
        toast(custNo(o.customer_no) + ' merged into ' + custNo(k.customer_no) + '. You can undo it below.');
        c.merge = null; c.loaded = false; clDupsLoad();
      }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
    if (a === 'ws-cm-notsame') { c.notSame = id || null; c.merge = null; view(); return; }
    if (a === 'ws-cm-notsame-go') {
      var pn = clFindPair(id); if (!pn) return;
      markBusy(b, 'Saving…');
      sb.rpc('customer_pair_dismiss', { p_a: pn.a.id, p_b: pn.b.id, p_note: val('cm-ns-note') || null }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { toast(r.data.message, true); return; }
        toast('Marked as different people'); c.notSame = null; clDupsLoad();
      }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
    if (a === 'ws-cm-undo') {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to undo the merge'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Undo'; } }, 4000); return; }
      markBusy(b, 'Undoing…');
      sb.rpc('customer_merge_undo', { p_merge: id, p_reason: null }).then(function (r) {
        if (r.error) throw r.error; clearBusy();
        if (!r.data.ok) { toast(r.data.message, true); return; }
        var kept = r.data.result.details_kept || [];
        toast('Merge undone.' + (kept.length ? ' Kept on the main profile because they were changed since: ' + kept.join(', ') + '.' : ''));
        c.loaded = false; clDupsLoad();
      }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
    if (a === 'ws-cm-unnotsame') {
      markBusy(b, 'Undoing…');
      sb.rpc('customer_pair_undismiss', { p_id: id }).then(function (r) { if (r.error) throw r.error; clearBusy(); if (!r.data.ok) { toast(r.data.message, true); return; } toast('Back in the review list'); clDupsLoad(); }).catch(function (x) { clearBusy(); fail(x); });
      return;
    }
  }

  // ---------- CRM step 5: customer report, export log, role permissions, backup check ----------
  var S5_SECTIONS = [['contact', 'Contact details and summary'], ['orders', 'Orders'], ['sheet', 'Orders from the old sheets'], ['notes', 'Notes and follow-ups'], ['consent', 'Marketing permission']];
  var S5_ROLE_NAME = { admin: 'Admin', manager: 'Manager', front_of_house: 'Counter', kitchen: 'Kitchen', finance: 'Finance', marketing: 'Marketing' };
  function s5MaySection(k) {
    if (k === 'notes') return wsCanRead();
    if (k === 'consent') return can('manager', 'front_of_house', 'marketing');
    return true;
  }
  function s5ReportPanel() {
    var s = S.sheet, rp = s.rep; if (!rp) return '';
    var d = s.data;
    var opts = S5_SECTIONS.filter(function (x) { return s5MaySection(x[0]) && (x[0] !== 'sheet' || d.sheet.length); });
    return '<section class="ccs-panel s5-rep" aria-label="Customer report"><b>Print a customer report</b>' +
      '<p class="ccs-hint">Choose what goes on it. The report holds personal details: keep it inside the café and shred it when finished. It is recorded with your name.</p>' +
      '<div class="s5-checks">' + opts.map(function (x) { return '<label class="ccs-check"><input type="checkbox" data-s5sec="' + x[0] + '"' + (rp.off[x[0]] ? '' : ' checked') + '> ' + x[1] + '</label>'; }).join('') + '</div>' +
      (rp.err ? '<p class="ccs-err" role="alert">' + esc(rp.err) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ws-cm-s5-print">Print report</button><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-s5-rep">Cancel</button></div></section>';
  }
  function s5Picked() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-s5sec]'), function (cb) { if (cb.checked) out.push(cb.dataset.s5sec); });
    return out;
  }
  function s5Print(btn) {
    var s = S.sheet, rp = s.rep; if (!rp) return;
    var picked = s5Picked();
    S5_SECTIONS.forEach(function (x) { rp.off[x[0]] = picked.indexOf(x[0]) < 0; });
    if (!picked.length) { rp.err = 'Tick at least one part.'; return renderSheet(); }
    if (picked.indexOf('notes') > -1 && !s.ws) { rp.err = 'Notes and follow-ups are still loading. Try again in a moment.'; wsLoad(s.id); return renderSheet(); }
    rp.err = null; markBusy(btn, 'Recording…');
    sb.rpc('customer_report_logged', { p_customer: s.id, p_sections: picked }).then(function (r) {
      if (r.error) throw r.error; clearBusy();
      if (!r.data.ok) { rp.err = r.data.message; return renderSheet(); }
      var el = document.getElementById('ccs-print'); if (!el) { el = document.createElement('div'); el.id = 'ccs-print'; document.body.appendChild(el); }
      el.innerHTML = s5ReportHtml(s, picked, r.data.by);
      var ps = document.getElementById('ccs-page'); if (!ps) { ps = document.createElement('style'); ps.id = 'ccs-page'; document.head.appendChild(ps); }
      ps.textContent = '@page{size:A4 portrait;margin:12mm}';
      s.rep = null; renderSheet(); toast('Report recorded and sent to the printer');
      printNamed(('Customer report ' + (s.data.c.full_name || '') + ' ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })).replace(/[\\/:*?"<>|]+/g, ' ')); document.body.classList.add('ccs-printing'); setTimeout(function () { window.print(); }, 50);
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function s5ReportHtml(s, picked, by) {
    var d = s.data, c = d.c, sm = d.sum, has = function (k) { return picked.indexOf(k) > -1; };
    var row = function (k, v) { return v || v === 0 ? '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>' : ''; };
    var h = '<div class="s5-report"><div class="s5-r-top"><div><div class="s5-r-kicker">Corner Café customer report</div><div class="s5-r-name">' + esc(c.full_name) + '</div><div class="s5-r-sub">' + esc(custNo(c.customer_no)) + (c.archived_at ? ' · Archived' : '') + '</div></div>' +
      '<div class="s5-r-meta">Printed ' + esc(stamp(new Date().toISOString())) + '<br>by ' + esc(by || '') + '</div></div>' +
      '<p class="s5-r-warn">Contains personal details. Keep inside the café. Shred when finished.</p>';
    if (has('contact')) {
      h += '<h2>Contact details</h2><table class="s5-r-kv">' + row('Mobile', c.phone) + row('Other number', c.alt_phone) + row('Email', c.email) +
        row('Best way to reach', { whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email' }[c.preferred_contact]) + row('Company', c.company) + row('Corporate', c.is_corporate ? 'Yes' : '') +
        row('Delivery address', c.delivery_address) + row('Birthday', birthday(c.birth_day, c.birth_month)) + row('Preferences', c.preferences) + row('Service notes', c.notes) + '</table>' +
        '<h2>Summary</h2><table class="s5-r-kv">' + row('Orders', sm.orders_count) + row('Spend (collected orders)', money(sm.completed_spend)) + row('Average order', sm.average_spend != null ? money(sm.average_spend) : '') +
        row('Cancelled', sm.cancelled_count) + row('Usually orders', sm.favourite_cake) + row('Occasions', (sm.occasions || []).join(', ')) +
        row('Merged into this profile', (d.mergedFrom || []).map(function (x) { return custNo(x.customer_no) + ' ' + x.full_name; }).join(', ')) + '</table>' +
        '<p class="s5-r-note">Spend and order counts do not include orders from the old Google Sheets.</p>';
    }
    if (has('orders')) {
      h += '<h2>Orders (' + d.orders.length + ')</h2>' + (d.orders.length ? '<table class="s5-r-tab"><thead><tr><th>Pickup</th><th>Order</th><th>Cake</th><th>Status</th><th>Payment</th><th class="s5-num">Total</th></tr></thead><tbody>' +
        d.orders.map(function (o) { var i = (o.order_items || [])[0]; return '<tr><td>' + esc(nice(o.required_date) + ' ' + String(o.required_date).slice(0, 4)) + '</td><td>' + esc(o.reference) + '</td><td>' + esc(cakeLine(i)) + (i && i.occasion ? ', ' + esc(i.occasion) : '') + '</td><td>' + esc(statusLabel(o.order_status, o.fulfilment_method)) + '</td><td>' + esc(PAY[o.payment_status] || '') + '</td><td class="s5-num">' + money(o.final_total != null ? o.final_total : o.estimate_total) + '</td></tr>'; }).join('') +
        '</tbody></table>' + (d.orders.length >= 100 ? '<p class="s5-r-note">Shows the latest 100 orders.</p>' : '') : '<p>No orders.</p>');
    }
    if (has('sheet') && d.sheet.length) {
      h += '<h2>Orders from the old sheets (' + d.sheet.length + ')</h2><table class="s5-r-tab"><thead><tr><th>Pickup</th><th>Cake</th><th>Recorded in</th><th class="s5-num">Value</th></tr></thead><tbody>' +
        d.sheet.map(function (o) { return '<tr><td>' + esc(o.fulfil_date ? nice(o.fulfil_date) + ' ' + o.fulfil_date.slice(0, 4) : 'No date') + '</td><td>' + esc([o.cake, o.size_inch ? o.size_inch + ' inch' : ''].filter(Boolean).join(' ') || 'Not stated') + '</td><td>' + esc((o.source || '') + (o.reference ? ' ' + o.reference : '')) + '</td><td class="s5-num">' + (o.value != null ? money(o.value) : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    if (has('notes') && s.ws) {
      var notes = s.ws.notes.filter(function (n) { return !n.hidden; });
      h += '<h2>Notes, enquiries and feedback (' + notes.length + ')</h2>' + (notes.length ? '<table class="s5-r-tab"><thead><tr><th>Date</th><th>Type</th><th>Written by</th><th>Note</th></tr></thead><tbody>' +
        notes.map(function (n) { return '<tr><td>' + esc(stamp(n.at)) + '</td><td>' + esc(WS_KIND[n.kind] + (n.tone ? ', ' + WS_TONE[n.tone] : '')) + '</td><td>' + esc(n.by) + '</td><td class="s5-wrap">' + esc(n.body) + (n.order_ref ? ' (' + esc(n.order_ref) + ')' : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>None.</p>');
      h += '<h2>Follow-ups (' + s.ws.tasks.length + ')</h2>' + (s.ws.tasks.length ? '<table class="s5-r-tab"><thead><tr><th>Due</th><th>What</th><th>For</th><th>Status</th><th>Outcome</th></tr></thead><tbody>' +
        s.ws.tasks.map(function (t) { return '<tr><td>' + esc(nice(t.due_on)) + '</td><td class="s5-wrap">' + esc(t.title) + '</td><td>' + esc(t.assigned_to ? (t.assignee || 'Staff') : 'Anyone') + '</td><td>' + esc(WS_TASK[t.status] || t.status) + '</td><td class="s5-wrap">' + esc(t.outcome || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>None.</p>');
    }
    if (has('consent')) {
      h += '<h2>Marketing permission: Corner Café</h2><table class="s5-r-kv">' + CHANNELS.map(function (ch) { return row(ch[1], consentLine(d, ch[0]).text); }).join('') + '</table>' +
        (d.log.length ? '<h3>Permission record (latest ' + d.log.length + ')</h3><table class="s5-r-tab"><thead><tr><th>Date</th><th>Channel</th><th>Answer</th><th>Number or email</th><th>Source</th></tr></thead><tbody>' +
          d.log.map(function (l) { return '<tr><td>' + esc(stamp(l.recorded_at)) + '</td><td>' + esc((CHANNELS.filter(function (x) { return x[0] === l.channel; })[0] || [0, l.channel])[1]) + '</td><td>' + (l.granted ? 'Yes' : 'No') + (l.needs_reconfirm ? ', needs reconfirming' : '') + '</td><td>' + esc(l.destination) + '</td><td>' + esc(l.source) + '</td></tr>'; }).join('') + '</tbody></table>' : '');
    }
    return h + '<p class="s5-r-foot">Corner Café cakes staff app. Report recorded in the export log.</p></div>';
  }

  // Export log: contact list exports and printed customer reports
  function s5FilterText(f) {
    if (!f) return '';
    var parts = [];
    if (f.segment) parts.push((SEGS.filter(function (x) { return x[0] === f.segment; })[0] || [0, f.segment])[1]);
    Object.keys(f).forEach(function (k) { if (k !== 'segment' && CM_LABEL[k]) parts.push(CM_LABEL[k](f[k])); });
    return parts.length ? parts.join(', ') : 'All customers';
  }
  function s5LogLoad() {
    var c = clState(); c.log = null; c.logErr = null; c.logRetry = false; view();
    sb.rpc('customer_exports_list', { p_limit: 300 }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) c.logErr = r.data.message; else c.log = r.data;
      if (S.tab === 'customers') view();
    }).catch(function (e) { var m = readErr(e, 'the export log'); if (m == null) return; c.logErr = m; c.logRetry = true; if (S.tab === 'customers') view(); });
  }
  function s5LogView() {
    var c = clState(), L = c.log;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Export log</h1><p class="ccs-sub">' + (can('manager') ? 'Every contact list export and printed customer report, by everyone.' : 'Your own exports and printed reports. Managers see everyone\'s.') + '</p></div>' +
      '<div class="ccs-headacts"><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-list">Back to customers</button></div></div>';
    if (c.logErr) return h + (c.logRetry ? loadErr(c.logErr, 'log-reload') : '<div class="ccs-empty"><b>' + esc(c.logErr) + '</b></div>');
    if (!L) return h + '<p class="ccs-loading">Loading the export log…</p>';
    if (!L.rows.length) return h + '<div class="ccs-empty"><b>Nothing exported or printed yet.</b><span>Contact list exports and customer reports show here with who, when and what.</span></div>';
    var ex = L.rows.filter(function (x) { return x.kind === 'export'; }), rep = L.rows.filter(function (x) { return x.kind === 'report'; });
    h += '<p class="ccs-hint">' + clN(ex.length, 'contact list export') + ', ' + clN(rep.length, 'customer report') + ' printed. Records cannot be changed or removed.</p>';
    h += '<div class="s5-log">' + L.rows.map(function (x) {
      var what, detail;
      if (x.kind === 'export') {
        what = 'Contact list for ' + ((CM_CHANNEL.filter(function (q) { return q[0] === x.channel; })[0] || [0, x.channel])[1]) + ': ' + clN(x.count, 'person', 'people');
        detail = (x.group ? 'Group ' + x.group + '. ' : '') + 'Filters: ' + s5FilterText(x.filter) + '. Left out: ' + x.left_no + ' without permission' + (x.left_re ? ', ' + x.left_re + ' needing reconfirming' : '') + '.' + (x.reconfirm ? ' Included people needing reconfirming.' : '');
      } else {
        what = 'Customer report: ' + custNo(x.customer_no) + ' ' + (x.customer || '');
        detail = 'Parts: ' + (x.sections || []).map(function (k) { return ((S5_SECTIONS.filter(function (q) { return q[0] === k; })[0] || [0, k])[1]).toLowerCase(); }).join(', ') + '.';
      }
      return '<div class="s5-log-row"><span class="s5-log-when">' + esc(stamp(x.at)) + '</span><div><b>' + esc(what) + '</b><p class="ccs-hint">' + esc(detail) + ' By ' + esc(x.by) + '.' +
        (x.kind === 'report' ? ' <button type="button" class="ccs-link" data-act="open-customer" data-id="' + esc(x.customer_id) + '">Open profile</button>' : '') + '</p></div></div>';
    }).join('') + '</div>';
    return h;
  }

  // Settings: role permissions and backup check (managers)
  function s5SettingsLoad() {
    var st = S.settings; if (!st || !can('manager')) return;
    st.perm = null; st.permErr = null; st.bc = null; st.bcErr = null;
    sb.rpc('role_permissions').then(function (r) { if (r.error) throw r.error; if (S.settings !== st) return; if (!r.data.ok) st.permErr = r.data.message; else st.perm = r.data; if (S.tab === 'settings') view(); })
      .catch(function (e) { console.error(e); if (S.settings === st) { st.permErr = 'Could not load the role table. Check the connection and try again.'; if (S.tab === 'settings') view(); } });
    sb.rpc('backup_check').then(function (r) { if (r.error) throw r.error; if (S.settings !== st) return; if (!r.data.ok) st.bcErr = r.data.message; else st.bc = r.data; if (S.tab === 'settings') view(); })
      .catch(function (e) { console.error(e); if (S.settings === st) { st.bcErr = 'Could not check the backups. Check the connection and try again.'; if (S.tab === 'settings') view(); } });
  }
  function s5PermView(st) {
    if (!can('manager')) return '';
    var P = st.perm, open = st.s5PermOpen ? ' open' : '';
    var h = '<details' + open + ' data-s5open="perm"><summary>What each level can do <span>Read from the database rules</span></summary><div class="ccs-set-body">';
    if (st.permErr) return h + '<p class="ccs-err" role="alert">' + esc(st.permErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-s5-settings" data-v="perm">Try again</button></div></details>';
    if (!P) return h + '<p class="ccs-loading">Loading…</p></div></details>';
    // One column per access level (admins see the levels they added too); a level can do what any of its abilities can do
    var LV = (st.levels || [{ name: 'Counter', grants: ['front_of_house'] }, { name: 'Kitchen', grants: ['kitchen'] }, { name: 'Admin', grants: ['admin'] }]).slice()
      .sort(function (a, b) { return (a.grants.indexOf('admin') > -1) - (b.grants.indexOf('admin') > -1); });
    var RANK = { no: 0, partly: 1, yes: 2 }, levelCell = function (x, l) { if (l.grants.indexOf('admin') > -1) return x.cells.admin || 'yes'; var best = 'no'; l.grants.forEach(function (g) { var v = x.cells[g] || 'no'; if (RANK[v] > RANK[best]) best = v; }); return best; };
    var area = '', cell = function (v) { return v === 'yes' ? '<td class="s5-yes">Yes</td>' : v === 'partly' ? '<td class="s5-part">Partly</td>' : '<td class="s5-no">No</td>'; };
    h += '<p class="ccs-hint">Worked out from the checks the database actually runs, so it cannot drift from what people can really do. Checked ' + esc(stamp(P.checked_at)) + '.</p>' +
      '<div class="s5-perm-wrap"><table class="s5-perm"><thead><tr><th scope="col">Can</th>' + LV.map(function (l) { return '<th scope="col">' + esc(l.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
    P.rows.forEach(function (x) {
      if (x.area !== area) { area = x.area; h += '<tr class="s5-area"><th colspan="' + (LV.length + 1) + '" scope="rowgroup">' + esc(area) + '</th></tr>'; }
      h += '<tr><th scope="row">' + esc(x.label) + (x.found ? '' : ' <span class="ccs-hint">(rule not found)</span>') + '</th>' + LV.map(function (l) { return cell(levelCell(x, l)); }).join('') + '</tr>';
    });
    h += '</tbody></table></div><ul class="ccs-plain">' + P.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      '<p class="ccs-hint">To change what a level can do, use Access levels. To change someone\'s level, use Team and access. Both are for admins.</p></div></details>';
    return h;
  }
  function s5BackupCheckView(st) {
    if (!can('manager')) return '';
    var B = st.bc, open = st.s5BcOpen ? ' open' : '';
    if (st.bcErr) return '<details' + open + ' data-s5open="bc"><summary>Backup and business continuity <span>Could not check</span></summary><div class="ccs-set-body"><p class="ccs-err" role="alert">' + esc(st.bcErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-s5-settings" data-v="bc">Try again</button></div></details>';
    if (!B) return '<details' + open + ' data-s5open="bc"><summary>Backup and business continuity <span>Checking…</span></summary><div class="ccs-set-body"><p class="ccs-loading">Checking…</p></div></details>';
    var problems = [], M = st.mir;
    if (M && M.state === 'not_set_up') problems.push('The backup Google Sheet is not set up yet. ' + clN(B.orders, 'order') + ' exist only inside the database and its host\'s backups.');
    else if (M && M.state === 'attention') problems.push(M.last_error && (!M.last_ack_at || M.last_error_at > M.last_ack_at) ? 'The backup Sheet could not copy: ' + M.last_error : 'The backup Sheet has not copied for over 30 minutes.');
    var lastDrill = B.drills[0];
    if (!lastDrill) problems.push('No restore test has been recorded.');
    else if (!lastDrill.passed) problems.push('The last restore test failed.');
    var h = '<details' + open + ' data-s5open="bc"><summary>Backup and business continuity <span>' + esc(mirLabel(M)) + '</span></summary><div class="ccs-set-body">';
    if (problems.length) h += '<div class="ccs-note" role="status"><b>Needs attention</b><ul class="s5-list">' + problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    h += mirBlock(st);
    h += '<h4 class="s5-h">Full copies inside the database</h4>' + (B.snapshots.length ? '<ul class="s5-list">' + B.snapshots.map(function (x) {
      return '<li><b>' + esc(x.name) + '</b>: ' + (x.tables ? x.tables + ' tables, ' + Number(x.rows || 0).toLocaleString('en-US') + ' rows' : 'older copy') + (x.at ? ', taken ' + esc(when(x.at)) : '') + '. ' +
        (x.covers_crm ? 'Includes notes, follow-ups and marketing permission.' : 'Does not include notes, follow-ups or marketing permission.') + '</li>';
    }).join('') + '</ul>' : '<p class="ccs-hint">None.</p>') +
      '<p class="ccs-hint">These copies sit in the same database, so they protect against a wrong change, not against losing the database. They cannot be reached from this app or the website.</p>';
    h += '<h4 class="s5-h">Host backups</h4><p class="ccs-hint">The database host (Supabase, Pro plan) keeps daily backups. Restoring one replaces the whole database and loses everything since, so it is the last resort. It is done by the account owner from the Supabase dashboard. Check how many days are kept there.</p>';
    h += '<h4 class="s5-h">Restore tests</h4>' + (B.drills.length ? '<ul class="s5-list">' + B.drills.map(function (x) {
      return '<li><b>' + esc(when(x.at)) + ', ' + (x.passed ? 'passed' : 'failed') + '</b> (' + esc(x.snapshot) + '). ' + esc(x.result) + '</li>';
    }).join('') + '</ul>' : '<p class="ccs-hint">None recorded.</p>');
    return h + '<p class="ccs-hint">Checked ' + esc(stamp(B.checked_at)) + '.</p><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-s5-settings" data-v="bc">Check again</button></div></details>';
  }
  function s5Act(a, b, v) {
    var s = S.sheet;
    if (a === 'ws-cm-s5-rep') { if (!s || s.type !== 'customer') return; s.rep = s.rep ? null : { off: {}, err: null }; if (s.rep && wsCanRead() && !s.ws) wsLoad(s.id); renderSheet(); return; }
    if (a === 'ws-cm-s5-print') { s5Print(b); return; }
    if (a === 'ws-cm-s5-log') { var c = clState(); c.mode = 'log'; c.merge = null; if (S.tab !== 'customers') goTab('customers'); window.scrollTo(0, 0); s5LogLoad(); return; }
    if (a === 'ws-cm-s5-settings') { if (S.settings) { if (v === 'perm') S.settings.s5PermOpen = true; else { S.settings.s5BcOpen = true; mirLoad(); } s5SettingsLoad(); } return; }
  }
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d || !d.dataset || !d.dataset.s5open || !S.settings) return;
    S.settings[d.dataset.s5open === 'perm' ? 's5PermOpen' : 's5BcOpen'] = d.open;
  }, true);

  // ---------- Customer relationships: Overview and Follow-ups (CRM first release) ----------
  // One call (crm_home) brings the figures, who to contact and why, and recent activity. Staff make every contact; nothing is sent automatically.
  // Recording a contact (crm_record_contact) saves the note, closes or moves the follow-up, sets the next step and keeps the contact record, in one step.
  S.crm = { data: null, at: 0, loading: false, err: null, all: false, open: null, f: 'all', rec: null };
  var CRM_KIND = { task: 'Follow-up', quote: 'Quote waiting', occasion: 'Occasion coming up', last_year: 'Ordered this time last year', lapsed: 'Regular gone quiet' };
  var CRM_OUT = [['interested', 'Interested'], ['quote', 'Wants a quote'], ['later', 'Will order later'], ['ordered', 'Has already ordered'], ['not_interested', 'Not interested'], ['no_answer', 'No answer'], ['left_message', 'Left a message']];
  var CRM_CH = [['phone', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['in_person', 'In person']];
  var CRM_NEXT = [['1', 'Tomorrow'], ['3', 'In 3 days'], ['7', 'Next week'], ['14', 'In 2 weeks'], ['other', 'Other date']];
  function crmCan() { return can('manager', 'front_of_house', 'marketing'); }
  function crmSec() { if (!crmCan()) return 'all'; var st = secStore('crm'); var v = st.crm; return ['ov', 'fu', 'all'].indexOf(v) > -1 ? v : (can('manager', 'marketing') ? 'ov' : 'fu'); }
  function crmLoad(force) {
    var c = S.crm; if (!crmCan() || c.loading) return;
    if (!force && c.at && Date.now() - c.at < 60000) return;
    c.loading = true;
    sb.rpc('crm_home', { p_all: !!c.all }).then(function (r) {
      c.loading = false; c.at = Date.now();
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) { c.err = (r.data && r.data.message) || 'Could not load.'; } else { c.data = r.data; c.err = null; }
      if (S.tab === 'customers') view();
    }).catch(function (e) {
      c.loading = false; c.at = Date.now(); console.error(e);
      c.err = /crm_home/.test(String(e && (e.message || e.hint || ''))) ? 'This part is not switched on yet. The database update needs to be run first.' : 'Could not load follow-ups. Check the connection and try again.';
      if (S.tab === 'customers') view();
    });
  }
  // Everyone to contact, in one list, most important first
  function crmList() {
    var d = S.crm.data; if (!d) return [];
    var all = [].concat(d.tasks || [], d.quotes || [], d.occasions || [], d.last_year || [], d.lapsed || []);
    var rank = { high: 0, normal: 1, low: 2 };
    all.forEach(function (x, i) { x._k = x.kind + ':' + (x.task ? x.task.id : x.order_id || x.id) + ':' + i; x._later = x.kind === 'task' && x.task && x.task.due_on > d.today; });
    return all.sort(function (a, b) { return (a._later - b._later) || (rank[a.pri] - rank[b.pri]) || 0; });
  }
  function crmBar(cur) {
    if (!crmCan()) return '';
    crmLoad(false);
    var n = crmList().filter(function (x) { return !x._later; }).length;
    return '<div class="crm-bar">' + secBar('crm', [['ov', 'Overview'], ['fu', 'Follow-ups', S.crm.data ? n : null], ['all', 'All customers']], cur, 'Customer sections') + '</div>';
  }
  function crmView(cs) {
    var c = S.crm;
    if (c.err && !c.data) return '<div class="ccs-empty"><b>' + esc(c.err) + '</b><button type="button" class="ccs-btn" data-act="ws-crm-reload">Try again</button></div>';
    if (!c.data) return '<p class="ccs-loading">Loading…</p>';
    return cs === 'ov' ? crmOverview() : crmFollow();
  }
  function crmDelta(cur, prev) { if (prev == null) return ''; if (!prev) return cur ? 'New' : 'Same as'; var p = Math.round((cur - prev) / prev * 100); return p > 0 ? 'Up ' + p + '%' : p < 0 ? 'Down ' + (-p) + '%' : 'Same as'; }
  function crmKpi(label, value, sub, tone) { return '<div class="ov-kpi crm-kpi"><span class="ov-kh"><span class="ov-kl">' + label + '</span></span><b class="ov-kv' + (tone ? ' is-' + tone : '') + '">' + value + '</b><span class="ov-ks">' + sub + '</span></div>'; }
  function crmOverview() {
    var d = S.crm.data, k = d.kpi, list = crmList(), h = '';
    if (k) {
      var day = +d.today.slice(8), mName = MONF[+d.today.slice(5, 7) - 1];
      var vs = function (cur, prev) { var t = crmDelta(cur, prev); return t === 'Same as' ? 'Same as the same days last month' : t ? t + ' on the same days last month' : ''; };
      h += '<p class="crm-period">' + esc(mName) + ' so far (1 to ' + day + ' ' + esc(mName) + '), compared with the same days last month.</p>';
      h += '<div class="ov-kpis crm-kpis">' +
        crmKpi('Customers', int(k.customers), 'With at least one order, all time') +
        crmKpi('New this month', int(k.new_month), esc(vs(k.new_month, k.new_prev)) || 'First order this month') +
        crmKpi('Returning this month', int(k.returning_month), esc(vs(k.returning_month, k.returning_prev)) || 'Had bought before') +
        crmKpi('Repeat purchase rate', (k.buyers ? Math.round(k.repeat_customers / k.buyers * 100) : 0) + '%', int(k.repeat_customers) + ' of ' + int(k.buyers) + ' customers have bought more than once') + '</div>';
      h += '<div class="ov-kpis crm-kpis">' +
        crmKpi('Revenue from returning customers', m0(dnum(k.returning_rev_month)), esc(vs(dnum(k.returning_rev_month), dnum(k.returning_rev_prev))) || 'This month') +
        crmKpi('Follow-ups due today', int(k.fu_due_today), k.fu_due_today ? 'Across the team' : 'None due', '') +
        crmKpi('Overdue follow-ups', int(k.fu_overdue), k.fu_overdue ? 'Past their due date' : 'None overdue', k.fu_overdue ? 'warn' : '') +
        crmKpi('Contacts this month', int(k.contacts_month), int(k.reached_month) + ' reached, ' + int(k.ordered_month) + ' had ordered') + '</div>';
    }
    // Customers needing attention: each line opens Follow-ups filtered to it
    var cnt = function (f) { return list.filter(f).length; };
    var rows = [
      ['late', 'Follow-ups overdue', cnt(function (x) { return x.kind === 'task' && x.task && x.task.overdue; }), 'Past their due date'],
      ['today', 'Follow-ups due today', cnt(function (x) { return x.kind === 'task' && x.task && !x.task.overdue && !x._later; }), 'Set by the team'],
      ['quote', 'Quotes waiting for a reply', (d.quotes || []).length, 'Quote sent, the customer has not answered'],
      ['occasion', 'Occasions coming up', (d.occasions || []).length, 'Birthday or anniversary in the next 30 days, nothing ordered yet' + (d.occasions_no_permission ? '. ' + d.occasions_no_permission + ' more have not agreed to hear from us' : '')],
      ['last_year', 'Ordered this time last year', (d.last_year || []).length, 'Nothing booked yet this year' + (d.last_year_no_permission ? '. ' + d.last_year_no_permission + ' more have not agreed to hear from us' : '')],
      ['lapsed', 'Regulars gone quiet', (d.lapsed || []).length, '3 or more cakes, none in the last 4 months']
    ];
    h += '<div class="ov-row crm-row"><section class="dx-card ov-att" aria-label="Customers needing attention"><div class="dx-card-h"><h2>Customers needing attention</h2><span>As of today</span></div>' + rows.map(function (x) {
      var on = x[2] > 0, inner = '<span class="ov-an' + (on ? ' is-on' : '') + '">' + int(x[2]) + '</span><span class="ov-at"><b>' + esc(x[1]) + '</b><span>' + esc(x[3]) + '</span></span>' + (on ? '<span class="ov-go" aria-hidden="true">View</span>' : '');
      return on ? '<button type="button" class="ov-arow" data-act="ws-crm-go" data-v="' + x[0] + '">' + inner + '</button>' : '<div class="ov-arow">' + inner + '</div>';
    }).join('') + '</section>';
    h += '<section class="dx-card ov-rec" aria-label="Recent customer activity"><div class="dx-card-h"><h2>Recent customer activity</h2><span>Latest first</span></div>' +
      ((d.recent || []).length ? d.recent.slice(0, 10).map(function (e) {
        return '<button type="button" class="ov-ev" data-act="open-customer" data-id="' + esc(e.customer_id) + '"><span class="ov-et"><b>' + esc(e.name || 'Customer') + '</b><span>' + esc(e.text + (e.by ? ' · ' + e.by : '')) + '</span></span><span class="ov-ew">' + esc(stamp(e.at)) + '</span></button>';
      }).join('') : '<p class="ccs-quiet">Nothing yet.</p>') + '</section></div>';
    if (k) h += '<details class="ccs-more crm-defs"><summary>How these figures are worked out</summary><dl class="ccs-kv">' +
      '<dt>Customers</dt><dd>Everyone with at least one order that was not cancelled, matched by mobile number.</dd>' +
      '<dt>New this month</dt><dd>Customers whose first order is due or collected this month.</dd>' +
      '<dt>Returning this month</dt><dd>Customers with a cake collected this month who had a cake collected before this month.</dd>' +
      '<dt>Repeat purchase rate</dt><dd>Customers with two or more collected cakes, out of all customers with at least one, all time.</dd>' +
      '<dt>Revenue from returning customers</dt><dd>Collected orders this month from customers who had a cake collected before that order.</dd>' +
      '<dt>Contacts</dt><dd>Contacts recorded in Follow-ups. Reached means the customer answered. A call with no answer is counted as an attempt, not as reached.</dd>' +
      '<dt>Occasions</dt><dd>Worked out from birthday and anniversary cakes ordered before. Only customers who agreed to hear from us are listed.</dd></dl>' +
      '<p class="ccs-hint">Orders from the Google Sheets stopped coming in after 12 October, so returning customers and this month\'s figures are lower than they should be until that is fixed.</p></details>';
    return h;
  }
  function crmFollow() {
    var c = S.crm, d = c.data, all = crmList(), f = c.f;
    var match = function (x) {
      return f === 'all' ? true : f === 'late' ? x.kind === 'task' && x.task && x.task.overdue : f === 'today' ? x.kind === 'task' && !x._later && !(x.task && x.task.overdue) : x.kind === f;
    };
    var now_ = all.filter(function (x) { return !x._later; }), later = all.filter(function (x) { return x._later; });
    var shown = now_.filter(match), soon = f === 'all' ? later : [];
    var n = now_.length;
    var h = '<div class="crm-fhead"><h2 class="crm-big">' + (n ? 'You have ' + n + (n === 1 ? ' customer' : ' customers') + ' to follow up today' : 'All caught up') + '</h2>' +
      (d.is_manager ? '<button type="button" class="ccs-link" data-act="ws-crm-all">' + (c.all ? 'Show only mine' : 'Show everyone\'s follow-ups') + '</button>' : '') + '</div>';
    if (!n && !later.length) return h + '<p class="ccs-quiet">Nobody needs contacting right now. New follow-ups appear here when a quote is waiting, an occasion is coming up, or the team sets one.</p>';
    var chips = [['all', 'All'], ['late', 'Overdue'], ['today', 'Due today'], ['quote', 'Quotes'], ['occasion', 'Occasions'], ['last_year', 'Last year'], ['lapsed', 'Regulars']].map(function (x) {
      var k = x[0] === 'all' ? n : now_.filter(function (y) { return x[0] === 'late' ? y.kind === 'task' && y.task && y.task.overdue : x[0] === 'today' ? y.kind === 'task' && !(y.task && y.task.overdue) : y.kind === x[0]; }).length;
      return k || x[0] === 'all' || x[0] === f ? '<button type="button" class="ccs-chip" data-act="ws-crm-f" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + ' <span class="ccs-n">' + k + '</span></button>' : '';
    }).join('');
    h += '<p class="crm-note">Call, WhatsApp and Email only open your phone or email, and nothing is sent by the system. After each contact, tap What happened? so it is recorded.</p>';
    h += '<div class="ccs-chips crm-chips" role="group" aria-label="Show">' + chips + '</div>';
    h += '<div class="crm-cards">' + (shown.length ? shown.map(crmCard).join('') : '<p class="ccs-quiet">None in this group.</p>') + '</div>';
    if (soon.length) h += '<h3 class="crm-h3">Coming up in the next 7 days</h3><div class="crm-cards">' + soon.map(crmCard).join('') + '</div>';
    return h;
  }
  function crmFirst(name) { return String(name || '').trim().split(/\s+/)[0] || 'there'; }
  function crmWaText(x) {
    var hi = 'Bula ' + crmFirst(x.name) + ', it is Corner Café. ';
    if (x.kind === 'quote') return hi + 'Just checking you received our quote for ' + (x.order_ref || 'your cake') + '. Happy to answer any questions or adjust it for you.';
    if (x.kind === 'occasion') return hi + 'We remember your ' + String(x.reason || 'celebration').replace(/ \(".*?"\)/, '').replace(/ on .*$/, '').toLowerCase() + ' is coming up. Would you like us to make the cake again?';
    if (x.kind === 'last_year') return hi + 'You ordered a cake with us around this time last year. If there is a celebration coming up again, we would love to make it.';
    if (x.kind === 'lapsed') return hi + 'It has been a while. If you have a celebration coming up, we would love to make the cake.';
    return hi;
  }
  function crmCard(x) {
    var c = S.crm, open = c.open === x._k, sales = ['occasion', 'last_year', 'lapsed'].indexOf(x.kind) > -1;
    var pri = { high: 'High priority', normal: 'Normal priority', low: 'Low priority' }[x.pri] || '';
    var last = x.cake ? 'Last bought: ' + x.cake + (x.last_value != null ? ', ' + money(x.last_value) : '') + (x.last_date ? ', ' + nice(x.last_date) + ' ' + x.last_date.slice(0, 4) : '') : (x.orders ? '' : 'No cake collected yet');
    var perm = sales ? [x.wa && 'WhatsApp', x.sms && 'SMS', x.em && 'email', x.call && 'phone calls'].filter(Boolean) : [];
    var h = '<article class="crm-card' + (x.pri === 'high' ? ' is-high' : '') + (x._later ? ' is-later' : '') + '"><div class="crm-ctop"><div class="crm-who"><button type="button" class="crm-name" data-act="open-customer" data-id="' + esc(x.id) + '">' + esc(x.name || 'Customer') + '</button>' +
      '<span class="crm-meta">' + esc(custNo(x.no) + (x.orders ? ' · ' + x.orders + (x.orders === 1 ? ' cake' : ' cakes') + ', ' + money(x.spend) : '')) + '</span></div><span class="crm-kind">' + esc(CRM_KIND[x.kind] || '') + '</span></div>' +
      '<p class="crm-reason">' + esc(x.reason || '') + (x.order_ref && x.kind === 'task' ? ' · <button type="button" class="ccs-link" data-act="open-order" data-id="' + esc(x.order_id) + '">' + esc(x.order_ref) + '</button>' : '') + '</p>' +
      '<p class="crm-pri"><b>' + esc(pri) + '</b>' + (x.why ? ': ' + esc(x.why) : '') + '</p>' +
      (last ? '<p class="crm-last">' + esc(last) + '</p>' : '') +
      (sales ? '<p class="crm-perm">' + (perm.length ? 'Agreed to hear from us by ' + esc(perm.join(', ')) + '.' : '') + '</p>' : '') +
      (x.kind === 'quote' ? '<p class="crm-last">Quote ' + esc(x.order_ref) + (x.quote_value != null ? ', ' + money(x.quote_value) : '') + ' · <button type="button" class="ccs-link" data-act="open-order" data-id="' + esc(x.order_id) + '">Open the order</button></p>' : '');
    var tel = x.phone ? '<a class="ccs-btn ccs-ghost crm-btn" href="tel:' + esc(digits(x.phone)) + '">Call</a><a class="ccs-btn ccs-ghost crm-btn" href="' + esc(waLink(x.phone) + '?text=' + encodeURIComponent(crmWaText(x))) + '" target="_blank" rel="noopener">WhatsApp</a>' : '';
    var em = x.email ? '<a class="ccs-btn ccs-ghost crm-btn" href="mailto:' + esc(x.email) + '">Email</a>' : '';
    if (!open) return h + '<div class="crm-acts">' + tel + em + '<button type="button" class="ccs-btn crm-btn" data-act="ws-crm-open" data-v="' + esc(x._k) + '">What happened?</button><button type="button" class="ccs-btn ccs-ghost crm-btn" data-act="ws-crm-later" data-v="' + esc(x._k) + '">Remind me later</button></div></article>';
    return h + crmRecord(x) + '</article>';
  }
  function crmRecord(x) {
    var r = S.crm.rec || {}, chip = function (key, list, cur) { return '<div class="ccs-chips crm-big-chips" role="group">' + list.map(function (o) { return '<button type="button" class="ccs-chip" data-act="ws-crm-set" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    if (r.mode === 'later') return '<div class="ccs-panel crm-rec"><p class="crm-q">When should we remind you?</p>' + chip('next', CRM_NEXT.filter(function (o) { return o[0] !== '14'; }), r.next) +
      (r.next === 'other' ? '<input class="ccs-input crm-date" id="crm-date" type="date" min="' + today() + '" max="' + addDays(today(), 400) + '" value="' + esc(r.date || '') + '">' : '') +
      (r.err ? '<p class="ccs-err" role="alert">' + esc(r.err) + '</p>' : '') +
      '<div class="crm-acts"><button type="button" class="ccs-btn crm-btn" data-act="ws-crm-save" data-v="' + esc(x._k) + '">Save reminder</button><button type="button" class="ccs-btn ccs-ghost crm-btn" data-act="ws-crm-close">Back</button></div></div>';
    var needNext = ['interested', 'quote', 'later', 'no_answer', 'left_message'].indexOf(r.out) > -1;
    return '<div class="ccs-panel crm-rec"><p class="crm-q">How did you contact them?</p>' + chip('ch', CRM_CH, r.ch) +
      '<p class="crm-q">What happened?</p>' + chip('out', CRM_OUT, r.out) +
      (needNext ? '<p class="crm-q">' + (r.out === 'no_answer' || r.out === 'left_message' ? 'When should we try again?' : 'When should we follow up next?') + '</p>' + chip('next', CRM_NEXT, r.next) +
        (r.next === 'other' ? '<input class="ccs-input crm-date" id="crm-date" type="date" min="' + today() + '" max="' + addDays(today(), 400) + '" value="' + esc(r.date || '') + '">' : '') : '') +
      (r.out === 'not_interested' && x.kind === 'quote' ? '<p class="ccs-hint">If they do not want the cake, also decline the quote on the order so it leaves the kitchen list.</p>' : '') +
      '<label class="ccs-label" for="crm-note">Note (optional)</label><textarea class="ccs-input crm-ta" id="crm-note" maxlength="1000" placeholder="For example: wants a 2 kg chocolate cake for 40 people">' + esc(r.note || '') + '</textarea>' +
      (r.err ? '<p class="ccs-err" role="alert">' + esc(r.err) + '</p>' : '') +
      '<div class="crm-acts"><button type="button" class="ccs-btn crm-btn" data-act="ws-crm-save" data-v="' + esc(x._k) + '">Save</button><button type="button" class="ccs-btn ccs-ghost crm-btn" data-act="ws-crm-close">Back</button></div></div>';
  }
  function crmNextDate(r) { if (!r.next) return null; if (r.next === 'other') return r.date || null; return addDays(today(), +r.next); }
  function crmKeep() { var r = S.crm.rec; if (!r) return; var n = document.getElementById('crm-note'); if (n) r.note = n.value; var dt = document.getElementById('crm-date'); if (dt) r.date = dt.value; }
  function crmFind(k) { return crmList().filter(function (x) { return x._k === k; })[0]; }
  function crmAct(a, b, v) {
    var c = S.crm;
    if (a === 'ws-crm-reload') { c.err = null; c.at = 0; crmLoad(true); view(); return; }
    if (a === 'ws-crm-all') { c.all = !c.all; c.at = 0; crmLoad(true); return; }
    if (a === 'ws-crm-go') { c.f = v; c.open = null; secStore('crm').crm = 'fu'; view(); return; }
    if (a === 'ws-crm-f') { c.f = v; c.open = null; view(); return; }
    if (a === 'ws-crm-close') { c.open = null; c.rec = null; view(); return; }
    if (a === 'ws-crm-open' || a === 'ws-crm-later') {
      var x0 = crmFind(v); if (!x0) return;
      c.open = v; c.rec = a === 'ws-crm-later' ? { mode: 'later', next: '3', idem: uuid() } : { mode: 'rec', ch: x0.pref === 'email' ? 'email' : x0.pref === 'call' ? 'phone' : x0.pref === 'whatsapp' ? 'whatsapp' : 'phone', out: null, next: null, idem: uuid() };
      view(); return;
    }
    if (a === 'ws-crm-set') {
      crmKeep(); var r = c.rec; if (!r) return; r[b.dataset.k] = v; r.err = null;
      if (b.dataset.k === 'out') r.next = v === 'no_answer' || v === 'left_message' ? '1' : v === 'quote' ? '1' : v === 'interested' ? '3' : v === 'later' ? '14' : null;
      view(); if (v === 'other') { var dt = document.getElementById('crm-date'); if (dt) dt.focus(); } return;
    }
    if (a === 'ws-crm-save') {
      crmKeep(); var x = crmFind(v), rr = c.rec; if (!x || !rr) return;
      var due = crmNextDate(rr);
      if (rr.mode === 'later') {
        if (!due) { rr.err = 'Choose the date.'; view(); return; }
        markBusy(b, 'Saving…');
        var p = x.kind === 'task' && x.task
          ? sb.rpc('customer_task_update', { p_task: x.task.id, p_version: x.task.version, p_action: 'edit', p_due: due, p_assignee: x.task.assigned_to || null, p_outcome: null })
          : sb.rpc('customer_task_add', { p_customer: x.id, p_title: String(x.reason || 'Follow up').slice(0, 200), p_due: due, p_assignee: S.me && S.me.user_id, p_order: x.order_id || null, p_note: null, p_idem: rr.idem });
        p.then(function (res) {
          clearBusy(); if (res.error) throw res.error;
          if (!res.data.ok) { rr.err = res.data.message; view(); return; }
          toast('Reminder set for ' + nice(due)); c.open = null; c.rec = null; c.at = 0; crmLoad(true); fuStale();
        }).catch(function (e) { clearBusy(); fail(e); });
        return;
      }
      if (!rr.ch) { rr.err = 'Choose how you contacted them.'; view(); return; }
      if (!rr.out) { rr.err = 'Choose what happened.'; view(); return; }
      if (['interested', 'quote', 'later'].indexOf(rr.out) > -1 && !due) { rr.err = 'Choose when to follow up next.'; view(); return; }
      markBusy(b, 'Saving…');
      sb.rpc('crm_record_contact', { p_customer: x.id, p_kind: x.kind, p_reason: String(x.reason || '').slice(0, 200), p_channel: rr.ch, p_outcome: rr.out, p_note: (rr.note || '').trim() || null,
        p_task: x.task ? x.task.id : null, p_task_version: x.task ? x.task.version : null, p_order: x.order_id || null, p_next_due: due, p_next_title: null, p_idem: rr.idem }).then(function (res) {
        clearBusy(); if (res.error) throw res.error;
        if (!res.data.ok) { rr.err = res.data.message; if (res.data.error === 'changed') { c.at = 0; crmLoad(true); } view(); return; }
        toast(res.data.message || 'Saved'); c.open = null; c.rec = null; c.at = 0; crmLoad(true); fuStale();
      }).catch(function (e) { clearBusy(); fail(e); });
    }
  }
