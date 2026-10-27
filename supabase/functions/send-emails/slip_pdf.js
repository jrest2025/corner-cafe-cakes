// Kitchen slip as a PDF (A5 or DL portrait, set in Settings), matching the printed slip in the staff app.
// The order number comes first, large, with its version (v1, v2...). Black and white only, so it prints on any printer.
// Design photos (opts.photos, JPG or PNG bytes): the first sits beside the cake details on page 1, the rest on page 2.
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
  let last;
  for (const z of steps) { last = await renderSlip(PDFLib, opts, paper, z); if (last.fits) break; }
  return last.bytes;
}

// opts.photos: [{ bytes: Uint8Array }] (JPG or PNG), opts.photoLayout: "beside" (first photo on page 1) or "page2"
async function renderSlip(PDFLib, { snapshot: s, slip, version, changes, printedAt, logoPng, location, photos, photoLayout = "beside" }, paper, z) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle(slipFileName(s, slip, version)); doc.setAuthor("Corner Café Cakes"); doc.setSubject(`Kitchen slip ${s.reference} v${version}`);
  const RW = SLIP_PAPER[paper][0] * MM, RH = SLIP_PAPER[paper][1] * MM, W = RW / z, H = RH / z, M = (paper === "DL" ? 6 : 8) * MM / z, CW = W - 2 * M;
  const page = doc.addPage([W, H]);
  const R = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0), WHITE = rgb(1, 1, 1), GREY = rgb(0.35, 0.35, 0.35), LIGHT = rgb(0.6, 0.6, 0.6);
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
  const beside = photoLayout === "beside" && imgs.length > 0, later = beside ? imgs.slice(1) : imgs;
  let y = H - M;

  // 1. Order number first
  const ref = String(s.reference).trim(), vtxt = "v" + version;
  text("ORDER", M, y - 22, B, 9);
  text(ref, M + width(B, "ORDER", 9) + 8, y - 26, B, 30);
  const vw = width(B, vtxt, 16) + 10;
  page.drawRectangle({ x: W - M - vw, y: y - 26, width: vw, height: 22, borderColor: BLACK, borderWidth: 2 });
  text(vtxt, W - M - vw + 5, y - 20, B, 16);
  y -= 32; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 2, color: BLACK });

  // 2. Black band, logo centred
  y -= 6; const bandH = 42;
  page.drawRectangle({ x: M, y: y - bandH, width: CW, height: bandH, color: BLACK });
  if (logoPng) { const img = await doc.embedPng(logoPng); const h = 28, w = img.width * h / img.height; page.drawImage(img, { x: M + (CW - w) / 2, y: y - bandH + (bandH - h) / 2, width: w, height: h }); }
  else text("Corner Café", M + (CW - width(B, "Corner Café", 16)) / 2, y - 27, B, 16, WHITE);
  y -= bandH + 10;

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
  const rows = [["CAKE", cake, 15, B], ["SIZE", [sizeTxt, serves].filter(Boolean).join(" · "), 13, B], ["FINISH", finish, 10.5, B]];
  if (design) rows.push(["DESIGN", design, 10.5, R]);
  rows.push(["INSCRIPTION", s.message ? `“${s.message}”` : "None", s.message ? 14 : 10.5, B]);
  const cand = [s.candles ? `Candles: ${s.candles}` : "No candles", s.occasion ? `Occasion: ${s.occasion}` : ""].filter(Boolean).join("   ·   ");
  rows.push(["CANDLES AND OCCASION", cand, 10, R]);
  let by = y;
  rows.forEach(([lab, val, size, f], k) => {
    const lines = wrap(f, val || " ", size, colW - 12);
    const h = 13 + lines.length * (size + 2) + 5;
    page.drawRectangle({ x: M, y: by - h, width: colW, height: h, borderColor: BLACK, borderWidth: k === 0 ? 1.5 : 1 });
    text(lab, M + 6, by - 9.5, B, 6.5, GREY);
    lines.forEach((l, i) => text(l, M + 6, by - 11 - (i + 1) * (size + 2) + 2, f, size));
    by -= h;
  });
  if (beside) {
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
    const lines = wrap(B, value || " ", size, w - 12); const h = 13 + lines.length * (size + 2) + 5;
    if (inverse) page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: BLACK });
    else page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: BLACK, borderWidth: 1 });
    const c = inverse ? WHITE : BLACK; text(label, x + 6, yTop - 9.5, B, 6.5, inverse ? WHITE : GREY);
    lines.forEach((l, k) => text(l, x + 6, yTop - 11 - (k + 1) * (size + 2) + 2, B, size, c)); return h;
  };
  if (reqs.length) y -= cell(M, y, CW, "MUST BE", reqs.join(" · "), 14, true);
  const diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(", ") || "See order notes" : "None given";
  const hd = cell(M, y, CW, s.has_dietary ? "ALLERGY" : "ALLERGY", diet, s.has_dietary ? 13 : 10.5, false);
  if (s.has_dietary) page.drawRectangle({ x: M + 1.5, y: y - hd + 1.5, width: CW - 3, height: hd - 3, borderColor: BLACK, borderWidth: 2 });
  y -= hd + 10;

  // 6. Customer and payment
  const sl = slip || {}, paid = Number(sl.paid || 0);
  const priceTxt = payLine(sl.price, paid, dl ? sl.delivery_fee : 0);
  const notes = [s.order_notes ? "Order: " + s.order_notes : "", s.kitchen_notes ? "Kitchen: " + s.kitchen_notes : ""].filter(Boolean).join(" · ");
  const SRC = { online: "Website", walk_in: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", social: "Social media", corporate: "Corporate" };
  const at = sl.ordered_at ? new Date(sl.ordered_at) : null;
  const rowsB = [["Guest", sl.name || s.customer], ["Contact", sl.phone]];
  if (dl) rowsB.push(["Deliver to", [s.area, sl.address].filter(Boolean).join(", ") + (sl.receiver ? ` (for ${sl.receiver})` : "")]);
  rowsB.push(["Payment", priceTxt]);
  if (notes) rowsB.push(["Notes", notes]);
  rowsB.push(["Taken by", (sl.taken_by || "") + (sl.source && sl.source !== "online" ? ` (${SRC[sl.source] || sl.source})` : "") + (at ? " · " + at.toLocaleDateString("en-GB", { timeZone: "Pacific/Fiji", day: "numeric", month: "short" }) + ", " + at.toLocaleTimeString("en-GB", { timeZone: "Pacific/Fiji", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])\.?m\.?$/i, (_m, x) => " " + x.toUpperCase() + "M") : "")]);
  const LW = 58;
  rowsB.forEach(([k, v]) => {
    const size = 9.5, lines = wrap(R, v || " ", size, CW - LW - 4);
    text(k, M, y - size, B, 8.5);
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
  return { fits, bytes: await doc.save() };
}
