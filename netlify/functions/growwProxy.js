const GROWW_API_BASE = 'https://groww.ai/api/v1';

const CACHE_TTL = 5 * 60 * 1000;
const CANDLE_CACHE_TTL = 15 * 60 * 1000;

const cache = {
  topGainers: { data: null, timestamp: 0 },
  topLosers: { data: null, timestamp: 0 },
  instruments: { data: null, timestamp: 0 }
};

function isCacheValid(cacheEntry, ttl = CACHE_TTL) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < ttl;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache[key] = { data, timestamp: Date.now() };
}

function getCache(key) {
  const entry = cache[key];
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

async function growwFetch(accessToken, endpoint, queryParams = {}) {
  const url = new URL(`${GROWW_API_BASE}${endpoint}`);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Groww API error: ${response.status}`);
  }

  return response.json();
}

async function getAccessToken() {
  const API_KEY = process.env.GROWW_API_KEY;
  const SECRET = process.env.GROWW_SECRET;
  const TOTP_TOKEN = process.env.GROWW_TOTP_TOKEN;
  const TOTP_SECRET = process.env.GROWW_TOTP_SECRET;

  if (!API_KEY) {
    throw new Error('GROWW_API_KEY not configured');
  }

  let accessToken;

  if (TOTP_TOKEN && TOTP_SECRET) {
    const TOTP = require('totp-generator');
    const totp = TOTP(TOTP_SECRET);
    
    const response = await fetch(`${GROWW_API_BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: TOTP_TOKEN, totp })
    });
    
    if (!response.ok) throw new Error('TOTP authentication failed');
    const data = await response.json();
    accessToken = data.access_token;
  } else if (SECRET) {
    const response = await fetch(`${GROWW_API_BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, secret: SECRET })
    });
    
    if (!response.ok) throw new Error('API Key/Secret authentication failed');
    const data = await response.json();
    accessToken = data.access_token;
  } else {
    throw new Error('Provide either TOTP_TOKEN+TOTP_SECRET or API_KEY+SECRET');
  }

  return accessToken;
}

exports.handler = async (event) => {
  const { action, symbol, exchange, segment, interval, startTime, endTime } = event.queryStringParameters || {};
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (authError) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: authError.message }) };
  }

  try {
    let responseData;

    switch (action) {
      case 'quote':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const quoteCacheKey = `quote_${symbol}`;
        const cachedQuote = getCache(quoteCacheKey);
        if (cachedQuote) {
          return { statusCode: 200, headers, body: JSON.stringify(cachedQuote) };
        }

        const growwSymbol = exchange ? `NSE-${symbol}` : `NSE-${symbol}`;
        
        const quoteResponse = await growwFetch(accessToken, '/live/quote', {
          exchange_trading_symbols: `${exchange || 'NSE'}_${symbol}`,
          segment: segment || 'CASH'
        });
        
        setCache(quoteCacheKey, quoteResponse);
        responseData = quoteResponse;
        break;

      case 'ohlc':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const ohlcResponse = await growwFetch(accessToken, '/live/ohlc', {
          exchange_trading_symbols: `${exchange || 'NSE'}_${symbol}`,
          segment: segment || 'CASH'
        });
        responseData = ohlcResponse;
        break;

      case 'ltp':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const ltpResponse = await growwFetch(accessToken, '/live/ltp', {
          exchange_trading_symbols: `${exchange || 'NSE'}_${symbol}`,
          segment: segment || 'CASH'
        });
        responseData = ltpResponse;
        break;

      case 'candle':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const candleCacheKey = `candle_${symbol}_${interval || '1d'}`;
        const cachedCandles = getCache(candleCacheKey);
        
        if (cachedCandles) {
          return { statusCode: 200, headers, body: JSON.stringify(cachedCandles) };
        }

        const endTimeMs = endTime ? parseInt(endTime) : Math.floor(Date.now() * 1000);
        const startTimeMs = startTime ? parseInt(startTime) : endTimeMs - (100 * 24 * 60 * 60 * 1000);
        
        const candleResponse = await growwFetch(accessToken, '/historical/candle', {
          trading_symbol: symbol,
          exchange: exchange || 'NSE',
          segment: segment || 'CASH',
          start_time: startTimeMs,
          end_time: endTimeMs,
          interval_in_minutes: interval || '1D'
        });
        
        setCache(candleCacheKey, candleResponse, CANDLE_CACHE_TTL);
        responseData = candleResponse;
        break;

      case 'search':
        const query = event.queryStringParameters?.q;
        if (!query) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query required' }) };
        }
        
        if (!cache.instruments.data) {
          const instrumentsResponse = await growwFetch(accessToken, '/instruments');
          cache.instruments = { data: instrumentsResponse, timestamp: Date.now() };
        }
        
        const instruments = cache.instruments.data;
        const searchResults = instruments.filter(i => 
          i.trading_symbol?.toLowerCase().includes(query.toLowerCase()) ||
          i.name?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10).map(i => ({
          symbol: i.trading_symbol,
          name: i.name,
          exchange: i.exchange,
          segment: i.segment,
          groww_symbol: i.groww_symbol,
          instrument_type: i.instrument_type
        }));
        
        responseData = searchResults;
        break;

      case 'optionChain':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const expiry = event.queryStringParameters?.expiry;
        if (!expiry) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Expiry date required (YYYY-MM-DD)' }) };
        }
        
        const optionChainResponse = await growwFetch(accessToken, '/live/option_chain', {
          exchange: exchange || 'NSE',
          underlying: symbol,
          expiry_date: expiry
        });
        responseData = optionChainResponse;
        break;

      case 'greeks':
        if (!symbol || !event.queryStringParameters?.expiry || !event.queryStringParameters?.strike) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol, expiry, and strike required' }) };
        }
        
        const greeksResponse = await growwFetch(accessToken, '/live/greeks', {
          exchange: exchange || 'NSE',
          underlying: symbol,
          trading_symbol: event.queryStringParameters.tradeSymbol,
          expiry: event.queryStringParameters.expiry
        });
        responseData = greeksResponse;
        break;

      case 'topMovers':
        const cachedMovers = getCache('topMovers');
        if (cachedMovers) {
          return { statusCode: 200, headers, body: JSON.stringify(cachedMovers) };
        }
        
        if (!cache.instruments.data) {
          const instrumentsResponse = await growwFetch(accessToken, '/instruments');
          cache.instruments = { data: instrumentsResponse, timestamp: Date.now() };
        }
        
        const instrumentsList = cache.instruments.data.filter(i => i.segment === 'CASH' && i.exchange === 'NSE');
        const symbolsToFetch = instrumentsList.slice(0, 100).map(i => `NSE_${i.trading_symbol}`);
        
        const quotesResponse = await growwFetch(accessToken, '/live/quote', {
          exchange_trading_symbols: symbolsToFetch.join(','),
          segment: 'CASH'
        });
        
        const quotesArray = Object.entries(quotesResponse).map(([key, value]) => ({
          symbol: key.replace('NSE_', ''),
          ...value
        }));
        
        const sortedByChange = quotesArray.sort((a, b) => (b.day_change_perc || 0) - (a.day_change_perc || 0));
        
        const topMovers = {
          gainers: sortedByChange.slice(0, 10).map(q => ({
            symbol: q.symbol,
            name: instrumentsList.find(i => i.trading_symbol === q.symbol)?.name || q.symbol,
            price: q.last_price,
            change: q.day_change_perc,
            volume: q.volume,
            high: q.ohlc?.high,
            low: q.ohlc?.low
          })),
          losers: sortedByChange.slice(-10).reverse().map(q => ({
            symbol: q.symbol,
            name: instrumentsList.find(i => i.trading_symbol === q.symbol)?.name || q.symbol,
            price: q.last_price,
            change: q.day_change_perc,
            volume: q.volume,
            high: q.ohlc?.high,
            low: q.ohlc?.low
          }))
        };
        
        setCache('topMovers', topMovers);
        responseData = topMovers;
        break;

      default:
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Invalid action',
            available: ['quote', 'ohlc', 'ltp', 'candle', 'search', 'optionChain', 'greeks', 'topMovers']
          }) 
        };
    }

    return { statusCode: 200, headers, body: JSON.stringify(responseData) };

  } catch (error) {
    console.error('Groww Proxy Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};