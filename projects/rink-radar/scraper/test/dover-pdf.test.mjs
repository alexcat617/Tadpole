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

console.log('dover-pdf.test.mjs: ok');
