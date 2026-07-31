import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, ChevronDown, TrendingUp, BarChart2, Activity } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Tick {
  time: number;
  price: number;
}

interface MarketItem {
  symbol: string;
  name: string;
  category: string;
  subcategory: string;
}

type ChartType = 'line' | 'area' | 'candle';

// ── Market Data ────────────────────────────────────────────────────────────────
const MARKETS: MarketItem[] = [
  // Continuous Indices
  { symbol: '1HZ10V',  name: 'Volatility 10 (1s) Index',  category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: '1HZ25V',  name: 'Volatility 25 (1s) Index',  category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: '1HZ50V',  name: 'Volatility 50 (1s) Index',  category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: '1HZ75V',  name: 'Volatility 75 (1s) Index',  category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: 'R_10',    name: 'Volatility 10 Index',        category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: 'R_25',    name: 'Volatility 25 Index',        category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: 'R_50',    name: 'Volatility 50 Index',        category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: 'R_75',    name: 'Volatility 75 Index',        category: 'Derived', subcategory: 'Continuous Indices' },
  { symbol: 'R_100',   name: 'Volatility 100 Index',       category: 'Derived', subcategory: 'Continuous Indices' },
  // Jump Indices
  { symbol: 'JD10',    name: 'Jump 10 Index',   category: 'Derived', subcategory: 'Jump Indices' },
  { symbol: 'JD25',    name: 'Jump 25 Index',   category: 'Derived', subcategory: 'Jump Indices' },
  { symbol: 'JD50',    name: 'Jump 50 Index',   category: 'Derived', subcategory: 'Jump Indices' },
  { symbol: 'JD75',    name: 'Jump 75 Index',   category: 'Derived', subcategory: 'Jump Indices' },
  { symbol: 'JD100',   name: 'Jump 100 Index',  category: 'Derived', subcategory: 'Jump Indices' },
  // Crash & Boom
  { symbol: 'CRASH300N',  name: 'Crash 300 Index',   category: 'Derived', subcategory: 'Crash/Boom' },
  { symbol: 'CRASH500',   name: 'Crash 500 Index',   category: 'Derived', subcategory: 'Crash/Boom' },
  { symbol: 'CRASH1000',  name: 'Crash 1000 Index',  category: 'Derived', subcategory: 'Crash/Boom' },
  { symbol: 'BOOM300N',   name: 'Boom 300 Index',    category: 'Derived', subcategory: 'Crash/Boom' },
  { symbol: 'BOOM500',    name: 'Boom 500 Index',    category: 'Derived', subcategory: 'Crash/Boom' },
  { symbol: 'BOOM1000',   name: 'Boom 1000 Index',   category: 'Derived', subcategory: 'Crash/Boom' },
  // Step Index
  { symbol: 'STPIDX',    name: 'Step Index',         category: 'Derived', subcategory: 'Step Indices' },
];

const WS_ENDPOINT = 'wss://ws.derivws.com/websockets/v3?app_id=36544';
const MAX_TICKS = 200;

// ── Mini Sparkline bar icon (like Deriv's market list icons) ──────────────────
function SparkIcon({ up }: { up: boolean }) {
  return (
    <div className="w-8 h-5 flex items-end gap-px">
      {[3, 5, 2, 6, 4, 7, 3].map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${up ? 'bg-emerald-500' : 'bg-red-400'}`}
          style={{ height: `${(h / 7) * 100}%`, opacity: 0.6 + i * 0.05 }}
        />
      ))}
    </div>
  );
}

// ── Chart Canvas ──────────────────────────────────────────────────────────────
function ChartCanvas({
  ticks,
  chartType,
}: {
  ticks: Tick[];
  chartType: ChartType;
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
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const PAD_LEFT = 10;
    const PAD_RIGHT = 90; // price scale
    const PAD_TOP = 24;
    const PAD_BOTTOM = 28; // time axis

    const prices = ticks.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const scaleX = (i: number) =>
      PAD_LEFT + (i / (ticks.length - 1)) * (W - PAD_LEFT - PAD_RIGHT);
    const scaleY = (p: number) =>
      PAD_TOP + (1 - (p - min) / range) * (H - PAD_TOP - PAD_BOTTOM);

    // ── Grid lines ──────────────────────────────────────────────────
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = PAD_TOP + (i / gridLines) * (H - PAD_TOP - PAD_BOTTOM);
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(W - PAD_RIGHT, y);
      ctx.stroke();
    }

    // ── Price scale labels ──────────────────────────────────────────
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= gridLines; i++) {
      const p = max - (i / gridLines) * range;
      const y = PAD_TOP + (i / gridLines) * (H - PAD_TOP - PAD_BOTTOM);
      ctx.fillText(p.toFixed(2), W - PAD_RIGHT + 8, y + 4);
    }

    // ── Time axis ───────────────────────────────────────────────────
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    const timeLabels = 6;
    for (let i = 0; i <= timeLabels; i++) {
      const idx = Math.round((i / timeLabels) * (ticks.length - 1));
      const x = scaleX(idx);
      const date = new Date(ticks[idx].time * 1000);
      const label = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ctx.fillText(label, x, H - 6);
    }

    const isUp = ticks[ticks.length - 1].price >= ticks[0].price;
    const lineColor = isUp ? '#1d4ed8' : '#ef4444';

    if (chartType === 'area' || chartType === 'line') {
      // Fill gradient
      if (chartType === 'area') {
        const grad = ctx.createLinearGradient(0, PAD_TOP, 0, H - PAD_BOTTOM);
        grad.addColorStop(0, isUp ? 'rgba(59,130,246,0.18)' : 'rgba(239,68,68,0.18)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ticks.forEach((tick, i) => {
          const x = scaleX(i);
          const y = scaleY(tick.price);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(scaleX(ticks.length - 1), H - PAD_BOTTOM);
        ctx.lineTo(scaleX(0), H - PAD_BOTTOM);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Main line
      ctx.beginPath();
      ticks.forEach((tick, i) => {
        const x = scaleX(i);
        const y = scaleY(tick.price);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    if (chartType === 'candle') {
      // Group ticks into OHLC bars
      const BAR_COUNT = Math.min(80, Math.floor(ticks.length / 2));
      const barSize = Math.max(1, Math.floor(ticks.length / BAR_COUNT));
      const barW = Math.max(3, ((W - PAD_LEFT - PAD_RIGHT) / BAR_COUNT) * 0.7);

      for (let b = 0; b < BAR_COUNT; b++) {
        const start = b * barSize;
        const end = Math.min(start + barSize, ticks.length);
        const slice = ticks.slice(start, end);
        if (!slice.length) continue;
        const open = slice[0].price;
        const close = slice[slice.length - 1].price;
        const high = Math.max(...slice.map((t) => t.price));
        const low = Math.min(...slice.map((t) => t.price));
        const midX = scaleX(Math.floor((start + end) / 2));
        const bull = close >= open;
        const color = bull ? '#10b981' : '#ef4444';

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(midX, scaleY(high));
        ctx.lineTo(midX, scaleY(low));
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const bodyTop = scaleY(Math.max(open, close));
        const bodyH = Math.max(1, Math.abs(scaleY(open) - scaleY(close)));
        ctx.fillRect(midX - barW / 2, bodyTop, barW, bodyH);
      }
    }

    // ── Current price line + label ──────────────────────────────────
    const lastPrice = ticks[ticks.length - 1].price;
    const lastY = scaleY(lastPrice);
    const lastX = scaleX(ticks.length - 1);

    // Dashed price line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(W - PAD_RIGHT, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2937';
    ctx.fill();

    // Price badge
    const badgeH = 20;
    const badgeX = W - PAD_RIGHT + 2;
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.roundRect(badgeX, lastY - badgeH / 2, PAD_RIGHT - 4, badgeH, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lastPrice.toFixed(2), badgeX + (PAD_RIGHT - 4) / 2, lastY + 4);
  }, [ticks, chartType]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {ticks.length < 2 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-gray-400">Retrieving Chart Data…</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="block w-full h-full" />
      )}
    </div>
  );
}

// ── Main Charts Section ───────────────────────────────────────────────────────
export default function ChartsSection() {
  const [selectedSymbol, setSelectedSymbol] = useState<MarketItem>(MARKETS[1]); // 1HZ25V default
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // ── Connect WebSocket for selected symbol ───────────────────────────────────
  useEffect(() => {
    setTicks([]);
    setCurrentPrice(null);
    setChange(0);
    setStatus('connecting');

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_ENDPOINT);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      ws.send(JSON.stringify({ ticks: selectedSymbol.symbol, subscribe: 1 }));
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => { if (status !== 'error') setStatus('error'); };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.error) { setStatus('error'); return; }
        if (msg.tick) {
          const price = msg.tick.quote as number;
          const time = msg.tick.epoch as number;
          setCurrentPrice(price);
          setMarketPrices((prev) => ({ ...prev, [msg.tick.symbol]: price }));
          setTicks((prev) => {
            const next = [...prev, { time, price }].slice(-MAX_TICKS);
            if (next.length >= 2) {
              setChange(((next[next.length - 1].price - next[0].price) / next[0].price) * 100);
            }
            return next;
          });
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol.symbol]);

  const isUp = change >= 0;
  const decimals = selectedSymbol.symbol.startsWith('frx') ? 5 : 2;

  // ── Filtered market list ────────────────────────────────────────────────────
  const filtered = MARKETS.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // Group by subcategory
  const grouped: Record<string, MarketItem[]> = {};
  filtered.forEach((m) => {
    if (!grouped[m.subcategory]) grouped[m.subcategory] = [];
    grouped[m.subcategory].push(m);
  });

  const toggleFav = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 7.5rem)' }}>

      {/* ── Instrument Header ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <button
          id="chart-market-selector"
          onClick={() => setShowMarketDropdown((v) => !v)}
          className="flex items-center gap-3 bg-white border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-2 shadow-sm transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <SparkIcon up={isUp} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900 leading-tight">{selectedSymbol.name}</p>
            <p className="text-xs text-gray-400 leading-tight">{selectedSymbol.symbol}</p>
          </div>
          <ChevronDown size={14} className="text-gray-400 ml-1" />
        </button>

        {/* Price display */}
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
            {currentPrice !== null ? currentPrice.toFixed(decimals) : '—'}
          </p>
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(3)}%
            </span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'live' ? 'bg-emerald-500 animate-pulse' :
                status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'
              }`} />
              <span className="text-xs text-gray-400">
                {status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Connecting…'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: market sidebar + chart ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Market dropdown panel (mimics Deriv's left panel) */}
        {showMarketDropdown && (
          <div
            id="chart-market-panel"
            className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-gray-100 px-3 pt-2 gap-4">
              <div className="flex flex-col items-start gap-0.5 cursor-pointer pb-2 border-b-2 border-red-500">
                <span className="text-xs font-bold text-gray-700">Markets</span>
              </div>
            </div>

            {/* Favorites row */}
            {favorites.size > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Star size={11} className="fill-yellow-400 text-yellow-400" /> Favorites
                </p>
                {MARKETS.filter((m) => favorites.has(m.symbol)).map((m) => (
                  <MarketRow
                    key={m.symbol}
                    market={m}
                    selected={selectedSymbol.symbol === m.symbol}
                    isFav={true}
                    price={marketPrices[m.symbol]}
                    onSelect={() => { setSelectedSymbol(m); setShowMarketDropdown(false); }}
                    onToggleFav={() => toggleFav(m.symbol)}
                  />
                ))}
              </div>
            )}

            {/* Grouped list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {/* Category header: Derived */}
              <div className="px-2 py-1.5">
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-800 text-white flex items-center justify-center text-[8px] font-black">D</span>
                  Derived
                </p>
              </div>

              {Object.entries(grouped).map(([subcat, items]) => (
                <div key={subcat} className="mb-1">
                  <p className="text-xs text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">{subcat}</p>
                  {items.map((m) => (
                    <MarketRow
                      key={m.symbol}
                      market={m}
                      selected={selectedSymbol.symbol === m.symbol}
                      isFav={favorites.has(m.symbol)}
                      price={marketPrices[m.symbol]}
                      onSelect={() => { setSelectedSymbol(m); setShowMarketDropdown(false); }}
                      onToggleFav={() => toggleFav(m.symbol)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Chart area ── */}
        <div className="flex-1 flex overflow-hidden bg-white relative">

          {/* Chart type toolbar (left edge, vertical) */}
          <div className="flex flex-col items-center gap-1 p-2 border-r border-gray-100 bg-white shrink-0">
            {([
              { type: 'line' as ChartType, Icon: TrendingUp, label: 'Line' },
              { type: 'area' as ChartType, Icon: Activity, label: 'Area' },
              { type: 'candle' as ChartType, Icon: BarChart2, label: 'Candle' },
            ] as const).map(({ type, Icon, label }) => (
              <button
                key={type}
                id={`chart-type-${type}`}
                onClick={() => setChartType(type)}
                title={label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  chartType === type
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <Icon size={18} />
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 my-1" />
            {/* Zoom controls */}
            <button className="w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center text-lg font-light">+</button>
            <button className="w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center text-lg font-light">−</button>
          </div>

          {/* Canvas chart */}
          <div className="flex-1 overflow-hidden">
            <ChartCanvas ticks={ticks} chartType={chartType} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chart-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Market Row Component ──────────────────────────────────────────────────────
function MarketRow({
  market, selected, isFav, price, onSelect, onToggleFav,
}: {
  market: MarketItem;
  selected: boolean;
  isFav: boolean;
  price?: number;
  onSelect: () => void;
  onToggleFav: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-colors group ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="w-8 h-5 shrink-0">
        <SparkIcon up={true} />
      </div>
      <span className={`flex-1 text-sm font-medium truncate ${selected ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
        {market.name}
      </span>
      {price !== undefined && (
        <span className="text-xs text-gray-400 font-mono shrink-0">{price.toFixed(2)}</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star
          size={13}
          className={isFav ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}
        />
      </button>
    </div>
  );
}
