/**
 * Stock / Index Market Data Source
 *
 * Uses Yahoo Finance FREE API (no key required) to get real market data
 * for stock/index-related Polymarket questions like:
 *   "S&P 500 (SPX) Up or Down on February 17?"
 *   "Will Nasdaq close above 18,000?"
 *
 * Similar architecture to cryptoData.js — provides DATA-DRIVEN probability.
 */

const log = require('../utils/logger');

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Cache
const priceCache = new Map();
const CACHE_TTL = 300000; // 5 min

// Index/stock name → Yahoo symbol
const INDEX_SYMBOLS = {
  's&p 500': '%5EGSPC', 'spx': '%5EGSPC', 's&p': '%5EGSPC', 'sp500': '%5EGSPC',
  'nasdaq': '%5EIXIC', 'qqq': 'QQQ', 'nasdaq 100': '%5ENDX',
  'dow jones': '%5EDJI', 'dow': '%5EDJI', 'djia': '%5EDJI',
  'russell 2000': '%5ERUT', 'russell': '%5ERUT',
  'vix': '%5EVIX',
  'tesla': 'TSLA', 'tsla': 'TSLA',
  'apple': 'AAPL', 'aapl': 'AAPL',
  'nvidia': 'NVDA', 'nvda': 'NVDA',
  'amazon': 'AMZN', 'amzn': 'AMZN',
  'google': 'GOOGL', 'googl': 'GOOGL', 'alphabet': 'GOOGL',
  'meta': 'META', 'facebook': 'META',
  'microsoft': 'MSFT', 'msft': 'MSFT',
  'oil': 'CL=F', 'crude oil': 'CL=F', 'wti': 'CL=F',
  'gold': 'GC=F', 'xau': 'GC=F',
};

/**
 * Parse a stock/index question.
 * Returns { symbol, yahooSymbol, direction, targetPrice, type } or null.
 */
function parseStockQuestion(question, endDate) {
  if (!question) return null;
  const q = question.toLowerCase();

  // Detect index/stock
  let detectedSymbol = null;
  let yahooSymbol = null;
  for (const [name, symbol] of Object.entries(INDEX_SYMBOLS)) {
    const wordBoundary = new RegExp(`\\b${name.replace(/[&]/g, '.')}\\b`, 'i');
    if (wordBoundary.test(q)) {
      detectedSymbol = name;
      yahooSymbol = symbol;
      break;
    }
  }
  // Also check for parenthetical: "(SPX)" or "(QQQ)"
  if (!yahooSymbol) {
    const parenMatch = question.match(/\(([A-Z]{2,5})\)/);
    if (parenMatch) {
      const ticker = parenMatch[1].toLowerCase();
      if (INDEX_SYMBOLS[ticker]) {
        detectedSymbol = ticker;
        yahooSymbol = INDEX_SYMBOLS[ticker];
      }
    }
  }
  if (!yahooSymbol) return null;

  // Quick sanity: reject if clearly not about stock/market prices
  const stockContext = /price|index|close|above|below|up or down|market|trading|stock|s&p|spx|nasdaq|dow|points/i.test(q);
  const nonStockContext = /olympi|medal|hockey|soccer|election|president|war/i.test(q);
  if (nonStockContext && !stockContext) return null;

  // Pattern 1: "Up or Down" directional markets
  if (/up\s+or\s+down/i.test(q)) {
    let deadline = null;
    const dateMatch = question.match(/(?:on|[-–])\s*(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/i);
    if (dateMatch) {
      let dateStr = dateMatch[1];
      if (!/\d{4}/.test(dateStr)) dateStr += ` ${new Date().getFullYear()}`;
      deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) deadline = null;
    }
    if (!deadline && endDate) deadline = new Date(endDate);
    if (!deadline) {
      deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);
    }

    return {
      symbol: detectedSymbol,
      yahooSymbol,
      targetPrice: null,
      direction: 'ABOVE',
      deadline,
      type: 'UP_OR_DOWN',
    };
  }

  // Pattern 2: Price target — "above $18,000", "close above 6000"
  const pricePatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*k?\b/i,
    /above\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
    /below\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,
    /(\d{1,3}(?:,\d{3})+)(?:\s|$)/,
  ];

  let targetPrice = null;
  for (const pat of pricePatterns) {
    const m = question.match(pat);
    if (m) {
      targetPrice = parseFloat(m[1].replace(/,/g, ''));
      if (/k\b/i.test(m[0])) targetPrice *= 1000;
      break;
    }
  }

  if (!targetPrice || targetPrice < 10) return null;

  const direction = /below|under|less than|drop|fall|crash/i.test(q) ? 'BELOW' : 'ABOVE';

  let deadline = null;
  const deadlineMatch = question.match(/(?:by|before|on|through)\s+(\w+\s+\d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{4}|\w+\s+\d{1,2})/i);
  if (deadlineMatch) {
    let ds = deadlineMatch[1];
    if (!/\d{4}/.test(ds)) ds += ` ${new Date().getFullYear()}`;
    deadline = new Date(ds);
    if (isNaN(deadline.getTime())) deadline = null;
  }
  if (!deadline && endDate) deadline = new Date(endDate);
  if (!deadline) { deadline = new Date(); deadline.setDate(deadline.getDate() + 30); }

  return {
    symbol: detectedSymbol,
    yahooSymbol,
    targetPrice,
    direction,
    deadline,
    type: 'PRICE_TARGET',
  };
}

/**
 * Fetch current and historical price from Yahoo Finance.
 */
async function getStockData(yahooSymbol) {
  const cached = priceCache.get(yahooSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const resp = await fetch(
      `${YAHOO_BASE}/${yahooSymbol}?interval=1d&range=30d`,
      {
        headers: { 'User-Agent': 'MarketPlayMaker/2.0' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!resp.ok) {
      log.warn('STOCK', `Yahoo API returned ${resp.status} for ${yahooSymbol}`);
      return null;
    }

    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const closes = result.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter(c => c != null);

    if (validCloses.length < 2) return null;

    const currentPrice = meta.regularMarketPrice || validCloses[validCloses.length - 1];
    const prevClose = meta.chartPreviousClose || validCloses[validCloses.length - 2];

    // Calculate daily returns for volatility
    const returns = [];
    for (let i = 1; i < validCloses.length; i++) {
      if (validCloses[i] > 0 && validCloses[i - 1] > 0) {
        returns.push(Math.log(validCloses[i] / validCloses[i - 1]));
      }
    }

    const dailyVol = returns.length > 5
      ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
      : 0.012; // Default ~1.2% daily

    const annualVol = dailyVol * Math.sqrt(252);

    // Recent momentum (last 5 days)
    const last5 = validCloses.slice(-5);
    const momentum5d = last5.length >= 5
      ? (last5[last5.length - 1] - last5[0]) / last5[0]
      : 0;

    const stockData = {
      currentPrice,
      prevClose,
      dailyVol,
      annualVol,
      momentum5d,
      dayChange: currentPrice - (prevClose || currentPrice),
      dayChangePct: prevClose ? ((currentPrice - prevClose) / prevClose) : 0,
      symbol: meta.symbol,
    };

    priceCache.set(yahooSymbol, { data: stockData, timestamp: Date.now() });
    return stockData;
  } catch (err) {
    log.warn('STOCK', `Failed to fetch ${yahooSymbol}: ${err.message}`);
    return null;
  }
}

/**
 * Calculate probability for stock/index questions.
 * Uses log-normal model + momentum, same approach as crypto.
 */
function calculateProbability(parsed, stockData) {
  const { currentPrice, dailyVol, annualVol, dayChangePct, momentum5d } = stockData;
  const { type, direction, targetPrice, deadline } = parsed;

  if (type === 'UP_OR_DOWN') {
    // Intraday/short-term directional — blend momentum + mean reversion
    const hoursRemaining = Math.max(1, (deadline.getTime() - Date.now()) / 3600000);
    
    // Momentum signal (recent trend continuation)
    const momentumProb = dayChangePct > 0 ? 0.5 + Math.min(dayChangePct * 5, 0.15) :
                         dayChangePct < 0 ? 0.5 + Math.max(dayChangePct * 5, -0.15) : 0.5;

    // If very short timeframe (<4 hours), momentum matters more
    // If longer, tend toward 50/50
    const weight = hoursRemaining < 4 ? 0.6 : hoursRemaining < 24 ? 0.3 : 0.15;
    const prob = 0.5 * (1 - weight) + momentumProb * weight;

    return {
      prob: Math.round(Math.min(0.75, Math.max(0.25, prob)) * 1000) / 1000,
      confidence: hoursRemaining < 8 ? 'HIGH' : 'MEDIUM',
      method: 'momentum',
    };
  }

  // Price target
  if (!targetPrice) return null;

  const daysToDeadline = Math.max(1, (deadline.getTime() - Date.now()) / 86400000);
  const timeToExpiry = daysToDeadline / 365;

  // Log-normal model
  const logReturn = Math.log(targetPrice / currentPrice);
  const drift = 0.08 * timeToExpiry; // ~8% annual expected return for stocks
  const vol = annualVol * Math.sqrt(timeToExpiry);

  if (vol <= 0) return null;

  // Normal CDF approximation
  const d = (logReturn - drift) / vol;
  const probAbove = 1 - normalCDF(d);
  const prob = direction === 'ABOVE' ? probAbove : 1 - probAbove;

  return {
    prob: Math.round(Math.min(0.98, Math.max(0.02, prob)) * 1000) / 1000,
    confidence: daysToDeadline <= 7 ? 'HIGH' : daysToDeadline <= 30 ? 'MEDIUM' : 'LOW',
    method: 'lognormal',
  };
}

// Standard normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Main entry point: get stock/index signal for a Polymarket market.
 */
async function getStockSignal(market) {
  const parsed = parseStockQuestion(market.question, market.endDate);
  if (!parsed) return null;

  const stockData = await getStockData(parsed.yahooSymbol);
  if (!stockData) return null;

  const result = calculateProbability(parsed, stockData);
  if (!result) return null;

  const changePct = (stockData.dayChangePct * 100).toFixed(1);
  const changeDir = stockData.dayChangePct >= 0 ? '📈' : '📉';
  const priceStr = stockData.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });

  let detail = '';
  if (parsed.type === 'UP_OR_DOWN') {
    const hoursLeft = Math.max(0, Math.round((parsed.deadline.getTime() - Date.now()) / 3600000));
    detail = `${parsed.symbol.toUpperCase()} ${priceStr} ${changeDir} ${changePct}% today, ${hoursLeft}h remaining`;
  } else {
    const targetStr = parsed.targetPrice.toLocaleString('en-US');
    const pctAway = (((parsed.targetPrice - stockData.currentPrice) / stockData.currentPrice) * 100).toFixed(1);
    detail = `${parsed.symbol.toUpperCase()} ${priceStr} (${pctAway}% to $${targetStr}), ${Math.round(stockData.annualVol * 100)}% annual vol`;
  }

  return {
    prob: result.prob,
    confidence: result.confidence,
    detail,
    matchQuality: 0.9,
    currentPrice: stockData.currentPrice,
    targetPrice: parsed.targetPrice,
    direction: parsed.direction,
    symbol: parsed.symbol,
    type: parsed.type,
    method: result.method,
    dayChange: `${changePct}%`,
    annualVol: `${Math.round(stockData.annualVol * 100)}%`,
  };
}

function getStatus() {
  return {
    source: 'Yahoo Finance',
    status: 'active',
    description: 'FREE stock/index prices for market analysis',
    cachedSymbols: priceCache.size,
    supportedSymbols: Object.keys(INDEX_SYMBOLS).length,
    apiKeyRequired: false,
  };
}

function refresh() {
  priceCache.clear();
  log.info('STOCK', 'Cache cleared');
}

module.exports = {
  getStockSignal,
  parseStockQuestion,
  getStockData,
  getStatus,
  refresh,
};
