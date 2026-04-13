import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Search, Loader2, BarChart3, Activity, Target, Clock, LineChart, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { calculateTrend, formatMarketCap, formatPercentage, formatVolume, parseCandleData } from '../utils/technicalAnalysis';

const API_BASE = '/.netlify/functions/growwProxy';

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
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');
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

  const loadInitialData = async () => {
    try {
      const response = await fetch(`${API_BASE}?action=topMovers`);
      if (response.ok) {
        const data = await response.json();
        if (data?.gainers?.length > 0 && data?.losers?.length > 0) {
          setGainers(data.gainers.slice(0, 5));
          setLosers(data.losers.slice(0, 5));
          return;
        }
      }
    } catch (e) {
      console.log('API Error:', e.message);
    }
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
      console.log('API Error:', e.message);
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
      console.log('API Error:', e.message);
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
      console.log('API Error:', e.message);
    }
    return null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}?action=search&q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data.slice(0, 10));
          return;
        }
      }
    } catch (e) {
      console.log('Search API Error:', e.message);
    }
    setSearchResults([]);
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
    setStockDetails(null);
    setCandleData([]);
    setTrend(null);
    
    try {
      const quoteResponse = await fetch(`${API_BASE}?action=quote&symbol=${stock.symbol}`);
      if (!quoteResponse.ok) {
        throw new Error('Quote fetch failed');
      }
      
      const realData = await quoteResponse.json();
      let stockQuote = realData?.[`NSE_${stock.symbol}`] || realData;
      
      if (!stockQuote || !stockQuote.last_price) {
        throw new Error('Invalid quote data');
      }
      
      setStockDetails({
        high52: stockQuote.week_52_high,
        low52: stockQuote.week_52_low,
        marketCap: stockQuote.market_cap,
        pe: stockQuote.pe,
        sector: 'Equity',
        volume: stockQuote.volume,
        avgVolume: stockQuote.volume,
        dayHigh: stockQuote.ohlc?.high,
        dayLow: stockQuote.ohlc?.low,
        open: stockQuote.ohlc?.open,
        prevClose: stockQuote.ohlc?.close,
        lastPrice: stockQuote.last_price,
        dayChange: stockQuote.day_change,
        dayChangePerc: stockQuote.day_change_perc
      });
      
      const candleResponse = await fetch(
        `${API_BASE}?action=candle&symbol=${stock.symbol}&interval=1D`
      );
      
      if (candleResponse.ok) {
        const candleJson = await candleResponse.json();
        if (candleJson?.candles && candleJson.candles.length > 0) {
          const candles = parseCandleData(candleJson.candles);
          setCandleData(candles);
          const trendResult = calculateTrend(candles, 100);
          setTrend(trendResult);
          setLoading(false);
          return;
        }
      }
      
      throw new Error('No candle data available');
      
    } catch (e) {
      console.log('API Error:', e.message);
      setLoading(false);
    }
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
                    <span className="text-white">₹{(stock.price || stock.last_price)?.toFixed(2)}</span>
                    <span className={`ml-2 text-sm ${(stock.change || stock.day_change_perc) >= 0 ? 'text-groww-green' : 'text-groww-red'}`}>
                      {formatPercentage(stock.change || stock.day_change_perc)}
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
                      <div className="text-white font-medium">₹{(stock.price || stock.last_price)?.toFixed(2)}</div>
                      <div className="text-groww-green text-sm font-medium">{formatPercentage(stock.change || stock.day_change_perc)}</div>
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
                      <div className="text-white font-medium">₹{(stock.price || stock.last_price)?.toFixed(2)}</div>
                      <div className="text-groww-red text-sm font-medium">{formatPercentage(stock.change || stock.day_change_perc)}</div>
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
                    <div className="text-3xl font-bold text-white">₹{(selectedStock.price || selectedStock.last_price || stockDetails.lastPrice)?.toFixed(2)}</div>
                    <div className={`text-lg font-medium ${(selectedStock.change || selectedStock.day_change_perc || stockDetails.dayChangePerc) >= 0 ? 'text-groww-green' : 'text-groww-red'}`}>
                      {formatPercentage(selectedStock.change || selectedStock.day_change_perc || stockDetails.dayChangePerc)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-groww-border">
                  {['overview', 'technical', 'prediction'].map(tab => (
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