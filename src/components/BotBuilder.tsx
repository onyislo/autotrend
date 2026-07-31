import { useState } from 'react';

export default function BotBuilder({ wsToken }: { wsToken?: string | null }) {
  const [loading, setLoading] = useState(true);
  const targetUrl = wsToken
    ? `https://app.deriv.com/bot?token=${wsToken}&app_id=36544`
    : `https://bot.deriv.com?app_id=36544`;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] overflow-hidden bg-white">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-400">Loading Bot Builder…</p>
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
  );
}
