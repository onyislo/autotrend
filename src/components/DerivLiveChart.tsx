import { useEffect, useRef, useState } from 'react';

interface Tick {
  time: number;
  price: number;
}

interface Props {
  symbol: string;
  wsToken: string | null;
  wsUrl: string | null;
  label: string;
}

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3?app_id=';
const APP_ID = import.meta.env.VITE_DERIV_APP_ID ?? '1089';
const MAX_TICKS = 60;

export default function DerivLiveChart({ symbol, wsToken, wsUrl, label }: Props) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setTicks([]);
    setCurrentPrice(null);
    setChange(0);
    setStatus('connecting');

    let ws: WebSocket;

    // Use the OTP WebSocket URL if available, otherwise fall back to public WS
    if (wsUrl && wsToken) {
      const url = new URL(wsUrl);
      url.searchParams.set('otp', wsToken);
      ws = new WebSocket(url.toString());
    } else {
      ws = new WebSocket(`${WS_ENDPOINT}${APP_ID}`);
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => setStatus('error');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.tick) {
          const price = msg.tick.quote as number;
          const time = msg.tick.epoch as number;
          setCurrentPrice(price);
          setTicks((prev) => {
            const next = [...prev, { time, price }].slice(-MAX_TICKS);
            if (next.length >= 2) {
              setChange(((next[next.length - 1].price - next[0].price) / next[0].price) * 100);
            }
            return next;
          });
        }
      } catch {
        // ignore malformed
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol, wsToken, wsUrl]);

  // Draw canvas chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ticks.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const prices = ticks.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const isUp = change >= 0;
    grad.addColorStop(0, isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    // Line path
    ctx.beginPath();
    ticks.forEach((tick, i) => {
      const x = (i / (ticks.length - 1)) * W;
      const y = H - ((tick.price - min) / range) * (H - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Fill
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke
    ctx.beginPath();
    ticks.forEach((tick, i) => {
      const x = (i / (ticks.length - 1)) * W;
      const y = H - ((tick.price - min) / range) * (H - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isUp ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current price dot
    const lastX = W;
    const lastY = H - ((prices[prices.length - 1] - min) / range) * (H - 16) - 8;
    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? '#10b981' : '#ef4444';
    ctx.fill();
  }, [ticks, change]);

  const isUp = change >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-gray-900 font-mono">
            {currentPrice !== null ? currentPrice.toFixed(symbol.startsWith('frx') ? 5 : 2) : '—'}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(3)}%
          </span>
          <div className="flex items-center gap-1 justify-end mt-1">
          <span className={`w-2 h-2 rounded-full ${
            status === 'live' ? 'bg-emerald-500 animate-pulse' :
            status === 'error' ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
          }`} />
          <span className="text-xs text-gray-400">
            {status === 'live' ? 'live' : 'loading'}
          </span>
        </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={80}
        className="w-full h-20 rounded-lg"
        style={{ display: ticks.length < 2 ? 'none' : 'block' }}
      />
      {ticks.length < 2 && (
        <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
          Loading price data…
        </div>
      )}
    </div>
  );
}
