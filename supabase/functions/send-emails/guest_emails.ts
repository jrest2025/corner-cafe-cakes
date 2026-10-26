// Corner Café cake emails to customers.
// Fewest messages possible: online orders get received, confirmed and thank-you; staff-entered orders get confirmed and thank-you.
// Each email: the approved Corner Café logo, one clear status, the order as the hero, the next step, then contact details.
// A small "More to enjoy from Jack's Restaurants" section appears only in the confirmation and thank-you emails,
// and only when the customer agreed to offers from Jack's Restaurants (d.cross_sell_ok). Cards come from the promo_cards table.
// Every email also has a plain-text version, and an unsubscribe link for offers (d.unsub, added by index.ts).

const LOGO = "https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@b2fa0b25e82552c2f883c56a7d31abd6ec7ff2ec/dist/brand/corner-cafe-logo-email.png";
// Hero cake photo: the approved Corner Café cake photo, square, email-safe JPG, pinned to one commit
const HERO = "https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@82897c74bef2b7e53d2f76ef80f15a86cc14379e/dist/brand/cake-hero-email.jpg";
const SERIF = "Georgia,'Times New Roman',serif", CREAM = "#F7F1E8";
const FONT = "Arial,Helvetica,sans-serif";
const INK = "#2B2622", MUTED = "#6B6560", LINE = "#E7E3DE", SOFT = "#F6F7F4", GREEN = "#4B6339", LEAF = "#5F7A4A", RED = "#A2402B";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: unknown) => "$" + Number(n ?? 0).toFixed(2).replace(/\.00$/, "");
function t12(t: string) { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; }
const dayName = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
const dayMonth = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const longDate = (d: string) => `${dayName(d)} ${dayMonth(d)}`;
const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";

type Row = [string, string, boolean?];
type Mail = { kind: string; subject: string; preheader: string; chip?: [string, "wait" | "good" | "stop" | "quiet"]; heading: string;
  lines: string[]; rows?: Row[]; money?: Row[]; buttons?: [string, string, boolean?][]; after?: string[]; promo?: boolean; hero?: boolean; tagline?: string };

// Days until the cake is due, in Fiji time: "Today", "Tomorrow", "9 days to go"
function countdown(d: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Fiji" }).format(new Date());
  const n = Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 864e5);
  return n < 0 ? "" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : `${n} days to go`;
}
// Google Calendar link for the pickup or delivery (30 minutes, Fiji time)
function calendarLink(d: any) {
  const o = d.order, loc = d.location, dl = isDelivery(o);
  const [h, m] = String(o.required_time).slice(0, 5).split(":").map(Number);
  const day = String(o.required_date).replace(/-/g, "");
  const end = h * 60 + m + 30, hm = (x: number) => String(Math.floor(x / 60)).padStart(2, "0") + String(x % 60).padStart(2, "0") + "00";
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", dl ? `Cake delivery from Corner Café (${o.reference})` : `Collect cake from Corner Café (${o.reference})`);
  u.searchParams.set("dates", `${day}T${hm(h * 60 + m)}/${day}T${hm(Math.min(end, 23 * 60 + 59))}`);
  u.searchParams.set("ctz", "Pacific/Fiji");
  u.searchParams.set("location", dl ? [o.delivery_address, o.delivery_zone].filter(Boolean).join(", ") : `${loc.name}, ${loc.address || ""}`);
  u.searchParams.set("details", `Order ${o.reference}. Questions? Call ${loc.phone || "Corner Café"}.`);
  return u.toString();
}

// ---------- facts about the order ----------
function isRequest(i: any) { return !i.product_id && !i.size_inch; }
function cakeName(i: any) { return isRequest(i) ? ["Custom cake", i.variant].filter(Boolean).join(", ") : (i.variant || i.product_name || "Cake"); }
function sizeText(i: any) { return isRequest(i) ? (i.serves_label || "") : `${i.size_inch} inch${i.serves_label ? ` (${i.serves_label})` : ""}`; }
function mapLink(loc: any) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.name} ${loc.address || ""}`.trim())}`; }
const isDelivery = (o: any) => o.fulfilment_method === "delivery";

function orderRows(d: any): Row[] {
  const o = d.order, i = d.item ?? {};
  const rows: Row[] = [["Cake", cakeName(i)], ["Size", sizeText(i)]];
  if (i.quantity > 1) rows.push(["Quantity", String(i.quantity)]);
  if (i.finish === "custom" || isRequest(i)) rows.push(["Design", i.design_description || "Custom design"]);
  if (i.cake_message) rows.push(["On the cake", `“${i.cake_message}”`]);
  if (i.candles) rows.push(["Candles", i.candles]);
  const treats: any[] = Array.isArray(d.treats) ? d.treats : [];
  if (treats.length) rows.push(["Treats", treats.map((x) => `${x.quantity} × ${x.name}${x.detail ? ` (${x.detail})` : ""}`).join(", ") + ` · ${money(treats.reduce((s, x) => s + Number(x.price) * Number(x.quantity), 0))}`]);
  const REQ: Record<string, string> = { eggless: "Eggless (vegetarian)", gluten_free: "Gluten-free", dairy_free: "Dairy-free", vegan: "Vegan (no egg, no dairy)" };
  const reqs = (i.requirements ?? []).map((k: string) => k === "other" ? (i.requirements_note || "Other") : REQ[k] || k);
  if (reqs.length) rows.push(["Your cake must be", reqs.join(", "), true]);
  if (o.has_dietary) rows.push(["Allergies", [...(i.dietary ?? []), i.dietary_note].filter(Boolean).join(", ") || "Noted on your order", true]);
  else if (o.dietary_status === "unsure") rows.push(["Allergies", "To check with you before we bake", true]);
  rows.push(isDelivery(o) ? ["Delivery to", [o.delivery_address, o.delivery_zone].filter(Boolean).join(", ")] : ["Collect from", `${d.location.name}, ${d.location.address}`]);
  return rows.filter((r) => r[1]);
}
// Delivery orders show the cake and the delivery fee on their own lines, then the total, so the fee is
// visibly part of the total (Roneel, 20 Oct 2026: "Delivery $15, Total $67" read as the fee being missing).
// The cake line is the total less the fee, so it stays right when staff change a price or the fee.
function feeOf(d: any): number { const o = d.order; return isDelivery(o) && Number(o.delivery_fee) > 0 ? Number(o.delivery_fee) : 0; }
function deliveryLabel(o: any) { return o.delivery_zone ? `Delivery (${o.delivery_zone})` : "Delivery"; }
function splitRows(d: any, total: number, cakeLabel = "Cake price"): Row[] {
  const fee = feeOf(d);
  return fee ? [[cakeLabel, money(Math.max(total - fee, 0))], [deliveryLabel(d.order), money(fee)]] : [];
}
function moneyRows(d: any, confirmed: boolean): Row[] {
  const o = d.order, i = d.item ?? {}, paid = Number(d.paid_total ?? 0), fee = feeOf(d);
  const total = Number(o.final_total ?? o.estimate_total ?? 0);
  if (!confirmed) {
    if (isRequest(i)) return fee ? [["Cake price", "We'll send you the price"], [deliveryLabel(o), money(fee)]] : [["Price", "We'll send you the price"]];
    if (o.order_type === "custom") {
      const est = Number(o.estimate_total ?? 0);
      return fee ? [...splitRows(d, est, "Cake, starting price"), ["Starting total", `${money(est)} before your custom design`]]
        : [["Starting price", `${money(est)} before your custom design`]];
    }
    return fee ? [...splitRows(d, total), ["Total", money(total)]] : [["Price", money(total)]];
  }
  const rows: Row[] = [...splitRows(d, total)];
  rows.push(["Total", money(total)]);
  if (paid > 0) rows.push(["Paid", money(paid)]);
  const due = Math.max(total - paid, 0);
  rows.push(["To pay", due > 0 ? `${money(due)} on ${isDelivery(o) ? "delivery" : "collection"}` : "Nothing, all paid"]);
  return rows;
}

// ---------- cross-selling: approved cards, chosen the same way every time for an order ----------
// Order of cards (Roneel, 20 Oct 2026: sell our spaces for booking and our catering with every cake):
// 1. "always" cards (occasions include "*"): a group booking space and catering, every email that carries cards
// 2. cards matched to the cake's occasion
// 3. one sister restaurant, rotated by order number
function pickCards(d: any): any[] {
  const cards: any[] = (d.promo_cards ?? []).filter((c: any) => c && c.is_active !== false && c.title && c.link_url);
  const occ = String(d.item?.occasion || "").toLowerCase();
  const always = cards.filter((c) => (c.occasions || []).includes("*"));
  const special = cards.filter((c) => !always.includes(c) && (c.occasions || []).some((x: string) => occ && occ.includes(String(x).toLowerCase())));
  const venues = cards.filter((c) => !(c.occasions || []).length);
  const n = Number(String(d.order.reference || "").replace(/\D/g, "")) || 0;
  const rotated = venues.length ? venues.map((_, k) => venues[(k + n) % venues.length]) : [];
  const picked = [...always, ...special].slice(0, 2);
  return [...picked, ...rotated.slice(0, 1)].slice(0, 3);
}
function tagged(url: string, kind: string) {
  try { const u = new URL(url); if (!u.searchParams.has("utm_source")) { u.searchParams.set("utm_source", "cornercafe_cakes_email"); u.searchParams.set("utm_medium", "email"); u.searchParams.set("utm_campaign", kind); } return u.toString(); }
  catch { return url; }
}
function promoHtml(cards: any[], kind: string) {
  if (!cards.length) return "";
  const card = (c: any) => `<tr><td style="padding:0 0 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:14px;border-collapse:separate">
    <tr>${c.image_url ? `<td width="38%" valign="top" style="padding:0"><a href="${esc(tagged(c.link_url, kind))}"><img src="${esc(c.image_url)}" width="190" alt="${esc(c.title)}" style="display:block;width:100%;max-width:190px;height:auto;border:0;border-radius:13px 0 0 13px"></a></td>` : ""}
    <td valign="middle" style="padding:14px 16px">
      <div style="font:bold 16px/1.3 ${FONT};color:${INK}">${esc(c.title)}</div>
      <div style="font:14px/1.5 ${FONT};color:${MUTED};margin:5px 0 9px">${esc(c.blurb)}</div>
      <a href="${esc(tagged(c.link_url, kind))}" style="font:bold 14px ${FONT};color:${GREEN};text-decoration:none">${esc(c.link_label)}</a>
    </td></tr></table></td></tr>`;
  return `<tr><td style="padding:4px 28px 14px"><div style="border-top:1px solid ${LINE};padding-top:22px">
    <div style="font:bold 19px/1.3 ${FONT};color:${INK};margin:0 0 4px">More to enjoy from Jack's Restaurants</div>
    <div style="font:14px/1.6 ${FONT};color:${MUTED};margin:0 0 14px">Parties, group bookings and catering from our family of restaurants.</div></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards.map(card).join("")}</table></td></tr>`;
}
function promoText(cards: any[], kind: string) {
  if (!cards.length) return "";
  return "\n\nMore to enjoy from Jack's Restaurants\n" + cards.map((c) => `- ${c.title}: ${c.blurb} ${tagged(c.link_url, kind)}`).join("\n");
}

// ---------- the shell (tables and inline styles, so Gmail, Outlook and Apple Mail agree) ----------
function chip(text: string, tone: "wait" | "good" | "stop" | "quiet") {
  const t = { wait: ["#FBEFE3", "#7A4A17"], good: ["#E9EDDF", "#3E5530"], stop: ["#F8E5E1", "#8E2F22"], quiet: [SOFT, MUTED] }[tone];
  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${t[0]};color:${t[1]};font:bold 12px ${FONT};letter-spacing:.06em;text-transform:uppercase">${esc(text)}</span>`;
}
function table(rows: Row[]) {
  return rows.map(([k, v, alert]) => `<tr><td width="128" valign="top" style="padding:8px 0;font:13px/1.5 ${FONT};color:${MUTED}">${esc(k)}</td>
    <td style="padding:8px 0;font:${alert ? "bold " : ""}15px/1.5 ${FONT};color:${alert ? RED : INK}">${esc(v)}</td></tr>`).join("");
}
function orderCard(d: any, rows: Row[], money: Row[]) {
  const o = d.order;
  const cell = (label: string, value: string, border: boolean) => `<td width="33%" valign="top" style="padding:14px 12px;${border ? `border-left:1px solid ${LINE};` : ""}">
    <div style="font:12px ${FONT};color:${MUTED};letter-spacing:.06em;text-transform:uppercase">${esc(label)}</div>
    <div style="font:bold 17px/1.3 ${FONT};color:${GREEN};margin-top:4px">${esc(value)}</div></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:14px;border-collapse:separate;margin:6px 0 20px">
    <tr>${cell(dayName(o.required_date), dayMonth(o.required_date), false)}${cell(isDelivery(o) ? "Delivery" : "Pickup", t12(o.required_time), true)}${cell("Order", o.reference, true)}</tr>
    <tr><td colspan="3" style="border-top:1px solid ${LINE};padding:6px 14px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${table(rows)}</table></td></tr>
    ${money.length ? `<tr><td colspan="3" style="border-top:1px solid ${LINE};padding:6px 14px 8px;background:${SOFT};border-radius:0 0 14px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${table(money)}</table></td></tr>` : ""}
  </table>`;
}
function button(href: string, label: string, outline = false) {
  const style = outline
    ? `display:inline-block;padding:12px 18px;white-space:nowrap;border:1.5px solid ${GREEN};border-radius:999px;background:#ffffff;color:${GREEN};text-decoration:none;font:bold 15px ${FONT}`
    : `display:inline-block;padding:13px 20px;white-space:nowrap;border-radius:999px;background:${LEAF};color:#ffffff;text-decoration:none;font:bold 15px ${FONT}`;
  return `<a href="${esc(href)}" style="${style}">${esc(label)}</a>`;
}
const para = (s: string, extra = "") => `<p style="margin:0 0 14px;font:16px/1.6 ${FONT};color:${INK};${extra}">${s}</p>`;

function render(d: any, m: Mail): { subject: string; html: string; text: string } {
  const loc = d.location;
  const cards = m.promo && d.cross_sell_ok ? pickCards(d) : [];
  const tel = String(loc.phone || "").replace(/[^\d+]/g, "");
  const body = (m.hero ? "" : (m.chip ? chip(m.chip[0], m.chip[1]) : "") +
    `<h1 style="margin:${m.chip ? "14px" : "0"} 0 10px;font:bold 26px/1.25 ${FONT};color:${INK}">${esc(m.heading)}</h1>`) +
    m.lines.map((l) => para(l)).join("") +
    (m.rows ? orderCard(d, m.rows, m.money ?? []) : "") +
    (m.buttons?.length ? `<div style="margin:0 0 18px;font-size:0;line-height:0">${m.buttons.map(([l, u, o]) => `<div style="display:inline-block;margin:0 10px 10px 0">${button(u, l, o)}</div>`).join("")}</div>` : "") +
    (m.after ?? []).map((l) => para(l, `font-size:15px;color:${MUTED}`)).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(loc.name)}</title></head>
<body style="margin:0;padding:0;background:#F1F2EE">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F2EE"><tr><td align="center" style="padding:22px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;border-collapse:separate">
  <tr><td align="center" style="padding:22px 24px 6px"><img src="${LOGO}" width="150" height="55" alt="Corner Café" style="display:block;width:150px;height:auto;border:0;font:bold 22px ${FONT};color:${INK}"></td></tr>
  ${m.hero ? `<tr><td style="padding:0 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CREAM}" style="background:${CREAM};border-radius:16px;border-collapse:separate"><tr><td style="padding:22px 18px 18px;font-size:0;line-height:0" align="center">
    <div style="display:inline-block;width:100%;max-width:300px;vertical-align:middle;text-align:left;font-size:16px;line-height:1.4">
      ${m.chip ? `<div style="font:bold 12px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${GREEN};margin:0 0 10px">${esc(m.chip[0])}</div>` : ""}
      <div style="font:30px/1.15 ${SERIF};color:${INK};margin:0 0 10px">${esc(m.heading)}</div>
      <div style="font:15px/1.5 ${FONT};color:${MUTED};margin:0 0 6px">${esc(m.tagline || "Make every moment sweeter.")}</div>
    </div>${HERO ? `<div style="display:inline-block;width:100%;max-width:220px;vertical-align:middle;padding:12px 0 0"><img src="${HERO}" width="220" height="220" alt="A celebration cake from Corner Café" style="display:block;width:100%;max-width:220px;height:auto;border:0;border-radius:14px;margin:0 auto"></div>` : ""}
  </td></tr></table></td></tr>` : ""}
  <tr><td style="padding:${m.hero ? "22px" : "20px"} 28px 6px">${body}</td></tr>
  ${promoHtml(cards, m.kind)}
  <tr><td style="padding:20px 28px 24px;background:${SOFT};border-radius:0 0 18px 18px">
    <div style="font:bold 15px ${FONT};color:${INK}">${esc(loc.name)}</div>
    <div style="font:14px/1.6 ${FONT};color:${MUTED};margin-top:4px">${esc(loc.address || "")}<br><a href="tel:${esc(tel)}" style="color:${GREEN};text-decoration:none">${esc(loc.phone || "")}</a>${loc.email ? ` &middot; <a href="mailto:${esc(loc.email)}" style="color:${GREEN};text-decoration:none">${esc(loc.email)}</a>` : ""}</div>
    <div style="font:12px/1.6 ${FONT};color:${MUTED};margin-top:12px">You're receiving this because you ordered a cake from ${esc(loc.name)}, part of
      <a href="https://www.jacksrestaurantsfiji.com/" style="color:${MUTED}">Jack's Restaurants Fiji</a>.</div>
    ${d.unsub ? `<div style="font:12px/1.6 ${FONT};color:${MUTED};margin-top:6px">Don't want cake specials or offers from us? <a href="${esc(d.unsub.page)}" style="color:${MUTED}">Unsubscribe</a>. You'll still get emails about your orders.</div>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const o = d.order;
  const text = [
    m.chip ? `[${m.chip[0]}]` : "", m.heading, "", ...m.lines.map(strip), "",
    ...(m.rows ? [`${longDate(o.required_date)}, ${t12(o.required_time)} (${isDelivery(o) ? "delivery" : "pickup"}), order ${o.reference}`,
      ...m.rows.map(([k, v]) => `${k}: ${v}`), ...(m.money ?? []).map(([k, v]) => `${k}: ${v}`), ""] : []),
    ...(m.buttons ?? []).map(([l, u]) => `${l}: ${u}`), ...(m.after ?? []).map(strip),
  ].filter((x, k, a) => !(x === "" && a[k - 1] === "")).join("\n").trim() + promoText(cards, m.kind) +
    `\n\n${loc.name}\n${loc.address || ""}\n${loc.phone || ""}${loc.email ? " · " + loc.email : ""}` +
    (d.unsub ? `\n\nDon't want cake specials or offers from us? Unsubscribe: ${d.unsub.page}\nYou'll still get emails about your orders.` : "");
  return { subject: m.subject, html, text };
}

// ---------- the emails ----------
export function buildGuest(kind: string, d: any): { subject: string; html: string; text: string } | null {
  const o = d.order, i = d.item ?? {}, c = d.customer ?? {}, loc = d.location, cfg = d.config ?? {};
  const name = first(c.full_name || o.contact_name);
  const ref = o.reference;
  const when = `${longDate(o.required_date)} at ${t12(o.required_time)}`;
  const tel = String(loc.phone || "").replace(/[^\d+]/g, "");
  const reply = `Questions? Reply to this email or call <a href="tel:${esc(tel)}" style="color:${GREEN}">${esc(loc.phone)}</a> and quote ${esc(ref)}.`;
  const contact = c.preferred_contact === "whatsapp" ? "WhatsApp or email" : "email";
  switch (kind) {
    case "guest_received":
      return render(d, { kind, subject: `Corner Café | We've received your cake order (${ref})`,
        preheader: "Not confirmed yet. We'll be in touch once we've checked the details.",
        chip: ["Order received", "wait"], heading: `Bula ${name}, thanks for your order!`, hero: true,
        lines: [isRequest(i) || o.order_type === "custom"
          ? `We've received your cake request. Our team will look at your design and send you the price.`
          : `We've received your cake request. Our team will check the details and confirm your order shortly.`,
          `<strong>Your order isn't confirmed yet.</strong> We'll ${c.preferred_contact === "whatsapp" ? "message you on WhatsApp or " : ""}email you once it is.`],
        rows: orderRows(d), money: moneyRows(d, false), after: [reply] });
    case "guest_quote":
      return render(d, { kind, subject: `Corner Café | The price for your cake (${ref})`,
        preheader: "Here's your price. Let us know to go ahead.",
        chip: ["Your price is ready", "wait"], heading: `Bula ${name}, here's your price`, hero: true, tagline: "Let us know and we'll book it in.",
        lines: [`Thanks for your patience. Here are the details and the price.`],
        rows: orderRows(d), money: feeOf(d) ? [...splitRows(d, Number(o.final_total ?? o.estimate_total ?? 0)), ["Total", money(o.final_total ?? o.estimate_total)]] : [["Price", money(o.final_total ?? o.estimate_total)]],
        after: [`<strong>Your cake isn't booked yet.</strong> To go ahead, reply to this email or call <a href="tel:${esc(tel)}" style="color:${GREEN}">${esc(loc.phone)}</a>. We'll confirm it once we hear back.`,
          `Want to change something? Just tell us and we'll update the details and the price.`] });
    case "guest_deposit_needed":
      return render(d, { kind, subject: `Corner Café | One step left: your deposit (${ref})`,
        preheader: `A deposit of ${money(o.deposit_required)} locks in your cake.`,
        chip: ["Deposit needed", "wait"], heading: `Good news, ${name}. We can make your cake.`,
        lines: [`To lock it in, we need a deposit of <strong>${money(o.deposit_required)}</strong>. You can pay at the café counter by cash, EFTPOS or M-PAiSA. For a bank transfer, reply to this email and we'll send the details.`,
          `Your order is confirmed once the deposit is received.`],
        rows: orderRows(d), money: [...splitRows(d, Number(o.final_total ?? o.estimate_total ?? 0)), ["Total", money(o.final_total ?? o.estimate_total)], ["Deposit", money(o.deposit_required)]], after: [reply] });
    case "guest_confirmed":
    case "guest_updated": {
      const upd = kind === "guest_updated";
      return render(d, { kind, subject: upd ? `Corner Café | Your cake order has changed (${ref})` : `Corner Café | Your cake order is confirmed! (${ref})`,
        preheader: `${cakeName(i)}, ${isDelivery(o) ? "delivery" : "pickup"} ${when}.`,
        chip: [["Confirmed", countdown(o.required_date)].filter(Boolean).join(" · "), "good"], heading: upd ? `Your order is updated, ${name}` : `Bula ${name}, your cake is confirmed!`, hero: true,
        lines: [upd ? `Here are your new details. Please check them, and tell us if anything looks wrong.`
          : isDelivery(o) ? `It's all booked in. We'll deliver it on ${esc(when)}.` : `It's all booked in. We'll have it ready for you on ${esc(when)}.`],
        rows: orderRows(d), money: moneyRows(d, true),
        buttons: [["Add to calendar", calendarLink(d)], ...(isDelivery(o) ? [] : [["Get directions", mapLink(loc), true] as [string, string, boolean]])],
        after: [reply], promo: !upd });
    }
    case "guest_declined":
      return render(d, { kind, subject: `Corner Café | About your cake order (${ref})`,
        preheader: "We're not able to take this order.",
        chip: ["Not available", "stop"], heading: `Sorry, ${name}. We can't make this one.`,
        lines: [`We're not able to take your cake order for ${esc(when)}.`,
          ...(o.decline_reason ? [`A note from our team: <em>${esc(o.decline_reason)}</em>`] : []),
          `We'd still love to help. Call <a href="tel:${esc(tel)}" style="color:${GREEN}">${esc(loc.phone)}</a> and we'll find another date or option.`],
        buttons: loc.order_page_url ? [["Choose another date", loc.order_page_url]] : [] });
    case "guest_cancelled":
      return render(d, { kind, subject: `Corner Café | Your cake order is cancelled (${ref})`,
        preheader: `Order ${ref} for ${when} is cancelled.`,
        chip: ["Cancelled", "quiet"], heading: `Your cake order is cancelled, ${name}.`,
        lines: [`Order ${esc(ref)} for ${esc(when)} has been cancelled.`,
          ...(Number(d.paid_total) > 0 ? [`Our team will be in touch about the ${money(d.paid_total)} you've paid.`] : []),
          `If this doesn't look right, reply to this email or call <a href="tel:${esc(tel)}" style="color:${GREEN}">${esc(loc.phone)}</a>.`] });
    case "guest_thanks": {
      const link = cfg.review_link || "";
      return render(d, { kind, subject: `Thank you, ${name}. How was your cake?`,
        preheader: "A quick review helps other cake lovers find us.",
        chip: ["Thank you", "good"], heading: `Vinaka, ${name}!`, hero: true, tagline: "We hope it made the day sweeter.",
        lines: [`Thank you for choosing Corner Café for your cake. We hope it was a hit${isDelivery(o) ? " and arrived just as you pictured it" : ""}.`,
          ...(link ? [`If you enjoyed it, a quick Google review would mean a lot to our team. It takes less than a minute.`] : [])],
        buttons: link ? [["Leave a Google review", link]] : [],
        after: [`Something we could do better? Reply to this email. It comes straight to us.`,
          ...(loc.order_page_url ? [`Next celebration coming up? <a href="${esc(loc.order_page_url)}" style="color:${GREEN}">Order your next cake online</a>.`] : [])],
        promo: true });
    }
    default:
      return null;
  }
}
