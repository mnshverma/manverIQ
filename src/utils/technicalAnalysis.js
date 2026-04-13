export const calculateTrend = (candleData, period = 100) => {
  if (!candleData || candleData.length < 21) {
    return { signal: 'Insufficient Data', confidence: 0, metrics: {} };
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
    const histogram = macdLine - signalLine;
    
    return { macdLine, signalLine, histogram };
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
    
    return {
      upper: sma + (2 * stdDev),
      middle: sma,
      lower: sma - (2 * stdDev)
    };
  };

  const getNormalizedVolume = (data, days = 20) => {
    if (data.length < days) return null;
    const recent = data.slice(-days);
    const avgVolume = recent.reduce((sum, c) => sum + (c.volume || c[5] || 0), 0) / days;
    const currentVolume = (recent[recent.length - 1].volume || recent[recent.length - 1][5] || 0);
    return currentVolume / avgVolume;
  };

  const currentPrice = (recentData[recentData.length - 1].close || recentData[recentData.length - 1][4]);
  const sma20 = calculateSMA(recentData, 20);
  const sma50 = calculateSMA(recentData, 50);
  const rsi14 = calculateRSI(recentData, 14);
  const macd = calculateMACD(recentData);
  const bollinger = calculateBollingerBands(recentData, 20);
  const volumeRatio = getNormalizedVolume(recentData, 20);

  const priceAboveSMA20 = currentPrice > sma20;
  const priceAboveSMA50 = currentPrice > sma50;
  const sma20AboveSMA50 = sma20 > sma50;
  const rsiInMomentum = rsi14 >= 40 && rsi14 <= 60;
  const rsiOverbought = rsi14 > 70;
  const rsiOversold = rsi14 < 30;
  const priceBelowSMA20 = currentPrice < sma20;

  let signal = 'Hold';
  let confidence = 50;
  let reasons = [];
  let score = 0;

  if (priceAboveSMA20 && sma20AboveSMA50) {
    score += 2;
    reasons.push('Price above 20 & 50 SMA (Uptrend)');
  }
  
  if (rsiInMomentum) {
    score += 1;
    reasons.push(`RSI in momentum zone (${rsi14.toFixed(1)})`);
  } else if (rsiOversold) {
    score += 2;
    reasons.push(`RSI oversold (${rsi14.toFixed(1)}) - Potential bounce`);
  } else if (rsiOverbought) {
    score -= 2;
    reasons.push(`RSI overbought (${rsi14.toFixed(1)})`);
  }

  if (macd) {
    if (macd.histogram > 0) {
      score += 1;
      reasons.push('MACD bullish divergence');
    } else if (macd.histogram < 0) {
      score -= 1;
      reasons.push('MACD bearish divergence');
    }
  }

  if (volumeRatio > 1.5) {
    score += 1;
    reasons.push(`High volume spike (${volumeRatio.toFixed(1)}x avg)`);
  }

  if (priceBelowSMA20) {
    score -= 2;
    reasons.push('Price below 20-day SMA');
  }

  if (signal === 'Hold') {
    if (score >= 4) {
      signal = 'Strong Buy';
      confidence = Math.min(90, 60 + score * 5);
    } else if (score >= 2) {
      signal = 'Buy';
      confidence = 55 + score * 5;
    } else if (score <= -3) {
      signal = 'Avoid';
      confidence = Math.min(80, 60 + Math.abs(score) * 5);
    } else if (score <= -1) {
      signal = 'Sell';
      confidence = 55 + Math.abs(score) * 5;
    }
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
      volumeRatio: volumeRatio?.toFixed(2),
      trend: priceAboveSMA20 ? 'Bullish' : 'Bearish',
      support: bollinger?.lower.toFixed(2),
      resistance: bollinger?.upper.toFixed(2)
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