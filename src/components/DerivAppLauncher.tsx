import { TrendingUp, Calculator, Bot, BarChart3, ExternalLink } from 'lucide-react';

const APP_ID = import.meta.env.VITE_DERIV_APP_ID ?? '';

interface Props {
  wsToken: string | null;
  accountId: string | null;
  focusApp?: string; // pre-highlight a specific app
}

const APPS = [
  {
    id: 'accumulators',
    label: 'Accumulators',
    desc: 'Stake grows every tick that stays in range',
    icon: TrendingUp,
    color: 'emerald',
    url: (token: string) =>
      `https://app.deriv.com/dtrader#contract_type=ACCU&token=${token}&app_id=${APP_ID}`,
  },
  {
    id: 'digits',
    label: 'Digits',
    desc: 'Predict the last digit of the next tick',
    icon: Calculator,
    color: 'blue',
    url: (token: string) =>
      `https://app.deriv.com/dtrader#contract_type=DIGITDIFF&token=${token}&app_id=${APP_ID}`,
  },
  {
    id: 'bot',
    label: 'Bot Builder',
    desc: 'Visual drag-and-drop trading bot builder',
    icon: Bot,
    color: 'purple',
    url: (token: string) =>
      `https://app.deriv.com/bot?token=${token}&app_id=${APP_ID}`,
  },
  {
    id: 'risefall',
    label: 'Rise / Fall',
    desc: 'Predict whether price rises or falls',
    icon: BarChart3,
    color: 'orange',
    url: (token: string) =>
      `https://app.deriv.com/dtrader#contract_type=CALL&token=${token}&app_id=${APP_ID}`,
  },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  blue:    'bg-blue-50 text-blue-700 border-blue-300',
  purple:  'bg-purple-50 text-purple-700 border-purple-300',
  orange:  'bg-orange-50 text-orange-700 border-orange-300',
};

const iconBg: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue:    'bg-blue-100 text-blue-600',
  purple:  'bg-purple-100 text-purple-600',
  orange:  'bg-orange-100 text-orange-600',
};

export default function DerivAppLauncher({ wsToken, accountId, focusApp }: Props) {
  const openApp = (app: typeof APPS[number]) => {
    if (!wsToken) return;
    const url = app.url(wsToken);
    const popup = window.open(url, `deriv_${app.id}`, 'width=1280,height=860,scrollbars=yes,resizable=yes');
    if (!popup) window.open(url, '_blank');
    else popup.focus();
  };

  // If a specific app is focused, show it prominently at the top
  const focused = focusApp ? APPS.find((a) => a.id === focusApp) : null;

  return (
    <div className="space-y-4">
      {/* Focused app — large launch card */}
      {focused && (
        <div className={`rounded-xl border-2 p-6 ${wsToken ? colorMap[focused.color] : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${wsToken ? iconBg[focused.color] : 'bg-gray-100 text-gray-400'}`}>
              <focused.icon size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{focused.label}</h3>
              <p className="text-sm opacity-70 mt-0.5">{focused.desc}</p>
            </div>
            <button
              onClick={() => openApp(focused)}
              disabled={!wsToken}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                wsToken
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ExternalLink size={16} />
              {wsToken ? 'Open App' : 'Loading…'}
            </button>
          </div>

          {!wsToken && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
              Your session is loading. The button will activate in a moment.
            </p>
          )}
        </div>
      )}

      {/* All apps grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">All Trading Apps</h3>
            {accountId && (
              <p className="text-xs text-gray-400 mt-0.5">Account: {accountId}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => openApp(app)}
              disabled={!wsToken}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left group ${
                wsToken
                  ? `${colorMap[app.color]} hover:shadow-md ${focusApp === app.id ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${wsToken ? iconBg[app.color] : 'bg-gray-100 text-gray-400'}`}>
                <app.icon size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1 font-semibold text-sm">
                  {app.label}
                  {wsToken && <ExternalLink size={11} className="opacity-40 group-hover:opacity-80 transition-opacity" />}
                </div>
                <p className="text-xs opacity-60 mt-0.5 leading-snug">{app.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {!wsToken && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Setting up your session…
          </p>
        )}
      </div>
    </div>
  );
}
