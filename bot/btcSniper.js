/**
 * MarketPlayMaker — BTC 5-Minute Sniper
 * ═══════════════════════════════════════
 *
 * Real-time Bitcoin direction trading on Polymarket "Up or Down" markets.
 *
 * Architecture:
 *   Binance WS ──→ Candle Builder ──→ Technical Indicators ──→ Signal
 *   Polymarket Poll ──→ Market Detector ──→ Auto-Execute ──→ Telegram
 *
 * Data Sources (all free, no API keys):
 *   1. Binance WebSocket — sub-second BTC/USDT price + trades
 *   2. 1m / 5m candle history (built in real-time from trades)
 *   3. Aggregated trade flow (buy vs sell volume)
 *
 * Indicators (calculated on every 1m candle close):
 *   - RSI (14-period, 1m)
 *   - EMA 9 / 21 crossover (1m)
 *   - Bollinger Bands (20, 2σ, 5m)
 *   - VWAP (session-based)
 *   - Rate of Change (5-bar, 1m)
 *   - Buy/Sell volume ratio (from aggTrades)
 *   - Price vs VWAP deviation
 *
 * Signal:
 *   Composite score from -100 (STRONG DOWN) to +100 (STRONG UP)
 *   Trades when |score| ≥ threshold AND Polymarket market available
 *
 * Speed Advantage:
 *   - Connects before markets open
 *   - Detects new "Up or Down" markets within 30s of listing
 *   - Executes within 1-2s of signal confirmation
 */

const WebSocket = require('ws');
const log = require('./utils/logger');
const client = require('./polymarket/client');
const userStore = require('./userStore');
const ictEngine = require('./engine/ictEngine');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const CFG = {
  // Kraken WebSocket v2 (EU-accessible, replaces Binance)
  krakenWsUrl: 'wss://ws.kraken.com/v2',

  // Candle history
  maxCandles1m: 120,     // 2 hours of 1m candles
  maxCandles5m: 60,      // 5 hours of 5m candles

  // Indicator params
  rsiPeriod: 14,
  emaFast: 9,
  emaSlow: 21,
  bbPeriod: 20,
  bbStdDev: 2,
  rocPeriod: 5,

  // Signal thresholds
  signalThreshold: 45,          // |score| ≥ 45 = tradeable — raised from 35
  strongSignalThreshold: 65,    // |score| ≥ 65 = strong — raised from 55
  minConfidence: 0.62,          // 62%+ directional confidence — raised from 55%

  // Trade flow
  flowWindowMs: 60000,          // 1-minute rolling window for buy/sell ratio
  flowBucketMs: 5000,           // 5s buckets within the window

  // Polymarket scanning
  marketPollMs: 30000,          // Check for new markets every 30s
  marketPollFastMs: 10000,      // 10s when we expect a market soon

  // Trading
  maxTradeSize: 50,             // Max $50 per trade — reduced from $100
  kellyFraction: 0.10,          // 10% Kelly (more conservative) — reduced from 15%
  bankroll: 1000,
  maxDailyLoss: 25,             // Stop after $25 daily loss — reduced from $50
  maxDailyTrades: 10,           // Max 10 trades per day — reduced from 20
  cooldownMs: 60000,            // 60s between trades on same market — raised from 30s

  // Safety guards
  minMinutesToExpiry: 5,        // Don't trade markets expiring within 5 minutes
  minPrice: 0.08,               // Reject if entry price < 8 cents (market decided)
  maxPrice: 0.92,               // Reject if entry price > 92 cents (market decided)
  minRawEdge: 0.04,             // Need 4% raw edge minimum — raised from 2%
  minNetEdge: 0.02,             // Need 2% net edge minimum — raised from 1%

  // State
  stateFile: path.join(__dirname, 'logs', 'btc-sniper-state.json'),
};

// ═══════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════

let running = false;
let krakenWs = null;
let reconnectTimer = null;
// Candle builders (populated from Kraken trade stream)
let activeCandleBuilders = { '1m': null, '5m': null };
let reconnectAttempts = 0;
let marketPollTimer = null;

// Price data
let lastPrice = null;
let lastPriceTime = 0;
let priceAtMarketOpen = null;    // Price when "Up or Down" market was listed

// Candle history
const candles1m = [];            // { open, high, low, close, volume, buyVol, sellVol, ts }
const candles5m = [];
let currentCandle1m = null;
let currentCandle5m = null;

// Trade flow (real-time buy/sell pressure)
const tradeFlow = [];            // { ts, price, qty, isBuyerMaker }

// Indicators (updated every 1m candle close)
let indicators = {
  rsi: 50,
  ema9: 0,
  ema21: 0,
  emaCross: 'NEUTRAL',          // 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  bbUpper: 0,
  bbMiddle: 0,
  bbLower: 0,
  bbWidth: 0,
  bbPosition: 0.5,              // 0 = at lower, 1 = at upper
  vwap: 0,
  vwapDev: 0,                   // % deviation from VWAP
  roc: 0,                       // Rate of change (%)
  buyRatio: 0.5,                // Buy volume / total volume
  momentum: 0,                  // Weighted momentum score
  trend: 'NEUTRAL',             // 'UP' | 'DOWN' | 'NEUTRAL'
  volatility: 'NORMAL',         // 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
};

// Signal
let currentSignal = {
  direction: 'NEUTRAL',         // 'UP' | 'DOWN' | 'NEUTRAL'
  score: 0,                     // -100 to +100
  confidence: 0.5,              // 0.0 to 1.0
  reasons: [],
  updatedAt: null,
};

// ICT analysis state (updated every 1m candle close)
let lastIctAnalysis = null;

// Active Polymarket "Up or Down" markets
let activeMarkets = [];          // Current BTC Up/Down markets
let lastMarketPoll = 0;

// Positions & P&L
let positions = [];
let tradeHistory = [];
let dailyPnL = 0;
let dailyTrades = 0;
let lastTradeDay = null;

// Stats
let stats = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  totalPnL: 0,
  winRate: 0,
  avgEdge: 0,
  bestTrade: null,
  worstTrade: null,
  signalsGenerated: 0,
  marketsDetected: 0,
  startedAt: null,
  lastSignalAt: null,
};

// Telegram (injected)
let tgSend = null;
let tgSendTo = null;

// VWAP accumulators (reset daily)
let vwapCumPV = 0;  // cumulative (price * volume)
let vwapCumV = 0;   // cumulative volume

// ═══════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════

function saveState() {
  try {
    fs.mkdirSync(path.dirname(CFG.stateFile), { recursive: true });
    fs.writeFileSync(CFG.stateFile, JSON.stringify({
      positions, tradeHistory: tradeHistory.slice(-200),
      stats, dailyPnL, dailyTrades, lastTradeDay,
    }, null, 2));
  } catch (e) { log.warn('SNIPER', `Save failed: ${e.message}`); }
}

function loadState() {
  try {
    if (!fs.existsSync(CFG.stateFile)) return;
    const s = JSON.parse(fs.readFileSync(CFG.stateFile, 'utf8'));
    positions = s.positions || [];
    tradeHistory = s.tradeHistory || [];
    if (s.stats) Object.assign(stats, s.stats);
    dailyPnL = s.dailyPnL || 0;
    dailyTrades = s.dailyTrades || 0;
    lastTradeDay = s.lastTradeDay || null;
    log.info('SNIPER', `State loaded: ${tradeHistory.length} trades, P&L $${stats.totalPnL.toFixed(2)}`);
  } catch (e) { log.warn('SNIPER', `Load failed: ${e.message}`); }
}

// ═══════════════════════════════════════════════════════════════════════
// KRAKEN WEBSOCKET v2 — Real-Time BTC Price & Trades (EU-accessible)
// ═══════════════════════════════════════════════════════════════════════

// Build 1m and 5m candles from individual trade ticks
function getCandleKey(intervalMs, ts) {
  return Math.floor(ts / intervalMs) * intervalMs;
}

function ingestTradeIntoCandles(price, qty, isBuy, ts) {
  for (const [label, intervalMs] of [['1m', 60000], ['5m', 300000]]) {
    const key = getCandleKey(intervalMs, ts);
    let c = activeCandleBuilders[label];

    if (!c || c.ts !== key) {
      // Previous candle closed — flush it
      if (c) {
        const closed = { ...c, closed: true };
        if (label === '1m') {
          candles1m.push(closed);
          if (candles1m.length > CFG.maxCandles1m) candles1m.shift();
          onCandleClose1m();
        } else {
          candles5m.push(closed);
          if (candles5m.length > CFG.maxCandles5m) candles5m.shift();
          onCandleClose5m();
        }
      }
      // Start new candle
      c = { open: price, high: price, low: price, close: price,
             volume: 0, buyVol: 0, sellVol: 0, ts: key, closed: false };
      activeCandleBuilders[label] = c;
      if (label === '1m') currentCandle1m = c;
      else currentCandle5m = c;
    }

    c.high = Math.max(c.high, price);
    c.low  = Math.min(c.low,  price);
    c.close = price;
    c.volume += qty;
    if (isBuy) c.buyVol += qty; else c.sellVol += qty;

    if (label === '1m') currentCandle1m = c;
    else currentCandle5m = c;
  }
}

function connectKraken() {
  if (krakenWs) {
    try { krakenWs.close(); } catch {}
    krakenWs = null;
  }

  log.info('SNIPER', `Connecting to Kraken WebSocket...`);
  krakenWs = new WebSocket(CFG.krakenWsUrl);

  krakenWs.on('open', () => {
    reconnectAttempts = 0;
    log.info('SNIPER', `🟢 Kraken WebSocket connected — live BTC feed active`);
    // Subscribe to real-time trades for BTC/USD
    krakenWs.send(JSON.stringify({
      method: 'subscribe',
      params: { channel: 'trade', symbol: ['BTC/USD'] },
    }));
  });

  krakenWs.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.channel !== 'trade' || !Array.isArray(msg.data)) return;
      for (const t of msg.data) {
        const price = parseFloat(t.price);
        const qty   = parseFloat(t.qty);
        const isBuy = t.side === 'buy';
        const ts    = t.timestamp ? new Date(t.timestamp).getTime() : Date.now();

        lastPrice     = price;
        lastPriceTime = ts;

        // Trade flow (same as Binance aggTrade)
        tradeFlow.push({ ts, price, qty, isBuy });
        const cutoff = Date.now() - CFG.flowWindowMs;
        while (tradeFlow.length > 0 && tradeFlow[0].ts < cutoff) tradeFlow.shift();
        vwapCumPV += price * qty;
        vwapCumV  += qty;

        // Feed candle builders
        ingestTradeIntoCandles(price, qty, isBuy, ts);
      }
    } catch {}
  });

  krakenWs.on('close', () => {
    log.warn('SNIPER', 'Kraken WebSocket closed');
    krakenWs = null;
    scheduleReconnect();
  });

  krakenWs.on('error', (err) => {
    log.warn('SNIPER', `Kraken WS error: ${err.message}`);
  });
}

function scheduleReconnect() {
  if (!running || reconnectTimer) return;
  reconnectAttempts++;
  const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts - 1), 30000);
  log.info('SNIPER', `Reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (running) connectKraken();
  }, delay);
}

// ═══════════════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════════════

function calcEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;

  // Initial averages
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed RSI
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) {
      avgGain = (avgGain * (period - 1) + delta) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(delta)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcBollingerBands(closes, period = 20, stdDevMult = 2) {
  if (closes.length < period) {
    const avg = closes.reduce((s, c) => s + c, 0) / closes.length;
    return { upper: avg, middle: avg, lower: avg, width: 0 };
  }
  const slice = closes.slice(-period);
  const middle = slice.reduce((s, c) => s + c, 0) / period;
  const variance = slice.reduce((s, c) => s + Math.pow(c - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + stdDevMult * stdDev,
    middle,
    lower: middle - stdDevMult * stdDev,
    width: middle > 0 ? (stdDevMult * 2 * stdDev) / middle : 0,
  };
}

function calcROC(closes, period = 5) {
  if (closes.length <= period) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - period];
  return past > 0 ? ((current - past) / past) * 100 : 0;
}

function calcBuyRatio() {
  if (tradeFlow.length === 0) return 0.5;
  let buyVol = 0, sellVol = 0;
  for (const t of tradeFlow) {
    if (t.isBuy) buyVol += t.qty * t.price;
    else sellVol += t.qty * t.price;
  }
  const total = buyVol + sellVol;
  return total > 0 ? buyVol / total : 0.5;
}

function calcVWAP() {
  return vwapCumV > 0 ? vwapCumPV / vwapCumV : (lastPrice || 0);
}

// ─── Update all indicators (called on each 1m candle close) ─────────

function updateIndicators() {
  if (candles1m.length < 5) return;

  const closes1m = candles1m.map(c => c.close);
  const closes5m = candles5m.map(c => c.close);

  // RSI
  indicators.rsi = calcRSI(closes1m, CFG.rsiPeriod);

  // EMAs
  const prevEma9 = indicators.ema9;
  const prevEma21 = indicators.ema21;
  indicators.ema9 = calcEMA(closes1m, CFG.emaFast);
  indicators.ema21 = calcEMA(closes1m, CFG.emaSlow);

  // EMA cross detection
  if (indicators.ema9 > indicators.ema21 && prevEma9 <= prevEma21) {
    indicators.emaCross = 'BULLISH';
  } else if (indicators.ema9 < indicators.ema21 && prevEma9 >= prevEma21) {
    indicators.emaCross = 'BEARISH';
  } else if (indicators.ema9 > indicators.ema21) {
    indicators.emaCross = 'BULLISH';
  } else if (indicators.ema9 < indicators.ema21) {
    indicators.emaCross = 'BEARISH';
  } else {
    indicators.emaCross = 'NEUTRAL';
  }

  // Bollinger Bands (on 5m candles for smoothness)
  if (closes5m.length >= 5) {
    const bb = calcBollingerBands(closes5m, CFG.bbPeriod, CFG.bbStdDev);
    indicators.bbUpper = bb.upper;
    indicators.bbMiddle = bb.middle;
    indicators.bbLower = bb.lower;
    indicators.bbWidth = bb.width;
    const price = lastPrice || closes1m[closes1m.length - 1];
    const range = bb.upper - bb.lower;
    indicators.bbPosition = range > 0 ? (price - bb.lower) / range : 0.5;
  }

  // VWAP
  indicators.vwap = calcVWAP();
  if (lastPrice && indicators.vwap > 0) {
    indicators.vwapDev = ((lastPrice - indicators.vwap) / indicators.vwap) * 100;
  }

  // Rate of change
  indicators.roc = calcROC(closes1m, CFG.rocPeriod);

  // Buy/sell ratio
  indicators.buyRatio = calcBuyRatio();

  // Trend
  if (indicators.ema9 > indicators.ema21 && indicators.rsi > 50) {
    indicators.trend = 'UP';
  } else if (indicators.ema9 < indicators.ema21 && indicators.rsi < 50) {
    indicators.trend = 'DOWN';
  } else {
    indicators.trend = 'NEUTRAL';
  }

  // Volatility regime
  if (indicators.bbWidth > 0.03) indicators.volatility = 'EXTREME';
  else if (indicators.bbWidth > 0.015) indicators.volatility = 'HIGH';
  else if (indicators.bbWidth > 0.005) indicators.volatility = 'NORMAL';
  else indicators.volatility = 'LOW';
}

// ═══════════════════════════════════════════════════════════════════════
// SIGNAL GENERATOR — Composite Directional Score
// ═══════════════════════════════════════════════════════════════════════

function generateSignal() {
  if (candles1m.length < 15) {
    currentSignal = { direction: 'NEUTRAL', score: 0, confidence: 0.5, reasons: ['Warming up...'], updatedAt: new Date().toISOString() };
    return currentSignal;
  }

  let score = 0;
  const reasons = [];

  // ─── 1. RSI (weight: 20) ──────────────────────────────────────
  const rsi = indicators.rsi;
  if (rsi >= 70) {
    score -= 15 + Math.min(5, (rsi - 70) / 3);    // Overbought → down
    reasons.push(`RSI ${rsi.toFixed(0)} (overbought)`);
  } else if (rsi <= 30) {
    score += 15 + Math.min(5, (30 - rsi) / 3);    // Oversold → up
    reasons.push(`RSI ${rsi.toFixed(0)} (oversold)`);
  } else if (rsi >= 55) {
    score += (rsi - 50) * 0.6;
    reasons.push(`RSI ${rsi.toFixed(0)} (bullish)`);
  } else if (rsi <= 45) {
    score -= (50 - rsi) * 0.6;
    reasons.push(`RSI ${rsi.toFixed(0)} (bearish)`);
  }

  // ─── 2. EMA Crossover (weight: 25) ────────────────────────────
  const emaDiff = indicators.ema9 - indicators.ema21;
  const emaDiffPct = indicators.ema21 > 0 ? (emaDiff / indicators.ema21) * 100 : 0;
  if (indicators.emaCross === 'BULLISH') {
    score += 10 + Math.min(15, Math.abs(emaDiffPct) * 50);
    reasons.push(`EMA9 > EMA21 (+${emaDiffPct.toFixed(3)}%)`);
  } else if (indicators.emaCross === 'BEARISH') {
    score -= 10 + Math.min(15, Math.abs(emaDiffPct) * 50);
    reasons.push(`EMA9 < EMA21 (${emaDiffPct.toFixed(3)}%)`);
  }

  // ─── 3. Bollinger Bands (weight: 15) ──────────────────────────
  const bbPos = indicators.bbPosition;
  if (bbPos > 0.9) {
    // At upper band — could be breakout (strong trend) or reversal
    if (indicators.trend === 'UP' && rsi < 75) {
      score += 8;    // Strong trend, running at band
      reasons.push('BB upper band breakout (trend)');
    } else {
      score -= 10;
      reasons.push('BB upper band (reversal risk)');
    }
  } else if (bbPos < 0.1) {
    if (indicators.trend === 'DOWN' && rsi > 25) {
      score -= 8;
      reasons.push('BB lower band breakdown (trend)');
    } else {
      score += 10;
      reasons.push('BB lower band (bounce likely)');
    }
  }

  // Bollinger squeeze → incoming volatility, trade with momentum
  if (indicators.volatility === 'LOW') {
    reasons.push('BB squeeze (breakout incoming)');
    // Don't add score — direction unclear, but boost confidence on momentum
  }

  // ─── 4. Rate of Change (weight: 15) ───────────────────────────
  const roc = indicators.roc;
  if (Math.abs(roc) > 0.05) {
    const rocScore = Math.min(15, Math.abs(roc) * 100);
    score += roc > 0 ? rocScore : -rocScore;
    reasons.push(`ROC: ${roc > 0 ? '+' : ''}${roc.toFixed(3)}%`);
  }

  // ─── 5. VWAP Deviation (weight: 10) ───────────────────────────
  const vwapDev = indicators.vwapDev;
  if (Math.abs(vwapDev) > 0.05) {
    // Above VWAP = buyers in control, below = sellers
    const vwapScore = Math.min(10, Math.abs(vwapDev) * 30);
    score += vwapDev > 0 ? vwapScore : -vwapScore;
    reasons.push(`VWAP: ${vwapDev > 0 ? 'above' : 'below'} (${vwapDev.toFixed(3)}%)`);
  }

  // ─── 6. Buy/Sell Volume Ratio (weight: 15) ────────────────────
  const buyRatio = indicators.buyRatio;
  if (buyRatio > 0.58) {
    score += Math.min(15, (buyRatio - 0.5) * 100);
    reasons.push(`Buy pressure: ${(buyRatio * 100).toFixed(0)}%`);
  } else if (buyRatio < 0.42) {
    score -= Math.min(15, (0.5 - buyRatio) * 100);
    reasons.push(`Sell pressure: ${((1 - buyRatio) * 100).toFixed(0)}%`);
  }

  // ─── Clamp & classify ─────────────────────────────────────────
  score = Math.max(-100, Math.min(100, score));

  const absScore = Math.abs(score);
  const direction = score > CFG.signalThreshold ? 'UP'
    : score < -CFG.signalThreshold ? 'DOWN'
    : 'NEUTRAL';

  // ★ DEFLATED confidence curve — old curve was too generous
  // Old: 0.5 + (absScore/100)*0.45 → score 45 = 70% confidence (too high!)
  // New: 0.5 + (absScore/100)*0.30 → score 45 = 63.5%, score 65 = 69.5%
  // Only scores 80+ reach 74%, preventing overconfident edge calculations
  const confidence = 0.5 + (absScore / 100) * 0.30;

  // ★ REQUIRE INDICATOR AGREEMENT — at least 3 indicators must align
  // Count how many indicators agree with the direction
  let agreeingIndicators = 0;
  if (direction === 'UP') {
    if (rsi > 50) agreeingIndicators++;
    if (indicators.emaCross === 'BULLISH') agreeingIndicators++;
    if (indicators.buyRatio > 0.52) agreeingIndicators++;
    if (indicators.vwapDev > 0) agreeingIndicators++;
    if (indicators.roc > 0) agreeingIndicators++;
  } else if (direction === 'DOWN') {
    if (rsi < 50) agreeingIndicators++;
    if (indicators.emaCross === 'BEARISH') agreeingIndicators++;
    if (indicators.buyRatio < 0.48) agreeingIndicators++;
    if (indicators.vwapDev < 0) agreeingIndicators++;
    if (indicators.roc < 0) agreeingIndicators++;
  }
  // If fewer than 3/5 indicators agree, downgrade to NEUTRAL
  const effectiveDirection = (direction !== 'NEUTRAL' && agreeingIndicators < 3) ? 'NEUTRAL' : direction;
  if (direction !== 'NEUTRAL' && effectiveDirection === 'NEUTRAL') {
    reasons.push(`Only ${agreeingIndicators}/5 indicators agree — downgraded to NEUTRAL`);
  }

  currentSignal = {
    direction: effectiveDirection,
    score: Math.round(score * 10) / 10,
    confidence: Math.round(confidence * 1000) / 1000,
    reasons,
    strength: absScore >= CFG.strongSignalThreshold ? 'STRONG' : absScore >= CFG.signalThreshold ? 'MODERATE' : 'WEAK',
    agreeingIndicators,
    updatedAt: new Date().toISOString(),
    price: lastPrice,
    indicators: { ...indicators },
  };

  stats.signalsGenerated++;
  stats.lastSignalAt = currentSignal.updatedAt;

  return currentSignal;
}

// ─── Called when each 1m candle closes ───────────────────────────────

function onCandleClose1m() {
  updateIndicators();
  const signal = generateSignal();

  // ─── ICT Confluence Filter ──────────────────────────────────────
  // Run ICT analysis on 1m candles when we have enough data (≥30)
  if (candles1m.length >= 30) {
    try {
      // Map btcSniper candle format to ICT engine format (ts → time)
      const ictCandles = candles1m.map(c => ({
        open: c.open, high: c.high, low: c.low, close: c.close,
        volume: c.volume, time: c.ts,
      }));
      lastIctAnalysis = ictEngine.analyze(ictCandles, { symbol: 'BTCUSDT', timeframe: '1m' });
    } catch (err) {
      log.warn('SNIPER', `ICT analysis error: ${err.message}`);
      lastIctAnalysis = null;
    }
  }

  // ★ BLOCK TRADES DURING WARMUP — need ICT data before trading
  if (!lastIctAnalysis) {
    if (signal.direction !== 'NEUTRAL' && candles1m.length < 30) {
      log.info('SNIPER', `⏳ Warming up: ${candles1m.length}/30 candles — signal ${signal.direction} (${signal.score}) blocked until ICT ready`);
    }
    return; // Never trade without ICT confluence data
  }

  // Log meaningful signals
  if (signal.direction !== 'NEUTRAL') {
    const ictTag = lastIctAnalysis ? ` | ICT: ${lastIctAnalysis.confluence?.score || 0}/7 ${lastIctAnalysis.alertLevel}` : '';
    const emoji = signal.direction === 'UP' ? '🟢' : '🔴';
    log.info('SNIPER', `${emoji} Signal: ${signal.direction} (${signal.score}) @ $${lastPrice?.toLocaleString()} | ${signal.reasons.join(' | ')}${ictTag}`);
  }

  // Check if we should trade — require ICT confluence ≥ 4 (HIGH) for trade execution
  if (signal.direction !== 'NEUTRAL' && activeMarkets.length > 0) {
    const ictScore = lastIctAnalysis?.confluence?.score || 0;
    const ictBias = lastIctAnalysis?.bias || 'NEUTRAL';

    // Gate: need ICT confluence ≥ 4 for HIGH alert
    if (ictScore < 4) {
      if (ictScore >= 2) {
        log.info('SNIPER', `⏳ Signal blocked by ICT filter: confluence ${ictScore}/7 (need ≥4). Bias: ${ictBias}`);
      }
      return; // Not enough ICT confluence — skip trade
    }

    // Bonus: check ICT bias alignment with signal direction
    const biasAligned = (signal.direction === 'UP' && ictBias === 'BULLISH') ||
                        (signal.direction === 'DOWN' && ictBias === 'BEARISH');

    if (!biasAligned && ictBias !== 'NEUTRAL') {
      log.info('SNIPER', `⚠️ ICT bias (${ictBias}) conflicts with signal (${signal.direction}) — skipping`);
      return; // ICT structure disagrees with signal direction
    }

    // ★ EXTRA: Require signal confidence above minimum
    if (signal.confidence < CFG.minConfidence) {
      log.info('SNIPER', `⚠️ Signal confidence ${(signal.confidence * 100).toFixed(0)}% below min ${(CFG.minConfidence * 100).toFixed(0)}% — skipping`);
      return;
    }

    log.info('SNIPER', `✅ ICT confluence ${ictScore}/7 + bias ${ictBias} aligned — executing`);
    tryExecute(signal);
  }
}

function onCandleClose5m() {
  // 5m candle close triggers Bollinger Band update (already in updateIndicators)
  updateIndicators();
}

// ═══════════════════════════════════════════════════════════════════════
// POLYMARKET SCANNER — Detect "Up or Down" Markets
// ═══════════════════════════════════════════════════════════════════════

async function pollMarkets() {
  if (!running) return;

  try {
    const allMarkets = await client.getMarkets({ limit: 100, active: true, closed: false });

    const btcUpDown = allMarkets.filter(m => {
      const q = (m.question || '').toLowerCase();
      return /bitcoin/i.test(q) && /up\s+or\s+down/i.test(q);
    });

    const newMarkets = [];
    for (const m of btcUpDown) {
      const end = m.endDate ? new Date(m.endDate).getTime() : 0;
      // Only markets that haven't expired yet
      if (end <= Date.now()) continue;

      // ★ SAFETY: Skip markets too close to expiry
      const minsLeft = (end - Date.now()) / 60000;
      if (minsLeft < (CFG.minMinutesToExpiry || 5)) continue;

      const outcomePrices = m.outcomePrices ? JSON.parse(m.outcomePrices) : [];
      const tokenIds = m.clobTokenIds ? JSON.parse(m.clobTokenIds) : [];
      const outcomes = m.outcomes ? JSON.parse(m.outcomes) : ['Up', 'Down'];

      const upPrice = parseFloat(outcomePrices[0] || 0.5);
      const downPrice = parseFloat(outcomePrices[1] || 0.5);

      // ★ SAFETY: Skip markets where prices indicate already decided
      if (upPrice < (CFG.minPrice || 0.08) && downPrice < (CFG.minPrice || 0.08)) continue;
      if (upPrice > (CFG.maxPrice || 0.92) && downPrice > (CFG.maxPrice || 0.92)) continue;

      newMarkets.push({
        question: m.question,
        slug: m.slug,
        conditionId: m.conditionId,
        endDate: m.endDate,
        upPrice,
        downPrice,
        upTokenId: tokenIds[0] || null,
        downTokenId: tokenIds[1] || null,
        outcomes,
        liquidity: parseFloat(m.liquidity || 0),
        volume24h: parseFloat(m.volume24hr || 0),
        minutesLeft: Math.max(0, (end - Date.now()) / 60000),
        detectedAt: new Date().toISOString(),
      });
    }

    // Detect newly appeared markets
    const existingIds = new Set(activeMarkets.map(m => m.conditionId));
    for (const nm of newMarkets) {
      if (!existingIds.has(nm.conditionId)) {
        stats.marketsDetected++;
        log.info('SNIPER', `🎯 NEW MARKET: "${nm.question}" | Up: ${(nm.upPrice * 100).toFixed(1)}¢ Down: ${(nm.downPrice * 100).toFixed(1)}¢ | ${nm.minutesLeft.toFixed(0)}min left`);

        // Record price at market detection for reference
        if (lastPrice) {
          nm.btcPriceAtDetection = lastPrice;
        }

        // Alert on Telegram
        if (tgSend) {
          tgSend([
            `🎯 NEW BTC Up/Down Market Detected!`,
            ``,
            `${nm.question}`,
            `⬆️ Up: ${(nm.upPrice * 100).toFixed(1)}¢ | ⬇️ Down: ${(nm.downPrice * 100).toFixed(1)}¢`,
            `⏱ ${nm.minutesLeft.toFixed(0)} minutes until resolution`,
            `💰 Liquidity: $${(nm.liquidity / 1000).toFixed(0)}k`,
            ``,
            `BTC: $${lastPrice?.toLocaleString() || '?'}`,
            `Signal: ${currentSignal.direction} (${currentSignal.score})`,
          ].join('\n'));
        }

        // Auto-execute if we have a signal AND ICT analysis is ready
        if (currentSignal.direction !== 'NEUTRAL' && lastIctAnalysis) {
          tryExecute(currentSignal, nm);
        } else if (!lastIctAnalysis) {
          log.info('SNIPER', `⏳ New market detected but ICT not ready — will trade on next candle close`);
        }
      }
    }

    activeMarkets = newMarkets;
    lastMarketPoll = Date.now();

  } catch (err) {
    log.warn('SNIPER', `Market poll failed: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TRADE EXECUTION
// ═══════════════════════════════════════════════════════════════════════

async function tryExecute(signal, specificMarket = null) {
  // Daily reset
  const today = new Date().toDateString();
  if (today !== lastTradeDay) {
    dailyPnL = 0;
    dailyTrades = 0;
    lastTradeDay = today;
    // Reset VWAP
    vwapCumPV = 0;
    vwapCumV = 0;
  }

  // Daily limits
  if (dailyPnL <= -CFG.maxDailyLoss) {
    log.info('SNIPER', `Daily loss limit ($${CFG.maxDailyLoss}) hit. Pausing.`);
    return;
  }
  if (dailyTrades >= CFG.maxDailyTrades) return;

  const markets = specificMarket ? [specificMarket] : activeMarkets;

  for (const market of markets) {
    // Skip if no time left
    if (market.minutesLeft < 0.5) continue;

    // ★ CRITICAL: Skip expired markets (endDate already passed)
    const endTime = market.endDate ? new Date(market.endDate).getTime() : 0;
    if (endTime > 0 && endTime <= Date.now()) {
      continue; // Market already ended — DO NOT TRADE
    }

    // ★ CRITICAL: Skip near-expiry markets
    if (market.minutesLeft < (CFG.minMinutesToExpiry || 5)) {
      continue; // Too close to expiry
    }

    // Skip if already have position in this market
    if (positions.some(p => p.conditionId === market.conditionId)) continue;

    // Skip if price too far from 50/50 (market already decided)
    const maxPrice = Math.max(market.upPrice, market.downPrice);
    if (maxPrice > (CFG.maxPrice || 0.92)) {
      continue; // Market already strongly priced — no edge
    }

    // ★ CRITICAL: Skip extreme low prices (market already resolved/decided)
    const minPrice = Math.min(market.upPrice, market.downPrice);
    if (minPrice < (CFG.minPrice || 0.08) && maxPrice < (CFG.minPrice || 0.08)) {
      continue; // Both sides near-zero — broken or already resolved
    }

    // ─── Edge calculation ─────────────────────────────────────
    // Our signal probability vs market price
    const isBuyUp = signal.direction === 'UP';
    const ourProb = signal.confidence;
    const marketPrice = isBuyUp ? market.upPrice : market.downPrice;
    const side = isBuyUp ? 'UP' : 'DOWN';
    const tokenId = isBuyUp ? market.upTokenId : market.downTokenId;

    const rawEdge = ourProb - marketPrice;

    // ★ SAFETY: Reject extreme entry prices (market already decided)
    if (marketPrice < (CFG.minPrice || 0.08) || marketPrice > (CFG.maxPrice || 0.92)) {
      continue; // Price indicates market is already decided
    }

    // Need positive edge — use configurable thresholds
    if (rawEdge < (CFG.minRawEdge || 0.04)) continue;  // At least 4% raw edge

    // Net edge after fees
    const feeEstimate = marketPrice * 0.02; // 2% fee rate
    const slippageEstimate = 0.005;         // 0.5% typical
    const netEdge = rawEdge - feeEstimate - slippageEstimate;

    if (netEdge < (CFG.minNetEdge || 0.02)) continue; // Need 2% net edge minimum

    // ─── Kelly sizing ─────────────────────────────────────────
    const b = (1 / marketPrice) - 1;
    const p = ourProb;
    const q = 1 - p;
    const kelly = Math.max(0, (b * p - q) / b) * CFG.kellyFraction;

    const tradeSize = Math.min(
      CFG.maxTradeSize,
      CFG.bankroll * kelly,
      CFG.bankroll * 0.05  // Hard cap 5% per trade — reduced from 10%
    );

    if (tradeSize < 2) continue;

    // ─── Execute ──────────────────────────────────────────────
    const shares = tradeSize / marketPrice;

    const position = {
      id: `snipe_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      conditionId: market.conditionId,
      question: market.question,
      side,
      tokenId,
      size: Math.round(tradeSize * 100) / 100,
      entryPrice: marketPrice,
      shares: Math.round(shares * 100) / 100,
      ourProb: Math.round(ourProb * 1000) / 1000,
      rawEdge: Math.round(rawEdge * 1000) / 1000,
      netEdge: Math.round(netEdge * 1000) / 1000,
      signalScore: signal.score,
      signalStrength: signal.strength,
      btcPrice: lastPrice,
      endDate: market.endDate,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      liveStatus: 'PAPER',
    };

    // Try live execution
    try {
      const clobExec = require('./polymarket/clobExecutor');
      if (clobExec.getStatus().initialized) {
        const result = await clobExec.placeTrade({
          tokenId,
          side: 'BUY',
          price: marketPrice,
          size: tradeSize,
          maxSlippage: 0.03,
        });
        position.liveOrderId = result?.orderId;
        position.liveStatus = result?.status || 'SUBMITTED';
      }
    } catch { /* paper */ }

    positions.push(position);
    dailyTrades++;
    stats.totalTrades++;
    saveState();

    // ─── Route to Paper Trader for unified tracking ──────────────
    try {
      const paperTrader = require('./engine/paperTrader');
      const ptSide = 'YES'; // Buying the directional outcome = YES
      const ptOpp = {
        conditionId: market.conditionId,
        market: market.question,
        strategy: 'BTC_SNIPER',
        side: ptSide,
        score: Math.round(Math.abs(signal.score)),       // 0-100 scale
        confidence: signal.strength || 'MODERATE',
        price: marketPrice,
        yesPrice: marketPrice,
        noPrice: 1 - marketPrice,
        positionSize: tradeSize,
        endDate: market.endDate,
        edge: rawEdge,
        netEdge: netEdge,
        riskLevel: signal.strength === 'STRONG' ? 'LOW' : 'MEDIUM',
        liquidity: market.liquidity || 50000,
      };
      paperTrader.recordScanResults([ptOpp]);
    } catch (ptErr) {
      log.warn('SNIPER', `Paper trader bridge failed: ${ptErr.message}`);
    }

    const emoji = side === 'UP' ? '⬆️' : '⬇️';
    log.info('SNIPER', `${emoji} SNIPED: ${side} "${market.question}" | $${tradeSize.toFixed(2)} @ ${(marketPrice * 100).toFixed(1)}¢ | edge: ${(netEdge * 100).toFixed(1)}% | signal: ${signal.score} | ${position.liveStatus}`);

    // Telegram alert
    if (tgSend) {
      tgSend([
        `⚡ BTC Sniper Trade!`,
        ``,
        `${emoji} ${side} "${market.question}"`,
        `💰 $${tradeSize.toFixed(2)} @ ${(marketPrice * 100).toFixed(1)}¢`,
        `📊 Edge: ${(netEdge * 100).toFixed(1)}% net | Signal: ${signal.score}`,
        `₿ BTC: $${lastPrice?.toLocaleString() || '?'}`,
        `⏱ Resolves: ${market.minutesLeft.toFixed(0)}min`,
        ``,
        `Signal: ${signal.reasons.slice(0, 3).join(' | ')}`,
        `Status: ${position.liveStatus}`,
      ].join('\n'));
    }

    // Copy trades for eligible users
    await copyTradeToUsers(position, signal);

    break; // One trade per cycle
  }
}

async function copyTradeToUsers(position, signal) {
  const traders = userStore.getActiveTraders();
  for (const user of traders) {
    if (!user.settings.copyTrading || !user.settings.enabled) continue;
    if (!userStore.hasValidKeys(user.chatId)) continue;

    const userSize = Math.min(user.settings.maxTradeSize || 50, position.size);
    if (userSize < 2) continue;

    try {
      const resp = await fetch('https://clob.polymarket.com/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_API_KEY': user.polymarket.apiKey,
          'POLY_API_SECRET': user.polymarket.apiSecret,
          'POLY_PASSPHRASE': user.polymarket.passphrase,
        },
        body: JSON.stringify({
          tokenID: position.tokenId,
          price: position.entryPrice,
          size: userSize,
          side: 'BUY',
          type: 'GTC',
        }),
      });
      const result = await resp.json();
      userStore.recordTrade(user.chatId, {
        market: position.question, side: position.side,
        size: userSize, price: position.entryPrice,
        source: 'btc-sniper-copy', status: resp.ok ? 'SUBMITTED' : 'FAILED',
      });
      if (tgSendTo) {
        tgSendTo(user.chatId, `⚡ Sniper copy: ${position.side} $${userSize.toFixed(2)} on "${position.question}"`);
      }
    } catch (err) {
      log.warn('SNIPER', `Copy trade failed for ${user.chatId}: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RESOLUTION CHECKER
// ═══════════════════════════════════════════════════════════════════════

async function checkResolutions() {
  const toResolve = [];

  for (const pos of positions) {
    if (pos.status !== 'OPEN') continue;

    try {
      const market = await client.getMarketById(pos.conditionId);
      if (!market) continue;

      if (market.resolved) {
        const resolution = market.resolution;  // 'YES' = Up won, 'NO' = Down won
        // Map resolution to Up/Down
        const upWon = resolution === 'YES';
        const won = (pos.side === 'UP' && upWon) || (pos.side === 'DOWN' && !upWon);

        const payout = won ? pos.shares : 0;
        const pnl = payout - pos.size;

        pos.status = 'RESOLVED';
        pos.won = won;
        pos.payout = Math.round(payout * 100) / 100;
        pos.pnl = Math.round(pnl * 100) / 100;
        pos.resolution = upWon ? 'UP' : 'DOWN';
        pos.resolvedAt = new Date().toISOString();

        if (won) stats.wins++;
        else stats.losses++;
        stats.totalPnL = Math.round((stats.totalPnL + pnl) * 100) / 100;
        dailyPnL += pnl;

        if (!stats.bestTrade || pnl > (stats.bestTrade.pnl || 0)) {
          stats.bestTrade = { market: pos.question, pnl: pos.pnl, side: pos.side };
        }
        if (!stats.worstTrade || pnl < (stats.worstTrade.pnl || 0)) {
          stats.worstTrade = { market: pos.question, pnl: pos.pnl, side: pos.side };
        }
        const total = stats.wins + stats.losses;
        stats.winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

        toResolve.push(pos);

        const emoji = won ? '✅' : '❌';
        log.info('SNIPER', `${emoji} RESOLVED: ${pos.side} "${pos.question}" → ${pos.resolution} | P&L: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`);
      } else {
        // Check if past end date (auto-resolve via current prices)
        const endTime = new Date(pos.endDate).getTime();
        if (Date.now() > endTime + 120000) {
          // 2min past end, check tokens
          if (market.yesPrice !== undefined) {
            const upPrice = market.yesPrice || 0;
            const upWon = upPrice > 0.9; // If UP token near $1, UP won
            const downWon = upPrice < 0.1;
            if (upWon || downWon) {
              const won = (pos.side === 'UP' && upWon) || (pos.side === 'DOWN' && downWon);
              const payout = won ? pos.shares : 0;
              const pnl = payout - pos.size;

              pos.status = 'RESOLVED';
              pos.won = won;
              pos.payout = Math.round(payout * 100) / 100;
              pos.pnl = Math.round(pnl * 100) / 100;
              pos.resolution = upWon ? 'UP' : 'DOWN';
              pos.resolvedAt = new Date().toISOString();

              if (won) stats.wins++; else stats.losses++;
              stats.totalPnL = Math.round((stats.totalPnL + pnl) * 100) / 100;
              dailyPnL += pnl;
              const total = stats.wins + stats.losses;
              stats.winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

              toResolve.push(pos);
            }
          }
        }
      }
    } catch (err) {
      log.warn('SNIPER', `Resolution check failed: ${err.message}`);
    }
  }

  if (toResolve.length > 0) {
    for (const pos of toResolve) tradeHistory.push(pos);
    positions = positions.filter(p => p.status === 'OPEN');
    saveState();

    if (tgSend) {
      for (const pos of toResolve) {
        const emoji = pos.won ? '✅' : '❌';
        tgSend([
          `${emoji} BTC Sniper Result`,
          ``,
          `${pos.side} "${pos.question}" → ${pos.resolution}`,
          `P&L: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`,
          `Entry: ${(pos.entryPrice * 100).toFixed(1)}¢ | Signal: ${pos.signalScore}`,
          ``,
          `📊 Total: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | WR: ${stats.winRate}% (${stats.wins}W/${stats.losses}L)`,
          `Today: ${dailyPnL >= 0 ? '+' : ''}$${dailyPnL.toFixed(2)}`,
        ].join('\n'));
      }
    }
  }

  return toResolve;
}

// ═══════════════════════════════════════════════════════════════════════
// START / STOP
// ═══════════════════════════════════════════════════════════════════════

function initialize(opts = {}) {
  if (opts.sendToAll) tgSend = opts.sendToAll;
  if (opts.sendTo) tgSendTo = opts.sendTo;
  if (opts.bankroll) CFG.bankroll = opts.bankroll;
  loadState();
  log.info('SNIPER', '⚡ BTC 5-min Sniper initialized');
}

function start() {
  if (running) return;
  running = true;
  stats.startedAt = new Date().toISOString();

  log.info('SNIPER', '⚡ ═══════════════════════════════════════════');
  log.info('SNIPER', '⚡  BTC 5-Minute Sniper — LIVE                ');
  log.info('SNIPER', '⚡ ═══════════════════════════════════════════');

  // Connect to Binance for real-time price
  connectKraken();

  // Start polling Polymarket for "Up or Down" markets
  pollMarkets();
  marketPollTimer = setInterval(() => {
    pollMarkets();
    checkResolutions();
  }, CFG.marketPollMs);

  if (tgSend) {
    tgSend([
      `⚡ BTC 5-Min Sniper LIVE!`,
      `━━━━━━━━━━━━━━━━━━━`,
      `🔌 Binance live feed: connecting...`,
      `📡 Polymarket scan: every ${CFG.marketPollMs / 1000}s`,
      `💰 Max trade: $${CFG.maxTradeSize}`,
      `📊 Kelly: ${CFG.kellyFraction * 100}%`,
      `🛑 Daily loss limit: $${CFG.maxDailyLoss}`,
      ``,
      `Indicators: RSI, EMA 9/21, Bollinger, VWAP, ROC, Order Flow`,
      ``,
      `Use /sniper for status`,
    ].join('\n'));
  }
}

function stop() {
  running = false;
  if (krakenWs) {
    try { krakenWs.close(); } catch {}
    krakenWs = null;
  }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (marketPollTimer) { clearInterval(marketPollTimer); marketPollTimer = null; }
  saveState();
  log.info('SNIPER', '⚡ BTC Sniper stopped');

  if (tgSend) tgSend('⚡ BTC Sniper stopped.');
}

// ═══════════════════════════════════════════════════════════════════════
// TELEGRAM COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════

function getStatusMessage() {
  const uptime = stats.startedAt
    ? Math.round((Date.now() - new Date(stats.startedAt).getTime()) / 60000)
    : 0;

  const wsStatus = binanceWs?.readyState === WebSocket.OPEN ? '🟢 Connected' : '🔴 Disconnected';

  const lines = [
    `⚡ BTC Sniper ${running ? '🟢 LIVE' : '🔴 OFF'}`,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🔌 Binance WS: ${wsStatus}`,
    `₿ BTC: $${lastPrice?.toLocaleString() || '?'}`,
    `📊 1m Candles: ${candles1m.length} | 5m: ${candles5m.length}`,
    `⏱ Uptime: ${uptime}m | Signals: ${stats.signalsGenerated}`,
    ``,
  ];

  // Current signal
  if (currentSignal.direction !== 'NEUTRAL') {
    const emoji = currentSignal.direction === 'UP' ? '🟢' : '🔴';
    lines.push(
      `${emoji} Signal: ${currentSignal.direction} (${currentSignal.score})`,
      `   Confidence: ${(currentSignal.confidence * 100).toFixed(0)}%`,
      `   ${currentSignal.reasons.slice(0, 4).join(' | ')}`,
      ``
    );
  } else {
    lines.push(`📡 Signal: NEUTRAL (${currentSignal.score})`, ``);
  }

  // Indicators
  if (candles1m.length >= 15) {
    lines.push(
      `📈 Indicators:`,
      `   RSI: ${indicators.rsi.toFixed(1)} | Trend: ${indicators.trend}`,
      `   EMA: ${indicators.emaCross} (9: $${indicators.ema9.toFixed(0)} / 21: $${indicators.ema21.toFixed(0)})`,
      `   BB: ${indicators.volatility} (pos: ${(indicators.bbPosition * 100).toFixed(0)}%)`,
      `   VWAP: $${indicators.vwap.toFixed(0)} (${indicators.vwapDev > 0 ? '+' : ''}${indicators.vwapDev.toFixed(3)}%)`,
      `   Flow: ${(indicators.buyRatio * 100).toFixed(0)}% buy | ROC: ${indicators.roc > 0 ? '+' : ''}${indicators.roc.toFixed(3)}%`,
      ``
    );
  }

  // Active markets
  lines.push(`🎯 Active Up/Down Markets: ${activeMarkets.length}`);
  for (const m of activeMarkets.slice(0, 3)) {
    lines.push(`   "${m.question}" | ⬆️${(m.upPrice * 100).toFixed(0)}¢ ⬇️${(m.downPrice * 100).toFixed(0)}¢ | ${m.minutesLeft.toFixed(0)}min`);
  }
  lines.push('');

  // P&L
  lines.push(
    `💰 P&L: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | Today: ${dailyPnL >= 0 ? '+' : ''}$${dailyPnL.toFixed(2)}`,
    `📈 Win Rate: ${stats.winRate}% (${stats.wins}W / ${stats.losses}L)`,
    `⚡ Trades: ${stats.totalTrades} | Open: ${positions.length}`,
  );

  if (stats.bestTrade) lines.push(`🏆 Best: +$${stats.bestTrade.pnl?.toFixed(2)} (${stats.bestTrade.side})`);
  if (stats.worstTrade) lines.push(`💀 Worst: $${stats.worstTrade.pnl?.toFixed(2)} (${stats.worstTrade.side})`);

  return lines.join('\n');
}

function getTradesMessage() {
  const recent = [...tradeHistory].reverse().slice(0, 10);

  if (recent.length === 0 && positions.length === 0) {
    return '⚡ No sniper trades yet. Waiting for BTC Up/Down markets...';
  }

  const lines = [`⚡ BTC Sniper Trades`, `━━━━━━━━━━━━━━━━━━━`, ``];

  if (positions.length > 0) {
    lines.push(`📂 Open (${positions.length}):`);
    for (const p of positions) {
      const min = p.endDate ? Math.max(0, (new Date(p.endDate).getTime() - Date.now()) / 60000).toFixed(0) : '?';
      lines.push(`  ${p.side === 'UP' ? '⬆️' : '⬇️'} ${p.side} $${p.size.toFixed(2)} @ ${(p.entryPrice * 100).toFixed(1)}¢ | ${min}min | signal: ${p.signalScore}`);
    }
    lines.push('');
  }

  if (recent.length > 0) {
    lines.push(`📋 History:`);
    for (const t of recent) {
      const e = t.won ? '✅' : '❌';
      lines.push(`  ${e} ${t.side} $${t.size.toFixed(2)} → ${t.resolution} | ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)} | signal: ${t.signalScore}`);
    }
  }

  lines.push(``, `Total: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | WR: ${stats.winRate}%`);
  return lines.join('\n');
}

function getSignalMessage() {
  if (candles1m.length < 15) {
    return `⚡ Sniper warming up... (${candles1m.length}/15 candles collected)\nBTC: $${lastPrice?.toLocaleString() || '?'}`;
  }

  const s = currentSignal;
  const emoji = s.direction === 'UP' ? '🟢' : s.direction === 'DOWN' ? '🔴' : '⚪';

  const lines = [
    `⚡ BTC Live Signal`,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `₿ $${lastPrice?.toLocaleString() || '?'}`,
    `${emoji} Direction: ${s.direction} | Score: ${s.score}/100`,
    `📊 Confidence: ${(s.confidence * 100).toFixed(0)}% | Strength: ${s.strength || 'WEAK'}`,
    ``,
    `📈 Indicators:`,
    `  RSI: ${indicators.rsi.toFixed(1)}`,
    `  EMA: ${indicators.emaCross} (${indicators.ema9.toFixed(0)}/${indicators.ema21.toFixed(0)})`,
    `  BB: ${indicators.volatility} | Position: ${(indicators.bbPosition * 100).toFixed(0)}%`,
    `  VWAP: ${indicators.vwapDev > 0 ? 'above' : 'below'} (${indicators.vwapDev.toFixed(3)}%)`,
    `  Buy Flow: ${(indicators.buyRatio * 100).toFixed(0)}% | ROC: ${indicators.roc.toFixed(3)}%`,
    ``,
    `Reasons:`,
  ];

  for (const r of s.reasons) {
    lines.push(`  • ${r}`);
  }

  return lines.join('\n');
}

function updateConfig(key, value) {
  const num = parseFloat(value);
  const map = {
    'maxsize': ['maxTradeSize', num],
    'kelly': ['kellyFraction', num],
    'bankroll': ['bankroll', num],
    'threshold': ['signalThreshold', num],
    'maxloss': ['maxDailyLoss', num],
    'poll': ['marketPollMs', num * 1000],
  };
  const entry = map[key?.toLowerCase()];
  if (!entry) return `Unknown setting. Available: maxsize, kelly, bankroll, threshold, maxloss, poll`;
  if (isNaN(entry[1]) || entry[1] <= 0) return `Invalid value: ${value}`;
  CFG[entry[0]] = entry[1];
  return `⚡ Updated ${key} → ${value}`;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  initialize,
  start,
  stop,
  isRunning: () => running,

  // Telegram handlers
  getStatusMessage,
  getTradesMessage,
  getSignalMessage,
  updateConfig,

  // Data access
  getPositions: () => [...positions],
  getStats: () => ({ ...stats }),
  getSignal: () => ({ ...currentSignal }),
  getIndicators: () => ({ ...indicators }),
  getActiveMarkets: () => [...activeMarkets],
  getConfig: () => ({ ...CFG }),
  getPrice: () => lastPrice,
  getIctAnalysis: () => lastIctAnalysis,
};
