import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Activity,
  BruinsScheduleFile,
  CompanionScheduleFile,
  DoverVarsityScheduleFile,
  ProgramsFile,
  Rink,
  Session,
  RinksFile,
  SessionsFile,
} from './types';
import {
  activityLabel,
  addCalendarDaysIso,
  bruinsMatchupLabel,
  buildCompanionGameDayBanner,
  buildScheduleCoverage,
  buildSessionRowsForDay,
  companionBannerSepBefore,
  companionGameBannerAriaLabel,
  defaultSearchDateFromCoverage,
  doverStickPracticeFeesLine,
  filterProgramsForView,
  findNextSessionWindow,
  formatBruinsGameDateTime,
  formatBruinsTvLine,
  formatResultsDayHeader,
  formatSessionShareText,
  formatTimeRange,
  groupBruinsGamesByMonth,
  haversineKm,
  isBruinsGamePast,
  priceSummaryForCard,
  programKindLabel,
  programTeaser,
  sessionScanBadge,
  type ProgramAudienceFilter,
} from './utils';
import './App.css';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;
const HYPE_SOUND_URL = `${import.meta.env.BASE_URL}sounds/hype.wav`;

const RINK_SELECTION_STORAGE_KEY = 'rink-radar-selected-rink-ids';

type ActivityFilter = 'public_skate' | 'stick_puck';

const ACTIVITY_FILTERS: ActivityFilter[] = ['public_skate', 'stick_puck'];

type AppView = 'sessions' | 'programs';

type CompanionScheduleTab = 'wildcats' | 'bruins' | 'doverVarsity';

type DoverSquadTab = 'boys' | 'girls';

function todayInZone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

export default function App() {
  const [sessionsFile, setSessionsFile] = useState<SessionsFile | null>(null);
  const [rinksFile, setRinksFile] = useState<RinksFile | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('public_skate');
  const [date, setDate] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<ActivityFilter | null>(null);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [appliedDateEnd, setAppliedDateEnd] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dateSearchOpen, setDateSearchOpen] = useState(false);
  const [rinksSearchOpen, setRinksSearchOpen] = useState(false);
  const [schedulesDrawerOpen, setSchedulesDrawerOpen] = useState(false);
  const [companionScheduleTab, setCompanionScheduleTab] = useState<CompanionScheduleTab>('bruins');
  const [doverSquadTab, setDoverSquadTab] = useState<DoverSquadTab>('boys');
  const [bruinsScheduleFile, setBruinsScheduleFile] = useState<BruinsScheduleFile | null>(null);
  const [wildcatsScheduleFile, setWildcatsScheduleFile] = useState<CompanionScheduleFile | null>(null);
  const [doverVarsityScheduleFile, setDoverVarsityScheduleFile] =
    useState<DoverVarsityScheduleFile | null>(null);
  const [programsFile, setProgramsFile] = useState<ProgramsFile | null>(null);
  const [programAudienceFilter, setProgramAudienceFilter] = useState<ProgramAudienceFilter>('all');
  const [selectedRinkIds, setSelectedRinkIds] = useState<Set<string>>(() => new Set());
  const [appView, setAppView] = useState<AppView>('sessions');
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const hypeAudioRef = useRef<HTMLAudioElement | null>(null);
  const hypeMomentTimerRef = useRef<number | null>(null);
  const [hypeMoment, setHypeMoment] = useState(false);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = window.setTimeout(() => setShareNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(
    () => () => {
      if (hypeMomentTimerRef.current !== null) {
        window.clearTimeout(hypeMomentTimerRef.current);
      }
    },
    [],
  );

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
      setShareNotice('Could not copy session details.');
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

    fetch(`${DATA_BASE}/bruins-schedule.json`)
      .then((r) => {
        if (!r.ok) throw new Error('bruins');
        return r.json();
      })
      .then((schedule: BruinsScheduleFile) => {
        if (schedule.games?.length) setBruinsScheduleFile(schedule);
      })
      .catch(() => {});

    fetch(`${DATA_BASE}/wildcats-schedule.json`)
      .then((r) => {
        if (!r.ok) throw new Error('wildcats');
        return r.json();
      })
      .then((schedule: CompanionScheduleFile) => {
        if (schedule.games?.length) setWildcatsScheduleFile(schedule);
      })
      .catch(() => {});

    fetch(`${DATA_BASE}/dover-varsity-schedule.json`)
      .then((r) => {
        if (!r.ok) throw new Error('dover-varsity');
        return r.json();
      })
      .then((schedule: DoverVarsityScheduleFile) => {
        if (schedule.games?.length) setDoverVarsityScheduleFile(schedule);
      })
      .catch(() => {});

    fetch(`${DATA_BASE}/programs.json`)
      .then((r) => {
        if (!r.ok) throw new Error('programs');
        return r.json();
      })
      .then((programs: ProgramsFile) => {
        if (programs.programs?.length) setProgramsFile(programs);
      })
      .catch(() => {});
  }, []);

  const clearSearchResults = useCallback(() => {
    setAppliedFilter(null);
    setAppliedDate(null);
    setAppliedDateEnd(null);
    setExpandedSessionId(null);
    setSearchError(null);
  }, []);

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

  useEffect(() => {
    if (rinksInSearch.length === 0) return;
    const inRadiusIds = rinksInSearch.map(({ rink }) => rink.id);
    try {
      const raw = sessionStorage.getItem(RINK_SELECTION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        const valid = new Set(parsed.filter((id) => inRadiusIds.includes(id)));
        if (valid.size > 0) {
          setSelectedRinkIds(valid);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setSelectedRinkIds(new Set(inRadiusIds));
  }, [rinksInSearch]);

  useEffect(() => {
    if (selectedRinkIds.size === 0) return;
    try {
      sessionStorage.setItem(RINK_SELECTION_STORAGE_KEY, JSON.stringify([...selectedRinkIds]));
    } catch {
      /* ignore */
    }
  }, [selectedRinkIds]);

  const searchRinkMap = useMemo(() => {
    const map = new Map<string, Rink>();
    for (const id of selectedRinkIds) {
      const rink = rinkMap.get(id);
      if (rink) map.set(id, rink);
    }
    return map;
  }, [rinkMap, selectedRinkIds]);

  const searchRinkIds = useMemo(() => new Set(searchRinkMap.keys()), [searchRinkMap]);

  const noRinksSelected = searchRinkIds.size === 0 && rinksInSearch.length > 0;

  const toggleRinkInSearch = useCallback((rinkId: string) => {
    setSelectedRinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(rinkId)) next.delete(rinkId);
      else next.add(rinkId);
      return next;
    });
    clearSearchResults();
  }, [clearSearchResults]);

  const selectAllRinksInSearch = useCallback(() => {
    setSelectedRinkIds(new Set(rinksInSearch.map(({ rink }) => rink.id)));
    clearSearchResults();
  }, [clearSearchResults, rinksInSearch]);

  const runSearch = useCallback(async () => {
    if (isSearching || !date || noRinksSelected) return;
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
      setAppliedDateEnd(null);
      setDateSearchOpen(true);
    } catch {
      setSearchError('Could not load schedules. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, [date, filter, isSearching, noRinksSelected]);

  const visiblePrograms = useMemo(() => {
    if (!programsFile) return [];
    return filterProgramsForView(programsFile.programs, searchRinkIds, programAudienceFilter);
  }, [programsFile, searchRinkIds, programAudienceFilter]);

  const showProgramsNav = (programsFile?.programs.length ?? 0) > 0;

  const openProgramsView = useCallback(() => {
    setAppView('programs');
    setExpandedProgramId(null);
    setDateSearchOpen(false);
    setRinksSearchOpen(false);
    setSchedulesDrawerOpen(false);
  }, []);

  const openSessionsView = useCallback(() => {
    setAppView('sessions');
    setExpandedProgramId(null);
  }, []);

  const scheduleCoverage = useMemo(() => {
    if (!sessionsFile) return null;
    return buildScheduleCoverage(sessionsFile.sessions, filter, searchRinkMap.keys());
  }, [sessionsFile, filter, searchRinkMap]);

  const resetDateDraft = useCallback(() => {
    const today = todayInZone();
    setDate(defaultSearchDateFromCoverage(scheduleCoverage, today));
  }, [scheduleCoverage]);

  const clearSessions = useCallback(() => {
    clearSearchResults();
    resetDateDraft();
  }, [clearSearchResults, resetDateDraft]);

  const noDateDataMessage = useCallback(
    (activity: ActivityFilter) =>
      `No schedule data for this date for ${activityLabel(activity).toLowerCase()}. Try another day or use Find Ice.`,
    [],
  );

  const runFindNext = useCallback(async () => {
    if (isSearching || userLat == null || userLng == null || noRinksSelected) return;
    setIsSearching(true);
    setSearchError(null);
    setExpandedSessionId(null);
    try {
      const res = await fetch(`${DATA_BASE}/sessions.generated.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('sessions');
      const sessions: SessionsFile = await res.json();
      setSessionsFile(sessions);
      const today = todayInZone();
      const window = findNextSessionWindow(
        sessions.sessions,
        searchRinkMap,
        userLat,
        userLng,
        radiusKm,
        today,
        filter,
        5,
      );
      if (!window) {
        clearSearchResults();
        setSearchError(
          `No upcoming ${activityLabel(filter).toLowerCase()} in the next five days for your rinks.`,
        );
        return;
      }
      setAppliedFilter(filter);
      setAppliedDate(window.startDate);
      setAppliedDateEnd(window.endDate);
    } catch {
      setSearchError('Could not load schedules. Try again.');
    } finally {
      setIsSearching(false);
    }
  }, [
    clearSearchResults,
    filter,
    isSearching,
    noRinksSelected,
    radiusKm,
    searchRinkMap,
    userLat,
    userLng,
  ]);

  const selectActivity = useCallback(
    (activity: ActivityFilter) => {
      if (activity === filter) return;
      const prevDate = date;
      setFilter(activity);
      setDateSearchOpen(false);
      setRinksSearchOpen(false);
      setSchedulesDrawerOpen(false);
      clearSearchResults();
      if (prevDate && sessionsFile) {
        const cov = buildScheduleCoverage(sessionsFile.sessions, activity, searchRinkMap.keys());
        if (!cov || !cov.dates.has(prevDate)) {
          setSearchError(noDateDataMessage(activity));
        }
      }
    },
    [clearSearchResults, date, filter, noDateDataMessage, searchRinkMap, sessionsFile],
  );

  const selectDate = useCallback(
    (nextDate: string) => {
      if (!nextDate) {
        setSearchError(null);
        resetDateDraft();
        return;
      }
      if (nextDate === date) return;
      if (!sessionsFile) {
        setSearchError('Schedules aren’t loaded yet. Wait a moment, then pick a date again.');
        resetDateDraft();
        return;
      }
      if (!scheduleCoverage || !scheduleCoverage.dates.has(nextDate)) {
        setSearchError(noDateDataMessage(filter));
        resetDateDraft();
        return;
      }
      setSearchError(null);
      clearSearchResults();
      setDate(nextDate);
    },
    [clearSearchResults, date, filter, noDateDataMessage, resetDateDraft, scheduleCoverage, sessionsFile],
  );

  const resultDayBlocks = useMemo(() => {
    if (
      !sessionsFile ||
      appliedFilter == null ||
      appliedDate == null ||
      userLat == null ||
      userLng == null
    ) {
      return [];
    }
    const end = appliedDateEnd ?? appliedDate;
    const blocks: { day: string; rows: ReturnType<typeof buildSessionRowsForDay> }[] = [];
    let d = appliedDate;
    while (d <= end) {
      const dayRows = buildSessionRowsForDay(
        sessionsFile.sessions,
        d,
        appliedFilter,
        searchRinkMap,
        userLat,
        userLng,
        radiusKm,
      );
      if (dayRows.length > 0 || !appliedDateEnd || d === appliedDate) {
        blocks.push({ day: d, rows: dayRows });
      }
      if (d === end) break;
      d = addCalendarDaysIso(d, 1);
    }
    return blocks;
  }, [
    sessionsFile,
    appliedFilter,
    appliedDate,
    appliedDateEnd,
    radiusKm,
    userLat,
    userLng,
    searchRinkMap,
  ]);

  const totalResultRows = useMemo(
    () => resultDayBlocks.flatMap((block) => block.rows),
    [resultDayBlocks],
  );

  const hasSearched = appliedFilter != null && appliedDate != null;

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

  const bruinsGamesByMonth = useMemo(
    () => (bruinsScheduleFile ? groupBruinsGamesByMonth(bruinsScheduleFile.games) : []),
    [bruinsScheduleFile],
  );

  const wildcatsGamesByMonth = useMemo(
    () => (wildcatsScheduleFile ? groupBruinsGamesByMonth(wildcatsScheduleFile.games) : []),
    [wildcatsScheduleFile],
  );

  const doverBoysGamesByMonth = useMemo(
    () =>
      doverVarsityScheduleFile?.squads?.boys?.games?.length
        ? groupBruinsGamesByMonth(doverVarsityScheduleFile.squads.boys.games)
        : [],
    [doverVarsityScheduleFile],
  );

  const doverGirlsGamesByMonth = useMemo(
    () =>
      doverVarsityScheduleFile?.squads?.girls?.games?.length
        ? groupBruinsGamesByMonth(doverVarsityScheduleFile.squads.girls.games)
        : [],
    [doverVarsityScheduleFile],
  );

  const hasWildcatsSchedule = (wildcatsScheduleFile?.games.length ?? 0) > 0;
  const hasBruinsSchedule = (bruinsScheduleFile?.games.length ?? 0) > 0;
  const hasDoverVarsitySchedule = (doverVarsityScheduleFile?.games.length ?? 0) > 0;
  const hasDoverBoysSchedule =
    (doverVarsityScheduleFile?.squads?.boys?.games?.length ?? 0) > 0;
  const hasDoverGirlsSchedule =
    (doverVarsityScheduleFile?.squads?.girls?.games?.length ?? 0) > 0;
  const showDoverSquadTabs = hasDoverBoysSchedule && hasDoverGirlsSchedule;

  const effectiveDoverSquadTab = useMemo((): DoverSquadTab => {
    if (doverSquadTab === 'boys' && hasDoverBoysSchedule) return 'boys';
    if (doverSquadTab === 'girls' && hasDoverGirlsSchedule) return 'girls';
    if (hasDoverBoysSchedule) return 'boys';
    return 'girls';
  }, [doverSquadTab, hasDoverBoysSchedule, hasDoverGirlsSchedule]);
  const hasAnyCompanionSchedule =
    hasWildcatsSchedule || hasBruinsSchedule || hasDoverVarsitySchedule;
  const companionScheduleSourceCount =
    Number(hasBruinsSchedule) + Number(hasWildcatsSchedule) + Number(hasDoverVarsitySchedule);
  const showCompanionScheduleTabs = companionScheduleSourceCount >= 2;

  const effectiveCompanionTab = useMemo((): CompanionScheduleTab => {
    if (companionScheduleTab === 'bruins' && hasBruinsSchedule) return 'bruins';
    if (companionScheduleTab === 'wildcats' && hasWildcatsSchedule) return 'wildcats';
    if (companionScheduleTab === 'doverVarsity' && hasDoverVarsitySchedule) return 'doverVarsity';
    if (hasBruinsSchedule) return 'bruins';
    if (hasWildcatsSchedule) return 'wildcats';
    return 'doverVarsity';
  }, [
    companionScheduleTab,
    hasWildcatsSchedule,
    hasBruinsSchedule,
    hasDoverVarsitySchedule,
  ]);

  const companionGameBanner = useMemo(
    () =>
      buildCompanionGameDayBanner(
        bruinsScheduleFile?.games,
        wildcatsScheduleFile?.games,
        todayInZone(),
        doverVarsityScheduleFile?.games,
      ),
    [bruinsScheduleFile, wildcatsScheduleFile, doverVarsityScheduleFile],
  );

  const defaultCompanionTab = useMemo((): CompanionScheduleTab => {
    if (hasBruinsSchedule) return 'bruins';
    if (hasWildcatsSchedule) return 'wildcats';
    return 'doverVarsity';
  }, [hasBruinsSchedule, hasWildcatsSchedule]);

  const toggleSchedulesPanel = useCallback(() => {
    setSchedulesDrawerOpen((open) => {
      if (open) return false;
      setAppView('sessions');
      setDateSearchOpen(false);
      setRinksSearchOpen(false);
      setCompanionScheduleTab(defaultCompanionTab);
      setDoverSquadTab('boys');
      return true;
    });
  }, [defaultCompanionTab]);

  const closeSchedulesPanel = useCallback(() => {
    setSchedulesDrawerOpen(false);
  }, []);

  const playHype = useCallback(() => {
    const audio = hypeAudioRef.current ?? new Audio(HYPE_SOUND_URL);
    hypeAudioRef.current = audio;
    audio.currentTime = 0;
    void audio.play().catch(() => {});

    if (hypeMomentTimerRef.current !== null) {
      window.clearTimeout(hypeMomentTimerRef.current);
    }
    setHypeMoment(false);
    requestAnimationFrame(() => {
      setHypeMoment(true);
      hypeMomentTimerRef.current = window.setTimeout(() => setHypeMoment(false), 600);
    });
  }, []);

  const toggleRinksPanel = useCallback(() => {
    setRinksSearchOpen((open) => {
      if (!open) {
        setDateSearchOpen(false);
        setSchedulesDrawerOpen(false);
      }
      return !open;
    });
  }, []);

  const closeRinksPanel = useCallback(() => {
    setRinksSearchOpen(false);
  }, []);

  const openDateSearchPanel = useCallback(() => {
    setDateSearchOpen(true);
    setRinksSearchOpen(false);
    setSchedulesDrawerOpen(false);
    const today = todayInZone();
    setDate((current) => current || defaultSearchDateFromCoverage(scheduleCoverage, today));
    setSearchError(null);
  }, [scheduleCoverage]);

  const sidePanelOpen = rinksSearchOpen || schedulesDrawerOpen;

  useEffect(() => {
    if (!sidePanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRinksSearchOpen(false);
        setSchedulesDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidePanelOpen]);

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
            <p className="muted small rinks-drawer-lede">Choose rinks for search.</p>
            <p className="rinks-drawer-actions">
              <button type="button" className="rinks-select-all" onClick={selectAllRinksInSearch}>
                Select all
              </button>
            </p>
            <ul className="rinks-in-search-list">
              {rinksInSearch.map(({ rink }) => {
                const included = selectedRinkIds.has(rink.id);
                const facilityNote =
                  rink.operations?.status === 'closed_for_season'
                    ? (rink.operations.label ?? 'Closed for the season')
                    : null;
                return (
                  <li key={rink.id} className="rinks-in-search-item">
                    <label className="rinks-in-search-toggle">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleRinkInSearch(rink.id)}
                      />
                      <span className="rinks-in-search-name">{rink.name}</span>
                    </label>
                    <span className="rinks-in-search-city">{rink.city}</span>
                    {facilityNote ? (
                      <span className="rink-health-badge rink-health-badge--neutral">
                        {facilityNote}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    ) : null;

  const renderCompanionMonthGroups = (groups: ReturnType<typeof groupBruinsGamesByMonth>) =>
    groups.map((group) => (
      <section key={group.monthKey} className="bruins-schedule-month">
        <h3 className="bruins-schedule-month-title">{group.monthLabel}</h3>
        <ul className="bruins-schedule-list">
          {group.games.map((game) => {
            const past = isBruinsGamePast(game);
            return (
              <li
                key={game.id}
                className={`bruins-schedule-item${past ? ' bruins-schedule-item--past' : ''}`}
              >
                <p className="bruins-schedule-item-primary">
                  <span className="bruins-schedule-datetime">
                    {formatBruinsGameDateTime(game.starts_at)}
                  </span>
                  <span className="bruins-schedule-matchup">{bruinsMatchupLabel(game)}</span>
                </p>
                <p className="bruins-schedule-item-meta">
                  <span className={`bruins-home-away${game.is_home ? ' bruins-home-away--home' : ''}`}>
                    {game.is_home ? 'Home' : 'Away'}
                  </span>
                  <span className="bruins-schedule-venue">{game.venue}</span>
                </p>
                {game.tv_networks.length > 0 ? (
                  <p className="bruins-schedule-tv muted small">
                    {formatBruinsTvLine(game.tv_networks)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    ));

  const hypeControl = (
    <div className="hype-control">
      <button
        type="button"
        className={`hype-fab${hypeMoment ? ' hype-fab--burst' : ''}`}
        aria-label="Play hype sound"
        onClick={(event) => {
          event.stopPropagation();
          playHype();
        }}
      >
        Hype
      </button>
      <span
        className={`hype-burst${hypeMoment ? ' hype-burst--active' : ''}`}
        aria-hidden="true"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="hype-burst-dot" />
        ))}
      </span>
    </div>
  );

  const schedulesDrawer =
    schedulesDrawerOpen && hasAnyCompanionSchedule ? (
      <div className="bruins-drawer-root side-drawer-root">
        <button
          type="button"
          className="bruins-drawer-backdrop side-drawer-backdrop"
          aria-label="Close schedules"
          onClick={closeSchedulesPanel}
        />
        <div
          id="schedules-companion-panel"
          className="bruins-drawer side-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedules-drawer-title"
        >
          <header className="bruins-drawer-header side-drawer-header">
            <h2 id="schedules-drawer-title" className="bruins-drawer-title side-drawer-title">
              Game schedules
            </h2>
            <button
              type="button"
              className="bruins-drawer-close side-drawer-close"
              aria-label="Close"
              onClick={closeSchedulesPanel}
            >
              ×
            </button>
          </header>
          <div className="bruins-drawer-body side-drawer-body">
            {showCompanionScheduleTabs ? (
              <div className="companion-schedule-tabs" role="tablist" aria-label="Schedule team">
                {hasBruinsSchedule ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveCompanionTab === 'bruins'}
                    className={`companion-schedule-tab${effectiveCompanionTab === 'bruins' ? ' active' : ''}`}
                    onClick={() => setCompanionScheduleTab('bruins')}
                  >
                    Bruins
                  </button>
                ) : null}
                {hasWildcatsSchedule ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveCompanionTab === 'wildcats'}
                    className={`companion-schedule-tab${effectiveCompanionTab === 'wildcats' ? ' active' : ''}`}
                    onClick={() => setCompanionScheduleTab('wildcats')}
                  >
                    Wildcats
                  </button>
                ) : null}
                {hasDoverVarsitySchedule ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveCompanionTab === 'doverVarsity'}
                    className={`companion-schedule-tab${effectiveCompanionTab === 'doverVarsity' ? ' active' : ''}`}
                    onClick={() => {
                      setCompanionScheduleTab('doverVarsity');
                      setDoverSquadTab('boys');
                    }}
                  >
                    Dover Varsity
                  </button>
                ) : null}
              </div>
            ) : null}
            {effectiveCompanionTab === 'wildcats' && hasWildcatsSchedule && wildcatsScheduleFile ? (
              <section className="companion-schedule-section" aria-label="UNH Wildcats">
                {!showCompanionScheduleTabs ? (
                  <h3 className="companion-schedule-heading">
                    {wildcatsScheduleFile.team_label ?? "UNH Wildcats men's hockey"}
                  </h3>
                ) : null}
                {renderCompanionMonthGroups(wildcatsGamesByMonth)}
                <p className="bruins-schedule-footer muted small">
                  Not affiliated with UNH or NCAA.{' '}
                  <a href={wildcatsScheduleFile.source_url} target="_blank" rel="noreferrer">
                    Official UNH schedule
                  </a>
                </p>
              </section>
            ) : null}
            {effectiveCompanionTab === 'bruins' && hasBruinsSchedule && bruinsScheduleFile ? (
              <section className="companion-schedule-section" aria-label="Boston Bruins">
                {!showCompanionScheduleTabs ? (
                  <h3 className="companion-schedule-heading">
                    Bruins {bruinsScheduleFile.season_label}
                  </h3>
                ) : null}
                {renderCompanionMonthGroups(bruinsGamesByMonth)}
                <p className="bruins-schedule-footer muted small">
                  Not affiliated with the NHL or Boston Bruins.{' '}
                  <a href={bruinsScheduleFile.source_url} target="_blank" rel="noreferrer">
                    Official Bruins schedule
                  </a>
                </p>
              </section>
            ) : null}
            {effectiveCompanionTab === 'doverVarsity' &&
            hasDoverVarsitySchedule &&
            doverVarsityScheduleFile ? (
              <section className="companion-schedule-section" aria-label="Dover varsity hockey">
                {!showCompanionScheduleTabs ? (
                  <h3 className="companion-schedule-heading">
                    {doverVarsityScheduleFile.team_label ?? 'Dover varsity hockey'}{' '}
                    {doverVarsityScheduleFile.season_label}
                  </h3>
                ) : null}
                {showDoverSquadTabs ? (
                  <div
                    className="program-audience-segmented companion-squad-audience"
                    role="tablist"
                    aria-label="Dover varsity squad"
                  >
                    {(
                      [
                        ['boys', 'Boys'],
                        ['girls', 'Girls'],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={effectiveDoverSquadTab === value}
                        className={`program-audience-btn${effectiveDoverSquadTab === value ? ' active' : ''}`}
                        onClick={() => setDoverSquadTab(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : !showCompanionScheduleTabs ? (
                  <h4 className="companion-schedule-squad-title">
                    {effectiveDoverSquadTab === 'boys'
                      ? doverVarsityScheduleFile.squads.boys.label
                      : doverVarsityScheduleFile.squads.girls.label}
                  </h4>
                ) : null}
                {effectiveDoverSquadTab === 'boys' ? (
                  hasDoverBoysSchedule ? (
                    renderCompanionMonthGroups(doverBoysGamesByMonth)
                  ) : (
                    <p className="muted small">
                      Schedule unavailable.{' '}
                      <a
                        href={
                          doverVarsityScheduleFile.source_urls?.boys ??
                          doverVarsityScheduleFile.source_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Check official boys schedule
                      </a>
                    </p>
                  )
                ) : hasDoverGirlsSchedule ? (
                  renderCompanionMonthGroups(doverGirlsGamesByMonth)
                ) : (
                  <p className="muted small">
                    Schedule unavailable.{' '}
                    <a
                      href={
                        doverVarsityScheduleFile.source_urls?.girls ??
                        doverVarsityScheduleFile.source_url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check official girls schedule
                    </a>
                  </p>
                )}
                <p className="bruins-schedule-footer muted small">
                  Not affiliated with NHIAA or Dover School District.{' '}
                  {doverVarsityScheduleFile.source_urls?.boys ? (
                    <a
                      href={doverVarsityScheduleFile.source_urls.boys}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Boys schedule
                    </a>
                  ) : null}
                  {doverVarsityScheduleFile.source_urls?.boys &&
                  doverVarsityScheduleFile.source_urls?.girls ? (
                    <span aria-hidden="true"> · </span>
                  ) : null}
                  {doverVarsityScheduleFile.source_urls?.girls ? (
                    <a
                      href={doverVarsityScheduleFile.source_urls.girls}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Girls schedule
                    </a>
                  ) : null}
                </p>
              </section>
            ) : null}
          </div>
          <footer className="schedules-drawer-hype">{hypeControl}</footer>
        </div>
      </div>
    ) : null;

  const showSchedulesFabOnView = hasAnyCompanionSchedule && appView !== 'programs';

  const schedulesFab =
    showSchedulesFabOnView && !schedulesDrawerOpen ? (
      <button
        type="button"
        className="bottom-fab"
        aria-expanded={schedulesDrawerOpen}
        aria-controls="schedules-companion-panel"
        onClick={toggleSchedulesPanel}
      >
        Schedules
      </button>
    ) : null;

  const shellClassName = `app-shell app-shell--site-footer${
    showSchedulesFabOnView && !schedulesDrawerOpen ? ' app-shell--bottom-fab' : ''
  }`;

  const siteFooter = (
    <footer className="site-footer" role="contentinfo">
      {schedulesUpdated ? (
        <time className="site-footer-updated" dateTime={schedulesUpdated.iso}>
          Updated {schedulesUpdated.label}
        </time>
      ) : (
        <span className="site-footer-updated">Schedule data loading…</span>
      )}
      <p className="site-footer-trust">Schedules change — confirm with the rink before you go.</p>
    </footer>
  );

  const topBar = (
    <header className="top-bar" role="banner">
      <div className="top-bar-inner">
        <div className="header-titles">
          <h1 className="header-region">Seacoast ice</h1>
        </div>
        <div className="header-actions">
          {showProgramsNav ? (
            <button
              type="button"
              className={`header-rinks-btn${appView === 'programs' ? ' header-rinks-btn--current' : ''}`}
              aria-current={appView === 'programs' ? 'page' : undefined}
              onClick={() => {
                if (appView !== 'programs') openProgramsView();
              }}
            >
              Programs
            </button>
          ) : null}
          {rinksFile ? (
            <button
              type="button"
              className="header-rinks-btn"
              aria-expanded={rinksSearchOpen}
              aria-controls="rinks-in-search-panel"
              aria-label={`Rinks, ${selectedRinkIds.size} selected`}
              onClick={toggleRinksPanel}
            >
              Rinks
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );

  if (loadError) {
    return (
      <div className={shellClassName}>
        {topBar}
        <main className="app">
          <p className="error">{loadError}</p>
        </main>
        {rinksDrawer}
        {schedulesDrawer}
        {schedulesFab}
        {siteFooter}
      </div>
    );
  }

  if (!rinksFile) {
    return (
      <div className={shellClassName}>
        {topBar}
        <main className="app">
          <p className="muted">Loading…</p>
        </main>
        {rinksDrawer}
        {schedulesDrawer}
        {schedulesFab}
        {siteFooter}
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      {topBar}
      <main className={appView === 'programs' ? 'app app--programs' : 'app'}>
      {appView === 'programs' && programsFile ? (
        <section className="programs-section" aria-label="Arena programs">
          <header className="programs-intro">
            <div className="programs-intro-header">
              <h2 className="programs-heading">Programs</h2>
              <button
                type="button"
                className="programs-close side-drawer-close"
                aria-label="Close programs"
                onClick={openSessionsView}
              >
                ×
              </button>
            </div>
            <p className="muted small programs-lede">
              Kids learn-to-skate, leagues, and drop-ins from your selected rinks.
            </p>
            <div
              className="program-audience-segmented"
              role="tablist"
              aria-label="Program audience"
            >
              {(
                [
                  ['all', 'All'],
                  ['kids', 'Kids'],
                  ['adult', 'Adult'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={programAudienceFilter === value}
                  className={`program-audience-btn${programAudienceFilter === value ? ' active' : ''}`}
                  onClick={() => setProgramAudienceFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>
          <div className="programs-body">
          {visiblePrograms.length === 0 ? (
            <div className="empty programs-empty">
              <p>No programs for your filters.</p>
              <p className="muted">
                {programAudienceFilter === 'kids'
                  ? 'No kids programs for your selected rinks — try Public skate or Stick & puck for open ice.'
                  : 'Open rinks — turn on a rink that offers programs.'}
              </p>
            </div>
          ) : (
            <ul className="program-list">
              {visiblePrograms.map((program) => {
                const rink = rinkMap.get(program.rink_id);
                const isExpanded = expandedProgramId === program.id;
                const detailsId = `program-details-${program.id}`;
                return (
                  <li
                    key={program.id}
                    className={isExpanded ? 'program-item expanded' : 'program-item'}
                  >
                    <button
                      type="button"
                      className="program-card-toggle"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedProgramId(isExpanded ? null : program.id)}
                    >
                      <span className="program-card-title">{program.title}</span>
                      {rink ? <span className="program-card-rink muted small">{rink.name}</span> : null}
                      <span className="program-meta">
                        <span className={`program-kind-badge program-kind-badge--${program.kind}`}>
                          {programKindLabel(program.kind)}
                        </span>
                        <span className="program-teaser muted small">{programTeaser(program)}</span>
                      </span>
                      <span className="program-chevron" aria-hidden="true" />
                    </button>
                    {isExpanded ? (
                      <div className="program-details" id={detailsId}>
                        {program.description.split('\n\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                        <ul className="program-offerings">
                          {program.offerings.map((offering) => (
                            <li key={`${program.id}-${offering.label}`} className="program-offering">
                              <h3 className="program-offering-label">{offering.label}</h3>
                              <p>
                                <strong>When:</strong> {offering.schedule_text}
                              </p>
                              {offering.exceptions && offering.exceptions.length > 0 ? (
                                <p className="muted small">
                                  <strong>Off:</strong> {offering.exceptions.join('; ')}
                                </p>
                              ) : null}
                              <p>
                                <strong>Times:</strong> {offering.times_text}
                              </p>
                              <p>
                                <strong>Cost:</strong> {offering.cost_text}
                              </p>
                              <p>
                                <strong>Registration:</strong> {offering.registration_text}
                              </p>
                            </li>
                          ))}
                        </ul>
                        {program.links && program.links.length > 0 ? (
                          <ul className="program-links">
                            {program.links.map((link) => (
                              <li key={link.url}>
                                <a href={link.url} target="_blank" rel="noreferrer">
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {rink?.phone ? (
                          <p>
                            <a href={`tel:${rink.phone.replace(/[^\d+]/g, '')}`}>{rink.phone}</a>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="programs-footer muted small">
            Not affiliated with host facilities.{' '}
            <a href={programsFile.source_url} target="_blank" rel="noreferrer">
              Official program listings
            </a>
          </p>
          </div>
        </section>
      ) : (
        <>
      {companionGameBanner ? (
        <div className="companion-game-banner-wrap">
          <div
            className="companion-game-banner"
            role="status"
            aria-label={companionGameBannerAriaLabel(companionGameBanner)}
          >
            <span className="companion-game-banner-inner">
            {companionGameBanner.parts.map((part, index) => (
              <span
                key={`${part.kind}-${index}`}
                className={
                  part.kind === 'day' ? 'companion-game-banner-day' : 'companion-game-banner-chip'
                }
              >
                {companionBannerSepBefore(index, companionGameBanner.parts) ? (
                  <span className="companion-game-banner-sep" aria-hidden="true">
                    {' · '}
                  </span>
                ) : null}
                {part.kind === 'day' ? part.label : part.text}
              </span>
            ))}
          </span>
        </div>
        </div>
      ) : null}
      <section className="controls" aria-label="Find sessions">
        <div className="controls-group controls-group--types">
          <p className="controls-label" id="activity-label">
            I want to…
          </p>
          <div
            className="activity-segmented"
            role="tablist"
            aria-labelledby="activity-label"
            style={
              {
                '--segment-index': ACTIVITY_FILTERS.indexOf(filter),
                '--segment-count': ACTIVITY_FILTERS.length,
              } as React.CSSProperties
            }
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
            disabled={isSearching || noRinksSelected}
          >
            Find Ice
          </button>
        </div>

        <div className="controls-group controls-group--search">
          {!dateSearchOpen ? (
            <button
              type="button"
              className="search-by-date-cta"
              onClick={openDateSearchPanel}
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
                  aria-describedby={!date ? 'search-date-helper' : undefined}
                />
                {!date ? (
                  <span id="search-date-helper" className="search-date-helper">
                    Pick a date to search.
                  </span>
                ) : null}
              </label>
              <button
                type="button"
                className="search-cta"
                onClick={() => void runSearch()}
                disabled={isSearching || !date || noRinksSelected}
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

        {noRinksSelected && (
          <p className="error search-error">Turn on at least one rink.</p>
        )}
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
          <div className="empty empty--prompt">
            <p>Use Find Ice or Search by date.</p>
          </div>
        ) : totalResultRows.length === 0 ? (
          <div className="empty results-empty">
            <p>No sessions for this day and filter.</p>
            <p className="muted">Try another date, activity, or rinks.</p>
            {filter === 'public_skate' && showProgramsNav ? (
              <p className="muted">
                Looking for classes?{' '}
                <button type="button" className="text-link-btn" onClick={openProgramsView}>
                  Programs → Kids
                </button>
              </p>
            ) : null}
          </div>
        ) : (
          resultDayBlocks.map((block) => {
            if (block.rows.length === 0) return null;
            const dayHeader = formatResultsDayHeader(block.day, todayInZone());
            const isTodayBlock = dayHeader.relative === 'Today';
            return (
              <div
                key={block.day}
                className={
                  isTodayBlock ? 'results-day-block results-day-block--today' : 'results-day-block'
                }
              >
                {appliedFilter && (
                  <header
                    className={
                      isTodayBlock
                        ? 'results-day-header results-day-header--today'
                        : 'results-day-header'
                    }
                  >
                    <p className="results-day-kicker">
                      {dayHeader.relative ?? 'Selected day'}
                    </p>
                    <h2 className="results-day-title">{dayHeader.title}</h2>
                  </header>
                )}
                <ul className="session-list">
                  {block.rows.map(({ session, rink }) => {
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
                        className="session-share-btn"
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
              </div>
            );
          })
        )}
      </section>
        </>
      )}
      </main>
      {rinksDrawer}
      {schedulesDrawer}
      {schedulesFab}
      {siteFooter}
    </div>
  );
}
