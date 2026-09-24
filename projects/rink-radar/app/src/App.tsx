import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, Session, RinksFile, SessionsFile } from './types';
import { activityLabel, doverStickPracticeFeesLine, findNextSession, formatResultsDayHeader, formatTimeRange, haversineKm, priceSummaryForCard, sessionDateInZone, sessionScanBadge } from './utils';
import './App.css';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

type ActivityFilter = 'public_skate' | 'adult_hockey' | 'stick_puck';

const ACTIVITY_FILTERS: ActivityFilter[] = ['public_skate', 'adult_hockey', 'stick_puck'];

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

  const clearSearchResults = useCallback(() => {
    setAppliedFilter(null);
    setAppliedDate(null);
    setExpandedSessionId(null);
    setSearchError(null);
  }, []);

  const clearSessions = clearSearchResults;

  const activeRinks = useMemo(
    () =>
      (rinksFile?.rinks ?? []).filter((r) => r.status === 'pilot' || r.status === 'active'),
    [rinksFile],
  );

  const rinkMap = useMemo(() => new Map(activeRinks.map((r) => [r.id, r])), [activeRinks]);

  const runFindNext = useCallback(async () => {
    if (isSearching || userLat == null || userLng == null) return;
    setIsSearching(true);
    setSearchError(null);
    setExpandedSessionId(null);
    try {
      const res = await fetch(`${DATA_BASE}/sessions.generated.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('sessions');
      const sessions: SessionsFile = await res.json();
      setSessionsFile(sessions);
      const today = todayInZone();
      const next = findNextSession(sessions.sessions, rinkMap, userLat, userLng, radiusKm, today, filter);
      if (!next) {
        clearSearchResults();
        setSearchError(`No upcoming ${activityLabel(filter).toLowerCase()} sessions in our schedule data.`);
        return;
      }
      const nextDate = sessionDateInZone(next.starts_at);
      setDate(nextDate);
      setAppliedFilter(filter);
      setAppliedDate(nextDate);
    } catch {
      setSearchError('Could not load schedules. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, [clearSearchResults, filter, isSearching, radiusKm, rinkMap, userLat, userLng]);

  const selectActivity = useCallback(
    (activity: ActivityFilter) => {
      if (activity === filter) return;
      setFilter(activity);
      clearSearchResults();
    },
    [clearSearchResults, filter],
  );

  const selectDate = useCallback(
    (nextDate: string) => {
      if (nextDate === date) return;
      setDate(nextDate);
      clearSearchResults();
    },
    [clearSearchResults, date],
  );

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

  const resultsDayHeader = useMemo(() => {
    if (!appliedDate) return null;
    return formatResultsDayHeader(appliedDate, todayInZone());
  }, [appliedDate]);

  const schedulesUpdated = useMemo(() => {
    if (!sessionsFile) return null;
    const label = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(new Date(sessionsFile.generated_at));
    return { label, iso: sessionsFile.generated_at };
  }, [sessionsFile]);

  const topBar = (
    <header className="top-bar" role="banner">
      <div className="top-bar-inner">
        <div className="header-titles">
          <h1 className="header-region">Seacoast ice</h1>
          <p className="header-app-name">Rink Radar</p>
        </div>
        {schedulesUpdated && (
          <time className="header-updated" dateTime={schedulesUpdated.iso}>
            Updated {schedulesUpdated.label}
          </time>
        )}
      </div>
    </header>
  );

  if (loadError) {
    return (
      <div className="app-shell">
        {topBar}
        <main className="app">
          <p className="error">{loadError}</p>
        </main>
      </div>
    );
  }

  if (!rinksFile) {
    return (
      <div className="app-shell">
        {topBar}
        <main className="app">
          <p className="muted">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {topBar}
      <main className="app">
      <section className="controls" aria-label="Find sessions">
        <div className="controls-group controls-group--types">
          <p className="controls-label" id="activity-label">
            Session type
          </p>
          <div
            className="activity-segmented"
            role="tablist"
            aria-labelledby="activity-label"
            style={{ '--segment-index': ACTIVITY_FILTERS.indexOf(filter) } as React.CSSProperties}
          >
            <span className="activity-segmented-thumb" aria-hidden="true" />
            {ACTIVITY_FILTERS.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={filter === a}
                className={`activity-segmented-btn${filter === a ? ' active' : ''}`}
                onClick={() => selectActivity(a)}
              >
                {activityLabel(a as Activity)}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-group controls-group--find-next">
          <button
            type="button"
            className="find-next-session"
            onClick={() => void runFindNext()}
            disabled={isSearching}
          >
            Find next session
          </button>
        </div>

        <div className="controls-group controls-group--search">
          <div className="search-row">
            <label className="search-date">
              Date
              <input type="date" value={date} onChange={(e) => selectDate(e.target.value)} />
            </label>
            <button
              type="button"
              className="search-cta"
              onClick={() => void runSearch()}
              disabled={isSearching || (hasSearched && rows.length > 0)}
              aria-busy={isSearching}
            >
              {isSearching ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              className="secondary clear-sessions"
              onClick={clearSessions}
              disabled={!hasSearched || isSearching}
            >
              Clear
            </button>
          </div>
        </div>

        {searchError && <p className="error search-error">{searchError}</p>}
      </section>

      <section className="results" aria-live="polite" aria-busy={isSearching}>
        {isSearching ? (
          <div className="search-loading">
            <span className="search-loading-spinner" aria-hidden="true" />
            <p>Searching schedules…</p>
          </div>
        ) : !hasSearched ? (
          <div className="empty">
            <p>Pick an activity and date, search, or use Find next session.</p>
          </div>
        ) : (
          <>
            {resultsDayHeader && appliedFilter && (
              <header className="results-day-header">
                <p className="results-day-kicker">
                  {activityLabel(appliedFilter)} · {resultsDayHeader.relative ?? 'Selected day'}
                </p>
                <h2 className="results-day-title">{resultsDayHeader.title}</h2>
              </header>
            )}
            {rows.length === 0 ? (
              <div className="empty results-empty">
                <p>No sessions for this day and filter.</p>
                <p className="muted">Try another date, wider radius, or a different activity.</p>
              </div>
            ) : (
              <ul className="session-list">
                {rows.map(({ session, rink }) => {
            const isExpanded = expandedSessionId === session.id;
            const detailsId = `session-details-${session.id}`;
            const scanBadge = sessionScanBadge(session.subtype);
            const priceText = session.price?.summary
              ? priceSummaryForCard(session.price.summary)
              : '';
            return (
              <li key={session.id} className={isExpanded ? 'session-item expanded' : 'session-item'}>
                <button
                  type="button"
                  className="session-card"
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                >
                  <span className="rink">{rink.name}</span>
                  <span className="time">{formatTimeRange(session.starts_at, session.ends_at)}</span>
                  <span className="session-meta">
                    {scanBadge ? (
                      <span className={`session-badge session-badge--${scanBadge.variant}`}>
                        {scanBadge.label}
                      </span>
                    ) : (
                      <span className="session-badge session-badge--neutral">
                        {session.subtype?.replace(/_/g, ' ') ?? activityLabel(session.activity)}
                      </span>
                    )}
                    {priceText ? <span className="session-price">{priceText}</span> : null}
                  </span>
                  <span className="session-chevron" aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div className="session-details" id={detailsId}>
                    {rink.id === 'dover-arena' && session.subtype === 'youth_stick' && (
                      <p className="muted small">{doverStickPracticeFeesLine()}</p>
                    )}
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
          </>
        )}
      </section>

      <p className="disclaimer">Schedules change — confirm with the rink before you go.</p>
      </main>
    </div>
  );
}
