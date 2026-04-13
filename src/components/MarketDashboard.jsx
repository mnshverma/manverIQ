import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Search, Loader2, BarChart3, Activity, Target, Clock, Trending, LineChart, Newspaper, Users, Flame, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { calculateTrend, formatMarketCap, formatPercentage, formatVolume, parseCandleData, generateHoldingPattern, generateNews, scanForWeeklyOpportunities } from '../utils/technicalAnalysis';

const API_BASE = '/.netlify/functions/growwProxy';

const popularStocks = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2856.45, change: 4.32 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3856.20, change: 3.18 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1685.30, change: 2.87 },
  { symbol: 'INFY', name: 'Infosys', price: 1456.75, change: 2.54 },
  { symbol: 'NIFTY 50', name: 'Nifty 50', price: 22567.80, change: 1.25 },
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 74850.25, change: 1.18 },
  { symbol: 'ITC', name: 'ITC Ltd', price: 425.60, change: 2.12 },
  { symbol: 'SBIN', name: 'State Bank of India', price: 765.80, change: -1.34 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1256.40, change: 1.85 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 425.30, change: -1.56 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 985.60, change: 0.95 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', price: 1785.90, change: 1.42 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports', price: 1256.30, change: -2.15 },
  { symbol: 'LT', name: 'Larsen & Toubro', price: 3256.80, change: 1.78 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1456.20, change: 2.34 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', price: 2856.40, change: -0.85 },
  { symbol: 'TITAN', name: 'Titan Company', price: 3125.60, change: -1.89 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: 6895.20, change: -2.98 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', price: 12560.30, change: 1.65 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', price: 1585.60, change: 0.75 },
  { symbol: 'TATASTEEL', name: 'Tata Steel', price: 165.80, change: -1.25 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', price: 895.40, change: -0.95 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2685.30, change: 0.45 },
  { symbol: 'DIVISLAB', name: 'Divis Laboratories', price: 4256.80, change: 2.15 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', price: 9856.40, change: -1.35 },
  { symbol: 'NTPC', name: 'NTPC Ltd', price: 385.60, change: 0.85 },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', price: 285.40, change: 0.65 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas', price: 285.60, change: -2.15 },
  { symbol: 'COALINDIA', name: 'Coal India', price: 485.30, change: -1.45 },
  { symbol: 'VEDL', name: 'Vedanta Ltd', price: 425.80, change: -3.25 },
  { symbol: 'ADANI', name: 'Adani Enterprises', price: 1285.40, change: -3.45 },
  { symbol: 'AXISBANK', name: 'Axis Bank', price: 985.60, change: 1.25 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', price: 1485.30, change: 0.95 },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', price: 285.60, change: -0.75 },
  { symbol: 'PNB', name: 'Punjab National Bank', price: 125.40, change: -1.85 },
  { symbol: 'CANBK', name: 'Canara Bank', price: 485.60, change: -0.65 },
  { symbol: 'BHEL', name: 'Bharat Heavy Electricals', price: 285.40, change: -2.45 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 785.60, change: 3.25 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', price: 4256.80, change: 1.85 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', price: 3285.40, change: -0.95 },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', price: 9856.20, change: 0.75 },
  { symbol: 'TVSMOTOR', name: 'TVS Motor', price: 2285.60, change: 2.15 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', price: 2856.40, change: 1.45 },
  { symbol: 'GRASIM', name: 'Grasim Industries', price: 2856.80, change: 0.85 },
  { symbol: 'SHREECEM', name: 'Shree Cement', price: 22856.40, change: -1.25 },
  { symbol: 'AMBUJACEM', name: 'Ambuja Cements', price: 585.60, change: -0.95 },
  { symbol: 'ACC', name: 'ACC Ltd', price: 2285.40, change: -0.75 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', price: 9856.40, change: -1.35 },
  { symbol: 'ADANIENSOL', name: 'Adani Energy Solutions', price: 1256.80, change: -2.85 },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy', price: 1485.60, change: -4.15 },
  { symbol: 'ADANITOTAL', name: 'Adani Total Gas', price: 856.40, change: -3.25 },
  { symbol: 'GAIL', name: 'GAIL India', price: 185.60, change: -1.15 },
  { symbol: 'BPCL', name: 'Bharat Petroleum', price: 385.40, change: -2.25 },
  { symbol: 'IOC', name: 'Indian Oil Corp', price: 145.80, change: -1.85 },
  { symbol: 'HINDPETRO', name: 'Hindustan Petroleum', price: 385.60, change: -2.45 },
  { symbol: 'CIPLA', name: 'Cipla Ltd', price: 1285.40, change: 0.65 },
  { symbol: 'DRREDDY', name: 'Dr Reddy Labs', price: 5856.80, change: 1.25 },
  { symbol: 'ZYDUSLIFE', name: 'Zydus Lifesciences', price: 985.60, change: 0.45 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', price: 6285.40, change: 1.85 },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare', price: 985.60, change: 2.15 },
  { symbol: 'METROPOLIS', name: 'Metropolis Healthcare', price: 1585.40, change: 0.75 },
  { symbol: 'LUPIN', name: 'Lupin Ltd', price: 1685.60, change: -0.85 },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma', price: 985.40, change: -1.15 },
  { symbol: 'GLENMARK', name: 'Glenmark Pharma', price: 885.60, change: -0.95 },
  { symbol: 'CADILAHC', name: 'Cadila Healthcare', price: 585.80, change: -1.25 },
  { symbol: 'TORNTPHARM', name: 'Torrent Pharma', price: 2285.40, change: 0.85 },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', price: 1485.60, change: 1.45 },
  { symbol: 'ICICIGI', name: 'ICICI Lombard', price: 1685.40, change: 1.25 },
  { symbol: 'BAJAJINS', name: 'Bajaj Insurance', price: 1585.60, change: 0.95 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', price: 685.40, change: 0.75 },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance', price: 1585.80, change: 1.85 },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Inv', price: 1285.60, change: 1.15 },
  { symbol: 'BAJJFINSV', name: 'Bajaj Finserv', price: 15856.40, change: -1.95 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance', price: 2285.60, change: 1.25 },
  { symbol: 'PGHH', name: 'Procter & Gamble', price: 15856.80, change: 0.45 },
  { symbol: 'COLPAL', name: 'Colgate Palmolive', price: 2856.40, change: 0.35 },
  { symbol: 'DABUR', name: 'Dabur India', price: 585.60, change: 0.55 },
  { symbol: 'MARICO', name: 'Marico Ltd', price: 625.40, change: 0.85 },
  { symbol: 'GODREJCP', name: 'Godrej Consumer', price: 1285.60, change: 0.75 },
  { symbol: 'TATACONSUM', name: 'Tata Consumer', price: 985.40, change: 1.15 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', price: 4285.60, change: 0.45 },
  { symbol: 'NESTLEIND', name: 'Nestle India', price: 22856.40, change: 0.25 },
  { symbol: 'RADICO', name: 'Radico Khaitan', price: 1585.80, change: 2.15 },
  { symbol: 'UBL', name: 'United Breweries', price: 4285.60, change: 1.25 },
  { symbol: 'ABFRL', name: 'Aditya Birla Fashion', price: 285.40, change: -2.15 },
  { symbol: 'DMART', name: 'Avenue Supermarts', price: 4585.60, change: 1.85 },
  { symbol: 'NYKAA', name: 'FSN E-Commerce', price: 185.60, change: -3.45 },
  { symbol: 'JUBLFOOD', name: 'Jubilant Foodworks', price: 585.40, change: -1.25 },
  { symbol: 'ZOMATO', name: 'Zomato Ltd', price: 185.80, change: -2.85 },
  { symbol: 'SWIGGY', name: 'Swiggy Ltd', price: 425.60, change: -4.15 },
  { symbol: 'PAYTM', name: 'One97 Communications', price: 485.40, change: -3.25 },
  { symbol: 'IRCTC', name: 'IRCTC Ltd', price: 985.60, change: 1.45 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2856.45, change: 4.32 },
  { symbol: 'HFCL', name: 'HFCL Ltd', price: 125.60, change: 2.15 },
  { symbol: 'VODAFONE', name: 'Vodafone Idea', price: 12.50, change: -5.25 },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi', price: 6856.40, change: 2.85 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3856.20, change: 3.18 },
  { symbol: 'TECHM', name: 'Tech Mahindra', price: 1285.60, change: 1.45 },
  { symbol: 'MPHASIS', name: 'Mphasis Ltd', price: 2285.40, change: 1.95 },
  { symbol: 'PERSISTENT', name: 'Persistent Systems', price: 1585.80, change: 2.65 },
  { symbol: 'COFORGE', name: 'Coforge Ltd', price: 5285.60, change: 3.15 },
  { symbol: 'LTIM', name: 'LTI Mindtree', price: 5285.40, change: 2.85 }
];

const generateMockCandles = (basePrice = 2800, days = 365) => {
  const candles = [];
  let price = basePrice;
  const startTime = Math.floor(Date.now() / 1000) - (days * 86400);
  
  for (let i = 0; i < days; i++) {
    const volatility = 0.02 + Math.random() * 0.03;
    const change = (Math.random() - 0.48) * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
    
    candles.push({
      time: startTime + (i * 86400),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000) + 10000000
    });
    
    price = close;
  }
  return candles;
};

export default function MarketDashboard() {
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetails, setStockDetails] = useState(null);
  const [candleData, setCandleData] = useState([]);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState('1M');
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [historicalPredictions, setHistoricalPredictions] = useState([]);
  const [holdingPattern, setHoldingPattern] = useState(null);
  const [news, setNews] = useState([]);
  const [weeklyOpportunities, setWeeklyOpportunities] = useState([]);
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, status: 'Closed', nextOpen: '' });

  const checkMarketStatus = () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = currentTime >= marketOpen && currentTime < marketClose;
    
    let status = 'Closed';
    let isOpen = false;
    let nextOpen = '';
    
    if (isWeekday) {
      if (isMarketHours) {
        status = 'Market Open';
        isOpen = true;
      } else if (currentTime < marketOpen) {
        status = 'Pre-Market';
        isOpen = false;
        const openTime = new Date(now);
        openTime.setHours(9, 15, 0);
        nextOpen = openTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      } else {
        status = 'Closed';
        isOpen = false;
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
          nextDay.setDate(nextDay.getDate() + 1);
        }
        nextOpen = nextDay.toLocaleDateString('en-IN', { weekday: 'short' }) + ' 9:15 AM';
      }
    } else {
      const nextWeekday = new Date(now);
      nextWeekday.setDate(nextWeekday.getDate() + 1);
      while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) {
        nextWeekday.setDate(nextWeekday.getDate() + 1);
      }
      nextOpen = nextWeekday.toLocaleDateString('en-IN', { weekday: 'short' }) + ' 9:15 AM';
    }
    
    setMarketStatus({ isOpen, status, nextOpen });
  };

  useEffect(() => {
    loadInitialData();
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedStock && chartContainerRef.current && candleData.length > 0) {
      initChart();
    }
  }, [selectedStock, chartTimeframe, candleData]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const loadInitialData = () => {
    const gainersList = popularStocks
      .filter(s => s.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);
    const losersList = popularStocks
      .filter(s => s.change <= 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5);
    setGainers(gainersList);
    setLosers(losersList);
    setWeeklyOpportunities(scanForWeeklyOpportunities(popularStocks));
  };

  const fetchTopMovers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}?action=topMovers`);
      if (response.ok) {
        const data = await response.json();
        if (data?.gainers) setGainers(data.gainers);
        if (data?.losers) setLosers(data.losers);
      }
    } catch (e) {
      console.log('Using mock data');
    }
    setLoading(false);
  };

  const fetchStockDetails = async (symbol) => {
    try {
      const quoteResponse = await fetch(`${API_BASE}?action=quote&symbol=${symbol}`);
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        return quoteData;
      }
    } catch (e) {
      console.log('Using mock quote data');
    }
    return null;
  };

  const fetchCandleData = async (symbol, days = 365) => {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (days * 86400);
      const response = await fetch(
        `${API_BASE}?action=candle&symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&interval=1D`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.candles) {
          return parseCandleData(data.candles);
        }
      }
    } catch (e) {
      console.log('Using mock candle data');
    }
    return null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const filtered = popularStocks.filter(s => 
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const selectStock = async (stock) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchResults([]);
    setLoading(true);
    
    const mockDetails = {
      high52: stock.price * 1.2,
      low52: stock.price * 0.75,
      marketCap: Math.floor(Math.random() * 15e12) + 1e12,
      pe: 15 + Math.random() * 30,
      sector: 'Equity',
      volume: Math.floor(Math.random() * 50000000),
      avgVolume: Math.floor(Math.random() * 30000000),
      dayHigh: stock.price * 1.02,
      dayLow: stock.price * 0.98,
      open: stock.price * 0.99,
      prevClose: stock.price * (1 - stock.change / 100)
    };
    setStockDetails(mockDetails);

    const mockCandles = generateMockCandles(stock.price, 365);
    setCandleData(mockCandles);
    
    const trendResult = calculateTrend(mockCandles, 100);
    setTrend(trendResult);
    
    setHoldingPattern(generateHoldingPattern());
    setNews(generateNews());
    
    setLoading(false);
  };

  const getTimeframeDays = (tf) => {
    const mapping = { '1D': 30, '1W': 90, '1M': 180, '3M': 365, '1Y': 730 };
    return mapping[tf] || 180;
  };

  const initChart = () => {
    if (!chartContainerRef.current || !candleData.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const days = getTimeframeDays(chartTimeframe);
    const filteredData = candleData.slice(-days);

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#161B22' },
        textColor: '#E6EDF3'
      },
      grid: {
        vertLines: { color: '#30363D' },
        horzLines: { color: '#30363D' }
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: { 
        timeVisible: true,
        borderColor: '#30363D'
      },
      rightPriceScale: {
        borderColor: '#30363D'
      },
      crosshair: {
        mode: CrosshairMode.Normal
      }
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00D09C',
      downColor: '#EB5B3C',
      borderUpColor: '#00D09C',
      borderDownColor: '#EB5B3C',
      wickUpColor: '#00D09C',
      wickDownColor: '#EB5B3C'
    });

    candlestickSeries.setData(filteredData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    })));

    const sma20Series = chart.addLineSeries({ 
      color: '#2962FF', 
      lineWidth: 2,
      title: 'SMA20'
    });
    sma20Series.setData(calculateSMAData(filteredData, 20));

    const sma50Series = chart.addLineSeries({ 
      color: '#FF6D00', 
      lineWidth: 2,
      title: 'SMA50'
    });
    sma50Series.setData(calculateSMAData(filteredData, 50));

    const volumeSeries = chart.addHistogramSeries({
      color: '#26A69A',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume'
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMode: 1,
      visible: true
    });
    
    volumeSeries.setData(filteredData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 208, 156, 0.5)' : 'rgba(235, 91, 60, 0.5)'
    })));

    chart.timeScale().fitContent();
  };

  const calculateSMAData = (data, period) => {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      sma.push({ time: data[i].time, value: sum / period });
    }
    return sma;
  };

  const getSignalColor = (signal) => {
    if (signal === 'Strong Buy' || signal === 'Buy') return 'text-groww-green';
    if (signal === 'Avoid' || signal === 'Sell') return 'text-groww-red';
    return 'text-yellow-400';
  };

  const getSignalBg = (signal) => {
    if (signal === 'Strong Buy' || signal === 'Buy') return 'bg-groww-green/10';
    if (signal === 'Avoid' || signal === 'Sell') return 'bg-groww-red/10';
    return 'bg-yellow-400/10';
  };

  const getSignalBorder = (signal) => {
    if (signal === 'Strong Buy' || signal === 'Buy') return 'border-groww-green/30';
    if (signal === 'Avoid' || signal === 'Sell') return 'border-groww-red/30';
    return 'border-yellow-400/30';
  };

  return (
    <div className="min-h-screen bg-groww-dark p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <LineChart className="w-8 h-8 text-groww-green" />
              ManverIQ
            </h1>
            <p className="text-gray-400 text-sm mt-1">Research & Analysis Platform</p>
          </div>
          <div className="flex items-center gap-3 bg-groww-card px-4 py-2 rounded-lg border border-groww-border">
            <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-groww-green animate-pulse' : 'bg-groww-red'}`}></div>
            <span className={`text-sm ${marketStatus.isOpen ? 'text-gray-300' : 'text-groww-red'}`}>{marketStatus.status}</span>
            <span className="text-xs text-gray-500 ml-2">NSE</span>
            {!marketStatus.isOpen && marketStatus.nextOpen && (
              <span className="text-xs text-gray-500 ml-2">Next: {marketStatus.nextOpen}</span>
            )}
          </div>
        </header>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              if (searchQuery.trim()) performSearch();
            }}
            placeholder="Search stocks by name or symbol (e.g., RELIANCE, TCS, HDFCBANK)..."
            className="w-full bg-groww-card border border-groww-border rounded-xl py-4 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-groww-green/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-groww-card border border-groww-border rounded-xl overflow-hidden z-50 shadow-xl">
              {searchResults.map((stock, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectStock(stock)}
                  className="w-full px-4 py-3 text-left hover:bg-groww-border/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-groww-green/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-groww-green" />
                    </div>
                    <div>
                      <span className="text-white font-medium">{stock.symbol}</span>
                      <span className="text-gray-400 ml-2 text-sm">{stock.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-white">₹{stock.price?.toFixed(2)}</span>
                    <span className={`ml-2 text-sm ${stock.change >= 0 ? 'text-groww-green' : 'text-groww-red'}`}>
                      {formatPercentage(stock.change)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-groww-card border border-groww-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-groww-green" />
                <h2 className="text-lg font-semibold text-white">Top Gainers</h2>
              </div>
              <div className="space-y-2">
                {gainers.map((stock, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectStock(stock)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-groww-border/50 transition-all border border-transparent hover:border-groww-green/20"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">{stock.symbol}</div>
                      <div className="text-gray-400 text-xs">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">₹{stock.price?.toFixed(2)}</div>
                      <div className="text-groww-green text-sm font-medium">{formatPercentage(stock.change)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-groww-card border border-groww-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-groww-red" />
                <h2 className="text-lg font-semibold text-white">Top Losers</h2>
              </div>
              <div className="space-y-2">
                {losers.map((stock, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectStock(stock)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-groww-border/50 transition-all border border-transparent hover:border-groww-red/20"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">{stock.symbol}</div>
                      <div className="text-gray-400 text-xs">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">₹{stock.price?.toFixed(2)}</div>
                      <div className="text-groww-red text-sm font-medium">{formatPercentage(stock.change)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-groww-card border border-groww-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Weekly Opportunities</h2>
              </div>
              <div className="space-y-2">
                {weeklyOpportunities.slice(0, 4).map((stock, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectStock(stock)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-groww-border/50 transition-all border border-transparent hover:border-yellow-400/20"
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">{stock.symbol}</div>
                      <div className="text-gray-400 text-xs">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 text-sm font-medium">{stock.weeklyOutlook}</div>
                      <div className="text-gray-400 text-xs">{stock.weeklyConfidence}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedStock ? (
              <div className="bg-groww-card border border-groww-border rounded-xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-groww-green/10 flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-groww-green" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedStock.symbol}</h2>
                      <p className="text-gray-400">{selectedStock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">₹{selectedStock.price?.toFixed(2)}</div>
                    <div className={`text-lg font-medium ${selectedStock.change >= 0 ? 'text-groww-green' : 'text-groww-red'}`}>
                      {formatPercentage(selectedStock.change)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-groww-border">
                  {['overview', 'technical', 'prediction', 'news', 'holdings'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        activeTab === tab 
                          ? 'text-groww-green border-b-2 border-groww-green' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && stockDetails && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Target className="w-3 h-3" />52W High
                      </div>
                      <div className="text-white font-semibold">₹{stockDetails.high52?.toFixed(2)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Target className="w-3 h-3" />52W Low
                      </div>
                      <div className="text-white font-semibold">₹{stockDetails.low52?.toFixed(2)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <Activity className="w-3 h-3" />Market Cap
                      </div>
                      <div className="text-white font-semibold">{formatMarketCap(stockDetails.marketCap)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                        <BarChart3 className="w-3 h-3" />P/E Ratio
                      </div>
                      <div className="text-white font-semibold">{stockDetails.pe?.toFixed(1)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="text-gray-400 text-xs mb-2">Volume</div>
                      <div className="text-white font-semibold">{formatVolume(stockDetails.volume)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="text-gray-400 text-xs mb-2">Avg Volume</div>
                      <div className="text-white font-semibold">{formatVolume(stockDetails.avgVolume)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="text-gray-400 text-xs mb-2">Day High</div>
                      <div className="text-white font-semibold">₹{stockDetails.dayHigh?.toFixed(2)}</div>
                    </div>
                    <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                      <div className="text-gray-400 text-xs mb-2">Day Low</div>
                      <div className="text-white font-semibold">₹{stockDetails.dayLow?.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {activeTab === 'technical' && trend && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="text-gray-400 text-xs mb-2">RSI (14)</div>
                        <div className={`text-xl font-bold ${
                          parseFloat(trend.metrics.rsi14) > 70 ? 'text-groww-red' :
                          parseFloat(trend.metrics.rsi14) < 30 ? 'text-groww-green' : 'text-white'
                        }`}>{trend.metrics.rsi14}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {parseFloat(trend.metrics.rsi14) > 70 ? 'Overbought' : 
                           parseFloat(trend.metrics.rsi14) < 30 ? 'Oversold' : 'Neutral'}
                        </div>
                      </div>
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="text-gray-400 text-xs mb-2">SMA (20)</div>
                        <div className="text-xl font-bold text-white">₹{trend.metrics.sma20}</div>
                        <div className="text-xs text-gray-500 mt-1">{trend.metrics.trend}</div>
                      </div>
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="text-gray-400 text-xs mb-2">SMA (50)</div>
                        <div className="text-xl font-bold text-white">₹{trend.metrics.sma50 || 'N/A'}</div>
                        <div className="text-xs text-gray-500 mt-1">Medium Term</div>
                      </div>
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="text-gray-400 text-xs mb-2">Volume</div>
                        <div className="text-xl font-bold text-white">{trend.metrics.volumeRatio}x</div>
                        <div className="text-xs text-gray-500 mt-1">20D Avg</div>
                      </div>
                    </div>
                    
                    {trend.metrics.bollinger && (
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <h3 className="text-white font-medium mb-3">Bollinger Bands</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-gray-400 text-xs">Upper</div>
                            <div className="text-groww-red font-semibold">₹{trend.metrics.bollinger.upper}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs">Middle (SMA)</div>
                            <div className="text-white font-semibold">₹{trend.metrics.bollinger.middle}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs">Lower</div>
                            <div className="text-groww-green font-semibold">₹{trend.metrics.bollinger.lower}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'prediction' && trend && (
                  <div className="space-y-4">
                    <div className={`rounded-xl p-6 border-2 ${getSignalBg(trend.signal)} ${getSignalBorder(trend.signal)}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Clock className="w-4 h-4" />
                            1-3 Week Outlook
                          </div>
                          <div className={`text-3xl font-bold ${getSignalColor(trend.signal)}`}>
                            {trend.signal}
                          </div>
                          <div className="text-gray-400 text-sm mt-1">
                            Confidence: {trend.confidence}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-xs">Support</div>
                          <div className="text-groww-green font-semibold">₹{trend.metrics.support}</div>
                          <div className="text-gray-400 text-xs mt-2">Resistance</div>
                          <div className="text-groww-red font-semibold">₹{trend.metrics.resistance}</div>
                        </div>
                      </div>
                      
                      {trend.reasons.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-white text-sm font-medium">Analysis Factors:</h4>
                          <div className="flex flex-wrap gap-2">
                            {trend.reasons.map((reason, i) => (
                              <span key={i} className="text-sm bg-groww-dark px-3 py-1.5 rounded-lg text-gray-300">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {trend.entryStrategy && (
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <h4 className="text-white font-medium mb-3">Trading Strategy</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {trend.entryStrategy.buyZone && (
                            <div className="flex items-center gap-2">
                              <ArrowUp className="w-4 h-4 text-groww-green" />
                              <span className="text-sm text-gray-300">{trend.entryStrategy.buyZone}</span>
                            </div>
                          )}
                          {trend.entryStrategy.sellZone && (
                            <div className="flex items-center gap-2">
                              <ArrowDown className="w-4 h-4 text-groww-red" />
                              <span className="text-sm text-gray-300">{trend.entryStrategy.sellZone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-300">{trend.entryStrategy.stopLoss}</span>
                          </div>
                          {trend.entryStrategy.target1 && (
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-groww-green" />
                              <span className="text-sm text-gray-300">{trend.entryStrategy.target1}</span>
                            </div>
                          )}
                          {trend.entryStrategy.target2 && (
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-groww-green" />
                              <span className="text-sm text-gray-300">{trend.entryStrategy.target2}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {trend.weekly && (
                      <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <h4 className="text-white font-medium mb-3">Weekly Prediction (1 Week)</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`text-lg font-bold ${trend.weekly.outlook.includes('Bullish') ? 'text-groww-green' : trend.weekly.outlook.includes('Bearish') ? 'text-groww-red' : 'text-yellow-400'}`}>
                              {trend.weekly.outlook}
                            </span>
                            <span className="text-gray-400 text-sm ml-2">({trend.weekly.confidence}% confidence)</span>
                          </div>
                          <div className="text-gray-400 text-sm">
                            Weekly Change: <span className={trend.weekly.weeklyChange >= 0 ? 'text-groww-green' : 'text-groww-red'}>
                              {formatPercentage(trend.weekly.weeklyChange)}
                            </span>
                          </div>
                        </div>
                        {trend.weekly.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {trend.weekly.reasons.map((reason, i) => (
                              <span key={i} className="text-xs bg-groww-card px-2 py-1 rounded text-gray-400">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {trend.shortTerm && trend.mediumTerm && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                          <h4 className="text-gray-400 text-xs mb-2">Short Term (1-3 Days)</h4>
                          <div className={`font-semibold ${trend.shortTerm.outlook === 'Upward' ? 'text-groww-green' : trend.shortTerm.outlook === 'Downward' ? 'text-groww-red' : 'text-yellow-400'}`}>
                            {trend.shortTerm.outlook}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{trend.shortTerm.reason}</div>
                        </div>
                        <div className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                          <h4 className="text-gray-400 text-xs mb-2">Medium Term (1-4 Weeks)</h4>
                          <div className={`font-semibold ${
                          trend.mediumTerm.outlook === 'Uptrend' ? 'text-groww-green' : 
                          trend.mediumTerm.outlook === 'Downtrend' ? 'text-groww-red' : 'text-yellow-400'
                        }`}>
                            {trend.mediumTerm.outlook}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{trend.mediumTerm.reason}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'news' && news.length > 0 && (
                  <div className="space-y-4">
                    {news.map((item, idx) => (
                      <div key={idx} className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.sentiment === 'bullish' ? 'bg-groww-green/20 text-groww-green' :
                            item.sentiment === 'bearish' ? 'bg-groww-red/20 text-groww-red' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.sentiment}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{item.source}</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'holdings' && holdingPattern && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Shareholding Pattern</h4>
                    {holdingPattern.map((holder, idx) => (
                      <div key={idx} className="bg-groww-dark rounded-lg p-4 border border-groww-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-white">{holder.category}</span>
                          </div>
                          <span className="text-white font-semibold">{holder.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-groww-border rounded-full h-2">
                          <div 
                            className="bg-groww-green rounded-full h-2" 
                            style={{ width: `${holder.percentage}%` }}
                          />
                        </div>
                        <div className={`text-xs mt-2 ${holder.change >= 0 ? 'text-groww-green' : 'text-groww-red'}`}>
                          {holder.change >= 0 ? '+' : ''}{holder.change.toFixed(2)}% vs last quarter
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Price Chart</h3>
                    <div className="flex gap-1 bg-groww-dark rounded-lg p-1">
                      {['1D', '1W', '1M', '3M', '1Y'].map(tf => (
                        <button
                          key={tf}
                          onClick={() => setChartTimeframe(tf)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            chartTimeframe === tf 
                              ? 'bg-groww-green text-black font-medium' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div ref={chartContainerRef} className="w-full h-[350px]" />
                </div>
              </div>
            ) : (
              <div className="bg-groww-card border border-groww-border rounded-xl p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a Stock</h3>
                <p className="text-gray-400">Click on any stock from the gainers/losers list or search to view detailed analysis</p>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-groww-card p-6 rounded-xl border border-groww-border flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-groww-green animate-spin" />
              <span className="text-white">Loading data...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}