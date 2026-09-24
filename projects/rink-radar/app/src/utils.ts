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

export function rinkById(rinks: Rink[], id: string): Rink | undefined {
  return rinks.find((r) => r.id === id);
}
