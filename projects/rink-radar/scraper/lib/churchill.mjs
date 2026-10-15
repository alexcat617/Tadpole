import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import {
  classifyChurchillActivity,
  dedupeChurchillSessions,
  shouldSkipChurchillTitle,
} from './churchill-shared.mjs';
import { discoverChurchillOverflowDayUrls, fetchChurchillHtml } from './churchill-fetch.mjs';
/** SportsEngine often emits wrong fixed offsets; keep wall clock in America/New_York. */
function churchillWallClockInEastern(isoTitle) {
  const parsed = DateTime.fromISO(isoTitle, { setZone: true });
  if (!parsed.isValid) return parsed;
  return DateTime.fromObject(
    {
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      hour: parsed.hour,
      minute: parsed.minute,
      second: parsed.second,
      millisecond: parsed.millisecond,
    },
    { zone: 'America/New_York' },
  );
}


/**
 * Parse SportsEngine month or day calendar HTML (microformats vevent blocks).
 * @param {string} html
 * @param {string} rinkId
 * @param {string} pageUrl
 */
export function parseChurchillCalendarHtml(html, rinkId, pageUrl) {
  const $ = cheerio.load(html);
  const sessions = [];

  $('div.vevent.scheduled').each((_, el) => {
    const $ev = $(el);
    const title = $ev.find('h5.summary a').first().text().trim();
    if (!title || shouldSkipChurchillTitle(title)) return;

    const tagsText = $ev.find('li.tags').text();
    const activity = classifyChurchillActivity(title, tagsText);
    if (!activity) return;

    const startTitle = $ev.find('abbr.dtstart[title]').first().attr('title');
    const endTitle = $ev.find('abbr.dtend[title]').first().attr('title');
    if (!startTitle || !endTitle) return;

    const startDt = churchillWallClockInEastern(startTitle);
    const endDt = churchillWallClockInEastern(endTitle);
    if (!startDt.isValid || !endDt.isValid) return;

    const eventUrl = $ev.find('h5.summary a').first().attr('href') || pageUrl;

    sessions.push({
      rink_id: rinkId,
      activity,
      subtype: activity === 'public_skate' ? 'recreational' : 'drop_in',
      starts_at: startDt.toISO(),
      ends_at: endDt.toISO(),
      raw_label: title.slice(0, 120),
      source_url: eventUrl.startsWith('http') ? eventUrl : new URL(eventUrl, pageUrl).href,
      confidence: 'high',
    });
  });

  return sessions;
}

/**
 * @param {string} pageUrl
 * @param {string} rinkId
 */
export async function scrapeChurchillCalendar(pageUrl, rinkId) {
  const html = await fetchChurchillHtml(pageUrl);
  let sessions = parseChurchillCalendarHtml(html, rinkId, pageUrl);

  const dayUrls = discoverChurchillOverflowDayUrls(html, pageUrl);
  for (const dayUrl of dayUrls) {
    const dayHtml = await fetchChurchillHtml(dayUrl);
    sessions = dedupeChurchillSessions([
      ...sessions,
      ...parseChurchillCalendarHtml(dayHtml, rinkId, dayUrl),
    ]);
  }

  return dedupeChurchillSessions(sessions);
}

/**
 * @deprecated Prefer scrapeChurchillCalendar — kept for callers passing activity filter.
 * @param {string} pageUrl
 * @param {string} rinkId
 * @param {'public_skate' | 'adult_hockey' | 'stick_puck'} activityFilter
 */
export async function scrapeChurchillPage(pageUrl, rinkId, activityFilter) {
  const rows = await scrapeChurchillCalendar(pageUrl, rinkId);
  if (activityFilter === 'public_skate') {
    return rows.filter((r) => r.activity === 'public_skate');
  }
  return rows.filter((r) => r.activity === 'stick_puck');
}
