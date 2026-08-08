// Deriv API WebSocket client
export class DerivAPI {
  private ws: WebSocket | null = null
  private isConnected = false
  private messageQueue: any[] = []
  private requestId = 0
  private callbacks: Map<number, (response: any) => void> = new Map()
  private currency = 'USD'

  constructor(private appId: string) {}

  connect(customWsUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = customWsUrl || `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          this.isConnected = true
          console.log('Connected to Deriv API')
          
          // Process queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()
            this.ws?.send(JSON.stringify(message))
          }
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          const response = JSON.parse(event.data)
          
          if (response.req_id && this.callbacks.has(response.req_id)) {
            const callback = this.callbacks.get(response.req_id)!
            callback(response)
            this.callbacks.delete(response.req_id)
          }
        }

        this.ws.onerror = (error) => {
          console.error('Deriv API WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.isConnected = false
          console.log('Disconnected from Deriv API')
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const reqId = ++this.requestId
      const message = { ...request, req_id: reqId }
      
      this.callbacks.set(reqId, (response) => {
        if (response.error) {
          const err: any = new Error(response.error.message)
          err.code = response.error.code
          err.details = response.error.details
          reject(err)
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
    const response = await this.sendRequest({
      authorize: token
    });
    if (response?.authorize?.currency) {
      this.currency = response.authorize.currency;
    }
    return response;
  }

  // Buy a contract (Proposal -> Buy)
  async buyContract(contractType: string, symbol: string, amount: number, duration: number, barrier?: string): Promise<any> {
    const req: any = {
      proposal: 1,
      contract_type: contractType,
      symbol: symbol,
      amount: amount,
      currency: this.currency,
      duration: duration,
      duration_unit: 't',
      basis: 'stake'
    };
    if (barrier || ['DIGITDIFF', 'DIGITMATCH', 'DIGITOVER', 'DIGITUNDER'].includes(contractType)) {
      req.barrier = barrier || '5';
    }
    const prop = await this.sendRequest(req);
    return this.sendRequest({
      buy: prop.proposal.id,
      price: prop.proposal.ask_price
    });
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