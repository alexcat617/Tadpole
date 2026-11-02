/** Admin / placeholder events — not public ice sessions. */
export const CHURCHILL_SKIP_TITLE = new RegExp(
  [
    'CLOSED FOR THE SEASON',
    'CLOSED FOR THE OFF-SEASON',
    'OPENING DATE FOR SEASON',
    'ANTICIPATED OPENING DATE',
    'SCHEDULE PENDING PUBLICATION',
    'LEARN TO SKATE SIGN UP',
    'IN PERSON LEARN TO SKATE',
    'WE ARE CLOSED',
    'WE CLOSE FOR THE SEASON',
  ].join('|'),
  'i',
);

/** @param {string} title */
export function shouldSkipChurchillTitle(title) {
  return CHURCHILL_SKIP_TITLE.test(title);
}

/**
 * @param {string} title
 * @param {string} [tagsText]
 * @returns {'public_skate' | 'stick_puck' | null}
 */
export function classifyChurchillActivity(title, tagsText = '') {
  if (shouldSkipChurchillTitle(title)) return null;
  const t = title.toUpperCase();
  const tags = tagsText.toUpperCase();

  if (/\bFUN SKATE\b/.test(t) || /\bPUBLIC SKATING\b/.test(t)) return 'public_skate';
  if (/\bSTICK\b|\bPOND HOCKEY\b|\bSPLIT ICE\b/.test(t)) return 'stick_puck';

  if (/\bPUBLIC HOCKEY\b/.test(tags) && !/\bPUBLIC SKATING\b/.test(t)) return 'stick_puck';
  if (/\bPUBLIC SKATING\b/.test(tags)) return 'public_skate';

  return null;
}

/**
 * Stick/hockey session badge subtype from Churchill event titles (mirrors Dover PDF subtypes).
 * @param {'public_skate' | 'stick_puck'} activity
 * @param {string} rawLabel
 */
export function churchillSessionSubtype(activity, rawLabel) {
  if (activity === 'public_skate') return 'recreational';
  const t = rawLabel.toUpperCase();
  if (/PICK\s*-?\s*UP/.test(t)) return 'adult_stick';
  if (/8TH\s*GRADE\s*&\s*BELOW/.test(t)) return 'grade_8_and_below';
  if (/HS\s*&\s*OLDER/.test(t)) return 'hs_and_older';
  if (/ALL AGES/.test(t)) return 'all_ages';
  return 'drop_in';
}

/** @param {Array<{ starts_at: string, activity: string, raw_label: string }>} list */
export function dedupeChurchillSessions(list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = `${s.starts_at}|${s.activity}|${s.raw_label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
