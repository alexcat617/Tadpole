import * as cheerio from 'cheerio';

const MONTH_ORDER = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** @param {string} pageUrl */
function resolveUrl(pageUrl, href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return new URL(href, pageUrl).href;
}

/**
 * @param {string} filename
 * @returns {number}
 */
export function scorePdfFilename(filename) {
  const lower = filename.toLowerCase();
  let score = 0;
  for (const [key, month] of Object.entries(MONTH_ORDER)) {
    if (lower.includes(key)) {
      score = month;
      break;
    }
  }
  const year = lower.match(/20\d{2}/);
  if (year) {
    score += parseInt(year[0], 10) * 100;
  } else {
    const shortYear = lower.match(/(?:^|[-_])(\d{2})\.pdf$/);
    if (shortYear) score += (2000 + parseInt(shortYear[1], 10)) * 100;
  }
  return score;
}

/**
 * Keep the newest PDFs for up to `maxMonths` distinct calendar months (by filename).
 * @param {string[]} urls
 * @param {number} maxMonths
 */
export function pickRecentMonthPdfUrls(urls, maxMonths = 2) {
  const sorted = [...urls].sort((a, b) => {
    const fa = a.split('/').pop() ?? '';
    const fb = b.split('/').pop() ?? '';
    return scorePdfFilename(fb) - scorePdfFilename(fa);
  });
  const picked = [];
  const seenScores = new Set();
  for (const url of sorted) {
    const fn = url.split('/').pop() ?? '';
    const score = scorePdfFilename(fn);
    if (score <= 0) continue;
    if (seenScores.has(score)) continue;
    seenScores.add(score);
    picked.push(url);
    if (picked.length >= maxMonths) break;
  }
  return picked;
}

/**
 * @param {string} pageUrl
 * @param {RegExp} hrefPattern
 * @param {number} [maxMonths]
 */
export async function discoverRecentPdfUrls(pageUrl, hrefPattern, maxMonths = 2) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${pageUrl}: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href.toLowerCase().includes('.pdf')) return;
    if (!hrefPattern.test(href)) return;
    const absolute = resolveUrl(pageUrl, href);
    if (absolute) candidates.add(absolute);
  });
  if (candidates.size === 0) {
    throw new Error(`No PDF found on ${pageUrl} matching ${hrefPattern}`);
  }
  const picked = pickRecentMonthPdfUrls([...candidates], maxMonths);
  if (picked.length === 0) {
    throw new Error(`No scorable PDF on ${pageUrl} matching ${hrefPattern}`);
  }
  return picked;
}

/**
 * Find the best-matching PDF on a city page (e.g. latest month public skate or stick).
 * @param {string} pageUrl
 * @param {RegExp} hrefPattern
 */
export async function discoverLatestPdfUrl(pageUrl, hrefPattern) {
  const urls = await discoverRecentPdfUrls(pageUrl, hrefPattern, 1);
  return urls[0];
}
