export default function Loading() {
  return <div className="site-container page-skeleton" role="status" aria-label="Loading page"><div className="skeleton-line skeleton-label" /><div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-copy" /><div className="skeleton-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton-card" key={i}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div><span className="sr-only">Loading…</span></div>;
}
