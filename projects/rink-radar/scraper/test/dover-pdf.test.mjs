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

const octoberStick = `
Sun Mon Tue Wed Thu Fri Sat 
  1 
    ADULT  
    11:30a-12:50pm 
2 
    ADULT  
    11:30a-12:50pm 
10 
        PARENT/TOT 
        9-1020a 
        ADULT  
        11:30a-12:50pm 
YOUTH –ORANGE   $6.00 
October 2026
`;

const stickRows = parseDoverCalendarPdf(octoberStick, 'stick');
const adultRows = stickRows.filter((r) => r.subtype === 'adult_stick');
const parentRows = stickRows.filter((r) => r.subtype === 'parent_tot');
assert.ok(adultRows.length >= 3, 'expects ADULT label days (abbreviated on calendar)');
assert.equal(parentRows.length, 1, 'one parent/tot block on day 10');
assert.ok(
  parentRows[0].raw_label.includes('9-1020a') || parentRows[0].starts_at.includes('T09:00'),
  'parent/tot uses 9-1020a style time',
);
assert.ok(
  adultRows.some((r) => r.starts_at.includes('T11:30') && r.starts_at.includes('-10-10')),
  'adult on day 10 uses its own time',
);

console.log('dover-pdf.test.mjs: ok');
