import type { Session, Rink } from './types';

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
  return null;
}

export function sessionDateInZone(startsAt: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(startsAt));
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
