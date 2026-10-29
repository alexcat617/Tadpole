import type { Rink } from '../types';

interface RinksDrawerProps {
  rinks: { rink: Rink; distance_km: number }[];
  selectedRinkIds: Set<string>;
  onToggleRink: (rinkId: string) => void;
  onClose: () => void;
}

export function RinksDrawer({ rinks, selectedRinkIds, onToggleRink, onClose }: RinksDrawerProps) {
  return (
    <div className="rinks-drawer-root">
      <button
        type="button"
        className="rinks-drawer-backdrop"
        aria-label="Close rinks list"
        onClick={onClose}
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
          <button type="button" className="rinks-drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="rinks-drawer-body">
          <ul className="rinks-in-search-list">
            {rinks.map(({ rink }) => {
              const included = selectedRinkIds.has(rink.id);
              const facilityNote =
                rink.operations?.status === 'closed_for_season'
                  ? (rink.operations.label ?? 'Closed for the season')
                  : null;
              return (
                <li key={rink.id} className="rinks-in-search-item">
                  <label className="rinks-in-search-toggle">
                    <input type="checkbox" checked={included} onChange={() => onToggleRink(rink.id)} />
                    <span className="rinks-in-search-name">{rink.name}</span>
                  </label>
                  <span className="rinks-in-search-city">{rink.city}</span>
                  {facilityNote ? (
                    <span className="rink-health-badge rink-health-badge--neutral">{facilityNote}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
