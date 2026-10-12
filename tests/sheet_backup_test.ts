// Local test for the sheet-backup copying logic. Google and the database are both faked; nothing leaves this machine.
// Run: npx deno@2.1.4 run --allow-env tests/sheet_backup_test.ts
import { HEADER, run, status } from "../supabase/functions/sheet-backup/core.ts";

let fails = 0;
const check = (n: string, ok: unknown, d: unknown = "") => { console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " -> " + JSON.stringify(d).slice(0, 300))); if (!ok) fails++; };

// ---------- robot key (made up for the test) ----------
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const pk = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
const pem = "-----BEGIN PRIVATE KEY-----\n" + btoa(String.fromCharCode(...pk)).replace(/(.{64})/g, "$1\n") + "\n-----END PRIVATE KEY-----\n";
Deno.env.set("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: "cakes-robot@test-project.iam.gserviceaccount.com", private_key: pem }));

// ---------- fake Google ----------
const sheet: string[][] = []; // rows of the "Cake orders" tab
let tabs = ["Sheet1"], tokenCalls = 0, writes = 0, shared = true;
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
  const res = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (url === "https://oauth2.googleapis.com/token") {
    tokenCalls++;
    const jwt = new URLSearchParams(String(init.body)).get("assertion")!.split(".");
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, unb64(jwt[2]), new TextEncoder().encode(jwt[0] + "." + jwt[1]));
    const claims = JSON.parse(new TextDecoder().decode(unb64(jwt[1])));
    if (!ok || claims.scope !== "https://www.googleapis.com/auth/spreadsheets") return res({ error: "invalid_grant" }, 400);
    return res({ access_token: "tok", expires_in: 3600 });
  }
  if (!shared) return res({ error: { message: "denied" } }, 403);
  const u = decodeURIComponent(url.replace("https://sheets.googleapis.com/v4/spreadsheets/", ""));
  if (u.startsWith("SHEET123?")) return res({ properties: { title: "Cake backup" }, sheets: tabs.map((t, i) => ({ properties: { title: t, sheetId: i } })) });
  if (u === "SHEET123:batchUpdate") { const t = JSON.parse(String(init.body)).requests[0].addSheet.properties.title; tabs.push(t); return res({}); }
  if (u.startsWith("SHEET123/values/'Cake orders'!A:A")) return res(sheet.length ? { values: [sheet.map((r) => r[0] ?? "")] } : {});
  if (u === "SHEET123/values:batchUpdate") {
    const b = JSON.parse(String(init.body));
    if (b.valueInputOption !== "RAW") return res({ error: { message: "raw expected" } }, 400);
    for (const d of b.data) { writes++; const n = Number(d.range.match(/!A(\d+)$/)[1]); while (sheet.length < n) sheet.push([]); sheet[n - 1] = d.values[0]; }
    return res({});
  }
  return res({ error: { message: "unexpected " + u } }, 400);
}) as typeof fetch;

// ---------- fake database ----------
const state: any = { cfg: { id: 1, spreadsheet_id: "SHEET123", tab_name: "Cake orders", last_run_at: null, last_error: null, last_ok_at: null }, done: new Map<string, string>() };
let rows = [
  { order_id: "o1", reference: "CC-1001", cells: ["CC-1001", "2026-10-10 23:52", "Website"], hash: "h1" },
  { order_id: "o2", reference: "CC-1002", cells: ["CC-1002", "2026-09-21 12:50", "Website"], hash: "h2" },
];
function q(table: string) {
  const ops: any[] = [];
  const b: any = {
    update: (v: any) => (ops.push(["update", v]), b), eq: () => b, not: () => b, or: (x: string) => (ops.push(["or", x]), b),
    select: (_c?: string, o?: any) => (ops.push(["select", o]), b), maybeSingle: () => (ops.push(["single"]), b),
    upsert: (arr: any[]) => { arr.forEach((a) => state.done.set(a.order_id, a.hash)); return b; },
    delete: () => (ops.push(["delete"]), b),
    then: (ok: any) => ok(exec()),
  };
  function exec() {
    const up = ops.find((o) => o[0] === "update");
    if (table === "sheet_backup") {
      if (up && ops.some((o) => o[0] === "or")) {
        const last = state.cfg.last_run_at ? Date.parse(state.cfg.last_run_at) : 0;
        if (Date.now() - last < 50_000) return { data: null };
        Object.assign(state.cfg, up[1]); return { data: { ...state.cfg } };
      }
      if (up) { Object.assign(state.cfg, up[1]); return { data: null }; }
      return { data: { ...state.cfg } };
    }
    if (table === "sheet_backup_rows") {
      const sel = ops.find((o) => o[0] === "select");
      if (sel && sel[1]?.head) return { count: state.done.size };
      return { data: [...state.done].map(([order_id, hash]) => ({ order_id, hash })) };
    }
    return { data: null };
  }
  return b;
}
const db = { from: q, rpc: () => Promise.resolve({ data: rows, error: null }) };

// ---------- 1. first copy into an empty sheet ----------
let r: any = await run(db, false);
check("first copy succeeds", r.ok && r.written === 2, r);
check("robot signed in with a valid key", tokenCalls === 1);
check("tab made when missing", tabs.includes("Cake orders"));
check("header row written", JSON.stringify(sheet[0]) === JSON.stringify(HEADER), sheet[0]);
check("orders in rows 2 and 3", sheet[1][0] === "CC-1001" && sheet[2][0] === "CC-1002", sheet);

// ---------- 2. a second run within 50 seconds is skipped ----------
r = await run(db, false);
check("overlapping run skipped", r.busy === true, r);

// ---------- 3. nothing changed: nothing written ----------
state.cfg.last_run_at = null; writes = 0;
r = await run(db, false);
check("unchanged orders not rewritten", r.ok && r.written === 0 && writes === 0, r);

// ---------- 4. one order changes, one new order arrives ----------
rows = [
  { ...rows[0] },
  { order_id: "o2", reference: "CC-1002", cells: ["CC-1002", "2026-09-21 12:50", "Website", "Confirmed"], hash: "h2b" },
  { order_id: "o3", reference: "CC-1017", cells: ["CC-1017", "2026-10-12 16:30", "Staff entry"], hash: "h3" },
];
state.cfg.last_run_at = null; writes = 0;
r = await run(db, false);
check("only the changed and new order written", r.written === 2 && writes === 2, r);
check("changed order updated in its own row", sheet[2][3] === "Confirmed" && sheet.length === 4, sheet);
check("new order added at the bottom", sheet[3][0] === "CC-1017");
check("token reused, not fetched again", tokenCalls === 1, tokenCalls);

// ---------- 5. someone sorts the sheet: rows still found by reference ----------
const moved = [sheet[0], sheet[3], sheet[1], sheet[2]]; sheet.length = 0; moved.forEach((x) => sheet.push(x));
rows[0] = { ...rows[0], cells: ["CC-1001", "2026-10-10 23:52", "Website", "Cancelled"], hash: "h1b" };
state.cfg.last_run_at = null;
r = await run(db, false);
check("sorted sheet: right row updated, no duplicate", sheet[2][0] === "CC-1001" && sheet[2][3] === "Cancelled" && sheet.length === 4, sheet.map((x) => x[0]));

// ---------- 6. someone deletes a row: it comes back ----------
sheet.splice(1, 1); state.cfg.last_run_at = null;
r = await run(db, false);
check("deleted row restored", sheet.some((x) => x[0] === "CC-1017") && sheet.length === 4, sheet.map((x) => x[0]));

// ---------- 7. Copy now rewrites everything ----------
state.cfg.last_run_at = null; writes = 0;
r = await run(db, true);
check("copy now rewrites all orders", r.written === 3 && writes === 3, r);

// ---------- 8. sheet no longer shared: plain message saved ----------
shared = false; state.cfg.last_run_at = null;
r = await run(db, false);
check("unshared sheet gives a plain message", r.ok === false && /Share and add cakes-robot@/.test(r.message), r);
check("message saved for the Settings screen", /Share and add/.test(state.cfg.last_error));
shared = true; state.cfg.last_run_at = null;
r = await run(db, false);
check("error cleared once it works again", r.ok && state.cfg.last_error === null, state.cfg);

// ---------- 9. status ----------
const s: any = await status(db);
check("status shows robot email and copied count", s.robot_email === "cakes-robot@test-project.iam.gserviceaccount.com" && s.orders_copied === 3 && s.linked.url.includes("SHEET123"), s);


console.log(fails ? `${fails} failed` : "all passed");
if (fails) Deno.exit(1);
