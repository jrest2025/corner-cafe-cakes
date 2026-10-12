// sheet-sync: receives raw rows from the two Corner Café cake order Google Sheets and brings upcoming orders into the staff app.
// Called every few minutes by a Google Apps Script. Protected by a shared key (SHEET_SYNC_SECRET) set by the owner.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { parseRow } from "./parse.mjs";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const secret = Deno.env.get("SHEET_SYNC_SECRET") || "";
  const given = req.headers.get("x-sync-key") || "";
  if (secret.length < 24 || given !== secret) return json({ ok: false, error: "not allowed" }, 401);

  let body: { sheet?: string; rows?: { row: number; values: unknown[] }[] };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad body" }, 400); }
  const sheet = body.sheet;
  if (sheet !== "online" && sheet !== "walkin") return json({ ok: false, error: "unknown sheet" }, 400);
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 3000) : [];

  // Today in Fiji. Only orders due from today up to one year ahead are brought in.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Fiji" }).format(new Date());
  const yearAhead = new Date(Date.parse(today + "T00:00:00Z") + 365 * 864e5).toISOString().slice(0, 10);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const summary = { received: rows.length, upcoming: 0, created: 0, refreshed: 0, kept: 0, skipped: [] as string[] };
  for (const r of rows) {
    if (!Array.isArray(r.values) || !r.values.some((v) => String(v ?? "").trim())) continue;
    const p = parseRow(sheet, r.row, r.values);
    if (!p.date || p.date < today || p.date > yearAhead) continue;
    summary.upcoming++;
    if (!p.ok) { summary.skipped.push(`row ${r.row}: ${p.problems.join(", ")}`); continue; }
    const { data, error } = await db.rpc("import_sheet_order", { p });
    if (error || !data?.ok) { summary.skipped.push(`row ${r.row}: ${error?.message || data?.reason || "failed"}`); continue; }
    if (data.action === "created") summary.created++; else if (data.action === "refreshed") summary.refreshed++; else summary.kept++;
  }
  return json({ ok: true, sheet, ...summary });
});
