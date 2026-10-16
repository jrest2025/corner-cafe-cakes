// Kitchen slip email body: reads like a kitchen docket. The attached PDF stays the official printed slip.
// Email-safe: tables, inline styles, no images, no web fonts. Works in Gmail, Outlook and phone mail apps.
const INK = "#1F2328", SOFT = "#57606A", RULE = "#D8DEE4", PAPER = "#FFFFFF", PANEL = "#F6F8FA";
const RED = "#B42318", RED_BG = "#FEF3F2", AMBER = "#B54708", AMBER_BG = "#FFFAEB", GREEN = "#2F6B3A", GREEN_BG = "#EEF6EC";
const FONT = "Arial,Helvetica,sans-serif";
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function t12(t) { if (!t) return ""; const [h, m] = String(t).slice(0, 5).split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; }
function dayLine(d) { return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); }

function section(title, rows, tone) {
  const head = tone === "red" ? RED : tone === "amber" ? AMBER : SOFT;
  const body = rows.filter((r) => r && r[1]).map(([k, v, strong]) =>
    `<tr><td style="padding:5px 0;width:118px;vertical-align:top;font:13px/1.4 ${FONT};color:${SOFT}">${esc(k)}</td>` +
    `<td style="padding:5px 0;vertical-align:top;font:${strong ? "bold 16px" : "15px"}/1.4 ${FONT};color:${INK}">${v}</td></tr>`).join("");
  if (!body) return "";
  return `<tr><td style="padding:14px 20px 10px;border-top:1px solid ${RULE}">` +
    `<div style="font:bold 11px/1 ${FONT};letter-spacing:1.6px;text-transform:uppercase;color:${head};padding-bottom:6px">${esc(title)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${body}</table></td></tr>`;
}

export function slipEmailHtml({ s, version, changes, fileName, sentBy }) {
  const v = Number(version) || 1, upd = v > 1, dl = s.method === "delivery";
  const diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).filter(Boolean).join(", ") || "See the PDF slip" : "";
  const cake = s.variant && s.cake && s.variant !== s.cake ? `${s.cake}, ${s.variant}` : (s.variant || s.cake || "Cake");
  const statusBg = upd ? AMBER_BG : GREEN_BG, statusInk = upd ? AMBER : GREEN;
  const ch = Array.isArray(changes) ? changes.filter(Boolean) : [];

  let rows = "";
  // Header
  rows += `<tr><td style="padding:14px 20px 12px;border-bottom:2px solid ${INK}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td style="font:bold 13px/1.3 ${FONT};color:${SOFT}">Corner Café Cakes<br><span style="font:bold 15px/1.6 ${FONT};letter-spacing:2px;color:${INK}">KITCHEN SLIP</span></td>` +
    `<td align="right" style="vertical-align:middle"><span style="display:inline-block;padding:5px 10px;border-radius:4px;background:${statusBg};color:${statusInk};font:bold 12px/1 ${FONT};letter-spacing:1px">${upd ? "UPDATED" : "NEW"}</span>` +
    `<span style="display:inline-block;margin-left:6px;padding:5px 10px;border-radius:4px;background:${INK};color:#FFFFFF;font:bold 12px/1 ${FONT}">V${v}</span></td></tr></table></td></tr>`;
  // Order number and when
  rows += `<tr><td style="padding:16px 20px 4px"><div style="font:bold 40px/1.05 ${FONT};color:${INK};letter-spacing:-0.5px">${esc(s.reference)}</div></td></tr>`;
  rows += `<tr><td style="padding:8px 20px 16px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PANEL};border:1px solid ${RULE};border-radius:6px"><tr>` +
    `<td style="padding:10px 14px;font:bold 12px/1.3 ${FONT};letter-spacing:1px;text-transform:uppercase;color:${SOFT};width:90px">${dl ? "Delivery" : "Pickup"}</td>` +
    `<td style="padding:10px 14px 10px 0;font:bold 19px/1.3 ${FONT};color:${INK}">${esc(dayLine(s.date))}<br><span style="font:bold 24px/1.3 ${FONT}">${esc(t12(s.time))}</span></td></tr></table></td></tr>`;
  // Alerts first, so nobody misses them
  if (diet) rows += `<tr><td style="padding:0 20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${RED_BG};border-left:5px solid ${RED}"><tr><td style="padding:10px 14px">` +
    `<div style="font:bold 11px/1 ${FONT};letter-spacing:1.6px;text-transform:uppercase;color:${RED}">Allergy</div>` +
    `<div style="font:bold 17px/1.35 ${FONT};color:${RED};padding-top:5px">${esc(diet)}</div></td></tr></table></td></tr>`;
  const REQ = { eggless: "Eggless (vegetarian)", gluten_free: "Gluten-free", dairy_free: "Dairy-free", vegan: "Vegan (no egg, no dairy)" };
  const reqs = (s.requirements || []).map((k) => k === "other" ? (s.requirements_note || "Other") : REQ[k] || k);
  if (reqs.length) rows += `<tr><td style="padding:0 20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK}"><tr><td style="padding:10px 14px">` +
    `<div style="font:bold 11px/1 ${FONT};letter-spacing:1.6px;text-transform:uppercase;color:#FFFFFF">Must be</div>` +
    `<div style="font:bold 19px/1.35 ${FONT};color:#FFFFFF;padding-top:5px">${esc(reqs.join(" · "))}</div></td></tr></table></td></tr>`;
  if (upd) rows += `<tr><td style="padding:0 20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${AMBER_BG};border-left:5px solid ${AMBER}"><tr><td style="padding:10px 14px">` +
    `<div style="font:bold 11px/1 ${FONT};letter-spacing:1.6px;text-transform:uppercase;color:${AMBER}">Changed since v${v - 1}</div>` +
    `<div style="font:bold 15px/1.4 ${FONT};color:${INK};padding-top:5px">${ch.length ? esc(ch.join(", ")) : "Order details updated. Check the whole slip."}</div></td></tr></table></td></tr>`;
  if (s.rush) rows += `<tr><td style="padding:0 20px 12px"><div style="font:bold 14px/1.4 ${FONT};color:${AMBER}">Short-notice order</div></td></tr>`;
  // Cake
  rows += section("Cake", [
    ["Cake", esc(cake), true],
    ["Size", s.size ? `${esc(s.size)} inch` + (s.serves ? ` <span style="font-weight:normal;color:${SOFT}">(${esc(s.serves)})</span>` : "") : (s.serves ? esc(s.serves) : ""), true],
    ["Quantity", Number(s.quantity) > 1 ? `<span style="color:${RED}">× ${esc(s.quantity)}</span>` : "1", true],
    ["Finish", s.finish === "custom" ? "Custom design" : "Standard finish"],
    ["Design", s.design ? esc(s.design) : ""],
    ["Writing", s.message ? `“${esc(s.message)}”` : "", true],
    ["Candles", s.candles ? esc(s.candles) : ""],
    ["Occasion", s.occasion ? esc(s.occasion) : ""],
    ["Photos", Array.isArray(s.photos) && s.photos.length ? `${s.photos.length} reference photo${s.photos.length > 1 ? "s" : ""}: see the PDF and the staff app` : ""],
  ]);
  // Order
  rows += section("Order", [
    ["Customer", esc(s.customer || "")],
    [dl ? "Delivery to" : "Collection", dl ? esc(s.area || "Delivery") : "From the café counter"],
    ["Kitchen notes", s.kitchen_notes ? esc(s.kitchen_notes) : ""],
    ["Order notes", s.order_notes ? esc(s.order_notes) : ""],
  ]);
  // Action footer
  rows += `<tr><td style="padding:14px 20px 16px;border-top:2px solid ${INK}">` +
    `<div style="font:bold 16px/1.4 ${FONT};color:${INK}">Please print the attached PDF kitchen slip.</div>` +
    (upd ? `<div style="font:bold 15px/1.4 ${FONT};color:${AMBER};padding-top:4px">Please discard older versions and use the attached V${v}.</div>` : "") +
    `<div style="font:13px/1.5 ${FONT};color:${SOFT};padding-top:6px">Attached: ${esc(fileName)}.pdf</div>` +
    `<div style="font:12px/1.5 ${FONT};color:${SOFT};padding-top:8px">Sent when ${esc(sentBy || "staff")} pressed Print in the cake staff app. Staff only.</div></td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>` +
    `<body style="margin:0;padding:0;background:#FFFFFF">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF"><tr><td align="center" style="padding:16px 8px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${PAPER};border:1px solid ${RULE};border-collapse:separate">${rows}</table>` +
    `</td></tr></table></body></html>`;
}
