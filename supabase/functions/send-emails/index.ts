// Corner Cafe Cakes: email sender.
// op "process" sends queued emails. Called by the database (trigger and 5-minute retry), protected by the cron key.
// Test mode sends every email to the test address with a [TEST] subject prefix.

// Kitchen slip PDF layout (shipped with this function); the logo is fetched from one pinned commit and is optional
import { buildSlipPdf, slipFileName, SLIP_REF } from "./slip_pdf.js";
import { slipEmailHtml } from "./slip_email.js";
// Customer emails: Corner Café logo and layout, plain-text version, cross-selling only where allowed
import { buildGuest } from "./guest_emails.ts";
const SLIP_LOGO_URL = "https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@6879294bbce62e730bdf5b1af8c2b3e931a06fb5/dist/brand/slip-logo-white.png";
let logoCache: Uint8Array | null = null;
async function slipLogo() { if (logoCache) return logoCache; try { const r = await fetch(SLIP_LOGO_URL); if (r.ok) logoCache = new Uint8Array(await r.arrayBuffer()); } catch (_e) { /* the slip falls back to the name in text */ } return logoCache; }

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// Unsubscribe links in guest emails: the order id signed with HMAC-SHA256 of "cc-unsub-v1:<order id>" (same as the unsubscribe function)
async function unsubSign(orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SB_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("cc-unsub-v1:" + orderId))).slice(0, 18);
  return btoa(String.fromCharCode(...mac)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubLinks(orderId: string, d: any) {
  const id = String(orderId).toLowerCase(), s = await unsubSign(id), q = `o=${id}&s=${s}`;
  let site = "https://www.cornercafefiji.com";
  try { if (d?.location?.order_page_url) site = new URL(d.location.order_page_url).origin; } catch (_e) { /* keep the default */ }
  return { page: `${site}/unsubscribe?${q}`, post: `${SB_URL}/functions/v1/unsubscribe?${q}` };
}

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const t = await r.text();
  const body = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(`${path}: ${r.status} ${t.slice(0, 300)}`);
  return body;
}
const rpc = (fn: string, args: Record<string, unknown>) => db(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

// ---------- formatting ----------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: unknown) => "$" + Number(n ?? 0).toFixed(2).replace(/\.00$/, "");
function t12(t: string) { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? " AM" : " PM"}`; }
function longDate(d: string) { return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); }
const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";
const SOURCES: Record<string, string> = { online: "Online", walk_in: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", social: "Social media", corporate: "Corporate" };
function waLink(phone: string) { let d = String(phone || "").replace(/\D/g, ""); if (d.length === 7) d = "679" + d; return "https://wa.me/" + d; }

const ESP = "#3A271F", CREAM = "#F6F1E8", HONEY = "#8C5A22", RED = "#A2402B";
function layout(loc: any, heading: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:#2F2A26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:${ESP};padding:18px 26px;color:${CREAM};font-family:Georgia,serif;font-size:20px">${esc(loc.name)} <span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9B9A8">&nbsp;Cakes</span></td></tr>
<tr><td style="padding:26px">
<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.25;color:${ESP}">${esc(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:14px 26px 22px;font-size:12px;color:#7A6F66;border-top:1px solid #EEE9E2">${esc(loc.name)} · ${esc(loc.address)} · ${esc(loc.phone)}</td></tr>
</table></td></tr></table></body></html>`;
}
const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${s}</p>`;
const btn = (href: string, label: string, ghost = false) => `<a href="${esc(href)}" style="display:inline-block;padding:13px 24px;margin:4px 8px 14px 0;background:${ghost ? "#ffffff" : ESP};color:${ghost ? ESP : "#ffffff"};border:2px solid ${ESP};text-decoration:none;font-weight:bold;font-size:15px">${esc(label)}</a>`;
function table(rows: [string, string][], alert: string[] = []) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 18px;background:#FBF8F2;border:1px solid #EEE9E2">` +
    rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#7A6F66;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:8px 12px;font-size:15px;${alert.includes(k) ? `color:${RED};font-weight:bold` : ""}">${esc(v)}</td></tr>`).join("") + `</table>`;
}

// ---------- staff alert: white, scannable, the allergy and the date first ----------
const INK = "#2B2622", MUTED = "#6B6560", LINE = "#E7E3DE", GREEN = "#5F7A4A";
function fijiToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Fiji" }).format(new Date()); }
function daysAway(d: string) {
  const n = Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(fijiToday() + "T12:00:00Z")) / 864e5);
  return n < 0 ? "date has passed" : n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}
function phoneShow(p: string) { const d = String(p || "").replace(/\D/g, ""); return d.length === 7 ? `${d.slice(0, 3)} ${d.slice(3)}` : d.length === 10 && d.startsWith("679") ? `${d.slice(3, 6)} ${d.slice(6)}` : String(p || ""); }
function telLink(p: string) { let d = String(p || "").replace(/\D/g, ""); if (d.length === 7) d = "679" + d; return "tel:+" + d; }
const fact = (label: string, value: string, sub = "") =>
  `<tr><td style="padding:12px 0;border-bottom:1px solid ${LINE}"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-bottom:3px">${esc(label)}</div>` +
  `<div style="font-size:17px;font-weight:bold;color:${INK};line-height:1.35">${value}</div>${sub ? `<div style="font-size:14px;color:${MUTED};margin-top:2px">${sub}</div>` : ""}</td></tr>`;
const smallBtn = (href: string, label: string, primary = false) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:${primary ? "14px 26px" : "12px 20px"};margin:0 8px 10px 0;background:${primary ? GREEN : "#ffffff"};color:${primary ? "#ffffff" : GREEN};border:2px solid ${GREEN};border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">${esc(label)}</a>`;

// Seasonal treats on the order (Settings > Seasonal items), for example "2 × Mince Pies (Pack of 3), 1 × Gingerbread House · $59"
function treatsLine(d: any): string {
  const t: any[] = Array.isArray(d.treats) ? d.treats : [];
  if (!t.length) return "";
  const sum = t.reduce((s, x) => s + Number(x.price) * Number(x.quantity), 0);
  return t.map((x) => `${x.quantity} × ${x.name}${x.detail ? ` (${x.detail})` : ""}`).join(", ") + ` · ${money(sum)}`;
}
function staffNewOrder(d: any): { subject: string; html: string } {
  const o = d.order, i = d.item ?? {}, c = d.customer ?? {}, loc = d.location, cfg = d.config ?? {};
  const custom = o.order_type === "custom";
  const manual = cfg.guest_emails !== "true";
  const name = o.contact_name || c.full_name || "Customer";
  const phone = o.contact_phone || c.phone || "";
  const email = o.contact_email || c.email || "";
  const diet = o.has_dietary ? [...(i.dietary ?? []), i.dietary_note].filter(Boolean).join(", ") || "See the order" : "";
  const reqTxt = (i.requirements ?? []).map((k: string) => k === "other" ? (i.requirements_note || "Other") : ({ eggless: "Eggless (vegetarian)", gluten_free: "Gluten-free", dairy_free: "Dairy-free", vegan: "Vegan (no egg, no dairy)" } as Record<string, string>)[k] || k).join(", ");
  const delivery = o.fulfilment_method === "delivery";
  const when = `${longDate(o.required_date)}, ${t12(o.required_time)}`;
  const paid = Number(d.paid_total ?? 0), total = Number(o.final_total ?? o.estimate_total ?? 0);
  const subject = `New ${custom ? "custom cake request" : "cake order"} ${o.reference} · ${new Date(o.required_date + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}` +
    (reqTxt ? " · " + reqTxt.toUpperCase() : "") + (diet ? " · ALLERGY" : "") + (o.rush_override ? " · SHORT NOTICE" : "");

  const kv = (k: string, v: string) => v ? `<tr><td style="padding:7px 0;width:118px;vertical-align:top;font-size:13px;color:${MUTED}">${esc(k)}</td><td style="padding:7px 0;font-size:15px;font-weight:bold;color:${INK};line-height:1.4;word-break:break-word">${v}</td></tr>` : "";
  const section = (n: string, title: string, inner: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:10px">` +
    `<tr><td style="padding:10px 16px;border-bottom:1px solid ${LINE};font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${GREEN}">${n}&nbsp;&nbsp;${esc(title)}</td></tr>` +
    `<tr><td style="padding:8px 16px 10px">${inner}</td></tr></table>`;
  const grid = (rows: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">${rows}</table>`;
  const status = custom ? "Needs a quote" : "Needs review";

  // Title block: reference on the left, what to do on the right
  let b = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr>` +
    `<td style="vertical-align:bottom"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED}">${custom ? "Custom cake request" : "Cake order brief"} · ${esc(SOURCES[o.source] ?? o.source)}</div>` +
    `<div style="font-size:32px;font-weight:bold;color:${INK};line-height:1.1;margin-top:4px">${esc(o.reference)}</div></td>` +
    `<td style="vertical-align:bottom;text-align:right"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#FBEFD9;color:#7A4A0C;font-size:13px;font-weight:bold;white-space:nowrap">${status}</span></td></tr></table>`;
  if (diet) b += `<div style="background:#F8E3DD;border-left:5px solid ${RED};border-radius:8px;padding:12px 16px;margin:0 0 14px;color:${RED}"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold">Allergy or dietary need</div><div style="font-size:18px;font-weight:bold;margin-top:3px">${esc(diet)}</div></div>`;
  if (reqTxt) b += `<div style="background:#1F231C;border-radius:8px;padding:12px 16px;margin:0 0 14px;color:#FFFFFF"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase">Must be</div><div style="font-size:18px;font-weight:bold;margin-top:4px">${esc(reqTxt)}</div></div>`;
  if (o.rush_override) b += `<div style="background:#FBEFD9;border-radius:8px;padding:12px 16px;margin:0 0 14px;color:#7A4A0C;font-weight:bold">Short notice${o.rush_reason ? `: ${esc(o.rush_reason)}` : ""}</div>`;

  b += section("01", delivery ? "Delivery" : "Collection", grid(
    kv("Date", esc(longDate(o.required_date))) + kv("Time", esc(t12(o.required_time))) +
    kv("How soon", esc(daysAway(o.required_date))) +
    kv(delivery ? "Area" : "Where", delivery ? esc(o.delivery_zone || "See the order") : "Café counter")));
  b += section("02", "The cake", grid(
    kv("Cake", esc(cakeLine(i))) + kv("Finish", i.finish === "custom" ? "Custom design" : "Standard finish") +
    kv("Design", esc(i.design_description || "")) + kv("Occasion", esc(i.occasion || "")) + kv("Serves", esc(i.serves_label || "")) +
    kv("Treats", esc(treatsLine(d))) + kv("Photos", d.attachments > 0 ? `${d.attachments} in the staff app` : "") + kv("Notes", esc(o.customer_notes || ""))) +
    (i.cake_message ? `<div style="margin:8px 0 4px;border:1.5px dashed ${INK};border-radius:8px;padding:12px;text-align:center"><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED}">Written on the cake · copy exactly</div><div style="font-size:20px;font-weight:bold;color:${INK};margin-top:4px">“${esc(i.cake_message)}”</div></div>` : ""));
  b += section("03", "Customer", grid(
    kv("Name", esc(name)) + kv("History", c.past_orders > 0 ? `Returning, ${c.past_orders} earlier order${c.past_orders > 1 ? "s" : ""}` : "New customer") +
    kv("Mobile", phone ? esc(phoneShow(phone)) + (c.preferred_contact === "whatsapp" ? ` <span style="font-weight:normal;color:${MUTED}">(WhatsApp)</span>` : "") : "") +
    kv("Email", email ? `<a href="mailto:${esc(email)}" style="color:${GREEN}">${esc(email)}</a>` : "")));
  // A custom request has no cake price until staff price it, so its estimate is only the delivery fee:
  // show the fee on its own and the cake as "To be priced", never a $0 cake or a fee-only total
  const fee = delivery && Number(o.delivery_fee) > 0 ? Number(o.delivery_fee) : 0;
  const unpriced = isRequest(i) && o.final_total == null;
  b += section("04", "Money", grid(
    (fee ? kv("Cake price", unpriced ? "To be priced" : esc(money(Math.max(total - fee, 0)))) + kv("Delivery", esc(money(fee))) : "") +
    kv(custom ? (fee ? "Estimate total" : "Estimate") : fee ? "Total" : "Price", unpriced ? (fee ? "" : "To be priced") : esc(money(total))) + kv("Paid", paid > 0 ? esc(money(paid)) : "Nothing yet") +
    kv("To pay", unpriced ? "" : esc(money(Math.max(total - paid, 0))))));

  b += `<div style="margin:18px 0 0">` + (cfg.staff_app_url ? smallBtn(cfg.staff_app_url, custom ? "Quote it in the staff app" : "Review in the staff app", true) : "") +
    (phone ? smallBtn(waLink(phone), "WhatsApp") + smallBtn(telLink(phone), "Call") : "") + `</div>`;
  if (manual) b += `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${MUTED}">Guest emails are off. Contact the customer yourself once you ${custom ? "have the price" : "confirm or decline"}.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:20px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="padding:0 4px 16px;border-bottom:1px solid ${LINE};font-size:15px;font-weight:bold;color:${INK}">${esc(loc.name)} <span style="font-weight:normal;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${GREEN}">&nbsp;Cakes</span></td></tr>
<tr><td style="padding:20px 4px 12px">${b}</td></tr>
<tr><td style="padding:16px 4px 0;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">${esc(loc.name)} · ${esc(loc.address)} · ${esc(loc.phone)}<br>Staff alert. Do not forward to the customer.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

// A custom cake that is not on the menu has no product and no tin size: it shows its flavour and the size or servings agreed
function isRequest(i: any) { return !i.product_id && !i.size_inch; }
function cakeLine(i: any) {
  if (isRequest(i)) return ["Custom cake", i.variant, i.serves_label].filter(Boolean).join(", ") + (i.quantity > 1 ? ` × ${i.quantity}` : "");
  return `${i.variant || i.product_name}, ${i.size_inch} inch${i.quantity > 1 ? ` × ${i.quantity}` : ""}`;
}
function cakeRows(d: any, staff: boolean): [string, string][] {
  const o = d.order, i = d.item ?? {}, c = d.customer;
  const rows: [string, string][] = [
    ["Reference", o.reference],
    ["Cake", cakeLine(i)],
    ["Finish", i.finish === "custom" ? "Custom design" : "Standard finish"],
  ];
  if (i.design_description) rows.push(["Design", i.design_description]);
  if (i.cake_message) rows.push(["Message", `“${i.cake_message}”`]);
  if (i.occasion) rows.push(["Occasion", i.occasion]);
  { const REQ: Record<string, string> = { eggless: "Eggless (vegetarian)", gluten_free: "Gluten-free", dairy_free: "Dairy-free", vegan: "Vegan (no egg, no dairy)" };
    const reqs = (i.requirements ?? []).map((k: string) => k === "other" ? (i.requirements_note || "Other") : REQ[k] || k);
    if (reqs.length) rows.push(["Must be", reqs.join(", ")]); }
  if (o.has_dietary) rows.push(["Allergy", [...(i.dietary ?? []), i.dietary_note].filter(Boolean).join(", ")]);
  rows.push(["Collection", `${longDate(o.required_date)} at ${t12(o.required_time)}`]);
  if (staff) {
    rows.push(["Customer", `${c.full_name}${c.past_orders > 0 ? ` (returning, ${c.past_orders} earlier order${c.past_orders > 1 ? "s" : ""})` : " (new customer)"}`]);
    rows.push(["Mobile", `${c.phone}${c.preferred_contact === "whatsapp" ? " (WhatsApp)" : ""}`]);
    if (c.email) rows.push(["Email", c.email]);
    rows.push(["Source", SOURCES[o.source] ?? o.source]);
    if (d.attachments > 0) rows.push(["Photos", `${d.attachments} reference photo${d.attachments > 1 ? "s" : ""} (open in the staff app)`]);
    if (o.customer_notes) rows.push(["Notes", o.customer_notes]);
  } else if (o.customer_notes) rows.push(["Your notes", o.customer_notes]);
  return rows;
}

function build(kind: string, d: any): { subject: string; html: string; text?: string } {
  if (kind.startsWith("guest_")) { const g = buildGuest(kind, d); if (g) return g; }
  const o = d.order, i = d.item ?? {}, c = d.customer, loc = d.location, cfg = d.config ?? {};
  const total = o.final_total ?? o.estimate_total;
  const balance = Math.max(Number(total) - Number(d.paid_total ?? 0), 0);
  switch (kind) {
    case "staff_new_order": return staffNewOrder(d);
    case "guest_received": {
      const custom = o.order_type === "custom";
      return {
        subject: `We've got your cake order, ${first(c.full_name)} (${o.reference})`,
        html: layout(loc, `Thanks, ${first(c.full_name)}`,
          p(custom
            ? `Your custom cake request is with our cake team. We'll look at your design and come back to you with a price.`
            : `Your cake order is with our cake team. We'll check availability and confirm it with you shortly.`) +
          p(`<strong>Your order isn't confirmed yet.</strong> We'll ${c.preferred_contact === "whatsapp" ? "message you on WhatsApp or " : ""}email you once it is.`) +
          table(cakeRows(d, false)) +
          (isRequest(i) ? "" : p(`${custom ? "Starting price" : "Price"}: <strong>${money(o.estimate_total)}</strong>${custom ? " before your custom design." : "."}`)) +
          p(`Questions or changes? Reply to this email or call ${esc(loc.phone)} and quote ${esc(o.reference)}.`)),
      };
    }
    case "guest_quote": {
      const dl = o.fulfilment_method === "delivery";
      return {
        subject: `The price for your cake, ${first(c.full_name)} (${o.reference})`,
        html: layout(loc, "Here's the price for your cake",
          p(`Thanks for your patience, ${esc(first(c.full_name))}. Here are the details and the price for your cake.`) +
          table([...cakeRows(d, false), ...(dl && Number(o.delivery_fee) > 0 ? [["Delivery", money(o.delivery_fee)] as [string, string]] : []), ["Price", money(total)]]) +
          p(`<strong>Your cake isn't booked yet.</strong> To go ahead, reply to this email or call ${esc(loc.phone)} and let us know. We'll confirm it with you once we hear back.`) +
          p(`Want to change something? Just tell us and we'll update the details and the price.`)),
      };
    }
    case "guest_deposit_needed":
      return {
        subject: `Your cake is almost booked, ${first(c.full_name)} (${o.reference})`,
        html: layout(loc, "One step left: your deposit",
          p(`Good news, ${esc(first(c.full_name))}. We can make your cake. To lock it in, we need a deposit of <strong>${money(o.deposit_required)}</strong>.`) +
          p(`You can pay at the café counter by cash or EFTPOS. If you'd like to pay by bank transfer, reply to this email and we'll send the details.`) +
          table([...cakeRows(d, false), ["Total", money(total)], ["Deposit", money(o.deposit_required)]]) +
          p(`Your order is confirmed once the deposit is received.`)),
      };
    case "guest_confirmed":
      return {
        subject: `Your cake is confirmed, ${first(c.full_name)} (${o.reference})`,
        html: layout(loc, "Your cake is confirmed",
          (o.fulfilment_method === "delivery"
            ? p(`It's all booked in, ${esc(first(c.full_name))}. We'll deliver it on ${esc(longDate(o.required_date))} at ${esc(t12(o.required_time))} to ${esc(o.delivery_address || "your address")}${o.delivery_zone ? ", " + esc(o.delivery_zone) : ""}.`)
            : p(`It's all booked in, ${esc(first(c.full_name))}. We'll have it ready for you on ${esc(longDate(o.required_date))} at ${esc(t12(o.required_time))}.`)) +
          table([...cakeRows(d, false), ...(o.fulfilment_method === "delivery" && Number(o.delivery_fee) > 0 ? [["Delivery", money(o.delivery_fee)]] : []), ["Total", money(total)], ["Paid", money(d.paid_total)], ["To pay", balance > 0 ? money(balance) + (o.fulfilment_method === "delivery" ? " on delivery" : " on collection") : "Nothing, all paid"]]) +
          p(`${o.fulfilment_method === "delivery" ? "" : `Collect from our counter at ${esc(loc.address)}. `}Need to change something? Reply to this email or call ${esc(loc.phone)}.`)),
      };
    case "guest_declined":
      return {
        subject: `About your cake order, ${first(c.full_name)} (${o.reference})`,
        html: layout(loc, "We can't make this one",
          p(`Sorry, ${esc(first(c.full_name))}, we're not able to take your cake order for ${esc(longDate(o.required_date))}.`) +
          (o.decline_reason ? p(`A note from our team: <em>${esc(o.decline_reason)}</em>`) : "") +
          p(`We'd still love to help. Call ${esc(loc.phone)} and we'll find another date or option${loc.order_page_url ? `, or <a href="${esc(loc.order_page_url)}" style="color:${HONEY}">place a new order</a>` : ""}.`)),
      };
    case "guest_cancelled":
      return {
        subject: `Your cake order is cancelled (${o.reference})`,
        html: layout(loc, "Order cancelled",
          p(`Hi ${esc(first(c.full_name))}, your cake order ${esc(o.reference)} for ${esc(longDate(o.required_date))} has been cancelled.`) +
          (Number(d.paid_total) > 0 ? p(`Our team will be in touch about the ${money(d.paid_total)} you've paid.`) : "") +
          p(`If this doesn't look right, call us on ${esc(loc.phone)}.`)),
      };
    case "guest_thanks": {
      const dl = o.fulfilment_method === "delivery";
      const link = cfg.review_link || "";
      return {
        subject: `Thank you, ${first(c.full_name)}. How was your cake?`,
        html: layout(loc, `Thank you, ${first(c.full_name)}`,
          p(`Thank you for choosing ${esc(loc.name)} for your cake. We hope it was a hit${dl ? " and arrived just as you pictured it" : ""}.`) +
          (link ? p(`If you enjoyed it, a short Google review would mean a lot to our small team. It takes less than a minute.`) + btn(link, "Leave a Google review") : "") +
          p(`If anything wasn't quite right, reply to this email and tell us. Our team reads every reply.`) +
          p(`Next celebration coming up? ${loc.order_page_url ? `<a href="${esc(loc.order_page_url)}" style="color:${HONEY}">Order your next cake online</a> or call` : "Call"} ${esc(loc.phone)}.`)),
      };
    }
    default:
      return { subject: `Cake order update (${o.reference})`, html: layout(loc, "Order update", table(cakeRows(d, false))) };
  }
}

async function send(to: string, subject: string, html: string, from: string, replyTo?: string, attachments?: { filename: string; content: string }[], cc?: string[], text?: string, headers?: Record<string, string>) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], cc: cc && cc.length ? cc : undefined, subject, html, text: text || undefined, reply_to: (replyTo && /^[^@,<> ]+@[^@,<> ]+[.][^@,<> ]+$/.test(replyTo.trim()) ? replyTo.trim() : undefined), attachments: attachments && attachments.length ? attachments : undefined, headers: headers && Object.keys(headers).length ? headers : undefined }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t).id as string;
}

// ---------- kitchen slip PDF for the printer PC ----------
function b64(bytes: Uint8Array) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
class NoRetry extends Error {}
async function slipPaper() { try { const [r] = await db(`app_config?key=eq.kitchen_slip_paper&select=value`); return r?.value === "DL" ? "DL" : "A5"; } catch (_e) { return "A5"; } }
// Email templates (22 Oct 2026): the published wording for a customer email, and whether an optional email is switched on.
// If anything goes wrong reading them, the email goes out with its standard wording, as before.
async function guestTemplate(kind: string): Promise<{ template: any | null; enabled: boolean }> {
  try {
    const [pub] = await db(`email_template_versions?kind=eq.${encodeURIComponent(kind)}&status=eq.published&select=id,version,subject,preheader,label,heading,tagline,intro,closing&limit=1`);
    let enabled = true;
    if (kind === "guest_thanks") { const [sw] = await db(`email_template_switches?kind=eq.guest_thanks&select=enabled`); if (sw && sw.enabled === false) enabled = false; }
    return { template: pub || null, enabled };
  } catch (_e) { return { template: null, enabled: true }; }
}

async function config() { const rows: any[] = await db(`app_config?key=in.(test_mode,test_email,from_email,reply_to)&select=key,value`); return Object.fromEntries(rows.map((r) => [r.key, r.value])); }

// A sample slip with invented details, sent from Settings so the printer PC can be checked without a real order
async function testSlip() {
  const paper = await slipPaper();
  const today = new Date(Date.now() + 12 * 3600e3 + 2 * 864e5).toISOString().slice(0, 10);
  const s = { reference: "TEST-001", method: "collection", date: today, time: "15:00", cake: "Test cake", variant: "Test cake", size: 8, quantity: 1, finish: "standard",
    message: "Test only", has_dietary: true, dietary: ["Nut allergy (test)"], candles: "None", rush: false, order_notes: "This is a test slip. Do not bake." };
  const slip = { name: "Test Guest", phone: "+679 000 0000", price: 0, paid: 0, taken_by: "Settings test", ordered_at: new Date().toISOString(), source: "phone", method: "collection" };
  const PDFLib = await import("npm:pdf-lib@1.17.1");
  const pdf = await buildSlipPdf(PDFLib, { snapshot: s, slip, version: 1, changes: [], printedAt: new Date().toISOString(), logoPng: await slipLogo(), location: {}, paper });
  const subject = `Kitchen slip TEST-001 v1 · Test print (${paper}) · Do not bake`;
  const html = `<!doctype html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:${INK};background:#ffffff"><div style="max-width:520px;padding:20px 16px">` +
    `<div style="font-size:30px;font-weight:bold;margin:2px 0 12px">TEST-001</div><p style="margin:0 0 10px;font-size:15px">This is a test kitchen slip on ${paper} paper, sent from the cake staff app settings.</p>` +
    `<p style="margin:0 0 10px;font-size:15px">Print the attached PDF, check it comes out the right size, then throw it away. <b>Do not bake.</b></p></div></body></html>`;
  return { subject, html, attachments: [{ filename: `TEST-001 Test slip ${paper} v1.pdf`, content: b64(pdf) }] };
}
async function kitchenSlip(m: any, d: any) {
  const o = d.order, c = d.customer ?? {};
  const v = Number(((m.dedupe_key || "").match(/:v(\d+)$/) || [])[1]);
  if (!SLIP_REF.test(String(o.reference || "").trim())) throw new NoRetry("No valid order number: slip not sent. Fix the order, then print again.");
  if (!v) throw new NoRetry("No slip version on this email.");
  const [br] = await db(`kitchen_briefs?order_id=eq.${m.order_id}&version=eq.${v}&select=snapshot,changes,printed_at,printed_by_label`);
  if (!br) throw new NoRetry(`Slip v${v} not found for ${o.reference}.`);
  const s = br.snapshot;
  if (s.reference !== o.reference) throw new NoRetry(`Slip order number ${s.reference} does not match ${o.reference}: not sent.`);
  // Who took the order: the name given on New order (the counter tablet has one shared login), else the login's name
  const givenBy = String(o.taken_by_name || "").trim();
  let takenBy = o.source === "online" ? "Website order" : givenBy || "Staff";
  if (o.source !== "online" && !givenBy && o.created_by) { const [sp] = await db(`staff_profiles?user_id=eq.${o.created_by}&select=full_name`); if (sp?.full_name) takenBy = sp.full_name; }
  const slip = { name: (o.contact_name || "").trim() || c.full_name, phone: (o.contact_phone || "").trim() || c.phone, price: isRequest(d.item ?? {}) && o.final_total == null ? null : o.final_total ?? o.estimate_total, delivery_fee: o.fulfilment_method === "delivery" ? o.delivery_fee : 0, paid: d.paid_total ?? 0,
    taken_by: takenBy, ordered_at: o.created_at, source: o.source, method: o.fulfilment_method,
    address: o.fulfilment_method === "delivery" ? o.delivery_address : null, receiver: o.fulfilment_method === "delivery" ? o.delivery_contact : null };
  const PDFLib = await import("npm:pdf-lib@1.17.1");
  const pdf = await buildSlipPdf(PDFLib, { snapshot: s, slip, version: v, changes: br.changes || [], printedAt: br.printed_at, logoPng: await slipLogo(), location: d.location, paper: await slipPaper() });
  const name = slipFileName(s, slip, v);
  const dl = s.method === "delivery";
  const when = `${new Date(s.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "")} ${t12(s.time)}`;
  const diet = s.has_dietary ? ([] as string[]).concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(", ") || "See the slip" : "";
  const reqTag = (s.requirements || []).length ? " · " + (s.requirements as string[]).map((k) => ({ eggless: "EGGLESS", gluten_free: "GLUTEN-FREE", dairy_free: "DAIRY-FREE", vegan: "VEGAN" } as Record<string, string>)[k] || "SPECIAL REQUIREMENT").join(", ") : "";
  const subject = `Kitchen slip ${o.reference} v${v} · ${dl ? "Delivery" : "Pickup"} ${when}` + reqTag + (diet ? " · ALLERGY" : "") + (v > 1 ? " · REPLACES v" + (v - 1) : "");
  // The email body reads like a kitchen docket; the attached PDF stays the official printed slip
  const html = slipEmailHtml({ s, version: v, changes: br.changes || [], fileName: name, sentBy: br.printed_by_label });
  return { subject, html, attachments: [{ filename: name + ".pdf", content: b64(pdf) }] };
}

// The backup Google Sheet stopped copying (or works again). Plain wording, point form, for the café's alert addresses.
function fijiWhen(iso: string | null) {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Pacific/Fiji" }) + ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Pacific/Fiji" });
}
async function backupEmail(kind: string) {
  const [ms] = await db(`mirror_status?id=eq.1&select=last_ack_at,last_error,sheet_url,sheet_title`);
  const last = fijiWhen(ms?.last_ack_at ?? null), sheet = ms?.sheet_title || "Corner Café Cake Orders Backup";
  const link = ms?.sheet_url ? `<p style="margin:14px 0 0"><a href="${ms.sheet_url}" style="color:#4B6339;font-weight:bold">Open ${sheet}</a></p>` : "";
  const li = (x: string[]) => "<ul style=\"margin:8px 0 0;padding-left:20px\">" + x.map((t) => `<li style="margin:4px 0">${t}</li>`).join("") + "</ul>";
  const wrap = (h: string, body: string) => `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${INK}"><div style="max-width:560px;padding:20px 16px;font-size:15px;line-height:1.5"><h1 style="font-size:20px;margin:0 0 10px">${h}</h1>${body}</div></body></html>`;
  if (kind === "ops_backup_ok") {
    const pts = [`The backup Sheet is copying orders again.`, `Last successful copy: ${last}.`, `Nothing else to do. If anyone wrote orders in the Downtime orders tab, check each one has been entered in the staff app.`];
    return { subject: "Cake order backup is working again", html: wrap("Cake order backup is working again", li(pts) + link), text: pts.join("\n") };
  }
  const pts = [`The backup Sheet (${sheet}) has not copied any orders for over 30 minutes.`, `Last successful copy: ${last}.`,
    `Problem reported: ${ms?.last_error || "none reported. The Sheet's script may have stopped running."}`,
    `The staff app still works. Only the backup copy is behind.`,
    `To fix: open the Sheet, then the Cake backup menu, then Copy now. If it says the access code is wrong, use Change the access code with the code from the staff app (Settings, administrators only).`,
    `If it still fails: in the Sheet open Extensions, then Apps Script, then Triggers, and check that sync runs every minute.`];
  return { subject: "Cake order backup has stopped copying", html: wrap("Cake order backup has stopped copying", li(pts) + link), text: pts.join("\n") };
}

async function processOutbox() {
  const batch: any[] = await rpc("claim_outbox", { p_limit: 20 });
  let sent = 0, failed = 0, held = 0;
  for (const m of batch) {
    if (!RESEND_KEY) {
      // No sending key yet: keep the email waiting so nothing is lost.
      await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "pending", attempts: 0, last_error: "Waiting for RESEND_API_KEY to be added" }) });
      held++; continue;
    }
    try {
      if (m.kind === "kitchen_slip_test") {
        const cfg = await config(), t = await testSlip();
        let to = m.to_email, subject = t.subject, cc: string[] = m.cc || [];
        if (cfg.test_mode === "true") { subject = `[TEST, for ${[to, ...cc].join(" and ")}] ${subject}`; to = cfg.test_email; cc = []; }
        const id = await send(to, subject, t.html, cfg.from_email, undefined, t.attachments, cc);
        await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: id, last_error: null }) });
        sent++; continue;
      }
      // Backup Sheet alerts for the café's alert addresses: no order attached
      if (m.kind === "ops_backup_alert" || m.kind === "ops_backup_ok") {
        const cfg = await config(), b = await backupEmail(m.kind);
        let to = m.to_email, subject = b.subject, cc: string[] = m.cc || [];
        if (cfg.test_mode === "true") { subject = `[TEST, for ${[to, ...cc].join(" and ")}] ${subject}`; to = cfg.test_email; cc = []; }
        const id = await send(to, subject, b.html, cfg.from_email, undefined, undefined, cc, b.text);
        await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: id, last_error: null }) });
        sent++; continue;
      }
      const d = await rpc("email_payload", { p_order: m.order_id });
      if (!d) throw new Error("order not found");
      if (m.kind.startsWith("guest_")) d.unsub = await unsubLinks(m.order_id, d);
      if (m.kind.startsWith("guest_")) {
        const tp = await guestTemplate(m.kind);
        if (!tp.enabled) {
          // Switched off in Settings, Communications, Email templates: logged, not sent, not retried
          await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", attempts: 5, last_error: "Not sent: this email is switched off in Settings, Email templates" }) });
          held++; continue;
        }
        d.template = tp.template;
      }
      const cfg = d.config ?? {};
      let att: { filename: string; content: string }[] | undefined;
      let { subject, html, text } = m.kind === "kitchen_slip" ? await kitchenSlip(m, d).then((k) => { att = k.attachments; return k; }) as { subject: string; html: string; text?: string } : build(m.kind, d);
      let to = m.to_email, cc: string[] = m.cc || [];
      // Test mode: everything goes to the test inbox only, backup copies included
      if (cfg.test_mode === "true") { subject = `[TEST, for ${[to, ...cc].join(" and ")}] ${subject}`; to = cfg.test_email; cc = []; }
      const guestKind = m.kind.startsWith("guest_");
      const unsubHeaders = guestKind && d.unsub ? { "List-Unsubscribe": `<${d.unsub.post}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined;
      const id = await send(to, subject, html, cfg.from_email, guestKind ? cfg.reply_to : (m.kind === "kitchen_slip" ? undefined : (d.customer?.email || undefined)), att, cc, text, unsubHeaders);
      await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: id, last_error: null }) });
      // Which wording it went out with (only when a template was used; a failure here never resends the email)
      if (d.template?.id) await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ template_version_id: d.template.id }) }).catch(() => {});
      sent++;
    } catch (e) {
      // A problem that a retry cannot fix (such as a missing order number) is not retried
      await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", last_error: String(e instanceof Error ? e.message : e).slice(0, 500), ...(e instanceof NoRetry ? { attempts: 5 } : {}) }) });
      failed++;
    }
  }
  return { claimed: batch.length, sent, failed, held };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  try {
    if (body.op === "process") {
      const [cfg] = await db(`app_config?key=eq.cron_key&select=value`);
      if (!cfg || req.headers.get("x-cron-key") !== cfg.value) return json({ ok: false, error: "forbidden" }, 403);
      return json({ ok: true, ...(await processOutbox()) });
    }
    return json({ ok: false, error: "unknown_op" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
