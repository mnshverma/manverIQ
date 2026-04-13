import streamlit as st
import pandas as pd
import warnings
warnings.filterwarnings('ignore')
import time

try:
    from nselib import capital_market
    print("nselib loaded successfully")
except Exception as e:
    print(f"nselib import error: {e}")
    capital_market = None

try:
    from nsetools import nse
    nse_stock = nse.Nse()
except:
    nse_stock = None

try:
    import nsepython
except:
    nsepython = None

st.set_page_config(
    page_title="ManverIQ - Stock Research",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

GROWW_GREEN = '#00D09C'
GROWW_RED = '#EB5B3C'
BG_DARK = '#0D1117'
CARD_BG = '#161B22'
TEXT_PRIMARY = '#E6EDF3'
TEXT_SECONDARY = '#8B949E'

st.markdown(f"""
<style>
    .stApp {{
        background-color: {BG_DARK};
    }}
    .stSidebar {{
        background-color: {CARD_BG};
    }}
    div[data-testid="stMetric"] {{
        background-color: {CARD_BG};
        padding: 15px;
        border-radius: 10px;
    }}
    .positive {{ color: {GROWW_GREEN}; }}
    .negative {{ color: {GROWW_RED}; }}
    .stock-card {{
        background-color: {CARD_BG};
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        border: 1px solid #30363D;
    }}
    .stock-card:hover {{
        border-color: {GROWW_GREEN};
    }}
    h1, h2, h3 {{
        color: {TEXT_PRIMARY};
    }}
    .stTextInput>div>div>input {{
        background-color: {CARD_BG};
        color: {TEXT_PRIMARY};
    }}
</style>
""", unsafe_allow_html=True)

def get_top_movers_nselib():
    if not capital_market:
        return None
    try:
        with st.spinner('Loading market data...'):
            nifty_50 = capital_market.nifty50_equity_list()
            df = pd.DataFrame(nifty_50)
            df = df.sort_values('pctChange', ascending=False)
            return df
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return None

def get_quote_nselib(symbol):
    if not capital_market:
        return None
    try:
        quote = capital_market.nifty50_equity_list()
        df = pd.DataFrame(quote)
        stock = df[df['symbol'] == symbol.upper()]
        if not stock.empty:
            return stock.iloc[0].to_dict()
        return None
    except:
        return None

def get_historical_nselib(symbol):
    try:
        from nselib import capital_market
        hist = capital_market.nifty_historical_data(symbol=symbol, series='EQ')
        if hist:
            df = pd.DataFrame(hist)
            return df.tail(100)
        return None
    except:
        return None

def search_stocks(query):
    if not capital_market:
        return pd.DataFrame()
    try:
        quote = capital_market.nifty50_equity_list()
        df = pd.DataFrame(quote)
        matches = df[
            df['symbol'].str.lower().str.contains(query.lower(), na=False) |
            df['companyName'].str.lower().str.contains(query.lower(), na=False)
        ]
        return matches[['symbol', 'companyName']].head(10)
    except:
        return pd.DataFrame()

def format_change(change):
    if change > 0:
        return f"+{change:.2f}%"
    return f"{change:.2f}%"

def calculate_rsi(prices, period=14):
    try:
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    except:
        return None

def show_stock_card(symbol, name, price, change, volume=None):
    color_class = "positive" if change >= 0 else "negative"
    st.markdown(f"""
    <div class="stock-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:bold; font-size:16px; color:{TEXT_PRIMARY};">{symbol}</div>
                <div style="color:{TEXT_SECONDARY}; font-size:12px;">{name}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:18px; font-weight:bold; color:{TEXT_PRIMARY};">₹{price}</div>
                <div class="{color_class}" style="font-weight:bold;">{format_change(change)}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

def main():
    with st.sidebar:
        st.title("📈 ManverIQ")
        st.markdown("---")
        
        st.markdown("### 🔍 Search")
        search_query = st.text_input("Search", placeholder="RELIANCE, TCS...")
        
        st.markdown("---")
        st.markdown("### 📊 Market")
        st.success("● Market Open")
        
        st.markdown("---")
        st.markdown("### ℹ️ Info")
        st.markdown("""
        <small>
        - Data from NSE India<br>
        - Using nselib, nsetools<br>
        - Research only<br>
        - Not financial advice
        </small>
        """, unsafe_allow_html=True)
    
    col_main1, col_main2 = st.columns([2, 1])
    
    with col_main1:
        st.title("📈 ManverIQ")
        st.subheader("Stock Research & Prediction Platform")
    
    if search_query:
        results = search_stocks(search_query)
        if not results.empty:
            st.markdown("### Search Results")
            for _, row in results.iterrows():
                if st.button(f"**{row['symbol']}** - {row['companyName']}", key=row['symbol']):
                    st.session_state.selected_stock = row['symbol']
                    st.rerun()
        else:
            st.warning("No results found")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🔼 Top Gainers")
        df = get_top_movers_nselib()
        if df is not None:
            gainers = df.head(10)
            for _, row in gainers.iterrows():
                show_stock_card(
                    row.get('symbol', ''),
                    row.get('companyName', ''),
                    row.get('lastPrice', 0),
                    float(row.get('pctChange', 0))
                )
    
    with col2:
        st.markdown("### 🔽 Top Losers")
        if df is not None:
            losers = df.tail(10)
            for _, row in losers.iterrows():
                show_stock_card(
                    row.get('symbol', ''),
                    row.get('companyName', ''),
                    row.get('lastPrice', 0),
                    float(row.get('pctChange', 0))
                )
    
    st.markdown("---")
    st.markdown("### 📊 Weekly Opportunities")
    
    if df is not None:
        df_filtered = df[
            (df['pctChange'] > 2) | 
            (df['pctChange'] < -2)
        ].head(10)
        
        for _, row in df_filtered.iterrows():
            change = float(row.get('pctChange', 0))
            st.markdown(f"""
            <div class="stock-card">
                <div style="display:flex; justify-content:space-between;">
                    <span style="font-weight:bold;">{row.get('symbol')}</span>
                    <span class="{'positive' if change > 0 else 'negative'}">{format_change(change)}</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    if 'selected_stock' in st.session_state:
        symbol = st.session_state.selected_stock
        st.markdown(f"### 📌 {symbol} Analysis")
        
        with st.spinner(f'Loading {symbol} data...'):
            quote = get_quote_nselib(symbol)
            
        if quote:
            c1, c2, c3, c4 = st.columns(4)
            with c1:
                st.metric("Price", f"₹{quote.get('lastPrice', 0)}", format_change(quote.get('pctChange', 0)))
            with c2:
                st.metric("High", f"₹{quote.get('high', 0)}")
            with c3:
                st.metric("Low", f"₹{quote.get('low', 0)}")
            with c4:
                st.metric("Open", f"₹{quote.get('open', 0)}")
            
            st.markdown("#### Technical Analysis")
            st.info("RSI, MACD, Bollinger Bands - Coming soon")
            
            st.markdown("#### Prediction Engine")
            st.info("Entry, Stop Loss, Targets - Coming soon")
        
        if st.button("Clear Selection"):
            st.session_state.pop('selected_stock', None)
            st.rerun()
    
    st.markdown("---")
    st.markdown(f"""
    <div style="text-align:center; color:{TEXT_SECONDARY}; padding:20px;">
        <p>ManverIQ - Stock Research Platform</p>
        <p style="font-size:12px;">Data: NSE India (nselib, nsetools, nsepython)</p>
        <p style="font-size:12px; color:#666;">⚠️ For research/education only. Not financial advice.</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
