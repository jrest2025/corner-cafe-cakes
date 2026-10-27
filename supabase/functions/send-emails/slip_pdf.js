// Kitchen slip as a PDF (A5 or DL portrait, set in Settings), matching the printed slip in the staff app.
// The order number comes first, large, with its version (v1, v2...). Black and white only, so it prints on any printer.
// Orders without an inspiration photo keep the slip as it was (without the Short notice tag, 27 Oct 2026).
// Orders with a photo get the photo slip below.
// Pure layout code: pdf-lib is passed in so the same file runs in the email sender (Deno) and in local tests (Node).

const MM = 72 / 25.4;

function t12(t) { const [h, m] = String(t || "").slice(0, 5).split(":").map(Number); if (isNaN(h)) return ""; return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? " AM" : " PM"}`; }
function dot12(t) { return t12(t).replace(":", "."); }
function longDate(d) { return d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : ""; }
function weekday(d) { return d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }) : ""; }
function dayMonth(d) { return d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }) : ""; }
// One plain payment line: paid in full, deposit paid with the balance, or nothing paid yet
// fee: the delivery fee inside the price, shown so nobody reads the total as the cake price only
export function payLine(price, paid, fee) {
  if (price == null || price === "") return Number(fee) > 0 ? `Cake to be priced · Delivery ${cents(fee)}` : "To be priced";
  const p = Number(price), d = Math.max(Number(paid || 0), 0), f = Number(fee) > 0 ? Number(fee) : 0;
  const split = f ? ` · Cake ${cents(Math.max(p - f, 0))} + Delivery ${cents(f)}` : "";
  if (d >= p - 0.005) return `Paid in full (${cents(p)})${split}`;
  if (d > 0.005) return `Deposit paid ${cents(d)} · Balance ${cents(p - d)} to pay${split}`;
  return `Full payment pending · ${cents(p)} to pay${split}`;
}
function shortDate(d) { return d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "") : ""; }
function cents(v) { return v == null || v === "" ? "" : "$" + Number(v).toFixed(2); }

export const SLIP_REF = /^[A-Z]{1,4}-[0-9]{3,}$/;

// File name the kitchen sees, the same pattern as the staff app's print: CC-1009 Pickup Mon 19 Oct 3.00 PM Cheesecake 8 inch Mere Tavola v1
export function slipFileName(s, slip, version) {
  const parts = [s.reference, s.method === "delivery" ? "Delivery" : "Pickup", shortDate(s.date), dot12(s.time), s.variant || s.cake || "", s.size ? s.size + " inch" : "", (slip && slip.name) || s.customer || "", "v" + (version || 1)];
  return parts.filter(Boolean).join(" ").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

// Paper sizes: A5 (148 x 210 mm) or DL (110 x 220 mm, the café's DL paper; was 99 x 210 until 20 October 2026).
// On DL, or when an order has a lot of text, the type is made smaller step by step until the whole slip fits on one page.
export const SLIP_PAPER = { A5: [148, 210], DL: [110, 220] };
export async function buildSlipPdf(PDFLib, opts) {
  const s = opts.snapshot;
  if (!s || !SLIP_REF.test(String(s.reference || "").trim())) throw new Error("No valid order number: kitchen slip not made");
  const paper = SLIP_PAPER[opts.paper] ? opts.paper : "A5";
  const steps = paper === "DL" ? [0.96, 0.87, 0.78, 0.69, 0.62] : [1, 0.9, 0.8, 0.7];
  let last, photoNote = false;
  if ((opts.photos || []).length) {
    let z0 = steps[0];
    for (const z of steps) { z0 = z; last = await renderSlipPhoto(PDFLib, opts, paper, z); if (!last || last.fits) break; }
    if (last) {
      // the photo grows into whatever height is left on the page
      if (last.fits && last.left > 12) last = await renderSlipPhoto(PDFLib, { ...opts, phH: Math.min(last.phH + last.left - 4, 260) }, paper, z0);
      return last.bytes;
    }
    photoNote = true;
  }
  for (const z of steps) { last = await renderSlipPlain(PDFLib, { ...opts, photoNote }, paper, z); if (last.fits) break; }
  return last.bytes;
}

async function renderSlipPlain(PDFLib, { snapshot: s, slip, version, changes, printedAt, logoPng, location, photoNote }, paper, z) {
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

  // 2. Black band with the logo (no opening hours: the kitchen does not need them)
  y -= 6; const bandH = 42;
  page.drawRectangle({ x: M, y: y - bandH, width: CW, height: bandH, color: BLACK });
  if (logoPng) { const img = await doc.embedPng(logoPng); const h = 28, w = img.width * h / img.height; page.drawImage(img, { x: M + 10, y: y - bandH + (bandH - h) / 2, width: w, height: h }); }
  else text("Corner Café", M + 10, y - 27, B, 16, WHITE);
  y -= bandH + 10;

  // 3. Printed line, what changed
  const printed = new Date(printedAt || Date.now());
  const pd = printed.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short" }) + ", " + printed.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?$/i, (_m, x) => " " + x.toUpperCase() + "M");
  text(`Kitchen slip ${vtxt} · Printed ${pd}`, M, y, R, 7.5);
  y -= 8;
  if (version > 1 && changes && changes.length) {
    const NAMES = { variant: "flavour", message: "inscription", has_dietary: "dietary", dietary_note: "dietary note", requirements: "cake requirements", requirements_note: "cake requirements", method: "collection or delivery", area: "delivery area", photos: "reference photos", kitchen_notes: "kitchen notes", order_notes: "order notes", customer: "name", rush: "short notice" };
    const named = changes.map((k) => NAMES[k] || k).filter((v, i, a) => a.indexOf(v) === i);
    const lines = wrap(B, `Changed since v${version - 1}: ${named.join(", ")}. Throw away the old slip.`, 8.5, CW - 10);
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
  // When: the weekday largest, so the kitchen reads the day at a glance; the date and time below; ready by beside
  const leftW = CW * 0.64, rightW = CW - leftW, whenH = 78;
  page.drawRectangle({ x: M, y: y - whenH, width: CW, height: whenH, color: BLACK });
  page.drawLine({ start: { x: M + leftW, y: y - 6 }, end: { x: M + leftW, y: y - whenH + 6 }, thickness: 1, color: WHITE });
  const wd = weekday(s.date).toUpperCase();
  let wdSize = 36; while (wdSize > 14 && width(B, wd, wdSize) > leftW - 12) wdSize -= 1;
  text(dl ? "DELIVERY" : "PICKUP", M + 6, y - 10, B, 6.5, WHITE);
  text(wd, M + 6, y - 12 - wdSize, B, wdSize, WHITE);
  let dtTxt = `${dayMonth(s.date)} · ${t12(s.time)}`, dtSize = 16; while (dtSize > 9 && width(B, dtTxt, dtSize) > leftW - 12) dtSize -= 0.5;
  text(dtTxt, M + 6, y - whenH + 9, B, dtSize, WHITE);
  text("READY BY", M + leftW + 6, y - 10, B, 6.5, WHITE);
  let rbSize = 20; while (rbSize > 11 && width(B, readyBy, rbSize) > rightW - 12) rbSize -= 1;
  text(readyBy, M + leftW + 6, y - 12 - rbSize, B, rbSize, WHITE);
  y -= whenH;
  // A custom cake that is not on the menu has no tin size: show its flavour and the size or servings agreed
  const req = !s.size && s.cake === "Custom cake";
  const cake = req ? (s.variant ? `${s.variant} (custom)` : "Custom cake") : (s.variant || s.cake || "") + (s.variant && s.cake && s.variant !== s.cake && !s.cake.includes(s.variant) ? ` (${s.cake})` : "") + (s.finish === "custom" ? " · Custom design" : "");
  const sizeTxt = s.size ? `${s.size} inch` + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : req ? (s.serves || "") + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : "";
  const h2 = Math.max(cellH(half, cake, 13), cellH(half, sizeTxt, 13));
  cell(M, y, half, "CAKE", cake, 13, false, h2); cell(M + half, y, half, "SIZE", sizeTxt, 13, false, h2); y -= h2;
  // Cake requirements (eggless, gluten-free, dairy-free, vegan) are a must for the kitchen, shown apart from allergies
  const REQ = { eggless: "EGGLESS (VEGETARIAN)", gluten_free: "GLUTEN-FREE", dairy_free: "DAIRY-FREE", vegan: "VEGAN (NO EGG, NO DAIRY)" };
  const reqs = (s.requirements || []).map((k) => k === "other" ? String(s.requirements_note || "OTHER").toUpperCase() : REQ[k] || k);
  if (reqs.length) { const hr = cell(M, y, CW, "MUST BE", reqs.join(" · "), 15, true); y -= hr; }
  const diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(", ") || "See order notes" : "None given";
  const hd = cell(M, y, CW, s.has_dietary ? "DIETARY OR ALLERGY" : "DIETARY", diet, 13, false);
  if (s.has_dietary) page.drawRectangle({ x: M + 1.5, y: y - hd + 1.5, width: CW - 3, height: hd - 3, borderColor: BLACK, borderWidth: 2 });
  y -= hd + 10;
  // A photo is on the order but could not be put on the slip
  if (photoNote) { const t = "DESIGN PHOTO: OPEN THE ORDER IN THE APP"; page.drawRectangle({ x: M, y: y - 18, width: CW, height: 18, borderColor: BLACK, borderWidth: 2 }); text(t, M + (CW - width(B, t, 9)) / 2, y - 12.5, B, 9); y -= 26; }

  // 5. Slip lines
  const sl = slip || {}, paid = Number(sl.paid || 0);
  const priceTxt = payLine(sl.price, paid, dl ? sl.delivery_fee : 0);
  const remarks = [s.finish === "custom" && s.design ? "Design: " + s.design : "", s.order_notes ? "Order notes: " + s.order_notes : "", s.kitchen_notes ? "Kitchen notes: " + s.kitchen_notes : ""].filter(Boolean).join(" · ") + (!s.has_dietary ? " · No dietary needs or allergies given." : "");
  const SRC = { online: "Website", walk_in: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", social: "Social media", corporate: "Corporate" };
  const at = sl.ordered_at ? new Date(sl.ordered_at) : null;
  const rows = [["Guest Name", sl.name || s.customer], ["Contact", sl.phone]];
  if (dl) rows.push(["Deliver to", [s.area, sl.address].filter(Boolean).join(", ") + (sl.receiver ? ` (for ${sl.receiver})` : "")]);
  rows.push(["Payment", priceTxt], ["Occasion", s.occasion], ["Candles", s.candles], ["Inscription", s.message ? `“${s.message}”` : "", 12], ["Remarks", remarks.replace(/^ · /, "")],
    ["Order Taken by", (sl.taken_by || "") + (sl.source && sl.source !== "online" ? ` (${SRC[sl.source] || sl.source})` : "")],
    ["Date", at ? at.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short", year: "numeric" }) + ", " + at.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?$/i, (_m, x) => " " + x.toUpperCase() + "M") : ""]);
  const LW = 78;
  rows.forEach(([k, v, sz]) => {
    const size = sz || 9.5, lines = wrap(sz ? B : R, v || " ", size, CW - LW - 4);
    text(k + ":", M, y - size, B, 8.5);
    lines.forEach((l, i) => { text(l, M + LW, y - size - i * (size + 3), sz ? B : R, size); page.drawLine({ start: { x: M + LW - 2, y: y - size - i * (size + 3) - 3 }, end: { x: W - M, y: y - size - i * (size + 3) - 3 }, thickness: 0.6, color: GREY }); });
    y -= lines.length * (size + 3) + 8;
  });

  // 6. Footer
  const loc = location || {};
  const f2 = "All prices include 12.5% VAT. 2% surcharge applies to all credit card payments.";
  const f1 = `Phone: ${loc.phone || "+ 679 8922760"} | Email: ${loc.email || "cornercafe@jacksfiji.com"}`;
  const f1y = M + 12 + (wrap(R, f2, 6, CW).length - 1) * 7;
  text(f1, (W - width(B, f1, 7.5)) / 2, f1y, B, 7.5);
  const f2w = wrap(R, f2, 6, CW);
  f2w.forEach((l, k) => text(l, (W - width(R, l, 6)) / 2, M + 3 + (f2w.length - 1 - k) * 7, R, 6, GREY));
  const fits = y > f1y + 12;
  page.scaleContent(z, z); page.setSize(RW, RH);
  return { fits, bytes: await doc.save() };
}

// Slip for an order with an inspiration photo (27 Oct 2026): logo top left in one band with the order number, larger type,
// the first photo beside Cake and Size (growing into any spare space), more photos on page 2.
async function renderSlipPhoto(PDFLib, { snapshot: s, slip, version, changes, printedAt, logoPng, location, photos, phH = 150 }, paper, z) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle(slipFileName(s, slip, version)); doc.setAuthor("Corner Café Cakes"); doc.setSubject(`Kitchen slip ${s.reference} v${version}`);
  const RW = SLIP_PAPER[paper][0] * MM, RH = SLIP_PAPER[paper][1] * MM, W = RW / z, H = RH / z, M = (paper === "DL" ? 6 : 8) * MM / z, CW = W - 2 * M;
  const page = doc.addPage([W, H]);
  const R = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0), WHITE = rgb(1, 1, 1), GREY = rgb(0.3, 0.3, 0.3), LIGHT = rgb(0.6, 0.6, 0.6);
  const safe = (f, txt) => Array.from(String(txt ?? "")).map((ch) => { try { f.encodeText(ch); return ch; } catch { return ch === "’" ? "'" : "?"; } }).join("");
  const width = (f, txt, size) => f.widthOfTextAtSize(safe(f, txt), size);
  const wrap = (f, txt, size, maxW) => {
    const out = []; String(safe(f, txt)).split(/\n/).forEach((para) => {
      let line = ""; para.split(/\s+/).forEach((w) => { const tryL = line ? line + " " + w : w; if (width(f, tryL, size) <= maxW || !line) line = tryL; else { out.push(line); line = w; } });
      out.push(line);
    }); return out;
  };
  const text = (txt, x, y, f, size, color = BLACK, pg = page) => pg.drawText(safe(f, txt), { x, y, size, font: f, color });
  // Photos: JPG or PNG, any that cannot be read are left out
  const imgs = [];
  for (const p of photos || []) {
    try { const b = p.bytes; imgs.push(b[0] === 0x89 && b[1] === 0x50 ? await doc.embedPng(b) : await doc.embedJpg(b)); } catch (_) { /* unreadable photo */ }
  }
  const fitImg = (pg, img, x, yTop, bw, bh) => {
    const r = Math.min(bw / img.width, bh / img.height), w = img.width * r, h = img.height * r;
    pg.drawImage(img, { x: x + (bw - w) / 2, y: yTop - bh + (bh - h) / 2, width: w, height: h });
  };
  // DL is narrow: the first photo goes full width under the cake details, and the type is larger
  if (!imgs.length) return null;   // no photo could be read: the caller uses today's slip with a note
  const isDL = true, stack = true;
  const F = isDL ? { lab: 7.5, cake: 17, size: 14, serves: 11.5, finish: 12, design: 12, msg: 15, none: 12, cand: 11.5, diet: 14, line: 11, lineLab: 9.5, LW: 64 }
                 : { lab: 6.5, cake: 15, size: 13, serves: 0, finish: 10.5, design: 10.5, msg: 14, none: 10.5, cand: 10, diet: 13, line: 9.5, lineLab: 8.5, LW: 58 };
  const beside = !stack && photoLayout === "beside" && imgs.length > 0, later = beside || stack ? imgs.slice(1) : imgs;
  let y = H - M;

  // 1. One black band at the very top: logo on the left, order number and version on the right
  const ref = String(s.reference).trim(), vtxt = "v" + version, bandH = 46;
  page.drawRectangle({ x: M, y: y - bandH, width: CW, height: bandH, color: BLACK });
  let logoW = 0;
  if (logoPng) { const img = await doc.embedPng(logoPng); const h = 30; logoW = img.width * h / img.height; page.drawImage(img, { x: M + 8, y: y - bandH + (bandH - h) / 2, width: logoW, height: h }); }
  else { logoW = width(B, "Corner Café", 16); text("Corner Café", M + 8, y - 28, B, 16, WHITE); }
  const vw = width(B, vtxt, 13) + 10, room = CW - 8 - logoW - 16 - vw - 10;
  let rs = 28; while (rs > 14 && width(B, ref, rs) + 6 + width(B, "ORDER", 7) > room) rs -= 1;
  const rx = W - M - 8 - vw - 8 - width(B, ref, rs);
  text("ORDER", rx - width(B, "ORDER", 7) - 6, y - bandH / 2 - 2, B, 7, WHITE);
  text(ref, rx, y - bandH / 2 - rs * 0.36, B, rs, WHITE);
  page.drawRectangle({ x: W - M - 8 - vw, y: y - bandH / 2 - 9, width: vw, height: 18, borderColor: WHITE, borderWidth: 1.5 });
  text(vtxt, W - M - 8 - vw + 5, y - bandH / 2 - 4.5, B, 13, WHITE);
  y -= bandH + 9;

  // 3. Printed line, what changed
  const printed = new Date(printedAt || Date.now());
  const pd = printed.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short" }) + ", " + printed.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?$/i, (_m, x) => " " + x.toUpperCase() + "M");
  text(`Kitchen slip ${vtxt} · Printed ${pd}`, M, y, R, 7.5);
  if (imgs.length) { const pt = imgs.length === 1 ? "1 DESIGN PHOTO" : `${imgs.length} DESIGN PHOTOS`; text(pt, W - M - width(B, pt, 7.5), y, B, 7.5); }
  y -= 8;
  if (version > 1 && changes && changes.length) {
    const NAMES = { variant: "flavour", message: "inscription", has_dietary: "dietary", dietary_note: "dietary note", requirements: "cake requirements", requirements_note: "cake requirements", method: "collection or delivery", area: "delivery area", photos: "design photos", kitchen_notes: "kitchen notes", order_notes: "order notes", customer: "name", rush: "date" };
    const named = changes.map((k) => NAMES[k] || k).filter((v, i, a) => a.indexOf(v) === i);
    const lines = wrap(B, `Changed since v${version - 1}: ${named.join(", ")}. Throw away the old slip.`, 8.5, CW - 10);
    const bh = lines.length * 11 + 8; page.drawRectangle({ x: M, y: y - bh, width: CW, height: bh, borderColor: BLACK, borderWidth: 1.5 });
    lines.forEach((l, k) => text(l, M + 5, y - 12 - k * 11, B, 8.5)); y -= bh + 6;
  }

  // 4. When and ready by (black)
  const dl = s.method === "delivery", lead = dl ? 60 : 30;
  const dueMin = Number(String(s.time).slice(0, 2)) * 60 + Number(String(s.time).slice(3, 5)) - lead;
  const readyBy = t12(String(Math.floor(dueMin / 60)).padStart(2, "0") + ":" + String(dueMin % 60).padStart(2, "0"));
  const leftW = CW * 0.64, rightW = CW - leftW, whenH = paper === "DL" ? 70 : 78;
  page.drawRectangle({ x: M, y: y - whenH, width: CW, height: whenH, color: BLACK });
  page.drawLine({ start: { x: M + leftW, y: y - 6 }, end: { x: M + leftW, y: y - whenH + 6 }, thickness: 1, color: WHITE });
  const wd = weekday(s.date).toUpperCase();
  let wdSize = 36; while (wdSize > 14 && width(B, wd, wdSize) > leftW - 12) wdSize -= 1;
  text(dl ? "DELIVERY" : "PICKUP", M + 6, y - 10, B, 6.5, WHITE);
  text(wd, M + 6, y - 12 - wdSize, B, wdSize, WHITE);
  let dtTxt = `${dayMonth(s.date)} · ${t12(s.time)}`, dtSize = 16; while (dtSize > 9 && width(B, dtTxt, dtSize) > leftW - 12) dtSize -= 0.5;
  text(dtTxt, M + 6, y - whenH + 9, B, dtSize, WHITE);
  text("READY BY", M + leftW + 6, y - 10, B, 6.5, WHITE);
  let rbSize = 20; while (rbSize > 11 && width(B, readyBy, rbSize) > rightW - 12) rbSize -= 1;
  text(readyBy, M + leftW + 6, y - 12 - rbSize, B, rbSize, WHITE);
  y -= whenH + 6;

  // 5. The cake: everything the kitchen makes, in one block. With a photo beside it when chosen.
  const req = !s.size && s.cake === "Custom cake";
  const cake = req ? (s.variant ? `${s.variant} (custom)` : "Custom cake") : (s.variant || s.cake || "") + (s.variant && s.cake && s.variant !== s.cake && !s.cake.includes(s.variant) ? ` (${s.cake})` : "");
  const sizeTxt = s.size ? `${s.size} inch` + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : req ? (s.serves || "") + (s.quantity > 1 ? ` × ${s.quantity} cakes` : "") : "";
  const serves = s.size && s.serves ? s.serves : "";
  const finish = s.finish === "custom" ? "Custom design" : "Standard finish";
  const design = s.finish === "custom" ? (s.design || "See photo") : "";
  const colW = beside ? CW * 0.56 : CW, photoX = M + colW + 6, photoW = CW - colW - 6;
  const yCake = y;
  // block rows: label, value, size, font
  const rows = isDL ? [["CAKE", cake, F.cake, B, finish], ["SIZE", sizeTxt, F.size, B, serves]]
    : [["CAKE", cake, F.cake, B], ["SIZE", [sizeTxt, serves].filter(Boolean).join(" · "), F.size, B], ["FINISH", finish, F.finish, B]];
  if (design) rows.push(["DESIGN", design, F.design, R]);
  rows.push(["INSCRIPTION", s.message ? `“${s.message}”` : "None", s.message ? F.msg : F.none, B]);
  const cand = [s.candles ? `Candles: ${s.candles}` : "No candles", s.occasion ? `Occasion: ${s.occasion}` : ""].filter(Boolean).join("   ·   ");
  if (!isDL) rows.push(["CANDLES AND OCCASION", cand, F.cand, R]);
  let by = y;
  // DL with a photo: Cake and Size take the left half, the photo the right half beside them (at least phH tall)
  const half = stack ? 2 : 0, hw2 = CW * 0.5;
  const rowW = (k) => k < half ? hw2 : colW;
  const rowH = rows.map(([lab, val, size, f, sub], k) => (F.lab + 8) + wrap(f, val || " ", size, rowW(k) - 12).length * (size + 2.5) + (sub ? wrap(R, sub, F.serves, rowW(k) - 12).length * (F.serves + 2.5) : 0) + 6);
  if (half) { const extra = Math.max(0, phH - rowH[0] - rowH[1]); rowH[0] += extra / 2; rowH[1] += extra / 2; }
  const photoTop = by, photoH = half ? rowH[0] + rowH[1] : 0;
  rows.forEach(([lab, val, size, f, sub], k) => {
    const cw = rowW(k), lines = wrap(f, val || " ", size, cw - 12), subL = sub ? wrap(R, sub, F.serves, cw - 12) : [];
    const top = F.lab + 6, h = rowH[k];
    page.drawRectangle({ x: M, y: by - h, width: cw, height: h, borderColor: BLACK, borderWidth: k === 0 ? 1.5 : 1 });
    text(lab, M + 6, by - F.lab - 3, B, F.lab, GREY);
    lines.forEach((l, i) => text(l, M + 6, by - top - (i + 1) * (size + 2.5) + 3, f, size));
    subL.forEach((l, i) => text(l, M + 6, by - top - lines.length * (size + 2.5) - (i + 1) * (F.serves + 2.5) + 3, R, F.serves));
    by -= h;
  });
  if (isDL) {
    // Candles and occasion side by side
    const hw = CW / 2, cl = wrap(R, s.candles || "None", F.cand, hw - 12), ol = wrap(R, s.occasion || "Not given", F.cand, hw - 12);
    const h = F.lab + 8 + Math.max(cl.length, ol.length) * (F.cand + 2.5) + 6;
    [["CANDLES", cl, 0], ["OCCASION", ol, hw]].forEach(([lab, ls, dx]) => {
      page.drawRectangle({ x: M + dx, y: by - h, width: hw, height: h, borderColor: BLACK, borderWidth: 1 });
      text(lab, M + dx + 6, by - F.lab - 3, B, F.lab, GREY);
      ls.forEach((l, i) => text(l, M + dx + 6, by - F.lab - 6 - (i + 1) * (F.cand + 2.5) + 3, R, F.cand));
    });
    by -= h;
  }
  if (stack) {
    const x = M + hw2, w = CW - hw2;
    page.drawRectangle({ x, y: photoTop - photoH, width: w, height: photoH, borderColor: BLACK, borderWidth: 1 });
    fitImg(page, imgs[0], x + 3, photoTop - 3, w - 6, photoH - 18);
    const cap = imgs.length > 1 ? `Photo 1 of ${imgs.length} · more on page 2` : "Design photo";
    let cs = 7.5; while (cs > 5.5 && width(B, cap, cs) > w - 6) cs -= 0.25;
    text(cap, x + (w - width(B, cap, cs)) / 2, photoTop - photoH + 5, B, cs, GREY);
  } else if (beside) {
    const ph = Math.max(yCake - by, 150), top = yCake;
    page.drawRectangle({ x: photoX, y: top - ph, width: photoW, height: ph, borderColor: BLACK, borderWidth: 1 });
    fitImg(page, imgs[0], photoX + 3, top - 3, photoW - 6, ph - 18);
    const cap = imgs.length > 1 ? `Design photo 1 of ${imgs.length} · more on page 2` : "Design photo";
    let cs = 6.5; while (cs > 5 && width(B, cap, cs) > photoW - 6) cs -= 0.25;
    text(cap, photoX + (photoW - width(B, cap, cs)) / 2, top - ph + 5, B, cs, GREY);
    by = Math.min(by, top - ph);
  } else if (imgs.length || (photos || []).length) {
    const t = !imgs.length ? "DESIGN PHOTO: OPEN THE ORDER IN THE APP" : imgs.length === 1 ? "DESIGN PHOTO ON PAGE 2" : `${imgs.length} DESIGN PHOTOS ON PAGE 2`, bh = 20;
    page.drawRectangle({ x: M, y: by - bh, width: CW, height: bh, borderColor: BLACK, borderWidth: 2 });
    text(t, M + (CW - width(B, t, 10)) / 2, by - 14, B, 10); by -= bh;
  }
  y = by;
  const REQ = { eggless: "EGGLESS (VEGETARIAN)", gluten_free: "GLUTEN-FREE", dairy_free: "DAIRY-FREE", vegan: "VEGAN (NO EGG, NO DAIRY)" };
  const reqs = (s.requirements || []).map((k) => k === "other" ? String(s.requirements_note || "OTHER").toUpperCase() : REQ[k] || k);
  const cell = (x, yTop, w, label, value, size, inverse) => {
    const lines = wrap(B, value || " ", size, w - 12); const h = F.lab + 8 + lines.length * (size + 2.5) + 6;
    if (inverse) page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: BLACK });
    else page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: BLACK, borderWidth: 1 });
    const c = inverse ? WHITE : BLACK; text(label, x + 6, yTop - F.lab - 3, B, F.lab, inverse ? WHITE : GREY);
    lines.forEach((l, k) => text(l, x + 6, yTop - F.lab - 6 - (k + 1) * (size + 2.5) + 3, B, size, c)); return h;
  };
  if (reqs.length) y -= cell(M, y, CW, "MUST BE", reqs.join(" · "), F.diet, true);
  const diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(", ") || "See order notes" : "None given";
  const hd = cell(M, y, CW, "ALLERGY", diet, s.has_dietary ? F.diet : F.none, false);
  if (s.has_dietary) page.drawRectangle({ x: M + 1.5, y: y - hd + 1.5, width: CW - 3, height: hd - 3, borderColor: BLACK, borderWidth: 2 });
  y -= hd + 10;

  // 6. Customer and payment
  const sl = slip || {}, paid = Number(sl.paid || 0);
  const priceTxt = payLine(sl.price, paid, dl ? sl.delivery_fee : 0);
  const notes = [s.order_notes ? "Order: " + s.order_notes : "", s.kitchen_notes ? "Kitchen: " + s.kitchen_notes : ""].filter(Boolean).join(" · ");
  const SRC = { online: "Website", walk_in: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", social: "Social media", corporate: "Corporate" };
  const at = sl.ordered_at ? new Date(sl.ordered_at) : null;
  const rowsB = isDL ? [["Guest", [sl.name || s.customer, sl.phone].filter(Boolean).join(" · ")]] : [["Guest", sl.name || s.customer], ["Contact", sl.phone]];
  if (dl) rowsB.push(["Deliver to", [s.area, sl.address].filter(Boolean).join(", ") + (sl.receiver ? ` (for ${sl.receiver})` : "")]);
  rowsB.push(["Payment", priceTxt]);
  if (notes) rowsB.push(["Notes", notes]);
  rowsB.push(["Taken by", (sl.taken_by || "") + (sl.source && sl.source !== "online" ? ` (${SRC[sl.source] || sl.source})` : "") + (at ? " · " + at.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short" }) + ", " + at.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?$/i, (_m, x) => " " + x.toUpperCase() + "M") : "")]);
  const LW = F.LW;
  rowsB.forEach(([k, v]) => {
    const size = F.line, lines = wrap(R, v || " ", size, CW - LW - 4);
    text(k, M, y - size, B, F.lineLab);
    lines.forEach((l, i) => { text(l, M + LW, y - size - i * (size + 3), R, size); page.drawLine({ start: { x: M + LW - 2, y: y - size - i * (size + 3) - 3 }, end: { x: W - M, y: y - size - i * (size + 3) - 3 }, thickness: 0.6, color: LIGHT }); });
    y -= lines.length * (size + 3) + 7;
  });

  // 7. Footer
  const loc = location || {};
  const f2 = "All prices include 12.5% VAT. 2% surcharge applies to all credit card payments.";
  const f1 = `Phone: ${loc.phone || "+ 679 8922760"} | Email: ${loc.email || "cornercafe@jacksfiji.com"}`;
  const f1y = M + 12 + (wrap(R, f2, 6, CW).length - 1) * 7;
  text(f1, (W - width(B, f1, 7.5)) / 2, f1y, B, 7.5);
  const f2w = wrap(R, f2, 6, CW);
  f2w.forEach((l, k) => text(l, (W - width(R, l, 6)) / 2, M + 3 + (f2w.length - 1 - k) * 7, R, 6, GREY));
  const fits = y > f1y + 12;
  page.scaleContent(z, z); page.setSize(RW, RH);

  // 8. Page 2 onwards: design photos, large, two per page at most
  const M2 = (paper === "DL" ? 6 : 8) * MM, CW2 = RW - 2 * M2;
  for (let i = 0; i < later.length; i += 2) {
    const pg = doc.addPage([RW, RH]); let yy = RH - M2;
    text("ORDER", M2, yy - 14, B, 7, BLACK, pg); text(ref, M2 + width(B, "ORDER", 7) + 6, yy - 17, B, 18, BLACK, pg);
    const vt = `${vtxt} · Design photos`; text(vt, RW - M2 - width(B, vt, 9), yy - 15, B, 9, BLACK, pg);
    yy -= 22; pg.drawLine({ start: { x: M2, y: yy }, end: { x: RW - M2, y: yy }, thickness: 1.5, color: BLACK }); yy -= 8;
    const cakeLine = [cake, sizeTxt].filter(Boolean).join(" · "); text(cakeLine, M2, yy - 9, B, 9, BLACK, pg); yy -= 16;
    const pair = later.slice(i, i + 2), slotH = (yy - M2 - 4 * (pair.length - 1)) / pair.length;
    pair.forEach((img, k) => {
      const top = yy - k * (slotH + 4);
      pg.drawRectangle({ x: M2, y: top - slotH, width: CW2, height: slotH, borderColor: BLACK, borderWidth: 0.8 });
      fitImg(pg, img, M2 + 4, top - 4, CW2 - 8, slotH - 18);
      const n = (beside ? i + k + 2 : i + k + 1), cap = `Design photo ${n} of ${imgs.length}`;
      text(cap, M2 + (CW2 - width(B, cap, 7)) / 2, top - slotH + 5, B, 7, GREY, pg);
    });
  }
  return { fits, stack, phH, left: y - (f1y + 12), bytes: await doc.save() };
}
