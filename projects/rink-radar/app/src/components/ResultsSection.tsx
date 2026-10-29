import type { Rink, Session } from '../types';
import { formatResultsDayHeader } from '../utils';
import { SessionCard } from './SessionCard';

export interface ResultDayBlock {
  day: string;
  rows: { session: Session; rink: Rink }[];
}

interface ResultsSectionProps {
  isSearching: boolean;
  hasSearched: boolean;
  totalResultCount: number;
  dayBlocks: ResultDayBlock[];
  showDayHeaders: boolean;
  today: string;
  shareNotice: string | null;
  expandedSessionId: string | null;
  onToggleSession: (sessionId: string) => void;
  onShareSession: (session: Session, rink: Rink) => void;
}

export function ResultsSection({
  isSearching,
  hasSearched,
  totalResultCount,
  dayBlocks,
  showDayHeaders,
  today,
  shareNotice,
  expandedSessionId,
  onToggleSession,
  onShareSession,
}: ResultsSectionProps) {
  return (
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
      ) : totalResultCount === 0 ? (
        <div className="empty results-empty">
          <p>No sessions for this day and filter.</p>
          <p>Try another date, activity, or rinks.</p>
        </div>
      ) : (
        dayBlocks.map((block) => {
          if (block.rows.length === 0) return null;
          const dayHeader = formatResultsDayHeader(block.day, today);
          const isTodayBlock = dayHeader.relative === 'Today';
          return (
            <div
              key={block.day}
              className={
                isTodayBlock ? 'results-day-block results-day-block--today' : 'results-day-block'
              }
            >
              {showDayHeaders && (
                <header
                  className={
                    isTodayBlock ? 'results-day-header results-day-header--today' : 'results-day-header'
                  }
                >
                  <p className="results-day-kicker">{dayHeader.relative ?? 'Selected day'}</p>
                  <h2 className="results-day-title">{dayHeader.title}</h2>
                </header>
              )}
              <ul className="session-list">
                {block.rows.map(({ session, rink }) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    rink={rink}
                    isExpanded={expandedSessionId === session.id}
                    onToggle={() => onToggleSession(session.id)}
                    onShare={() => onShareSession(session, rink)}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
