// Deriv API WebSocket client
export class DerivAPI {
  private ws: WebSocket | null = null
  private isConnected = false
  private messageQueue: any[] = []
  private requestId = 0
  private callbacks: Map<number, (response: any) => void> = new Map()
  private connectResolve: (() => void) | null = null
  private connectReject: ((e: any) => void) | null = null

  constructor(private appId: string) {}

  connect(): Promise<void> {
    // If already open, resolve immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Close any stale socket
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      try {
        // Use the correct Deriv WS endpoint
        this.ws = new WebSocket(
          `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}&l=EN&brand=deriv`
        );

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('[DerivAPI] Connected');
          // Flush queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.ws?.send(JSON.stringify(msg));
          }
          this.connectResolve?.();
          this.connectResolve = null;
          this.connectReject = null;
        };

        this.ws.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            if (response.req_id && this.callbacks.has(response.req_id)) {
              const cb = this.callbacks.get(response.req_id)!;
              this.callbacks.delete(response.req_id);
              cb(response);
            }
          } catch (e) {
            console.error('[DerivAPI] Failed to parse message', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[DerivAPI] WebSocket error:', error);
          this.connectReject?.(new Error('WebSocket connection failed'));
          this.connectResolve = null;
          this.connectReject = null;
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[DerivAPI] Disconnected');
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.connectReject) {
            this.connectReject(new Error('Connection timeout'));
            this.connectResolve = null;
            this.connectReject = null;
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const reqId = ++this.requestId
      const message = { ...request, req_id: reqId }
      
      this.callbacks.set(reqId, (response) => {
        if (response.error) {
          reject(new Error(response.error.message))
        } else {
          resolve(response)
        }
      })

      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify(message))
      } else {
        this.messageQueue.push(message)
      }
    })
  }

  // Get market data for synthetic indices
  async getTicks(symbol: string): Promise<any> {
    return this.sendRequest({
      ticks: symbol,
      subscribe: 1
    })
  }

  // Get available symbols
  async getActiveSymbols(): Promise<any> {
    return this.sendRequest({
      active_symbols: 'brief'
    })
  }

  // Authorize user with API token
  async authorize(token: string): Promise<any> {
    return this.sendRequest({
      authorize: token
    })
  }

  // Buy a contract
  async buyContract(contractType: string, symbol: string, amount: number, duration: number): Promise<any> {
    return this.sendRequest({
      buy: 1,
      parameters: {
        contract_type: contractType,
        symbol: symbol,
        amount: amount,
        duration: duration,
        duration_unit: 't', // ticks
        basis: 'stake'
      }
    })
  }

  // Get details of an active or completed contract
  async getContractInfo(contractId: number | string): Promise<any> {
    return this.sendRequest({
      proposal_open_contract: 1,
      contract_id: Number(contractId)
    })
  }

  // Get account balance
  async getBalance(): Promise<any> {
    return this.sendRequest({
      balance: 1,
      subscribe: 1
    })
  }

  // Get trading history
  async getStatement(limit = 50): Promise<any> {
    return this.sendRequest({
      statement: 1,
      description: 1,
      limit: limit
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }
}

// Predefined synthetic indices symbols
export const SYNTHETIC_INDICES = {
  'Volatility 10 Index': 'R_10',
  'Volatility 25 Index': 'R_25',
  'Volatility 50 Index': 'R_50',
  'Volatility 75 Index': 'R_75',
  'Volatility 100 Index': 'R_100',
  'Volatility 10 (1s) Index': '1HZ10V',
  'Volatility 25 (1s) Index': '1HZ25V',
  'Volatility 50 (1s) Index': '1HZ50V',
  'Volatility 75 (1s) Index': '1HZ75V',
  'Volatility 100 (1s) Index': '1HZ100V',
  'Crash 300 Index': 'CRASH300N',
  'Crash 500 Index': 'CRASH500',
  'Crash 1000 Index': 'CRASH1000',
  'Boom 300 Index': 'BOOM300N',
  'Boom 500 Index': 'BOOM500',
  'Boom 1000 Index': 'BOOM1000',
  'Step Index': 'STEPINDEX',
  'Jump 10 Index': 'JD10',
  'Jump 25 Index': 'JD25',
  'Jump 50 Index': 'JD50',
  'Jump 75 Index': 'JD75',
  'Jump 100 Index': 'JD100'
}

// Initialize Deriv API instance
export const derivAPI = new DerivAPI(import.meta.env.VITE_DERIV_APP_ID || '33MJcHX2yZOr6lkeIP9Mg')