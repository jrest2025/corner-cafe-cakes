
  // ---------- customer workspace: notes, enquiries, feedback, follow-ups (CRM step 3) ----------
  var WS_KIND = { note: 'Note', enquiry: 'Enquiry', feedback: 'Feedback' };
  var WS_TONE = { positive: 'Happy', neutral: 'Mixed', negative: 'Complaint' };
  var WS_CHANNEL = [['', 'Not recorded'], ['in_person', 'In person'], ['phone', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['social', 'Social media'], ['other', 'Other']];
  var WS_TASK = { open: 'To do', in_progress: 'Started', done: 'Done', cancelled: 'No longer needed' };
  var WS_DUE = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['3', 'In 3 days'], ['7', 'Next week'], ['other', 'Other date']];
  var WS_HINT = 'Internal only. Never shown to the customer, in emails or on kitchen briefs. Keep it factual. No card numbers, passwords or health details. Allergies go on the order.';

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
    var s = S.sheet, id = b.dataset.id;
    if (a === 'ws-open') { var tab = b.dataset.tab || 'notes'; openCustomer(id).then(function () { if (S.sheet && S.sheet.id === id) { S.sheet.tab = tab; renderSheet(); } }); if (S.sheet) S.sheet.tab = tab; return; }
    if (a === 'ws-fu-all') { S.fu.all = !S.fu.all; S.fu.at = 0; fuLoad(); return; }
    if (a === 'ws-fu-reload') { S.fu.at = 0; fuLoad(); return; }
    if (!s || s.type !== 'customer') return;
    if (a === 'ws-tab') { if (s.edit && hasTyping()) { toast('Save or cancel the customer changes first.', true); return; } s.tab = v; s.edit = s.edit && v === 'overview'; renderSheet(); var bd = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (bd) bd.scrollTop = 0; return; }
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
      sb.rpc('customer_note_history', { p_note: id }).then(function (r) { if (r.error) throw r.error; if (S.sheet === s && s.wsHist && s.wsHist.id === id) { s.wsHist.data = r.data; renderSheet(); } }).catch(fail);
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
      '<p class="ccs-quiet">Nothing due this week' + (S.fu.all ? '' : ' for you') + '. Add follow-ups from a customer\'s Notes and follow-ups tab.</p>') + '</section>';
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
    var c = clState(); c.loaded = false; c.err = null; view();
    if (!c.groups) clGroupsLoad();
    return sb.rpc('customer_filter', { p_filter: clFilter(), p_limit: 500 }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) { c.rows = []; c.count = 0; c.err = r.data.message; } else { c.rows = r.data.rows || []; c.count = r.data.count; }
      c.loaded = true; if (S.tab === 'customers') view();
    }).catch(fail);
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
      (mayExport && c.loaded && c.count ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-panel" data-v="export">Export</button>' : '') +
      (can('manager') ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="ws-cm-dups">Possible duplicates</button>' : '') +
      '</span></div>';
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
    }).catch(fail);
  }

  // Duplicate review (managers)
  function clDupsLoad() {
    var c = clState(); c.dups = null; c.dupErr = null; view();
    return sb.rpc('customer_duplicates').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) c.dupErr = r.data.message; else c.dups = r.data;
      if (S.tab === 'customers') view();
    }).catch(fail);
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
    }).catch(fail);
  }
  function clFindPair(key) { var c = clState(); return ((c.dups && c.dups.pairs) || []).filter(function (p) { return clPairKey(p) === key; })[0]; }
  function clDupsView() {
    var c = clState(), d = c.dups;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Possible duplicate customers</h1><p class="ccs-sub">Profiles that share a mobile number, email or name. Check before merging: families and offices often share a number.</p></div>' +
      '<div class="ccs-headacts"><button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-list">Back to customers</button></div></div>';
    if (c.dupErr) return h + '<div class="ccs-empty"><b>' + esc(c.dupErr) + '</b></div>';
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
