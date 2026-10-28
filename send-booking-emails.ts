// Sends queued Kazumi booking emails, floor and kitchen run sheets via Resend.
// Safe to call publicly: it only ever sends items already queued by the database.
// Resend key: an Edge Function secret named RESEND_API_KEY is used first; otherwise the Vault secret resend_api_key.
// Services: teppanyaki (sittings at the grill), dining (lunch and dinner tables), event (group or event enquiry).
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ENV_KEY = (Deno.env.get('RESEND_API_KEY') ?? '').trim();

type Kind = 'staff_alert' | 'guest_confirmation' | 'guest_reminder' | 'guest_cancelled' | 'staff_cancelled' | 'guest_confirmed' | 'guest_declined';
type Service = 'teppanyaki' | 'dining' | 'event';
type Row = {
  outbox_id: string; kind: Kind; to_email: string; attempts: number;
  reference: string; reservation_date: string; session_label: string; window_label: string;
  adults: number; children: number; party_size: number; full_name: string; phone: string; email: string;
  location: string | null; occasion: string | null; dietary: string | null; requests: string | null;
  status: string; is_test: boolean; from_email: string; guest_reply_to: string; resend_api_key: string;
  id?: string; allergens?: string[]; table_codes?: string[] | null; manage_token?: string | null; decline_reason?: string | null;
  service?: Service; seating_pref?: string | null; session_time?: string;
  diet_prefs?: string[]; celebrant?: string | null; plate_message?: string | null; own_cake?: boolean; high_chairs?: number; wheelchair?: boolean; late_cancel?: boolean;
};
type Party = {
  reference: string; name: string; size: number; adults: number; children: number; status: string;
  occasion: string | null; allergens: string[]; dietary: string | null; requests: string | null; phone: string; tables: string[];
  session_time?: string; time_label?: string; seating_pref?: string | null; staff_notes?: string | null; service?: string;
  diet_prefs?: string[]; celebrant?: string | null; plate_message?: string | null; own_cake?: boolean; high_chairs?: number; wheelchair?: boolean;
  visits?: number; no_shows?: number; vip?: boolean; guest_note?: string | null; past_allergens?: string[]; location?: string | null; arrived_at?: string | null; is_test?: boolean;
  split?: Record<string, number> | null;
};
type SheetTable = { code: string; name?: string; seats: number; booked: number; parties: Party[] };
type Sess = {
  session_time: string; label: string; window_label: string; seats_total: number; seats_booked: number;
  party_count: number; tables: SheetTable[]; unassigned: Party[];
};
type Sheet = { date: string; sessions: Sess[]; dining?: Party[]; events?: Party[]; dining_capacity?: number };

const sbHeaders = { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: sbHeaders, body: JSON.stringify(args) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function extras(reference: string) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/teppanyaki_reservations?reference=eq.${encodeURIComponent(reference)}&select=id,allergens,table_codes,manage_token,decline_reason,service,seating_pref,session_time,diet_prefs,celebrant,plate_message,own_cake,high_chairs,wheelchair,late_cancel`, { headers: sbHeaders });
    const rows = await res.json();
    const x = rows?.[0] ?? {};
    return {
      id: x.id ?? undefined,
      allergens: x.allergens ?? [], table_codes: x.table_codes ?? null, manage_token: x.manage_token ?? null,
      decline_reason: x.decline_reason ?? null, service: (x.service ?? 'teppanyaki') as Service, seating_pref: x.seating_pref ?? null,
      session_time: x.session_time ?? '',
      diet_prefs: x.diet_prefs ?? [], celebrant: x.celebrant ?? null, plate_message: x.plate_message ?? null,
      own_cake: !!x.own_cake, high_chairs: x.high_chairs ?? 0, wheelchair: !!x.wheelchair, late_cancel: !!x.late_cancel,
    };
  } catch {
    return { allergens: [], table_codes: null, manage_token: null, decline_reason: null, service: 'teppanyaki' as Service, seating_pref: null, session_time: '' };
  }
}

let MANAGE_URL = '', STAFF_URL = '';
async function manageUrl() {
  if (MANAGE_URL) return MANAGE_URL;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reservation_settings?select=manage_url,staff_url&limit=1`, { headers: sbHeaders });
    const rows = await res.json();
    MANAGE_URL = rows?.[0]?.manage_url ?? '';
    STAFF_URL = rows?.[0]?.staff_url ?? '';
  } catch { MANAGE_URL = ''; }
  return MANAGE_URL;
}
// "Review booking" goes to /staff-review, which keeps the booking id in the browser tab (the staff page password step drops the address query)
// and forwards to the staff app, which opens the booking. Nothing changes until a signed-in staff member taps Confirm or Decline there.
const reviewUrl = (r: Row) => { if (!STAFF_URL || !r.id) return ''; try { return new URL('/staff-review?review=' + encodeURIComponent(r.id), STAFF_URL).toString(); } catch { return ''; } };
const reviewButton = (href: string, label: string) => href
  ? `<p style="margin:0 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:14px 22px;background:#211a16;border:1px solid #211a16;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.04em">${esc(label)}</a><br><span style="display:inline-block;margin-top:8px;font-size:12px;color:#6f6258">Opens the staff app. Sign in if asked, then tap Confirm or Decline.</span></p>`
  : '';

let TABLE_NAMES: Record<string, string> | null = null;
async function tableNames() {
  if (TABLE_NAMES) return TABLE_NAMES;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/teppanyaki_tables?select=table_code,name`, { headers: sbHeaders });
    const rows = await res.json();
    TABLE_NAMES = Object.fromEntries((rows ?? []).map((t: { table_code: string; name: string | null }) => [t.table_code, t.name || t.table_code]));
  } catch { TABLE_NAMES = {}; }
  return TABLE_NAMES!;
}

type Recips = { to: string[]; cc: string[] };
let SETTINGS: any = null;
async function settings() {
  if (SETTINGS) return SETTINGS;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reservation_settings?select=alert_email,alert_cc,run_sheet_email,run_sheet_cc,kitchen_email,kitchen_cc,restaurant_name,address,phone,website,hold_minutes,cancel_notice_tep_hours,cancel_notice_dining_hours,cancel_notice_event_hours&limit=1`, { headers: sbHeaders });
    SETTINGS = (await res.json())?.[0] ?? {};
  } catch { SETTINGS = {}; }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/kz_email_wording?select=key,subject,message`, { headers: sbHeaders });
    const rows = res.ok ? await res.json() : [];
    WORDING = {};
    for (const w of Array.isArray(rows) ? rows : []) WORDING[w.key] = { subject: w.subject ?? null, message: w.message ?? null };
  } catch { WORDING = {}; }
  return SETTINGS;
}
// 4 Nov 2026: guest email wording edited in Settings > Emails and alerts > Guest email wording (kz_email_wording).
// Only what an admin changed is stored; everything else keeps the wording written below. {tokens} are filled in per booking.
let WORDING: Record<string, { subject: string | null; message: string | null }> = {};
const split = (v: unknown) => String(v ?? '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
async function recips(kind: 'alert' | 'run_sheet' | 'kitchen'): Promise<Recips> {
  const st = await settings();
  const to = kind === 'kitchen' ? split(st.kitchen_email) : kind === 'run_sheet' ? split(st.run_sheet_email || st.alert_email) : split(st.alert_email);
  const ccRaw: string[] = (kind === 'kitchen' ? st.kitchen_cc : kind === 'run_sheet' ? st.run_sheet_cc : st.alert_cc) ?? [];
  const cc = [...new Set(ccRaw.flatMap(split))].filter((x) => !to.includes(x));
  return { to, cc };
}
async function hashKey(prefix: string, text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return prefix + Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const NIL = /^(none|no|nil|n\/?a|nothing|-+|\.)$/i;
const clean = (v: string | null | undefined) => (v && !NIL.test(v.trim()) ? v.trim() : null);
const extrasText = (p: { diet_prefs?: string[]; celebrant?: string | null; occasion?: string | null; plate_message?: string | null; own_cake?: boolean; high_chairs?: number; wheelchair?: boolean }) => {
  const out: string[] = [];
  if (p.celebrant || p.plate_message || p.own_cake) out.push(`${p.occasion || 'Celebration'}${p.celebrant ? ` for ${p.celebrant}` : ''}${p.plate_message ? `, plate message "${p.plate_message}"` : ''}${p.own_cake ? ', bringing own cake' : ''}`);
  if (p.high_chairs) out.push(`${p.high_chairs} high ${p.high_chairs === 1 ? 'chair' : 'chairs'}`);
  if (p.wheelchair) out.push('wheelchair access');
  return out;
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function niceDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function shortDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Requests get an answer within 24 hours
function replyBy() {
  const d = new Date(Math.ceil((Date.now() + 24 * 3600 * 1000) / 3600000) * 3600000);
  return d.toLocaleString('en-GB', { timeZone: 'Pacific/Fiji', weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/^(\w+) /, '$1, ').replace(' am', ' AM').replace(' pm', ' PM');
}

// ---------- Service wording ----------
const svc = (r: Row): Service => (r.service ?? 'teppanyaki');
const meal = (r: Row) => ((r.session_time ?? '') < '16:00' ? 'lunch' : 'dinner');
const svcName = (r: Row) => (svc(r) === 'teppanyaki' ? 'Teppanyaki' : svc(r) === 'event' ? 'Group or event enquiry' : meal(r) === 'lunch' ? 'Lunch' : 'Dinner');
const svcShort = (r: Row) => (svc(r) === 'teppanyaki' ? 'Teppanyaki' : svc(r) === 'event' ? 'Event enquiry' : meal(r) === 'lunch' ? 'Lunch' : 'Dinner');
const timeLabel = (r: Row) => (svc(r) === 'teppanyaki' ? 'Sitting' : svc(r) === 'event' ? 'Preferred time' : 'Time');
const timeValue = (r: Row) => (svc(r) === 'teppanyaki' ? r.window_label : r.session_label);
const prefText = (p?: string | null) => (p === 'yakitori_counter' ? 'Yakitori counter if available' : p === 'dining_room' ? 'Dining room table' : p === 'no_preference' ? 'No preference' : '');

const MOBILE_CSS = `@media only screen and (max-width:620px){.kz-outer{padding:10px 0!important}.kz-card{padding:20px 16px 16px!important}.kz-stack{display:block!important;width:100%!important;box-sizing:border-box!important;padding:4px 0!important}.kz-glance td{display:inline-block!important;width:50%!important;box-sizing:border-box!important}.kz-kv td{display:block!important;width:100%!important;padding:2px 0!important;border:0!important}.kz-kv tr{display:block!important;padding:8px 0!important;border-bottom:1px solid #eee!important}.kz-kv td:first-child{white-space:normal!important;font-size:12px!important}.kz-hide-m{display:none!important}h1{font-size:20px!important}}`;
const wrap = (inner: string, width = 560) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><style>${MOBILE_CSS}</style></head><body class="kz-outer" style="margin:0;padding:24px;background:#f6f2ec;font-family:Helvetica,Arial,sans-serif;color:#211a16;-webkit-text-size-adjust:100%"><div class="kz-card" style="max-width:${width}px;margin:auto;background:#fff;padding:28px 28px 22px;border-top:3px solid #9b5f37"><img src="https://s3.amazonaws.com/webflow-prod-assets/6a0e37a6c7018b2c8724e236/6a438b83ab8c4731427fc533_kazumi_primary_black.png" width="72" alt="Kazumi Japanese Restaurant" style="display:block;width:72px;height:auto;margin:0 0 20px;border:0">${inner}<p style="margin:28px 0 0;font-size:12px;color:#6f6258">Kazumi Japanese Restaurant &middot; Port Denarau Marina, Nadi, Fiji</p></div></body></html>`;

function rowsTable(rows: [string, string][]) {
  return `<table class="kz-kv" style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #eee;color:#6f6258;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top">${esc(v)}</td></tr>`)
    .join('')}</table>`;
}

const button = (href: string, label: string) => href
  ? `<p style="margin:22px 0 0"><a href="${esc(href)}" style="display:inline-block;padding:12px 18px;border:1px solid #211a16;color:#211a16;text-decoration:none;font-size:13px;letter-spacing:.06em;text-transform:uppercase">${esc(label)}</a></p>`
  : '';

function link(r: Row, base: string) {
  if (!base || !r.manage_token) return '';
  return `${base}${base.includes('?') ? '&' : '?'}ref=${encodeURIComponent(r.reference)}&t=${encodeURIComponent(r.manage_token)}`;
}

const T = (r: Row) => (r.is_test ? '[TEST] ' : '');
const first = (r: Row) => r.full_name.trim().split(/\s+/)[0];
function fillTokens(t: string, r: Row, extra: Record<string, string> = {}) {
  const v: Record<string, string> = { name: first(r), full_name: r.full_name, guests: String(r.party_size), reference: r.reference,
    date: niceDate(r.reservation_date), time: r.session_label, service: svcShort(r), meal: meal(r), reply_by: replyBy(), ...extra };
  return t.replace(/\{([a-z_]+)\}/g, (m, k) => (k in v ? v[k] : m));
}
// the edited subject and opening message for this email, or the defaults passed in
function worded(key: string, r: Row, subject: string, intro: string, extra: Record<string, string> = {}) {
  const w = WORDING[key];
  if (!w) return { subject, intro };
  return {
    subject: w.subject && w.subject.trim() ? T(r) + fillTokens(w.subject.trim(), r, extra).replace(/[\r\n]+/g, ' ') : subject,
    intro: w.message && w.message.trim() ? esc(fillTokens(w.message.trim(), r, extra)).replace(/\r?\n/g, '<br>') : intro,
  };
}
const note = (color: string, bg: string, html: string) => `<p style="margin:0 0 18px;padding:12px 14px;background:${bg};border-left:3px solid ${color};font-size:14px">${html}</p>`;

function staffAlert(r: Row, names: Record<string, string>) {
  const s = svc(r);
  const large = r.status === 'pending_large_group';
  const confirmed = r.status === 'confirmed';
  const allergens = r.allergens ?? [];
  const lead = s === 'event' ? 'EVENT ENQUIRY – ' : large ? 'LARGE GROUP – ' : r.status === 'pending' ? 'REQUEST – ' : confirmed ? 'Confirmed – ' : '';
  const prefix = T(r) + lead;
  const suffix = allergens.length ? ' – ALLERGIES' : '';
  const subject = `${prefix}${s === 'event' ? '' : `${svcShort(r)} – `}${shortDate(r.reservation_date)}, ${r.session_label} – ${r.party_size} guests – ${r.full_name}${suffix}`;
  const allergyBlock = allergens.length
    ? note('#9b3a32', '#fbefed', `<strong>Allergies in this party:</strong> ${esc(allergens.join(', '))}${r.diet_prefs?.length ? `<br>Dietary: ${esc(r.diet_prefs.join(', '))}` : ''}${r.dietary ? `<br>Details: ${esc(r.dietary)}` : ''}`)
    : '';
  const action = s === 'event'
    ? note('#8a5a24', '#fbf3e8', '<strong>Event enquiry:</strong> nothing is held yet. Contact the guest, then confirm or decline it in the staff app.')
    : large
      ? note('#8a5a24', '#fbf3e8', '<strong>Large group:</strong> seats are held across more than one table. Confirm or decline it in the staff app.')
      : r.status === 'pending'
        ? note('#8a5a24', '#fbf3e8', `<strong>Booking request:</strong> the space is held but not confirmed. Confirm or decline it in the staff app; the guest has been told to expect an answer within 24 hours.`)
        : '';
  const rows: [string, string][] = [
    ['Reference', r.reference],
    ['Booking', svcName(r)],
    ['Status', s === 'event' ? 'Enquiry – team to respond' : large ? 'Pending – team to confirm seating' : r.status === 'pending' ? 'Pending – team to confirm' : confirmed ? 'Confirmed automatically' : r.status],
    ['Date', niceDate(r.reservation_date)],
    [timeLabel(r), timeValue(r)],
    ['Guests', `${r.party_size} (${r.adults} adults, ${r.children} children)`],
  ];
  if (s === 'teppanyaki') rows.push(['Table', r.table_codes?.length ? r.table_codes.map((c) => names[c] || c).join(' + ') : 'To be assigned by staff']);
  if (s === 'dining') rows.push(['Seating preference', prefText(r.seating_pref) || 'Not given']);
  rows.push(
    ['Name', r.full_name], ['Mobile', r.phone], ['Email', r.email],
    ['Hotel / location', r.location || 'Not provided'],
    [s === 'event' ? 'Type of event' : 'Occasion', r.occasion || 'None'],
    ['Allergies', allergens.length ? allergens.join(', ') : 'None ticked'],
    ['Dietary needs', r.diet_prefs?.length ? r.diet_prefs.join(', ') : 'None ticked'],
    ['Other dietary notes', clean(r.dietary) || 'None'],
    ['Celebration', r.celebrant || r.plate_message || r.own_cake ? extrasText({ ...r, high_chairs: 0, wheelchair: false }).join('; ') : 'None'],
    ['Seating needs', extrasText({ high_chairs: r.high_chairs, wheelchair: r.wheelchair }).join(', ') || 'None'],
    [s === 'event' ? 'Event details' : 'Special requests', r.requests || 'None'],
  );
  const waiting = r.status === 'pending' || r.status === 'pending_large_group';
  const review = waiting ? reviewButton(reviewUrl(r), s === 'event' ? 'Review enquiry' : 'Review booking') : '';
  const foot = s === 'teppanyaki' ? "Reply to this email to contact the guest directly. Assign the Teppanyaki table in the staff app." : 'Reply to this email to contact the guest directly.';
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9b5f37">${s === 'event' ? 'New group or event enquiry' : `New ${esc(svcShort(r))} booking`}${r.is_test ? ' (test)' : ''}</p>
    <h1 style="margin:0 0 18px;font-size:22px;font-weight:500">${esc(r.full_name)} &middot; ${r.party_size} guests</h1>
    ${allergyBlock}${action}${review}
    ${rowsTable(rows)}
    <p style="margin:20px 0 0;font-size:13px;color:#6f6258">${foot}</p>`);
  return { subject, html, reply_to: r.email };
}

function staffCancelled(r: Row) {
  const late = !!r.late_cancel;
  const subject = `${T(r)}${late ? 'LATE CANCELLATION' : 'CANCELLED'} – ${svcShort(r)} – ${shortDate(r.reservation_date)}, ${r.session_label} – ${r.party_size} guests – ${r.full_name}`;
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9b3a32">${late ? `Late cancellation by guest (inside ${hoursText(noticeHours(svc(r)))} notice)` : 'Booking cancelled by guest'}</p>
    ${late ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.5">Offer the ${svc(r) === 'teppanyaki' ? 'seats' : 'table'} to a walk-in or the waitlist.</p>` : ''}
    <h1 style="margin:0 0 18px;font-size:22px;font-weight:500">${esc(r.full_name)} &middot; ${r.party_size} guests</h1>
    ${rowsTable([
      ['Reference', r.reference],
      ['Booking', svcName(r)],
      ['Date', niceDate(r.reservation_date)],
      [timeLabel(r), timeValue(r)],
      ['Mobile', r.phone],
      ['Email', r.email],
    ])}
    <p style="margin:20px 0 0;font-size:13px;color:#6f6258">${svc(r) === 'event' ? 'The enquiry has been withdrawn.' : 'The space has been released and is bookable again online.'}</p>`);
  return { subject, html, reply_to: r.email };
}

function details(r: Row): [string, string][] {
  const rows: [string, string][] = [
    ['Reference', r.reference],
    ['Booking', svcName(r)],
    ['Date', niceDate(r.reservation_date)],
    [timeLabel(r), timeValue(r)],
    ['Guests', String(r.party_size)],
  ];
  if (svc(r) === 'dining' && prefText(r.seating_pref)) rows.push(['Seating preference', prefText(r.seating_pref)]);
  if (r.allergens?.length) rows.push(['Allergies noted', r.allergens.join(', ')]);
  if (r.diet_prefs?.length) rows.push(['Dietary needs', r.diet_prefs.join(', ')]);
  const ex = extrasText(r);
  if (ex.length) rows.push(['Noted for your visit', ex.join('; ')]);
  return rows;
}

const P = (html: string) => `<p style="margin:18px 0 0;font-size:14px;line-height:1.6">${html}</p>`;
const hello = (r: Row) => `<p style="margin:0 0 16px;font-size:16px">Bula ${esc(first(r))},</p>`;
const lead = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${html}</p>`;
// 30 Oct 2026: name, address, phone and website come from Settings > Restaurant profile (loaded before sending)
const prof = () => (SETTINGS ?? {}) as { restaurant_name?: string; address?: string; phone?: string | null; website?: string | null };
const restName = () => (prof().restaurant_name || 'Kazumi').trim();
const restAddress = () => (prof().address || 'Port Denarau Marina, Nadi, Fiji').trim();
const contactLine = () => {
  const p = prof(), web = (p.website || '').trim(), phone = (p.phone || '').trim();
  const parts = [esc(restName()), esc(restAddress())];
  if (phone) parts.push(`<a href="tel:${esc(phone.replace(/[^+0-9]/g, ''))}" style="color:#6f6258">${esc(phone)}</a>`);
  if (web) parts.push(`<a href="${esc(web)}" style="color:#6f6258">${esc(web.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`);
  return `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6f6258">${parts.join(' · ')}</p>`;
};
const signoff = (line = 'Vinaka') => `<p style="margin:22px 0 0;font-size:14px;line-height:1.6">${line},<br>The ${esc(restName())} team</p>${contactLine()}`;
// 28 Oct 2026 (house rule): a table is held for a set time after the booking time; confirmation emails say so.
// the minutes come from Settings > Booking rules (reservation_settings.hold_minutes), 15 if not set
const holdMin = () => { const n = Number((SETTINGS ?? {}).hold_minutes); return n >= 5 && n <= 60 ? Math.round(n) : 15; };
function practical(r: Row, hold = false) {
  if (svc(r) === 'teppanyaki') return P(`Please arrive about 10 minutes early. The chef cooks for the whole grill at once, so the show starts on time.${hold ? ` We hold your seats for ${holdMin()} minutes after the start; after that we may give them to waiting guests.` : ''} Our grills are shared, so smaller parties may sit alongside other guests.`);
  if (svc(r) === 'dining') return P(`${hold ? `We hold your table for ${holdMin()} minutes after your booking time. Running late? Just reply to this email; after ${holdMin()} minutes we may need to give the table to waiting guests.` : 'Running late? Just reply to this email and let us know.'}${r.seating_pref === 'yakitori_counter' ? " We'll seat you at the yakitori counter if it's free on the day." : ''}`);
  return '';
}
// 3 Nov 2026: cancellation notice from Settings > Booking rules. Guests can still cancel online up to the booking time.
const noticeHours = (s: Service) => { const st = (SETTINGS ?? {}) as any; const v = Number(s === 'dining' ? st.cancel_notice_dining_hours : s === 'event' ? st.cancel_notice_event_hours : st.cancel_notice_tep_hours); return Number.isFinite(v) && v >= 0 ? Math.round(v) : (s === 'dining' ? 2 : s === 'event' ? 48 : 24); };
const hoursText = (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'}`;
const changeLine = (s: Service) => {
  const h = noticeHours(s);
  if (s === 'event') return P(`Need to change anything, or tell us about an allergy? Just reply to this email.${h ? ` If your plans change, please let us know at least ${hoursText(h)} ahead by replying to this email${prof().phone ? ' or calling us' : ''}.` : ''}`);
  return P(`Need to change anything, or tell us about an allergy? Just reply to this email. If your plans change, please cancel${h ? ` at least ${hoursText(h)} ahead` : ''} using the button below, so we can offer the ${s === 'teppanyaki' ? 'seats' : 'table'} to another guest.`);
};

function guestConfirmation(r: Row, url: string) {
  const s = svc(r);
  const confirmed = r.status === 'confirmed';
  let subject: string, intro: string;
  if (s === 'event') {
    subject = `${T(r)}Thank you for your event enquiry – ${r.reference}`;
    intro = `Thank you for thinking of Kazumi for your event. We have your enquiry for ${r.party_size} guests, and our team will be in touch by ${replyBy()} to talk through the menu, timing and anything else you need. Nothing is final until we confirm it with you.`;
  } else if (s === 'teppanyaki') {
    const large = r.status === 'pending_large_group';
    subject = confirmed ? `${T(r)}You're booked for Teppanyaki at Kazumi – ${r.reference}` : large ? `${T(r)}We have your Teppanyaki group request – ${r.reference}` : `${T(r)}We have your Teppanyaki request – ${r.reference}`;
    intro = confirmed
      ? `Your seats at the Teppanyaki grill are booked. Our chef will cook right in front of you, so come hungry. We can't wait to welcome you.`
      : large
      ? `Thank you for your Teppanyaki request for ${r.party_size}. We're holding seats for your group while we work out the best way to seat you together, and we'll be in touch by ${replyBy()}.`
      : `Thank you for your Teppanyaki request for ${r.party_size}. We're holding your seats at the grill, and we'll confirm by ${replyBy()}. Nothing is final until you hear from us.`;
  } else {
    subject = confirmed ? `${T(r)}You're booked for ${meal(r)} at Kazumi – ${r.reference}` : `${T(r)}We have your table request – ${r.reference}`;
    intro = confirmed
      ? `Your table for ${meal(r)} is booked. We look forward to welcoming you to Kazumi.`
      : `Thank you for your table request for ${r.party_size}. We're holding the space for you, and we'll confirm by ${replyBy()}. Nothing is final until you hear from us.`;
  }
  ({ subject, intro } = worded(s === 'event' ? 'confirm_event' : s === 'teppanyaki' ? (confirmed ? 'confirm_tep_ok' : r.status === 'pending_large_group' ? 'confirm_tep_group' : 'confirm_tep_req') : (confirmed ? 'confirm_din_ok' : 'confirm_din_req'), r, subject, intro));
  const html = wrap(`${hello(r)}${lead(intro)}
    ${rowsTable(details(r))}
    ${confirmed ? practical(r, true) : ''}
    ${changeLine(s)}
    ${button(link(r, url), s === 'event' ? 'View or withdraw enquiry' : 'View or cancel booking')}
    ${signoff(confirmed ? 'See you soon' : 'Vinaka')}`);
  return { subject, html, reply_to: r.guest_reply_to };
}

function guestConfirmed(r: Row, url: string) {
  const s = svc(r);
  let subject = s === 'event' ? `${T(r)}Your event at Kazumi is confirmed – ${r.reference}`
    : s === 'teppanyaki' ? `${T(r)}Your Teppanyaki booking is confirmed – ${r.reference}`
    : `${T(r)}Your table at Kazumi is confirmed – ${r.reference}`;
  let intro = s === 'event' ? `Good news: your event at Kazumi is confirmed. We'll stay in touch about the final details.`
    : s === 'teppanyaki' ? `Good news: your Teppanyaki booking for ${r.party_size} is confirmed. Our chef will cook right in front of you, so come hungry.`
    : `Good news: your table for ${r.party_size} is confirmed. We look forward to welcoming you.`;
  ({ subject, intro } = worded(s === 'event' ? 'confirmed_event' : s === 'teppanyaki' ? 'confirmed_tep' : 'confirmed_din', r, subject, intro));
  const html = wrap(`${hello(r)}${lead(intro)}
    ${rowsTable(details(r))}
    ${practical(r, true)}
    ${changeLine(s)}
    ${button(link(r, url), 'View or cancel booking')}
    ${signoff('See you soon')}`);
  return { subject, html, reply_to: r.guest_reply_to };
}

function guestDeclined(r: Row) {
  const s = svc(r);
  let subject = `${T(r)}About your ${s === 'event' ? 'event enquiry' : s === 'teppanyaki' ? 'Teppanyaki request' : 'table request'} – ${r.reference}`;
  const reason = r.decline_reason ? lead(esc(r.decline_reason)) : '';
  let sorry = s === 'event' ? `Thank you for thinking of us for your event. We're sorry, but we can't host it on this date.`
    : s === 'teppanyaki' ? `Thank you for your Teppanyaki request. We're sorry, but we can't seat your group at this sitting.`
    : `Thank you for your table request. We're sorry, but we can't seat your party at this time.`;
  ({ subject, intro: sorry } = worded(s === 'event' ? 'declined_event' : s === 'teppanyaki' ? 'declined_tep' : 'declined_din', r, subject, sorry));
  const html = wrap(`${hello(r)}${lead(sorry)}${reason}
    ${rowsTable([
      ['Reference', r.reference],
      ['Booking', svcName(r)],
      ['Date', niceDate(r.reservation_date)],
      [timeLabel(r), timeValue(r)],
      ['Guests', String(r.party_size)],
    ])}
    ${P("We'd still love to have you. Reply to this email and we'll suggest other dates or times that work.")}
    ${signoff()}`);
  return { subject, html, reply_to: r.guest_reply_to };
}

function guestReminder(r: Row, url: string) {
  const s = svc(r);
  let subject = `${T(r)}See you tomorrow at Kazumi – ${svcShort(r)}, ${r.session_label}`;
  let body = s === 'event' ? `Your event at Kazumi is tomorrow, and we're looking forward to hosting you.`
    : `We're looking forward to seeing you tomorrow. Here are your booking details.`;
  ({ subject, intro: body } = worded(s === 'event' ? 'reminder_event' : 'reminder', r, subject, body));
  const html = wrap(`${hello(r)}${lead(body)}
    ${rowsTable(details(r))}
    ${practical(r)}
    ${P(`You will find us at ${esc(restAddress().replace(/,\s*Fiji$/i, ''))}. Any new allergies? Just reply to this email. If you can no longer make it, please cancel below so we can offer the seats to another guest.`)}
    ${button(link(r, url), 'View or cancel booking')}
    ${signoff('See you tomorrow')}`);
  return { subject, html, reply_to: r.guest_reply_to };
}

function guestCancelled(r: Row) {
  const s = svc(r);
  const cw = worded(s === 'event' ? 'cancelled_event' : 'cancelled', r, `${T(r)}Your ${s === 'event' ? 'event enquiry is withdrawn' : `${svcShort(r)} booking is cancelled`} – ${r.reference}`,
    `${s === 'event' ? 'Your event enquiry is withdrawn.' : 'Your booking is cancelled.'} Thank you for letting us know, and we hope to welcome you another time.`);
  const subject = cw.subject;
  const html = wrap(`${hello(r)}${lead(cw.intro)}
    ${rowsTable([
      ['Reference', r.reference],
      ['Booking', svcName(r)],
      ['Date', niceDate(r.reservation_date)],
      [timeLabel(r), timeValue(r)],
      ['Guests', String(r.party_size)],
    ])}
    ${P("Cancelled by mistake? Reply to this email and we'll do our best to get you back in.")}
    ${signoff()}`);
  return { subject, html, reply_to: r.guest_reply_to };
}

function ccFor(to: string, cc: string[]) {
  const list = cc.filter((x) => x !== String(to).toLowerCase());
  return list.length ? { cc: list } : {};
}

async function send(r: Row) {
  Object.assign(r, await extras(r.reference));
  const url = await manageUrl();
  const names = await tableNames();
  const msg =
    r.kind === 'staff_alert' ? staffAlert(r, names) :
    r.kind === 'staff_cancelled' ? staffCancelled(r) :
    r.kind === 'guest_reminder' ? guestReminder(r, url) :
    r.kind === 'guest_cancelled' ? guestCancelled(r) :
    r.kind === 'guest_confirmed' ? guestConfirmed(r, url) :
    r.kind === 'guest_declined' ? guestDeclined(r) :
    guestConfirmation(r, url);
  const key = ENV_KEY || r.resend_api_key;
  const staffKind = r.kind === 'staff_alert' || r.kind === 'staff_cancelled';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Idempotency-Key': `${r.outbox_id}` },
    body: JSON.stringify({ from: r.from_email, to: [r.to_email], ...(staffKind ? ccFor(r.to_email, (await recips('alert')).cc) : {}), reply_to: msg.reply_to, subject: msg.subject, html: msg.html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return body.id as string;
}

// ---------- Daily run sheets: one for the floor team, one for the kitchen ----------

const RED = '#9b3a32', AMBER = '#8a5a24', COPPER = '#9b5f37', MUTED = '#6f6258';
const sumSize = (ps: Party[]) => ps.reduce((n, p) => n + (p.size || 0), 0);
const tName = (codes: string[] | undefined, names: Record<string, string>) => (codes ?? []).map((c) => names[c] || c).join(' + ');
const sName = (p: Party, names: Record<string, string>) => p.split && Object.keys(p.split).length > 1 ? Object.keys(p.split).map((c) => `${names[c] || c} ${p.split![c]}`).join(' + ') : tName(p.tables, names);
const isCelebration = (p: Party) => !!(p.celebrant || p.plate_message || p.own_cake || ['Birthday', 'Anniversary', 'Honeymoon', 'Celebration'].includes(p.occasion || ''));
const hasDiet = (p: Party) => !!(p.allergens?.length || p.diet_prefs?.length || p.dietary);

type Placed = Party & { where: string; when: string; order: string };
function tidy(p: Party): Party { return { ...p, dietary: clean(p.dietary), requests: clean(p.requests) }; }
function placed(payload: Sheet, names: Record<string, string>): Placed[] {
  const out: Placed[] = [];
  const seen = new Set<string>();
  for (const s of payload.sessions ?? []) {
    for (const t of s.tables) for (const p of t.parties) {
      const k = `${p.reference}`; if (seen.has(k)) continue; seen.add(k);
      out.push({ ...p, where: sName(p, names) || (t.name || t.code), when: `Teppanyaki ${s.label}`, order: `2${s.session_time}` });
    }
    for (const p of s.unassigned) { if (seen.has(p.reference)) continue; seen.add(p.reference); out.push({ ...p, where: 'Needs a grill', when: `Teppanyaki ${s.label}`, order: `2${s.session_time}` }); }
  }
  for (const p of payload.dining ?? []) out.push({ ...p, where: 'Dining room', when: `${(p.session_time ?? '') < '16:00' ? 'Lunch' : 'Dinner'} ${p.time_label || p.session_time || ''}`, order: `${(p.session_time ?? '') < '16:00' ? '1' : '3'}${p.session_time}` });
  for (const p of payload.events ?? []) out.push({ ...p, where: 'Event', when: `Event ${p.time_label || p.session_time || ''}`, order: `4${p.session_time}` });
  return out.map((p) => ({ ...p, ...tidy(p) })).sort((a, b) => a.order.localeCompare(b.order) || a.name.localeCompare(b.name));
}

const pill = (text: string, color: string, bg: string) => `<span style="display:inline-block;margin:2px 4px 0 0;padding:1px 7px;border-radius:9px;background:${bg};color:${color};font-size:11px;font-weight:600">${esc(text)}</span>`;
function tags(p: Party) {
  const t: string[] = [];
  if (p.vip) t.push(pill('VIP', '#fff', COPPER));
  if ((p.visits ?? 0) > 0) t.push(pill(`Returning, ${p.visits} ${p.visits === 1 ? 'visit' : 'visits'}`, COPPER, '#f5e9e0'));
  if (isCelebration(p)) t.push(pill(p.occasion || 'Celebration', COPPER, '#f5e9e0'));
  if (p.allergens?.length) t.push(pill('Allergy', '#fff', RED));
  if (p.diet_prefs?.length) t.push(pill(p.diet_prefs.join(', '), RED, '#fbefed'));
  if (p.high_chairs) t.push(pill(`${p.high_chairs} high ${p.high_chairs === 1 ? 'chair' : 'chairs'}`, AMBER, '#fbf3e8'));
  if (p.wheelchair) t.push(pill('Wheelchair', AMBER, '#fbf3e8'));
  if (p.status === 'pending' || p.status === 'pending_large_group') t.push(pill('Not yet confirmed', AMBER, '#fbf3e8'));
  return t.join('');
}

function floorParty(p0: Party, names: Record<string, string>, here?: string) {
  const p = tidy(p0);
  const l: string[] = [];
  const sp = p.split && here && p.split[here] != null ? p.split : null;
  const others = sp ? Object.keys(sp).filter((c) => c !== here).map((c) => `${names[c] || c} ${sp[c]}`).join(' + ') : '';
  const across = sp ? ` <span style="font-weight:400;color:${AMBER}">(linked: ${esc(others)})</span>` : p.tables?.length > 1 ? ` <span style="font-weight:400;color:${AMBER}">(across ${esc(tName(p.tables, names))})</span>` : '';
  l.push(`<div style="font-size:13px;font-weight:600">${esc(p.name)} &middot; ${sp ? `${sp[here!]} of ${p.size}` : p.size}${across}</div>`);
  l.push(`<div style="font-size:11px;color:${MUTED}">${p.adults} adults, ${p.children} children &middot; ${esc(p.reference)}${p.location ? ` &middot; ${esc(p.location)}` : ''}</div>`);
  const t = tags(p); if (t) l.push(`<div>${t}</div>`);
  if (isCelebration(p)) l.push(`<div style="font-size:12px;color:${COPPER}">${esc(extrasText({ ...p, high_chairs: 0, wheelchair: false }).join('') || p.occasion || '')}</div>`);
  if (p.allergens?.length) l.push(`<div style="font-size:12px;color:${RED};font-weight:600">Allergy: ${esc(p.allergens.join(', '))}</div>`);
  if (p.dietary) l.push(`<div style="font-size:11px;color:${RED}">${esc(p.dietary)}</div>`);
  if (p.requests) l.push(`<div style="font-size:11px;color:${MUTED}">Request: ${esc(p.requests)}</div>`);
  if (p.guest_note) l.push(`<div style="font-size:11px;color:${COPPER}">Guest note: ${esc(p.guest_note)}</div>`);
  if (p.staff_notes) l.push(`<div style="font-size:11px;color:${MUTED}">Staff note: ${esc(p.staff_notes)}</div>`);
  return `<div style="padding:7px 0;border-top:1px solid #eee">${l.join('')}</div>`;
}

function floorTable(t: SheetTable, names: Record<string, string>) {
  const allergy = t.parties.some((p) => p.allergens?.length);
  const fill = t.booked >= t.seats ? 'Full' : `${t.booked} of ${t.seats} seats`;
  const body = t.parties.length ? t.parties.map((p) => floorParty(p, names, t.code)).join('') : `<div style="padding:7px 0;border-top:1px solid #eee;font-size:12px;color:#9a918b">Free</div>`;
  return `<div style="border:1px solid ${allergy ? RED : '#d8cfc6'};${allergy ? 'border-left-width:4px;' : ''}padding:10px 10px 4px;min-height:96px"><div><span style="font-size:16px;font-weight:600">${esc(t.name || t.code)}</span> <span style="font-size:11px;color:${MUTED};float:right;padding-top:4px">${fill}</span></div>${body}</div>`;
}

function floorSitting(s: Sess, names: Record<string, string>) {
  const head = `<h2 style="margin:28px 0 4px;font-size:18px;font-weight:600">Teppanyaki ${esc(s.label)} sitting <span style="font-weight:400;color:${MUTED};font-size:14px">${esc(s.window_label)}</span></h2>`;
  if (!s.party_count) return `${head}<p style="margin:4px 0 0;font-size:14px;color:${MUTED}">No bookings for this sitting.</p>`;
  const rows: string[] = [];
  for (let i = 0; i < s.tables.length; i += 3) {
    const cells = s.tables.slice(i, i + 3).map((t) => `<td class="kz-stack" style="width:33%;vertical-align:top;padding:4px">${floorTable(t, names)}</td>`);
    while (cells.length < 3) cells.push('<td class="kz-stack kz-hide-m" style="width:33%"></td>');
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  const uns = s.unassigned.length ? `<div style="margin-top:12px;padding:10px 14px;background:#fbf3e8;border-left:3px solid ${AMBER};font-size:13px"><strong>Needs a grill</strong> (assign in the staff app)${s.unassigned.map((p) => floorParty(p, names)).join('')}</div>` : '';
  return `${head}<p style="margin:0 0 12px;font-size:14px">${s.seats_booked} of ${s.seats_total} seats &middot; ${s.party_count} ${s.party_count === 1 ? 'party' : 'parties'}</p><table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed">${rows.join('')}</table>${uns}`;
}

function floorList(title: string, ps: Party[], names: Record<string, string>) {
  if (!ps.length) return '';
  const rows = ps.map((p) => `<tr><td class="kz-stack" style="padding:8px 8px 8px 6px;border-bottom:1px solid #eee;${p.allergens?.length ? `border-left:4px solid ${RED};` : ''}white-space:nowrap;vertical-align:top;font-weight:600">${esc(p.time_label || p.session_time || '')}${p.seating_pref && p.seating_pref !== 'no_preference' ? `<div style="font-size:11px;font-weight:400;color:${MUTED}">${esc(prefText(p.seating_pref))}</div>` : ''}</td><td class="kz-stack" style="padding:0 8px;border-bottom:1px solid #eee;vertical-align:top">${floorParty(p, names).replace('border-top:1px solid #eee', 'border-top:0')}</td></tr>`).join('');
  return `<h2 style="margin:30px 0 4px;font-size:18px;font-weight:600">${esc(title)}</h2><p style="margin:0 0 10px;font-size:14px">${sumSize(ps)} guests &middot; ${ps.length} ${ps.length === 1 ? 'booking' : 'bookings'}</p><table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table>`;
}

function box(title: string, color: string, bg: string, items: string[]) {
  if (!items.length) return '';
  return `<div style="margin:16px 0 0;padding:12px 14px;background:${bg};border-left:3px solid ${color};font-size:13px"><strong>${esc(title)}</strong><ul style="margin:6px 0 0;padding-left:18px">${items.map((x) => `<li style="margin:0 0 4px">${x}</li>`).join('')}</ul></div>`;
}

function glance(cells: [string, string][]) {
  return `<table class="kz-glance" style="width:100%;border-collapse:collapse;margin:16px 0 0"><tr>${cells.map(([n, l]) => `<td style="padding:10px 8px;border:1px solid #e3dfd9;text-align:center;vertical-align:top"><div style="font-size:22px;font-weight:600">${esc(n)}</div><div style="font-size:11px;color:${MUTED}">${esc(l)}</div></td>`).join('')}</tr></table>`;
}

function floorSheet(payload: Sheet, names: Record<string, string>) {
  const sessions = payload.sessions ?? [], dining = payload.dining ?? [], events = payload.events ?? [];
  const lunch = dining.filter((p) => (p.session_time ?? '') < '16:00'), dinner = dining.filter((p) => (p.session_time ?? '') >= '16:00');
  const all = placed(payload, names);
  const guests = sumSize(all);
  const cel = all.filter(isCelebration);
  const care = all.filter((p) => p.vip || (p.visits ?? 0) > 0 || p.guest_note || p.high_chairs || p.wheelchair);
  const celItems = cel.map((p) => `<strong>${esc(p.when)}</strong>, ${esc(p.where)}: ${esc(p.name)} (${p.size}) &middot; ${esc(extrasText({ ...p, high_chairs: 0, wheelchair: false }).join('') || p.occasion || 'Celebration')}`);
  const careItems = care.map((p) => {
    const bits: string[] = [];
    if (p.vip) bits.push('<strong>VIP</strong>');
    if ((p.visits ?? 0) > 0) bits.push(`returning guest, ${p.visits} ${p.visits === 1 ? 'visit' : 'visits'}`);
    if (p.guest_note) bits.push(esc(p.guest_note));
    const seat = extrasText({ high_chairs: p.high_chairs, wheelchair: p.wheelchair }); if (seat.length) bits.push(esc(seat.join(', ')));
    return `<strong>${esc(p.when)}</strong>, ${esc(p.where)}: ${esc(p.name)} (${p.size}) &middot; ${bits.join(' &middot; ')}`;
  });
  const parts = [
    ...sessions.filter((s) => s.party_count).map((s) => `Teppanyaki ${s.label}: ${s.seats_booked}`),
    lunch.length ? `Lunch: ${sumSize(lunch)}` : '', dinner.length ? `Dinner: ${sumSize(dinner)}` : '', events.length ? `Events: ${events.length}` : '',
  ].filter(Boolean);
  const subject = `Floor sheet – ${shortDate(payload.date)} – ${guests} guests${cel.length ? ` – ${cel.length} ${cel.length === 1 ? 'celebration' : 'celebrations'}` : ''}`;
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${COPPER}">Floor sheet</p>
    <h1 style="margin:0;font-size:22px;font-weight:500">${esc(niceDate(payload.date))}</h1>
    <p style="margin:6px 0 0;font-size:14px;color:${MUTED}">${esc(parts.join(' · ') || 'No bookings')}</p>
    ${glance([[String(guests), 'guests'], [String(all.length), 'bookings'], [String(cel.length), 'celebrations'], [String(all.filter((p) => p.allergens?.length).length), 'with allergies'], [String(care.length), 'to look after']])}
    ${box('Celebrations', COPPER, '#f8efe7', celItems)}
    ${box('Look after', AMBER, '#fbf3e8', careItems)}
    ${floorList('Lunch', lunch, names)}
    ${sessions.some((s) => s.party_count) ? sessions.map((s) => floorSitting(s, names)).join('') : ''}
    ${floorList('Dinner in the dining room', dinner, names)}
    ${floorList('Group and event enquiries', events, names)}
    <p style="margin:24px 0 0;font-size:12px;color:${MUTED}">Red edges mark allergies. Teppanyaki tables are as assigned in the staff app. Late changes arrive as separate emails.</p>`, 760);
  return { subject, html };
}

function kitchenSheet(payload: Sheet, names: Record<string, string>) {
  const all = placed(payload, names);
  const sessions = payload.sessions ?? [];
  const dining = payload.dining ?? [];
  const groups: [string, Party[]][] = [
    ['Lunch', dining.filter((p) => (p.session_time ?? '') < '16:00')],
    ...sessions.map((s) => [`Teppanyaki ${s.label}`, [...s.tables.flatMap((t) => t.parties), ...s.unassigned].filter((p, i, a) => a.findIndex((x) => x.reference === p.reference) === i)] as [string, Party[]]),
    ['Dinner, dining room', dining.filter((p) => (p.session_time ?? '') >= '16:00')],
    ['Events', payload.events ?? []],
  ].filter(([, ps]) => ps.length) as [string, Party[]][];
  const covers = groups.map(([n, ps]) => `<tr><td style="padding:7px 12px 7px 0;border-bottom:1px solid #eee">${esc(n)}</td><td style="padding:7px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${sumSize(ps)}</td><td style="padding:7px 8px;border-bottom:1px solid #eee;text-align:right">${ps.reduce((n, p) => n + (p.adults || 0), 0)}</td><td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right">${ps.reduce((n, p) => n + (p.children || 0), 0)}</td></tr>`).join('');
  const total = sumSize(all);
  const flagged = all.filter(hasDiet);
  const counts = new Map<string, Placed[]>();
  for (const p of flagged) for (const k of [...(p.allergens ?? []).map((a) => `Allergy: ${a}`), ...(p.diet_prefs ?? [])]) counts.set(k, [...(counts.get(k) ?? []), p]);
  const matrix = [...counts.entries()].sort((a, b) => (a[0].startsWith('Allergy') ? 0 : 1) - (b[0].startsWith('Allergy') ? 0 : 1) || b[1].length - a[1].length)
    .map(([k, ps]) => `<tr><td style="padding:7px 12px 7px 6px;border-bottom:1px solid #eee;${k.startsWith('Allergy') ? `border-left:4px solid ${RED};font-weight:600;color:${RED}` : 'font-weight:600'}">${esc(k.replace('Allergy: ', ''))}</td><td style="padding:7px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${ps.length} ${ps.length === 1 ? 'party' : 'parties'}</td><td class="kz-stack" style="padding:7px 0;border-bottom:1px solid #eee;font-size:12px">${ps.map((p) => `${esc(p.when)}, ${esc(p.where)}: ${esc(p.name)} (${p.size})`).join('<br>')}</td></tr>`).join('');
  const detail = flagged.map((p) => `<tr><td class="kz-stack" style="padding:8px 8px 8px 6px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;font-weight:600;${p.allergens?.length ? `border-left:4px solid ${RED};` : ''}">${esc(p.when)}<div style="font-weight:400;font-size:11px;color:${MUTED}">${esc(p.where)}</div></td><td class="kz-stack" style="padding:8px;border-bottom:1px solid #eee;vertical-align:top"><strong>${esc(p.name)}</strong> &middot; ${p.size}<div style="font-size:11px;color:${MUTED}">${p.adults} adults, ${p.children} children</div></td><td class="kz-stack" style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;font-size:12px">${p.allergens?.length ? `<div style="color:${RED};font-weight:600">Allergy: ${esc(p.allergens.join(', '))}</div>` : ''}${p.diet_prefs?.length ? `<div style="font-weight:600">${esc(p.diet_prefs.join(', '))}</div>` : ''}${p.dietary ? `<div>${esc(p.dietary)}</div>` : ''}${p.past_allergens?.length ? `<div style="color:${AMBER}">Noted on a past visit: ${esc(p.past_allergens.join(', '))}</div>` : ''}</td></tr>`).join('');
  const desserts = all.filter((p) => p.plate_message || p.own_cake).map((p) => `<strong>${esc(p.when)}</strong>, ${esc(p.where)}: ${esc(p.name)} (${p.size}) &middot; ${p.plate_message ? `plate message "${esc(p.plate_message)}"` : ''}${p.plate_message && p.own_cake ? ' &middot; ' : ''}${p.own_cake ? 'own cake to store and serve' : ''}`);
  const kids = all.reduce((n, p) => n + (p.children || 0), 0);
  const subject = `Kitchen sheet – ${shortDate(payload.date)} – ${total} covers${flagged.length ? ` – ${flagged.length} with allergies or dietary needs` : ''}`;
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${RED}">Kitchen sheet</p>
    <h1 style="margin:0;font-size:22px;font-weight:500">${esc(niceDate(payload.date))}</h1>
    ${glance([[String(total), 'covers'], [String(kids), "children's meals"], [String(all.filter((p) => p.allergens?.length).length), 'parties with allergies'], [String(all.filter((p) => p.diet_prefs?.length).length), 'parties with dietary needs'], [String(desserts.length), 'celebration desserts']])}
    <h2 style="margin:26px 0 8px;font-size:18px;font-weight:600">Covers</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px"><tr><th style="text-align:left;font-size:11px;color:${MUTED};padding:0 0 6px">Service</th><th style="text-align:right;font-size:11px;color:${MUTED};padding:0 8px 6px">Covers</th><th style="text-align:right;font-size:11px;color:${MUTED};padding:0 8px 6px">Adults</th><th style="text-align:right;font-size:11px;color:${MUTED};padding:0 0 6px">Children</th></tr>${covers}<tr><td style="padding:8px 0;font-weight:600">Total</td><td style="padding:8px;text-align:right;font-weight:600">${total}</td><td></td><td></td></tr></table>
    ${matrix ? `<h2 style="margin:26px 0 8px;font-size:18px;font-weight:600">Allergies and dietary needs at a glance</h2><table style="width:100%;border-collapse:collapse;font-size:13px">${matrix}</table>` : `<p style="margin:22px 0 0;font-size:14px">No allergies or dietary needs noted for today.</p>`}
    ${detail ? `<h2 style="margin:26px 0 8px;font-size:18px;font-weight:600">By party, in service order</h2><table style="width:100%;border-collapse:collapse;font-size:13px">${detail}</table>` : ''}
    ${box('Celebration desserts', COPPER, '#f8efe7', desserts)}
    <p style="margin:24px 0 0;font-size:12px;color:${MUTED}">Allergies apply to at least one guest in the party; check with the server which guest before plating. Late changes arrive as separate emails.</p>`, 760);
  return { subject, html };
}

async function sendSheet(from: string, key: string, r: Recips, msg: { subject: string; html: string }, prefix: string) {
  if (!r.to.length) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Idempotency-Key': await hashKey(prefix, msg.subject + msg.html + r.to.join() + r.cc.join()) },
    body: JSON.stringify({ from, to: r.to, ...(r.cc.length ? { cc: r.cc } : {}), subject: msg.subject, html: msg.html }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
}

async function processRunSheets() {
  let sent = 0;
  const names = await tableNames();
  for (let i = 0; i < 3; i++) {
    const rows = (await rpc('claim_run_sheet', {})) ?? [];
    if (!rows.length) break;
    const r = rows[0];
    try {
      const p: Sheet = r.payload ?? { sessions: [] };
      const total = (p.sessions ?? []).reduce((n: number, s: Sess) => n + (s.party_count ?? 0), 0) + (p.dining ?? []).length + (p.events ?? []).length;
      if (total === 0) { await rpc('complete_run_sheet', { p_date: r.service_date, p_ok: true, p_error: null }); continue; }
      const key = ENV_KEY || r.resend_api_key;
      await sendSheet(r.from_email, key, await recips('run_sheet'), floorSheet(p, names), `floor-${r.service_date}-`);
      await sendSheet(r.from_email, key, await recips('kitchen'), kitchenSheet(p, names), `kitchen-${r.service_date}-`);
      await rpc('complete_run_sheet', { p_date: r.service_date, p_ok: true, p_error: null });
      sent++;
    } catch (e) {
      await rpc('complete_run_sheet', { p_date: r.service_date, p_ok: false, p_error: String(e) });
    }
  }
  return sent;
}

// ---------- Second outbox: changes, staff cancellations, morning summary, late changes, password resets ----------
type Note = { outbox_id: string; kind: string; to_email: string; payload: any; from_email: string; guest_reply_to: string; manage_url: string; staff_url: string; resend_api_key: string };

function pRow(p: any): Row {
  return {
    outbox_id: '', kind: 'guest_confirmation', to_email: '', attempts: 0, reference: p.reference, reservation_date: p.date,
    session_label: p.time_label, window_label: p.window_label || p.time_label, adults: p.adults, children: p.children, party_size: p.party_size,
    full_name: p.name || 'Guest', phone: p.phone || '', email: p.email || '', location: null, occasion: p.occasion ?? null, dietary: p.dietary ?? null,
    requests: p.requests ?? null, status: p.status, is_test: !!p.is_test, from_email: '', guest_reply_to: '', resend_api_key: '',
    allergens: p.allergens ?? [], table_codes: null, manage_token: p.manage_token ?? null, service: p.service, seating_pref: p.seating_pref ?? null, session_time: p.session_time,
    diet_prefs: p.diet_prefs ?? [], celebrant: p.celebrant ?? null, plate_message: p.plate_message ?? null, own_cake: !!p.own_cake, high_chairs: p.high_chairs ?? 0, wheelchair: !!p.wheelchair,
  };
}

function bookingUpdated(n: Note) {
  const r = pRow(n.payload);
  const changes: string[] = n.payload.changes ?? [];
  const uw = worded('updated', r, `${T(r)}Your Kazumi booking is updated – ${r.reference}`,
    `We've updated your booking${changes.length ? ` (${esc(changes.join('; '))})` : ''}. Here are your new details.`, { changes: changes.length ? ` (${changes.join('; ')})` : '' });
  const subject = uw.subject;
  const html = wrap(`${hello(r)}${lead(uw.intro)}
    ${rowsTable(details(r))}
    ${P("If anything doesn't look right, just reply to this email and we'll sort it out.")}
    ${button(link(r, n.manage_url), 'View or cancel booking')}
    ${signoff('See you soon')}`);
  return { subject, html, reply_to: n.guest_reply_to };
}

function cancelledByUs(n: Note) {
  const r = pRow(n.payload);
  const bw = worded('cancelled_by_us', r, `${T(r)}We're sorry: your Kazumi booking is cancelled – ${r.reference}`, "We're very sorry, but we've had to cancel your booking.");
  const subject = bw.subject;
  const html = wrap(`${hello(r)}${lead(bw.intro)}
    ${n.payload.reason ? lead(esc(n.payload.reason)) : ''}
    ${rowsTable([['Reference', r.reference], ['Booking', svcName(r)], ['Date', niceDate(r.reservation_date)], [timeLabel(r), timeValue(r)], ['Guests', String(r.party_size)]])}
    ${P("We'd love to make it up to you with another date. Reply to this email and we'll help you find one.")}
    ${signoff('With apologies')}`);
  return { subject, html, reply_to: n.guest_reply_to };
}

function lateChange(n: Note) {
  const r = pRow(n.payload);
  const subject = `${T(r)}LATE CHANGE – ${svcShort(r)} ${r.session_label} – ${r.full_name} (${r.party_size})`;
  const rows: [string, string][] = [['Change', n.payload.change || 'Updated'], ['By', n.payload.actor || ''], ['Reference', r.reference], ['Booking', svcName(r)],
    [timeLabel(r), timeValue(r)], ['Guests', `${r.party_size} (${r.adults} adults, ${r.children} children)`], ['Status', r.status]];
  if (svc(r) === 'teppanyaki') rows.push(['Grill', n.payload.tables || 'Needs a grill']);
  rows.push(['Allergies', r.allergens?.length ? r.allergens.join(', ') : 'None'], ['Dietary needs', [...(n.payload.diet_prefs ?? []), clean(r.dietary)].filter(Boolean).join(', ') || 'None']);
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9b3a32">Change after today's run sheet</p>
    <h1 style="margin:0 0 18px;font-size:22px;font-weight:500">${esc(r.full_name)} &middot; ${r.party_size} guests</h1>
    ${r.allergens?.length ? note('#9b3a32', '#fbefed', `<strong>Allergies:</strong> ${esc(r.allergens.join(', '))}`) : ''}
    ${rowsTable(rows)}
    <p style="margin:20px 0 0;font-size:13px;color:#6f6258">The staff app always shows the latest seating.</p>`);
  return { subject, html, reply_to: n.guest_reply_to };
}

function staffDigest(n: Note) {
  const p = n.payload;
  const services: any[] = p.services ?? [];
  const total = services.reduce((s, x) => s + (x.guests || 0), 0);
  const svcRows = services.filter((x) => x.bookings > 0).map((x) => `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee">${esc(x.name)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right"><strong>${x.guests}</strong> guests &middot; ${x.bookings} ${x.bookings === 1 ? 'booking' : 'bookings'}</td></tr>`).join('');
  const reqs: any[] = p.requests ?? [];
  const reqRows = reqs.map((q) => `<li style="margin:0 0 6px;${q.hours_waiting >= 24 ? 'color:#9b3a32;font-weight:600' : ''}">${esc(q.name)} (${q.size}) &middot; ${esc(q.service === 'event' ? 'Event' : q.service === 'teppanyaki' ? 'Teppanyaki' : 'Table')} ${esc(shortDate(q.date))} ${esc(q.time)} &middot; waiting ${q.hours_waiting < 1 ? 'under an hour' : `${q.hours_waiting} hours`}${q.hours_waiting >= 24 ? ' (overdue)' : ''}</li>`).join('');
  const alg: any[] = p.allergies ?? [];
  const algRows = alg.map((a) => `<li>${esc(a.time)} ${esc(a.name)} (${a.size}): ${esc((a.allergens ?? []).join(', '))}${a.dietary ? ` &middot; ${esc(a.dietary)}` : ''}</li>`).join('');
  const uns: any[] = p.unseated ?? [];
  const overdue = reqs.filter((q) => q.hours_waiting >= 24).length;
  const subject = `Today at Kazumi – ${shortDate(p.date)} – ${total} guests${reqs.length ? ` – ${reqs.length} ${reqs.length === 1 ? 'request' : 'requests'} waiting${overdue ? ` (${overdue} overdue)` : ''}` : ''}`;
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9b5f37">Morning summary</p>
    <h1 style="margin:0 0 18px;font-size:22px;font-weight:500">${esc(niceDate(p.date))}</h1>
    ${svcRows ? `<table style="width:100%;border-collapse:collapse;font-size:14px">${svcRows}<tr><td style="padding:8px 0;font-weight:600">Total</td><td style="padding:8px 0;text-align:right;font-weight:600">${total} guests</td></tr></table>` : '<p style="font-size:14px">No bookings today yet.</p>'}
    ${uns.length ? note('#8a5a24', '#fbf3e8', `<strong>${uns.length} Teppanyaki ${uns.length === 1 ? 'party needs' : 'parties need'} a grill:</strong> ${esc(uns.map((u) => `${u.name} (${u.size}) ${u.time}`).join(', '))}`) : ''}
    ${algRows ? `<div style="margin:16px 0;padding:12px 14px;background:#fbefed;border-left:3px solid #9b3a32;font-size:14px"><strong>Allergies today</strong><ul style="margin:6px 0 0;padding-left:18px">${algRows}</ul></div>` : ''}
    ${reqRows ? `<h2 style="margin:22px 0 8px;font-size:16px">Requests waiting for a reply</h2><ul style="margin:0;padding-left:18px;font-size:14px">${reqRows}</ul>` : ''}
    ${p.health && p.health.ok === false ? `<div style="margin:16px 0;padding:12px 14px;background:#fbefed;border-left:3px solid #9b3a32;font-size:14px"><strong>System check found a problem</strong>${healthRows(p.health.checks ?? [])}</div>` : p.health && p.health.ok ? P('System check this morning: everything is working.') : ''}
    ${p.unmarked ? P(`${p.unmarked} past ${p.unmarked === 1 ? 'booking is' : 'bookings are'} still to be marked as arrived or no-show. Please update them in the staff app.`) : ''}
    ${button(n.staff_url, 'Open the staff app')}`);
  return { subject, html, reply_to: n.guest_reply_to };
}

function healthRows(checks: any[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${checks.map((c) => `<tr><td style="padding:7px 12px 7px 0;border-bottom:1px solid #eee;font-weight:600;color:${c.ok ? '#2f6b3a' : '#9b3a32'};white-space:nowrap">${c.ok ? 'Working' : 'Problem'}</td><td style="padding:7px 12px 7px 0;border-bottom:1px solid #eee">${esc(c.check)}</td><td style="padding:7px 0;border-bottom:1px solid #eee;color:#6f6258">${esc(c.detail)}</td></tr>`).join('')}</table>`;
}

function systemAlert(n: Note) {
  const checks: any[] = n.payload.checks ?? [];
  const bad = checks.filter((c) => !c.ok);
  const subject = `Kazumi system check: ${bad.length} ${bad.length === 1 ? 'problem needs' : 'problems need'} attention`;
  const html = wrap(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9b3a32">System check</p>
    <h1 style="margin:0 0 18px;font-size:22px;font-weight:500">${esc(bad.map((c) => c.check).join(', ') || 'A check failed')}</h1>
    ${healthRows(checks)}
    ${P('What to do: open the staff app and look at Needs action. If online booking is affected, take bookings by phone in the paper book and contact the system owner straight away.')}
    ${button(n.staff_url, 'Open the staff app')}`);
  return { subject, html, reply_to: n.guest_reply_to };
}

function staffReset(n: Note) {
  const subject = 'Reset your Kazumi staff password';
  const html = wrap(`
    <p style="margin:0 0 16px;font-size:16px">Hi ${esc(n.payload.name || 'there')},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Someone asked to reset the password for your Kazumi staff account. Use the button below within one hour to choose a new password.</p>
    ${button(n.payload.link, 'Choose a new password')}
    ${P("If you didn't ask for this, you can ignore this email. Your password stays the same.")}`);
  return { subject, html, reply_to: n.guest_reply_to };
}

async function processNotes() {
  let sent = 0;
  const rows: Note[] = (await rpc('claim_notify_outbox', { p_limit: 20 })) ?? [];
  for (const n of rows) {
    try {
      const msg = n.kind === 'booking_updated' ? bookingUpdated(n) : n.kind === 'cancelled_by_us' ? cancelledByUs(n)
        : n.kind === 'late_change' ? lateChange(n) : n.kind === 'staff_digest' ? staffDigest(n) : n.kind === 'system_alert' ? systemAlert(n) : staffReset(n);
      const key = ENV_KEY || n.resend_api_key;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'Idempotency-Key': `n-${n.outbox_id}` },
        body: JSON.stringify({ from: n.from_email, to: [n.to_email], ...(n.kind === 'staff_digest' || n.kind === 'system_alert' ? ccFor(n.to_email, (await recips('alert')).cc) : {}), reply_to: msg.reply_to, subject: msg.subject, html: msg.html }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
      await rpc('complete_notify_outbox', { p_id: n.outbox_id, p_ok: true, p_message_id: body.id ?? null, p_error: null });
      sent++;
    } catch (e) {
      await rpc('complete_notify_outbox', { p_id: n.outbox_id, p_ok: false, p_message_id: null, p_error: String(e) });
    }
  }
  return sent;
}

Deno.serve(async () => {
  const keySource = ENV_KEY ? 'edge_function_secret' : 'vault';
  SETTINGS = null;
  try {
    await settings(); // the restaurant profile, for every email in this run
    const rows: Row[] = (await rpc('claim_email_outbox', { p_limit: 20 })) ?? [];
    let sent = 0, failed = 0;
    for (const r of rows) {
      try {
        const id = await send(r);
        await rpc('complete_email_outbox', { p_id: r.outbox_id, p_ok: true, p_message_id: id, p_error: null });
        sent++;
      } catch (e) {
        await rpc('complete_email_outbox', { p_id: r.outbox_id, p_ok: false, p_message_id: null, p_error: String(e) });
        failed++;
      }
    }
    let runSheets = 0, notes = 0;
    try { notes = await processNotes(); } catch (e) { console.error('notes', e); }
    try { runSheets = await processRunSheets(); } catch (e) { console.error('run sheet', e); }
    return new Response(JSON.stringify({ ok: true, keySource, processed: rows.length, sent, failed, notes, runSheets }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, keySource }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
