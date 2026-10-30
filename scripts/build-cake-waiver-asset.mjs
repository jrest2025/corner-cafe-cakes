// Build a self-contained, versioned staff UI asset for Corner Cafe's Webflow staff page.
// Uses the same source ordering as build/build.py. No npm dependencies or secret values.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const read = path => readFileSync(path, 'utf8');
const dash = [
  'src/staff.dash.js', 'src/staff.bi.js', 'src/staff.an.js',
  'src/staff.oi.js', 'src/staff.up.js', 'src/staff.reg.js', 'src/staff.crm.js'
].map(read).join('');
const slip = read('supabase/functions/send-emails/slip_pdf.js')
  .replaceAll('export const ', 'const ')
  .replaceAll('export async function ', 'async function ')
  .replaceAll('export function ', 'function ');
if (/\b(export|import)\s/.test(slip)) throw new Error('Unsupported module import/export in slip PDF');
const slipGlobal = 'var SlipPdf = (function () {\n' + slip +
  '\nreturn { buildSlipPdf: buildSlipPdf, slipFileName: slipFileName };\n})();\n';
const original = read('src/staff.js');
if (original.split('/*@DASH@*/').length !== 2) throw new Error('Expected exactly one dashboard insertion point');
const js = original.replace('/*@DASH@*/', slipGlobal + dash);
const css = ['src/staff.css', 'src/staff.cal.css', 'src/staff.hospitality.css']
  .map(read).join('\n').replace(/font-size:(\d+(?:\.\d+)?)px/g, 'font-size:calc($1*var(--u,1px))');
const app = "(function(){var s=document.createElement('style');s.id='ccs-style';s.textContent=" +
  JSON.stringify(css) + ";document.head.appendChild(s)})();\n" + js + "\n";
const out = 'cake-assets/dist';
rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
const raw = Buffer.from(app, 'utf8');
const file = 'staff-app.' + createHash('sha256').update(raw).digest('hex').slice(0, 12) + '.js';
writeFileSync(out + '/' + file, raw);
execFileSync(process.execPath, ['--check', out + '/' + file], {stdio:'inherit'});
const sri = 'sha384-' + createHash('sha384').update(raw).digest('base64');
const manifest = {file, bytes:raw.length, sri, source:'jrest2025/corner-cafe-cakes', feature:'complimentary-delivery'};
writeFileSync(out + '/manifest.json', JSON.stringify(manifest,null,2));
writeFileSync(out + '/robots.txt', 'User-agent: *\nDisallow: /\n');
writeFileSync(out + '/index.html', '<!doctype html><title>Corner Cafe staff assets</title><meta name="robots" content="noindex, nofollow"><p>Staff assets only.</p>');
console.log(JSON.stringify(manifest));
