// sheet-mirror: read-only order copy for the backup Google Sheet.
// The script inside the Sheet (in the owner's Google Drive) calls this every minute with the Sheet's access code.
// op "pull" returns a full snapshot of each tab; op "ack" records what the Sheet wrote, or the error it hit.
// The Sheet can never change orders: there is no write path from the Sheet into the database.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function rpc(fn: string, args: Record<string, unknown> = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
async function code() {
  const r = await fetch(`${SB_URL}/rest/v1/app_config?key=eq.mirror_key&select=value`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  const rows = await r.json();
  return rows?.[0]?.value as string | undefined;
}
// Same time whatever the input, so the code cannot be guessed letter by letter
function same(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  try {
    const want = await code();
    const got = String(req.headers.get("x-mirror-key") || b.key || "");
    if (!want || !got || !same(got, want)) return json({ ok: false, error: "forbidden", message: "The access code is wrong or has been changed. Ask an administrator for the new code." }, 403);
    if (b.op === "pull") {
      const snap = await rpc("mirror_snapshot");
      await rpc("mirror_record", { p_kind: "pull", p_snapshot_at: null, p_rows: null, p_error: null, p_url: null, p_title: null });
      return json({ ok: true, ...snap });
    }
    if (b.op === "ack") {
      await rpc("mirror_record", {
        p_kind: "ack", p_snapshot_at: b.snapshot_at ?? null, p_rows: b.rows ?? null,
        p_error: b.error ? String(b.error).slice(0, 500) : null, p_url: b.url ? String(b.url).slice(0, 300) : null, p_title: b.title ? String(b.title).slice(0, 200) : null,
      });
      return json({ ok: true });
    }
    return json({ ok: false, error: "unknown_op" }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "server_error", message: "The order server had a problem. The Sheet keeps its last copy." }, 500);
  }
});
