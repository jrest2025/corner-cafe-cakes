// Analytics category labels must remain unique after small groups are folded.
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'staff.an.js'), 'utf8');
const match = source.match(/function anFold\(rows, n\) \{[\s\S]*?\n  \}\n  function anDonut/);
if (!match) throw new Error('Could not locate anFold');
const context = {};
vm.runInNewContext(match[0].replace(/\n  function anDonut[\s\S]*/, '') + '\nthis.anFold = anFold;', context);
const rows = [
  { l: 'Birthday', v: 7, list: ['a'] },
  { l: 'Other', v: 3, list: ['b'] },
  { l: 'Anniversary', v: 3, list: ['c'] },
  { l: 'Mother\'s Day', v: 3, list: ['d'] },
  { l: 'Not specified', v: 3, list: ['e'] },
  { l: 'Other', v: 2, list: ['f'] },
  { l: 'Graduation', v: 2, list: ['g'] },
  { l: 'Farewell', v: 1, list: ['h'] }
];
const folded = context.anFold(rows, 6);
const other = folded.filter(row => row.l === 'Other');
if (other.length !== 1) throw new Error('Expected one Other category, found ' + other.length);
if (other[0].v !== 6) throw new Error('Expected the folded Other total to be 6, found ' + other[0].v);
if (folded.reduce((sum, row) => sum + row.v, 0) !== 24) throw new Error('Category totals changed');
console.log('PASS analytics categories are unique and totals are preserved');
