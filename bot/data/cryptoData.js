/**
 * Crypto Market Data Source
 *
 * Uses FREE CoinGecko API (no key required) to get real market data
 * for crypto-related Polymarket questions.
 *
 * For questions like "Bitcoin above $100K by March 2026?", we can:
 * 1. Get current BTC price
 * 2. Get 30-day volatility
 * 3. Calculate probability using log-normal model
 *
 * This gives a DATA-DRIVEN probability — not LLM guessing.
 */

const log = require('../utils/logger');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Cache to avoid hammering CoinGecko (free tier: 30 calls/min)
const priceCache = new Map();
const CACHE_TTL = 600000; // 10 min

// Simple queue to prevent parallel CoinGecko calls (avoid rate limit)
let coinGeckoQueue = Promise.resolve();
function enqueueCoingecko(fn) {
  coinGeckoQueue = coinGeckoQueue.then(() => fn()).catch(() => fn());
  return coinGeckoQueue;
}

// Crypto name → CoinGecko ID
const CRYPTO_IDS = {
  'bitcoin': 'bitcoin', 'btc': 'bitcoin',
  'ethereum': 'ethereum', 'eth': 'ethereum', 'ether': 'ethereum',
  'solana': 'solana', 'sol': 'solana',
  'dogecoin': 'dogecoin', 'doge': 'dogecoin',
  'xrp': 'ripple', 'ripple': 'ripple',
  'cardano': 'cardano', 'ada': 'cardano',
  'polkadot': 'polkadot', 'dot': 'polkadot',
  'avalanche': 'avalanche-2', 'avax': 'avalanche-2',
  'chainlink': 'chainlink', 'link': 'chainlink',
  'polygon': 'matic-network', 'matic': 'matic-network',
  'litecoin': 'litecoin', 'ltc': 'litecoin',
  'sui': 'sui', 'bnb': 'binancecoin',
  'toncoin': 'the-open-network', 'ton': 'the-open-network',
};

/**
 * Check whether a market question is about crypto prices.
 * Returns { coin, targetPrice, direction, deadline, type } or null.
 *
 * Handles:
 *   "Will Bitcoin be above $100,000 by March 2026?" → { type: 'PRICE_TARGET' }
 *   "Bitcoin Up or Down on February 17?"             → { type: 'UP_OR_DOWN' }
 *   "Will Bitcoin dip to $55,000 in February?"       → { type: 'PRICE_TARGET' }
 *   "Will Bitcoin reach $85,000 in February?"        → { type: 'PRICE_TARGET' }
 */
function parseCryptoQuestion(question, marketEndDate) {
  if (!question) return null;
  const q = question.toLowerCase();

  // Detect crypto coin — use word-boundary matching to avoid false positives
  // e.g. "Canada" should NOT match "ada" (Cardano), "Poland" should NOT match "pol" etc.
  let detectedCoin = null;
  let coinId = null;
  for (const [name, id] of Object.entries(CRYPTO_IDS)) {
    const wordBoundary = new RegExp(`\\b${name}\\b`, 'i');
    if (wordBoundary.test(q)) {
      detectedCoin = name;
      coinId = id;
      break;
    }
  }
  if (!coinId) return null;

  // Quick sanity: reject if question is clearly not about crypto/prices
  // (e.g. sports, politics, olympics using a coin name coincidentally)
  const cryptoContext = /price|crypto|coin|token|market cap|trading|above \$|below \$|reach \$|dip|up or down/i.test(q);
  const nonCryptoContext = /olympi|medal|hockey|soccer|football|basketball|election|president|governor|senate|war|invasion/i.test(q);
  if (nonCryptoContext && !cryptoContext) return null;

  // ─── Pattern 1: "Up or Down" directional markets ────────────────
  // "Bitcoin Up or Down on February 17?" or "Ethereum Up or Down - Feb 17, 2PM ET"
  if (/up\s+or\s+down/i.test(q)) {
    // Extract date from the question
    let deadline = null;

    // "on February 17" or "February 17, 2PM ET"
    const dateMatch = question.match(
      /(?:on|[-–])\s*(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/i
    );
    if (dateMatch) {
      let dateStr = dateMatch[1];
      // Add current year if not present
      if (!/\d{4}/.test(dateStr)) dateStr += ` ${new Date().getFullYear()}`;
      deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) deadline = null;
    }

    // For up/down: deadline defaults to today/tomorrow if not parsed
    if (!deadline && marketEndDate) {
      deadline = new Date(marketEndDate);
    }
    if (!deadline) {
      deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);
    }

    return {
      coin: detectedCoin,
      coinId,
      targetPrice: null, // Will use current price at analysis time
      direction: 'ABOVE', // "Up" = above current price
      deadline,
      type: 'UP_OR_DOWN',
    };
  }

  // ─── Pattern 2: Price target markets ────────────────────────────
  // "above $100K", "reach $85,000", "dip to $55,000"

  // Detect price target — patterns like "$100K", "$100,000", "$95k", "100000"
  const pricePatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*k\b/i,    // "$100K" or "$95.5k"
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/i,          // "$100,000" or "$95.50"
    /(\d{1,3}(?:,\d{3})+)(?:\s|$)/,                  // "100,000" without $
    /\b(\d{5,7})(?:\s|$)/,                            // "100000" bare number (5-7 digits, skip 4 to avoid years)
  ];

  let targetPrice = null;
  for (const pat of pricePatterns) {
    const m = question.match(pat);
    if (m) {
      let val = m[1].replace(/,/g, '');
      targetPrice = parseFloat(val);
      // Handle "K" suffix
      if (/k\b/i.test(m[0])) targetPrice *= 1000;
      break;
    }
  }

  if (!targetPrice || targetPrice < 1) return null;

  // Detect direction (above/below/reach)
  const direction = /below|under|less than|drop|fall|crash|dip/i.test(q) ? 'BELOW' : 'ABOVE';

  // Detect deadline
  let deadline = null;
  const deadlineMatch = question.match(/(?:by|before|on|through|in)\s+(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{4}|\w+\s+\d{1,2})/i);
  if (deadlineMatch) {
    let ds = deadlineMatch[1];
    if (!/\d{4}/.test(ds)) ds += ` ${new Date().getFullYear()}`;
    deadline = new Date(ds);
    if (isNaN(deadline.getTime())) deadline = null;
  }
  // Also try "in February" / "by end of February 2026"
  if (!deadline) {
    const monthMatch = question.match(/(?:by|before|end of|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i);
    if (monthMatch) {
      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const monthIdx = monthNames.indexOf(monthMatch[1].toLowerCase());
      const year = monthMatch[2] ? parseInt(monthMatch[2]) : new Date().getFullYear();
      deadline = new Date(year, monthIdx + 1, 0); // Last day of month
    }
  }

  return { coin: detectedCoin, coinId, targetPrice, direction, deadline, type: 'PRICE_TARGET' };
}

/**
 * Fetch current price and 30-day price history from CoinGecko.
 * Has retry logic for rate limiting (free tier: ~30 calls/min).
 */
async function getCoinData(coinId) {
  const cacheKey = `coin_${coinId}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // Retry up to 2 times with backoff for rate limiting
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 2000 + attempt * 3000)); // 2s, 5s backoff
    }

    try {
      // Get current price + 30-day history for volatility
      const [priceResp, histResp] = await Promise.all([
        fetch(`${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`, {
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`, {
          signal: AbortSignal.timeout(10000),
        }),
      ]);

      if (priceResp.status === 429 || histResp.status === 429) {
        log.warn('CRYPTO', `CoinGecko rate limited for ${coinId}, attempt ${attempt + 1}/2`);
        continue; // retry
      }

      if (!priceResp.ok || !histResp.ok) return null;

    const priceData = await priceResp.json();
    const histData = await histResp.json();

    const currentPrice = priceData[coinId]?.usd;
    const change24h = priceData[coinId]?.usd_24h_change;
    const prices = (histData.prices || []).map(p => p[1]);

    if (!currentPrice || prices.length < 7) return null;

    // Calculate daily log returns for volatility
    const logReturns = [];
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const meanReturn = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (logReturns.length - 1);
    const dailyVol = Math.sqrt(variance);

    const result = {
      currentPrice,
      change24h,
      dailyVolatility: dailyVol,
      annualizedVol: dailyVol * Math.sqrt(365),
      priceHistory: prices,
      meanDailyReturn: meanReturn,
    };

    priceCache.set(cacheKey, { data: result, fetchedAt: Date.now() });
    return result;

    } catch (err) {
      log.warn('CRYPTO', `CoinGecko fetch failed for ${coinId} (attempt ${attempt + 1}): ${err.message}`);
      if (attempt === 1) return null; // last attempt
    }
  }
  return null; // all retries exhausted
}

/**
 * Calculate probability of price reaching target using log-normal model.
 * This is the standard model for crypto price dynamics.
 */
function calculateProbability(currentPrice, targetPrice, direction, daysToDeadline, dailyVol, meanReturn) {
  if (daysToDeadline <= 0) daysToDeadline = 1;

  // Log-normal model: ln(S_T/S_0) ~ N(μT - σ²T/2, σ²T)
  const T = daysToDeadline;
  const mu = meanReturn; // Daily drift
  const sigma = dailyVol; // Daily vol

  const logRatio = Math.log(targetPrice / currentPrice);
  const expectedLogRatio = (mu - sigma * sigma / 2) * T;
  const stdDev = sigma * Math.sqrt(T);

  if (stdDev === 0) return direction === 'ABOVE' ? (currentPrice >= targetPrice ? 0.95 : 0.05) : (currentPrice <= targetPrice ? 0.95 : 0.05);

  // Z-score
  const z = (logRatio - expectedLogRatio) / stdDev;

  // Normal CDF approximation (Abramowitz and Stegun)
  function normalCDF(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  // P(S_T > target) = 1 - Φ(z)
  const probAbove = 1 - normalCDF(z);

  const prob = direction === 'ABOVE' ? probAbove : 1 - probAbove;

  // Clamp to reasonable range
  return Math.max(0.02, Math.min(0.98, prob));
}

/**
 * Main entry point: get crypto-data-driven probability for a market.
 * Returns { prob, confidence, source, detail, matchQuality } or null.
 */
async function getCryptoSignal(market) {
  if (!market?.question) return null;

  const parsed = parseCryptoQuestion(market.question, market.endDate);
  if (!parsed) return null;

  // Use queue to prevent parallel CoinGecko API calls (avoids rate limit)
  const coinData = await enqueueCoingecko(() => getCoinData(parsed.coinId));
  if (!coinData) return null;

  // Calculate days to deadline
  let daysToDeadline = 30; // Default 30 days
  if (parsed.deadline) {
    daysToDeadline = Math.max(0.04, (parsed.deadline.getTime() - Date.now()) / 86400000); // min ~1 hour
  } else if (market.endDate) {
    daysToDeadline = Math.max(0.04, (new Date(market.endDate).getTime() - Date.now()) / 86400000);
  }

  // ─── Handle "Up or Down" markets ────────────────────────────────
  if (parsed.type === 'UP_OR_DOWN') {
    // "Up or Down" = will price be higher than now at deadline?
    // Use current price as the target (direction = ABOVE = "Up")
    // Short-term crypto direction uses momentum + vol model
    const targetPrice = coinData.currentPrice;
    const prob = calculateProbability(
      coinData.currentPrice,
      targetPrice,
      'ABOVE',
      daysToDeadline,
      coinData.dailyVolatility,
      coinData.meanDailyReturn
    );

    // For very short-term (< 1 day), momentum is more predictive
    let adjustedProb = prob;
    if (daysToDeadline < 1) {
      // Intraday: heavily weight recent momentum
      const momentum = coinData.change24h > 0 ? 0.55 : 0.45;
      adjustedProb = prob * 0.3 + momentum * 0.7;
    } else if (daysToDeadline < 3) {
      // 1-3 day: blend momentum with model
      const momentum = coinData.change24h > 0 ? 0.55 : 0.45;
      adjustedProb = prob * 0.6 + momentum * 0.4;
    }

    adjustedProb = Math.max(0.05, Math.min(0.95, adjustedProb));

    const trendEmoji = coinData.change24h > 0 ? '📈' : '📉';
    const changePct = (coinData.change24h || 0).toFixed(1);

    return {
      prob: Math.round(adjustedProb * 1000) / 1000,
      confidence: daysToDeadline <= 1 ? 'HIGH' : 'MEDIUM',
      source: 'Crypto Market Data',
      matchQuality: 0.85, // Slightly lower for up/down vs specific price target
      matchValidated: true,
      detail: `${parsed.coin.toUpperCase()} $${coinData.currentPrice.toLocaleString()} ${trendEmoji} ${changePct}% 24h, ${daysToDeadline < 1 ? (daysToDeadline * 24).toFixed(0) + 'h' : daysToDeadline.toFixed(0) + 'd'} remaining`,
      currentPrice: coinData.currentPrice,
      targetPrice: coinData.currentPrice,
      direction: 'ABOVE',
      daysToDeadline,
      volatility: coinData.annualizedVol,
      coin: parsed.coin,
      type: 'UP_OR_DOWN',
    };
  }

  // ─── Handle price target markets ────────────────────────────────
  const prob = calculateProbability(
    coinData.currentPrice,
    parsed.targetPrice,
    parsed.direction,
    daysToDeadline,
    coinData.dailyVolatility,
    coinData.meanDailyReturn
  );

  const pctFromTarget = ((parsed.targetPrice - coinData.currentPrice) / coinData.currentPrice * 100).toFixed(1);
  const volPct = (coinData.annualizedVol * 100).toFixed(0);

  return {
    prob: Math.round(prob * 1000) / 1000,
    confidence: daysToDeadline <= 7 ? 'HIGH' : daysToDeadline <= 30 ? 'MEDIUM' : 'LOW',
    source: 'Crypto Market Data',
    matchQuality: 0.9, // Direct price data — high quality
    matchValidated: true,
    detail: `${parsed.coin.toUpperCase()} now $${coinData.currentPrice.toLocaleString()} (${pctFromTarget}% from $${parsed.targetPrice.toLocaleString()} target), ${daysToDeadline.toFixed(0)}d remaining, ${volPct}% annual vol`,
    currentPrice: coinData.currentPrice,
    targetPrice: parsed.targetPrice,
    direction: parsed.direction,
    daysToDeadline,
    volatility: coinData.annualizedVol,
    coin: parsed.coin,
    type: 'PRICE_TARGET',
  };
}

/**
 * Status for the signals pipeline.
 */
function getStatus() {
  return {
    configured: true, // CoinGecko is free, always available
    cacheSize: priceCache.size,
    supportedCoins: Object.keys(CRYPTO_IDS).length,
  };
}

module.exports = {
  getCryptoSignal,
  parseCryptoQuestion,
  getStatus,
};
