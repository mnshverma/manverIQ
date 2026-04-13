export const calculateTrend = (candleData, period = 100) => {
  if (!candleData || candleData.length < 21) {
    return { signal: 'Insufficient Data', confidence: 0, metrics: {}, reasons: [] };
  }

  const recentData = candleData.slice(-period);
  
  const calculateSMA = (data, days) => {
    if (data.length < days) return null;
    const slice = data.slice(-days);
    return slice.reduce((sum, candle) => sum + (candle.close || candle[4]), 0) / days;
  };

  const calculateRSI = (data, days = 14) => {
    if (data.length < days + 1) return null;
    const recent = data.slice(-days - 1);
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < recent.length; i++) {
      const prevClose = recent[i - 1].close || recent[i - 1][4];
      const currClose = recent[i].close || recent[i][4];
      const change = currClose - prevClose;
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / days;
    const avgLoss = losses / days;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (data, days) => {
    if (data.length < days) return null;
    const k = 2 / (days + 1);
    const slice = data.slice(-days);
    let ema = slice[0].close || slice[0][4];
    for (let i = 1; i < slice.length; i++) {
      ema = (slice[i].close || slice[i][4]) * k + ema * (1 - k);
    }
    return ema;
  };

  const calculateMACD = (data) => {
    if (data.length < 26) return null;
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    if (ema12 === null || ema26 === null) return null;
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.9;
    return { macdLine, signalLine, histogram: macdLine - signalLine };
  };

  const calculateBollingerBands = (data, days = 20) => {
    if (data.length < days) return null;
    const sma = calculateSMA(data, days);
    const slice = data.slice(-days);
    const variance = slice.reduce((sum, candle) => {
      const close = candle.close || candle[4];
      return sum + Math.pow(close - sma, 2);
    }, 0) / days;
    const stdDev = Math.sqrt(variance);
    return { upper: sma + (2 * stdDev), middle: sma, lower: sma - (2 * stdDev) };
  };

  const calculateVolumeProfile = (data, days = 20) => {
    const recent = data.slice(-days);
    const avgVolume = recent.reduce((sum, c) => sum + (c.volume || c[5] || 0), 0) / days;
    const currentVolume = recent[recent.length - 1].volume || 0;
    return { current: currentVolume, average: avgVolume, ratio: currentVolume / avgVolume };
  };

  const calculateMomentum = (data, days = 10) => {
    if (data.length < days) return null;
    const recent = data.slice(-days);
    const first = recent[0].close;
    const last = recent[recent.length - 1].close;
    return ((last - first) / first) * 100;
  };

  const getWeeklyPrediction = (candleData, period = 7) => {
    const weeklyData = candleData.slice(-period);
    if (weeklyData.length < 3) return { outlook: 'Hold', confidence: 50 };
    
    const startPrice = weeklyData[0].close;
    const endPrice = weeklyData[weeklyData.length - 1].close;
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    
    const rsi = calculateRSI(weeklyData, 7);
    const sma20 = calculateSMA(weeklyData, 5);
    const currentPrice = endPrice;
    
    let score = 0;
    let reasons = [];
    
    if (changePercent > 3) {
      score += 2;
      reasons.push(`Strong weekly momentum: +${changePercent.toFixed(1)}%`);
    } else if (changePercent > 1) {
      score += 1;
      reasons.push(`Positive weekly trend: +${changePercent.toFixed(1)}%`);
    } else if (changePercent < -3) {
      score -= 2;
      reasons.push(`Weekly weakness: ${changePercent.toFixed(1)}%`);
    }
    
    if (currentPrice > sma20) {
      score += 1;
      reasons.push('Price above 5-day SMA');
    } else {
      score -= 1;
      reasons.push('Price below 5-day SMA');
    }
    
    if (rsi !== null) {
      if (rsi < 35) {
        score += 2;
        reasons.push(`Oversold (RSI: ${rsi.toFixed(0)}) - potential bounce`);
      } else if (rsi > 65) {
        score -= 2;
        reasons.push(`Overbought (RSI: ${rsi.toFixed(0)}) - correction likely`);
      }
    }
    
    let outlook = 'Hold';
    let confidence = 55;
    if (score >= 3) {
      outlook = 'Bullish';
      confidence = 70 + score * 5;
    } else if (score >= 1) {
      outlook = 'Slightly Bullish';
      confidence = 55 + score * 5;
    } else if (score <= -3) {
      outlook = 'Bearish';
      confidence = 70 + Math.abs(score) * 5;
    } else if (score <= -1) {
      outlook = 'Slightly Bearish';
      confidence = 55 + Math.abs(score) * 5;
    }
    
    return { outlook, confidence, reasons, weeklyChange: changePercent };
  };

  const currentPrice = recentData[recentData.length - 1].close;
  const sma20 = calculateSMA(recentData, 20);
  const sma50 = calculateSMA(recentData, 50);
  const rsi14 = calculateRSI(recentData, 14);
  const macd = calculateMACD(recentData);
  const bollinger = calculateBollingerBands(recentData, 20);
  const volumeProfile = calculateVolumeProfile(recentData, 20);
  const momentum = calculateMomentum(recentData, 10);
  const weeklyPrediction = getWeeklyPrediction(candleData, 7);

  let score = 0;
  let reasons = [];
  let shortTermReason = '';
  let mediumTermReason = '';

  if (currentPrice > sma20 && sma20 > sma50) {
    score += 3;
    reasons.push('Strong uptrend: Price > SMA20 > SMA50');
    mediumTermReason = 'Bullish trend structure intact';
  } else if (currentPrice > sma20) {
    score += 1;
    reasons.push('Price above 20-day SMA (short-term bullish)');
    mediumTermReason = 'Above key moving average';
  } else if (currentPrice < sma20 && sma20 < sma50) {
    score -= 3;
    reasons.push('Bearish trend: Price < SMA20 < SMA50');
    mediumTermReason = 'Bearish trend structure';
  } else {
    score -= 1;
    reasons.push('Price below 20-day SMA');
  }

  if (rsi14 !== null) {
    if (rsi14 < 30) {
      score += 3;
      reasons.push(`RSI oversold (${rsi14.toFixed(0)}) - strong buy signal`);
      shortTermReason = 'Oversold - bounce expected within 1-3 days';
    } else if (rsi14 < 40) {
      score += 1;
      reasons.push(`RSI in oversold zone (${rsi14.toFixed(0)})`);
      shortTermReason = 'Near support, potential recovery';
    } else if (rsi14 > 70) {
      score -= 3;
      reasons.push(`RSI overbought (${rsi14.toFixed(0)}) - correction likely`);
      shortTermReason = 'Overbought - expect profit booking';
    } else if (rsi14 > 60) {
      score -= 1;
      reasons.push(`RSI in overbought zone (${rsi14.toFixed(0)})`);
      shortTermReason = 'Losing momentum';
    } else {
      reasons.push(`RSI neutral (${rsi14.toFixed(0)}) - no overbought/oversold`);
    }
  }

  if (macd) {
    if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
      score += 2;
      reasons.push('MACD bullish crossover - momentum positive');
    } else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
      score -= 2;
      reasons.push('MACD bearish crossover - momentum negative');
    }
  }

  if (currentPrice <= bollinger.lower) {
    score += 2;
    reasons.push('Near lower Bollinger Band - oversold');
  } else if (currentPrice >= bollinger.upper) {
    score -= 2;
    reasons.push('Near upper Bollinger Band - overbought');
  }

  if (volumeProfile.ratio > 1.5) {
    score += 1;
    reasons.push(`High volume: ${volumeProfile.ratio.toFixed(1)}x average (strong interest)`);
  } else if (volumeProfile.ratio < 0.5) {
    score -= 1;
    reasons.push(`Low volume: ${volumeProfile.ratio.toFixed(1)}x average (weak interest)`);
  }

  if (momentum !== null) {
    if (momentum > 5) {
      score += 1;
      reasons.push(`Strong 10-day momentum: +${momentum.toFixed(1)}%`);
    } else if (momentum < -5) {
      score -= 1;
      reasons.push(`Negative 10-day momentum: ${momentum.toFixed(1)}%`);
    }
  }

  let signal = 'Hold';
  let confidence = 50;
  if (score >= 5) {
    signal = 'Strong Buy';
    confidence = Math.min(90, 60 + score * 3);
  } else if (score >= 2) {
    signal = 'Buy';
    confidence = 55 + score * 5;
  } else if (score <= -4) {
    signal = 'Avoid';
    confidence = Math.min(80, 60 + Math.abs(score) * 3);
  } else if (score <= -1) {
    signal = 'Sell';
    confidence = 55 + Math.abs(score) * 5;
  }

  return {
    signal,
    confidence,
    reasons,
    metrics: {
      currentPrice: currentPrice.toFixed(2),
      sma20: sma20?.toFixed(2) || 'N/A',
      sma50: sma50?.toFixed(2) || 'N/A',
      rsi14: rsi14?.toFixed(1) || 'N/A',
      macd: macd ? {
        macdLine: macd.macdLine.toFixed(2),
        signalLine: macd.signalLine.toFixed(2),
        histogram: macd.histogram.toFixed(2)
      } : null,
      bollinger: bollinger ? {
        upper: bollinger.upper.toFixed(2),
        middle: bollinger.middle.toFixed(2),
        lower: bollinger.lower.toFixed(2)
      } : null,
      volumeRatio: volumeProfile.ratio.toFixed(2),
      momentum: momentum?.toFixed(1),
      trend: currentPrice > sma20 ? 'Bullish' : 'Bearish',
      support: bollinger?.lower.toFixed(2),
      resistance: bollinger?.upper.toFixed(2)
    },
    shortTerm: {
      outlook: score > 2 ? 'Upward' : score < -2 ? 'Downward' : 'Sideways',
      reason: shortTermReason || 'No clear short-term signal',
      timeframe: '1-3 days'
    },
    mediumTerm: {
      outlook: sma20 > sma50 ? 'Uptrend' : 'Downtrend',
      reason: mediumTermReason || 'Mixed signals',
      timeframe: '1-4 weeks'
    },
    weekly: weeklyPrediction,
    entryStrategy: {
      buyZone: signal === 'Strong Buy' || signal === 'Buy' ? `Buy between ₹${(currentPrice * 0.98).toFixed(2)} - ₹${(currentPrice * 1.02).toFixed(2)}` : null,
      sellZone: signal === 'Sell' || signal === 'Avoid' ? `Sell between ₹${(currentPrice * 0.98).toFixed(2)} - ₹${(currentPrice * 1.02).toFixed(2)}` : null,
      stopLoss: signal === 'Strong Buy' || signal === 'Buy' ? `Stop loss at ₹${(bollinger.lower * 0.98).toFixed(2)}` : `Stop loss at ₹${(bollinger.upper * 1.02).toFixed(2)}`,
      target1: signal === 'Strong Buy' || signal === 'Buy' ? `Target 1: ₹${(currentPrice * 1.05).toFixed(2)} (+5%)` : null,
      target2: signal === 'Strong Buy' || signal === 'Buy' ? `Target 2: ₹${(currentPrice * 1.10).toFixed(2)} (+10%)` : null
    }
  };
};

export const parseCandleData = (candleArray) => {
  if (!candleArray || !Array.isArray(candleArray)) return [];
  return candleArray.map(candle => ({
    time: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5] || 0
  }));
};

export const formatMarketCap = (value) => {
  if (!value) return 'N/A';
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e10) return `₹${(value / 1e10).toFixed(2)}L`;
  if (value >= 1e8) return `₹${(value / 1e8).toFixed(2)}Cr`;
  return `₹${value.toString()}`;
};

export const formatPercentage = (value) => {
  if (value === undefined || value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatVolume = (value) => {
  if (!value) return 'N/A';
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
};

export const generateHoldingPattern = () => {
  const promoters = 50 + Math.random() * 15;
  const fii = 15 + Math.random() * 10;
  const dii = 10 + Math.random() * 8;
  const others = 100 - promoters - fii - dii;
  
  return [
    { category: 'Promoters', percentage: promoters, change: (Math.random() - 0.5) * 2 },
    { category: 'FII', percentage: fii, change: (Math.random() - 0.3) * 3 },
    { category: 'DII', percentage: dii, change: (Math.random() - 0.4) * 2 },
    { category: 'Public', percentage: others, change: (Math.random() - 0.5) * 1 }
  ];
};

export const generateNews = () => {
  const newsTemplates = [
    { title: 'Q4 Results Beat Expectations', type: 'positive', sentiment: 'bullish' },
    { title: 'Board Approves Buyback Plan', type: 'positive', sentiment: 'bullish' },
    { title: 'New Product Launch Next Quarter', type: 'positive', sentiment: 'bullish' },
    { title: 'Strong Revenue Growth in FY24', type: 'positive', sentiment: 'bullish' },
    { title: 'Analysts Upgrade to Buy', type: 'positive', sentiment: 'bullish' },
    { title: 'Regulatory Concerns Emerge', type: 'negative', sentiment: 'bearish' },
    { title: 'Q4 Profit Misses Estimates', type: 'negative', sentiment: 'bearish' },
    { title: 'Competition Intensifying', type: 'negative', sentiment: 'bearish' },
    { title: 'Management Guidance Cautious', type: 'neutral', sentiment: 'neutral' },
    { title: 'No Major Catalysts Near Term', type: 'neutral', sentiment: 'neutral' },
    { title: 'Industry Outlook Positive', type: 'positive', sentiment: 'bullish' },
    { title: 'Debt Reduction on Track', type: 'positive', sentiment: 'bullish' }
  ];
  
  const selected = [];
  const used = new Set();
  while (selected.length < 5) {
    const randomIndex = Math.floor(Math.random() * newsTemplates.length);
    if (!used.has(randomIndex)) {
      used.add(randomIndex);
      selected.push({
        ...newsTemplates[randomIndex],
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        source: ['Economic Times', 'MoneyControl', 'Business Standard', 'Live Mint'][Math.floor(Math.random() * 4)]
      });
    }
  }
  return selected;
};

export const scanForWeeklyOpportunities = (stocks) => {
  const opportunities = [];
  
  stocks.forEach(stock => {
    const mockCandles = generateMockCandlesForScan(stock.price, 30);
    const trend = calculateTrend(mockCandles, 30);
    
    if (trend.weekly.outlook === 'Bullish' || trend.weekly.outlook === 'Slightly Bullish') {
      opportunities.push({
        ...stock,
        weeklyOutlook: trend.weekly.outlook,
        weeklyConfidence: trend.weekly.confidence,
        weeklyReasons: trend.weekly.reasons,
        rsi: trend.metrics.rsi14,
        volume: trend.metrics.volumeRatio
      });
    }
  });
  
  return opportunities.sort((a, b) => b.weeklyConfidence - a.weeklyConfidence);
};

const generateMockCandlesForScan = (basePrice, days) => {
  const candles = [];
  let price = basePrice;
  const startTime = Math.floor(Date.now() / 1000) - (days * 86400);
  
  for (let i = 0; i < days; i++) {
    const volatility = 0.02 + Math.random() * 0.03;
    const change = (Math.random() - 0.48) * volatility * price;
    candles.push({
      time: startTime + (i * 86400),
      open: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price + change,
      volume: Math.floor(Math.random() * 50000000)
    });
    price = price + change;
  }
  return candles;
};