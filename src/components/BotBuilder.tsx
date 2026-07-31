import { useState } from 'react';
import { Bot, ExternalLink, RefreshCw } from 'lucide-react';

export default function BotBuilder({ wsToken }: { wsToken?: string | null; wsUrl?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const appId = '36544';
  const targetUrl = wsToken
    ? `https://app.deriv.com/bot?token=${wsToken}&app_id=${appId}`
    : `https://bot.deriv.com?app_id=${appId}`;

  return (
    <div className="flex flex-col w-full bg-white relative" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* Top action header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Bot Builder</h2>
            <p className="text-[11px] text-gray-400 leading-tight">Visual Automated Trading Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); setIframeKey(k => k + 1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            title="Reload Bot Builder"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-emerald-600' : ''} />
            <span>Reload</span>
          </button>
          
          <a
            href="https://bot.deriv.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <span>Open Standalone</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-50">
        {/* Loading Spinner Screen */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3 transition-opacity duration-300">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs font-semibold text-gray-500 tracking-wide">Loading Bot Builder…</p>
          </div>
        )}

        {/* Embedded Deriv Bot Builder iframe */}
        <iframe
          key={iframeKey}
          src={targetUrl}
          title="Deriv Bot Builder"
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write; camera; geolocation; microphone"
        />
      </div>
    </div>
  );
}
