import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state } = req.query as Record<string, string>;

  // Read cookies from the incoming request
  const cookies = parseCookies(req.headers.cookie ?? '');
  const storedState = cookies['oauth_state'];
  const codeVerifier = cookies['pkce_verifier'];
  const appId = process.env.VITE_DERIV_APP_ID ?? process.env.DERIV_APP_ID ?? '';
  const appUrl = process.env.VITE_SITE_URL ?? `https://${req.headers.host}`;
  const redirectUri = `${appUrl}/api/auth/callback`;

  // Validate required values
  if (!code || !codeVerifier || !appId) {
    return res.redirect(302, '/?error=missing_params');
  }

  // CSRF check — only enforce when both sides have a state value
  if (state && storedState && state !== storedState) {
    return res.redirect(302, '/?error=state_mismatch');
  }

  // Exchange authorisation code for access token
  let accessToken: string | undefined;
  try {
    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: appId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const payload = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenResponse.ok || !payload.access_token) {
      console.error('[callback] token exchange failed', payload);
      return res.redirect(302, '/?error=token_exchange_failed');
    }

    accessToken = payload.access_token;
  } catch (err) {
    console.error('[callback] token exchange error', err);
    return res.redirect(302, '/?error=server_error');
  }

  // Build redirect to dashboard and set cookies
  res.setHeader('Set-Cookie', [
    // Auth token — httpOnly so JS cannot read it
    `deriv_auth_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
    // Session flag — readable by JS so the SPA knows the user is logged in
    `deriv_session=1; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
    // Clear PKCE cookies
    `pkce_verifier=; Path=/; Max-Age=0`,
    `oauth_state=; Path=/; Max-Age=0`,
  ]);

  // Optionally resolve account ID for WebSocket access
  try {
    const accountsRes = await fetch(
      'https://api.derivws.com/trading/v1/options/accounts',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Deriv-App-ID': appId,
        },
      }
    );

    if (accountsRes.ok) {
      const accountsPayload = (await accountsRes.json()) as {
        data?: Array<{ account_id?: string; account_type?: string }>;
      };

      const preference = cookies['deriv_account_preference'] ?? 'real';
      const accounts = accountsPayload.data ?? [];
      const realAccount = accounts.find((a) => a.account_type !== 'demo');
      const demoAccount = accounts.find((a) => a.account_type === 'demo');
      const chosen =
        preference === 'demo'
          ? (demoAccount ?? realAccount)
          : (realAccount ?? demoAccount);

      if (chosen?.account_id) {
        res.setHeader('Set-Cookie', [
          `deriv_auth_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
          `deriv_session=1; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
          `deriv_account_id=${chosen.account_id}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`,
          `pkce_verifier=; Path=/; Max-Age=0`,
          `oauth_state=; Path=/; Max-Age=0`,
        ]);
      }
    }
  } catch {
    // Account lookup is best-effort; continue to dashboard regardless
  }

  return res.redirect(302, '/dashboard');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .reduce<Record<string, string>>((acc, pair) => {
      const [key, ...rest] = pair.trim().split('=');
      if (key) acc[key.trim()] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
}
