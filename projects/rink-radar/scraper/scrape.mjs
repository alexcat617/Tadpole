#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { discoverLatestPdfUrl } from './lib/discover-pdf.mjs';
import { parseDoverPdfBuffer } from './lib/dover-pdf.mjs';
import { scrapeRecDeskProgram } from './lib/recdesk.mjs';
import { scrapeChurchillPage } from './lib/churchill.mjs';
import {
  churchillRowMatchesFilter,
  scrapeChurchillRssFeed,
} from './lib/churchill-rss.mjs';
import { scrapeBruinsSchedule } from './lib/bruins-schedule.mjs';
import { scrapeWildcatsSchedule } from './lib/wildcats-schedule.mjs';
import { scrapeDoverVarsitySchedule } from './lib/dover-varsity-schedule.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const rinksPath = path.join(root, 'data', 'rinks.json');
const outPath = path.join(root, 'data', 'sessions.generated.json');
const publicOut = path.join(root, 'app', 'public', 'data', 'sessions.generated.json');
const publicRinks = path.join(root, 'app', 'public', 'data', 'rinks.json');
const publicHealth = path.join(root, 'app', 'public', 'data', 'health.json');
const bruinsOut = path.join(root, 'data', 'bruins-schedule.json');
const publicBruinsOut = path.join(root, 'app', 'public', 'data', 'bruins-schedule.json');
const wildcatsOut = path.join(root, 'data', 'wildcats-schedule.json');
const publicWildcatsOut = path.join(root, 'app', 'public', 'data', 'wildcats-schedule.json');
const doverVarsityOut = path.join(root, 'data', 'dover-varsity-schedule.json');
const publicDoverVarsityOut = path.join(root, 'app', 'public', 'data', 'dover-varsity-schedule.json');

const registry = JSON.parse(fs.readFileSync(rinksPath, 'utf8'));
const fetchedAt = DateTime.now().setZone('America/New_York').toISO();
const health = { generated_at: fetchedAt, rinks: {} };

function loadPreviousSessions() {
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    return Array.isArray(prev.sessions) ? prev.sessions : [];
  } catch {
    return [];
  }
}

const previousSessions = loadPreviousSessions();

function previousSessionsForRink(rinkId) {
  return previousSessions.filter((s) => s.rink_id === rinkId);
}

function retainPreviousSessionsForRink(rinkId, errorMessage) {
  const kept = previousSessionsForRink(rinkId);
  for (const session of kept) {
    output.sessions.push({ ...session, fetched_at: fetchedAt });
  }
  health.rinks[rinkId] = {
    ok: false,
    error: errorMessage,
    session_count: kept.length,
    retained_previous: kept.length > 0,
  };
  if (kept.length > 0) {
    console.warn(`[${rinkId}] retaining ${kept.length} previous session(s): ${errorMessage}`);
  }
}

function retainIfEmptyScrape(rinkId, newCount, sourceHint) {
  if (newCount > 0) return false;
  const kept = previousSessionsForRink(rinkId);
  if (kept.length === 0) return false;
  for (const session of kept) {
    output.sessions.push({ ...session, fetched_at: fetchedAt });
  }
  health.rinks[rinkId] = {
    ok: true,
    session_count: kept.length,
    retained_previous: true,
    warning: sourceHint,
  };
  console.warn(`[${rinkId}] scrape returned 0; kept ${kept.length} previous session(s)`);
  return true;
}

/** @type {import('../data/sessions.example.json')} */
const output = {
  generated_at: fetchedAt,
  region_label: registry.region.label,
  sessions: [],
};

function sessionId(rinkId, startsAt, activity, subtype) {
  const slug = startsAt.replace(/[:.]/g, '');
  return `${rinkId}-${slug}-${activity}-${subtype ?? 'x'}`;
}

function addSessions(rinkId, sourceUrl, rows, price) {
  for (const row of rows) {
    output.sessions.push({
      id: sessionId(rinkId, row.starts_at, row.activity, row.subtype),
      rink_id: rinkId,
      activity: row.activity,
      subtype: row.subtype,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      price: row.price ?? price,
      raw_label: row.raw_label,
      source_url: sourceUrl,
      fetched_at: fetchedAt,
      confidence: row.confidence ?? 'high',
    });
  }
}

/** Dover stick practice PDF fee legend (per city stick calendar). */
const DOVER_STICK_PRICE_BY_SUBTYPE = {
  adult_stick: {
    summary: 'Adult stick $12',
    amount_cents: 1200,
    currency: 'USD',
    is_free: false,
  },
  youth_stick: {
    summary: 'Youth stick $8',
    amount_cents: 800,
    currency: 'USD',
    is_free: false,
  },
  parent_tot: {
    summary: 'Parent/tot $8 per skater',
    amount_cents: 800,
    currency: 'USD',
    is_free: false,
  },
};

function addDoverStickSessions(rinkId, sourceUrl, rows) {
  for (const row of rows) {
    const price =
      DOVER_STICK_PRICE_BY_SUBTYPE[row.subtype] ?? DOVER_STICK_PRICE_BY_SUBTYPE.adult_stick;
    output.sessions.push({
      id: sessionId(rinkId, row.starts_at, row.activity, row.subtype),
      rink_id: rinkId,
      activity: row.activity,
      subtype: row.subtype,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      price,
      raw_label: row.raw_label,
      source_url: sourceUrl,
      fetched_at: fetchedAt,
      confidence: row.confidence ?? 'high',
    });
  }
}

async function fetchPdfBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)' },
  });
  if (!res.ok) throw new Error(`PDF fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function scrapeDover(rink) {
  const publicPage = rink.schedule_sources.find(
    (s) => s.url.includes('public-skate') && s.kind === 'html',
  );
  const stickPage = rink.schedule_sources.find(
    (s) => s.url.includes('stick-practice') && s.kind === 'html',
  );

  const publicPdf = await discoverLatestPdfUrl(
    publicPage.url,
    /Ps-|PS-Schedule|public.skate/i,
  );
  const stickPdf = await discoverLatestPdfUrl(stickPage.url, /Stick-|stick/i);

  const publicBuf = await fetchPdfBuffer(publicPdf);
  const stickBuf = await fetchPdfBuffer(stickPdf);

  const publicRows = await parseDoverPdfBuffer(publicBuf, 'public');
  const stickRows = await parseDoverPdfBuffer(stickBuf, 'stick');

  const publicPrice = {
    summary: 'Dover resident adult $9 / youth $7 (see rink)',
    amount_cents: 900,
    currency: 'USD',
    is_free: false,
  };
  addSessions(rink.id, publicPdf, publicRows, publicPrice);
  addDoverStickSessions(rink.id, stickPdf, stickRows);

  health.rinks[rink.id] = {
    ok: true,
    public_pdf: publicPdf,
    stick_pdf: stickPdf,
    session_count: publicRows.length + stickRows.length,
  };
}

async function scrapeRochester(rink) {
  const src = rink.schedule_sources.find((s) => s.kind === 'recdesk');
  if (!src) throw new Error('No RecDesk source');
  const rows = await scrapeRecDeskProgram(src.url, rink.id);
  output.sessions.push(...rows.map((r) => ({
    ...r,
    id: sessionId(rink.id, r.starts_at, r.activity, r.subtype),
    fetched_at: fetchedAt,
  })));
  health.rinks[rink.id] = { ok: true, session_count: rows.length };
}

async function scrapeChurchill(rink) {
  const feedUrl = rink.churchill_rss_feed;
  let rows = [];
  if (feedUrl) {
    rows = await scrapeChurchillRssFeed(feedUrl, rink.id);
  } else {
    for (const src of rink.schedule_sources) {
      const activity = src.activity_hints.includes('public_skate')
        ? 'public_skate'
        : src.activity_hints.includes('stick_puck')
          ? 'stick_puck'
          : 'adult_hockey';
      const pageRows = await scrapeChurchillPage(src.url, rink.id, activity);
      rows.push(...pageRows);
    }
  }

  let count = 0;
  for (const src of rink.schedule_sources) {
    const activity = src.activity_hints.includes('public_skate')
      ? 'public_skate'
      : src.activity_hints.includes('stick_puck')
        ? 'stick_puck'
        : 'adult_hockey';
    const filtered = feedUrl
      ? rows.filter((row) => churchillRowMatchesFilter(row, activity))
      : rows.filter((row) => row.source_url === src.url);
    const sourceUrl = feedUrl ?? src.url;
    addSessions(rink.id, sourceUrl, filtered);
    count += filtered.length;
  }

  if (retainIfEmptyScrape(rink.id, count, 'RSS/HTML returned 0 sessions')) {
    return;
  }

  health.rinks[rink.id] = {
    ok: true,
    session_count: count,
    ...(feedUrl ? { rss_feed: feedUrl } : {}),
  };
}

const active = registry.rinks.filter((r) => r.status === 'pilot' || r.status === 'active');

for (const rink of active) {
  try {
    if (rink.adapter === 'dover-pdf') await scrapeDover(rink);
    else if (rink.adapter === 'recdesk') await scrapeRochester(rink);
    else if (rink.adapter === 'sportsengine') await scrapeChurchill(rink);
    else {
      health.rinks[rink.id] = { ok: false, error: 'No scraper for adapter' };
    }
  } catch (err) {
    retainPreviousSessionsForRink(rink.id, String(err?.message ?? err));
    console.error(`[${rink.id}]`, err);
  }
}

output.sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
fs.mkdirSync(path.dirname(publicOut), { recursive: true });
fs.writeFileSync(publicOut, JSON.stringify(output, null, 2));
fs.writeFileSync(publicRinks, JSON.stringify(registry, null, 2));
fs.writeFileSync(path.join(root, 'data', 'health.json'), JSON.stringify(health, null, 2));
fs.writeFileSync(publicHealth, JSON.stringify(health, null, 2));

const bruinsSchedule = await scrapeBruinsSchedule(bruinsOut, fs.readFileSync);
fs.writeFileSync(bruinsOut, JSON.stringify(bruinsSchedule, null, 2));
fs.writeFileSync(publicBruinsOut, JSON.stringify(bruinsSchedule, null, 2));

const wildcatsSchedule = await scrapeWildcatsSchedule(wildcatsOut, fs.readFileSync);
fs.writeFileSync(wildcatsOut, JSON.stringify(wildcatsSchedule, null, 2));
fs.writeFileSync(publicWildcatsOut, JSON.stringify(wildcatsSchedule, null, 2));

const doverVarsitySchedule = await scrapeDoverVarsitySchedule(doverVarsityOut, fs.readFileSync);
fs.writeFileSync(doverVarsityOut, JSON.stringify(doverVarsitySchedule, null, 2));
fs.writeFileSync(publicDoverVarsityOut, JSON.stringify(doverVarsitySchedule, null, 2));

console.log(`Wrote ${output.sessions.length} sessions to ${outPath}`);
console.log(`Wrote ${bruinsSchedule.games?.length ?? 0} Bruins games to ${bruinsOut}`);
console.log(`Wrote ${wildcatsSchedule.games?.length ?? 0} UNH games to ${wildcatsOut}`);
const doverBoys = doverVarsitySchedule.squads?.boys?.games?.length ?? 0;
const doverGirls = doverVarsitySchedule.squads?.girls?.games?.length ?? 0;
console.log(
  `Wrote ${doverVarsitySchedule.games?.length ?? 0} Dover varsity games (${doverBoys} boys, ${doverGirls} girls) to ${doverVarsityOut}`,
);
