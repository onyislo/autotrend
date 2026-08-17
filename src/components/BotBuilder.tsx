/**
 * BotBuilder.tsx — AutoTrendX Native Trading Bot Builder
 *
 * 100% Native React UI — Direct Browser WebSocket execution via Deriv API.
 * ZERO IFRAMES. ZERO EXTERNAL REDIRECTS.
 */

import AutoBotsPanel from './AutoBotsPanel';

interface Props {
  wsToken?: string | null;
  wsUrl?: string | null;
  userEmail?: string | null;
  onGoToFreeBots?: () => void;
  onBalanceUpdate?: (profitDelta: number, newExactBalance?: number) => void;
}

export default function BotBuilder({ wsToken, wsUrl, userEmail, onGoToFreeBots, onBalanceUpdate }: Props) {
  // Pass wsToken or fallback to empty string
  return (
    <div className="flex flex-col w-full h-full bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <AutoBotsPanel
          wsToken={wsToken ?? null}
          wsUrl={wsUrl ?? null}
          userEmail={userEmail ?? null}
          userId={null}
          onGoToFreeBots={onGoToFreeBots}
          onBalanceUpdate={onBalanceUpdate}
        />
      </div>
    </div>
  );
}
