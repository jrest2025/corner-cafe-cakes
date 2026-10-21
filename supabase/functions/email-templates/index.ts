// email-templates: preview and test emails for Settings, Communications, Email templates in the staff app (22 Oct 2026).
// The caller must be signed in, active and hold the Settings switch (mgmt.settings).
// Previews and tests use made-up order details (sampleData), never a real customer's, and are built by the same code
// as the real emails (send-emails/guest_emails.ts), so what staff see is what customers get.
// Test emails go only to the signed-in staff member's own login email, with [TEST] in the subject.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { buildGuest, sampleData, TEMPLATE_KINDS, FIELDS, DEFAULTS, unknownFields, cleanRich } from "../send-emails/guest_emails.ts";

const ORIGINS = ["https://www.cornercafefiji.com", "https://cornercafefiji.com"];
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const KINDS = new Set(TEMPLATE_KINDS.map((k) => k.kind));
const TEXT = ["subject", "preheader", "label", "heading", "tagline"], RICH = ["intro", "closing"];
const LIMIT: Record<string, number> = { subject: 200, preheader: 250, label: 60, heading: 160, tagline: 160, intro: 8000, closing: 8000 };

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}

// What staff typed, tidied and checked: plain boxes stay plain, rich boxes keep only the allowed formatting
function tidy(f: any) {
  const out: Record<string, string> = {}, problems: string[] = [];
  for (const k of [...TEXT, ...RICH]) {
    let v = typeof f?.[k] === "string" ? f[k] : "";
    v = RICH.includes(k) ? cleanRich(v) : v.replace(/[\r\n\t]+/g, " ").replace(/<[^>]*>/g, "").trim();
    if (v.length > LIMIT[k]) problems.push(`${k}: too long`);
    out[k] = v;
  }
  const unknown = [...new Set([...TEXT, ...RICH].flatMap((k) => unknownFields(out[k])))];
  return { fields: out, unknown, problems };
}

Deno.serve(async (req) => {
  const h = cors(req);
  const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out({ ok: false, message: "POST only" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await db.auth.getUser(token);
  if (!who?.user) return out({ ok: false, message: "Sign in again." }, 401);
  const { data: allowed } = await db.rpc("_perm_of", { p_user: who.user.id, p_key: "mgmt.settings" });
  if (allowed !== true) return out({ ok: false, message: "Only someone with the Settings switch can manage email templates." }, 403);

  let b: any = {};
  try { b = await req.json(); } catch { return out({ ok: false, message: "Bad request." }, 400); }

  if (b.op === "meta") return out({ ok: true, kinds: TEMPLATE_KINDS, fields: FIELDS, defaults: DEFAULTS });

  const kind = String(b.kind || "");
  if (!KINDS.has(kind)) return out({ ok: false, message: "Unknown email." }, 400);

  // The café's own details, settings and cross-sell cards; the order and customer are made up
  const [{ data: loc }, { data: cfgRows }, { data: cards }] = await Promise.all([
    db.from("locations").select("name, address, phone, email, order_page_url").limit(1).maybeSingle(),
    db.from("app_config").select("key, value").in("key", ["review_link", "from_email", "reply_to", "test_mode", "test_email"]),
    db.from("promo_cards").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const cfg = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, r.value]));
  const d = sampleData(kind, { location: loc, config: { review_link: cfg.review_link }, promo_cards: cards || [] });
  const t = b.fields ? tidy(b.fields) : null;
  if (t) d.template = { id: null, ...t.fields };
  const mail = buildGuest(kind, d);
  if (!mail) return out({ ok: false, message: "This email could not be built." }, 500);

  if (b.op === "preview") return out({ ok: true, subject: mail.subject, html: mail.html, text: mail.text, unknown: t?.unknown ?? [], problems: t?.problems ?? [] });

  if (b.op === "test") {
    if (t && (t.unknown.length || t.problems.length)) return out({ ok: false, message: "Fix the highlighted problems before sending a test." });
    if (!RESEND_KEY) return out({ ok: false, message: "Email is not set up, so the test could not be sent." });
    const to = who.user.email;
    if (!to) return out({ ok: false, message: "Your login has no email address." });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from_email, to: [to], subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text,
        reply_to: cfg.reply_to || undefined }),
    });
    if (!r.ok) return out({ ok: false, message: "The test email could not be sent. Try again." });
    return out({ ok: true, to });
  }
  return out({ ok: false, message: "Unknown request." }, 400);
});
