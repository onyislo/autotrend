import type { VercelRequest, VercelResponse } from '@vercel/node';

function parseCookies(header: string): Record<string, string> {
  return header.split(';').reduce<Record<string, string>>((acc, pair) => {
    const [k, ...rest] = pair.trim().split('=');
    if (k) acc[k.trim()] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cookies = parseCookies(req.headers.cookie ?? '');
  const token = cookies['deriv_auth_token'];
  const accountId = cookies['deriv_account_id'];
  const appId = process.env.VITE_DERIV_APP_ID ?? process.env.DERIV_APP_ID ?? '';

  if (!token || !appId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Fetch account list + balances
    const accountsRes = await fetch(
      'https://api.derivws.com/trading/v1/options/accounts',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Deriv-App-ID': appId,
        },
      }
    );

    if (!accountsRes.ok) {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    const accountsPayload = (await accountsRes.json()) as {
      data?: Array<{
        account_id?: string;
        account_type?: string;
        balance?: number | string;
        currency?: string;
        loginid?: string;
      }>;
    };

    const accounts = accountsPayload.data ?? [];

    // Fetch OTP/WS token for the chosen account
    let wsToken: string | null = null;
    let wsUrl: string | null = null;

    if (accountId) {
      try {
        const otpRes = await fetch(
          `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Deriv-App-ID': appId,
            },
          }
        );
        if (otpRes.ok) {
          const otpPayload = (await otpRes.json()) as { data?: { url?: string } };
          wsUrl = otpPayload.data?.url ?? null;
          const m = wsUrl?.match(/[?&]otp=([^&]+)/);
          wsToken = m?.[1] ?? null;
        }
      } catch {
        // Best-effort
      }
    }

    return res.status(200).json({ accounts, wsToken, wsUrl, accountId });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
}
