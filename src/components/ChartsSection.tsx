import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, ChevronDown, TrendingUp, BarChart2, Activity, X, AlertCircle, RefreshCw } from 'lucide-react';

interface Tick { time: number; price: number; }
interface MarketItem { symbol: string; name: string; subcategory: string; }
type ChartType = 'line' | 'area' | 'candle';

const MARKETS: MarketItem[] = [
  { symbol: '1HZ10V',  name: 'Volatility 10 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ25V',  name: 'Volatility 25 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ50V',  name: 'Volatility 50 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ75V',  name: 'Volatility 75 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', subcategory: 'Continuous Indices' },
  { symbol: 'R_10',    name: 'Volatility 10 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_25',    name: 'Volatility 25 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_50',    name: 'Volatility 50 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_75',    name: 'Volatility 75 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_100',   name: 'Volatility 100 Index',       subcategory: 'Continuous Indices' },
  { symbol: 'JD10',    name: 'Jump 10 Index',   subcategory: 'Jump Indices' },
  { symbol: 'JD25',    name: 'Jump 25 Index',   subcategory: 'Jump Indices' },
  { symbol: 'JD50',    name: 'Jump 50 Index',   subcategory: 'Jump Indices' },
  { symbol: 'JD75',    name: 'Jump 75 Index',   subcategory: 'Jump Indices' },
  { symbol: 'JD100',   name: 'Jump 100 Index',  subcategory: 'Jump Indices' },
  { symbol: 'CRASH500',  name: 'Crash 500 Index',  subcategory: 'Crash/Boom' },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index', subcategory: 'Crash/Boom' },
  { symbol: 'BOOM500',   name: 'Boom 500 Index',   subcategory: 'Crash/Boom' },
  { symbol: 'BOOM1000',  name: 'Boom 1000 Index',  subcategory: 'Crash/Boom' },
  { symbol: 'STPIDX',    name: 'Step Index',        subcategory: 'Step Indices' },
];

const PRIMARY_WS = 'wss://ws.derivws.com/websockets/v3?app_id=36544';
const FALLBACK_WS = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
const MAX_TICKS = 200;

// Log error to Vercel Serverless logger
function logErrorToVercel(context: string, message: string, symbol: string, details?: any) {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context,
      message,
      symbol,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    })
  }).catch(() => {});
}

function SparkIcon() {
  return (
    <div className="w-8 h-5 flex items-end gap-px">
      {[3,5,2,6,4,7,3].map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-emerald-500"
          style={{ height: `${(h/7)*100}%`, opacity: 0.5 + i*0.07 }} />
      ))}
    </div>
  );
}

function ChartCanvas({ ticks, chartType, status, errorMsg, onRetry }: {
  ticks: Tick[]; chartType: ChartType; status: string; errorMsg: string; onRetry: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || ticks.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const PL = 10, PR = 90, PT = 20, PB = 28;
    const prices = ticks.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const sx = (i: number) => PL + (i / (ticks.length - 1)) * (W - PL - PR);
    const sy = (p: number) => PT + (1 - (p - min) / range) * (H - PT - PB);

    // Grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = PT + (i/6)*(H-PT-PB);
      ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
      const p = max - (i/6)*range;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(2), W-PR+6, y+4);
    }

    // Time labels
    ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center';
    [0,1,2,3,4,5,6].forEach(i => {
      const idx = Math.round((i/6)*(ticks.length-1));
      const d = new Date(ticks[idx].time*1000);
      const lbl = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      ctx.fillText(lbl, sx(idx), H-6);
    });

    const isUp = ticks[ticks.length-1].price >= ticks[0].price;
    const col = isUp ? '#1d4ed8' : '#ef4444';

    if (chartType === 'area') {
      const grad = ctx.createLinearGradient(0,PT,0,H-PB);
      grad.addColorStop(0, isUp ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ticks.forEach((t,i) => { const x=sx(i),y=sy(t.price); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.lineTo(sx(ticks.length-1),H-PB); ctx.lineTo(sx(0),H-PB);
      ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
    }

    if (chartType !== 'candle') {
      ctx.beginPath();
      ticks.forEach((t,i) => { const x=sx(i),y=sy(t.price); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
    } else {
      const BC = Math.min(80, Math.floor(ticks.length/2));
      const bs = Math.max(1, Math.floor(ticks.length/BC));
      const bw = Math.max(3,((W-PL-PR)/BC)*0.7);
      for (let b=0; b<BC; b++) {
        const sl = ticks.slice(b*bs, Math.min((b+1)*bs, ticks.length));
        if (!sl.length) continue;
        const o=sl[0].price, c=sl[sl.length-1].price;
        const hi=Math.max(...sl.map(t=>t.price)), lo=Math.min(...sl.map(t=>t.price));
        const mx=sx(Math.floor((b*bs+(b+1)*bs)/2)), bull=c>=o, clr=bull?'#10b981':'#ef4444';
        ctx.strokeStyle=clr; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(mx,sy(hi)); ctx.lineTo(mx,sy(lo)); ctx.stroke();
        ctx.fillStyle=clr;
        const bt=sy(Math.max(o,c)), bh=Math.max(1,Math.abs(sy(o)-sy(c)));
        ctx.fillRect(mx-bw/2,bt,bw,bh);
      }
    }

    // Current price marker
    const lp = ticks[ticks.length-1].price;
    const lx = sx(ticks.length-1), ly = sy(lp);
    ctx.setLineDash([4,4]); ctx.strokeStyle='#374151'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(W-PR,ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2);
    ctx.fillStyle='#1f2937'; ctx.fill();
    const bx=W-PR+2, bw2=PR-4, bh2=20;
    ctx.fillStyle='#1f2937';
    ctx.beginPath(); ctx.roundRect(bx,ly-bh2/2,bw2,bh2,3); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 10px system-ui'; ctx.textAlign='center';
    ctx.fillText(lp.toFixed(2), bx+bw2/2, ly+4);
  }, [ticks, chartType]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white">
      {ticks.length < 2 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {status === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-sm text-center shadow-sm">
              <AlertCircle size={36} className="text-red-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-gray-900 mb-1">Chart Connection Error</h3>
              <p className="text-xs text-gray-600 mb-4">{errorMsg || 'Unable to connect to real-time market data stream.'}</p>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <RefreshCw size={14} /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-2 border-gray-800 border-t-transparent animate-spin" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Retrieving Chart Data…</p>
            </>
          )}
        </div>
      ) : (
        <canvas ref={canvasRef} className="block w-full h-full" />
      )}
    </div>
  );
}

export default function ChartsSection() {
  const [selected, setSelected] = useState<MarketItem>(MARKETS[1]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState(0);
  const [status, setStatus] = useState<'connecting'|'live'|'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [search, setSearch] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connectChart = useCallback((symbolItem: MarketItem, isFallback = false) => {
    setTicks([]); setPrice(null); setChange(0);
    setStatus('connecting'); setErrorMsg('');

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    const endpoint = isFallback ? FALLBACK_WS : PRIMARY_WS;
    const ws = new WebSocket(endpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      ws.send(JSON.stringify({ ticks: symbolItem.symbol, subscribe: 1 }));
    };

    ws.onerror = (evt) => {
      console.error('WS Error:', evt);
      if (!isFallback) {
        // Try fallback websocket if primary fails
        connectChart(symbolItem, true);
        return;
      }
      const msg = 'Unable to establish WebSocket stream to Deriv server.';
      setStatus('error'); setErrorMsg(msg);
      logErrorToVercel('WebSocket_OnError', msg, symbolItem.symbol, { isFallback, endpoint });
    };

    ws.onclose = (e) => {
      if (e.code !== 1000) {
        const msg = `WebSocket closed unexpectedly (code ${e.code})`;
        setStatus('error'); setErrorMsg(msg);
        logErrorToVercel('WebSocket_OnClose', msg, symbolItem.symbol, { code: e.code, reason: e.reason });
      }
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.error) {
          console.error('Deriv WS response error:', msg.error);
          const errText = msg.error.message || 'Symbol not available or subscription rejected.';
          setStatus('error');
          setErrorMsg(errText);
          logErrorToVercel('Deriv_API_Error', errText, symbolItem.symbol, msg.error);
          return;
        }
        if (msg.tick) {
          const p = msg.tick.quote as number;
          const t = msg.tick.epoch as number;
          setPrice(p);
          setTicks(prev => {
            const next = [...prev, { time: t, price: p }].slice(-MAX_TICKS);
            if (next.length >= 2) setChange(((next[next.length-1].price - next[0].price) / next[0].price)*100);
            return next;
          });
        }
      } catch (err: any) {
        logErrorToVercel('Deriv_JSON_Parse_Error', err?.message || 'Parse error', symbolItem.symbol);
      }
    };
  }, []);

  useEffect(() => {
    connectChart(selected);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [selected, retryCount, connectChart]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  const isUp = change >= 0;
  const filtered = MARKETS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.symbol.toLowerCase().includes(search.toLowerCase())
  );
  const grouped: Record<string, MarketItem[]> = {};
  filtered.forEach(m => { if (!grouped[m.subcategory]) grouped[m.subcategory] = []; grouped[m.subcategory].push(m); });

  const chartTools = [
    { type: 'line' as ChartType, Icon: TrendingUp, label: 'Line' },
    { type: 'area' as ChartType, Icon: Activity, label: 'Area' },
    { type: 'candle' as ChartType, Icon: BarChart2, label: 'Candle' },
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>

      {/* ── Instrument Header ── */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 shadow-sm transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <SparkIcon />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate max-w-[140px] sm:max-w-none">{selected.name}</p>
            <p className="text-xs text-gray-400">{selected.symbol}</p>
          </div>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-gray-900 font-mono">
            {price !== null ? price.toFixed(2) : '—'}
          </p>
          <div>
            <span className={`text-sm font-bold block ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(3)}%
            </span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status==='live' ? 'bg-emerald-500 animate-pulse' :
                status==='error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'
              }`} />
              <span className="text-xs text-gray-400">
                {status==='live' ? 'Live' : status==='error' ? 'Error' : 'Connecting…'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Market Panel — overlay on mobile, sidebar on desktop */}
        {panelOpen && (
          <>
            {/* Mobile backdrop */}
            <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setPanelOpen(false)} />

            <div className="absolute md:relative z-30 md:z-auto top-0 left-0 h-full
              w-[85vw] max-w-xs md:w-72
              bg-white border-r border-gray-200 flex flex-col shadow-xl md:shadow-none">

              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">Markets</span>
                <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search markets…"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Favorites */}
              {favs.size > 0 && (
                <div className="px-3 pt-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Star size={10} className="fill-yellow-400 text-yellow-400" /> Favorites
                  </p>
                  {MARKETS.filter(m => favs.has(m.symbol)).map(m => (
                    <MRow key={m.symbol} m={m} active={selected.symbol===m.symbol} fav={true}
                      onSelect={() => { setSelected(m); setPanelOpen(false); }}
                      onFav={() => setFavs(p => { const n=new Set(p); n.has(m.symbol)?n.delete(m.symbol):n.add(m.symbol); return n; })} />
                  ))}
                </div>
              )}

              {/* Market list */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <p className="px-2 py-1 text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-800 text-white flex items-center justify-center text-[8px] font-black">D</span>
                  Derived
                </p>
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-1">
                    <p className="text-[10px] text-gray-400 font-bold px-2 py-1 uppercase tracking-wider">{cat}</p>
                    {items.map(m => (
                      <MRow key={m.symbol} m={m} active={selected.symbol===m.symbol} fav={favs.has(m.symbol)}
                        onSelect={() => { setSelected(m); setPanelOpen(false); }}
                        onFav={() => setFavs(p => { const n=new Set(p); n.has(m.symbol)?n.delete(m.symbol):n.add(m.symbol); return n; })} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Chart ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chart type toolbar */}
          <div className="flex flex-col items-center gap-1 py-2 px-1 border-r border-gray-100 bg-white shrink-0">
            {chartTools.map(({ type, Icon, label }) => (
              <button
                key={type}
                title={label}
                onClick={() => setChartType(type)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  chartType===type ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
            <div className="w-px h-3 bg-gray-200 my-0.5" />
            <button className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-50 flex items-center justify-center text-base">+</button>
            <button className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-50 flex items-center justify-center text-base">−</button>
          </div>

          {/* Canvas */}
          <div className="flex-1 min-w-0 h-full">
            <ChartCanvas ticks={ticks} chartType={chartType} status={status} errorMsg={errorMsg} onRetry={handleRetry} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MRow({ m, active, fav, onSelect, onFav }: {
  m: MarketItem; active: boolean; fav: boolean; onSelect: () => void; onFav: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors group ${
        active ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="w-7 h-4 shrink-0"><SparkIcon /></div>
      <span className={`flex-1 text-xs truncate ${active ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{m.name}</span>
      <button
        onClick={e => { e.stopPropagation(); onFav(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star size={12} className={fav ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
      </button>
    </div>
  );
}
