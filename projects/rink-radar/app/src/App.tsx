import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, HealthFile, Rink, Session, RinksFile, SessionsFile } from './types';
import {
  activityLabel,
  buildScheduleCoverage,
  doverStickPracticeFeesLine,
  findNextSession,
  formatResultsDayHeader,
  formatSessionShareText,
  formatTimeRange,
  haversineKm,
  priceSummaryForCard,
  rinkListStatus,
  searchRinkNamesSummary,
  sessionDateInZone,
  sessionScanBadge,
} from './utils';
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
  const [date, setDate] = useState('');
  const [healthFile, setHealthFile] = useState<HealthFile | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<ActivityFilter | null>(null);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dateSearchOpen, setDateSearchOpen] = useState(false);
  const [rinksSearchOpen, setRinksSearchOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  const shareSession = useCallback(async (session: Session, rink: Rink) => {
    const text = formatSessionShareText(session, rink);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Ice session', text });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareNotice('Session details copied.');
    } catch {
      setShareNotice('Could not copy. Use the official schedule link below.');
    }
  }, []);

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

    fetch(`${DATA_BASE}/health.json`)
      .then((r) => {
        if (!r.ok) throw new Error('health');
        return r.json();
      })
      .then((health: HealthFile) => setHealthFile(health))
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    if (isSearching || !date) return;
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
      setDateSearchOpen(true);
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
    setDate('');
  }, []);

  const clearSessions = clearSearchResults;

  const activeRinks = useMemo(
    () =>
      (rinksFile?.rinks ?? []).filter((r) => r.status === 'pilot' || r.status === 'active'),
    [rinksFile],
  );

  const rinkMap = useMemo(() => new Map(activeRinks.map((r) => [r.id, r])), [activeRinks]);

  const radiusKm = rinksFile?.region.default_radius_km ?? 25;

  const rinksInSearch = useMemo(() => {
    if (userLat == null || userLng == null) return [];
    return activeRinks
      .map((rink) => ({
        rink,
        distance_km: haversineKm(userLat, userLng, rink.lat, rink.lng),
      }))
      .filter(({ distance_km }) => distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [activeRinks, radiusKm, userLat, userLng]);

  const pausedRinkCount = useMemo(
    () => (rinksFile?.rinks ?? []).filter((r) => r.status === 'paused').length,
    [rinksFile],
  );

  const searchRinkSummary = useMemo(
    () => searchRinkNamesSummary(rinksInSearch.map(({ rink }) => rink)),
    [rinksInSearch],
  );

  const scheduleCoverage = useMemo(() => {
    if (!sessionsFile) return null;
    return buildScheduleCoverage(sessionsFile.sessions, filter, rinkMap.keys());
  }, [sessionsFile, filter, rinkMap]);

  const noDateDataMessage = useCallback(
    (activity: ActivityFilter) =>
      `No schedule data for this date for ${activityLabel(activity).toLowerCase()}. Try another day or use Find next session.`,
    [],
  );

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
      const prevDate = date;
      setFilter(activity);
      setDateSearchOpen(false);
      setRinksSearchOpen(false);
      clearSearchResults();
      if (prevDate && sessionsFile) {
        const cov = buildScheduleCoverage(sessionsFile.sessions, activity, rinkMap.keys());
        if (!cov || !cov.dates.has(prevDate)) {
          setSearchError(noDateDataMessage(activity));
        }
      }
    },
    [clearSearchResults, date, filter, noDateDataMessage, rinkMap, sessionsFile],
  );

  const selectDate = useCallback(
    (nextDate: string) => {
      if (!nextDate) {
        setDate('');
        setSearchError(null);
        return;
      }
      if (nextDate === date) return;
      if (!sessionsFile) {
        setSearchError('Schedules aren’t loaded yet. Wait a moment, then pick a date again.');
        setDate('');
        return;
      }
      if (!scheduleCoverage || !scheduleCoverage.dates.has(nextDate)) {
        setSearchError(noDateDataMessage(filter));
        setDate('');
        return;
      }
      setSearchError(null);
      clearSearchResults();
      setDate(nextDate);
    },
    [clearSearchResults, date, filter, noDateDataMessage, scheduleCoverage, sessionsFile],
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

  const toggleRinksPanel = useCallback(() => {
    setRinksSearchOpen((open) => {
      if (!open) setDateSearchOpen(false);
      return !open;
    });
  }, []);

  const closeRinksPanel = useCallback(() => {
    setRinksSearchOpen(false);
  }, []);

  useEffect(() => {
    if (!rinksSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRinksSearchOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [rinksSearchOpen]);

  const rinksDrawer =
    rinksSearchOpen && rinksFile ? (
      <div className="rinks-drawer-root">
        <button
          type="button"
          className="rinks-drawer-backdrop"
          aria-label="Close rinks list"
          onClick={closeRinksPanel}
        />
        <div
          id="rinks-in-search-panel"
          className="rinks-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rinks-drawer-title"
        >
          <header className="rinks-drawer-header">
            <h2 id="rinks-drawer-title" className="rinks-drawer-title">
              Rinks in search
            </h2>
            <button
              type="button"
              className="rinks-drawer-close"
              aria-label="Close"
              onClick={closeRinksPanel}
            >
              ×
            </button>
          </header>
          <div className="rinks-drawer-body">
            <ul className="rinks-in-search-list">
              {rinksInSearch.map(({ rink }) => {
                const status = rinkListStatus(rink, healthFile?.rinks[rink.id]);
                return (
                  <li key={rink.id} className="rinks-in-search-item">
                    <span className="rinks-in-search-name">{rink.name}</span>
                    <span className="rinks-in-search-city">{rink.city}</span>
                    <span className={`rink-health-badge rink-health-badge--${status.variant}`}>
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            {pausedRinkCount > 0 && (
              <p className="muted small rinks-in-search-more">
                {pausedRinkCount} more rinks in our registry coming soon.
              </p>
            )}
          </div>
        </div>
      </div>
    ) : null;

  const topBar = (
    <header className="top-bar" role="banner">
      <div className="top-bar-inner">
        <div className="header-titles">
          <h1 className="header-region">Seacoast ice</h1>
          <p className="header-app-name">Rink Radar</p>
          {schedulesUpdated && (
            <time className="header-updated" dateTime={schedulesUpdated.iso}>
              Updated {schedulesUpdated.label}
            </time>
          )}
        </div>
        <div className="header-actions">
          {rinksFile && (
            <button
              type="button"
              className="header-rinks-btn"
              aria-expanded={rinksSearchOpen}
              aria-controls="rinks-in-search-panel"
              aria-label={`Rinks in search, ${rinksInSearch.length} rinks`}
              onClick={toggleRinksPanel}
            >
              Rinks · {rinksInSearch.length}
            </button>
          )}
        </div>
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
        {rinksDrawer}
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
        {rinksDrawer}
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
          {!dateSearchOpen ? (
            <button
              type="button"
              className="search-by-date-cta"
              onClick={() => {
                setDateSearchOpen(true);
                setRinksSearchOpen(false);
              }}
            >
              <svg
                className="search-by-date-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Search by date
            </button>
          ) : (
            <div className="search-row">
              <label className="search-date">
                Date
                <input
                  type="date"
                  value={date}
                  min={scheduleCoverage?.min}
                  max={scheduleCoverage?.max}
                  onChange={(e) => selectDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="search-cta"
                onClick={() => void runSearch()}
                disabled={isSearching || !date || (hasSearched && rows.length > 0)}
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
          )}
        </div>

        {searchError && <p className="error search-error">{searchError}</p>}
      </section>

      <section className="results" aria-live="polite" aria-busy={isSearching}>
        {shareNotice ? (
          <p className="share-notice" role="status">
            {shareNotice}
          </p>
        ) : null}
        {isSearching ? (
          <div className="search-loading">
            <span className="search-loading-spinner" aria-hidden="true" />
            <p>Searching schedules…</p>
          </div>
        ) : !hasSearched ? (
          <div className="empty">
            <p>Use Find next session or Search by date.</p>
            {searchRinkSummary ? (
              <p className="muted small">Searching {searchRinkSummary}.</p>
            ) : null}
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
                {searchRinkSummary ? (
                  <p className="muted small">Searching {searchRinkSummary}.</p>
                ) : null}
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
                  className="session-card-toggle"
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
                    <p className="session-share-row">
                      <button
                        type="button"
                        className="secondary session-share-btn"
                        onClick={() => void shareSession(session, rink)}
                      >
                        <svg
                          className="session-share-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        Share with friend
                      </button>
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
      {rinksDrawer}
    </div>
  );
}
