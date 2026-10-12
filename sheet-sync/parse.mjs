// Turns one raw Google Sheet row into a clean cake order for the staff app.
// Shared by the Supabase sync function and the local first import. Plain JavaScript, no dependencies.
// Sheets: 'online' = "Corner Café – Online Cake Orders", 'walkin' = "Corner Café – Walk-In Cake Orders – Staff Use".

const CAKES = {
  'cheesecake': ['cheesecake', null], 'cheese cake': ['cheesecake', null],
  'red velvet': ['red-velvet', null], 'strawberry': ['strawberry', null],
  'vanilla': ['vanilla-pina-colada', 'Vanilla'], 'pinacolada': ['vanilla-pina-colada', 'Piña Colada'],
  'pina colada': ['vanilla-pina-colada', 'Piña Colada'], 'piña colada': ['vanilla-pina-colada', 'Piña Colada'],
  'chocolate': ['chocolate-mudcake-mocha', 'Chocolate'], 'mudcake': ['chocolate-mudcake-mocha', 'Mudcake'],
  'mud cake': ['chocolate-mudcake-mocha', 'Mudcake'], 'mocha': ['chocolate-mudcake-mocha', 'Mocha'],
  'black forest': ['black-white-forest', 'Black Forest'], 'white forest': ['black-white-forest', 'White Forest'],
};
const DATE_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm])?$/;
const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})/;

const clean = (v) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();

function toDate(s) {
  s = clean(s); let m = s.match(DATE_RE);
  if (m) {
    let [, d, mo, y] = m; if (y.length === 2) y = '20' + y;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return isNaN(Date.parse(iso + 'T00:00:00Z')) ? null : iso;
  }
  m = s.match(ISO_DATE_RE); return m ? s : null;
}
function toTime(s) {
  s = clean(s); const m = s.match(TIME_RE); if (!m) return null;
  let h = +m[1]; const min = +m[2]; const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
function phoneKey(p) {
  const d = clean(p).replace(/[^0-9]/g, '');
  if (/^[0-9]{7}$/.test(d)) return '679' + d;
  if (/^0[0-9]{7}$/.test(d)) return '679' + d.slice(1);
  return d;
}

function parseRow(sheet, rowNumber, raw) {
  const r = (raw || []).map(clean);
  const w = sheet === 'walkin';
  const o = w ? 1 : 0;
  const first = r[o], last = r[o + 1];
  const name = clean(`${first || ''} ${last || ''}`);
  const email = r[o + 2] || '', phone = r[o + 3] || '';
  const address = [r[o + 4], r[o + 5]].filter(Boolean).join(', ');
  const cakeType = r[o + 6] || '';
  const staffMember = w ? (r[0] || '') : '';

  // From column 9 onwards both sheets share one layout. Some older online rows sit one column to the left,
  // so find the shift from where the Pickup/Delivery answer or the dietary answer landed.
  let sh = 0;
  const fIdx = [26, 25, 27].find((i) => /^(pick ?up|delivery)$/i.test(r[i] || ''));
  if (fIdx != null) sh = fIdx - 26;
  else { const dIdx = [22, 21, 23].find((i) => /no specific|vegetarian|vegan|gluten|nut|halal/i.test(r[i] || '')); if (dIdx != null) sh = dIdx - 22; }
  const at = (i) => r[i + sh] || '';
  const designText = at(8);
  let sizeInch = null, price = null; const sizeBits = [];
  for (let i = 9; i <= 21; i++) {
    const v = at(i); if (!v) continue; sizeBits.push(v);
    const p = v.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/); if (p && price == null) price = +p[1];
  }
  const sizeText = sizeBits.join('. ');
  const nums = [...sizeText.matchAll(/(\d{1,2})\s*(?:"|”|''|-?inch|in\b)/gi)].map((m) => +m[1]);
  if (new Set(nums).size === 1) sizeInch = nums[0];
  const dietaryRaw = at(22), extras = at(23), inscription = at(24), picture = at(25);

  // Fulfilment, date and time: found by pattern, because older rows were written into shifted columns
  let method = 'collection', date = null, time = null, deliveryPlace = '';
  for (let i = 26; i <= 31; i++) {
    const v = at(i); if (!v) continue;
    if (/^delivery$/i.test(v)) method = 'delivery';
    else if (/^pick ?up$/i.test(v)) method = 'collection';
    else if (!date && toDate(v)) date = toDate(v);
    else if (!time && toTime(v)) time = toTime(v);
  }
  const place = at(31);
  if (method === 'delivery' && place && !toDate(place) && !toTime(place)) deliveryPlace = place;

  // Notes, timestamp, consent and the online sheet's revenue columns
  let stamp = null; const notes = []; let consent = false;
  const lastCol = w ? 35 : 34;
  for (let i = 32 + sh; i <= lastCol; i++) {
    const v = r[i]; if (!v) continue;
    if (!w && i >= 35) continue;
    const m = v.match(STAMP_RE);
    if (m) { if (!stamp) stamp = `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, '0')}:${m[5]}:${m[6]}Z`; continue; }
    if (w && i === 34) { consent = /^(yes|y|true|opted in)/i.test(v); continue; }
    if (w && i === 33 && toDate(v)) continue;
    notes.push(v);
  }
  let revenue = null, revenueStatus = '';
  if (!w) {
    for (let i = 29; i < r.length; i++) {
      const v = r[i]; if (!v || i === 31 + sh || i < 32 + sh) continue;
      if (/cancel/i.test(v) && v.length < 40) revenueStatus = 'Cancelled';
      if (i >= 35 && /^(confirmed|pending|quoted|enquiry)/i.test(v)) revenueStatus = v;
      if (i === 35 && /^\$?\s*[0-9]/.test(v)) revenue = +v.replace(/[^0-9.]/g, '');
    }
  }

  // Cake
  const custom = /custom/i.test(cakeType);
  const map = CAKES[cakeType.toLowerCase()] || null;
  const dietNo = !dietaryRaw || /no specific/i.test(dietaryRaw) && !/gluten|vegan|vegetarian|nut|egg|dairy|halal/i.test(dietaryRaw);
  const diet = [];
  if (/vegetarian|eggless|vegan/i.test(dietaryRaw)) diet.push('Vegetarian (eggless)');
  if (/gluten/i.test(dietaryRaw)) diet.push('Gluten-free');
  if (/nut/i.test(dietaryRaw)) diet.push('Nut allergy');

  let status = 'awaiting_review';
  if (custom) status = 'awaiting_quote';
  if (/^confirmed/i.test(revenueStatus)) status = 'confirmed';
  if (revenueStatus === 'Cancelled') status = 'cancelled';

  const problems = [];
  if (!date) problems.push('no due date');
  if (phoneKey(phone).length < 7) problems.push('no usable phone number');

  const kitchen = [];
  if (extras) kitchen.push(`Extras: ${extras}`);
  if (picture) kitchen.push(`Reference picture: ${picture}`);
  if (sizeText && (!sizeInch || custom)) kitchen.push(`Size requested: ${sizeText}`);
  if (inscription && inscription.length > 60) kitchen.push(`Full inscription: ${inscription}`);

  const internal = [`Imported from Google Sheet (${w ? 'walk-in' : 'online'} orders), row ${rowNumber}.`];
  if (staffMember) internal.push(`Order taken by ${staffMember}.`);
  if (!time) internal.push('No time given in the sheet; set to 12:00 pm. Check with the customer.');
  if (revenueStatus) internal.push(`Sheet status: ${revenueStatus}${revenue != null ? `, $${revenue}` : ''}.`);

  const key = `${sheet}|${stamp || 'row' + rowNumber}|${phoneKey(phone)}`;
  return {
    ok: problems.length === 0, problems, import_key: key, sheet, row: rowNumber,
    source: w ? 'walk_in' : 'online', submitted_at: stamp, status,
    customer: { name: name || 'Guest', phone, phone_key: phoneKey(phone), email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email.toLowerCase() : null, address, opt_in: consent },
    product_code: map ? map[0] : null, variant: map ? map[1] : null, cake_label: cakeType || 'Cake',
    finish: custom ? 'custom' : 'standard', size_inch: sizeInch || 0, price: price != null ? price : 0,
    final_total: status === 'confirmed' && revenue != null ? revenue : null,
    design: designText || (custom ? 'Custom cake request. See notes.' : null),
    message: inscription ? inscription.slice(0, 60) : null,
    has_dietary: !dietNo, dietary: diet, dietary_note: dietNo ? null : dietaryRaw,
    date, time: time || '12:00', method, delivery_address: method === 'delivery' ? (deliveryPlace || address || null) : null,
    customer_notes: notes.join('\n\n') || null, kitchen_notes: kitchen.join('\n') || null, internal_notes: internal.join(' '),
  };
}

export { parseRow, toDate, toTime, phoneKey };
