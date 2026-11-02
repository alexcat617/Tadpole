import type { Rink, Session } from '../types';
import {
  activityLabel,
  formatTimeRange,
  rinkMapsSearchUrl,
  rinkPostalLine,
  sessionCardFooterNote,
  sessionCardPriceLine,
  sessionScanBadge,
} from '../utils';
import { ExternalLinkIcon, MapPinIcon, ShareIcon } from './icons';

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
  const priceText = session.price?.summary
    ? sessionCardPriceLine(rink.id, session.price.summary)
    : '';
  const footerNote = sessionCardFooterNote(rink.id);

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
          <p>{rinkPostalLine(rink)}</p>
          {rink.phone && (
            <p>
              <a href={`tel:${rink.phone.replace(/[^\d+]/g, '')}`}>{rink.phone}</a>
            </p>
          )}
          <p>
            <a
              className="session-detail-link"
              href={rinkMapsSearchUrl(rink)}
              target="_blank"
              rel="noreferrer"
            >
              <MapPinIcon className="session-action-icon" />
              Open in maps
            </a>
          </p>
          <p>
            <a
              className="session-detail-link"
              href={session.source_url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLinkIcon className="session-action-icon" />
              View Schedule
            </a>
          </p>
          <p className="session-share-row">
            <button type="button" className="session-share-btn" onClick={onShare}>
              <ShareIcon className="session-action-icon" />
              Share with friend
            </button>
          </p>
          <p className="session-details-footer muted small">{footerNote}</p>
        </div>
      )}
    </li>
  );
}
