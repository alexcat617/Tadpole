import type { ReactNode } from 'react';
import type { BruinsScheduleFile, CompanionScheduleFile, DoverVarsityScheduleFile } from '../types';
import { CompanionMonthGroups, type CompanionMonthGroup } from './CompanionMonthGroups';

export type CompanionScheduleTab = 'wildcats' | 'bruins' | 'doverVarsity';

export type DoverSquadTab = 'boys' | 'girls';

interface SchedulesDrawerProps {
  onClose: () => void;
  activeTab: CompanionScheduleTab;
  onTabChange: (tab: CompanionScheduleTab) => void;
  showTeamTabs: boolean;
  bruins: BruinsScheduleFile | null;
  bruinsGroups: CompanionMonthGroup[];
  wildcats: CompanionScheduleFile | null;
  wildcatsGroups: CompanionMonthGroup[];
  doverVarsity: DoverVarsityScheduleFile | null;
  doverBoysGroups: CompanionMonthGroup[];
  doverGirlsGroups: CompanionMonthGroup[];
  doverSquad: DoverSquadTab;
  onDoverSquadChange: (squad: DoverSquadTab) => void;
  showDoverSquadTabs: boolean;
  footer: ReactNode;
}

export function SchedulesDrawer({
  onClose,
  activeTab,
  onTabChange,
  showTeamTabs,
  bruins,
  bruinsGroups,
  wildcats,
  wildcatsGroups,
  doverVarsity,
  doverBoysGroups,
  doverGirlsGroups,
  doverSquad,
  onDoverSquadChange,
  showDoverSquadTabs,
  footer,
}: SchedulesDrawerProps) {
  const hasBruins = (bruins?.games.length ?? 0) > 0;
  const hasWildcats = (wildcats?.games.length ?? 0) > 0;
  const hasDoverVarsity = (doverVarsity?.games.length ?? 0) > 0;
  const hasDoverBoys = (doverVarsity?.squads?.boys?.games?.length ?? 0) > 0;
  const hasDoverGirls = (doverVarsity?.squads?.girls?.games?.length ?? 0) > 0;
  const showSquadTabsHere = activeTab === 'doverVarsity' && hasDoverVarsity && showDoverSquadTabs;

  return (
    <div className="bruins-drawer-root side-drawer-root">
      <button
        type="button"
        className="bruins-drawer-backdrop side-drawer-backdrop"
        aria-label="Close schedules"
        onClick={onClose}
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
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {showTeamTabs || showSquadTabsHere ? (
          <div className="schedules-drawer-toolbar">
            {showTeamTabs ? (
              <div className="companion-schedule-tabs" role="tablist" aria-label="Schedule team">
                {hasBruins ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'bruins'}
                    className={`companion-schedule-tab${activeTab === 'bruins' ? ' active' : ''}`}
                    onClick={() => onTabChange('bruins')}
                  >
                    Bruins
                  </button>
                ) : null}
                {hasWildcats ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'wildcats'}
                    className={`companion-schedule-tab${activeTab === 'wildcats' ? ' active' : ''}`}
                    onClick={() => onTabChange('wildcats')}
                  >
                    Wildcats
                  </button>
                ) : null}
                {hasDoverVarsity ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'doverVarsity'}
                    className={`companion-schedule-tab${activeTab === 'doverVarsity' ? ' active' : ''}`}
                    onClick={() => {
                      onTabChange('doverVarsity');
                      onDoverSquadChange('boys');
                    }}
                  >
                    Dover Varsity
                  </button>
                ) : null}
              </div>
            ) : null}
            {showSquadTabsHere ? (
              <div
                className="program-audience-segmented companion-squad-audience schedules-drawer-squad-tabs"
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
                    aria-selected={doverSquad === value}
                    className={`program-audience-btn${doverSquad === value ? ' active' : ''}`}
                    onClick={() => onDoverSquadChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="schedules-drawer-scroll">
          {activeTab === 'wildcats' && hasWildcats && wildcats ? (
            <section className="companion-schedule-section" aria-label="UNH Wildcats">
              {!showTeamTabs ? (
                <h3 className="companion-schedule-heading">
                  {wildcats.team_label ?? "UNH Wildcats men's hockey"}
                </h3>
              ) : null}
              <CompanionMonthGroups groups={wildcatsGroups} />
              <p className="bruins-schedule-footer muted small">
                Not affiliated with UNH or NCAA.{' '}
                <a href={wildcats.source_url} target="_blank" rel="noreferrer">
                  Official UNH schedule
                </a>
              </p>
            </section>
          ) : null}
          {activeTab === 'bruins' && hasBruins && bruins ? (
            <section className="companion-schedule-section" aria-label="Boston Bruins">
              {!showTeamTabs ? (
                <h3 className="companion-schedule-heading">Bruins {bruins.season_label}</h3>
              ) : null}
              <CompanionMonthGroups groups={bruinsGroups} />
              <p className="bruins-schedule-footer muted small">
                Not affiliated with the NHL or Boston Bruins.{' '}
                <a href={bruins.source_url} target="_blank" rel="noreferrer">
                  Official Bruins schedule
                </a>
              </p>
            </section>
          ) : null}
          {activeTab === 'doverVarsity' && hasDoverVarsity && doverVarsity ? (
            <section className="companion-schedule-section" aria-label="Dover varsity hockey">
              {!showTeamTabs ? (
                <h3 className="companion-schedule-heading">
                  {doverVarsity.team_label ?? 'Dover varsity hockey'} {doverVarsity.season_label}
                </h3>
              ) : null}
              {!showTeamTabs && !showDoverSquadTabs ? (
                <h4 className="companion-schedule-squad-title">
                  {doverSquad === 'boys'
                    ? doverVarsity.squads.boys.label
                    : doverVarsity.squads.girls.label}
                </h4>
              ) : null}
              {doverSquad === 'boys' ? (
                hasDoverBoys ? (
                  <CompanionMonthGroups groups={doverBoysGroups} />
                ) : (
                  <p className="muted small">
                    Schedule unavailable.{' '}
                    <a
                      href={doverVarsity.source_urls?.boys ?? doverVarsity.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check official boys schedule
                    </a>
                  </p>
                )
              ) : hasDoverGirls ? (
                <CompanionMonthGroups groups={doverGirlsGroups} />
              ) : (
                <p className="muted small">
                  Schedule unavailable.{' '}
                  <a
                    href={doverVarsity.source_urls?.girls ?? doverVarsity.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Check official girls schedule
                  </a>
                </p>
              )}
              <p className="bruins-schedule-footer muted small">
                Not affiliated with NHIAA or Dover School District.{' '}
                {doverVarsity.source_urls?.boys ? (
                  <a href={doverVarsity.source_urls.boys} target="_blank" rel="noreferrer">
                    Boys schedule
                  </a>
                ) : null}
                {doverVarsity.source_urls?.boys && doverVarsity.source_urls?.girls ? (
                  <span aria-hidden="true"> · </span>
                ) : null}
                {doverVarsity.source_urls?.girls ? (
                  <a href={doverVarsity.source_urls.girls} target="_blank" rel="noreferrer">
                    Girls schedule
                  </a>
                ) : null}
              </p>
            </section>
          ) : null}
        </div>
        <footer className="schedules-drawer-hype">{footer}</footer>
      </div>
    </div>
  );
}
