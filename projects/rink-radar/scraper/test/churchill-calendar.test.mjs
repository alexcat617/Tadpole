import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseChurchillCalendarHtml } from '../lib/churchill.mjs';
import { discoverChurchillOverflowDayUrls } from '../lib/churchill-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');
const rinkId = 'churchill-rink-durham';
const monthUrl =
  'https://www.churchillrink.org/page/show/1430862-live-public-skating-hockey-schedule';

function sessionsOnDay(sessions, dayIso) {
  return sessions.filter((s) => s.starts_at.startsWith(dayIso));
}

test('month calendar parses Oct 14 sessions from vevent blocks', () => {
  const html = fs.readFileSync(path.join(fixtures, 'churchill-public-sample.html'), 'utf8');
  const sessions = parseChurchillCalendarHtml(html, rinkId, monthUrl);
  const oct14 = sessionsOnDay(sessions, '2026-10-14');

  assert.ok(oct14.length >= 4, `expected at least 4 sessions on Oct 14, got ${oct14.length}`);
  assert.ok(
    oct14.some((s) => s.activity === 'stick_puck' && /STICK & PUCK/i.test(s.raw_label)),
  );
  assert.ok(
    oct14.some((s) => s.activity === 'public_skate' && /PUBLIC SKATING/i.test(s.raw_label)),
  );
  assert.ok(
    oct14.some((s) => s.activity === 'stick_puck' && /SPLIT ICE/i.test(s.raw_label)),
  );
  assert.ok(
    oct14.some((s) => s.activity === 'public_skate' && /FUN SKATE/i.test(s.raw_label)),
  );
  assert.ok(
    !sessions.some((s) => /OPENING DATE FOR SEASON/i.test(s.raw_label)),
    'admin placeholder events should be skipped',
  );
});

test('day view includes overflow sessions hidden in month grid', () => {
  const html = fs.readFileSync(path.join(fixtures, 'churchill-day-2026-10-16.html'), 'utf8');
  const sessions = parseChurchillCalendarHtml(html, rinkId, 'https://www.churchillrink.org/event/1430862/2026/10/16');
  const oct16 = sessionsOnDay(sessions, '2026-10-16');

  assert.equal(oct16.length, 6);
  assert.ok(
    oct16.some((s) => s.starts_at.includes('T20:00:00') && /FUN SKATE - TEEN/i.test(s.raw_label)),
  );
});

test('discover overflow day URLs from month HTML', () => {
  const html = fs.readFileSync(path.join(fixtures, 'churchill-public-sample.html'), 'utf8');
  const urls = discoverChurchillOverflowDayUrls(html, monthUrl);
  assert.ok(urls.some((u) => u.includes('/2026/10/16')));
  assert.ok(urls.some((u) => u.includes('/2026/10/23')));
});
