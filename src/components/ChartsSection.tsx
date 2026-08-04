/**
 * ChartsSection.tsx — AutoTrendX Live Chart
 *
 * Embeds the official Deriv SmartCharts via iframe — the same chart engine
 * used inside bot.deriv.com and by virtually every Deriv third-party platform.
 * Silently passes user auth token when available so no login dialog pops up inside iframe.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  wsToken?: string | null;
  wsUrl?: string | null;
}

// ─── Market list ──────────────────────────────────────────────────────────────
const MARKETS = [
  // Continuous / 1s
  { symbol: '1HZ10V',    name: 'Volatility 10 (1s) Index',  group: 'Continuous Indices' },
  { symbol: '1HZ25V',    name: 'Volatility 25 (1s) Index',  group: 'Continuous Indices' },
  { symbol: '1HZ50V',    name: 'Volatility 50 (1s) Index',  group: 'Continuous Indices' },
  { symbol: '1HZ75V',    name: 'Volatility 75 (1s) Index',  group: 'Continuous Indices' },
  { symbol: '1HZ100V',   name: 'Volatility 100 (1s) Index', group: 'Continuous Indices' },
  // Standard Volatility
  { symbol: 'R_10',      name: 'Volatility 10 Index',        group: 'Continuous Indices' },
  { symbol: 'R_25',      name: 'Volatility 25 Index',        group: 'Continuous Indices' },
  { symbol: 'R_50',      name: 'Volatility 50 Index',        group: 'Continuous Indices' },
  { symbol: 'R_75',      name: 'Volatility 75 Index',        group: 'Continuous Indices' },
  { symbol: 'R_100',     name: 'Volatility 100 Index',       group: 'Continuous Indices' },
  // Crash / Boom
  { symbol: 'CRASH300N', name: 'Crash 300 Index',            group: 'Crash / Boom' },
  { symbol: 'CRASH500',  name: 'Crash 500 Index',            group: 'Crash / Boom' },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index',           group: 'Crash / Boom' },
  { symbol: 'BOOM300N',  name: 'Boom 300 Index',             group: 'Crash / Boom' },
  { symbol: 'BOOM500',   name: 'Boom 500 Index',             group: 'Crash / Boom' },
  { symbol: 'BOOM1000',  name: 'Boom 1000 Index',            group: 'Crash / Boom' },
  // Step
  { symbol: 'STPIDX',   name: 'Step Index',                  group: 'Step Indices' },
  // Jump
  { symbol: 'JD10',     name: 'Jump 10 Index',               group: 'Jump Indices' },
  { symbol: 'JD25',     name: 'Jump 25 Index',               group: 'Jump Indices' },
  { symbol: 'JD50',     name: 'Jump 50 Index',               group: 'Jump Indices' },
  { symbol: 'JD75',     name: 'Jump 75 Index',               group: 'Jump Indices' },
  { symbol: 'JD100',    name: 'Jump 100 Index',              group: 'Jump Indices' },
];

const DEFAULT_SYMBOL = MARKETS[4]; // Volatility 100 (1s) Index

// ─── Build the SmartCharts iframe URL ─────────────────────────────────────────
function buildChartUrl(symbol: string, wsToken?: string | null): string {
  const appId = import.meta.env.VITE_DERIV_APP_ID || '36544';
  const params = new URLSearchParams({
    symbol,
    granularity: '0',       // tick chart
    chart_type: 'line',
    app_id: appId,
  });

  if (wsToken) {
    params.set('token', wsToken);
  }

  return `https://smartcharts.deriv.com?${params.toString()}`;
}

// ─── Grouped dropdown ─────────────────────────────────────────────────────────
function MarketDropdown({
  selected,
  onChange,
}: {
  selected: typeof MARKETS[0];
  onChange: (m: typeof MARKETS[0]) => void;
}) {
  const [open, setOpen] = useState(false);

  const grouped = MARKETS.reduce<Record<string, typeof MARKETS>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="truncate max-w-[180px]">{selected.name}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{
              width: '260px',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p
                  className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#4b5563' }}
                >
                  {group}
                </p>
                {items.map(m => (
                  <button
                    key={m.symbol}
                    onClick={() => { onChange(m); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: m.symbol === selected.symbol ? '#00d97e' : '#d1d5db',
                      background: m.symbol === selected.symbol ? 'rgba(0,217,126,0.08)' : 'transparent',
                      fontWeight: m.symbol === selected.symbol ? 700 : 400,
                    }}
                    onMouseEnter={e => {
                      if (m.symbol !== selected.symbol)
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      if (m.symbol !== selected.symbol)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ChartsSection({ wsToken }: Props) {
  const [selected, setSelected] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(true);

  const chartUrl = buildChartUrl(selected.symbol, wsToken);

  // When symbol changes reset the loading indicator
  const handleSymbolChange = (m: typeof MARKETS[0]) => {
    setSelected(m);
    setLoading(true);
  };

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#0b0f1a' }}>

      {/* ── Top bar — symbol selector ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2 mr-1">
          <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="9" fill="url(#cs-g)" />
            <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
            <defs>
              <linearGradient id="cs-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#10b981" /><stop offset="1" stopColor="#059669" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-xs font-bold text-white hidden sm:block">Live Chart</span>
        </div>

        {/* Symbol picker */}
        <MarketDropdown selected={selected} onChange={handleSymbolChange} />

        {/* Symbol badge */}
        <span
          className="text-xs font-bold px-2 py-1 rounded hidden sm:block"
          style={{ background: 'rgba(0,217,126,0.1)', color: '#00d97e', border: '1px solid rgba(0,217,126,0.2)' }}
        >
          {selected.symbol}
        </span>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Live · {wsToken ? 'Authenticated' : 'Guest'}
          </span>
        </div>
      </div>

      {/* ── SmartCharts iframe ─────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background: '#0b0f1a' }}
          >
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{ border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#00d97e' }}
            />
            <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
              Loading {selected.name}…
            </p>
          </div>
        )}

        <iframe
          key={selected.symbol}          /* force full remount on symbol change */
          src={chartUrl}
          title={`${selected.name} — AutoTrendX Live Chart`}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
