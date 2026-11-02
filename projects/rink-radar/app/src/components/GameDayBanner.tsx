import type { buildCompanionGameDayBanner } from '../utils';

export type GameDayBannerData = NonNullable<ReturnType<typeof buildCompanionGameDayBanner>>;

export function GameDayBanner({ banner }: { banner: GameDayBannerData }) {
  return (
    <div className="companion-game-banner-wrap" role="region" aria-label="Games today and tomorrow">
      {banner.chips.map((chip, index) => (
        <div
          key={`${chip.team}-${chip.text}-${index}`}
          className="companion-game-banner"
          role="status"
          aria-label={`${chip.dayLabel}, ${chip.text}`}
        >
          <span className="companion-game-banner-day">{chip.dayLabel}</span>
          <span className="companion-game-banner-chip">{chip.text}</span>
        </div>
      ))}
    </div>
  );
}
