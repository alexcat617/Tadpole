import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

const SKIP = /CLOSED FOR THE SEASON|WE ARE CLOSED/i;

/**
 * @param {string} pageUrl
 * @param {string} rinkId
 * @param {'public_skate' | 'adult_hockey' | 'stick_puck'} activityFilter
 */
export async function scrapeChurchillPage(pageUrl, rinkId, activityFilter) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)' },
  });
  if (!res.ok) throw new Error(`Churchill fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const sessions = [];
  const text = $('body').text();

  const tagNeedle =
    activityFilter === 'public_skate'
      ? 'PUBLIC SKATING'
      : activityFilter === 'stick_puck' || activityFilter === 'adult_hockey'
        ? 'PUBLIC HOCKEY'
        : null;

  const eventRegex =
    /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s*(\d{1,2}:\d{2}(?:am|pm))\s*(?:EDT|EST)?\s*-\s*(\d{1,2}:\d{2}(?:am|pm))\s*(?:EDT|EST)?/gi;

  const chunks = text.split(/\d{1,2}\s/);
  let m;
  const full = text;
  while ((m = eventRegex.exec(full)) !== null) {
    const blockStart = Math.max(0, m.index - 120);
    const block = full.slice(blockStart, m.index + 80);
    if (SKIP.test(block)) continue;
    if (tagNeedle && !block.includes(tagNeedle) && !full.slice(m.index, m.index + 200).includes(tagNeedle)) {
      continue;
    }

    const dayName = m[1];
    const startT = m[2];
    const endT = m[3];

    const contextBefore = full.slice(Math.max(0, m.index - 400), m.index);
    const dayNumMatch = contextBefore.match(/(?:^|\s)(\d{1,2})\s+[^\d]*$/);
    const monthMatch = full.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (!monthMatch) continue;
    const monthName = monthMatch[1];
    const year = parseInt(monthMatch[2], 10);

    let day = dayNumMatch ? parseInt(dayNumMatch[1], 10) : null;
    if (!day) {
      const near = full.slice(m.index - 30, m.index);
      const d2 = near.match(/(\d{1,2})\s+[A-Z]/);
      day = d2 ? parseInt(d2[1], 10) : null;
    }
    if (!day) continue;

    const dateStr = `${monthName} ${day}, ${year} ${startT}`;
    const startDt = DateTime.fromFormat(dateStr, 'MMMM d, yyyy h:mma', { zone: 'America/New_York' });
    const endDt = DateTime.fromFormat(
      `${monthName} ${day}, ${year} ${endT}`,
      'MMMM d, yyyy h:mma',
      { zone: 'America/New_York' },
    );
    if (!startDt.isValid || !endDt.isValid) continue;

    const activity =
      activityFilter === 'public_skate'
        ? 'public_skate'
        : activityFilter === 'stick_puck'
          ? 'stick_puck'
          : 'adult_hockey';

    sessions.push({
      rink_id: rinkId,
      activity,
      subtype: activity === 'public_skate' ? 'recreational' : 'drop_in',
      starts_at: startDt.toISO(),
      ends_at: endDt.toISO(),
      raw_label: block.slice(0, 80).replace(/\s+/g, ' ').trim(),
      source_url: pageUrl,
      confidence: 'medium',
    });
  }

  return dedupeSessions(sessions);
}

function dedupeSessions(list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = `${s.starts_at}|${s.activity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
