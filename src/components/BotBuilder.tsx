import { useState, useEffect, useRef } from 'react';
import { getUserData } from '../lib/finalAuth';
import { Zap, ShieldCheck } from 'lucide-react';

interface Props {
  wsToken?: string | null;
  wsUrl?: string | null;
}

export default function BotBuilder({ wsToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadedBotName, setLoadedBotName] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const appId = import.meta.env.VITE_DERIV_APP_ID || '36544';

  // Get token from prop or local storage fallback
  const storedAuth = getUserData();
  const effectiveToken = wsToken || storedAuth?.access_token || null;

  // Build target URL — token parameters automatically log the iframe into Deriv session
  const targetUrl = effectiveToken
    ? `https://app.deriv.com/bot?token=${effectiveToken}&token1=${effectiveToken}&app_id=${appId}`
    : `https://bot.deriv.com?app_id=${appId}`;

  useEffect(() => {
    // Check if a bot was recently loaded from Free Bots panel
    const botName = localStorage.getItem('autotrendx_loaded_bot_name');
    if (botName) {
      setLoadedBotName(botName);
    }

    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
    // Send postMessage to Deriv Bot iframe if a bot strategy XML was loaded
    const loadedXml = localStorage.getItem('autotrendx_loaded_xml');
    const loadedName = localStorage.getItem('autotrendx_loaded_bot_name');
    if (loadedXml && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'LOAD_WORKSPACE',
            xml: loadedXml,
            name: loadedName,
          },
          '*'
        );
      } catch {}
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-900 overflow-hidden">
      {/* Loaded Bot Banner Notification */}
      {loadedBotName && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={14} className="animate-pulse" />
            <span>Active Strategy: <strong>{loadedBotName}</strong> ready in Bot Builder</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('autotrendx_loaded_bot_name');
              setLoadedBotName(null);
            }}
            className="text-emerald-100 hover:text-white underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Auth Status Bar */}
      <div className="bg-gray-950 border-b border-gray-800 px-4 py-1.5 flex items-center justify-between text-xs text-gray-400 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className={effectiveToken ? 'text-emerald-400' : 'text-gray-500'} />
          <span>
            Deriv Bot Session:{' '}
            <strong className={effectiveToken ? 'text-emerald-400' : 'text-yellow-400'}>
              {effectiveToken ? 'Authenticated (Auto-Sync Active)' : 'Guest Mode'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Official Deriv Bot Engine</span>
        </div>
      </div>

      {/* Main Iframe */}
      <div className="relative w-full flex-1 overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 gap-3 text-white">
            <div className="w-10 h-10 border-4 border-gray-800 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400 font-sans">
              Loading Deriv Bot Builder & Syncing Account…
            </p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={targetUrl}
          title="Deriv Bot Builder"
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          allow="clipboard-write; camera; geolocation; autoplay"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      </div>
    </div>
  );
}
