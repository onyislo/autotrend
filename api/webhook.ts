import type { VercelRequest, VercelResponse } from '@vercel/node';
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const appId = process.env.VITE_DERIV_APP_ID ?? process.env.DERIV_APP_ID ?? '33MJcHX2yZOr6lkeIP9Mg';

// Mapping for various formats of symbols
function normalizeSymbol(symbol: string): string {
  const sym = symbol.toUpperCase().trim().replace(/[-_\s]+/g, '');
  
  const mapping: Record<string, string> = {
    'R10': 'R_10', 'V10': 'R_10', 'VOLATILITY10': 'R_10', 'VOLATILITY10INDEX': 'R_10',
    'R25': 'R_25', 'V25': 'R_25', 'VOLATILITY25': 'R_25', 'VOLATILITY25INDEX': 'R_25',
    'R50': 'R_50', 'V50': 'R_50', 'VOLATILITY50': 'R_50', 'VOLATILITY50INDEX': 'R_50',
    'R75': 'R_75', 'V75': 'R_75', 'VOLATILITY75': 'R_75', 'VOLATILITY75INDEX': 'R_75',
    'R100': 'R_100', 'V100': 'R_100', 'VOLATILITY100': 'R_100', 'VOLATILITY100INDEX': 'R_100',
    
    '1HZ10V': '1HZ10V', 'V101S': '1HZ10V', 'VOLATILITY101S': '1HZ10V',
    '1HZ25V': '1HZ25V', 'V251S': '1HZ25V', 'VOLATILITY251S': '1HZ25V',
    '1HZ50V': '1HZ50V', 'V501S': '1HZ50V', 'VOLATILITY501S': '1HZ50V',
    '1HZ75V': '1HZ75V', 'V751S': '1HZ75V', 'VOLATILITY751S': '1HZ75V',
    '1HZ100V': '1HZ100V', 'V1001S': '1HZ100V', 'VOLATILITY1001S': '1HZ100V',
    
    'CRASH300': 'CRASH300N', 'CRASH300INDEX': 'CRASH300N', 'CRASH300N': 'CRASH300N',
    'CRASH500': 'CRASH500', 'CRASH500INDEX': 'CRASH500',
    'CRASH1000': 'CRASH1000', 'CRASH1000INDEX': 'CRASH1000',
    
    'BOOM300': 'BOOM300N', 'BOOM300INDEX': 'BOOM300N', 'BOOM300N': 'BOOM300N',
    'BOOM500': 'BOOM500', 'BOOM500INDEX': 'BOOM500',
    'BOOM1000': 'BOOM1000', 'BOOM1000INDEX': 'BOOM1000',
    
    'STEPINDEX': 'STEPINDEX', 'STEP': 'STEPINDEX',
    'JD10': 'JD10', 'JUMP10': 'JD10',
    'JD25': 'JD25', 'JUMP25': 'JD25',
    'JD50': 'JD50', 'JUMP50': 'JD50',
    'JD75': 'JD75', 'JUMP75': 'JD75',
    'JD100': 'JD100', 'JUMP100': 'JD100',
  };
  
  return mapping[sym] || symbol;
}

function normalizeAction(action: string): string {
  const act = action.toUpperCase().trim();
  if (act === 'BUY' || act === 'CALL' || act === 'RISE' || act === 'UP' || act === 'LONG') {
    return 'CALL';
  }
  if (act === 'SELL' || act === 'PUT' || act === 'FALL' || act === 'DOWN' || act === 'SHORT') {
    return 'PUT';
  }
  return act;
}

async function executeTrade(token: string, symbol: string, contractType: string, amount: number, duration: number, durationUnit: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Connect directly to Deriv production WebSocket
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
    
    let isFinished = false;
    
    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        ws.close();
        reject(new Error('Deriv API timeout (5 seconds)'));
      }
    }, 5000);
    
    ws.on('open', () => {
      // Step 1: Send authorize message immediately
      ws.send(JSON.stringify({
        authorize: token,
        req_id: 1
      }));
    });
    
    ws.on('message', (rawData: string) => {
      try {
        const response = JSON.parse(rawData);
        const reqId = response.req_id;
        
        if (reqId === 1) {
          // Authorize response
          if (response.error) {
            isFinished = true;
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Auth failed: ${response.error.message}`));
            return;
          }
          
          // Step 2: Send buy contract request
          ws.send(JSON.stringify({
            buy: 1,
            parameters: {
              contract_type: contractType,
              symbol: symbol,
              amount: amount,
              duration: duration,
              duration_unit: durationUnit,
              basis: 'stake'
            },
            req_id: 2
          }));
        } else if (reqId === 2) {
          // Buy contract response
          isFinished = true;
          clearTimeout(timeout);
          ws.close();
          
          if (response.error) {
            reject(new Error(`Buy contract failed: ${response.error.message}`));
          } else {
            resolve(response.buy);
          }
        }
      } catch (err) {
        isFinished = true;
        clearTimeout(timeout);
        ws.close();
        reject(err);
      }
    });
    
    ws.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for webhook trigger
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Get data from payload body or query params
  const body = req.body || {};
  const query = req.query || {};

  const token = (body.token || body.deriv_token || query.token || query.deriv_token) as string | undefined;
  const userId = (body.user_id || query.user_id) as string | undefined;
  const email = (body.email || query.email) as string | undefined;

  const rawSymbol = (body.symbol || query.symbol) as string | undefined;
  const rawAction = (body.action || body.contract_type || query.action || query.contract_type) as string | undefined;
  
  const amount = Number(body.amount || query.amount || 1);
  const duration = Number(body.duration || query.duration || 5);
  const durationUnit = (body.duration_unit || query.duration_unit || 't') as string;

  if (!rawSymbol) {
    return res.status(400).json({ error: 'Missing required field: symbol' });
  }
  if (!rawAction) {
    return res.status(400).json({ error: 'Missing required field: action (buy/sell or CALL/PUT)' });
  }

  const symbol = normalizeSymbol(rawSymbol);
  const contractType = normalizeAction(rawAction);

  let finalToken = token;
  let finalUserId = userId;

  // Resolve token and userId via Supabase if needed
  if (!finalToken && (userId || email)) {
    if (!supabaseUrl) {
      return res.status(500).json({ error: 'Supabase configuration is missing on server.' });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      let queryBuilder = supabase.from('profiles').select('id, deriv_token');
      
      if (userId) {
        queryBuilder = queryBuilder.eq('id', userId);
      } else if (email) {
        queryBuilder = queryBuilder.eq('email', email);
      }

      const { data, error } = await queryBuilder.single();
      
      if (error || !data) {
        return res.status(404).json({ error: `User profile not found. details: ${error?.message || 'Unknown'}` });
      }

      finalToken = data.deriv_token;
      finalUserId = data.id;

      if (!finalToken) {
        return res.status(400).json({ error: 'User does not have a stored Deriv token. Save your token in settings first.' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Error querying Supabase database', detail: String(err) });
    }
  }

  // If we still don't have a token, we cannot execute the trade
  if (!finalToken) {
    return res.status(400).json({ 
      error: 'Authentication failed. Please supply a Deriv "token" in the payload or configure your stored token.' 
    });
  }

  // Execute trade
  try {
    const buyResult = await executeTrade(finalToken, symbol, contractType, amount, duration, durationUnit);
    
    // Log the trade to Supabase if we have a userId
    if (finalUserId && supabaseUrl) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('trades').insert([{
          user_id: finalUserId,
          symbol: symbol,
          contract_type: contractType,
          type: contractType === 'CALL' ? 'buy' : 'sell',
          amount: amount,
          deriv_contract_id: String(buyResult.contract_id),
          status: 'open',
          entry_price: buyResult.price
        }]);
      } catch (logErr) {
        console.error('Failed to log trade to Supabase:', logErr);
        // Do not fail the response if database logging fails, trade already executed!
      }
    }

    return res.status(200).json({
      success: true,
      message: `Trade placed successfully: ${contractType} on ${symbol}`,
      symbol,
      contract_type: contractType,
      amount,
      contract_id: buyResult.contract_id,
      price: buyResult.price,
      payout: buyResult.payout
    });
  } catch (tradeErr: any) {
    return res.status(500).json({
      success: false,
      error: tradeErr.message || 'Trade execution failed.'
    });
  }
}
