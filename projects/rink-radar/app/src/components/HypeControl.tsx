interface HypeControlProps {
  active: boolean;
  onPlay: () => void;
}

export function HypeControl({ active, onPlay }: HypeControlProps) {
  return (
    <div className="hype-control">
      <button
        type="button"
        className={`hype-fab${active ? ' hype-fab--burst' : ''}`}
        aria-label="Play hype sound"
        onClick={(event) => {
          event.stopPropagation();
          onPlay();
        }}
      >
        Hype
      </button>
      <span className={`hype-burst${active ? ' hype-burst--active' : ''}`} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="hype-burst-dot" />
        ))}
      </span>
    </div>
  );
}
