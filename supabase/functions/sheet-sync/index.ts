// sheet-sync: receives every row of the two Corner Café cake order Google Sheets.
// 1. Upcoming orders are brought into the staff app (as before).
// 2. Every row, past and future, goes into the Master Cake Register, with every amendment kept.
// 3. Gives the Google script the register so it can write the Master Cake Register sheet.
// Called every 5 minutes by a Google Apps Script. Protected by a shared key (SHEET_SYNC_SECRET) set by the owner.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { parseRow } from "./parse.mjs";
import { registerRow } from "./register.mjs";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  let body: { op?: string; sheet?: string; message?: string; url?: string; rows?: { row: number; values: unknown[] }[] };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad body" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // The one-time history load is started from the database with the cron key. It reads rows staged in reg_load.
  const cronKey = req.headers.get("x-cron-key");
  if (cronKey) {
    const { data: cfg } = await db.from("app_config").select("value").eq("key", "cron_key").maybeSingle();
    if (!cfg || cronKey !== cfg.value || body.op !== "load") return json({ ok: false, error: "forbidden" }, 403);
    const { data: staged, error } = await db.from("reg_load").select("sheet_row, raw").eq("sheet", body.sheet).order("sheet_row");
    if (error) return json({ ok: false, error: error.message }, 500);
    body.rows = (staged || []).map((r: { sheet_row: number; raw: unknown[] }) => ({ row: r.sheet_row, values: r.raw }));
  } else {
    const secret = Deno.env.get("SHEET_SYNC_SECRET") || "";
    const given = req.headers.get("x-sync-key") || "";
    if (secret.length < 24 || given !== secret) return json({ ok: false, error: "not allowed" }, 401);
  }

  // The Google script could not read a sheet: record it so staff see the register is not current
  if (body.op === "failed") {
    await db.rpc("register_sync_failed", { p_sheet: body.sheet || "unknown", p_message: String(body.message || "The Google script could not read the sheet") });
    return json({ ok: true });
  }
  // The Google script asks for the register to write into the Master Cake Register sheet
  if (body.op === "register") {
    if (typeof body.url === "string" && /^https:\/\/docs\.google\.com\/spreadsheets\//.test(body.url)) {
      await db.from("reg_meta").upsert({ k: "master_sheet_url", v: body.url, at: new Date().toISOString() });
    }
    const { data, error } = await db.rpc("register_export");
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, ...data });
  }

  const sheet = body.sheet;
  if (sheet !== "online" && sheet !== "walkin") return json({ ok: false, error: "unknown sheet" }, 400);
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 5000) : [];

  try {
    // 1. Upcoming orders into the staff app, due from today up to one year ahead (unchanged behaviour)
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Fiji" }).format(new Date());
    const yearAhead = new Date(Date.parse(today + "T00:00:00Z") + 365 * 864e5).toISOString().slice(0, 10);
    const summary = { received: rows.length, upcoming: 0, created: 0, refreshed: 0, kept: 0, skipped: [] as string[] };
    const reg: unknown[] = [];
    for (const r of rows) {
      if (!Array.isArray(r.values) || !r.values.some((v) => String(v ?? "").trim())) continue;
      reg.push(registerRow(sheet, r.row, r.values));
      const p = parseRow(sheet, r.row, r.values);
      if (!p.date || p.date < today || p.date > yearAhead) continue;
      summary.upcoming++;
      if (!p.ok) { summary.skipped.push(`row ${r.row}: ${p.problems.join(", ")}`); continue; }
      const { data, error } = await db.rpc("import_sheet_order", { p });
      if (error || !data?.ok) { summary.skipped.push(`row ${r.row}: ${error?.message || data?.reason || "failed"}`); continue; }
      if (data.action === "created") summary.created++; else if (data.action === "refreshed") summary.refreshed++; else summary.kept++;
    }
    // 2. Every row into the Master Cake Register. A sheet that came back empty is treated as a failed read, not as every row deleted.
    if (!reg.length) throw new Error("The sheet came back with no rows. Nothing was changed in the register.");
    const { data: rg, error: rgErr } = await db.rpc("register_ingest", { p_sheet: sheet, p_rows: reg, p_full: true });
    if (rgErr) throw new Error(rgErr.message);
    return json({ ok: true, sheet, ...summary, register: rg });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.rpc("register_sync_failed", { p_sheet: sheet, p_message: msg });
    return json({ ok: false, sheet, error: msg }, 500);
  }
});
