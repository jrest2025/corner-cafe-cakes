// staff-admin: lets an admin add a staff login, set a new temporary password, or remove someone from the team, from the staff app.
// The caller must be signed in and hold an active admin profile. Uses the service key only on the server.
// New logins are flagged must_change_password, so the staff app asks the person to set their own password on first sign-in.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = ["https://www.cornercafefiji.com", "https://cornercafefiji.com"];
const ROLES = ["admin", "manager", "front_of_house", "kitchen", "finance", "marketing"];

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const h = cors(req);
  const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
  const no = (field: string, message: string) => out({ ok: false, field, message });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out({ ok: false, message: "POST only" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling, and are they an active admin?
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await db.auth.getUser(token);
  if (whoErr || !who?.user) return out({ ok: false, message: "Sign in again." }, 401);
  const { data: me } = await db.from("staff_profiles").select("role, active").eq("user_id", who.user.id).maybeSingle();
  if (!me || !me.active || me.role !== "admin") return out({ ok: false, message: "Only an admin can manage the team." }, 403);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return out({ ok: false, message: "Bad request." }, 400); }
  const password = String(b.password ?? "");
  const pwProblem = password.length < 10 ? "Use at least 10 characters for the temporary password." : null;

  if (b.op === "create") {
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    let role = String(b.role ?? "");
    let levelId: string | null = null;
    if (name.length < 2) return no("name", "Enter the staff member's name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return no("email", "Check the email address.");
    if (b.level_id) {
      // Access level chosen in Team and access: the main ability goes in role, the level in level_id
      const { data: lv } = await db.from("access_levels").select("id, grants").eq("id", String(b.level_id)).maybeSingle();
      if (!lv) return no("role", "Choose an access level.");
      const order = ["admin", "manager", "front_of_house", "marketing", "finance", "kitchen"];
      role = order.find((r) => (lv.grants as string[]).includes(r)) || "";
      levelId = lv.id;
    }
    if (!ROLES.includes(role)) return no("role", "Choose an access level.");
    if (pwProblem) return no("password", pwProblem);

    const { data: made, error } = await db.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name, must_change_password: true },
    });
    if (error || !made?.user) {
      const exists = /already|registered|exists/i.test(error?.message || "");
      return no("email", exists ? "A login with this email already exists. Find it in the team list and give it a role there." : "The login could not be created. Try again.");
    }
    const { data: loc } = await db.from("locations").select("id").eq("code", "corner-cafe").maybeSingle();
    const { error: pErr } = await db.from("staff_profiles").insert({ user_id: made.user.id, full_name: name, role, level_id: levelId, location_id: loc?.id ?? null, active: true });
    if (pErr) {
      await db.auth.admin.deleteUser(made.user.id); // keep it all-or-nothing
      return out({ ok: false, message: "The login could not be set up. Nothing was saved. Try again." });
    }
    return out({ ok: true, user_id: made.user.id, email });
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
    // Their profile is kept so names in order history stay readable. Not your own login.
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
