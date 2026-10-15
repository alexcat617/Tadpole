import { Agent } from 'undici';

const USER_AGENT = 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)';

const INSECURE_DISPATCHER = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchChurchillHtml(url) {
  try {
    return await fetchText(url);
  } catch (err) {
    const code = err?.cause?.code ?? err?.code;
    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || /certificate/i.test(String(err?.message))) {
      console.warn('[churchill-rink-durham] TLS verify failed; retrying with relaxed verify');
      return fetchText(url, INSECURE_DISPATCHER);
    }
    throw err;
  }
}

/** @param {string} url @param {import('undici').Agent} [dispatcher] */
async function fetchText(url, dispatcher) {
  /** @type {RequestInit & { dispatcher?: import('undici').Agent }} */
  const init = {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
  };
  if (dispatcher) init.dispatcher = dispatcher;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Churchill fetch failed: ${res.status}`);
  return res.text();
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
export function discoverChurchillOverflowDayUrls(html, pageUrl) {
  const base = new URL(pageUrl);
  const urls = new Set();
  for (const m of html.matchAll(/href="(\/event\/\d+\/\d{4}\/\d{1,2}\/\d{1,2})"[^>]*>\s*\d+\s+more events/gi)) {
    urls.add(new URL(m[1], base).href);
  }
  return [...urls];
}
