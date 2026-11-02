import {
  bruinsMatchupLabel,
  formatBruinsGameDateTime,
  formatBruinsTvLine,
  type groupBruinsGamesByMonth,
  isBruinsGamePast,
} from '../utils';

export type CompanionMonthGroup = ReturnType<typeof groupBruinsGamesByMonth>[number];

export function CompanionMonthGroups({ groups }: { groups: CompanionMonthGroup[] }) {
  return groups.map((group) => (
    <section key={group.monthKey} className="bruins-schedule-month">
      <h3 className="bruins-schedule-month-title">{group.monthLabel}</h3>
      <ul className="bruins-schedule-list">
        {group.games.map((game) => {
          const past = isBruinsGamePast(game);
          return (
            <li
              key={game.id}
              className={`bruins-schedule-item${past ? ' bruins-schedule-item--past' : ''}`}
            >
              <p className="bruins-schedule-item-primary">
                <span className="bruins-schedule-datetime">
                  {formatBruinsGameDateTime(game.starts_at)}
                </span>
                <span className="bruins-schedule-matchup">{bruinsMatchupLabel(game)}</span>
              </p>
              <p className="bruins-schedule-item-meta">
                <span className={`bruins-home-away${game.is_home ? ' bruins-home-away--home' : ''}`}>
                  {game.is_home ? 'Home' : 'Away'}
                </span>
                <span className="bruins-schedule-venue">{game.venue}</span>
              </p>
              {game.tv_networks.length > 0 ? (
                <p className="bruins-schedule-tv muted small">{formatBruinsTvLine(game.tv_networks)}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  ));
}
