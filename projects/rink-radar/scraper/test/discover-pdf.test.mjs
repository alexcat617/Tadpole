import assert from 'assert';
import { pickRecentMonthPdfUrls, scorePdfFilename } from '../lib/discover-pdf.mjs';

assert.ok(scorePdfFilename('PS-Schedule-September-2026.pdf') < scorePdfFilename('PS-Schedule-October-2026.pdf'));

const urls = [
  'https://example.com/old/August-2026.pdf',
  'https://example.com/PS-Schedule-September-2026.pdf',
  'https://example.com/PS-Schedule-October-2026.pdf',
  'https://example.com/PS-Schedule-October-2026-copy.pdf',
];

const picked = pickRecentMonthPdfUrls(urls, 2);
assert.equal(picked.length, 2);
assert.ok(picked[0].includes('October'));
assert.ok(picked[1].includes('September'));

const one = pickRecentMonthPdfUrls(['https://x.com/October-2026.pdf'], 2);
assert.equal(one.length, 1);

console.log('discover-pdf tests passed');
