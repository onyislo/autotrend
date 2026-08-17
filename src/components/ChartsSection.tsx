/**
 * ChartsSection.tsx — AutoTrendX Native Canvas Chart Engine
 *
 * 100% Client-Side Direct Browser → Broker WebSocket (wss://ws.derivws.com)
 * ZERO IFRAMES. ZERO SERVERLESS PROXIES.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Star, ChevronDown, TrendingUp, BarChart2, Activity,
  X, AlertCircle, RefreshCw,
} from 'lucide-react';
import { getUserData } from '../lib/finalAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tick       { time: number; price: number; }
interface MarketItem { symbol: string; name: string; subcategory: string; }
type ChartType       = 'line' | 'area' | 'candle';
type ConnStatus      = 'connecting' | 'live' | 'error';

interface Props {
  wsToken?: string | null;
  wsUrl?: string | null;
}

// ─── Market catalogue ─────────────────────────────────────────────────────────
const MARKETS: MarketItem[] = [
  { symbol: '1HZ10V',    name: 'Volatility 10 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ25V',    name: 'Volatility 25 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ50V',    name: 'Volatility 50 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ75V',    name: 'Volatility 75 (1s) Index',  subcategory: 'Continuous Indices' },
  { symbol: '1HZ100V',   name: 'Volatility 100 (1s) Index', subcategory: 'Continuous Indices' },
  { symbol: 'R_10',      name: 'Volatility 10 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_25',      name: 'Volatility 25 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_50',      name: 'Volatility 50 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_75',      name: 'Volatility 75 Index',        subcategory: 'Continuous Indices' },
  { symbol: 'R_100',     name: 'Volatility 100 Index',       subcategory: 'Continuous Indices' },
  { symbol: 'CRASH300N', name: 'Crash 300 Index',            subcategory: 'Crash / Boom' },
  { symbol: 'CRASH500',  name: 'Crash 500 Index',            subcategory: 'Crash / Boom' },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index',           subcategory: 'Crash / Boom' },
  { symbol: 'BOOM300N',  name: 'Boom 300 Index',             subcategory: 'Crash / Boom' },
  { symbol: 'BOOM500',   name: 'Boom 500 Index',             subcategory: 'Crash / Boom' },
  { symbol: 'BOOM1000',  name: 'Boom 1000 Index',            subcategory: 'Crash / Boom' },
  { symbol: 'STPIDX',   name: 'Step Index',                  subcategory: 'Step Indices' },
  { symbol: 'JD10',     name: 'Jump 10 Index',               subcategory: 'Jump Indices' },
  { symbol: 'JD25',     name: 'Jump 25 Index',               subcategory: 'Jump Indices' },
  { symbol: 'JD50',     name: 'Jump 50 Index',               subcategory: 'Jump Indices' },
  { symbol: 'JD75',     name: 'Jump 75 Index',               subcategory: 'Jump Indices' },
  { symbol: 'JD100',    name: 'Jump 100 Index',              subcategory: 'Jump Indices' },
];

const APP_ID = import.meta.env.VITE_DERIV_APP_ID ?? '';
const WS_PRIMARY  = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;
const WS_FALLBACK = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

const MAX_TICKS     = 300;
const HISTORY_COUNT = 200;

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function SparkIcon() {
  return (
    <div className="w-8 h-5 flex items-end gap-px">
      {[3, 5, 2, 7, 4, 6, 3].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(h / 7) * 100}%`,
            background: `rgba(16,185,129,${0.4 + i * 0.09})`,
          }}
        />
      ))}
    </div>
  );
}

function MRow({
  m, active, fav, onSelect, onFav,
}: {
  m: MarketItem; active: boolean; fav: boolean;
  onSelect: () => void; onFav: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors group
        ${active ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'hover:bg-white/5 text-gray-300'}`}
    >
      <div className="w-7 h-4 shrink-0"><SparkIcon /></div>
      <span className="flex-1 text-xs truncate">{m.name}</span>
      <button
        onClick={e => { e.stopPropagation(); onFav(); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star size={12} className={fav ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'} />
      </button>
    </div>
  );
}

function ChartCanvas({
  ticks, chartType, status, errorMsg, onRetry,
}: {
  ticks: Tick[]; chartType: ChartType;
  status: ConnStatus; errorMsg: string; onRetry: () => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef     = useRef<{ x: number; y: number } | null>(null);
  const rafRef       = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || ticks.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = container.clientWidth;
    const H   = container.clientHeight;
    if (!W || !H) return;

    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const PL = 4, PR = 80, PT = 18, PB = 30;
    const CW = W - PL - PR;
    const CH = H - PT - PB;

    const prices = ticks.map(t => t.price);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const rawRng = rawMax - rawMin || rawMin * 0.001 || 1;
    const pad    = rawRng * 0.08;
    const lo     = rawMin - pad;
    const hi     = rawMax + pad;
    const rng    = hi - lo;

    const sx = (i: number) => PL + (i / (ticks.length - 1)) * CW;
    const sy = (p: number) => PT + (1 - (p - lo) / rng) * CH;

    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, W, H);

    const vig = ctx.createRadialGradient(W / 2, H / 2, CW * 0.2, W / 2, H / 2, W * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    const ROWS = 6, COLS = 8;
    for (let i = 0; i <= ROWS; i++) {
      const y = PT + (i / ROWS) * CH;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke();
    }
    for (let i = 0; i <= COLS; i++) {
      const x = PL + (i / COLS) * CW;
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, H - PB); ctx.stroke();
    }

    ctx.fillStyle  = '#4b5563';
    ctx.font       = '10px "SF Mono","Fira Code","Consolas",monospace';
    ctx.textAlign  = 'left';
    for (let i = 0; i <= ROWS; i++) {
      const p = hi - (i / ROWS) * rng;
      const y = PT + (i / ROWS) * CH;
      ctx.fillText(p.toFixed(2), W - PR + 6, y + 4);
    }

    ctx.fillStyle  = '#4b5563';
    ctx.font       = '9px "SF Mono","Fira Code","Consolas",monospace';
    ctx.textAlign  = 'center';
    [0, 1, 2, 3, 4, 5, 6].forEach(i => {
      const idx = Math.round((i / 6) * (ticks.length - 1));
      const d   = new Date(ticks[idx].time * 1000);
      ctx.fillText(
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        sx(idx), H - 8,
      );
    });

    const isUp      = ticks[ticks.length - 1].price >= ticks[0].price;
    const lineColor = isUp ? '#00d97e' : '#ff4d6d';

    if (chartType === 'area') {
      const grad = ctx.createLinearGradient(0, PT, 0, H - PB);
      grad.addColorStop(0,   isUp ? 'rgba(0,217,126,0.22)'  : 'rgba(255,77,109,0.22)');
      grad.addColorStop(0.5, isUp ? 'rgba(0,217,126,0.06)'  : 'rgba(255,77,109,0.06)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ticks.forEach((t, i) => { const x = sx(i), y = sy(t.price); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.lineTo(sx(ticks.length - 1), H - PB);
      ctx.lineTo(sx(0), H - PB);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (chartType !== 'candle') {
      ctx.beginPath();
      ticks.forEach((t, i) => { const x = sx(i), y = sy(t.price); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth   = 1.8;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.shadowColor = lineColor;
      ctx.shadowBlur  = 10;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    if (chartType === 'candle') {
      const NUM_C  = Math.min(80, Math.floor(ticks.length / 2));
      const tpc    = Math.max(1, Math.floor(ticks.length / NUM_C));
      const barW   = Math.max(3, (CW / NUM_C) * 0.65);
      for (let b = 0; b < NUM_C; b++) {
        const sl = ticks.slice(b * tpc, Math.min((b + 1) * tpc, ticks.length));
        if (!sl.length) continue;
        const o   = sl[0].price;
        const c   = sl[sl.length - 1].price;
        const hi2 = Math.max(...sl.map(t => t.price));
        const lo2 = Math.min(...sl.map(t => t.price));
        const mid = Math.min(b * tpc + Math.floor(tpc / 2), ticks.length - 1);
        const mx  = sx(mid);
        const clr = c >= o ? '#00d97e' : '#ff4d6d';

        ctx.strokeStyle = clr; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mx, sy(hi2)); ctx.lineTo(mx, sy(lo2)); ctx.stroke();

        const top  = sy(Math.max(o, c));
        const bodH = Math.max(1, Math.abs(sy(o) - sy(c)));
        ctx.fillStyle = clr;
        ctx.fillRect(mx - barW / 2, top, barW, bodH);
      }
    }

    const mouse = mouseRef.current;
    if (mouse && mouse.x >= PL && mouse.x <= W - PR && mouse.y >= PT && mouse.y <= H - PB) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(mouse.x, PT);    ctx.lineTo(mouse.x, H - PB); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PL, mouse.y);    ctx.lineTo(W - PR, mouse.y); ctx.stroke();
      ctx.setLineDash([]);

      const cp = lo + (1 - (mouse.y - PT) / CH) * rng;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      safeRoundRect(ctx, W - PR + 2, mouse.y - 10, PR - 4, 20, 3);
      ctx.fill();
      ctx.fillStyle  = '#ffffff';
      ctx.font       = 'bold 10px "SF Mono","Fira Code","Consolas",monospace';
      ctx.textAlign  = 'center';
      ctx.fillText(cp.toFixed(2), W - PR + 2 + (PR - 4) / 2, mouse.y + 4);
    }

    const last = ticks[ticks.length - 1];
    const lx   = sx(ticks.length - 1);
    const ly   = sy(last.price);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle  = lineColor;
    ctx.lineWidth    = 1;
    ctx.globalAlpha  = 0.5;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(W - PR, ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha  = 1;

    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fillStyle   = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur  = 14;
    ctx.fill();
    ctx.shadowBlur  = 0;

    const BW = PR - 4, BH = 22, BX = W - PR + 2;
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    safeRoundRect(ctx, BX, ly - BH / 2, BW, BH, 4);
    ctx.fill();
    ctx.fillStyle  = '#000000';
    ctx.font       = 'bold 11px "SF Mono","Fira Code","Consolas",monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(last.price.toFixed(2), BX + BW / 2, ly + 4);
  }, [ticks, chartType]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };
  const onMouseLeave = () => {
    mouseRef.current = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ background: '#0b0f1a' }}>
      {ticks.length < 2 ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4"
          style={{ background: '#0b0f1a' }}
        >
          {status === 'error' ? (
            <div
              className="rounded-2xl p-6 max-w-sm text-center"
              style={{ background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.22)' }}
            >
              <AlertCircle size={36} className="mx-auto mb-2" style={{ color: '#ff4d6d' }} />
              <h3 className="text-base font-bold mb-1 text-white">Stream Connection Error</h3>
              <p className="text-xs mb-4 text-gray-400">
                {errorMsg || 'Unable to connect to market stream. Click retry below.'}
              </p>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 font-semibold text-xs px-4 py-2.5 rounded-xl text-white"
                style={{ background: '#ff4d6d' }}
              >
                <RefreshCw size={14} /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              <div
                className="w-10 h-10 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#00d97e' }}
              />
              <p className="text-xs font-medium text-gray-400">
                {status === 'connecting' ? 'Connecting directly to Deriv stream…' : 'Loading live chart…'}
              </p>
            </>
          )}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        />
      )}
    </div>
  );
}

export default function ChartsSection({ wsToken }: Props) {
  const [selected,   setSelected]   = useState<MarketItem>(MARKETS[4]); // 1HZ100V
  const [ticks,      setTicks]      = useState<Tick[]>([]);
  const [price,      setPrice]      = useState<number | null>(null);
  const [prevPrice,  setPrevPrice]  = useState<number | null>(null);
  const [change,     setChange]     = useState(0);
  const [status,     setStatus]     = useState<ConnStatus>('connecting');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [chartType,  setChartType]  = useState<ChartType>('area');
  const [search,     setSearch]     = useState('');
  const [favs,       setFavs]       = useState<Set<string>>(new Set());
  const [panelOpen,  setPanelOpen]  = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const effectiveToken = wsToken || getUserData()?.access_token || null;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let dead = false;
    let usingFallback = false;

    setTicks([]);
    setPrice(null);
    setPrevPrice(null);
    setChange(0);
    setStatus('connecting');
    setErrorMsg('');

    function openSocket(endpoint: string) {
      ws = new WebSocket(endpoint);

      ws.onopen = () => {
        if (dead) return;
        setStatus('live');
        setErrorMsg('');

        if (effectiveToken && ws) {
          ws.send(JSON.stringify({ authorize: effectiveToken }));
        }

        ws!.send(JSON.stringify({
          ticks_history:     selected.symbol,
          adjust_start_time: 1,
          count:             HISTORY_COUNT,
          end:               'latest',
          style:             'ticks',
        }));

        ws!.send(JSON.stringify({
          ticks:     selected.symbol,
          subscribe: 1,
        }));
      };

      ws.onmessage = (ev: MessageEvent) => {
        if (dead) return;

        let data: Record<string, any>;
        try {
          data = JSON.parse(ev.data as string);
        } catch {
          return;
        }

        if (data.error) {
          if (data.msg_type === 'authorize' || data.error?.code === 'InvalidToken') {
            console.warn('[AutoTrendX] Chart auth bypassed for public stream:', data.error.message);
          } else {
            console.error(`[AutoTrendX] Deriv Broker error: ${data.error.code} - ${data.error.message}`);
            setStatus('error');
            setErrorMsg(`[${data.error.code}] ${data.error.message}`);
            return;
          }
        }

        if (data.msg_type === 'history' && data.history) {
          const { prices, times } = data.history as { prices: number[]; times: number[] };
          const historical: Tick[] = prices.map((p, i) => ({ price: p, time: times[i] }));
          if (historical.length > 0) {
            setTicks(historical.slice(-MAX_TICKS));
            const last = historical[historical.length - 1].price;
            setPrice(last);
            setPrevPrice(last);
            if (historical.length >= 2) {
              setChange(((last - historical[0].price) / historical[0].price) * 100);
            }
          }
          return;
        }

        if (data.msg_type === 'tick' && data.tick) {
          const p = data.tick.quote as number;
          const t = data.tick.epoch as number;

          setPrevPrice(prev => (prev === null ? p : prev));
          setPrice(p);
          setTicks(prev => {
            const next = [...prev, { time: t, price: p }].slice(-MAX_TICKS);
            if (next.length >= 2) {
              setChange(((next[next.length - 1].price - next[0].price) / next[0].price) * 100);
            }
            return next;
          });
        }
      };

      ws.onerror = (e) => {
        if (dead) return;
        console.error('[AutoTrendX] WS error:', e);
      };

      ws.onclose = (e) => {
        if (dead) return;
        if (e.code === 1000) return;

        if (!usingFallback && endpoint === WS_PRIMARY) {
          usingFallback = true;
          openSocket(WS_FALLBACK);
        } else {
          setStatus('error');
          setErrorMsg(`Connection closed (code ${e.code}). Click Retry.`);
        }
      };
    }

    openSocket(WS_PRIMARY);

    return () => {
      dead = true;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ forget_all: 'ticks' }));
          ws.close(1000, 'Asset switch');
        } else {
          ws.close();
        }
      }
    };
  }, [selected, retryCount, effectiveToken]);

  const isUp     = change >= 0;
  const priceUp  = prevPrice !== null && price !== null && price > prevPrice;
  const priceDn  = prevPrice !== null && price !== null && price < prevPrice;
  const filtered = MARKETS.filter(
    m => m.name.toLowerCase().includes(search.toLowerCase())
      || m.symbol.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped = filtered.reduce<Record<string, MarketItem[]>>((acc, m) => {
    (acc[m.subcategory] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#0b0f1a' }}>
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-3 py-2 shrink-0 flex-wrap"
        style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0b0f1a' }}>
            <SparkIcon />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white truncate max-w-[140px] sm:max-w-none">
              {selected.name}
            </p>
            <p className="text-xs text-gray-400">{selected.symbol}</p>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform text-gray-400 ${panelOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex items-center gap-2">
          <p
            className="text-xl font-bold font-mono transition-colors duration-150"
            style={{ color: priceUp ? '#00d97e' : priceDn ? '#ff4d6d' : '#f9fafb' }}
          >
            {price !== null ? price.toFixed(2) : '—'}
          </p>
          <div>
            <span
              className="text-sm font-bold block"
              style={{ color: isUp ? '#00d97e' : '#ff4d6d' }}
            >
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(3)}%
            </span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'live' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
              <span className="text-xs text-gray-400">{status === 'live' ? 'Live Stream' : status === 'error' ? 'Error' : 'Connecting…'}</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {([
            ['line',   TrendingUp],
            ['area',   Activity],
            ['candle', BarChart2],
          ] as const).map(([type, Icon]) => (
            <button
              key={type}
              onClick={() => setChartType(type as ChartType)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: chartType === type ? 'rgba(0,217,126,0.12)' : 'transparent',
                color:      chartType === type ? '#00d97e' : '#4b5563',
                border:     chartType === type ? '1px solid rgba(0,217,126,0.3)' : '1px solid transparent',
              }}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {panelOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 z-20 bg-black/60"
              onClick={() => setPanelOpen(false)}
            />
            <div
              className="absolute md:relative z-30 md:z-auto top-0 left-0 h-full w-[85vw] max-w-xs md:w-60 flex flex-col shadow-2xl md:shadow-none"
              style={{ background: '#111827', borderRight: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-sm font-bold text-white">Markets</span>
                <button onClick={() => setPanelOpen(false)} className="md:hidden text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none text-white placeholder-gray-600"
                    style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.07)' }}
                  />
                </div>
              </div>

              {favs.size > 0 && (
                <div className="px-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1 text-gray-500">
                    <Star size={10} className="fill-yellow-400 text-yellow-400" /> Favourites
                  </p>
                  {MARKETS.filter(m => favs.has(m.symbol)).map(m => (
                    <MRow key={m.symbol} m={m} active={selected.symbol === m.symbol} fav
                      onSelect={() => { setSelected(m); setPanelOpen(false); }}
                      onFav={() => setFavs(p => { const n = new Set(p); n.has(m.symbol) ? n.delete(m.symbol) : n.add(m.symbol); return n; })}
                    />
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-2 py-2">
                <p className="px-2 py-1 text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                    style={{ background: '#00d97e', color: '#000' }}
                  >D</span>
                  Derived Markets
                </p>
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-2">
                    <p className="text-[10px] font-bold px-2 py-1 uppercase tracking-wider text-gray-500">
                      {cat}
                    </p>
                    {items.map(m => (
                      <MRow key={m.symbol} m={m}
                        active={selected.symbol === m.symbol}
                        fav={favs.has(m.symbol)}
                        onSelect={() => { setSelected(m); setPanelOpen(false); }}
                        onFav={() => setFavs(p => { const n = new Set(p); n.has(m.symbol) ? n.delete(m.symbol) : n.add(m.symbol); return n; })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex-1 min-w-0 h-full">
          <ChartCanvas
            ticks={ticks}
            chartType={chartType}
            status={status}
            errorMsg={errorMsg}
            onRetry={() => setRetryCount(r => r + 1)}
          />
        </div>
      </div>
    </div>
  );
}
