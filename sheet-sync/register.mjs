// Turns one raw Google Sheet row into a Master Cake Register record.
// Builds on parseRow (the shared order parser). It never guesses: anything it cannot read is left empty and flagged.
// Shared by the Supabase sync function and the local first load. Plain JavaScript, no dependencies.

import { parseRow, toDate, phoneKey } from './parse.mjs';

const clean = (v) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})/;
const MONEY_RE = /^\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)$/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// Trailing empty cells are dropped so the stored copy is compact; nothing else is changed.
export function trimRaw(raw) {
  const r = (raw || []).map((v) => (v == null ? '' : String(v)));
  let n = r.length; while (n > 0 && !r[n - 1].trim()) n--;
  return r.slice(0, n);
}

export function registerRow(sheet, rowNumber, raw) {
  const w = sheet === 'walkin';
  const r = trimRaw(raw).map(clean);
  const p = parseRow(sheet, rowNumber, raw);
  const warnings = [], flags = [];

  // Submission or entry timestamp: the first cell that looks like 2026-07-21 2:38:02
  let stampIdx = -1;
  for (let i = 20; i < r.length; i++) if (STAMP_RE.test(r[i])) { stampIdx = i; break; }
  const stamp = p.submitted_at;

  // Order date. Walk-in: the date staff typed (month/day/year). Online: the form submission time.
  let orderDate = null, orderBasis = null;
  if (w) {
    const v = r[33] || '';
    const m = v.match(US_DATE_RE);
    if (m) { orderDate = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; orderBasis = 'Date taken by staff'; }
    else if (toDate(v)) { orderDate = toDate(v); orderBasis = 'Date taken by staff'; }
    if (orderDate && isNaN(Date.parse(orderDate + 'T00:00:00Z'))) orderDate = null;
    if (!orderDate && stamp) { orderDate = stamp.slice(0, 10); orderBasis = 'Sheet entry time'; warnings.push('Order date is when the row was typed into the sheet, not when the order was taken'); }
  } else if (stamp) { orderDate = stamp.slice(0, 10); orderBasis = 'Form submission time'; }

  // Online sheet status and confirmed amount, wherever the columns landed. Column AL (index 37) is a sheet-wide total and is ignored.
  let statusNote = '', confirmed = null, cancelled = false;
  if (!w && stampIdx > -1) {
    let money = null;
    for (let i = stampIdx + 1; i < r.length; i++) {
      if (i === 37) continue;
      const v = r[i]; if (!v) continue;
      const m = v.match(MONEY_RE);
      if (m) { if (money == null) money = +m[1].replace(/,/g, ''); continue; }
      if (/cancel/i.test(v)) { cancelled = true; statusNote = v; continue; }
      if (/^(confirmed|pending|quoted|enquiry)/i.test(v)) statusNote = v;
    }
    if (/^confirmed/i.test(statusNote) && money != null) confirmed = money;
  }
  let status = 'received';
  if (cancelled) status = 'cancelled';
  else if (/^confirmed/i.test(statusNote)) status = 'confirmed';
  else if (/^(quoted|enquiry)/i.test(statusNote)) status = 'not_confirmed';

  // Fulfilment dates: more than one different date in the date columns is a conflict
  const dates = new Set();
  for (let i = 26; i <= 31; i++) { const d = toDate(r[i] || ''); if (d) dates.add(d); }
  if (!p.date) flags.push('no_fulfilment_date');
  if (dates.size > 1) flags.push('conflicting_dates');
  if (orderDate && p.date && orderDate > p.date && orderBasis !== 'Sheet entry time') flags.push('order_after_fulfilment');

  // Looks like a test entry
  const text = r.join(' ');
  if (/\btest\b/i.test(text)) flags.push('possible_test');

  const custom = p.finish === 'custom';
  if (!p.price) warnings.push(custom ? 'Custom cake: no price recorded' : 'No price recorded');
  if (!p.size_inch) warnings.push('Size not clear');
  if (p.customer.phone_key.length < 7) warnings.push('No usable phone number, so duplicates cannot be checked by phone');
  if (/No time given/.test(p.internal_notes)) warnings.push('No pickup time');

  // Content fingerprint without timestamps, used to spot rows typed in twice
  const content = r.filter((v) => !STAMP_RE.test(v)).join('|').toLowerCase();

  return {
    key: `${sheet}|${stamp || 'row' + rowNumber}`,
    import_key: p.import_key,
    sheet, row: rowNumber,
    raw: trimRaw(raw),
    p: {
      od: orderDate, odb: orderBasis,
      fd: p.date, ft: /No time given/.test(p.internal_notes) ? null : p.time, m: p.method,
      n: p.customer.name, pk: p.customer.phone_key, ph: p.customer.phone, e: p.customer.email,
      pc: p.product_code, v: p.variant, cl: p.cake_label, cu: custom,
      sz: p.size_inch || null, q: 1, lp: p.price || null, cv: confirmed,
      st: status, sn: statusNote || null, staff: w ? (r[0] || null) : null,
      ins: p.message, notes: p.customer_notes,
      dh: hash(sheet + '|' + content), flags, warnings,
    },
  };
}
