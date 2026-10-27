// sheet-backup: copies cake orders into a Google Sheet the admin links from Settings.
// One row per order, kept up to date. Historical H- orders are left out.
// Called every 5 minutes by the database (op "sync", protected by the cron key) and by admins from the staff app.
// Google access uses a service account whose key file the owner stores as the secret GOOGLE_SERVICE_ACCOUNT_JSON.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { Plain, prepare, robot, run, status } from "./core.ts";

const ORIGINS = ["https://www.cornercafefiji.com", "https://cornercafefiji.com", "https://central.cornercafefiji.com"];
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out({ ok: false, message: "POST only" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return out({ ok: false, message: "Bad request." }, 400); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Database timer.
  if (b.op === "sync") {
    const { data: k } = await db.from("app_config").select("value").eq("key", "cron_key").maybeSingle();
    if (!k?.value || req.headers.get("x-cron-key") !== k.value) return out({ ok: false }, 403);
    return out(await run(db, false));
  }

  // Everything else: signed-in active admin only.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await db.auth.getUser(token);
  if (whoErr || !who?.user) return out({ ok: false, message: "Sign in again." }, 401);
  const { data: me } = await db.from("staff_profiles").select("role, active").eq("user_id", who.user.id).maybeSingle();
  if (!me || !me.active || me.role !== "admin") return out({ ok: false, message: "Only an admin can manage the sheet backup." }, 403);

  if (b.op === "status") return out(await status(db));

  if (b.op === "link") {
    if (!robot()) return out({ ok: false, message: "The Google robot account is not set up yet. Follow the setup steps first." });
    const m = String(b.url ?? "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || String(b.url ?? "").trim().match(/^([a-zA-Z0-9_-]{30,})$/);
    if (!m) return out({ ok: false, message: "Paste the full link of the Google Sheet, copied from the browser address bar." });
    const id = m[1], tab = "Cake orders";
    let title = "";
    try { title = await prepare(id, tab); } catch (e) {
      return out({ ok: false, message: e instanceof Plain ? e.message : "Google could not be reached. Try again." });
    }
    await db.from("sheet_backup_rows").delete().not("order_id", "is", null);
    await db.from("sheet_backup").update({ spreadsheet_id: id, spreadsheet_title: title, tab_name: tab, linked_by: who.user.id, linked_at: new Date().toISOString(), last_run_at: null, last_ok_at: null, last_error: null, last_written: 0, updated_at: new Date().toISOString() }).eq("id", 1);
    const r = await run(db, true);
    return out({ ...(await status(db)), ok: r.ok !== false, message: r.ok === false ? r.message : undefined, written: (r as any).written });
  }

  if (b.op === "copy") {
    const r = await run(db, true);
    if ((r as any).busy) return out({ ...(await status(db)), ok: false, message: "A copy is already running. Try again in a minute." });
    return out({ ...(await status(db)), ok: r.ok !== false, message: r.ok === false ? r.message : undefined, written: (r as any).written });
  }

  if (b.op === "unlink") {
    await db.from("sheet_backup").update({ spreadsheet_id: null, spreadsheet_title: null, linked_by: null, linked_at: null, last_run_at: null, last_ok_at: null, last_error: null, last_written: 0, updated_at: new Date().toISOString() }).eq("id", 1);
    await db.from("sheet_backup_rows").delete().not("order_id", "is", null);
    return out(await status(db));
  }

  return out({ ok: false, message: "Unknown request." }, 400);
});
