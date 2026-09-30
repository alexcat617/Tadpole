import { createRequire } from 'module';
import { DateTime } from 'luxon';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const MONTHS =
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;

/**
 * @param {string} startRaw e.g. "10-11:20am", "1:30-2:50pm", "11:30a"
 * @param {string} endRaw
 */
function parseTimePair(startRaw, endRaw, day, month, year, zone) {
  const norm = (t, fallbackPeriod) => {
    let s = t.trim().toLowerCase().replace(/\s/g, '');
    if (/^\d{1,2}:\d{2}(am|pm)$/.test(s)) return s;
    if (/^\d{1,2}(am|pm)$/.test(s)) return s.replace(/(am|pm)/, ':00$1');
    if (/^\d{1,2}-\d{1,2}:\d{2}(am|pm)$/.test(s)) {
      const [h, rest] = s.split('-');
      const period = rest.match(/(am|pm)/)?.[0] ?? 'am';
      return `${h}:${rest.replace(/(am|pm)/, '')}${period}`;
    }
    if (/^\d{3,4}[ap]$/i.test(s)) {
      const period = s.slice(-1).toLowerCase() === 'p' ? 'pm' : 'am';
      const digits = s.slice(0, -1);
      if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}${period}`;
      if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}${period}`;
    }
    if (/^\d{1,2}:\d{2}[ap]$/.test(s)) {
      return s.slice(0, -1) + (s.endsWith('a') ? 'am' : 'pm');
    }
    if (/^\d{1,2}a$/.test(s)) return s.replace('a', ':00am');
    if (/^\d{1,2}p$/.test(s)) return s.replace('p', ':00pm');
    if (/^\d{1,2}$/.test(s) && fallbackPeriod) {
      return `${s}:00${fallbackPeriod}`;
    }
    if (!/(am|pm)$/i.test(s) && fallbackPeriod) s += fallbackPeriod;
    if (/^\d{1,2}(am|pm)$/i.test(s)) {
      return s.replace(/(am|pm)$/i, ':00$1');
    }
    if (/^\d{1,2}:\d{2}$/.test(s)) return s + (fallbackPeriod ?? 'am');
    return s;
  };

  const combined = endRaw
    ? `${startRaw}-${endRaw}`
    : startRaw;
  const m = combined.match(
    /(\d{1,2}(?::\d{2})?(?:am|pm|a|p)?)\s*-\s*(\d{3,4}[ap]|\d{1,2}(?::\d{2})?(?:am|pm|a|p)?)/i,
  );
  if (!m) return null;
  const endPeriod =
    m[2].match(/(am|pm)/i)?.[0]?.toLowerCase() ??
    (m[2].toLowerCase().endsWith('p') ? 'pm' : m[2].toLowerCase().endsWith('a') ? 'am' : undefined);
  const start = norm(m[1], endPeriod);
  const end = norm(m[2], endPeriod);
  const fmt = 'M/d/yyyy h:mma';
  const startDt = DateTime.fromFormat(`${month}/${day}/${year} ${start}`, fmt, { zone });
  const endDt = DateTime.fromFormat(`${month}/${day}/${year} ${end}`, fmt, { zone });
  if (!startDt.isValid || !endDt.isValid) return null;
  return { starts_at: startDt.toISO(), ends_at: endDt.toISO() };
}

/** Flexible Dover PDF time range (e.g. 10-11:20am, 11:30a-12:50pm, 9-1020a). */
const DOVER_TIME_END = `(?:\\d{3,4}[ap]|\\d{1,2}(?::\\d{2})?(?:am|pm|[ap])?)`;
const DOVER_TIME_RANGE_PATTERN =
  `\\d{1,2}(?::\\d{2})?[ap]?\\s*-\\s*${DOVER_TIME_END}`;
const PUBLIC_TIME_RANGE = new RegExp(`(${DOVER_TIME_RANGE_PATTERN})`, 'i');

function collapsePdfWhitespace(body) {
  return body.replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** `\n26\n27\nRec` — Sun stacked under Sat without a `\n` before the second day number. */
function normalizeStackedDayHeaders(grid) {
  return grid.replace(
    /(\n[ \t]*\d{1,2}[ \t]*\n(?!\n))(\d{1,2})([ \t]*\n)/g,
    '$1\n$2$3',
  );
}

/** Dover PDFs use stacked day headers when Sat/Sun cells are empty back-to-back. */
function extractDayBlocks(grid) {
  const normalized = normalizeStackedDayHeaders(grid);
  const markers = [];
  const headerRe = /\n[ \t]*(\d{1,2})[ \t]*\n/g;
  let headerMatch;
  while ((headerMatch = headerRe.exec(normalized)) !== null) {
    const day = parseInt(headerMatch[1], 10);
    if (day < 1 || day > 31) continue;
    markers.push({
      day,
      bodyStart: headerMatch.index + headerMatch[0].length,
      headerStart: headerMatch.index,
    });
  }
  const blocks = [];
  for (let i = 0; i < markers.length; i++) {
    const { day, bodyStart, headerStart } = markers[i];
    const bodyEnd = i + 1 < markers.length ? markers[i + 1].headerStart : normalized.length;
    if (bodyStart >= bodyEnd) {
      blocks.push({ day, body: '' });
      continue;
    }
    blocks.push({ day, body: normalized.slice(bodyStart, bodyEnd) });
  }
  return blocks;
}

/**
 * @param {string} body
 * @param {RegExp} labelPattern e.g. /Instructional(?:\s+PS|\s+Public\s+Skate)?/i
 * @param {RegExp | null} noLinePattern when set, skip if NO… appears immediately before this label
 */
function findLabeledPublicSessions(body, labelPattern, noLinePattern) {
  const found = [];
  const flat = collapsePdfWhitespace(body);
  const combined = new RegExp(
    `${labelPattern.source}\\s+(${DOVER_TIME_RANGE_PATTERN})`,
    'gi',
  );
  let match;
  while ((match = combined.exec(flat)) !== null) {
    if (noLinePattern) {
      const before = flat.slice(Math.max(0, match.index - 48), match.index);
      if (noLinePattern.test(before) && !/Instructional(?:\s+PS|\s+Public\s+Skate)/i.test(before)) {
        continue;
      }
    }
    const timeStr = match[1].replace(/\s/g, '');
    const dash = timeStr.indexOf('-');
    if (dash < 0) continue;
    found.push({
      startRaw: timeStr.slice(0, dash),
      endRaw: timeStr.slice(dash + 1),
      rawTime: timeStr,
      label: match[0].slice(0, match[0].length - timeStr.length).trim(),
    });
  }
  return found;
}

const DEFAULT_STICK_FEE_CENTS = {
  youth_stick: 800,
  parent_tot: 800,
  adult_stick: 1200,
};

/**
 * @param {string} summary
 * @param {number} amount_cents
 */
function stickPriceObject(summary, amount_cents) {
  return {
    summary,
    amount_cents,
    currency: 'USD',
    is_free: false,
  };
}

/** @param {number} cents */
function formatDoverStickDollars(cents) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/**
 * Parse colored fee legend from Dover stick practice PDFs (YOUTH –ORANGE, etc.).
 * @param {string} text
 */
export function parseDoverStickFees(text) {
  const flat = collapsePdfWhitespace(text);
  const parseCents = (pattern) => {
    const m = flat.match(pattern);
    if (!m) return null;
    const dollars = parseFloat(m[1]);
    if (!Number.isFinite(dollars)) return null;
    return Math.round(dollars * 100);
  };

  const youthCents =
    parseCents(/YOUTH\s*[–-]\s*ORANGE\s*\$?\s*([\d.]+)/i) ??
    DEFAULT_STICK_FEE_CENTS.youth_stick;
  const parentCents =
    parseCents(/PARENT\s*\/?\s*TOT\s*[–-]\s*RED\s*\$?\s*([\d.]+)/i) ??
    DEFAULT_STICK_FEE_CENTS.parent_tot;
  const adultCents =
    parseCents(/ADULT\s*-\s*BLUE\s*\$?\s*([\d.]+)/i) ?? DEFAULT_STICK_FEE_CENTS.adult_stick;

  const y = formatDoverStickDollars(youthCents);
  const p = formatDoverStickDollars(parentCents);
  const a = formatDoverStickDollars(adultCents);

  return {
    youth_stick: stickPriceObject(`Youth stick $${y}`, youthCents),
    parent_tot: stickPriceObject(`Parent/tot $${p} per skater`, parentCents),
    adult_stick: stickPriceObject(`Adult stick $${a}`, adultCents),
    legend_line: `Stick practice fees at Dover (this calendar): youth stick $${y}, parent/tot $${p} per skater, adult stick $${a}.`,
  };
}

/**
 * @param {string} text
 * @param {'public' | 'stick'} calendarKind
 */
export function parseDoverCalendarPdf(text, calendarKind) {
  const monthMatch = text.match(MONTHS);
  if (!monthMatch) throw new Error('Could not find month/year in Dover PDF');
  const monthName = monthMatch[1];
  const year = parseInt(monthMatch[2], 10);
  const month = DateTime.fromFormat(`${monthName} 1, ${year}`, 'MMMM d, yyyy').month;

  const calStart = text.search(/\bSun\s+Mon\s+Tue\s+Wed\s+Thu\s+Fri\s+Sat\b/i);
  const feesIdx = text.search(/Public Skate Fees/i);
  let gridEnd = feesIdx > calStart ? feesIdx : undefined;
  if (calendarKind === 'stick') {
    const stickLegendIdx = text.search(/\bYOUTH\s*[–-]\s*ORANGE\b/i);
    if (stickLegendIdx > calStart && (gridEnd == null || stickLegendIdx < gridEnd)) {
      gridEnd = stickLegendIdx;
    }
  }
  const grid =
    calStart >= 0
      ? text.slice(calStart, gridEnd)
      : text.slice(Math.max(0, text.indexOf(monthMatch[0])));

  const sessions = [];
  for (const { day, body } of extractDayBlocks(grid)) {

    if (calendarKind === 'public') {
      for (const slot of findLabeledPublicSessions(
        body,
        /Instructional(?:\s+PS|\s+Public\s+Skate)?/i,
        null,
      )) {
        const t = parseTimePair(slot.startRaw, slot.endRaw, day, month, year, 'America/New_York');
        if (t) {
          sessions.push({
            activity: 'public_skate',
            subtype: 'instructional',
            raw_label: `${slot.label} ${slot.rawTime}`.trim(),
            ...t,
          });
        }
      }
      for (const slot of findLabeledPublicSessions(
        body,
        /Rec Public Skate/i,
        /NO\s*Rec Public Skate/i,
      )) {
        const t = parseTimePair(slot.startRaw, slot.endRaw, day, month, year, 'America/New_York');
        if (t) {
          sessions.push({
            activity: 'public_skate',
            subtype: 'recreational',
            raw_label: `${slot.label} ${slot.rawTime}`.trim(),
            ...t,
          });
        }
      }
      const rockMatch = collapsePdfWhitespace(body).match(
        new RegExp(`Rock Night\\s+(${DOVER_TIME_RANGE_PATTERN})`, 'i'),
      );
      if (rockMatch) {
        const timeStr = rockMatch[1].replace(/\s/g, '');
        const dash = timeStr.indexOf('-');
        const t = parseTimePair(
          timeStr.slice(0, dash),
          timeStr.slice(dash + 1),
          day,
          month,
          year,
          'America/New_York',
        );
        if (t) {
          sessions.push({
            activity: 'public_skate',
            subtype: 'rock_night',
            raw_label: `Rock Night ${timeStr}`,
            ...t,
          });
        }
      }
    }

    if (calendarKind === 'stick') {
      const stickKinds = [
        { pattern: /PARENT\s*\/?\s*TOT/i, subtype: 'parent_tot', label: 'PARENT/TOT' },
        {
          pattern: /(?:YOUTH\s*STICK|\bYOUTH\b)(?!\s*[–-])/i,
          subtype: 'youth_stick',
          label: 'YOUTH STICK',
        },
        {
          pattern: /(?:ADULT\s*STICK|\bADULT\b)(?!\s*-\s*BLUE|\s*[—-]\s*\d)/i,
          subtype: 'adult_stick',
          label: 'ADULT STICK',
        },
      ];
      for (const kind of stickKinds) {
        for (const slot of findLabeledPublicSessions(body, kind.pattern, null)) {
          const t = parseTimePair(slot.startRaw, slot.endRaw, day, month, year, 'America/New_York');
          if (t) {
            sessions.push({
              activity: 'stick_puck',
              subtype: kind.subtype,
              raw_label: `${kind.label} ${slot.rawTime}`.trim(),
              ...t,
            });
          }
        }
      }
    }
  }

  return sessions;
}

/** @param {Buffer} buf @param {'public' | 'stick'} kind */
export async function parseDoverPdfBuffer(buf, kind) {
  const data = await pdf(buf);
  if (kind === 'stick') {
    const fees = parseDoverStickFees(data.text);
    return parseDoverCalendarPdf(data.text, 'stick').map((row) => ({
      ...row,
      price: fees[row.subtype],
      stick_fee_legend: fees.legend_line,
    }));
  }
  return parseDoverCalendarPdf(data.text, kind);
}
