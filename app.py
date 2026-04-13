import streamlit as st
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

try:
    from nsetools import nse
    nse_stock = nse.Nse()
except Exception as e:
    st.error(f"Error initializing: {e}")
    nse_stock = None

st.set_page_config(
    page_title="ManverIQ", 
    page_icon="📈",
    layout="wide",
    page_config_changed="false"
)

STYLES = """
<style>
    /* Base styles */
    .stApp {background-color: #0D1117;}
    
    /* Sidebar */
    [data-testid="stSidebar"] {background-color: #161B22 !important;}
    
    /* Cards grid */
    .card-grid {display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; padding: 10px;}
    .stock-card {
        background: #161B22; border: 1px solid #30363D;
        border-radius: 12px; padding: 16px;
        cursor: pointer; transition: all 0.2s;
    }
    .stock-card:hover {border-color: #00D09C; transform: translateY(-2px);}
    
    /* Colors */
    .pos {color: #00D09C !important;}
    .neg {color: #EB5B3C !important;}
    .text-dim {color: #8B949E;}
    
    /* Metrics */
    [data-testid="stMetric"] {background: #161B22 !important; border-radius: 10px;}
    
    /* Responsive */
    @media (max-width: 768px) {
        .card-grid {grid-template-columns: 1fr;}
        .stColumns {flex-direction: column !important;}
    }
</style>
"""
st.markdown(STYLES, unsafe_allow_html=True)

def get_top_movers():
    if not nse_stock:
        return [], []
    try:
        return nse_stock.get_top_gainers() or [], nse_stock.get_top_losers() or []
    except:
        return [], []

def get_quote(symbol):
    if not nse_stock:
        return None
    try:
        return nse_stock.get_quote(symbol.upper())
    except:
        return None

def get_index():
    if not nse_stock:
        return None
    try:
        return nse_stock.get_index_quote("NIFTY 50")
    except:
        return None

def format_price(p):
    try:
        return f"₹{float(p):,.2f}"
    except:
        return "₹0"

def format_change(val):
    try:
        v = float(val)
        return f"+{v:.2f}%" if v >= 0 else f"{v:.2f}%"
    except:
        return "0.00%"

def main():
    # Sidebar
    with st.sidebar:
        st.markdown("### 📈 ManverIQ")
        
        # Nifty 50 display
        ind = get_index()
        if ind:
            st.metric("NIFTY 50", format_price(ind.get('lastPrice')), format Change(ind.get('pctChange')))
        
        st.markdown("---")
        
        # Nav
        page = st.radio_navigation(
            "Menu",
            ["Dashboard", "Search", "About"]
        )
        
        st.markdown("---")
        st.caption("Data: NSE India\n⚠️ Research only")

    # Main content
    if page == "Dashboard":
        st.title("📈 Dashboard")
        
        gainers, losers = get_top_movers()
        
        if not gainers and not losers:
            st.error("Unable to load market data")
            return
        
        # Top Gainers
        st.subheader("🔼 Top Gainers")
        cols = st.columns(2)
        
        with cols[0]:
            st.markdown('<div class="card-grid">', unsafe_allow_html=True)
            for s in gainers[:10]:
                pc = s.get('pctChange', 0)
                st.markdown(f"""
                <div class="stock-card">
                    <div style="display:flex; justify-content:space-between;">
                        <div>
                            <strong>{s.get('symbol','')}</strong><br>
                            <span class="text-dim" style="font-size:12px;">{str(s.get('companyName',''))[:30]}</span>
                        </div>
                        <div style="text-align:right;">
                            <div>{format_price(s.get('lastPrice'))}</div>
                            <div class="pos"><strong>{format Change(pc)}</strong></div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        with cols[1]:
            st.markdown("### 🔽 Top Losers")
            for s in losers[:10]:
                pc = s.get('pctChange', 0)
                st.markdown(f"""
                <div class="stock-card">
                    <div style="display:flex; justify-content:space-between;">
                        <div>
                            <strong>{s.get('symbol','')}</strong><br>
                            <span class="text-dim" style="font-size:12px;">{str(s.get('companyName',''))[:30]}</span>
                        </div>
                        <div style="text-align:right;">
                            <div>{format_price(s.get('lastPrice'))}</div>
                            <div class="neg"><strong>{format Change(pc)}</strong></div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
    
    elif page == "Search":
        st.title("🔍 Search")
        
        q = st.text_input("Search stocks", placeholder="RELIANCE, TCS, HDFC...")
        
        if q and len(q) >= 2:
            # Show some popular stocks as suggestions
            popular = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN', 'ITC', 'LT', 'HINDUNILVR', 'ICICIBANK', 'BAJFINANCE']
            matches = [s for s in popular if q.upper() in s]
            
            st.markdown("### Suggestions")
            cols = st.columns(5)
            for i, sym in enumerate(matches[:10]):
                with cols[i % 5]:
                    s = get_quote(sym)
                    if s:
                        st.caption(f"**{sym}**")
    
    elif page == "About":
        st.title("ℹ️ About")
        
        st.markdown("""
        ### ManverIQ
        Stock Market Research Platform
        
        **Features:**
        - Real-time NSE data
        - Top Gainers/Losers
        - Stock Search
        
        **Data:** NSE India
        
        ⚠️ **Disclaimer:** For research only. Not financial advice.
        """)

if __name__ == "__main__":
    main()