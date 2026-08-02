import { useState, useEffect } from 'react';

interface Props {
  wsToken?: string | null;
  wsUrl?: string | null;
}

export default function BotBuilder({ wsToken }: Props) {
  const [loading, setLoading] = useState(true);

  const appId = import.meta.env.VITE_DERIV_APP_ID || '36544';

  // Always embed the modern bot.deriv.com platform as requested by the user
  const targetUrl = wsToken
    ? `https://bot.deriv.com?token=${wsToken}&app_id=${appId}`
    : `https://bot.deriv.com?app_id=${appId}`;

  // Force loading spinner to clear after a timeout to prevent infinite loading in any browser edge case
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-white overflow-hidden">
      <div className="relative w-full flex-1 overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400 font-sans">Loading Bot Builder…</p>
          </div>
        )}
        <iframe
          src={targetUrl}
          title="Bot Builder"
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write; camera; geolocation"
        />
      </div>
    </div>
  );
}
