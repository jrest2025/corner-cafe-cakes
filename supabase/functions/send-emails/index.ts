// Corner Cafe Cakes: email sender.
// op "process" sends queued emails. Called by the database (trigger and 5-minute retry), protected by the cron key.
// Test mode sends every email to the test address with a [TEST] subject prefix.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

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
function t12(t: string) { const [h, m] = String(t).slice(0, 5).split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`; }
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

function cakeLine(i: any) { return `${i.variant || i.product_name}, ${i.size_inch} inch${i.quantity > 1 ? ` × ${i.quantity}` : ""}`; }
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
  if (o.has_dietary) rows.push(["Dietary", [...(i.dietary ?? []), i.dietary_note].filter(Boolean).join(", ")]);
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

function build(kind: string, d: any): { subject: string; html: string } {
  const o = d.order, i = d.item ?? {}, c = d.customer, loc = d.location, cfg = d.config ?? {};
  const total = o.final_total ?? o.estimate_total;
  const balance = Math.max(Number(total) - Number(d.paid_total ?? 0), 0);
  switch (kind) {
    case "staff_new_order": {
      const custom = o.order_type === "custom";
      const manual = cfg.guest_emails !== "true";
      const intro = manual
        ? (custom
          ? `This one needs a quote. Check the design, then quote and confirm it in the staff app. <strong>Guest emails are off, so contact the customer yourself</strong> with the price.`
          : `Check the details, then confirm or decline it in the staff app. <strong>Guest emails are off, so contact the customer yourself</strong> to let them know.`)
        : (custom
          ? `This one needs a quote. Check the design, then confirm it with the price in the staff app.`
          : `Check the details, then confirm or decline it in the staff app. The customer is told once you do.`);
      return {
        subject: `New ${custom ? "custom cake request" : "cake order"}: ${c.full_name}, ${cakeLine(i)}, ${longDate(o.required_date)}`,
        html: layout(loc, custom ? "New custom cake request" : "New cake order",
          p(intro) +
          table(cakeRows(d, true), ["Dietary"]) +
          p(`<strong>${custom ? "Estimate before design" : "Price"}: ${money(o.estimate_total)}</strong>`) +
          (cfg.staff_app_url ? btn(cfg.staff_app_url, "Open the staff app") : "") +
          (manual && c.phone ? btn(waLink(c.phone), "WhatsApp the customer", true) : "")),
      };
    }
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
          p(`${custom ? "Starting price" : "Price"}: <strong>${money(o.estimate_total)}</strong>${custom ? " before your custom design." : "."}`) +
          p(`Questions or changes? Reply to this email or call ${esc(loc.phone)} and quote ${esc(o.reference)}.`)),
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
          p(`It's all booked in, ${esc(first(c.full_name))}. We'll have it ready for you on ${esc(longDate(o.required_date))} at ${esc(t12(o.required_time))}.`) +
          table([...cakeRows(d, false), ["Total", money(total)], ["Paid", money(d.paid_total)], ["To pay", balance > 0 ? money(balance) + " on collection" : "Nothing, all paid"]]) +
          p(`Collect from our counter at ${esc(loc.address)}. Need to change something? Reply to this email or call ${esc(loc.phone)}.`)),
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
    default:
      return { subject: `Cake order update (${o.reference})`, html: layout(loc, "Order update", table(cakeRows(d, false))) };
  }
}

async function send(to: string, subject: string, html: string, from: string, replyTo?: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo || undefined }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t).id as string;
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
      const d = await rpc("email_payload", { p_order: m.order_id });
      if (!d) throw new Error("order not found");
      const cfg = d.config ?? {};
      let { subject, html } = build(m.kind, d);
      let to = m.to_email;
      if (cfg.test_mode === "true") { subject = `[TEST, for ${to}] ${subject}`; to = cfg.test_email; }
      const guestKind = m.kind.startsWith("guest_");
      const id = await send(to, subject, html, cfg.from_email, guestKind ? cfg.reply_to : (d.customer?.email || undefined));
      await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: id, last_error: null }) });
      sent++;
    } catch (e) {
      await db(`email_outbox?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed", last_error: String(e).slice(0, 500) }) });
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
