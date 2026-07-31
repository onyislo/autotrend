import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(45) ? res.status(405).json({ error: 'Method not allowed' }) : res.status(405).end();
  }

  const { context, message, details, userAgent, symbol } = req.body || {};

  console.error(`[CLIENT_ERROR] Context: ${context || 'Unknown'} | Symbol: ${symbol || 'N/A'}`);
  console.error(`[CLIENT_ERROR_DETAILS] Message: ${message} | Details: ${JSON.stringify(details || {})}`);
  console.error(`[CLIENT_ERROR_UA] UserAgent: ${userAgent || req.headers['user-agent']}`);

  return res.status(200).json({ logged: true });
}
