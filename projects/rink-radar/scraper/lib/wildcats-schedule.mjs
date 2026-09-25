import { Agent } from 'undici';
import { DateTime } from 'luxon';

const USER_AGENT =
  'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole; schedule: unh-wildcats)';

const TEAM_LABEL = "UNH Wildcats men's hockey";
const SOURCE_URL = 'https://unhwildcats.com/sports/mens-ice-hockey/schedule/text';

const INSECURE_DISPATCHER = new Agent({ connect: { rejectUnauthorized: false } });

/** @param {import('fs').PathLike} existingPath @param {typeof import('fs').readFileSync} readFileSync */
export async function scrapeWildcatsSchedule(existingPath, readFileSync) {
  try {
    const html = await fetchScheduleHtml(SOURCE_URL);
    const parsed = parseScheduleTextHtml(html);
    parsed.generated_at = DateTime.now().setZone('America/New_York').toISO();
    parsed.source_url = SOURCE_URL;
    parsed.team_label = TEAM_LABEL;
    if (parsed.games.length === 0) throw new Error('No games parsed from schedule text page');
    return parsed;
  } catch (err) {
    console.error('[wildcats-schedule]', err);
    if (existingPath && readFileSync) {
      try {
        const prev = JSON.parse(readFileSync(existingPath, 'utf8'));
        if (Array.isArray(prev.games) && prev.games.length > 0) {
          console.warn('[wildcats-schedule] keeping previous file');
          return prev;
        }
      } catch {
        /* no previous file */
      }
    }
    return {
      team_label: TEAM_LABEL,
      season_label: '2026–27',
      season_slug: '20262027',
      generated_at: DateTime.now().setZone('America/New_York').toISO(),
      source_url: SOURCE_URL,
      games: [],
      error: String(err?.message ?? err),
    };
  }
}

/** @param {string} url */
async function fetchScheduleHtml(url) {
  try {
    return await fetchText(url);
  } catch (err) {
    const code = err?.cause?.code ?? err?.code;
    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || /certificate/i.test(String(err?.message))) {
      console.warn('[wildcats-schedule] TLS verify failed; retrying with relaxed verify for UNH host');
      return fetchText(url, INSECURE_DISPATCHER);
    }
    throw err;
  }
}

/** @param {string} url @param {import('undici').Agent} [dispatcher] */
async function fetchText(url, dispatcher) {
  /** @type {RequestInit & { dispatcher?: import('undici').Agent }} */
  const init = {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  };
  if (dispatcher) init.dispatcher = dispatcher;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`UNH schedule page ${res.status}`);
  return res.text();
}

/** @param {string} html */
export function parseScheduleTextHtml(html) {
  const seasonMatch = html.match(
    /(\d{4})-(\d{2})[^<]*Men(?:&#39;|'|')s Ice Hockey Schedule/i,
  );
  const startYear = seasonMatch ? Number(seasonMatch[1]) : 2026;
  const endYear = seasonMatch ? startYear + 1 : 2027;
  const seasonLabel = seasonMatch
    ? `${seasonMatch[1]}–${seasonMatch[2]}`
    : `${startYear}–${String(endYear).slice(-2)}`;
  const seasonSlug = `${startYear}${endYear}`;

  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? '';
  const games = [];
  for (const row of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]),
    );
    if (cells.length < 5) continue;
    const [dateCell, timeCell, atCell, opponent, venue, , resultCell] = cells;
    const startsAt = parseGameStart(dateCell, timeCell, startYear, endYear);
    if (!startsAt) continue;
    const atNorm = atCell.toLowerCase();
    const isHome = atNorm.includes('home');
    const opponentName = opponent.trim();
    const id = `${startsAt}-${slugify(opponentName)}`;
    games.push({
      id,
      starts_at: startsAt,
      opponent_abbr: opponentAbbr(opponentName),
      opponent_name: opponentName,
      is_home: isHome,
      venue: venue.trim(),
      game_state: parseGameState(resultCell),
      tv_networks: [],
    });
  }

  games.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return {
    team_label: TEAM_LABEL,
    season_label: seasonLabel,
    season_slug: seasonSlug,
    generated_at: '',
    source_url: SOURCE_URL,
    games,
  };
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

/** @param {string} dateCell @param {string} timeCell @param {number} startYear @param {number} endYear */
function parseGameStart(dateCell, timeCell, startYear, endYear) {
  const dm = dateCell.match(/^([A-Za-z]+)\s+(\d+)/);
  if (!dm) return null;
  const monthToken = dm[1];
  const day = Number(dm[2]);
  const month = DateTime.fromFormat(monthToken, 'MMM', { zone: 'America/New_York' }).month;
  const year = month >= 10 ? startYear : endYear;
  const timeNorm = timeCell.replace(/\s+/g, ' ').trim();
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
  const t = (resultCell ?? '').trim();
  if (!t || t === '-' || t === ' -') return 'FUT';
  if (/^\d/.test(t) || /[WLTO]-/.test(t)) return 'FINAL';
  return 'FUT';
}

/** @param {string} name */
function opponentAbbr(name) {
  const known = {
    'Boston College': 'BC',
    'Michigan State': 'MSU',
    'UMass Lowell': 'UML',
    'RPI': 'RPI',
    'Quinnipiac': 'QU',
    'Merrimack': 'MER',
    'Colgate': 'COL',
    Vermont: 'UVM',
    Maine: 'ME',
    Union: 'UNI',
    'Holy Cross': 'HC',
    'Northeastern': 'NEU',
    'Boston University': 'BU',
    Harvard: 'HAR',
    Yale: 'YALE',
    Cornell: 'COR',
    Dartmouth: 'DART',
    Brown: 'BRN',
    Princeton: 'PRIN',
    Clarkson: 'CLK',
    'St. Lawrence': 'SLU',
  };
  if (known[name]) return known[name];
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

/** Sidearm JSON mapper kept for tests / future API if it returns. */
export function mapSidearmGames(data) {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.games)
      ? data.games
      : Array.isArray(data?.schedule)
        ? data.schedule
        : [];

  return rows.map(mapSidearmRow).filter(Boolean);
}

/** @param {Record<string, unknown>} row */
function mapSidearmRow(row) {
  const startRaw =
    row.date_scheduled ??
    row.date ??
    row.start_date ??
    row.game_date ??
    row.datetime;
  if (!startRaw) return null;

  const opponent =
    row.opponent?.name ??
    row.opponent_name ??
    row.opponent ??
    row.title ??
    'TBD';
  const opponentAbbrVal =
    row.opponent?.abbreviation ??
    row.opponent_abbrev ??
    opponentAbbr(String(opponent));

  const atVs = String(row.at_vs ?? row.home_away ?? row.location_indicator ?? '').toLowerCase();
  const isHome = atVs === 'h' || atVs === 'home' || row.is_home === true;

  const startsAt = parseSidearmStart(String(startRaw), row.time_scheduled ?? row.time);
  if (!startsAt) return null;

  const id = String(row.game_id ?? row.id ?? `${startsAt}-${opponentAbbrVal}`);

  return {
    id,
    starts_at: startsAt,
    opponent_abbr: opponentAbbrVal,
    opponent_name: String(opponent),
    is_home: isHome,
    venue: String(row.facility?.name ?? row.venue ?? row.location ?? ''),
    game_state: String(row.status ?? row.game_state ?? 'FUT'),
    tv_networks: [],
  };
}

/** @param {string} datePart @param {unknown} timePart */
function parseSidearmStart(datePart, timePart) {
  const combined = timePart ? `${datePart} ${timePart}` : datePart;
  const dt = DateTime.fromISO(combined, { zone: 'America/New_York' });
  if (dt.isValid) return dt.toISO();
  const dt2 = DateTime.fromFormat(String(datePart), 'yyyy-MM-dd', { zone: 'America/New_York' });
  if (dt2.isValid) return dt2.set({ hour: 19 }).toISO();
  return null;
}
