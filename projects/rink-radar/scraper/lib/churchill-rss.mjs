import { DateTime } from 'luxon';

const USER_AGENT = 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)';

/** Admin / placeholder events — not public ice sessions. */
const SKIP_TITLE = new RegExp(
  [
    'CLOSED FOR THE SEASON',
    'CLOSED FOR THE OFF-SEASON',
    'OPENING DATE FOR SEASON',
    'ANTICIPATED OPENING DATE',
    'SCHEDULE PENDING PUBLICATION',
    'LEARN TO SKATE SIGN UP',
    'WE ARE CLOSED',
    'WE CLOSE FOR THE SEASON',
  ].join('|'),
  'i',
);

const STICK_TITLE = /STICK|POND HOCKEY|PUBLIC HOCKEY SESSION/i;

/**
 * @param {string} feedUrl
 * @param {string} rinkId
 * @returns {Promise<Array<{ starts_at: string, ends_at: string, activity: string, subtype: string, raw_label: string, source_url: string, confidence: string }>>}
 */
export async function scrapeChurchillRssFeed(feedUrl, rinkId) {
  const res = await fetch(feedUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Churchill RSS ${res.status}`);
  const xml = await res.text();
  const sessions = [];

  for (const block of xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
    const title = decodeXml(extractTag(block, 'title'));
    const link = decodeXml(extractTag(block, 'link'));
    const pubDate = extractTag(block, 'pubDate');
    const description = decodeXml(extractTag(block, 'description'));

    if (!title || SKIP_TITLE.test(title)) continue;

    const timeMatch = description.match(
      /Time:\s*(\d{1,2}:\d{2}\s*(?:am|pm))\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i,
    );
    const dateMatch =
      description.match(/Date:\s*([A-Za-z]+ \d{1,2}, \d{4})/i) ??
      title.match(/([A-Za-z]+ \d{1,2}, \d{4})/);

    let startDt;
    let endDt;

    if (dateMatch && timeMatch) {
      const datePart = dateMatch[1];
      startDt = DateTime.fromFormat(
        `${datePart} ${timeMatch[1].replace(/\s+/g, '')}`,
        'MMMM d, yyyy h:mma',
        { zone: 'America/New_York' },
      );
      endDt = DateTime.fromFormat(
        `${datePart} ${timeMatch[2].replace(/\s+/g, '')}`,
        'MMMM d, yyyy h:mma',
        { zone: 'America/New_York' },
      );
    } else if (pubDate) {
      startDt = DateTime.fromRFC2822(pubDate, { zone: 'America/New_York' });
      endDt = startDt.plus({ hours: 1 });
    }

    if (!startDt?.isValid || !endDt?.isValid) continue;

    const activity = STICK_TITLE.test(title) ? 'stick_puck' : 'public_skate';
    const label = title.includes(':') ? title.split(':').slice(1).join(':').trim() : title;

    sessions.push({
      rink_id: rinkId,
      activity,
      subtype: activity === 'public_skate' ? 'recreational' : 'drop_in',
      starts_at: startDt.toISO(),
      ends_at: endDt.toISO(),
      raw_label: label.slice(0, 120),
      source_url: link || feedUrl,
      confidence: 'medium',
    });
  }

  return dedupeSessions(sessions);
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m?.[1]?.trim() ?? '';
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function dedupeSessions(list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = `${s.starts_at}|${s.activity}|${s.raw_label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {{ activity: string, raw_label: string }} row
 * @param {'public_skate' | 'stick_puck' | 'adult_hockey'} activityFilter
 */
export function churchillRowMatchesFilter(row, activityFilter) {
  if (activityFilter === 'public_skate') return row.activity === 'public_skate';
  return row.activity === 'stick_puck';
}
