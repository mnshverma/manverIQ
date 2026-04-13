import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd

from netlify_functions import handler

try:
    from nselib import capital_market
except:
    capital_market = None

try:
    import nsepython
except:
    nsepython = None

try:
    from nsetools import nse
    nse_stock = nse.Nse()
except:
    nse_stock = None:
    if not capital_market:
        return None
    try:
        nifty_50 = capital_market.nifty五十()
        df = pd.DataFrame(nifty_50)
        df = df.sort_values('pctChange', ascending=False)
        
        gainers = []
        losers = []
        
        for _, row in df.head(10).iterrows():
            gainers.append({
                'symbol': row.get('symbol', ''),
                'name': row.get('companyName', row.get('symbol', '')),
                'price': float(row.get('lastPrice', 0)),
                'change': float(row.get('pctChange', 0))
            })
        
        for _, row in df.tail(10).iterrows():
            losers.append({
                'symbol': row.get('symbol', ''),
                'name': row.get('companyName', row.get('symbol', '')),
                'price': float(row.get('lastPrice', 0)),
                'change': float(row.get('pctChange', 0))
            })
        
        return {'gainers': gainers, 'losers': losers, 'source': 'nselib'}
    except Exception as e:
        return {'error': str(e), 'source': 'nselib'}

def get_top_movers_nsetools():
    if not nse_stock:
        return None
    try:
        gainers = []
        losers = []
        
        top_gain = nse_stock.get_top_gainers()
        for stock in top_gain[:10]:
            gainers.append({
                'symbol': stock.get('symbol', ''),
                'name': stock.get('companyName', stock.get('symbol', '')),
                'price': float(stock.get('lastPrice', 0)),
                'change': float(stock.get('pctChange', 0))
            })
        
        top_lose = nse_stock.get_top_losers()
        for stock in top_lose[:10]:
            losers.append({
                'symbol': stock.get('symbol', ''),
                'name': stock.get('companyName', stock.get('symbol', '')),
                'price': float(stock.get('lastPrice', 0)),
                'change': float(stock.get('pctChange', 0))
            })
        
        return {'gainers': gainers, 'losers': losers, 'source': 'nsetools'}
    except Exception as e:
        return {'error': str(e), 'source': 'nsetools'}

def get_top_movers_nsepython():
    if not nsepython:
        return None
    try:
        gainers = []
        losers = []
        
        gain = nsepython.nse_top_gainer()
        for stock in gain[:10]:
            gainers.append({
                'symbol': stock.get('symbol', stock.get('nseSymbol', '')),
                'name': stock.get('companyName', stock.get('symbol', '')),
                'price': float(stock.get('lastPrice', 0)),
                'change': float(stock.get('pctChange', 0))
            })
        
        lose = nsepython.nse_top_losers()
        for stock in lose[:10]:
            losers.append({
                'symbol': stock.get('symbol', stock.get('nseSymbol', '')),
                'name': stock.get('companyName', stock.get('symbol', '')),
                'price': float(stock.get('lastPrice', 0)),
                'change': float(stock.get('pctChange', 0))
            })
        
        return {'gainers': gainers, 'losers': losers, 'source': 'nsepython'}
    except Exception as e:
        return {'error': str(e), 'source': 'nsepython'}

def get_quote_nselib(symbol):
    if not capital_market:
        return None
    try:
        quote = capital_market.nifty五十()
        df = pd.DataFrame(quote)
        stock = df[df['symbol'] == symbol.upper()]
        
        if stock.empty:
            return None
        
        row = stock.iloc[0]
        return {
            'symbol': row.get('symbol'),
            'name': row.get('companyName'),
            'price': float(row.get('lastPrice', 0)),
            'change': float(row.get('pctChange', 0)),
            'open': float(row.get('open', 0)),
            'high': float(row.get('high', 0)),
            'low': float(row.get('low', 0)),
            'volume': int(row.get('turnOver', 0)),
            'source': 'nselib'
        }
    except:
        return None

def get_quote_nsetools(symbol):
    if not nse_stock:
        return None
    try:
        quote = nse_stock.get_quote(symbol.upper())
        if quote:
            return {
                'symbol': quote.get('symbol'),
                'name': quote.get('companyName'),
                'price': float(quote.get('lastPrice', 0)),
                'change': float(quote.get('pctChange', 0)),
                'open': float(quote.get('open', 0)),
                'high': float(quote.get('dayHigh', 0)),
                'low': float(quote.get('dayLow', 0)),
                'volume': int(quote.get('totalTradedVolume', 0)),
                'source': 'nsetools'
            }
        return None
    except:
        return None

def get_quote_nsepython(symbol):
    if not nsepython:
        return None
    try:
        quote = nsepython.nse_quote(symbol.upper())
        if quote:
            return {
                'symbol': symbol.upper(),
                'name': quote.get('companyName', symbol.upper()),
                'price': float(quote.get('lastPrice', 0)),
                'change': float(quote.get('pctChange', 0)),
                'open': float(quote.get('open', 0)),
                'high': float(quote.get('dayHigh', 0)),
                'low': float(quote.get('dayLow', 0)),
                'volume': int(quote.get('totalTradedVolume', 0)),
                'source': 'nsepython'
            }
        return None
    except:
        return None

def search_stocks_nselib(query):
    if not capital_market:
        return []
    try:
        quote = capital_market.nifty五十()
        df = pd.DataFrame(quote)
        matches = df[
            df['symbol'].str.lower().str.contains(query.lower(), na=False) |
            df['companyName'].str.lower().str.contains(query.lower(), na=False)
        ].head(10)
        
        results = []
        for _, row in matches.iterrows():
            results.append({
                'symbol': row.get('symbol'),
                'name': row.get('companyName')
            })
        return results
    except:
        return []

def handler(event, context):
    """
    Netlify Python function handler with CORS support.
    """
    action = event.get('queryStringParameters', {}).get('action', '')
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        response_data = {}
        
        if action == 'topMovers':
            sources = [
                get_top_movers_nselib,
                get_top_movers_nsetools,
                get_top_movers_nsepython
            ]
            
            for source in sources:
                result = source()
                if result and 'error' not in result:
                    response_data = result
                    break
            else:
                response_data = {'error': 'All sources failed'}
        
        elif action == 'quote':
            symbol = event.get('queryStringParameters', {}).get('symbol', '')
            if not symbol:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Symbol required'})}
            
            sources = [
                lambda: get_quote_nselib(symbol),
                lambda: get_quote_nsetools(symbol),
                lambda: get_quote_nsepython(symbol)
            ]
            
            for source in sources:
                quote = source()
                if quote:
                    response_data = quote
                    break
            else:
                response_data = {'error': 'Stock not found'}
        
        elif action == 'search':
            query = event.get('queryStringParameters', {}).get('q', '')
            if not query:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Query required'})}
            
            results = search_stocks_nselib(query)
            response_data = results if results else []
        
        elif action == 'test':
            libs_available = []
            if capital_market:
                libs_available.append('nselib')
            if nse_stock:
                libs_available.append('nsetools')
            if nsepython:
                libs_available.append('nsepython')
            
            response_data = {
                'status': 'ok',
                'libraries': libs_available
            }
        
        else:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Invalid action'})}
        
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(response_data)}
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
