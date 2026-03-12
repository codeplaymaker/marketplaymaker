/**
 * ICT Playbook API Route
 * 
 * Fetches OHLCV candle data from Binance (crypto) and runs the ICT engine.
 * Endpoints:
 *   GET /api/ict/analyze?symbols=BTCUSDT,ETHUSDT&interval=1h
 *   GET /api/ict/markets   — list supported markets
 */

'use strict';

const { Router } = require('express');
const ictEngine = require('../engine/ictEngine');

// ── Default markets to scan ──
const DEFAULT_MARKETS = [
  { symbol: 'BTCUSDT', label: 'BTC/USD', type: 'crypto' },
  { symbol: 'ETHUSDT', label: 'ETH/USD', type: 'crypto' },
  { symbol: 'SOLUSDT', label: 'SOL/USD', type: 'crypto' },
  { symbol: 'BNBUSDT', label: 'BNB/USD', type: 'crypto' },
  { symbol: 'XRPUSDT', label: 'XRP/USD', type: 'crypto' },
  { symbol: 'DOGEUSDT', label: 'DOGE/USD', type: 'crypto' },
  { symbol: 'ADAUSDT', label: 'ADA/USD', type: 'crypto' },
  { symbol: 'AVAXUSDT', label: 'AVAX/USD', type: 'crypto' },
  { symbol: 'PAXGUSDT', label: 'XAU/USD', type: 'commodity' },
];

const VALID_INTERVALS = ['15m', '30m', '1h', '4h', '1d'];

// ── In-memory cache ──
const analysisCache = new Map();
const CACHE_TTL = 60_000; // 1 minute

// ═══════════════════════════════════════════════════════════════════════
// Binance OHLCV fetcher (free, no API key needed)
// ═══════════════════════════════════════════════════════════════════════

async function fetchCandles(symbol, interval = '1h', limit = 200) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`Binance ${resp.status} for ${symbol}`);
  const data = await resp.json();

  return data.map(k => ({
    time: k[0],           // open time ms
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// Analyze a single market
// ═══════════════════════════════════════════════════════════════════════

async function analyzeMarket(market, interval) {
  const cacheKey = `${market.symbol}_${interval}`;
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const candles = await fetchCandles(market.symbol, interval, 200);
    const analysis = ictEngine.analyze(candles, {
      symbol: market.label,
      timeframe: interval,
    });
    analysis.binanceSymbol = market.symbol;
    analysis.type = market.type;

    analysisCache.set(cacheKey, { data: analysis, ts: Date.now() });
    return analysis;
  } catch (err) {
    return {
      symbol: market.label,
      binanceSymbol: market.symbol,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Route factory
// ═══════════════════════════════════════════════════════════════════════

module.exports = function createICTRoutes() {
  const router = Router();

  // GET /api/ict/markets — available markets
  router.get('/ict/markets', (req, res) => {
    res.json({ markets: DEFAULT_MARKETS, intervals: VALID_INTERVALS });
  });

  // GET /api/ict/analyze?symbols=BTCUSDT,ETHUSDT&interval=1h
  router.get('/ict/analyze', async (req, res) => {
    try {
      const symbolsParam = req.query.symbols || DEFAULT_MARKETS.map(m => m.symbol).join(',');
      const interval = VALID_INTERVALS.includes(req.query.interval) ? req.query.interval : '1h';
      const requestedSymbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

      // Resolve requested symbols against known markets
      const markets = requestedSymbols.map(sym => {
        const known = DEFAULT_MARKETS.find(m => m.symbol === sym);
        return known || { symbol: sym, label: sym.replace('USDT', '/USD'), type: 'crypto' };
      });

      // Analyze all markets in parallel (with limit)
      const results = await Promise.all(
        markets.slice(0, 12).map(m => analyzeMarket(m, interval))
      );

      // Sort by confluence score (highest first)
      results.sort((a, b) => {
        const scoreA = a.confluence?.score ?? -1;
        const scoreB = b.confluence?.score ?? -1;
        return scoreB - scoreA;
      });

      // Summary
      const premium = results.filter(r => r.premiumDiscount?.zone === 'PREMIUM').length;
      const discount = results.filter(r => r.premiumDiscount?.zone === 'DISCOUNT').length;
      const highConf = results.filter(r => (r.confluence?.score ?? 0) >= 3).length;
      const bullish = results.filter(r => r.bias === 'BULLISH').length;
      const bearish = results.filter(r => r.bias === 'BEARISH').length;

      res.json({
        timestamp: new Date().toISOString(),
        interval,
        count: results.length,
        summary: { premium, discount, highConf, bullish, bearish },
        results,
      });
    } catch (err) {
      console.error('ICT analyze error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ict/analyze/:symbol?interval=1h — single market
  router.get('/ict/analyze/:symbol', async (req, res) => {
    try {
      const sym = req.params.symbol.toUpperCase();
      const interval = VALID_INTERVALS.includes(req.query.interval) ? req.query.interval : '1h';
      const market = DEFAULT_MARKETS.find(m => m.symbol === sym) || { symbol: sym, label: sym.replace('USDT', '/USD'), type: 'crypto' };
      const result = await analyzeMarket(market, interval);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
