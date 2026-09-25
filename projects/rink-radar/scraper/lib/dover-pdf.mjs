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
    /(\d{1,2}(?::\d{2})?(?:am|pm|a|p)?)\s*-\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i,
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

/** Flexible public-skate time range as extracted from Dover PDFs (e.g. 10-11:20am, 1:30-2:50P). */
const PUBLIC_TIME_RANGE =
  /(\d{1,2}(?::\d{2})?[ap]?\s*-\s*\d{1,2}(?::\d{2})?(?:am|pm|[ap])?)/i;

function collapsePdfWhitespace(body) {
  return body.replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
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
    `${labelPattern.source}\\s+(${PUBLIC_TIME_RANGE.source})`,
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
  const grid =
    calStart >= 0
      ? text.slice(calStart, feesIdx > calStart ? feesIdx : undefined)
      : text.slice(Math.max(0, text.indexOf(monthMatch[0])));

  const sessions = [];
  const dayBlockRe = /\n\s*(\d{1,2})\s*\n([\s\S]*?)(?=\n\s*\d{1,2}\s*\n|$)/g;
  let dayBlock;
  while ((dayBlock = dayBlockRe.exec(grid)) !== null) {
    const day = parseInt(dayBlock[1], 10);
    if (day < 1 || day > 31) continue;
    const body = dayBlock[2];

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
        new RegExp(`Rock Night\\s+(${PUBLIC_TIME_RANGE.source})`, 'i'),
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
        { pattern: /ADULT\s*STICK/i, subtype: 'adult_stick', label: 'ADULT STICK' },
        { pattern: /YOUTH\s*STICK/i, subtype: 'youth_stick', label: 'YOUTH STICK' },
        { pattern: /PARENT\s*\/?\s*TOT/i, subtype: 'parent_tot', label: 'PARENT/TOT' },
      ];
      for (const kind of stickKinds) {
        if (!kind.pattern.test(body)) continue;
        const tm = body.match(
          /(\d{1,2}:\d{2}[ap]?\s*-\s*\d{1,2}:\d{2}(?:am|pm)?|\d{1,2}:\d{2}[ap]?\s*-\s*\d{1,2}:\d{2}[ap]m)/i,
        );
        const timeStr = tm?.[1] ?? body.match(/(\d{1,2}:\d{2}[ap]?-\d{1,2}:\d{2}(?:am|pm)?)/i)?.[1];
        if (!timeStr) continue;
        const parts = timeStr.replace(/\s/g, '').split('-');
        const t = parseTimePair(parts[0], parts[1], day, month, year, 'America/New_York');
        if (t) {
          sessions.push({
            activity: 'stick_puck',
            subtype: kind.subtype,
            raw_label: `${kind.label} ${timeStr}`,
            ...t,
          });
        }
      }
    }
  }

  return sessions;
}

/** @param {Buffer} buf @param {'public' | 'stick'} kind */
export async function parseDoverPdfBuffer(buf, kind) {
  const data = await pdf(buf);
  return parseDoverCalendarPdf(data.text, kind);
}
