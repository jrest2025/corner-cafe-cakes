// staff-admin: add a staff login, send a set-up or new-password link, or remove someone from the team, from the staff app.
// The caller must be signed in, active, and hold the Manage the team switch. Uses the service key only on the server.
// Invites: the login is created with a random password nobody sees; the person gets an email link to choose their own.
// The older "create" and "reset" requests (temporary password typed by the admin) still work.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = ["https://www.cornercafefiji.com", "https://cornercafefiji.com", "https://central.cornercafefiji.com"];
const ROLES = ["admin", "manager", "front_of_house", "kitchen", "finance", "marketing"];
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function randomPassword() { const a = new Uint8Array(24); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/[^A-Za-z0-9]/g, "").slice(0, 28) + "Aa1!"; }

Deno.serve(async (req) => {
  const h = cors(req);
  const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
  const no = (field: string, message: string) => out({ ok: false, field, message });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out({ ok: false, message: "POST only" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling, and may they manage the team?
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await db.auth.getUser(token);
  if (whoErr || !who?.user) return out({ ok: false, message: "Sign in again." }, 401);
  const { data: me } = await db.from("staff_profiles").select("role, active, full_name").eq("user_id", who.user.id).maybeSingle();
  if (!me || !me.active) return out({ ok: false, message: "Only someone who can manage the team can do this." }, 403);
  const { data: allowed, error: permErr } = await db.rpc("_perm_of", { p_user: who.user.id, p_key: "staff.users" });
  const mayManage = permErr ? me.role === "admin" : allowed === true; // before the switches are live, Admin decides
  if (!mayManage) return out({ ok: false, message: "Only someone who can manage the team can do this." }, 403);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return out({ ok: false, message: "Bad request." }, 400); }
  const password = String(b.password ?? "");
  const pwProblem = password.length < 10 ? "Use at least 10 characters for the temporary password." : null;

  // The set-up link: a one-time code the staff page turns into a sign-in, then asks for a new password
  async function sendLink(email: string, name: string, first: boolean) {
    const { data: link, error } = await db.auth.admin.generateLink({ type: "recovery", email });
    const hashed = (link as any)?.properties?.hashed_token;
    if (error || !hashed) return "The link could not be made. Try again.";
    const cfgRows = (await db.from("app_config").select("key, value").in("key", ["staff_app_url", "from_email", "test_mode", "test_email"])).data || [];
    const cfg = Object.fromEntries(cfgRows.map((r: any) => [r.key, r.value]));
    const base = String(cfg.staff_app_url || "https://www.cornercafefiji.com/cake-orders-staff").split("#")[0].split("?")[0];
    const url = `${base}?setup=${encodeURIComponent(hashed)}`;
    if (!RESEND_KEY) return "Email is not set up, so the link could not be sent.";
    let to = email, subject = first ? "Set up your Corner Café cake app login" : "Choose a new password for the Corner Café cake app";
    if (cfg.test_mode === "true" && cfg.test_email) { subject = `[TEST, for ${email}] ${subject}`; to = cfg.test_email; }
    const firstName = (name || "").trim().split(/\s+/)[0] || "there";
    const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#2B2622">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<div style="font-size:15px;font-weight:bold;margin-bottom:18px">Corner Café <span style="font-weight:normal;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5F7A4A">&nbsp;Cakes</span></div>
<h1 style="font-size:22px;margin:0 0 12px">${first ? `Welcome to the team, ${esc(firstName)}` : `Hi ${esc(firstName)}`}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 18px">${first ? `${esc(me!.full_name || "Your manager")} has given you a login for the Corner Café cake app. Press the button to choose your password.` : `Press the button to choose a new password for the Corner Café cake app.`}</p>
<p style="margin:0 0 18px"><a href="${esc(url)}" style="display:inline-block;padding:14px 24px;background:#5F7A4A;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">${first ? "Set up my login" : "Choose a new password"}</a></p>
<p style="font-size:13px;line-height:1.6;color:#6B6560;margin:0">The button works once and only for a short time. If it has stopped working, ask your manager to send a new one. Your login email is ${esc(email)}. If you were not expecting this, you can ignore it.</p>
</div></body></html>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from_email, to: [to], subject, html, text: `${first ? "Set up your login" : "Choose a new password"}: ${url}` }),
    });
    return r.ok ? null : "The email could not be sent. Try again.";
  }

  async function levelRole(levelId: unknown) {
    const { data: lv } = await db.from("access_levels").select("id, grants").eq("id", String(levelId ?? "")).maybeSingle();
    if (!lv) return null;
    const order = ["admin", "manager", "front_of_house", "marketing", "finance", "kitchen"];
    return { id: lv.id as string, role: order.find((r) => (lv.grants as string[]).includes(r)) || "" };
  }

  if (b.op === "create" || b.op === "invite") {
    const invite = b.op === "invite";
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    let role = String(b.role ?? "");
    let levelId: string | null = null;
    if (name.length < 2) return no("name", "Enter the staff member's name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return no("email", "Check the email address.");
    if (b.level_id) {
      const lv = await levelRole(b.level_id);
      if (!lv) return no("role", "Choose an access level.");
      role = lv.role; levelId = lv.id;
    }
    if (!ROLES.includes(role)) return no("role", "Choose an access level.");
    if (!invite && pwProblem) return no("password", pwProblem);

    const { data: made, error } = await db.auth.admin.createUser({
      email, password: invite ? randomPassword() : password, email_confirm: true, user_metadata: { full_name: name, must_change_password: true },
    });
    if (error || !made?.user) {
      const exists = /already|registered|exists/i.test(error?.message || "");
      return no("email", exists ? "A login with this email already exists. Find it in the team list." : "The login could not be created. Try again.");
    }
    const { data: loc } = await db.from("locations").select("id").eq("code", "corner-cafe").maybeSingle();
    const { error: pErr } = await db.from("staff_profiles").insert({ user_id: made.user.id, full_name: name, role, level_id: levelId, location_id: loc?.id ?? null, active: true });
    if (pErr) {
      await db.auth.admin.deleteUser(made.user.id); // keep it all-or-nothing
      return out({ ok: false, message: "The login could not be set up. Nothing was saved. Try again." });
    }
    if (invite) {
      const mailErr = await sendLink(email, name, true);
      return out({ ok: true, user_id: made.user.id, email, sent: !mailErr, message: mailErr });
    }
    return out({ ok: true, user_id: made.user.id, email });
  }

  if (b.op === "send_link") {
    const id = String(b.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return out({ ok: false, message: "That login was not found." });
    if (id === who.user.id) return out({ ok: false, message: "Change your own password from More, Change my password." });
    const { data: cur } = await db.auth.admin.getUserById(id);
    if (!cur?.user?.email) return out({ ok: false, message: "That login was not found." });
    const { data: prof } = await db.from("staff_profiles").select("full_name, active").eq("user_id", id).maybeSingle();
    if (!prof?.active) return out({ ok: false, message: "Switch their access on first." });
    await db.auth.admin.updateUserById(id, { user_metadata: { ...(cur.user.user_metadata || {}), must_change_password: true } });
    const first = !cur.user.last_sign_in_at;
    const mailErr = await sendLink(cur.user.email, prof.full_name || "", first);
    if (mailErr) return out({ ok: false, message: mailErr });
    return out({ ok: true, email: cur.user.email });
  }

  if (b.op === "reset") {
    const id = String(b.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return out({ ok: false, message: "That login was not found." });
    if (id === who.user.id) return out({ ok: false, message: "Change your own password from More, Change my password." });
    if (pwProblem) return no("password", pwProblem);
    const { data: cur } = await db.auth.admin.getUserById(id);
    if (!cur?.user) return out({ ok: false, message: "That login was not found." });
    const { error } = await db.auth.admin.updateUserById(id, { password, user_metadata: { ...(cur.user.user_metadata || {}), must_change_password: true } });
    if (error) return out({ ok: false, message: "The password could not be changed. Try again." });
    return out({ ok: true });
  }

  if (b.op === "remove") {
    // Remove someone from the team: their login is blocked for good and they leave the team list.
    // Their profile is kept so names in order history stay readable. Not your own login, and never the last person who can manage the team.
    const id = String(b.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return out({ ok: false, message: "That login was not found." });
    if (id === who.user.id) return out({ ok: false, message: "You cannot remove yourself." });
    const { data: cur } = await db.auth.admin.getUserById(id);
    if (!cur?.user) return out({ ok: false, message: "That login was not found." });
    const { error } = await db.auth.admin.deleteUser(id, true);
    if (error) return out({ ok: false, message: "This person could not be removed. Nothing has changed. Try again." });
    const { error: mErr } = await db.rpc("_staff_mark_removed", { p_user: id, p_by: who.user.id });
    if (mErr) return out({ ok: false, message: "The login is blocked, but the team list did not update. Refresh and try again." });
    return out({ ok: true });
  }

  return out({ ok: false, message: "Unknown request." }, 400);
});
