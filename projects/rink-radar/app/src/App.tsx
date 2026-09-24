import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, Session, RinksFile, SessionsFile } from './types';
import { activityLabel, formatTimeRange, haversineKm } from './utils';
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
  const [radiusKm] = useState(40);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<ActivityFilter | null>(null);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetch(`${DATA_BASE}/rinks.json`)
      .then((r) => {
        if (!r.ok) throw new Error('rinks');
        return r.json();
      })
      .then((rinks: RinksFile) => {
        setRinksFile(rinks);
        const anchor = rinks.region.anchor;
        setUserLat(anchor.lat);
        setUserLng(anchor.lng);
      })
      .catch(() => setLoadError('Could not load rink data.'));

    fetch(`${DATA_BASE}/sessions.generated.json`)
      .then((r) => {
        if (!r.ok) throw new Error('sessions');
        return r.json();
      })
      .then((sessions: SessionsFile) => setSessionsFile(sessions))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    if (isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    setExpandedSessionId(null);
    try {
      const res = await fetch(`${DATA_BASE}/sessions.generated.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('sessions');
      const sessions: SessionsFile = await res.json();
      setSessionsFile(sessions);
      setAppliedFilter(filter);
      setAppliedDate(date);
    } catch {
      setSearchError('Could not load schedules. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, [date, filter, isSearching]);

  const clearSessions = useCallback(() => {
    setAppliedFilter(null);
    setAppliedDate(null);
    setExpandedSessionId(null);
    setSearchError(null);
  }, []);

  const activeRinks = useMemo(
    () =>
      (rinksFile?.rinks ?? []).filter((r) => r.status === 'pilot' || r.status === 'active'),
    [rinksFile],
  );

  const rinkMap = useMemo(() => new Map(activeRinks.map((r) => [r.id, r])), [activeRinks]);

  const rows = useMemo(() => {
    if (!sessionsFile || appliedFilter == null || appliedDate == null || userLat == null || userLng == null) {
      return [];
    }
    const now = Date.now();
    const dayStart = new Date(`${appliedDate}T00:00:00-04:00`).getTime();
    const dayEnd = new Date(`${appliedDate}T23:59:59-04:00`).getTime();

    return sessionsFile.sessions
      .filter((s) => {
        if (!rinkMap.has(s.rink_id)) return false;
        if (!sessionMatchesFilter(s, appliedFilter)) return false;
        const start = new Date(s.starts_at).getTime();
        if (start < dayStart || start > dayEnd) return false;
        if (appliedDate === todayInZone() && new Date(s.ends_at).getTime() < now - 30 * 60 * 1000) {
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
  }, [sessionsFile, appliedFilter, appliedDate, radiusKm, userLat, userLng, rinkMap]);

  const hasSearched = appliedFilter != null && appliedDate != null;

  if (loadError) {
    return (
      <div className="app">
        <p className="error">{loadError}</p>
      </div>
    );
  }

  if (!rinksFile) {
    return (
      <div className="app">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Rink Radar</h1>
        <p className="tagline">Seacoast ice near Dover · schedules from official sources</p>
        <p className="meta">
          {sessionsFile
            ? `Updated ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(sessionsFile.generated_at))}`
            : 'Choose options below, then search for sessions.'}
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
        </div>

        <button
          type="button"
          className="search-cta"
          onClick={() => void runSearch()}
          disabled={isSearching || (hasSearched && rows.length > 0)}
          aria-busy={isSearching}
        >
          {isSearching ? 'Searching…' : 'Find sessions'}
        </button>
        {hasSearched && !isSearching && (
          <button type="button" className="secondary clear-sessions" onClick={clearSessions}>
            Clear sessions
          </button>
        )}
        {searchError && <p className="error search-error">{searchError}</p>}
      </section>

      <p className="disclaimer">
        Schedules change — confirm with the rink before you go.
      </p>

      <section className="results" aria-live="polite" aria-busy={isSearching}>
        {isSearching ? (
          <div className="search-loading">
            <span className="search-loading-spinner" aria-hidden="true" />
            <p>Searching schedules…</p>
          </div>
        ) : !hasSearched ? (
          <div className="empty">
            <p>Pick an activity and date, then search.</p>
          </div>
        ) : rows.length === 0 ? (
        <div className="empty">
          <p>No sessions for this day and filter.</p>
          <p className="muted">Try another date, wider radius, or a different activity.</p>
        </div>
      ) : (
        <ul className="session-list">
          {rows.map(({ session, rink, distance_km }) => {
            const isExpanded = expandedSessionId === session.id;
            const detailsId = `session-details-${session.id}`;
            return (
              <li key={session.id} className={isExpanded ? 'session-item expanded' : 'session-item'}>
                <button
                  type="button"
                  className="session-card"
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                >
                  <span className="time">{formatTimeRange(session.starts_at, session.ends_at)}</span>
                  <span className="dist">{distance_km.toFixed(1)} km</span>
                  <span className="rink">{rink.name}</span>
                  <span className="sub">
                    {session.subtype?.replace(/_/g, ' ') ?? activityLabel(session.activity)}
                    {session.price?.summary ? ` · ${session.price.summary}` : ''}
                  </span>
                  <span className="session-chevron" aria-hidden="true">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="session-details" id={detailsId}>
                    {session.raw_label && <p className="muted">{session.raw_label}</p>}
                    <p>
                      {rink.address}, {rink.city}, {rink.region} {rink.postal_code}
                    </p>
                    {rink.phone && (
                      <p>
                        <a href={`tel:${rink.phone.replace(/[^\d+]/g, '')}`}>{rink.phone}</a>
                      </p>
                    )}
                    <p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${rink.lat},${rink.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in maps
                      </a>
                    </p>
                    <p>
                      <a href={session.source_url} target="_blank" rel="noreferrer">
                        Official schedule source
                      </a>
                    </p>
                    <p className="muted small">
                      Rink site:{' '}
                      <a href={rink.website} target="_blank" rel="noreferrer">
                        {rink.website}
                      </a>
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        )}
      </section>
    </div>
  );
}
