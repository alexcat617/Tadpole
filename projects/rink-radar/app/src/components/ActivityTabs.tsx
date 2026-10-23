import type { CSSProperties } from 'react';
import { activityLabel } from '../utils';

export type ActivityFilter = 'public_skate' | 'stick_puck';

const ACTIVITY_FILTERS: ActivityFilter[] = ['public_skate', 'stick_puck'];

interface ActivityTabsProps {
  value: ActivityFilter;
  onChange: (activity: ActivityFilter) => void;
}

export function ActivityTabs({ value, onChange }: ActivityTabsProps) {
  return (
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
            '--segment-index': ACTIVITY_FILTERS.indexOf(value),
            '--segment-count': ACTIVITY_FILTERS.length,
          } as CSSProperties
        }
      >
        <span className="activity-segmented-thumb" aria-hidden="true" />
        {ACTIVITY_FILTERS.map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={value === a}
            className={`activity-segmented-btn${value === a ? ' active' : ''}`}
            onClick={() => onChange(a)}
          >
            {activityLabel(a)}
          </button>
        ))}
      </div>
    </div>
  );
}
