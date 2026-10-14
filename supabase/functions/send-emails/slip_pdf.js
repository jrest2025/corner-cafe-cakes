// Kitchen slip as a PDF (A5 or DL portrait, set in Settings), matching the printed slip in the staff app.
// The order number comes first, large, with its version (v1, v2...). Black and white only, so it prints on any printer.
// Pure layout code: pdf-lib is passed in so the same file runs in the email sender (Deno) and in local tests (Node).

const MM = 72 / 25.4;

function t12(t) { const [h, m] = String(t || "").slice(0, 5).split(":").map(Number); if (isNaN(h)) return ""; return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`; }
function dot12(t) { return t12(t).replace(":", "."); }
function longDate(d) { return d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : ""; }
function shortDate(d) { return d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "") : ""; }
function cents(v) { return v == null || v === "" ? "" : "$" + Number(v).toFixed(2); }

export const SLIP_REF = /^[A-Z]{1,4}-[0-9]{3,}$/;

// File name the kitchen sees, the same pattern as the staff app's print: CC-1009 Pickup Mon 19 Oct 3.00pm Cheesecake 8 inch Mere Tavola v1
export function slipFileName(s, slip, version) {
  const parts = [s.reference, s.method === "delivery" ? "Delivery" : "Pickup", shortDate(s.date), dot12(s.time), s.variant || s.cake || "", s.size ? s.size + " inch" : "", (slip && slip.name) || s.customer || "", "v" + (version || 1)];
  return parts.filter(Boolean).join(" ").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

// Paper sizes: A5 (148 x 210 mm) or DL (99 x 210 mm). On DL, or when an order has a lot of text,
// the type is made smaller step by step until the whole slip fits on one page.
export const SLIP_PAPER = { A5: [148, 210], DL: [99, 210] };
export async function buildSlipPdf(PDFLib, opts) {
  const s = opts.snapshot;
  if (!s || !SLIP_REF.test(String(s.reference || "").trim())) throw new Error("No valid order number: kitchen slip not made");
  const paper = SLIP_PAPER[opts.paper] ? opts.paper : "A5";
  const steps = paper === "DL" ? [0.86, 0.78, 0.7, 0.62] : [1, 0.9, 0.8, 0.7];
  let last;
  for (const z of steps) { last = await renderSlip(PDFLib, opts, paper, z); if (last.fits) break; }
  return last.bytes;
}

async function renderSlip(PDFLib, { snapshot: s, slip, version, changes, printedAt, logoPng, location }, paper, z) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle(slipFileName(s, slip, version)); doc.setAuthor("Corner Café Cakes"); doc.setSubject(`Kitchen slip ${s.reference} v${version}`);
  // Drawn at a larger logical size, then the whole page is shrunk by z, so type and spacing scale together
  const RW = SLIP_PAPER[paper][0] * MM, RH = SLIP_PAPER[paper][1] * MM, W = RW / z, H = RH / z, M = (paper === "DL" ? 6 : 8) * MM / z, CW = W - 2 * M;
  const page = doc.addPage([W, H]);
  const R = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0), WHITE = rgb(1, 1, 1), GREY = rgb(0.35, 0.35, 0.35);
  // Keep only characters the built-in font can print
  const safe = (f, txt) => Array.from(String(txt ?? "")).map((ch) => { try { f.encodeText(ch); return ch; } catch { return ch === "’" ? "'" : "?"; } }).join("");
  const width = (f, txt, size) => f.widthOfTextAtSize(safe(f, txt), size);
  const wrap = (f, txt, size, maxW) => {
    const out = []; String(safe(f, txt)).split(/\n/).forEach((para) => {
      let line = ""; para.split(/\s+/).forEach((w) => { const tryL = line ? line + " " + w : w; if (width(f, tryL, size) <= maxW || !line) line = tryL; else { out.push(line); line = w; } });
      out.push(line);
    }); return out;
  };
  const text = (txt, x, y, f, size, color = BLACK) => page.drawText(safe(f, txt), { x, y, size, font: f, color });
  let y = H - M;

  // 1. Order number first
  const ref = String(s.reference).trim(), vtxt = "v" + version;
  text("ORDER", M, y - 22, B, 9);
  text(ref, M + width(B, "ORDER", 9) + 8, y - 26, B, 30);
  const vw = width(B, vtxt, 16) + 10;
  page.drawRectangle({ x: W - M - vw, y: y - 26, width: vw, height: 22, borderColor: BLACK, borderWidth: 2 });
  text(vtxt, W - M - vw + 5, y - 20, B, 16);
  y -= 32; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: BLACK });

  // 2. Black band with the logo and hours
  y -= 6; const bandH = 42;
  page.drawRectangle({ x: M, y: y - bandH, width: CW, height: bandH, color: BLACK });
  if (logoPng) { const img = await doc.embedPng(logoPng); const h = 28, w = img.width * h / img.height; page.drawImage(img, { x: M + 10, y: y - bandH + (bandH - h) / 2, width: w, height: h }); }
  else text("Corner Café", M + 10, y - 27, B, 16, WHITE);
  ["MONDAY - SUNDAY", "8AM - 9PM"].forEach((l, k) => text(l, W - M - 10 - width(B, l, 8.5), y - 17 - k * 11, B, 8.5, WHITE));
  y -= bandH + 10;

  // 3. Printed line, short notice, what changed
  const printed = new Date(printedAt || Date.now());
  const pd = printed.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short" }) + ", " + printed.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "");
  text(`Kitchen slip ${vtxt} · Printed ${pd}`, M, y, R, 7.5);
  if (s.rush) { const rw = width(B, "SHORT NOTICE", 7.5) + 8; page.drawRectangle({ x: W - M - rw, y: y - 3, width: rw, height: 12, borderColor: BLACK, borderWidth: 1.2 }); text("SHORT NOTICE", W - M - rw + 4, y, B, 7.5); }
  y -= 8;
  if (version > 1 && changes && changes.length) {
    const lines = wrap(B, `Changed since v${version - 1}: ${changes.join(", ")}. Throw away the old slip.`, 8.5, CW - 10);
    const bh = lines.length * 11 + 8; page.drawRectangle({ x: M, y: y - bh, width: CW, height: bh, borderColor: BLACK, borderWidth: 1.5 });
    lines.forEach((l, k) => text(l, M + 5, y - 12 - k * 11, B, 8.5)); y -= bh + 6;
  }

  // 4. Key facts: pickup and ready by (black), cake and size, dietary
  const dl = s.method === "delivery", lead = dl ? 60 : 30;
  const dueMin = Number(String(s.time).slice(0, 2)) * 60 + Number(String(s.time).slice(3, 5)) - lead;
  const readyBy = t12(String(Math.floor(dueMin / 60)).padStart(2, "0") + ":" + String(dueMin % 60).padStart(2, "0"));
  const half = CW / 2;
  const cellH = (w, value, size) => 14 + wrap(B, value || " ", size, w - 10).length * (size + 2) + 6;
  const cell = (x, yTop, w, label, value, size, inverse, minH) => {
    const lines = wrap(B, value || " ", size, w - 10); const h = Math.max(minH || 0, 14 + lines.length * (size + 2) + 6);
    if (inverse) page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: BLACK });
    else page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: BLACK, borderWidth: 1 });
    const c = inverse ? WHITE : BLACK; text(label, x + 5, yTop - 10, B, 6.5, c);
    lines.forEach((l, k) => text(l, x + 5, yTop - 12 - (k + 1) * (size + 2) + 2, B, size, c)); return h;
  };
  const when = `${longDate(s.date)}, ${t12(s.time)}`, h1 = Math.max(cellH(half, when, 14), cellH(half, readyBy, 14));
  cell(M, y, half, dl ? "DELIVERY" : "PICKUP", when, 14, true, h1); cell(M + half, y, half, "READY BY", readyBy, 14, true, h1); y -= h1;
  // A custom cake that is not on the menu has no tin size: show its flavour and the size or servings agreed
  const req = !s.size && s.cake === "Custom cake";
  const cake = req ? "Custom cake" + (s.variant ? `, ${s.variant}` : "") : (s.variant || s.cake || "") + (s.variant && s.cake && s.variant !== s.cake ? ` (${s.cake})` : "") + (s.finish === "custom" ? " · Custom design" : "");
  const sizeTxt = s.size ? `${s.size} inch` + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : req ? (s.serves || "") + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : "";
  const h2 = Math.max(cellH(half, cake, 13), cellH(half, sizeTxt, 13));
  cell(M, y, half, "CAKE", cake, 13, false, h2); cell(M + half, y, half, "SIZE", sizeTxt, 13, false, h2); y -= h2;
  const diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(", ") || "See order notes" : "None given";
  const hd = cell(M, y, CW, s.has_dietary ? "DIETARY OR ALLERGY" : "DIETARY", diet, 13, false);
  if (s.has_dietary) page.drawRectangle({ x: M + 1.5, y: y - hd + 1.5, width: CW - 3, height: hd - 3, borderColor: BLACK, borderWidth: 2 });
  y -= hd + 10;

  // 5. Slip lines
  const sl = slip || {}, paid = Number(sl.paid || 0);
  const priceTxt = sl.price != null && sl.price !== "" ? cents(sl.price) + (paid > 0 ? ` · Paid ${cents(paid)} · To pay ${cents(Math.max(Number(sl.price) - paid, 0))}` : "") : "To be priced";
  const remarks = [s.finish === "custom" && s.design ? "Design: " + s.design : "", s.occasion ? "Occasion: " + s.occasion : "", s.order_notes ? "Order notes: " + s.order_notes : "", s.kitchen_notes ? "Kitchen notes: " + s.kitchen_notes : ""].filter(Boolean).join(" · ") + (!s.has_dietary ? " · No dietary needs or allergies given." : "");
  const SRC = { online: "Website", walk_in: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", social: "Social media", corporate: "Corporate" };
  const at = sl.ordered_at ? new Date(sl.ordered_at) : null;
  const rows = [["Guest Name", sl.name || s.customer], ["Contact", sl.phone]];
  if (dl) rows.push(["Deliver to", [s.area, sl.address].filter(Boolean).join(", ") + (sl.receiver ? ` (for ${sl.receiver})` : "")]);
  rows.push(["Price", priceTxt], ["Candles", s.candles], ["Inscription", s.message ? `“${s.message}”` : "", 12], ["Remarks", remarks.replace(/^ · /, "")],
    ["Order Taken by", (sl.taken_by || "") + (sl.source && sl.source !== "online" ? ` (${SRC[sl.source] || sl.source})` : "")],
    ["Date", at ? at.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short", year: "numeric" }) + ", " + at.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "") : ""]);
  const LW = 78;
  rows.forEach(([k, v, sz]) => {
    const size = sz || 9.5, lines = wrap(sz ? B : R, v || " ", size, CW - LW - 4);
    text(k + ":", M, y - size, B, 8.5);
    lines.forEach((l, i) => { text(l, M + LW, y - size - i * (size + 3), sz ? B : R, size); page.drawLine({ start: { x: M + LW - 2, y: y - size - i * (size + 3) - 3 }, end: { x: W - M, y: y - size - i * (size + 3) - 3 }, thickness: 0.6, color: GREY }); });
    y -= lines.length * (size + 3) + 8;
  });

  // 6. Footer
  const loc = location || {};
  const f2 = "All prices include 12.5% VAT. 2% surcharge applies to overseas credit card transactions.";
  const f1 = `Phone: ${loc.phone || "+ 679 8922760"} | Email: ${loc.email || "cornercafe@jacksfiji.com"}`;
  const f1y = M + 12 + (wrap(R, f2, 6, CW).length - 1) * 7;
  text(f1, (W - width(B, f1, 7.5)) / 2, f1y, B, 7.5);
  const f2w = wrap(R, f2, 6, CW);
  f2w.forEach((l, k) => text(l, (W - width(R, l, 6)) / 2, M + 3 + (f2w.length - 1 - k) * 7, R, 6, GREY));
  const fits = y > f1y + 12;
  page.scaleContent(z, z); page.setSize(RW, RH);
  return { fits, bytes: await doc.save() };
}
