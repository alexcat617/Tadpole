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
    if (!/(am|pm)$/.test(s) && fallbackPeriod) s += fallbackPeriod;
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
  const endPeriod = m[2].match(/(am|pm)/i)?.[0]?.toLowerCase();
  const start = norm(m[1], endPeriod);
  const end = norm(m[2], endPeriod);
  const fmt = 'M/d/yyyy h:mma';
  const startDt = DateTime.fromFormat(`${month}/${day}/${year} ${start}`, fmt, { zone });
  const endDt = DateTime.fromFormat(`${month}/${day}/${year} ${end}`, fmt, { zone });
  if (!startDt.isValid || !endDt.isValid) return null;
  return { starts_at: startDt.toISO(), ends_at: endDt.toISO() };
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

  const footerIdx = text.indexOf(monthMatch[0]);
  const grid = footerIdx > 0 ? text.slice(0, footerIdx) : text;
  const normalized = grid.replace(/\r/g, '').replace(/\n+/g, '\n');

  const sessions = [];
  const dayChunks = normalized.split(/\n(?=\d{1,2}\n|\d{1,2}\s)/);

  for (const chunk of dayChunks) {
    const dayMatch = chunk.match(/^(\d{1,2})\b/);
    if (!dayMatch) continue;
    const day = parseInt(dayMatch[1], 10);
    if (day < 1 || day > 31) continue;
    const body = chunk.slice(dayMatch[0].length);

    if (calendarKind === 'public') {
      if (/NO\s*Instructional/i.test(body) === false && /Instructional PS/i.test(body)) {
        const tm = body.match(
          /Instructional PS\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i,
        );
        if (tm) {
          const t = parseTimePair(tm[1], tm[2], day, month, year, 'America/New_York');
          if (t) {
            sessions.push({
              activity: 'public_skate',
              subtype: 'instructional',
              raw_label: `Instructional PS ${tm[1]}-${tm[2]}`,
              ...t,
            });
          }
        }
      }
      if (!/NO\s*Rec Public Skate/i.test(body) && /Rec Public Skate/i.test(body)) {
        const tm = body.match(
          /Rec Public Skate\s*(\d{1,2}:\d{2}(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}(?:am|pm)?)/i,
        );
        if (tm) {
          const t = parseTimePair(tm[1], tm[2], day, month, year, 'America/New_York');
          if (t) {
            sessions.push({
              activity: 'public_skate',
              subtype: 'recreational',
              raw_label: `Rec Public Skate ${tm[1]}-${tm[2]}`,
              ...t,
            });
          }
        }
      }
      const rock = body.match(/Rock Night\s*(\d{1,2}:\d{2}(?:am|pm)?)\s*-\s*(\d{1,2}:\d{2}(?:am|pm)?)/i);
      if (rock) {
        const t = parseTimePair(rock[1], rock[2], day, month, year, 'America/New_York');
        if (t) {
          sessions.push({
            activity: 'public_skate',
            subtype: 'rock_night',
            raw_label: `Rock Night ${rock[1]}-${rock[2]}`,
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
