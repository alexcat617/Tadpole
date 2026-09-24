import type { Session, Rink, RinkHealthEntry, BruinsGame, Program, ProgramKind } from './types';

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatTimeRange(starts: string, ends: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
  return `${fmt.format(new Date(starts))} – ${fmt.format(new Date(ends))}`;
}

export function activityLabel(activity: Session['activity']): string {
  switch (activity) {
    case 'public_skate':
      return 'Public skate';
    case 'adult_hockey':
      return 'Adult hockey';
    case 'stick_puck':
      return 'Stick & puck';
    default:
      return 'Session';
  }
}

export function priceSummaryForCard(summary: string): string {
  return summary
    .replace(/\s*\(see rink\)/gi, '')
    .replace(/\s*\(see rink site\)/gi, '')
    .replace(/\s*\(see RecDesk\)/gi, '')
    .trim();
}

export type SessionScanBadge = {
  label: string;
  variant: 'recreational' | 'instructional';
};

export function sessionScanBadge(subtype?: string): SessionScanBadge | null {
  if (subtype === 'recreational') {
    return { label: 'Recreational', variant: 'recreational' };
  }
  if (subtype === 'instructional') {
    return { label: 'Instructional', variant: 'instructional' };
  }
  if (subtype === 'youth_stick') {
    return { label: 'Youth stick', variant: 'instructional' };
  }
  if (subtype === 'parent_tot') {
    return { label: 'Parent/tot', variant: 'recreational' };
  }
  return null;
}

/** Shown in session details for Dover stick practice (monthly PDF fee legend). */
export function doverStickPracticeFeesLine(): string {
  return 'Stick practice fees at Dover: youth stick $8, parent/tot $8 per skater, adult stick $12.';
}

export function sessionDateInZone(startsAt: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(startsAt));
}

export type ResultsDayHeader = {
  title: string;
  relative: string | null;
};

/** @param dateIso YYYY-MM-DD in America/New_York */
export function formatResultsDayHeader(dateIso: string, todayIso: string): ResultsDayHeader {
  const anchor = new Date(`${dateIso}T12:00:00-04:00`);
  const title = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(anchor);

  const dayMs = 86400000;
  const target = new Date(`${dateIso}T12:00:00-04:00`).getTime();
  const today = new Date(`${todayIso}T12:00:00-04:00`).getTime();
  const diffDays = Math.round((target - today) / dayMs);

  let relative: string | null = null;
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Tomorrow';
  else if (diffDays > 1) relative = `In ${diffDays} days`;
  else if (diffDays === -1) relative = 'Yesterday';
  else if (diffDays < -1) relative = `${Math.abs(diffDays)} days ago`;

  return { title, relative };
}

export function isUpcomingSession(session: Session, today: string, now = Date.now()): boolean {
  const date = sessionDateInZone(session.starts_at);
  if (date < today) return false;
  if (date === today) {
    return new Date(session.ends_at).getTime() >= now - 30 * 60 * 1000;
  }
  return true;
}

export type NextSessionActivity = 'public_skate' | 'adult_hockey' | 'stick_puck';

export type ScheduleCoverage = {
  dates: Set<string>;
  min: string;
  max: string;
};

/** Dates that appear in scraped data for an activity at active rinks (YYYY-MM-DD, America/New_York). */
export function buildScheduleCoverage(
  sessions: Session[],
  activity: NextSessionActivity,
  rinkIds: Iterable<string>,
): ScheduleCoverage | null {
  const allowed = new Set(rinkIds);
  const dates = new Set<string>();
  for (const s of sessions) {
    if (s.activity !== activity) continue;
    if (!allowed.has(s.rink_id)) continue;
    dates.add(sessionDateInZone(s.starts_at));
  }
  if (dates.size === 0) return null;
  const sorted = [...dates].sort();
  return { dates, min: sorted[0]!, max: sorted[sorted.length - 1]! };
}

export function findNextSession(
  sessions: Session[],
  rinkMap: Map<string, Rink>,
  userLat: number,
  userLng: number,
  radiusKm: number,
  today: string,
  activity: NextSessionActivity,
  now = Date.now(),
): Session | null {
  const candidates = sessions
    .filter((s) => s.activity === activity)
    .filter((s) => rinkMap.has(s.rink_id))
    .filter((s) => {
      const rink = rinkMap.get(s.rink_id)!;
      return haversineKm(userLat, userLng, rink.lat, rink.lng) <= radiusKm;
    })
    .filter((s) => isUpcomingSession(s, today, now))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return candidates[0] ?? null;
}

export function rinkById(rinks: Rink[], id: string): Rink | undefined {
  return rinks.find((r) => r.id === id);
}

export type RinkScheduleStatus = {
  label: string;
  variant: 'ok' | 'warn' | 'error' | 'neutral';
};

export function rinkListStatus(rink: Rink, entry: RinkHealthEntry | undefined): RinkScheduleStatus {
  const ops = rink.operations?.status;
  if (ops === 'closed_for_season') {
    return {
      label: rink.operations?.label ?? 'Closed for the season',
      variant: 'neutral',
    };
  }
  return rinkScheduleStatus(entry);
}

export function rinkScheduleStatus(entry: RinkHealthEntry | undefined): RinkScheduleStatus {
  if (!entry) return { label: 'Status unknown', variant: 'warn' };
  if (!entry.ok) return { label: 'Scrape issue', variant: 'error' };
  if (entry.session_count === 0) return { label: 'No times listed yet', variant: 'warn' };
  return { label: 'Schedule available', variant: 'ok' };
}

/** @param km distance in kilometers */
export function formatDistanceMi(km: number): string {
  const mi = km * 0.621371;
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

export function searchRinkNamesSummary(rinks: { name: string }[]): string {
  if (rinks.length === 0) return '';
  if (rinks.length <= 3) return rinks.map((r) => r.name).join(', ');
  return `${rinks
    .slice(0, 3)
    .map((r) => r.name)
    .join(', ')} +${rinks.length - 3} more`;
}

export function formatSessionShareText(session: Session, rink: Rink): string {
  const badge = sessionScanBadge(session.subtype);
  const typeLine = badge
    ? `${activityLabel(session.activity)} · ${badge.label}`
    : session.subtype
      ? `${activityLabel(session.activity)} · ${session.subtype.replace(/_/g, ' ')}`
      : activityLabel(session.activity);
  const dateLine = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(session.starts_at));
  const timeLine = formatTimeRange(session.starts_at, session.ends_at);
  const lines = [typeLine, `${rink.name} · ${rink.city}`, `${dateLine}, ${timeLine}`];
  if (session.price?.summary) {
    lines.push(priceSummaryForCard(session.price.summary));
  }
  lines.push(`Confirm before you go: ${session.source_url}`);
  return `Want to join me?\n\n${lines.join('\n')}`;
}

export type BruinsMonthGroup = {
  monthKey: string;
  monthLabel: string;
  games: BruinsGame[];
};

export function groupBruinsGamesByMonth(games: BruinsGame[]): BruinsMonthGroup[] {
  const map = new Map<string, BruinsGame[]>();
  for (const game of games) {
    const key = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      timeZone: 'America/New_York',
    })
      .format(new Date(game.starts_at))
      .slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(game);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthGames]) => ({
      monthKey,
      monthLabel: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/New_York',
      }).format(new Date(`${monthKey}-15T12:00:00-04:00`)),
      games: monthGames.sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    }));
}

export function formatBruinsGameDateTime(startsAt: string): string {
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(startsAt));
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date(startsAt));
  return `${date} · ${time}`;
}

export function bruinsMatchupLabel(game: BruinsGame): string {
  return game.is_home ? `vs ${game.opponent_abbr}` : `@ ${game.opponent_abbr}`;
}

export function isBruinsGamePast(game: BruinsGame): boolean {
  if (game.game_state === 'FINAL' || game.game_state === 'OFF') return true;
  return new Date(game.starts_at).getTime() < Date.now() - 3 * 60 * 60 * 1000;
}

export function formatBruinsTvLine(networks: string[]): string {
  if (!networks.length) return '';
  return `TV · ${networks.join(' · ')}`;
}

export function programKindLabel(kind: ProgramKind): string {
  switch (kind) {
    case 'drop_in':
      return 'Drop-in';
    case 'league':
      return 'League';
    case 'skills':
      return 'Skills';
    default:
      return kind;
  }
}

export function filterProgramsByRinkIds(programs: Program[], rinkIds: Set<string>): Program[] {
  return programs.filter((p) => rinkIds.has(p.rink_id));
}

export function programTeaser(program: Program, maxLen = 100): string {
  const first = program.offerings[0];
  if (first?.schedule_text) {
    const line = `${first.label}: ${first.schedule_text}`;
    return line.length <= maxLen ? line : `${line.slice(0, maxLen - 1)}…`;
  }
  const desc = program.description.trim();
  return desc.length <= maxLen ? desc : `${desc.slice(0, maxLen - 1)}…`;
}
