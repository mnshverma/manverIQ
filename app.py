import streamlit as st
import requests
import pandas as pd
from io import StringIO
from datetime import datetime, timedelta

st.set_page_config(page_title="ManverIQ", page_icon="📈", layout="wide")

COLOR_GREEN = "#00D09C"
COLOR_RED = "#EB5B3C"
COLOR_BG = "#0D1117"
COLOR_CARD = "#161B22"
COLOR_TEXT = "#E6EDF3"
COLOR_DIM = "#8B949E"
COLOR_BORDER = "#30363D"

st.markdown(f"""
<style>
    .stApp {{ background-color: {COLOR_BG}; }}
    [data-testid="stSidebar"] {{ background-color: {COLOR_CARD}; }}
    .card {{ background: {COLOR_CARD}; border: 1px solid {COLOR_BORDER}; border-radius: 12px; padding: 16px; margin: 8px 0; }}
    .card:hover {{ border-color: {COLOR_GREEN}; transform: translateY(-2px); }}
    .pos {{ color: {COLOR_GREEN}; font-weight: bold; }}
    .neg {{ color: {COLOR_RED}; font-weight: bold; }}
    .dim {{ color: {COLOR_DIM}; }}
    [data-testid="stMetric"] {{ background: {COLOR_CARD}; border-radius: 10px; }}
    h1, h2, h3 {{ color: {COLOR_TEXT} !important; }}
</style>
""", unsafe_allow_html=True)

POPULAR_STOCKS = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN', 'ITC', 'LT', 'HINDUNILVR',
    'ICICIBANK', 'BAJFINANCE', 'KOTAKBANK', 'AXISBANK', 'WIPRO', 'ADANIPORTS',
    'ASIANPAINT', 'MARUTI', 'TITAN', 'ULTRACEMCO', 'SUNPHARMA', 'ONGC', 'NTPC'
]

@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_bhavcopy():
    """Fetch NSE bhavcopy - FREE daily data"""
    try:
        # NSE bhavcopy CSV URL
        url = "https://archives.nseindia.com/products/content/sec_bhavdata_all.csv"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://www.nseindia.com/'
        }
        
        resp = requests.get(url, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            df = pd.read_csv(StringIO(resp.text))
            return df
    except Exception as e:
        print(f"Bhavcopy error: {e}")
    
    return None

@st.cache_data(ttl=60)
def fetch_live_nse():
    """Fetch from NSE's live market data endpoint"""
    try:
        # Try NSE live index API
        url = "https://api.nseindia.com/marketdata/current-prices"
        
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com/'
        }
        
        resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            return resp.json().get('data', [])
    except Exception as e:
        print(f"Live API error: {e}")
    
    return []

def get_stock_data(symbol):
    """Get stock data from bhavcopy"""
    df = fetch_bhavcopy()
    
    if df is not None and 'SYMBOL' in df.columns:
        stock = df[df['SYMBOL'] == symbol.upper()]
        if not stock.empty:
            row = stock.iloc[0]
            return {
                'symbol': row['SYMBOL'],
                'companyName': row['SYMBOL'],  # Use symbol as name
                'lastPrice': row['CLOSE'],
                'pctChange': ((row['CLOSE'] - row['PREVCLOSE']) / row['PREVCLOSE'] * 100) if row['PREVCLOSE'] > 0 else 0,
                'open': row['OPEN'],
                'dayHigh': row['HIGH'],
                'dayLow': row['LOW'],
                'previousClose': row['PREVCLOSE']
            }
    
    return None

def get_top_movers():
    """Get top gainers and losers from bhavcopy"""
    df = fetch_bhavcopy()
    
    if df is None or 'SYMBOL' not in df.columns:
        return [], []
    
    # Calculate % change
    df['pctChange'] = ((df['CLOSE'] - df['PREVCLOSE']) / df['PREVCLOSE'] * 100
    df = df[df['PREVCLOSE'] > 0]  # Filter valid rows
    
    # Sort by change
    df = df.sort_values('pctChange', ascending=False)
    
    gainers = df.head(15).to_dict('records')
    losers = df.tail(15).to_dict('records')
    
    # Format for display
    for g in gainers:
        g['symbol'] = g.get('SYMBOL', '')
        g['companyName'] = g.get('SYMBOL', '')
        g['lastPrice'] = g.get('CLOSE', 0)
    
    for l in losers:
        l['symbol'] = l.get('SYMBOL', '')
        l['companyName'] = l.get('SYMBOL', '')
        l['lastPrice'] = l.get('CLOSE', 0)
    
    return gainers, losers

def get_nifty():
    """Get Nifty from live API or return None"""
    data = fetch_live_nse()
    
    for obj in data:
        if obj.get('symbol', '') == 'NIFTY 50':
            return obj
    
    return None

def fmt_price(p):
    try:
        if p is None or p == '': return "₹--"
        return f"₹{float(p):,.2f}"
    except: return "₹--"

def fmt_change(v):
    try:
        if v is None or v == '': return "0.00%"
        v = float(v)
        return f"+{v:.2f}%" if v >= 0 else f"{v:.2f}%"
    except: return "0.00%"

def get_nifty():
    """Get Nifty 50 index"""
    data = fetch_nse_data()
    for obj in data:
        if obj.get('symbol', '') == 'NIFTY 50':
            return obj
    return None

def get_quote(sym):
    """Get stock quote"""
    return get_stock_data(sym)

def fmt_price(p):
    try:
        if p is None or p == '': return "₹--"
        return f"₹{float(p):,.2f}"
    except: return "₹--"

def fmt_change(v):
    try:
        if v is None or v == '': return "0.00%"
        v = float(v)
        return f"+{v:.2f}%" if v >= 0 else f"{v:.2f}%"
    except: return "0.00%"

def get_nifty():
    """Get Nifty 50 index"""
    data = fetch_live_nse()
    for obj in data:
        if obj.get('symbol', '') == 'NIFTY 50':
            return obj
    return None

# Sidebar
with st.sidebar:
    st.markdown("### 📈 ManverIQ")
    
    # Nifty index
    nifty = get_nifty()
    if nifty:
        chg = nifty.get('pctChange', 0)
        st.metric("NIFTY 50", fmt_price(nifty.get('lastPrice')), fmt_change(chg))
    else:
        st.caption("NSE data unavailable")
    
    st.markdown("---")
    page = st.radio("Menu", ["Dashboard", "Stock Details", "Search", "About"])
    
    st.markdown("---")
    st.caption("Data: NSE India (BhavCopy)\n⚠️ Delayed by 1 day")

# Main
if page == "Dashboard":
    st.title("📈 Dashboard")
    st.caption("Top NSE Gainers & Losers")
    
    gainers, losers = get_top_movers()
    
    if not gainers and not losers:
        st.warning("📊 NSE market data currently unavailable.")
        st.caption("The bhavcopy CSV is updated daily after market close. Please check back on trading days.")
    else:
        # Tabs for Gainers/Losers
        tab_g, tab_l = st.tabs(["🔼 Top Gainers", "🔽 Top Losers"])
        
        with tab_g:
            cols = st.columns(3)
            for i, s in enumerate(gainers[:15]):
                pc = s.get('pctChange', 0)
                qp = s.get('lastPrice', 0)
                with cols[i % 3]:
                    with st.container():
                        st.markdown(f"""
                        <div class="card">
                            <div style="display:flex; justify-content:space-between;">
                                <div>
                                    <strong>{s.get('symbol','')}</strong><br>
                                    <span class="dim" style="font-size:11px;">{str(s.get('companyName',''))[:25]}</span>
                                </div>
                                <div style="text-align:right;">
                                    <div>{fmt_price(qp)}</div>
                                    <div class="pos">{fmt_change(pc)}</div>
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
        
        with tab_l:
            cols = st.columns(3)
            for i, s in enumerate(losers[:15]):
                pc = s.get('pctChange', 0)
                qp = s.get('lastPrice', 0)
                with cols[i % 3]:
                    with st.container():
                        st.markdown(f"""
                        <div class="card">
                            <div style="display:flex; justify-content:space-between;">
                                <div>
                                    <strong>{s.get('symbol','')}</strong><br>
                                    <span class="dim" style="font-size:11px;">{str(s.get('companyName',''))[:25]}</span>
                                </div>
                                <div style="text-align:right;">
                                    <div>{fmt_price(qp)}</div>
                                    <div class="neg">{fmt_change(pc)}</div>
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
        
        # Weekly Movers
        st.markdown("---")
        st.subheader("📊 Weekly Movers")
        
        movers = (gainers[:5] if gainers else []) + (losers[:5] if losers else [])
        
        if movers:
            cols = st.columns(min(5, len(movers)))
            for i, s in enumerate(movers[:5]):
                if i < len(cols):
                    pc = s.get('pctChange', 0)
                    with cols[i]:
                        st.caption(f"**{s.get('symbol', '')}**\n{fmt_change(pc)}")

elif page == "Stock Details":
    st.title("📊 Stock Details")
    
    # Stock selector
    col_sel, _ = st.columns([1, 2])
    with col_sel:
        selected = st.selectbox("Select Stock", POPULAR_STOCKS, index=0)
    
    if selected:
        q = get_quote(selected)
        
        if q:
            # Overview tab
            st.markdown("### Overview")
            oc = st.columns(4)
            with oc[0]:
                st.metric("Price", fmt_price(q.get('lastPrice')), fmt_change(q.get('pctChange')))
            with oc[1]:
                st.metric("Open", fmt_price(q.get('open')))
            with oc[2]:
                st.metric("High", fmt_price(q.get('dayHigh')))
            with oc[3]:
                st.metric("Low", fmt_price(q.get('dayLow')))
            
            # More details
            st.markdown("### Details")
            dc = st.columns(3)
            with dc[0]:
                st.markdown(f"**Company:** {q.get('companyName', 'N/A')}")
                st.markdown(f"**Symbol:** {q.get('symbol')}")
            with dc[1]:
                st.markdown(f"**Previous Close:** {fmt_price(q.get('previousClose'))}")
                st.markdown(f"**VWAP:** {fmt_price(q.get('vwap'))}")
            with dc[2]:
                st.markdown(f"**52W High:** {fmt_price(q.get('high52'))}")
                st.markdown(f"**52W Low:** {fmt_price(q.get('low52'))}")
            
            # Technical analysis placeholder
            st.markdown("---")
            st.markdown("### 📈 Technical Analysis")
            st.info("RSI, MACD, Bollinger Bands - Coming Soon")
            
            # Prediction Engine placeholder
            st.markdown("---")
            st.markdown("### 🎯 Prediction Engine")
            st.info("Entry, Stop Loss, Targets - Coming Soon")
        else:
            st.error(f"Unable to fetch data for {selected}")

elif page == "Search":
    st.title("🔍 Search")
    
    q = st.text_input("Search stocks", placeholder="Type stock name or symbol...")
    
    if q:
        matches = [s for s in POPULAR_STOCKS if q.upper() in s]
        
        if matches:
            st.markdown("### Results")
            for sym in matches[:10]:
                s = get_quote(sym)
                if s:
                    pc = s.get('pctChange', 0)
                    st.markdown(f"""
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong>{sym}</strong><br>
                                <span class="dim">{s.get('companyName','')}</span>
                            </div>
                            <div style="text-align:right;">
                                <div>{fmt_price(s.get('lastPrice'))}</div>
                                <div class="{'pos' if float(pc) >= 0 else 'neg'}">{fmt_change(pc)}</div>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.warning("No results found")
    
    st.markdown("### Popular Stocks")
    cols = st.columns(6)
    for i, sym in enumerate(POPULAR_STOCKS[:24]):
        with cols[i % 6]:
            s = get_quote(sym)
            if s:
                pc = s.get('pctChange', 0)
                st.caption(f"**{sym}** {fmt_change(pc)}")

elif page == "About":
    st.title("ℹ️ About")
    
    st.markdown(f"""
    <div class="card">
        ### ManverIQ
        Stock Market Research Platform
        
        **Features:**
        - Real-time NSE data
        - Top Gainers/Losers
        - Stock Search
        - Technical Analysis (Coming Soon)
        - Prediction Engine (Coming Soon)
        
        **Data Source:** NSE India
        
        **Disclaimer:** ⚠️ For research/education only. Not financial advice.
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    pass