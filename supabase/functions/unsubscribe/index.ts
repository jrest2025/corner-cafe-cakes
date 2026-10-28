// Corner Café cakes: unsubscribe from offers.
// Called two ways, both POST:
//   1. The Corner Café /unsubscribe page, when the customer taps Unsubscribe: JSON { o, s }
//   2. The email app's own Unsubscribe button (one-click, RFC 8058): form body "List-Unsubscribe=One-Click", o and s in the link
// o is the order id, s its signature. The signature is made by send-emails with the same key, so only links we sent work.
// Returns only { ok, already }: no names, emails or phone numbers. Order emails are not affected.
// Deploy with verify_jwt off: email apps send no login.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGINS = ["https://www.cornercafefiji.com", "https://cornercafefiji.com", "https://central.cornercafefiji.com"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", Vary: "Origin" } : {};
}
const out = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req) } });

// Same as send-emails: HMAC-SHA256 of "cc-unsub-v1:<order id>", first 18 bytes, base64url
export async function sign(orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SB_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("cc-unsub-v1:" + orderId))).slice(0, 18);
  return btoa(String.fromCharCode(...mac)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return out(req, { ok: false, error: "method" }, 405);
  const url = new URL(req.url);
  let o = url.searchParams.get("o") || "", s = url.searchParams.get("s") || "", via = "one-click";
  const type = req.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const b = await req.json(); o = String(b.o || o); s = String(b.s || s); via = "page";
    } else {
      const f = await req.text();
      if (!/List-Unsubscribe=One-Click/i.test(f)) return out(req, { ok: false, error: "bad_request" }, 400);
    }
  } catch { return out(req, { ok: false, error: "bad_request" }, 400); }
  o = o.toLowerCase();
  if (!UUID.test(o) || !s || !same(await sign(o), s)) return out(req, { ok: false, error: "bad_link" }, 403);
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/unsubscribe_by_order`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_order: o, p_via: via }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 300));
    if (!d.ok) return out(req, { ok: false, error: d.error || "not_found" }, 404);
    return out(req, { ok: true, already: !!d.already });
  } catch (e) {
    console.error(e);
    return out(req, { ok: false, error: "server_error" }, 500);
  }
});
