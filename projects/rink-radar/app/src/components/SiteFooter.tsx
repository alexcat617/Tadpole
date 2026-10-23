interface SiteFooterProps {
  updated: { label: string; iso: string } | null;
}

export function SiteFooter({ updated }: SiteFooterProps) {
  return (
    <footer className="site-footer" role="contentinfo">
      {updated ? (
        <time className="site-footer-updated" dateTime={updated.iso}>
          Updated {updated.label}
        </time>
      ) : (
        <span className="site-footer-updated">Schedule data loading…</span>
      )}
      <p className="site-footer-credit">
        Designed and built by{' '}
        <a href="https://www.linkedin.com/in/alexfarrelldesigner" target="_blank" rel="noreferrer">
          Alex Farrell
        </a>
      </p>
    </footer>
  );
}
