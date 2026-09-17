import { useState } from 'react';
import { X, Server, Key, Film, CheckCircle2, XCircle, Loader2, Save, ExternalLink } from 'lucide-react';
import type { AppSettings, ProviderHealth } from '../types/media.ts';
import { checkApiHealth, DEFAULT_SETTINGS, getAppSettings, saveAppSettings } from '../services/vylaApi.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    reachable: boolean;
    statusText: string;
    latencyMs?: number;
    providers?: ProviderHealth[];
  }>({ tested: false, reachable: false, statusText: '' });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ tested: false, reachable: false, statusText: '' });
    // Temporarily save current form values so health check uses them
    saveAppSettings(settings);

    const res = await checkApiHealth();
    setIsTesting(false);
    setTestResult({
      tested: true,
      reachable: res.reachable,
      statusText: res.statusText,
      latencyMs: res.latencyMs,
      providers: res.providers,
    });
  };

  const handleSave = () => {
    saveAppSettings(settings);
    setSavedSuccess(true);
    onSettingsSaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveAppSettings(DEFAULT_SETTINGS);
    setTestResult({ tested: false, reachable: false, statusText: '' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">API & Worker Configuration</h2>
              <p className="text-xs text-zinc-400">Connect to your Vyla API instance or Cloudflare Worker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloudflare Worker Note */}
        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 space-y-1.5">
          <p className="font-semibold text-purple-300">Self-Hosting via Cloudflare Worker:</p>
          <p className="text-zinc-300 leading-relaxed">
            When VPlay is hosted on Cloudflare Pages (HTTPS), point this gateway to your deployed Cloudflare Worker URL or reverse proxy to avoid mixed-content and CORS errors.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* API Gateway URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>API Gateway / Cloudflare Worker URL</span>
              <span className="text-[11px] text-zinc-500 font-normal">Required</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={settings.apiBaseUrl}
                onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
                placeholder="http://localhost:7860 or https://vplay-worker.workers.dev"
                className="w-full bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Default is <code className="text-zinc-400">http://localhost:7860</code> for local testing.
            </p>
          </div>

          {/* Vyla Master API Key (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                Vyla Master API Key (Optional)
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">Standard / Partner tier</span>
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="Leave blank if configured as Cloudflare Worker secret"
              className="w-full bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-[11px] text-zinc-500">
              If your Cloudflare Worker already has <code className="text-zinc-400">VYLA_API_KEY</code> set in secrets, leave this empty.
            </p>
          </div>

          {/* Optional TMDB API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-zinc-400" />
                TMDB API Key (Optional)
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">Catalog live search</span>
            </label>
            <input
              type="password"
              value={settings.tmdbApiKey}
              onChange={(e) => setSettings({ ...settings, tmdbApiKey: e.target.value })}
              placeholder="Enables searching all movies, TV shows, and anime on TMDB"
              className="w-full bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-600 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Test Connection Result */}
        {testResult.tested && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              testResult.reachable
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {testResult.reachable ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {testResult.reachable ? 'Connection Verified' : 'Connection Failed'} ({testResult.latencyMs}ms)
              </p>
              <p className="text-zinc-400">{testResult.statusText}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            {isTesting ? 'Testing…' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savedSuccess ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Link to Worker docs */}
        <div className="pt-2 text-center">
          <a
            href="https://vyla.mintlify.app/self-hosting"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 hover:underline"
          >
            Vyla API Self-Hosting Documentation
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
