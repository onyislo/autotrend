import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Clear all auth-related cookies
  res.setHeader('Set-Cookie', [
    `deriv_auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `deriv_session=; Path=/; SameSite=Lax; Max-Age=0`,
    `deriv_account_id=; Path=/; SameSite=Lax; Max-Age=0`,
  ]);
  res.status(200).json({ ok: true });
}
