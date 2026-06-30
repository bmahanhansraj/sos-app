import { useState } from 'react';
import { IconClose } from './icons';

function StoreBadge({ kind, compact }) {
  const isApple = kind === 'apple';
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-hairline bg-panel-raised text-ink ${
        compact ? 'px-3 py-2' : 'px-4 py-2.5'
      } cursor-not-allowed opacity-90`}
      title="Coming soon"
    >
      <span className="flex-shrink-0 text-ink">
        {isApple ? (
          <svg viewBox="0 0 24 24" width={compact ? 18 : 22} height={compact ? 18 : 22} fill="currentColor">
            <rect x="6" y="3" width="12" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="12" cy="18" r="0.9" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={compact ? 18 : 22} height={compact ? 18 : 22} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4l11 8-11 8V4z" />
          </svg>
        )}
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] text-muted">{isApple ? 'Download on the' : 'GET IT ON'}</span>
        <span className={`block font-display font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
          {isApple ? 'App Store' : 'Google Play'}
        </span>
      </span>
    </div>
  );
}

export function AppBadgesRow({ compact = false }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StoreBadge kind="apple" compact={compact} />
      <StoreBadge kind="google" compact={compact} />
    </div>
  );
}

export default function FloatingAppBadges() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-40 hidden flex-col gap-2 rounded-2xl border border-hairline bg-panel/95 p-3 pr-7 shadow-lg backdrop-blur sm:flex relative"
      aria-label="App download links (coming soon)"
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-1.5 top-1.5 text-muted hover:text-ink"
      >
        <IconClose width={14} height={14} />
      </button>
      <p className="px-1 text-[10px] uppercase tracking-wide text-muted">Get the app</p>
      <StoreBadge kind="apple" compact />
      <StoreBadge kind="google" compact />
    </div>
  );
}
