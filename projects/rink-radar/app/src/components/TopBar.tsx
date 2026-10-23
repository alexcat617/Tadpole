interface TopBarProps {
  showProgramsNav: boolean;
  programsCurrent: boolean;
  onOpenPrograms: () => void;
  showRinksButton: boolean;
  rinksOpen: boolean;
  selectedRinkCount: number;
  onToggleRinks: () => void;
}

export function TopBar({
  showProgramsNav,
  programsCurrent,
  onOpenPrograms,
  showRinksButton,
  rinksOpen,
  selectedRinkCount,
  onToggleRinks,
}: TopBarProps) {
  return (
    <header className="top-bar" role="banner">
      <div className="top-bar-inner">
        <div className="header-titles">
          <h1 className="header-region">Seacoast ice</h1>
        </div>
        <div className="header-actions">
          {showProgramsNav ? (
            <button
              type="button"
              className={`header-rinks-btn${programsCurrent ? ' header-rinks-btn--current' : ''}`}
              aria-current={programsCurrent ? 'page' : undefined}
              onClick={() => {
                if (!programsCurrent) onOpenPrograms();
              }}
            >
              Programs
            </button>
          ) : null}
          {showRinksButton ? (
            <button
              type="button"
              className="header-rinks-btn"
              aria-expanded={rinksOpen}
              aria-controls="rinks-in-search-panel"
              aria-label={`Rinks, ${selectedRinkCount} selected`}
              onClick={onToggleRinks}
            >
              Rinks
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
