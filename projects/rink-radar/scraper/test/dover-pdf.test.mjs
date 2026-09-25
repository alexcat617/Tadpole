import assert from 'assert';
import { parseDoverCalendarPdf } from '../lib/dover-pdf.mjs';

const sample = `
September 2026
24
Instructional PS
  10-11:20am
Rec Public Skate
  1:30-2:50P
25
NO Instructional
Rec Public Skate
  1:30-2:50pm
26
NO Instructional
Instructional PS
  10-11:20am
Rec Public Skate
  1:30-2:50pm
September 2026
`;

const rows = parseDoverCalendarPdf(sample, 'public');
const instructional = rows.filter((r) => r.subtype === 'instructional');
const recreational = rows.filter((r) => r.subtype === 'recreational');

assert.equal(instructional.length, 2, 'expects instructional on days 24 and 26, not 25');
assert.equal(recreational.length, 3, 'expects rec on 24, 25, 26');
assert.ok(
  instructional.some((r) => r.raw_label.includes('10-11:20am')),
  'instructional time preserved',
);

const stackedWeekend = `
September 2026
Sun Mon Tue Wed Thu Fri Sat
25
  Instructional PS
  10-11:20am
  Rec Public Skate
  1:30-2:50pm
26
27
Rec Public Skate
  1:30-2:50pm
28
  Instructional PS
  10-11:50am
September 2026
`;

const weekendRows = parseDoverCalendarPdf(stackedWeekend, 'public');
const dayFromIso = (iso) => parseInt(iso.slice(8, 10), 10);
const rec26 = weekendRows.filter(
  (r) => r.subtype === 'recreational' && dayFromIso(r.starts_at) === 26,
);
const rec27 = weekendRows.filter(
  (r) => r.subtype === 'recreational' && dayFromIso(r.starts_at) === 27,
);
assert.equal(rec26.length, 0, 'blank Sat 26 should have no rec');
assert.equal(rec27.length, 1, 'Sun 27 rec should not attach to Sat 26');
assert.ok(rec27[0].raw_label.includes('1:30-2:50pm'));

console.log('dover-pdf.test.mjs: ok');
