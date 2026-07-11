import { TrendingUp, Calculator, Bot, BarChart3, ExternalLink } from 'lucide-react';

const APP_ID = import.meta.env.VITE_DERIV_APP_ID ?? '';

interface Props {
  wsToken: string | null;
  accountId: string | null;
}

// Deriv's official app URLs.
// token   → logs the user in automatically
// app_id  → ties every trade back to YOUR registered app so you earn the 3% markup
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
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400 hover:bg-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-400 hover:bg-orange-100',
};

const iconBg: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
};

export default function DerivAppLauncher({ wsToken, accountId }: Props) {
  const openApp = (app: typeof APPS[number]) => {
    if (!wsToken) {
      alert('Trading token not available yet. Please wait a moment and try again.');
      return;
    }

    const url = app.url(wsToken);
    const popup = window.open(
      url,
      `deriv_${app.id}`,
      'width=1280,height=860,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      // Popup blocked — open in new tab
      window.open(url, '_blank');
    } else {
      popup.focus();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Deriv Trading Apps</h3>
          <p className="text-sm text-gray-500">
            Opens the official Deriv app — you'll be logged in automatically
          </p>
        </div>
        {accountId && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {accountId}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {APPS.map((app) => (
          <button
            key={app.id}
            onClick={() => openApp(app)}
            disabled={!wsToken}
            className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-left
              ${wsToken ? colorMap[app.color] : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}
              group`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${wsToken ? iconBg[app.color] : 'bg-gray-100 text-gray-400'}`}>
              <app.icon size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">{app.label}</span>
                <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs opacity-70 mt-0.5 leading-snug">{app.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {!wsToken && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
          Loading trading session… The buttons will activate once your account is connected.
        </p>
      )}
    </div>
  );
}
