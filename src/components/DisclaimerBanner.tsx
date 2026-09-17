import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Disclaimer"
      className="bg-purple-950/70 border-b border-purple-800/40 text-purple-200 text-xs px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto text-center md:text-left">
        <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 hidden sm:inline" />
        <span>
          <strong className="text-purple-300 font-semibold uppercase tracking-wider text-[11px] mr-1.5">
            Notice:
          </strong>
          VPlay is an experimental media interface intended for entertainment and educational purposes only. VPlay does not host, upload, or store any media files.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-purple-400 hover:text-white transition-colors p-1 rounded hover:bg-purple-900/50"
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
