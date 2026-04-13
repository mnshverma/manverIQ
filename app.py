import streamlit as st
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

try:
    from nsetools import nse
    nse_stock = nse.Nse()
except:
    nse_stock = None

st.set_page_config(
    page_title="ManverIQ - Stock Market", 
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Groww-inspired colors
GREEN = '#00D09C'
RED = '#EB5B3C'
BG = '#0D1117'
CARD = '#161B22'
TEXT = '#E6EDF3'
TEXT_DIM = '#8B949E'
BORDER = '#30363D'

st.markdown(f"""
<style>
    /* Main app background */
    .stApp {{
        background-color: {BG};
    }}
    
    /* Sidebar */
    section[data-testid="stSidebar"] {{
        background-color: {CARD};
        border-right: 1px solid {BORDER};
    }}
    
    /* Cards */
    .stock-card {{
        background-color: {CARD};
        border: 1px solid {BORDER};
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        transition: all 0.2s;
    }}
    .stock-card:hover {{
        border-color: {GREEN};
        transform: translateY(-2px);
    }}
    
    /* Positive/Negative colors */
    .pos {{ color: {GREEN}; }}
    .neg {{ color: {RED}; }}
    
    /* Headings */
    h1, h2, h3, h4 {{
        color: {TEXT} !important;
    }}
    
    /* Buttons */
    .stButton>button {{
        background-color: {GREEN};
        color: white;
        border-radius: 8px;
        border: none;
    }}
    .stButton>button:hover {{
        background-color: #00B88A;
    }}
    
    /* Metrics */
    div[data-testid="stMetric"] {{
        background-color: {CARD};
        padding: 15px;
        border-radius: 10px;
        border: 1px solid {BORDER};
    }}
    
    /* Input fields */
    .stTextInput>div>div>input {{
        background-color: {CARD};
        color: {TEXT};
        border: 1px solid {BORDER};
    }}
    
    /* Tabs */
    .stTabs {{
        background-color: {CARD};
        border-radius: 12px;
        padding: 10px;
    }}
    
    /* Expanders */
    .streamlit-expander {{
        background-color: {CARD};
        border-radius: 12px;
    }}
    
    /* Scrollable container */
    .scroll-card {{
        max-height: 500px;
        overflow-y: auto;
        padding-right: 10px;
    }}
    .scroll-card::-webkit-scrollbar {{
        width: 6px;
    }}
    .scroll-card::-webkit-scrollbar-track {{
        background: {CARD};
    }}
    .scroll-card::-webkit-scrollbar-thumb {{
        background: {BORDER};
        border-radius: 3px;
    }}
    
    /* Responsive layout */
    @media (max-width: 768px) {{
        .stApp {{
            padding: 10px;
        }}
    }}
</style>
""", unsafe_allow_html=True)

def get_top_movers():
    if not nse_stock:
        return None, None
    try:
        gainers = nse_stock.get_top_gainers()
        losers = nse_stock.get_top_losers()
        return gainers, losers
    except Exception as e:
        st.error(f"Error: {e}")
        return None, None

def get_stock_quote(symbol):
    if not nse_stock:
        return None
    try:
        return nse_stock.get_quote(symbol.upper())
    except:
        return None

def format_change(val):
    if val is None:
        return "0.00%"
    val = float(val)
    if val > 0:
        return f"+{val:.2f}%"
    return f"{val:.2f}%"

def main():
    # Sidebar
    with st.sidebar:
        st.markdown("""
        <div style="text-align:center; padding: 20px 0;">
            <h1 style="margin:0 !important;">📈 ManverIQ</h1>
            <p style="color:#8B949E;">Stock Market Research</p>
        </div>
        """, unsafe_allow_html=True)
        st.markdown("---")
        
        # Market status
        try:
            ind = nse_stock.get_index_quote("NIFTY 50")
            nifty_val = ind.get('lastPrice', 0)
            nifty_chg = ind.get('pctChange', 0)
            st.markdown(f"""
            <div style="background:{CARD}; padding:15px; border-radius:12px; text-align:center;">
                <p style="color:#8B949E; margin:0;">NIFTY 50</p>
                <h2 style="margin:5px 0;">{nifty_val:,}</h2>
                <p class="{'pos' if nifty_chg >= 0 else 'neg'}" style="font-weight:bold;">{format_change(nifty_chg)}</p>
            </div>
            """, unsafe_allow_html=True)
        except:
            st.success("📊 Market Open")
        
        st.markdown("---")
        
        # Navigation
        st.markdown("### 📂 Menu")
        menu = st.radio("Go to", ["🏠 Dashboard", "🔍 Search", "📊 Nifty 50", "ℹ️ About"])
        
        st.markdown("---")
        st.markdown("""
        <div style="color:#8B949E; font-size:12px; text-align:center;">
            <p>Data: NSE India</p>
            <p>⚠️ For research only</p>
            <p>Not financial advice</p>
        </div>
        """, unsafe_allow_html=True)
    
    # Main content
    if menu == "🏠 Dashboard":
        st.title("📈 ManverIQ")
        st.subheader("Stock Market Dashboard")
        
        gainers, losers = get_top_movers()
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### 🔼 Top Gainers")
            if gainers:
                for s in gainers[:10]:
                    pc = float(s.get('pctChange', 0))
                    st.markdown(f"""
                    <div class="stock-card" onclick="window.location.href='?symbol={s.get('symbol')}'">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-weight:bold; font-size:16px;">{s.get('symbol','')}</div>
                                <div style="color:#8B949E; font-size:12px;">{s.get('companyName','')}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:16px;font-weight:bold;">₹{s.get('lastPrice',0)}</div>
                                <div class="pos" style="font-weight:bold;">{format_change(pc)}</div>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("### 🔽 Top Losers")
            if losers:
                for s in losers[:10]:
                    pc = float(s.get('pctChange', 0))
                    st.markdown(f"""
                    <div class="stock-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-weight:bold; font-size:16px;">{s.get('symbol','')}</div>
                                <div style="color:#8B949E; font-size:12px;">{s.get('companyName','')}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:16px;font-weight:bold;">₹{s.get('lastPrice',0)}</div>
                                <div class="neg" style="font-weight:bold;">{format_change(pc)}</div>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
        
        # Weekly movers
        st.markdown("---")
        st.markdown("### 📊 Weekly Movers (High Volatility)")
        
        if gainers and losers:
            movers = gainers[:5] + losers[:5]
            cols = st.columns(5)
            for i, s in enumerate(movers):
                pc = float(s.get('pctChange', 0))
                with cols[i % 5]:
                    st.markdown(f"""
                    <div class="stock-card" style="padding:10px; text-align:center;">
                        <div style="font-weight:bold;">{s.get('symbol','')}</div>
                        <div class="{'pos' if pc >= 0 else 'neg'}">{format_change(pc)}</div>
                    </div>
                    """, unsafe_allow_html=True)
    
    elif menu == "🔍 Search":
        st.title("🔍 Search Stocks")
        
        query = st.text_input("Search", placeholder="Enter stock name or symbol...")
        
        if query:
            try:
                results = nse_stock.get_eq_symbol_list(query.upper())
                if results:
                    st.markdown("### Results")
                    for sym in results[:20]:
                        with st.container():
                            s = get_stock_quote(sym)
                            if s:
                                pc = float(s.get('pctChange', 0))
                                c1, c2 = st.columns([3,1])
                                with c1:
                                    st.markdown(f"**{s.get('symbol')}**")
                                    st.caption(s.get('companyName', ''))
                                with c2:
                                    st.markdown(f"₹{s.get('lastPrice',0)}")
                                    st.caption(f"""<span class="{'pos' if pc >= 0 else 'neg'}">{format_change(pc)}</span>""", unsafe_allow_html=True)
                                st.divider()
                else:
                    st.warning("No results found")
            except Exception as e:
                st.error(f"Search error: {e}")
    
    elif menu == "📊 Nifty 50":
        st.title("📊 Nifty 50 Constituents")
        
        try:
            ind_quotes = nse_stock.get_index_quote("NIFTY 50")
            if ind_quotes:
                st.dataframe(pd.DataFrame(ind_quotes), use_container_width=True)
        except:
            st.info("Loading...")
    
    elif menu == "ℹ️ About":
        st.title("ℹ️ About ManverIQ")
        
        st.markdown(f"""
        <div class="stock-card">
            <h3>ManverIQ</h3>
            <p style="color:#8B949E;">Stock Market Research Platform</p>
            
            <h4>Features</h4>
            <ul style="color:#8B949E;">
                <li>Real-time NSE data</li>
                <li>Top Gainers/Losers</li>
                <li>Stock Search</li>
                <li>Technical Analysis (Coming Soon)</li>
                <li>Prediction Engine (Coming Soon)</li>
            </ul>
            
            <h4>Data Sources</h4>
            <p style="color:#8B949E;">NSE India via nsetools, nselib, nsepython</p>
            
            <h4>Disclaimer</h4>
            <p style="color:#8B949E;">⚠️ For research/education only. Not financial advice.</p>
        </div>
        """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()