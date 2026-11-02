import type { Rink } from '../types';
import type { ProgramAudienceFilter } from '../utils';
import { ProgramCard, type Program } from './ProgramCard';

interface ProgramsViewProps {
  programs: Program[];
  sourceUrl: string;
  rinkMap: Map<string, Rink>;
  audience: ProgramAudienceFilter;
  onAudienceChange: (audience: ProgramAudienceFilter) => void;
  expandedProgramId: string | null;
  onToggleProgram: (programId: string) => void;
  onClose: () => void;
}

export function ProgramsView({
  programs,
  sourceUrl,
  rinkMap,
  audience,
  onAudienceChange,
  expandedProgramId,
  onToggleProgram,
  onClose,
}: ProgramsViewProps) {
  return (
    <section className="programs-section" aria-label="Arena programs">
      <header className="programs-intro">
        <div className="programs-intro-header">
          <h2 className="programs-heading">Programs</h2>
          <button
            type="button"
            className="programs-close side-drawer-close"
            aria-label="Close programs"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="muted small programs-lede">
          Kids learn-to-skate, leagues, and drop-ins from your selected rinks.
        </p>
        <div className="program-audience-segmented" role="tablist" aria-label="Program audience">
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
              aria-selected={audience === value}
              className={`program-audience-btn${audience === value ? ' active' : ''}`}
              onClick={() => onAudienceChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="programs-body">
        {programs.length === 0 ? (
          <div className="empty programs-empty">
            <p>No programs for your filters.</p>
            <p className="muted">
              {audience === 'kids'
                ? 'No kids programs for your selected rinks — try Public skate or Stick & puck for open ice.'
                : 'Open rinks — turn on a rink that offers programs.'}
            </p>
          </div>
        ) : (
          <ul className="program-list">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                rink={rinkMap.get(program.rink_id)}
                isExpanded={expandedProgramId === program.id}
                onToggle={() => onToggleProgram(program.id)}
              />
            ))}
          </ul>
        )}
        <p className="programs-footer muted small">
          Not affiliated with host facilities.{' '}
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Official program listings
          </a>
        </p>
      </div>
    </section>
  );
}
