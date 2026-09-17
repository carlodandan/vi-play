import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Disclaimer"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-xs border-b"
      style={{
        background: 'rgba(225,29,72,0.08)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(225,29,72,0.18)',
        color: '#fda4af',
      }}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
        <span>
          <strong className="font-semibold tracking-wider text-[11px] mr-1.5" style={{ color: '#fb7185' }}>
            NOTICE:
          </strong>
          VPlay is an experimental media interface for entertainment & educational purposes only. VPlay does not host or store any media files.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded transition-colors cursor-pointer hover:bg-rose-900/40"
        style={{ color: '#fb7185' }}
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
