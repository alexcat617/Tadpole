import type { Rink, Session } from '../types';
import {
  activityLabel,
  formatTimeRange,
  priceSummaryForCard,
  rinkMapsSearchUrl,
  rinkPostalLine,
  sessionScanBadge,
} from '../utils';
import { ShareIcon } from './icons';

interface SessionCardProps {
  session: Session;
  rink: Rink;
  isExpanded: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export function SessionCard({ session, rink, isExpanded, onToggle, onShare }: SessionCardProps) {
  const detailsId = `session-details-${session.id}`;
  const scanBadge = sessionScanBadge(session.subtype);
  const priceText = session.price?.summary ? priceSummaryForCard(session.price.summary) : '';

  return (
    <li className={isExpanded ? 'session-item expanded' : 'session-item'}>
      <button
        type="button"
        className="session-card-toggle"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={onToggle}
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
          {rink.id === 'dover-arena' &&
            session.activity === 'stick_puck' &&
            session.stick_fee_legend && <p className="muted small">{session.stick_fee_legend}</p>}
          <p>{rinkPostalLine(rink)}</p>
          {rink.phone && (
            <p>
              <a href={`tel:${rink.phone.replace(/[^\d+]/g, '')}`}>{rink.phone}</a>
            </p>
          )}
          <p>
            <a href={rinkMapsSearchUrl(rink)} target="_blank" rel="noreferrer">
              Open in maps
            </a>
          </p>
          <p className="session-details-trust muted small">
            Schedules change — confirm with the rink before you go.
          </p>
          <p>
            <a href={session.source_url} target="_blank" rel="noreferrer">
              Official schedule source
            </a>
          </p>
          <p className="session-share-row">
            <button type="button" className="session-share-btn" onClick={onShare}>
              <ShareIcon className="session-share-icon" />
              Share with friend
            </button>
          </p>
        </div>
      )}
    </li>
  );
}
