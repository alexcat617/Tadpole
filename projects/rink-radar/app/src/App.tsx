import { useEffect, useMemo, useState } from 'react';
import type { Activity, Session, RinksFile, SessionsFile } from './types';
import { activityLabel, formatTimeRange, haversineKm, rinkById } from './utils';
import './App.css';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

type ActivityFilter = 'public_skate' | 'adult_hockey' | 'stick_puck';

function todayInZone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function sessionMatchesFilter(session: Session, filter: ActivityFilter): boolean {
  if (filter === 'public_skate') return session.activity === 'public_skate';
  if (filter === 'stick_puck') return session.activity === 'stick_puck';
  return session.activity === 'adult_hockey';
}

export default function App() {
  const [sessionsFile, setSessionsFile] = useState<SessionsFile | null>(null);
  const [rinksFile, setRinksFile] = useState<RinksFile | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('public_skate');
  const [date, setDate] = useState(todayInZone());
  const [radiusKm, setRadiusKm] = useState(40);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${DATA_BASE}/sessions.generated.json`).then((r) => r.json()),
      fetch(`${DATA_BASE}/rinks.json`).then((r) => r.json()),
    ])
      .then(([sessions, rinks]) => {
        setSessionsFile(sessions);
        setRinksFile(rinks);
        const anchor = rinks.region.anchor;
        setUserLat(anchor.lat);
        setUserLng(anchor.lng);
      })
      .catch(() => setLoadError('Could not load schedule data.'));
  }, []);

  const activeRinks = useMemo(
    () =>
      (rinksFile?.rinks ?? []).filter((r) => r.status === 'pilot' || r.status === 'active'),
    [rinksFile],
  );

  const rinkMap = useMemo(() => new Map(activeRinks.map((r) => [r.id, r])), [activeRinks]);

  const rows = useMemo(() => {
    if (!sessionsFile || userLat == null || userLng == null) return [];
    const now = Date.now();
    const dayStart = new Date(`${date}T00:00:00-04:00`).getTime();
    const dayEnd = new Date(`${date}T23:59:59-04:00`).getTime();

    return sessionsFile.sessions
      .filter((s) => {
        if (!rinkMap.has(s.rink_id)) return false;
        if (!sessionMatchesFilter(s, filter)) return false;
        const start = new Date(s.starts_at).getTime();
        if (start < dayStart || start > dayEnd) return false;
        if (date === todayInZone() && new Date(s.ends_at).getTime() < now - 30 * 60 * 1000) {
          return false;
        }
        const rink = rinkMap.get(s.rink_id)!;
        const dist = haversineKm(userLat, userLng, rink.lat, rink.lng);
        return dist <= radiusKm;
      })
      .map((s) => {
        const rink = rinkMap.get(s.rink_id)!;
        const distance_km = haversineKm(userLat, userLng, rink.lat, rink.lng);
        return { session: s, rink, distance_km };
      })
      .sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
  }, [sessionsFile, filter, date, radiusKm, userLat, userLng, rinkMap]);

  function useGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  if (loadError) {
    return (
      <div className="app">
        <p className="error">{loadError}</p>
      </div>
    );
  }

  if (!sessionsFile || !rinksFile) {
    return (
      <div className="app">
        <p className="muted">Loading schedules…</p>
      </div>
    );
  }

  const detailRink = selected ? rinkById(activeRinks, selected.rink_id) : null;

  return (
    <div className="app">
      <header className="header">
        <h1>Rink Radar</h1>
        <p className="tagline">Seacoast ice near Dover · schedules from official sources</p>
        <p className="meta">
          Updated {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(sessionsFile.generated_at))}
        </p>
      </header>

      <section className="controls">
        <div className="activity-toggle" role="tablist" aria-label="Activity">
          {(['public_skate', 'adult_hockey', 'stick_puck'] as ActivityFilter[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={filter === a}
              className={filter === a ? 'active' : ''}
              onClick={() => setFilter(a)}
            >
              {activityLabel(a as Activity)}
            </button>
          ))}
        </div>

        <div className="row">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Within
            <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
              <option value={25}>25 km</option>
              <option value={40}>40 km</option>
              <option value={60}>60 km</option>
            </select>
          </label>
          <button type="button" className="secondary" onClick={useGeolocation}>
            Use my location
          </button>
        </div>
      </section>

      <p className="disclaimer">
        Schedules change — confirm with the rink before you go.
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <p>No sessions for this day and filter.</p>
          <p className="muted">Try another date, wider radius, or a different activity.</p>
        </div>
      ) : (
        <ul className="session-list">
          {rows.map(({ session, rink, distance_km }) => (
            <li key={session.id}>
              <button type="button" className="session-card" onClick={() => setSelected(session)}>
                <span className="time">{formatTimeRange(session.starts_at, session.ends_at)}</span>
                <span className="rink">{rink.name}</span>
                <span className="sub">
                  {session.subtype?.replace(/_/g, ' ') ?? activityLabel(session.activity)}
                  {session.price?.summary ? ` · ${session.price.summary}` : ''}
                </span>
                <span className="dist">{distance_km.toFixed(1)} km</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && detailRink && (
        <dialog open className="detail" onClose={() => setSelected(null)}>
          <article>
            <button type="button" className="close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
            <h2>{detailRink.name}</h2>
            <p>{formatTimeRange(selected.starts_at, selected.ends_at)}</p>
            {selected.raw_label && <p className="muted">{selected.raw_label}</p>}
            <p>
              {detailRink.address}, {detailRink.city}, {detailRink.region} {detailRink.postal_code}
            </p>
            {detailRink.phone && (
              <p>
                <a href={`tel:${detailRink.phone.replace(/[^\d+]/g, '')}`}>{detailRink.phone}</a>
              </p>
            )}
            <p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${detailRink.lat},${detailRink.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in maps
              </a>
            </p>
            <p>
              <a href={selected.source_url} target="_blank" rel="noreferrer">
                Official schedule source
              </a>
            </p>
            <p className="muted small">Rink site: <a href={detailRink.website}>{detailRink.website}</a></p>
          </article>
        </dialog>
      )}
    </div>
  );
}
