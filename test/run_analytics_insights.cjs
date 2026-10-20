// Insight engine rules on invented register records (no browser). Fixed "today" so results are repeatable.
const path = require('path');
require(path.resolve(__dirname, '../src/staff.analytics-insights.js'));
const E = globalThis.CCCakeInsights;
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
const T = '2026-10-20';
const add = (d, k) => new Date(Date.parse(d + 'T12:00:00Z') + k * 864e5).toISOString().slice(0, 10);
let seq = 0;
function order(o) {
  seq++;
  return Object.assign({ k: 'app:' + seq, r: 'CC-' + (2000 + seq), src: 'Walk-in', st: 'confirmed', od: add(T, -3), odok: true, pd: add(T, 3), pt: '14:00',
    it: [['Cheesecake group', 'Cheesecake', 8, 1, 60]], lv: 60, cv: null, bal: 0, c: 'phone' + (seq % 40) }, o);
}
const find = (list, id) => list.find(f => f.id === id);
const text = list => list.map(f => [f.big, f.title, f.why, f.action].join(' ')).join(' | ');

// 1. Urgent operations come first.
seq = 0;
let orders = [
  order({ st: 'received', pd: add(T, 1), pt: '14:00' }),
  order({ st: 'received', pd: add(T, 5) }),
  order({ st: 'confirmed', pd: T, bal: 120 }),
  order({ st: 'confirmed', pd: add(T, 4), bal: 180 }),
  order({ st: 'confirmed', pd: add(T, 10), lv: null, cv: null }),
  order({ st: 'cancelled', pd: add(T, 1) }),
  order({ st: 'not_confirmed', pd: add(T, 1) })
];
let out = E.analyse(orders, T);
check('unconfirmed orders due by tomorrow lead the list', out[0].id === 'unconfirmed' && out[0].priority === 100, out[0]);
check('the urgent count ignores cancelled and quoted records', out[0].big === '1' && /by tomorrow/.test(out[0].title) && /1 more later this week/.test(out[0].why), out[0]);
check('pickup times read in 12-hour time', /2:00 PM/.test(out[0].why), out[0].why);
check('money still owed this week is added up', find(out, 'balance') && find(out, 'balance').big === '$300', find(out, 'balance'));
check('confirmed orders with no price are flagged', find(out, 'unpriced') && find(out, 'unpriced').big === '1', find(out, 'unpriced'));
check('no reassurance card while something needs action', !find(out, 'clear'));

// 2. Busiest day ahead.
seq = 0;
orders = [order({ pd: add(T, 2) }), order({ pd: add(T, 4), it: [['g', 'Red Velvet', 8, 3, 60]] }), order({ pd: add(T, 4), it: [['g', 'Mudcake', 8, 2, 60]] }), order({ pd: add(T, 6) })];
out = E.analyse(orders, T);
let busy = find(out, 'busiest');
check('the busiest day counts cakes, not orders', busy && busy.big === '5 cakes' && busy.title.indexOf(['Sat 24 Oct'][0]) > -1, busy);
check('the busiest day is planned for by name', busy && /Saturday/.test(busy.action) && /cci-bars/.test(busy.viz), busy && busy.action);
check('a calm week gets a reassurance card', find(out, 'clear') && find(out, 'clear').tone !== 'act');

// 3. Booking pace: percentages only on a solid base.
seq = 0;
orders = [];
for (let i = 0; i < 10; i++) orders.push(order({ od: add(T, -8 - (i % 5)), pd: add(T, 2) }));
for (let i = 0; i < 5; i++) orders.push(order({ od: add(T, -(i % 6)), pd: add(T, 3) }));
out = E.analyse(orders, T);
let pace = find(out, 'pace');
check('a 50% drop is called out with an action', pace && pace.big === '-50%' && pace.tone === 'warn' && /social media or WhatsApp/.test(pace.action), pace);
seq = 0;
orders = [order({ od: add(T, -1) }), order({ od: add(T, -2) }), order({ od: add(T, -9) })];
pace = find(E.analyse(orders, T), 'pace');
check('a handful of orders is not called a trend', pace && !/%/.test(pace.big) && /too few/.test(pace.why), pace);

// 4. Next occasion: compared with last year when last year is reliable; a reminder otherwise.
seq = 0;
orders = [];
for (let i = 0; i < 6; i++) orders.push(order({ pd: '2025-12-24', od: add('2025-12-24', -(2 + i * 3)) }));
orders.push(order({ pd: '2026-12-24', od: add(T, -2) }));
let occ = find(E.analyse(orders, T), 'occasion');
check('Christmas is compared with the same point last year', occ && /Christmas week/.test(occ.title) && /last year at this point/.test(occ.why) && /final 6/.test(occ.why), occ);
check('the promotion start date comes from last year’s booking pattern', occ && /Start promoting/.test(occ.action) && /final \d+ days/.test(occ.action), occ && occ.action);
seq = 0;
occ = find(E.analyse([order({ pd: add(T, 3) })], T), 'occasion');
check('with no history the Christmas countdown still shows', occ && occ.big === '66 days' && /no cakes booked/.test(occ.title), occ);

// 5. Products, channels, lead time, returning customers, quiet days.
seq = 0;
orders = [];
const cakesList = ['Mudcake', 'Mudcake', 'Mudcake', 'Cheesecake', 'Cheesecake', 'Red Velvet', 'Mudcake', 'White Forest', 'Mudcake', 'Cheesecake', 'Red Velvet', 'Mudcake'];
cakesList.forEach((c, i) => orders.push(order({ od: add(T, -(i * 2)), pd: add(T, -(i * 2) + 6), it: [['g', c, 8, 1, 60]], src: i % 3 === 0 ? 'Online' : 'Walk-in', c: 'cust' + (i % 12) })));
for (let i = 0; i < 12; i++) orders.push(order({ od: add(T, -32 - i * 2), pd: add(T, -32 - i * 2 + 2), src: 'Walk-in', c: 'cust' + i }));
out = E.analyse(orders, T);
const top = find(out, 'top-cake'), ch = find(out, 'channel'), lead = find(out, 'lead'), back = find(out, 'returning');
check('the most booked cake is named with its share', top && /Mudcake/.test(top.title) && top.big === '50%', top);
check('the online share is worked out from the channel', ch && ch.big === '33%' && /online was 0%/.test(ch.why), ch);
check('lead time is compared with the 30 days before', lead && lead.big === '6 days' && /Previous 30 days: 2 days/.test(lead.why) && /planning earlier/.test(lead.action), lead);
check('returning customers are counted from repeat identities', back && back.big === '100%' && /regulars/.test(back.action), back);
seq = 0;
orders = [];
const per = [3, 3, 9, 3, 9, 9, 12];
for (let w = 0; w < 7; w++) for (let k = 0; k < per[w]; k++) {
  const base = add('2026-10-19', -7 * (k % 7) - 7);
  orders.push(order({ pd: add(base, w), od: add(base, w - 2) }));
}
const quiet = find(E.analyse(orders, T), 'quiet-day');
check('tied quiet days are all named', quiet && quiet.big === 'Mon, Tue, Thu' && /quietest pickup days/.test(quiet.title), quiet);

// 6. Honesty and safety.
seq = 0;
orders = [order({ odok: false, od: null, pd: add(T, -40) }), order({ pd: '0002-01-13', od: '0002-01-10' }), order({ off: true, pd: add(T, 1), st: 'received' })];
out = E.analyse(orders, T);
check('records without a reliable booking date are noted, never guessed', find(out, 'undated') && find(out, 'undated').priority < 10, find(out, 'undated'));
check('hidden records and historical year-2 dates do not raise alerts', !find(out, 'unconfirmed') && !find(out, 'busiest'));
check('nothing reads undefined, NaN or null', !/undefined|NaN|null/.test(text(out)), text(out));
check('an empty register gives a calm, valid answer', Array.isArray(E.analyse([], T)) && E.analyse([], T).every(f => f.title && f.action));
check('12-hour helper', E.time12('09:05') === '9:05 AM' && E.time12('13:30') === '1:30 PM' && E.time12('00:15') === '12:15 AM');
console.log(n + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
