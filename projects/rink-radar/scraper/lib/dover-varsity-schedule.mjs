import { DateTime } from 'luxon';
import { Agent } from 'undici';

const USER_AGENT =
  'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole; schedule: dover-varsity)';

const TEAM_LABEL = 'Dover varsity hockey';
const SOURCE_URLS = {
  boys: 'https://arbiterlive.com/Teams/Schedule/8855637?activeEntityId=6087',
  girls: 'https://arbiterlive.com/Teams/Schedule/11761173?activeEntityId=6087',
};
const SQUAD_LABELS = {
  boys: 'Boys varsity',
  girls: 'Girls varsity',
};

const FETCH_GAP_MS = 2000;
const INSECURE_DISPATCHER = new Agent({ connect: { rejectUnauthorized: false } });

/** @param {import('fs').PathLike} existingPath @param {typeof import('fs').readFileSync} readFileSync */
export async function scrapeDoverVarsitySchedule(existingPath, readFileSync) {
  const now = DateTime.now().setZone('America/New_York');
  const defaultStartYear = now.month >= 7 ? now.year : now.year - 1;
  const defaultEndYear = defaultStartYear + 1;

  try {
    const boysHtml = await fetchScheduleHtml(SOURCE_URLS.boys);
    await sleep(FETCH_GAP_MS);
    const girlsHtml = await fetchScheduleHtml(SOURCE_URLS.girls);

    const boysGames = parseArbiterScheduleHtml(boysHtml, 'boys', defaultStartYear, defaultEndYear);
    const girlsGames = parseArbiterScheduleHtml(
      girlsHtml,
      'girls',
      defaultStartYear,
      defaultEndYear,
    );

    const allGames = [...boysGames, ...girlsGames].sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at),
    );
    const season = inferSeasonFromGames(allGames, defaultStartYear, defaultEndYear);

    if (boysGames.length === 0 && girlsGames.length === 0) {
      throw new Error('No games parsed from either Dover varsity Arbiter page');
    }

    return buildFile({
      season,
      boysGames,
      girlsGames,
      allGames,
      generatedAt: now.toISO(),
    });
  } catch (err) {
    console.error('[dover-varsity-schedule]', err);
    if (existingPath && readFileSync) {
      try {
        const prev = JSON.parse(readFileSync(existingPath, 'utf8'));
        const prevGames = mergedGamesFromFile(prev);
        if (prevGames.length > 0) {
          console.warn('[dover-varsity-schedule] keeping previous file');
          return prev;
        }
      } catch {
        /* no previous file */
      }
    }
    return buildFile({
      season: {
        season_label: `${defaultStartYear}–${String(defaultEndYear).slice(-2)}`,
        season_slug: `${defaultStartYear}${defaultEndYear}`,
      },
      boysGames: [],
      girlsGames: [],
      allGames: [],
      generatedAt: now.toISO(),
      error: String(err?.message ?? err),
    });
  }
}

/** @param {Record<string, unknown>} file */
function mergedGamesFromFile(file) {
  if (Array.isArray(file.games) && file.games.length > 0) return file.games;
  const squads = file.squads;
  if (squads && typeof squads === 'object') {
    const boys = /** @type {{ games?: unknown[] }} */ (squads.boys)?.games ?? [];
    const girls = /** @type {{ games?: unknown[] }} */ (squads.girls)?.games ?? [];
    return [...boys, ...girls];
  }
  return [];
}

/** @param {{ season: { season_label: string; season_slug: string }; boysGames: unknown[]; girlsGames: unknown[]; allGames: unknown[]; generatedAt: string; error?: string }} p */
function buildFile({ season, boysGames, girlsGames, allGames, generatedAt, error }) {
  return {
    team_label: TEAM_LABEL,
    season_label: season.season_label,
    season_slug: season.season_slug,
    generated_at: generatedAt,
    source_url: SOURCE_URLS.boys,
    source_urls: { ...SOURCE_URLS },
    squads: {
      boys: { label: SQUAD_LABELS.boys, games: boysGames },
      girls: { label: SQUAD_LABELS.girls, games: girlsGames },
    },
    games: allGames,
    ...(error ? { error } : {}),
  };
}

/** @param {Array<{ starts_at: string }>} games @param {number} defaultStart @param {number} defaultEnd */
function inferSeasonFromGames(games, defaultStart, defaultEnd) {
  if (games.length === 0) {
    return {
      season_label: `${defaultStart}–${String(defaultEnd).slice(-2)}`,
      season_slug: `${defaultStart}${defaultEnd}`,
    };
  }
  const years = games.map((g) => DateTime.fromISO(g.starts_at, { zone: 'America/New_York' }).year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const startYear = minYear <= maxYear - 1 ? minYear : defaultStart;
  const endYear = startYear + 1;
  return {
    season_label: `${startYear}–${String(endYear).slice(-2)}`,
    season_slug: `${startYear}${endYear}`,
  };
}

/** @param {string} url */
async function fetchScheduleHtml(url) {
  try {
    return await fetchScheduleHtmlOnce(url);
  } catch (err) {
    const code = err?.cause?.code ?? err?.code;
    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || /certificate/i.test(String(err?.message))) {
      console.warn('[dover-varsity-schedule] TLS verify failed; retrying with relaxed verify for Arbiter');
      return fetchScheduleHtmlOnce(url, INSECURE_DISPATCHER);
    }
    throw err;
  }
}

/** @param {string} url @param {import('undici').Agent} [dispatcher] */
async function fetchScheduleHtmlOnce(url, dispatcher) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    /** @type {RequestInit & { dispatcher?: import('undici').Agent }} */
    const init = {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal,
    };
    if (dispatcher) init.dispatcher = dispatcher;
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Arbiter schedule page ${res.status} for ${url}`);
    return res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} html
 * @param {'boys' | 'girls'} squad
 * @param {number} startYear
 * @param {number} endYear
 */
export function parseArbiterScheduleHtml(html, squad, startYear, endYear) {
  const games = [];
  for (const row of html.matchAll(/<tr[^>]*data-isgame="true"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = row[0];
    const gameIdMatch = rowHtml.match(/data-gameid="(\d+)"/i);
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]),
    );
    if (cells.length < 4) continue;

    const [dateTimeCell, atCell, opponentCell, venueCell, resultCell] = cells;
    const startsAt = parseArbiterDateTime(dateTimeCell, startYear, endYear);
    if (!startsAt) continue;

    const atNorm = atCell.trim().toLowerCase();
    const isHome = atNorm.includes('vs');
    const opponentName = extractOpponentName(opponentCell) || opponentCell.trim();
    if (!opponentName) continue;

    const venueLines = venueCell
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const venue = venueLines[0] ?? venueCell.trim();

    const id = gameIdMatch?.[1]
      ? `${squad}-${gameIdMatch[1]}`
      : `${startsAt}-${squad}-${slugify(opponentName)}`;

    games.push({
      id,
      starts_at: startsAt,
      opponent_abbr: opponentAbbr(opponentName),
      opponent_name: opponentName,
      is_home: isHome,
      venue,
      game_state: parseGameState(resultCell),
      tv_networks: [],
      squad,
    });
  }

  games.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return games;
}

/** @param {string} cell */
function extractOpponentName(cell) {
  const span = cell.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
  if (span) return stripTags(span[1]);
  return cell.trim();
}

/** @param {string} dateTimeCell @param {number} startYear @param {number} endYear */
function parseArbiterDateTime(dateTimeCell, startYear, endYear) {
  const normalized = dateTimeCell.replace(/\s+/g, ' ').trim();
  const withWeekday = normalized.match(
    /^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(.+)$/,
  );
  const withoutWeekday = normalized.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(.+)$/);
  const dm = withWeekday ?? withoutWeekday;
  if (!dm) return null;

  const monthToken = dm[1];
  const day = Number(dm[2]);
  const timeNorm = dm[3].trim();
  if (/^12:00\s*AM$/i.test(timeNorm)) return null;

  const month = DateTime.fromFormat(monthToken, 'MMM', { zone: 'America/New_York' }).month;
  if (!month) return null;
  const year = month >= 7 ? startYear : endYear;

  const formats = ['MMM d yyyy h a', 'MMM d yyyy h:mm a'];
  for (const fmt of formats) {
    const dt = DateTime.fromFormat(`${monthToken} ${day} ${year} ${timeNorm}`, fmt, {
      zone: 'America/New_York',
    });
    if (dt.isValid) return dt.toISO();
  }
  return null;
}

/** @param {string | undefined} resultCell */
function parseGameState(resultCell) {
  const t = (resultCell ?? '').replace(/\s+/g, ' ').trim();
  if (!t || t === '-' || t === ' -') return 'FUT';
  if (/^\d/.test(t) || /[WLTO]-/.test(t) || /\d+\s*-\s*\d+/.test(t)) return 'FINAL';
  return 'FUT';
}

/** @param {string} s */
function stripTags(s) {
  return decodeHtml(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/** @param {string} s */
function decodeHtml(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** @param {string} name */
function opponentAbbr(name) {
  const words = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  }
  return name.slice(0, 4).toUpperCase();
}

/** @param {string} s */
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
