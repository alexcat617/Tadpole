import { DateTime } from 'luxon';

const USER_AGENT =
  'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole; schedule: bruins)';

const SEASON_SLUG = '20262027';
const SEASON_LABEL = '2026–27';
const SOURCE_URL = 'https://www.nhl.com/bruins/schedule';
const API_URL = `https://api-web.nhle.com/v1/club-schedule-season/BOS/${SEASON_SLUG}`;

/**
 * @param {import('fs').PathLike} existingPath
 * @returns {Promise<object>}
 */
export async function scrapeBruinsSchedule(existingPath, readFileSync) {
  try {
    const res = await fetch(API_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`NHL schedule ${res.status}`);
    const data = await res.json();
    const games = (data.games ?? []).map(mapGame).filter(Boolean);
    games.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return {
      season_label: SEASON_LABEL,
      season_slug: SEASON_SLUG,
      generated_at: DateTime.now().setZone('America/New_York').toISO(),
      source_url: SOURCE_URL,
      games,
    };
  } catch (err) {
    console.error('[bruins-schedule]', err);
    if (existingPath && readFileSync) {
      try {
        const prev = JSON.parse(readFileSync(existingPath, 'utf8'));
        if (Array.isArray(prev.games) && prev.games.length > 0) {
          console.warn('[bruins-schedule] keeping previous file');
          return prev;
        }
      } catch {
        /* no previous file */
      }
    }
    return {
      season_label: SEASON_LABEL,
      season_slug: SEASON_SLUG,
      generated_at: DateTime.now().setZone('America/New_York').toISO(),
      source_url: SOURCE_URL,
      games: [],
      error: String(err?.message ?? err),
    };
  }
}

/** @param {Record<string, unknown>} g */
function mapGame(g) {
  const home = g.homeTeam;
  const away = g.awayTeam;
  if (!home?.abbrev || !away?.abbrev || !g.startTimeUTC) return null;

  const isHome = home.abbrev === 'BOS';
  const opponent = isHome ? away : home;
  const startsAt = DateTime.fromISO(String(g.startTimeUTC), { zone: 'utc' }).setZone(
    'America/New_York',
  );
  if (!startsAt.isValid) return null;

  const id = String(g.id);

  return {
    id,
    starts_at: startsAt.toISO(),
    opponent_abbr: String(opponent.abbrev),
    opponent_name: String(opponent.commonName?.default ?? opponent.placeName?.default ?? opponent.abbrev),
    is_home: isHome,
    venue: String(g.venue?.default ?? ''),
    game_state: String(g.gameState ?? 'FUT'),
    tv_networks: buildTvNetworks(g.tvBroadcasts, isHome),
  };
}

/** @type {Record<string, string>} */
const NETWORK_ALIASES = {
  NHLN: 'NHL Network',
};

/** @param {string} network */
function formatNetworkLabel(network) {
  const raw = String(network);
  if (/^NESN/i.test(raw)) return 'NESN';
  return NETWORK_ALIASES[raw] ?? raw;
}

/** @param {unknown} tvBroadcasts @param {boolean} isHome */
function buildTvNetworks(tvBroadcasts, isHome) {
  const us = (Array.isArray(tvBroadcasts) ? tvBroadcasts : [])
    .filter((b) => b && b.countryCode === 'US' && b.network)
    .sort((a, b) => (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999));

  /** @type {string[]} */
  const labels = [];
  const seen = new Set();

  /** @param {string} label */
  const add = (label) => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    labels.push(label);
  };

  if (us.some((b) => /^NESN/i.test(String(b.network)))) {
    add('NESN');
  }

  for (const b of us) {
    if (b.market === 'N') add(formatNetworkLabel(b.network));
  }

  if (labels.length === 0 && isHome) {
    const homeRegional = us.find((b) => b.market === 'H');
    if (homeRegional) add(formatNetworkLabel(homeRegional.network));
  }

  return labels;
}
