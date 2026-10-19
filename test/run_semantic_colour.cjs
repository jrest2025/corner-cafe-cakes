// Dependency-free checks for the final semantic colour layer.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'staff.semantic-colour.css'), 'utf8');
let checks = 0;
function check(label, value) { assert.ok(value, label); console.log('PASS ' + label); checks++; }
function token(name) {
  const m = css.match(new RegExp('--' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*(#[0-9a-f]{6})', 'i'));
  assert.ok(m, 'missing token ' + name); return m[1];
}
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
function lum(hex) { return rgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

check('six semantic families are documented', ['charcoal / grey', 'blue', 'green', 'amber', 'red', 'purple'].every(x => css.includes(x)));
check('all rules are scoped to the staff app', !css.split(/}\s*/).filter(x => x.includes('{')).some(x => !/^\s*(\/\*|@|#cc-staff|#ccs-sheet)/.test(x)));
check('primary actions are blue', css.includes('.ccs-btn:not(.ccs-ghost)') && css.includes('background: var(--sc-blue)'));
check('paid and completed share green', css.includes('.ccs-pay.p-paid') && css.includes('.ccs-pill.s-done'));
check('pending and unpaid share amber', css.includes('.ccs-pay.p-unpaid') && css.includes('.ccs-pill.s-action'));
check('critical and allergy share red', css.includes('.ccs-pill.s-alert') && css.includes('.vr-allergy'));
check('cancelled or declined order cards use the red exception state', css.includes('.ccs-card.k-off .ccs-pill.s-off'));
check('reminders and follow-ups share purple', css.includes('.ws-fu') && css.includes('--ds-accent: var(--sc-purple)'));
check('customer rainbow cards are neutralised', css.includes('#cc-staff #ccs-main.cv-crm .crm-kpi') && css.includes('--cv-bg: var(--sc-surface) !important'));
check('forced-colour mode keeps visible boundaries', css.includes('@media (forced-colors: active)'));
check('kitchen slip markup is not targeted', !/slip|print-slip|kitchen-slip/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));

[['blue','blue-bg'],['green','green-bg'],['amber','amber-bg'],['red','red-bg'],['purple','purple-bg']].forEach(([fg,bg]) => {
  check(fg + ' text contrast is at least 4.5:1', contrast(token('sc-' + fg), token('sc-' + bg)) >= 4.5);
});
check('charcoal on white contrast is at least 7:1', contrast(token('sc-charcoal'), token('sc-surface')) >= 7);
console.log(checks + ' semantic colour checks passed.');
