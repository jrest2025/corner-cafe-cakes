// Google Sheets copying logic for sheet-backup, kept apart from the request handling so it can be tested.
export const HEADER = [
  "Order reference", "Received", "Came from", "Order status", "Payment", "Collection or delivery", "Date needed", "Time needed",
  "Customer name", "Phone", "Email", "Prefers contact by", "Company",
  "Cake", "Flavour", "Size", "Serves", "Quantity", "Finish", "Design description", "Message on cake", "Occasion",
  "Dietary requirements", "Dietary note", "Reference photos",
  "Delivery area", "Delivery address", "Delivery contact", "Delivery fee (FJD)",
  "Estimated total (FJD)", "Final total (FJD)", "Customer notes", "Wants updates", "Last changed",
];
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";

export class Plain extends Error {} // a message safe to show staff as it is

// ---------- Google ----------
export function robot(): { client_email: string; private_key: string } | null {
  try {
    const j = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "");
    return j.client_email && j.private_key ? j : null;
  } catch { return null; }
}
const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let cached: { token: string; until: number } | null = null;
async function googleToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const r = robot();
  if (!r) throw new Plain("The Google robot account is not set up yet.");
  const pem = r.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({ iss: r.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64url(sig) }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Plain("Google did not accept the robot account. Check the key saved in Supabase.");
  cached = { token: j.access_token, until: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

async function g(path: string, init: RequestInit = {}) {
  const res = await fetch(SHEETS + path, { ...init, headers: { Authorization: "Bearer " + (await googleToken()), "Content-Type": "application/json" } });
  const j = await res.json().catch(() => ({}));
  if (res.ok) return j;
  const who = robot()?.client_email || "the robot account";
  if (res.status === 403) throw new Plain(`The robot cannot edit this sheet. In Google Sheets, press Share and add ${who} as an Editor.`);
  if (res.status === 404) throw new Plain("That sheet was not found. Check the link.");
  if (res.status === 429 || res.status >= 500) throw new Plain("Google was busy. It will try again in 5 minutes.");
  throw new Plain("Google refused the change: " + String(j?.error?.message || res.status).slice(0, 200));
}
const A1 = (tab: string, r: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${r}`);

// Make sure the tab and header row exist.
export async function prepare(id: string, tab: string) {
  const meta = await g(`${id}?fields=properties.title,sheets.properties(title,sheetId)`);
  const has = (meta.sheets || []).some((s: any) => s.properties?.title === tab);
  if (!has) {
    await g(`${id}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] }) });
  }
  return String(meta.properties?.title || "Untitled sheet");
}

// ---------- copying ----------
export async function copyOrders(db: any, cfg: any, force: boolean) {
  const id = cfg.spreadsheet_id as string, tab = cfg.tab_name as string;
  await prepare(id, tab);
  const colA = await g(`${id}/values/${A1(tab, "A:A")}?majorDimension=COLUMNS`);
  const refs: string[] = (colA.values && colA.values[0]) || [];
  const data: { range: string; values: unknown[][] }[] = [];
  if (refs[0] !== HEADER[0]) data.push({ range: `'${tab}'!A1`, values: [HEADER] });
  const at = new Map<string, number>();
  refs.forEach((r, i) => { if (i > 0 && r) at.set(String(r), i + 1); });

  const { data: rows, error } = await db.rpc("sheet_backup_rows_data");
  if (error) throw new Error(error.message);
  const { data: done } = await db.from("sheet_backup_rows").select("order_id, hash");
  const seen = new Map<string, string>((done || []).map((d: any) => [d.order_id, d.hash]));

  let next = Math.max(refs.length, 1) + 1;
  const changed: { order_id: string; hash: string }[] = [];
  for (const r of rows || []) {
    const row = at.get(r.reference);
    if (!force && row && seen.get(r.order_id) === r.hash) continue;
    const n = row || next++;
    data.push({ range: `'${tab}'!A${n}`, values: [r.cells] });
    changed.push({ order_id: r.order_id, hash: r.hash });
  }
  for (let i = 0; i < data.length; i += 200) {
    await g(`${id}/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data: data.slice(i, i + 200) }) });
  }
  if (changed.length) {
    const now = new Date().toISOString();
    for (let i = 0; i < changed.length; i += 500) {
      await db.from("sheet_backup_rows").upsert(changed.slice(i, i + 500).map((c) => ({ ...c, synced_at: now })));
    }
  }
  return { written: changed.length, total: (rows || []).length };
}

// Runs one copy, unless another started in the last 50 seconds.
export async function run(db: any, force: boolean) {
  const since = new Date(Date.now() - 50_000).toISOString();
  const { data: cfg } = await db.from("sheet_backup").update({ last_run_at: new Date().toISOString() })
    .eq("id", 1).not("spreadsheet_id", "is", null).or(`last_run_at.is.null,last_run_at.lt.${since}`).select().maybeSingle();
  if (!cfg) return { ok: false, busy: true };
  try {
    const r = await copyOrders(db, cfg, force);
    await db.from("sheet_backup").update({ last_ok_at: new Date().toISOString(), last_error: null, last_written: r.written, updated_at: new Date().toISOString() }).eq("id", 1);
    return { ok: true, ...r };
  } catch (e) {
    const msg = e instanceof Plain ? e.message : "The copy did not finish. It will try again in 5 minutes.";
    await db.from("sheet_backup").update({ last_error: msg, updated_at: new Date().toISOString() }).eq("id", 1);
    if (!(e instanceof Plain)) console.error(e);
    return { ok: false, message: msg };
  }
}

export async function status(db: any) {
  const { data: c } = await db.from("sheet_backup").select("*").eq("id", 1).maybeSingle();
  const { count } = await db.from("sheet_backup_rows").select("order_id", { count: "exact", head: true });
  return {
    ok: true,
    robot_email: robot()?.client_email || null,
    linked: c?.spreadsheet_id ? { url: `https://docs.google.com/spreadsheets/d/${c.spreadsheet_id}/edit`, title: c.spreadsheet_title, tab: c.tab_name, linked_at: c.linked_at } : null,
    last_ok_at: c?.last_ok_at || null,
    last_error: c?.last_error || null,
    orders_copied: count || 0,
  };
}

