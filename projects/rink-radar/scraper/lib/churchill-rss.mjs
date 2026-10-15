import { DateTime } from 'luxon';
import { Agent } from 'undici';
import {
  classifyChurchillActivity,
  dedupeChurchillSessions,
  shouldSkipChurchillTitle,
} from './churchill-shared.mjs';

const USER_AGENT = 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)';
const INSECURE_DISPATCHER = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * @param {string} feedUrl
 * @param {string} rinkId
 * @returns {Promise<Array<{ starts_at: string, ends_at: string, activity: string, subtype: string, raw_label: string, source_url: string, confidence: string }>>}
 */
export async function scrapeChurchillRssFeed(feedUrl, rinkId) {
  const xml = await fetchChurchillRssXml(feedUrl);
  const sessions = [];

  for (const block of xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
    const title = decodeXml(extractTag(block, 'title'));
    const link = decodeXml(extractTag(block, 'link'));
    const pubDate = extractTag(block, 'pubDate');
    const description = decodeXml(extractTag(block, 'description'));

    if (!title || shouldSkipChurchillTitle(title)) continue;

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

    const activity = classifyChurchillActivity(title);
    if (!activity) continue;
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

  return dedupeChurchillSessions(sessions);
}

/** @param {string} feedUrl */
async function fetchChurchillRssXml(feedUrl) {
  try {
    return await fetchRssText(feedUrl);
  } catch (err) {
    const code = err?.cause?.code ?? err?.code;
    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || /certificate/i.test(String(err?.message))) {
      console.warn('[churchill-rink-durham] TLS verify failed; retrying RSS with relaxed verify');
      return fetchRssText(feedUrl, INSECURE_DISPATCHER);
    }
    throw err;
  }
}

/** @param {string} feedUrl @param {import('undici').Agent} [dispatcher] */
async function fetchRssText(feedUrl, dispatcher) {
  /** @type {RequestInit & { dispatcher?: import('undici').Agent }} */
  const init = { headers: { 'User-Agent': USER_AGENT } };
  if (dispatcher) init.dispatcher = dispatcher;
  const res = await fetch(feedUrl, init);
  if (!res.ok) throw new Error(`Churchill RSS ${res.status}`);
  return res.text();
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

/**
 * @param {{ activity: string, raw_label: string }} row
 * @param {'public_skate' | 'stick_puck' | 'adult_hockey'} activityFilter
 */
export function churchillRowMatchesFilter(row, activityFilter) {
  if (activityFilter === 'public_skate') return row.activity === 'public_skate';
  return row.activity === 'stick_puck';
}
