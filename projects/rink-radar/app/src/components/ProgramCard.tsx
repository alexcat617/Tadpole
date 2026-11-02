import type { ProgramsFile, Rink } from '../types';
import { programKindLabel, programTeaser } from '../utils';

export type Program = ProgramsFile['programs'][number];

interface ProgramCardProps {
  program: Program;
  rink: Rink | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ProgramCard({ program, rink, isExpanded, onToggle }: ProgramCardProps) {
  const detailsId = `program-details-${program.id}`;
  return (
    <li className={isExpanded ? 'program-item expanded' : 'program-item'}>
      <button
        type="button"
        className="program-card-toggle"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <span className="program-card-title">{program.title}</span>
        {rink ? <span className="program-card-rink muted small">{rink.name}</span> : null}
        <span className="program-meta">
          <span className={`program-kind-badge program-kind-badge--${program.kind}`}>
            {programKindLabel(program.kind)}
          </span>
          <span className="program-teaser muted small">{programTeaser(program)}</span>
        </span>
        <span className="program-chevron" aria-hidden="true" />
      </button>
      {isExpanded ? (
        <div className="program-details" id={detailsId}>
          {program.description.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <ul className="program-offerings">
            {program.offerings.map((offering) => (
              <li key={`${program.id}-${offering.label}`} className="program-offering">
                <h3 className="program-offering-label">{offering.label}</h3>
                <p>
                  <strong>When:</strong> {offering.schedule_text}
                </p>
                {offering.exceptions && offering.exceptions.length > 0 ? (
                  <p className="muted small">
                    <strong>Off:</strong> {offering.exceptions.join('; ')}
                  </p>
                ) : null}
                <p>
                  <strong>Times:</strong> {offering.times_text}
                </p>
                <p>
                  <strong>Cost:</strong> {offering.cost_text}
                </p>
                <p>
                  <strong>Registration:</strong> {offering.registration_text}
                </p>
              </li>
            ))}
          </ul>
          {program.links && program.links.length > 0 ? (
            <ul className="program-links">
              {program.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {rink?.phone ? (
            <p>
              <a href={`tel:${rink.phone.replace(/[^\d+]/g, '')}`}>{rink.phone}</a>
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
