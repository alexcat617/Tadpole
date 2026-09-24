import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

/**
 * @param {string} programUrl
 * @param {string} rinkId
 */
export async function scrapeRecDeskProgram(programUrl, rinkId) {
  const res = await fetch(programUrl, {
    headers: { 'User-Agent': 'RinkRadar/1.0 (+https://github.com/alexcat617/Tadpole)' },
  });
  if (!res.ok) throw new Error(`RecDesk fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const sessions = [];

  $('table').each((_, table) => {
    const headerCells = $(table).find('thead tr th');
    if (!headerCells.length) return;
    const headers = headerCells
      .map((__, cell) => $(cell).text().trim().toLowerCase())
      .get();
    if (!headers.includes('date') || !headers.includes('start time')) return;

    $(table)
      .find('tbody tr')
      .each((__, row) => {
        const labeled = {};
        $(row)
          .find('td[data-label]')
          .each((_, cell) => {
            const label = ($(cell).attr('data-label') ?? '').trim().toLowerCase();
            labeled[label] = $(cell).text().trim();
          });
        let dateStr = labeled.date;
        const startStr = labeled['start time'];
        const endStr = labeled['end time'];
        if (!dateStr) {
          const rowText = $(row).text().replace(/\s+/g, ' ');
          dateStr = rowText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
        }
        if (!dateStr || !startStr || !endStr) return;
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return;

        const startDt = DateTime.fromFormat(`${dateStr} ${startStr}`, 'MM/dd/yyyy h:mm a', {
          zone: 'America/New_York',
        });
        const endDt = DateTime.fromFormat(`${dateStr} ${endStr}`, 'MM/dd/yyyy h:mm a', {
          zone: 'America/New_York',
        });
        if (!startDt.isValid || !endDt.isValid) return;

        sessions.push({
          rink_id: rinkId,
          activity: 'public_skate',
          subtype: 'recreational',
          starts_at: startDt.toISO(),
          ends_at: endDt.toISO(),
          price: {
            summary: '$7 admission (see RecDesk)',
            amount_cents: 700,
            currency: 'USD',
            is_free: false,
          },
          raw_label: 'Public Ice Skating',
          source_url: programUrl,
          confidence: 'high',
        });
      });
  });

  return sessions;
}
