import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
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
  buildCompanionGameDayBanner,
  buildScheduleCoverage,
  buildSessionRowsForDay,
  defaultSearchDateFromCoverage,
  filterProgramsForView,
  findNextSessionWindow,
  formatSessionShareText,
  groupBruinsGamesByMonth,
  haversineKm,
  type ProgramAudienceFilter,
} from './utils';
import type { ActivityFilter } from './components/ActivityTabs';
import { GameDayBanner } from './components/GameDayBanner';
import { HypeControl } from './components/HypeControl';
import { ProgramsView } from './components/ProgramsView';
import { ResultsSection } from './components/ResultsSection';
import { RinksDrawer } from './components/RinksDrawer';
import {
  SchedulesDrawer,
  type CompanionScheduleTab,
  type DoverSquadTab,
} from './components/SchedulesDrawer';
import { SearchControls } from './components/SearchControls';
import { SiteFooter } from './components/SiteFooter';
import { TopBar } from './components/TopBar';
import './App.css';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;
const HYPE_SOUND_URL = `${import.meta.env.BASE_URL}sounds/hype.wav`;

const RINK_SELECTION_STORAGE_KEY = 'rink-radar-selected-rink-ids';

type AppView = 'sessions' | 'programs';

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
    setDateSearchOpen(false);
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
  const showSearchReset = hasSearched && !isSearching;

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
      <RinksDrawer
        rinks={rinksInSearch}
        selectedRinkIds={selectedRinkIds}
        onToggleRink={toggleRinkInSearch}
        onClose={closeRinksPanel}
      />
    ) : null;

  const schedulesDrawer =
    schedulesDrawerOpen && hasAnyCompanionSchedule ? (
      <SchedulesDrawer
        onClose={closeSchedulesPanel}
        activeTab={effectiveCompanionTab}
        onTabChange={setCompanionScheduleTab}
        showTeamTabs={showCompanionScheduleTabs}
        bruins={bruinsScheduleFile}
        bruinsGroups={bruinsGamesByMonth}
        wildcats={wildcatsScheduleFile}
        wildcatsGroups={wildcatsGamesByMonth}
        doverVarsity={doverVarsityScheduleFile}
        doverBoysGroups={doverBoysGamesByMonth}
        doverGirlsGroups={doverGirlsGamesByMonth}
        doverSquad={effectiveDoverSquadTab}
        onDoverSquadChange={setDoverSquadTab}
        showDoverSquadTabs={showDoverSquadTabs}
        footer={<HypeControl active={hypeMoment} onPlay={playHype} />}
      />
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

  const showSiteFooter = appView !== 'programs';

  const shellClassName = `app-shell${showSiteFooter ? ' app-shell--site-footer' : ''}${
    showSchedulesFabOnView && !schedulesDrawerOpen ? ' app-shell--bottom-fab' : ''
  }`;

  const siteFooter = <SiteFooter updated={schedulesUpdated} />;

  const topBar = (
    <TopBar
      showProgramsNav={showProgramsNav}
      programsCurrent={appView === 'programs'}
      onOpenPrograms={openProgramsView}
      showRinksButton={rinksFile != null}
      rinksOpen={rinksSearchOpen}
      selectedRinkCount={selectedRinkIds.size}
      onToggleRinks={toggleRinksPanel}
    />
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
        {showSiteFooter ? siteFooter : null}
        {schedulesFab}
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
        {showSiteFooter ? siteFooter : null}
        {schedulesFab}
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      {topBar}
      <main className={appView === 'programs' ? 'app app--programs' : 'app'}>
        {appView === 'programs' && programsFile ? (
          <ProgramsView
            programs={visiblePrograms}
            sourceUrl={programsFile.source_url}
            rinkMap={rinkMap}
            audience={programAudienceFilter}
            onAudienceChange={setProgramAudienceFilter}
            expandedProgramId={expandedProgramId}
            onToggleProgram={(programId) =>
              setExpandedProgramId(expandedProgramId === programId ? null : programId)
            }
            onClose={openSessionsView}
          />
        ) : (
          <>
            {companionGameBanner ? <GameDayBanner banner={companionGameBanner} /> : null}
            <SearchControls
              activity={filter}
              onActivityChange={selectActivity}
              showReset={showSearchReset}
              onReset={clearSessions}
              onFindIce={() => void runFindNext()}
              isSearching={isSearching}
              noRinksSelected={noRinksSelected}
              dateSearchOpen={dateSearchOpen}
              onOpenDateSearch={openDateSearchPanel}
              date={date}
              dateMin={scheduleCoverage?.min}
              dateMax={scheduleCoverage?.max}
              onDateChange={selectDate}
              onSearch={() => void runSearch()}
              searchError={searchError}
            />
            <ResultsSection
              isSearching={isSearching}
              hasSearched={hasSearched}
              totalResultCount={totalResultRows.length}
              dayBlocks={resultDayBlocks}
              showDayHeaders={appliedFilter != null}
              today={todayInZone()}
              shareNotice={shareNotice}
              expandedSessionId={expandedSessionId}
              onToggleSession={(sessionId) =>
                setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId)
              }
              onShareSession={(session, rink) => void shareSession(session, rink)}
            />
          </>
        )}
      </main>
      {rinksDrawer}
      {schedulesDrawer}
      {showSiteFooter ? siteFooter : null}
      {schedulesFab}
    </div>
  );
}
