// Renders sample confirmation and deposit emails with bank details. First: npx esbuild supabase/functions/send-emails/guest_emails.ts --format=esm --outfile=tests/ge.mjs
import { buildGuest, sampleData } from './ge.mjs';
import fs from 'fs';
const bank = { bank_name: 'Westpac Banking Corporation', account_name: 'Jacks Restaurant Limited', account_number: '9800440860', bsb: '03-9004', swift: 'WPACFJFX' };
for (const [kind, withBank, deliv] of [['guest_confirmed', true, true], ['guest_deposit_needed', true, false], ['guest_confirmed', false, false]]) {
  const d = sampleData(kind, {});
  if (withBank) d.bank = bank;
  if (deliv) Object.assign(d.order, { fulfilment_method: 'delivery', delivery_zone: 'Sabeto', delivery_fee: 45, delivery_address: 'Sabeto village, near the school', final_total: 130, estimate_total: 130 });
  const r = buildGuest(kind, d);
  const f = `${kind}${withBank ? '' : '-nobank'}.html`;
  fs.writeFileSync(f, r.html);
  console.log('=====', f, '|', r.subject); console.log(r.text.split('\n').filter(l => /bank|Bank|Account|BSB|Swift|Reference|To pay|Deposit|Amount|surcharge|receipt|Delivery|Total|Cake price/.test(l)).join('\n'));
}
