const GROWW_API_BASE = 'https://api.groww.in/v1';
const GROWW_API_KEY = process.env.GROWW_API_KEY;
const GROWW_API_SECRET = process.env.GROWW_API_SECRET;

let accessToken = null;  // Add semicolon - null was being parsed as string
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && accessToken.length > 20 && Date.now() < tokenExpiry) {
    console.log('Using cached token');
    return accessToken;
  }
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  console.log('Generating token, timestamp:', timestamp);
  console.log('API key prefix:', GROWW_API_KEY?.substring(0, 8));
  console.log('Secret exists:', !!GROWW_API_SECRET);
  
  const response = await fetch(`${GROWW_API_BASE}/token/api/access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROWW_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key_type: 'approval',
      checksum: GROWW_API_SECRET + timestamp,
      timestamp: timestamp
    })
  });
  
  const responseText = await response.text();
  console.log('Token response status:', response.status);
  console.log('Token response body:', responseText.substring(0, 500));
  
  if (!response.ok) {
    throw new Error(`Token generation failed: ${response.status} - ${responseText}`);
  }
  
  const data = JSON.parse(responseText);
  accessToken = data.token;
  tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
  console.log('Token generated successfully');
  return accessToken;
}

const CACHE_TTL = 5 * 60 * 1000;
const CANDLE_CACHE_TTL = 15 * 60 * 1000;

const cache = {
  topGainers: { data: null, timestamp: 0 },
  topLosers: { data: null, timestamp: 0 },
  instruments: { data: null, timestamp: 0 }
};

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

  console.log('Groww API Request:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'X-API-VERSION': '1.0'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    throw new Error(errorData.message || `Groww API error: ${response.status}`);
  }

  return response.json();
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

  if (!GROWW_API_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'GROWW_API_KEY not configured' }) };
  }

  try {
    const token = await getAccessToken();
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

        const quoteResponse = await growwFetch(token, '/live-data/quote', {
          exchange: 'NSE',
          segment: 'CASH',
          trading_symbol: symbol
        });
        
        setCache(quoteCacheKey, quoteResponse);
        responseData = quoteResponse;
        break;

      case 'ltp':
        if (!symbol) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Symbol required' }) };
        }
        
        const ltpResponse = await growwFetch(token, '/live-data/ltp', {
          segment: 'CASH',
          exchange_symbols: `NSE_${symbol}`
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

        const endTimeMs = endTime ? parseInt(endTime) : Math.floor(Date.now());
        const startTimeMs = startTime ? parseInt(startTime) : endTimeMs - (100 * 24 * 60 * 60 * 1000);
        
        const candleResponse = await growwFetch(token, '/historical/candle/range', {
          trading_symbol: symbol,
          exchange: exchange || 'NSE',
          segment: segment || 'CASH',
          start_time: startTimeMs,
          end_time: endTimeMs,
          interval: interval || '1d'
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
          const instrumentsResponse = await growwFetch(token, '/instruments');
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

      case 'topMovers': {
        const popularSymbols = [
          'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN', 'ITC', 'LT', 'HINDUNILVR',
          'ICICIBANK', 'BAJFINANCE', 'KOTAKBANK', 'AXISBANK', 'WIPRO', 'ADANIPORTS',
          'ASIANPAINT', 'MARUTI', 'TITAN', 'ULTRACEMCO', 'SUNPHARMA', 'ONGC'
        ];
        
        const ltpResponse = await growwFetch(token, '/live-data/ltp', {
          segment: 'CASH',
          exchange_symbols: 'NSE_' + popularSymbols.join(',NSE_')
        });
        
        const quotesArray = Object.entries(ltpResponse).map(([key, value]) => ({
          symbol: key.replace('NSE:', ''),
          ...value
        })).filter(q => q.last_price > 0);
        
        const sortedByChange = quotesArray.sort((a, b) => (b.day_change_perc || 0) - (a.day_change_perc || 0));
        
        responseData = {
          gainers: sortedByChange.slice(0, 10).map(q => ({
            symbol: q.symbol,
            name: q.symbol,
            price: q.last_price,
            change: q.day_change_perc,
            volume: q.volume
          })),
          losers: sortedByChange.slice(-10).reverse().map(q => ({
            symbol: q.symbol,
            name: q.symbol,
            price: q.last_price,
            change: q.day_change_perc,
            volume: q.volume
          }))
        };
        break;
      }

      case 'test':
        try {
          const testToken = await getAccessToken();
          responseData = { 
            status: 'ok', 
            hasToken: !!testToken,
            tokenPrefix: testToken ? testToken.substring(0, 15) + '...' : 'none',
            usingSecret: !!GROWW_API_SECRET
          };
        } catch (e) {
          responseData = { 
            status: 'error',
            envConfigured: !!GROWW_API_KEY,
            hasSecret: !!GROWW_API_SECRET,
            error: e.message
          };
        }
        break;

      default:
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ 
            error: 'Invalid action',
            available: ['quote', 'ltp', 'candle', 'search', 'topMovers', 'test']
          }) 
        };
    }

    return { statusCode: 200, headers, body: JSON.stringify(responseData) };

  } catch (error) {
    console.error('Groww Proxy Error:', error.message);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: error.message,
        hasApiKey: !!GROWW_API_KEY,
        hasSecret: !!GROWW_API_SECRET
      }) 
    };
  }
};