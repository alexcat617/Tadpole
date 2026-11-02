import { formatSearchDateChoice } from '../utils';
import { ActivityTabs, type ActivityFilter } from './ActivityTabs';
import { CalendarIcon } from './icons';

interface SearchControlsProps {
  activity: ActivityFilter;
  onActivityChange: (activity: ActivityFilter) => void;
  showReset: boolean;
  onReset: () => void;
  onFindIce: () => void;
  isSearching: boolean;
  noRinksSelected: boolean;
  dateSearchOpen: boolean;
  onOpenDateSearch: () => void;
  date: string;
  dateMin?: string;
  dateMax?: string;
  onDateChange: (date: string) => void;
  onSearch: () => void;
  searchError: string | null;
}

export function SearchControls({
  activity,
  onActivityChange,
  showReset,
  onReset,
  onFindIce,
  isSearching,
  noRinksSelected,
  dateSearchOpen,
  onOpenDateSearch,
  date,
  dateMin,
  dateMax,
  onDateChange,
  onSearch,
  searchError,
}: SearchControlsProps) {
  return (
    <section className="controls" aria-label="Find sessions">
      <ActivityTabs value={activity} onChange={onActivityChange} />

      {showReset ? (
        <div className="controls-group controls-group--reset">
          <button
            type="button"
            className="clear-sessions clear-sessions--primary-slot"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      ) : (
        <>
          <div className="controls-group controls-group--find-next">
            <button
              type="button"
              className="find-next-session"
              onClick={onFindIce}
              disabled={isSearching || noRinksSelected}
            >
              Find Ice
            </button>
          </div>

          <div className="controls-group controls-group--search">
            {!dateSearchOpen ? (
              <button type="button" className="search-by-date-cta" onClick={onOpenDateSearch}>
                <CalendarIcon className="search-by-date-icon" />
                Search by date
              </button>
            ) : (
              <div className="search-row">
                <div className="search-date">
                  <label className="controls-label" htmlFor="search-date-input">
                    Date
                  </label>
                  <span className="search-date-input-wrap">
                    <span
                      className={`search-date-facade${date ? '' : ' search-date-facade--empty'}`}
                      aria-hidden="true"
                    >
                      {date ? formatSearchDateChoice(date) : 'Pick a date'}
                    </span>
                    <input
                      id="search-date-input"
                      type="date"
                      className="search-date-input-native"
                      value={date}
                      min={dateMin}
                      max={dateMax}
                      onChange={(e) => onDateChange(e.target.value)}
                      aria-describedby={!date ? 'search-date-helper' : undefined}
                    />
                  </span>
                  {!date ? (
                    <span id="search-date-helper" className="search-date-helper">
                      Pick a date to search.
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="search-cta"
                  onClick={onSearch}
                  disabled={isSearching || !date || noRinksSelected}
                  aria-busy={isSearching}
                >
                  {isSearching ? 'Searching…' : 'Search'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {noRinksSelected && <p className="error search-error">Turn on at least one rink.</p>}
      {searchError && <p className="error search-error">{searchError}</p>}
    </section>
  );
}
