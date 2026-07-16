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

  const focused = focusApp ? APPS.find((a) => a.id === focusApp) : null;

  if (!wsToken) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-700 font-semibold text-lg">Setting up your trading workspace…</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Please wait while we establish a secure connection to your Deriv session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Embedded application container if an app is selected */}
      {focused ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-gray-800 text-sm">
                Connected to {focused.label}
              </span>
              {accountId && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                  {accountId}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => openApp(focused)}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                title="Open in a larger standalone window"
              >
                <span>Standalone Window</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden h-[750px] relative">
            <iframe
              src={focused.url(wsToken)}
              title={focused.label}
              className="w-full h-full border-0"
              allow="clipboard-write; camera; geolocation"
            />
          </div>
        </div>
      ) : (
        /* Grid view fallback if no app is active */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-lg">All Trading Apps</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select one of the workspace tools below to load it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => openApp(app)}
                className={`flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left group ${
                  colorMap[app.color]
                } hover:shadow-md`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[app.color]}`}>
                  <app.icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1 font-bold text-sm text-gray-800">
                    {app.label}
                    <ExternalLink size={12} className="opacity-40 group-hover:opacity-80 transition-opacity" />
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{app.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
