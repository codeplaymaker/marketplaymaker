/**
 * MarketPlayMaker — 5-Minute Bitcoin Polymarket Bot
 * ═══════════════════════════════════════════════════
 *
 * A dedicated, high-frequency Bitcoin prediction-market trading bot
 * that scans Polymarket every 5 minutes for Bitcoin price markets,
 * runs multi-signal analysis, and executes trades via the CLOB API.
 *
 * Signals:
 *  1. CoinGecko real price + log-normal probability model
 *  2. Polymarket orderbook imbalance / momentum
 *  3. CLOB spread & liquidity scoring
 *  4. Multi-timeframe price history from CLOB
 *  5. "Up or Down" intraday momentum bias
 *  6. Price-target markets: distance-to-target + volatility + time decay
 *
 * Risk controls:
 *  - Per-market position cap
 *  - Portfolio-level BTC exposure cap
 *  - Dynamic Kelly sizing
 *  - Drawdown circuit breaker
 *  - Minimum edge threshold (net of fees)
 *
 * Telegram:
 *  - Sends alerts with rich formatting
 *  - Per-user filtered (respects signal prefs)
 *  - Live P&L dashboard on demand
 */

const log = require('./utils/logger');
const client = require('./polymarket/client');
const { getCryptoSignal, parseCryptoQuestion } = require('./data/cryptoData');
const userStore = require('./userStore');
const paperTrader = require('./engine/paperTrader');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────

const CONFIG = {
  // Scan interval
  scanIntervalMs: 5 * 60 * 1000,    // 5 minutes
  fastScanIntervalMs: 60 * 1000,    // 1 minute for "Up or Down" near expiry

  // Market discovery
  maxMarketsToFetch: 300,
  minLiquidity: 5000,                // $5k minimum liquidity
  minVolume24h: 10000,               // $10k minimum 24h volume

  // Edge thresholds
  minEdgePct: 0.04,                  // 4% minimum edge (raw) — raised from 2.5%
  minNetEdgePct: 0.025,              // 2.5% minimum edge net of fees — raised from 1.5%
  strongEdgePct: 0.08,               // 8%+ = STRONG signal — raised from 6%
  feeRate: 0.02,                     // 2% Polymarket fee on profits
  slippageBase: 0.005,               // 0.5% base slippage — raised from 0.3%

  // Risk & sizing
  maxTradeSizeUsd: 50,               // Max $50 per trade — reduced from $100
  maxBtcExposure: 0.15,              // Max 15% of bankroll in BTC markets — reduced from 25%
  maxSingleMarket: 0.05,             // Max 5% in any single market — reduced from 8%
  kellyFraction: 0.12,               // ~1/8 Kelly (very conservative) — reduced from 0.20
  maxOpenPositions: 8,               // Max 8 BTC positions — reduced from 15
  bankroll: 1000,                    // Default bankroll (overridden from env)

  // Time & price safety guards
  minMinutesToExpiry: 30,            // Don't trade markets expiring within 30 minutes
  minUpDownMinutesToExpiry: 10,      // UP_OR_DOWN: 10 min minimum (faster cycle)
  minPrice: 0.05,                    // Reject if entry price < 5 cents (market decided)
  maxPrice: 0.95,                    // Reject if entry price > 95 cents (market decided)

  // Drawdown circuit breaker
  maxDailyLoss: 30,                  // Stop trading after $30 daily loss
  maxConsecutiveLosses: 3,           // Pause after 3 consecutive losses
  consecutiveLossCooldownMs: 30 * 60 * 1000, // 30 min cooldown after consecutive losses
  maxDrawdownPct: 0.08,              // Stop if total P&L drawdown exceeds 8% of bankroll

  // Correlated exposure limits
  maxCorrelatedExposure: 0.10,       // Max 10% of bankroll in correlated markets
  correlationKeywords: ['dip', 'drop', 'crash', 'fall', 'below'], // Keywords that indicate correlated downside bets

  // Stop-loss (price target markets only — Up/Down resolve too fast)
  stopLoss: {
    enabled: true,
    maxLossPct: 0.50,                // Cut if position value drops 50%+ from entry
    minHoldMinutes: 30,              // Don't stop-loss within first 30min (let price settle)
    checkIntervalMs: 5 * 60 * 1000, // Check every 5 min (same as scan cycle)
    onlyPriceTargets: true,          // Only apply to PRICE_TARGET markets, not UP_OR_DOWN
  },

  // Cooldowns
  tradeCooldownMs: 3 * 60 * 1000,   // 3 min between trades on same market
  maxTradesPerCycle: 3,              // Max 3 new trades per scan cycle — reduced from 5

  // State file
  stateFile: path.join(__dirname, 'logs', 'btc-bot-state.json'),
};

// ─── State ───────────────────────────────────────────────────────────

let running = false;
let scanTimer = null;
let fastScanTimer = null;
let scanCount = 0;
let lastScanAt = null;

// Market tracking
let trackedMarkets = [];             // All active BTC markets
let positions = [];                  // Open positions
let tradeHistory = [];               // Completed trades
let marketCooldowns = new Map();     // conditionId → last trade timestamp

// Drawdown tracking
let dailyPnL = 0;
let dailyTrades = 0;
let lastTradeDay = null;
let consecutiveLosses = 0;
let lastConsecutiveLossPause = 0;
let peakPnL = 0;

// Stats
let stats = {
  totalScans: 0,
  totalEdgesFound: 0,
  totalTradesPlaced: 0,
  totalTradesWon: 0,
  totalTradesLost: 0,
  totalPnL: 0,
  winRate: 0,
  bestTrade: null,
  worstTrade: null,
  startedAt: null,
  lastEdgeAt: null,
};

// Telegram sender (injected)
let telegramSend = null;
let telegramSendTo = null;

// ─── Persistence ─────────────────────────────────────────────────────

function saveState() {
  try {
    const state = {
      positions,
      tradeHistory: tradeHistory.slice(-200),
      stats,
      marketCooldowns: Array.from(marketCooldowns.entries()),
      savedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(CONFIG.stateFile), { recursive: true });
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    log.warn('BTC-BOT', `Save state failed: ${e.message}`);
  }
}

function loadState() {
  try {
    if (!fs.existsSync(CONFIG.stateFile)) return;
    const raw = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    positions = raw.positions || [];
    tradeHistory = raw.tradeHistory || [];
    if (raw.stats) Object.assign(stats, raw.stats);
    if (raw.marketCooldowns) {
      marketCooldowns = new Map(raw.marketCooldowns);
    }
    log.info('BTC-BOT', `State loaded: ${positions.length} positions, ${tradeHistory.length} trades`);
  } catch (e) {
    log.warn('BTC-BOT', `Load state failed: ${e.message}`);
  }
}

/**
 * Reset state — wipes P&L, trade history, and optionally positions.
 * Used via API to get a clean slate after strategy changes.
 */
function resetState({ keepPositions = false } = {}) {
  const oldPnL = stats.totalPnL;
  const oldTrades = tradeHistory.length;
  const oldPositions = positions.length;

  if (!keepPositions) positions = [];
  tradeHistory = [];
  marketCooldowns = new Map();
  dailyPnL = 0;
  dailyTrades = 0;
  lastTradeDay = null;
  consecutiveLosses = 0;
  lastConsecutiveLossPause = 0;
  peakPnL = 0;
  stats = {
    totalScans: 0,
    totalEdgesFound: 0,
    totalTradesPlaced: 0,
    totalTradesWon: 0,
    totalTradesLost: 0,
    totalPnL: 0,
    winRate: 0,
    bestTrade: null,
    worstTrade: null,
    startedAt: new Date().toISOString(),
    lastEdgeAt: null,
  };
  saveState();
  log.info('BTC-BOT', `State reset: P&L $${oldPnL.toFixed(2)}→$0 | ${oldTrades} trades cleared | ${keepPositions ? oldPositions + ' positions kept' : oldPositions + ' positions cleared'}`);
  return { oldPnL, oldTrades, oldPositions, keepPositions };
}

// ─── Initialization ──────────────────────────────────────────────────

/**
 * Initialize the BTC bot.
 * @param {Object} opts
 * @param {Function} opts.sendToAll — Send Telegram message to all users
 * @param {Function} opts.sendTo — Send Telegram message to specific chatId
 * @param {number} [opts.bankroll] — Starting bankroll in USDC
 */
function initialize(opts = {}) {
  if (opts.sendToAll) telegramSend = opts.sendToAll;
  if (opts.sendTo) telegramSendTo = opts.sendTo;
  if (opts.bankroll) CONFIG.bankroll = opts.bankroll;
  loadState();
  log.info('BTC-BOT', '₿ Bitcoin Polymarket Bot initialized');
}

// ─── Market Discovery ────────────────────────────────────────────────

/**
 * Fetch all active Bitcoin markets from Polymarket.
 * Returns enriched market objects with parsed crypto data.
 */
async function discoverBtcMarkets() {
  const allMarkets = await client.getMarkets({
    limit: CONFIG.maxMarketsToFetch,
    active: true,
    closed: false,
  });

  const btcMarkets = [];

  for (const m of allMarkets) {
    const q = (m.question || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();

    // Must be a Bitcoin / BTC market
    if (!(/bitcoin|btc/i.test(q) || /bitcoin|btc/i.test(slug))) continue;

    // Must be a crypto price market (not "Bitcoin-themed NFT" etc.)
    const parsed = parseCryptoQuestion(m.question, m.endDate);
    if (!parsed) continue;

    const liquidity = parseFloat(m.liquidity || 0);
    const volume = parseFloat(m.volume24hr || 0);

    // Filter by minimums
    if (liquidity < CONFIG.minLiquidity) continue;
    if (volume < CONFIG.minVolume24h) continue;

    // ★ CRITICAL: Skip expired or near-expiry markets
    // Use API endDate first; fall back to deadline parsed from question text
    const apiEndTime = m.endDate ? new Date(m.endDate).getTime() : 0;
    const parsedEndTime = parsed.deadline ? new Date(parsed.deadline).getTime() : 0;
    const endTime = apiEndTime > 0 ? apiEndTime : parsedEndTime;
    if (endTime > 0 && endTime <= Date.now()) {
      log.debug('BTC-BOT', `SKIP expired: "${m.question}" ended ${((Date.now() - endTime) / 60000).toFixed(0)}min ago`);
      continue; // Market already ended — DO NOT TRADE
    }
    const minTTL = parsed.type === 'UP_OR_DOWN'
      ? CONFIG.minUpDownMinutesToExpiry
      : CONFIG.minMinutesToExpiry;
    const minutesLeft = endTime > 0 ? (endTime - Date.now()) / 60000 : Infinity;
    if (minutesLeft < minTTL) {
      log.debug('BTC-BOT', `SKIP near-expiry: "${m.question}" ${minutesLeft.toFixed(0)}min left (min: ${minTTL})`);
      continue; // Too close to expiry — illiquid, prices unreliable
    }

    const outcomePrices = m.outcomePrices ? JSON.parse(m.outcomePrices) : [];
    const tokenIds = m.clobTokenIds ? JSON.parse(m.clobTokenIds) : [];
    const outcomes = m.outcomes ? JSON.parse(m.outcomes) : ['Yes', 'No'];

    const yesPrice = parseFloat(outcomePrices[0] || 0.5);
    const noPrice = parseFloat(outcomePrices[1] || 0.5);

    // ★ SAFETY: Skip markets with extreme prices — already decided
    if (yesPrice < CONFIG.minPrice || noPrice < CONFIG.minPrice) {
      log.debug('BTC-BOT', `SKIP extreme price: "${m.question}" YES=${(yesPrice*100).toFixed(1)}% NO=${(noPrice*100).toFixed(1)}%`);
      continue;
    }

    btcMarkets.push({
      question: m.question,
      slug: m.slug,
      conditionId: m.conditionId,
      endDate: m.endDate,
      volume24h: volume,
      liquidity,
      yesPrice,
      noPrice,
      yesTokenId: tokenIds[0] || null,
      noTokenId: tokenIds[1] || null,
      outcomes,
      parsedCrypto: parsed,
      type: parsed.type,       // 'PRICE_TARGET' or 'UP_OR_DOWN'
    });
  }

  // Sort by volume descending
  btcMarkets.sort((a, b) => b.volume24h - a.volume24h);
  return btcMarkets;
}

// ─── Signal Analysis ─────────────────────────────────────────────────

/**
 * Analyze a single BTC market and compute edge.
 *
 * Returns:
 *  { market, signal, edge, edgePct, netEdge, side, confidence,
 *    strength, kellySize, reasons[] }
 */
async function analyzeMarket(market) {
  const signal = await getCryptoSignal({
    question: market.question,
    endDate: market.endDate,
  });
  if (!signal) return null;

  // Get orderbook data for deeper analysis
  let orderbookBias = 0;
  let spreadScore = 0;
  let depthScore = 0;

  if (market.yesTokenId) {
    try {
      const [book, spread] = await Promise.all([
        client.getOrderbook(market.yesTokenId).catch(() => null),
        client.getSpread(market.yesTokenId).catch(() => null),
      ]);

      if (book) {
        const bids = (book.bids || []);
        const asks = (book.asks || []);
        const bidVol = bids.reduce((s, b) => s + parseFloat(b.size || 0), 0);
        const askVol = asks.reduce((s, a) => s + parseFloat(a.size || 0), 0);
        const total = bidVol + askVol;
        if (total > 0) {
          orderbookBias = (bidVol - askVol) / total; // +1 = all bids, -1 = all asks
        }
        depthScore = Math.min(1, total / 50000); // Normalize: $50k = max depth
      }

      if (spread !== null) {
        // Tight spread = efficient market, less edge; wide spread = opportunity
        spreadScore = Math.min(1, spread / 0.10); // 10% spread = max opportunity
      }
    } catch { /* non-critical */ }
  }

  // ─── Edge Calculation ──────────────────────────────────────────

  const modelProb = signal.prob;
  const marketYesPrice = market.yesPrice;
  const marketNoPrice = market.noPrice;

  // ★ SAFETY: Reject extreme prices — market already decided
  // Use || not && — if EITHER side is < 5¢ the market is decided
  if (marketYesPrice < CONFIG.minPrice || marketNoPrice < CONFIG.minPrice) return null;
  if (marketYesPrice > CONFIG.maxPrice || marketNoPrice > CONFIG.maxPrice) return null;

  // Which side has edge?
  // If model says YES is more likely than market prices → buy YES
  // If model says YES is less likely than market prices → buy NO
  const edgeYes = modelProb - marketYesPrice;
  const edgeNo = (1 - modelProb) - marketNoPrice;

  let side, rawEdge, entryPrice;
  if (edgeYes > edgeNo && edgeYes > 0) {
    side = 'YES';
    rawEdge = edgeYes;
    entryPrice = marketYesPrice;
  } else if (edgeNo > 0) {
    side = 'NO';
    rawEdge = edgeNo;
    entryPrice = marketNoPrice;
  } else {
    return null; // No edge
  }

  // ★ SAFETY: Reject extreme entry prices (the market has already been decided)
  if (entryPrice < CONFIG.minPrice || entryPrice > CONFIG.maxPrice) {
    return null;
  }

  // Orderbook confirmation: boost/penalize edge
  const obConfirmation = side === 'YES' ? orderbookBias : -orderbookBias;
  const adjustedEdge = rawEdge * (1 + obConfirmation * 0.15);

  // Net edge after fees + slippage
  const estimatedFee = entryPrice * CONFIG.feeRate;
  const estimatedSlippage = CONFIG.slippageBase * (1 + (1 - depthScore) * 2);
  const netEdge = adjustedEdge - estimatedFee - estimatedSlippage;

  if (netEdge < CONFIG.minNetEdgePct) return null;

  // ─── Position Sizing (Kelly) ───────────────────────────────────

  // Kelly: f* = (bp - q) / b  where b = odds, p = win prob, q = 1-p
  const b = (1 / entryPrice) - 1; // payout odds
  const p = side === 'YES' ? modelProb : (1 - modelProb);
  const q = 1 - p;
  const fullKelly = (b * p - q) / b;
  const kellyFrac = Math.max(0, fullKelly * CONFIG.kellyFraction);

  const kellySize = Math.min(
    CONFIG.maxTradeSizeUsd,
    CONFIG.bankroll * kellyFrac,
    CONFIG.bankroll * CONFIG.maxSingleMarket
  );

  if (kellySize < 1) return null; // Too small to trade

  // ─── Confidence & Strength ─────────────────────────────────────

  const edgePct = adjustedEdge;
  const strength = edgePct >= CONFIG.strongEdgePct ? 'STRONG'
    : edgePct >= CONFIG.minEdgePct ? 'MODERATE'
    : 'WEAK';

  // Confidence from multiple factors
  const factors = [
    signal.confidence === 'HIGH' ? 0.3 : signal.confidence === 'MEDIUM' ? 0.15 : 0.05,
    depthScore * 0.2,
    Math.min(1, market.volume24h / 200000) * 0.2,
    (Math.abs(obConfirmation) > 0.1 ? 0.15 : 0.05),
    Math.min(1, edgePct / 0.10) * 0.15,
  ];
  const confidenceScore = factors.reduce((s, f) => s + f, 0);
  const confidence = confidenceScore >= 0.6 ? 'HIGH'
    : confidenceScore >= 0.35 ? 'MEDIUM'
    : 'LOW';

  // ─── Build reasons ─────────────────────────────────────────────

  const reasons = [];
  reasons.push(`Model: ${(modelProb * 100).toFixed(1)}% | Market: ${(entryPrice * 100).toFixed(1)}%`);
  reasons.push(`Edge: ${(edgePct * 100).toFixed(2)}% raw → ${(netEdge * 100).toFixed(2)}% net`);
  if (signal.detail) reasons.push(signal.detail);
  if (orderbookBias !== 0) {
    reasons.push(`Orderbook: ${orderbookBias > 0 ? '🟢 bid-heavy' : '🔴 ask-heavy'} (${(orderbookBias * 100).toFixed(0)}%)`);
  }
  if (spreadScore > 0.3) reasons.push(`Wide spread: ${(spreadScore * 100).toFixed(0)}% — opportunity`);

  return {
    market,
    signal,
    side,
    rawEdge,
    edgePct,
    netEdge,
    entryPrice,
    confidenceScore,
    confidence,
    strength,
    kellySize: Math.round(kellySize * 100) / 100,
    orderbookBias,
    depthScore,
    spreadScore,
    reasons,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Trade Execution ─────────────────────────────────────────────────

/**
 * Execute a trade for the admin user (and optionally copy-trading users).
 * Uses the existing clobExecutor or paper-trades.
 */
async function executeTrade(analysis) {
  const { market, side, entryPrice, kellySize, rawEdge, netEdge, confidence, strength } = analysis;

  // ★ CRITICAL: Final safety check — never trade expired markets
  if (market.endDate) {
    const endTime = new Date(market.endDate).getTime();
    const minutesLeft = (endTime - Date.now()) / 60000;
    if (minutesLeft <= 0) {
      log.warn('BTC-BOT', `BLOCKED: "${market.question}" already expired (${minutesLeft.toFixed(0)}min ago)`);
      return null;
    }
    const minTTL = market.type === 'UP_OR_DOWN'
      ? (CONFIG.minUpDownMinutesToExpiry || 10)
      : (CONFIG.minMinutesToExpiry || 30);
    if (minutesLeft < minTTL) {
      log.warn('BTC-BOT', `BLOCKED: "${market.question}" expires in ${minutesLeft.toFixed(0)}min (need ${minTTL})`);
      return null;
    }
  }

  // ★ SAFETY: Final price sanity check
  if (entryPrice < CONFIG.minPrice || entryPrice > CONFIG.maxPrice) {
    log.warn('BTC-BOT', `BLOCKED: entry price ${entryPrice} outside safe range [${CONFIG.minPrice}-${CONFIG.maxPrice}]`);
    return null;
  }

  // ★ DRAWDOWN CIRCUIT BREAKER
  const today = new Date().toDateString();
  if (today !== lastTradeDay) {
    dailyPnL = 0;
    dailyTrades = 0;
    lastTradeDay = today;
  }
  if (dailyPnL <= -CONFIG.maxDailyLoss) {
    log.warn('BTC-BOT', `BLOCKED: Daily loss limit ($${CONFIG.maxDailyLoss}) hit. P&L today: $${dailyPnL.toFixed(2)}`);
    return null;
  }
  if (consecutiveLosses >= CONFIG.maxConsecutiveLosses) {
    const cooldownLeft = CONFIG.consecutiveLossCooldownMs - (Date.now() - lastConsecutiveLossPause);
    if (cooldownLeft > 0) {
      log.warn('BTC-BOT', `BLOCKED: ${consecutiveLosses} consecutive losses — cooling down (${(cooldownLeft / 60000).toFixed(0)}min left)`);
      return null;
    }
    // Cooldown expired, reset
    consecutiveLosses = 0;
  }
  // Check max drawdown from peak
  if (peakPnL > 0 && (peakPnL - stats.totalPnL) > CONFIG.bankroll * CONFIG.maxDrawdownPct) {
    log.warn('BTC-BOT', `BLOCKED: Drawdown ${(peakPnL - stats.totalPnL).toFixed(2)} exceeds ${(CONFIG.maxDrawdownPct * 100)}% of bankroll`);
    return null;
  }

  // Cooldown check
  const lastTrade = marketCooldowns.get(market.conditionId);
  if (lastTrade && Date.now() - lastTrade < CONFIG.tradeCooldownMs) {
    return null;
  }

  // Position count check
  if (positions.length >= CONFIG.maxOpenPositions) {
    log.info('BTC-BOT', `Max positions (${CONFIG.maxOpenPositions}) reached, skipping`);
    return null;
  }

  // BTC exposure check
  const currentExposure = positions.reduce((s, p) => s + p.size, 0);
  if (currentExposure + kellySize > CONFIG.bankroll * CONFIG.maxBtcExposure) {
    log.info('BTC-BOT', `BTC exposure cap reached ($${currentExposure.toFixed(0)}/${(CONFIG.bankroll * CONFIG.maxBtcExposure).toFixed(0)})`);
    return null;
  }

  // ★ CORRELATED EXPOSURE CHECK
  // Group positions by correlation (same-direction BTC bets)
  const qLower = market.question.toLowerCase();
  const isDownsideBet = CONFIG.correlationKeywords.some(kw => qLower.includes(kw));
  if (isDownsideBet) {
    const correlatedExposure = positions
      .filter(p => CONFIG.correlationKeywords.some(kw => p.question.toLowerCase().includes(kw)))
      .reduce((s, p) => s + p.size, 0);
    if (correlatedExposure + kellySize > CONFIG.bankroll * CONFIG.maxCorrelatedExposure) {
      log.info('BTC-BOT', `Correlated exposure cap reached ($${correlatedExposure.toFixed(0)}/${(CONFIG.bankroll * CONFIG.maxCorrelatedExposure).toFixed(0)}) — skipping "${market.question.slice(0, 40)}"`);
      return null;
    }
  }

  const tokenId = side === 'YES' ? market.yesTokenId : market.noTokenId;
  const shares = kellySize / entryPrice;

  const position = {
    id: `btc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    conditionId: market.conditionId,
    question: market.question,
    slug: market.slug,
    side,
    size: kellySize,
    entryPrice,
    shares: Math.round(shares * 100) / 100,
    tokenId,
    netEdge,
    confidence,
    strength,
    endDate: market.endDate,
    type: market.type,
    openedAt: new Date().toISOString(),
    status: 'OPEN',
  };

  // Try live execution for enabled users
  let liveResult = null;
  try {
    const clobExecutor = require('./polymarket/clobExecutor');
    if (clobExecutor.getStatus().initialized) {
      liveResult = await clobExecutor.placeTrade({
        tokenId,
        side: 'BUY',
        price: entryPrice,
        size: kellySize,
        maxSlippage: 0.02,
      });
      position.liveOrderId = liveResult?.orderId;
      position.liveStatus = liveResult?.status || 'SUBMITTED';
    }
  } catch { /* no live executor — paper trade */ }

  if (!liveResult) {
    position.liveStatus = 'PAPER';
  }

  positions.push(position);
  marketCooldowns.set(market.conditionId, Date.now());
  stats.totalTradesPlaced++;
  saveState();

  // ─── Route to Paper Trader for unified tracking ──────────────
  try {
    const ptOpp = {
      conditionId: market.conditionId,
      market: market.question,
      strategy: 'BTC_BOT',
      side: side,                     // Already YES/NO
      score: Math.round(Math.min(100, Math.abs(netEdge) * 500 + 40)),  // Scale edge to 0-100
      confidence: confidence,
      price: entryPrice,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      positionSize: kellySize,
      endDate: market.endDate,
      edge: rawEdge,
      netEdge: netEdge,
      riskLevel: strength === 'STRONG' ? 'LOW' : strength === 'MODERATE' ? 'MEDIUM' : 'HIGH',
      liquidity: market.liquidity || 50000,
    };
    paperTrader.recordScanResults([ptOpp]);
  } catch (ptErr) {
    log.warn('BTC-BOT', `Paper trader bridge failed: ${ptErr.message}`);
  }

  log.info('BTC-BOT', `₿ TRADE: ${side} ${market.question} | $${kellySize.toFixed(2)} @ ${(entryPrice * 100).toFixed(1)}¢ | edge: ${(netEdge * 100).toFixed(2)}% | ${position.liveStatus}`);

  // Execute for copy-trading users
  await executeCopyTrades(analysis, position);

  return position;
}

/**
 * Execute copy-trades for users who have copy trading enabled.
 */
async function executeCopyTrades(analysis, adminPosition) {
  const activeTraders = userStore.getActiveTraders();

  for (const user of activeTraders) {
    if (!user.settings.copyTrading) continue;
    if (!user.settings.enabled) continue;
    if (!userStore.hasValidKeys(user.chatId)) continue;

    // Respect user's min edge quality
    const qualityScore = analysis.confidenceScore * 100;
    if (qualityScore < (user.settings.minEdgeQuality || 50)) continue;

    // Scale to user's max trade size
    const userSize = Math.min(
      user.settings.maxTradeSize || 50,
      analysis.kellySize
    );

    if (userSize < 1) continue;

    try {
      // Build CLOB headers for user's keys
      const resp = await fetch(`https://clob.polymarket.com/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_API_KEY': user.polymarket.apiKey,
          'POLY_API_SECRET': user.polymarket.apiSecret,
          'POLY_PASSPHRASE': user.polymarket.passphrase,
        },
        body: JSON.stringify({
          tokenID: adminPosition.tokenId,
          price: analysis.entryPrice,
          size: userSize,
          side: 'BUY',
          type: 'GTC',
        }),
      });

      const result = await resp.json();
      userStore.recordTrade(user.chatId, {
        market: adminPosition.question,
        side: analysis.side,
        size: userSize,
        price: analysis.entryPrice,
        orderId: result.orderID || null,
        status: resp.ok ? 'SUBMITTED' : 'FAILED',
        source: 'btc-bot-copy',
      });

      if (telegramSendTo) {
        telegramSendTo(user.chatId, `₿ Copy trade executed:\n${analysis.side} ${adminPosition.question}\n$${userSize.toFixed(2)} @ ${(analysis.entryPrice * 100).toFixed(1)}¢`);
      }
    } catch (err) {
      log.warn('BTC-BOT', `Copy trade failed for user ${user.chatId}: ${err.message}`);
    }
  }
}

// ─── Stop-Loss Checker (price target markets only) ───────────────────

/**
 * Check open PRICE_TARGET positions for stop-loss conditions.
 * If the current market price has moved against us by > maxLossPct,
 * close the position early to cut losses.
 *
 * Logic:
 *  - Only applies to PRICE_TARGET markets (Up/Down resolve too fast)
 *  - Position must be held for at least minHoldMinutes
 *  - If current side price dropped 50%+ from entry → thesis is broken, cut it
 *
 * On Polymarket, "cutting" means selling the token back. For paper trades,
 * we mark it as STOPPED and record the loss at current price.
 */
async function checkStopLosses() {
  if (!CONFIG.stopLoss.enabled) return [];

  const stopped = [];

  for (const pos of positions) {
    if (pos.status !== 'OPEN') continue;

    // Only price target markets
    if (CONFIG.stopLoss.onlyPriceTargets && pos.type !== 'PRICE_TARGET') continue;

    // Must have been held for minimum time
    const holdMs = Date.now() - new Date(pos.openedAt).getTime();
    if (holdMs < CONFIG.stopLoss.minHoldMinutes * 60 * 1000) continue;

    try {
      const market = await client.getMarketById(pos.conditionId);
      if (!market || market.resolved) continue; // Let resolution checker handle resolved markets

      // Get current price of our side
      const currentPrice = pos.side === 'YES'
        ? (market.yesPrice ?? null)
        : (market.noPrice ?? null);

      if (currentPrice === null) continue;

      // Calculate how much value we've lost
      // entry: 80¢, current: 35¢ → lossRatio = (0.80 - 0.35) / 0.80 = 0.5625 = 56% loss
      const lossRatio = (pos.entryPrice - currentPrice) / pos.entryPrice;

      // Store current mark-to-market on every check
      pos.currentPrice = currentPrice;
      pos.unrealizedPnL = Math.round(((currentPrice - pos.entryPrice) * pos.shares) * 100) / 100;

      if (lossRatio >= CONFIG.stopLoss.maxLossPct) {
        // THESIS BROKEN — cut the position
        const exitValue = currentPrice * pos.shares;
        const pnl = Math.round((exitValue - pos.size) * 100) / 100;

        pos.status = 'STOPPED';
        pos.exitPrice = currentPrice;
        pos.payout = Math.round(exitValue * 100) / 100;
        pos.pnl = pnl;
        pos.stoppedAt = new Date().toISOString();
        pos.stopReason = `Price dropped ${(lossRatio * 100).toFixed(0)}% (${(pos.entryPrice * 100).toFixed(1)}¢ → ${(currentPrice * 100).toFixed(1)}¢)`;

        // Try live sell if we have a live position
        if (pos.liveStatus !== 'PAPER' && pos.tokenId) {
          try {
            const clobExecutor = require('./polymarket/clobExecutor');
            if (clobExecutor.getStatus().initialized) {
              await clobExecutor.placeTrade({
                tokenId: pos.tokenId,
                side: 'SELL',
                price: currentPrice,
                size: pos.shares,
                maxSlippage: 0.03,
              });
              pos.liveExitStatus = 'SUBMITTED';
            }
          } catch { pos.liveExitStatus = 'FAILED'; }
        }

        // Update stats (counts as a loss)
        stats.totalTradesLost++;
        consecutiveLosses++;
        if (consecutiveLosses >= CONFIG.maxConsecutiveLosses) {
          lastConsecutiveLossPause = Date.now();
        }
        stats.totalPnL = Math.round((stats.totalPnL + pnl) * 100) / 100;
        dailyPnL += pnl;
        if (stats.totalPnL > peakPnL) peakPnL = stats.totalPnL;
        if (!stats.worstTrade || pnl < stats.worstTrade.pnl) {
          stats.worstTrade = { market: pos.question, pnl: pos.pnl };
        }
        const total = stats.totalTradesWon + stats.totalTradesLost;
        stats.winRate = total > 0 ? Math.round((stats.totalTradesWon / total) * 100) : 0;

        stopped.push(pos);

        log.warn('BTC-BOT', `🛑 STOP-LOSS: "${pos.question}" | ${pos.side} ${(pos.entryPrice * 100).toFixed(1)}¢ → ${(currentPrice * 100).toFixed(1)}¢ | P&L: $${pnl.toFixed(2)} | ${pos.stopReason}`);

        // Telegram alert
        if (telegramSend) {
          telegramSend([
            `🛑 BTC Bot Stop-Loss Triggered`,
            ``,
            `${pos.question}`,
            `${pos.side} @ ${(pos.entryPrice * 100).toFixed(1)}¢ → ${(currentPrice * 100).toFixed(1)}¢`,
            `P&L: $${pnl.toFixed(2)} (cut ${(lossRatio * 100).toFixed(0)}% loss)`,
            ``,
            `Held for ${(holdMs / 3600000).toFixed(1)}h`,
            `📊 Running: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`,
          ].join('\n'));
        }
      }
    } catch (err) {
      log.warn('BTC-BOT', `Stop-loss check failed for ${pos.conditionId}: ${err.message}`);
    }
  }

  if (stopped.length > 0) {
    // Move stopped positions to trade history
    for (const pos of stopped) {
      tradeHistory.push(pos);
    }
    positions = positions.filter(p => p.status === 'OPEN');
    saveState();
  }

  return stopped;
}

// ─── Resolution Checker ──────────────────────────────────────────────

/**
 * Check if any open positions have resolved.
 */
async function checkResolutions() {
  const toClose = [];

  for (const pos of positions) {
    if (pos.status !== 'OPEN') continue;

    // Check if market has resolved
    try {
      const market = await client.getMarketById(pos.conditionId);
      if (!market) continue;

      if (market.resolved) {
        const won = (pos.side === 'YES' && market.resolution === 'YES') ||
                    (pos.side === 'NO' && market.resolution === 'NO');
        const payout = won ? pos.shares : 0;
        const pnl = payout - pos.size;

        pos.status = 'RESOLVED';
        pos.resolution = market.resolution;
        pos.won = won;
        pos.payout = Math.round(payout * 100) / 100;
        pos.pnl = Math.round(pnl * 100) / 100;
        pos.resolvedAt = new Date().toISOString();

        // Update stats
        if (won) {
          stats.totalTradesWon++;
          consecutiveLosses = 0; // Reset streak on win
        } else {
          stats.totalTradesLost++;
          consecutiveLosses++;
          if (consecutiveLosses >= CONFIG.maxConsecutiveLosses) {
            lastConsecutiveLossPause = Date.now();
            log.warn('BTC-BOT', `⚠️ ${consecutiveLosses} consecutive losses — entering ${(CONFIG.consecutiveLossCooldownMs / 60000).toFixed(0)}min cooldown`);
            if (telegramSend) {
              telegramSend(`⚠️ BTC Bot: ${consecutiveLosses} consecutive losses — pausing for ${(CONFIG.consecutiveLossCooldownMs / 60000).toFixed(0)} minutes`);
            }
          }
        }
        stats.totalPnL = Math.round((stats.totalPnL + pnl) * 100) / 100;
        dailyPnL += pnl;
        // Track peak P&L for drawdown calculation
        if (stats.totalPnL > peakPnL) peakPnL = stats.totalPnL;
        if (!stats.bestTrade || pnl > stats.bestTrade.pnl) stats.bestTrade = { market: pos.question, pnl: pos.pnl };
        if (!stats.worstTrade || pnl < stats.worstTrade.pnl) stats.worstTrade = { market: pos.question, pnl: pos.pnl };

        const total = stats.totalTradesWon + stats.totalTradesLost;
        stats.winRate = total > 0 ? Math.round((stats.totalTradesWon / total) * 100) : 0;

        toClose.push(pos);

        log.info('BTC-BOT', `₿ RESOLVED: ${won ? '✅ WIN' : '❌ LOSS'} ${pos.question} | P&L: $${pos.pnl}`);
      } else if (market.endDate) {
        // Check if expired but not resolved yet
        const endTime = new Date(market.endDate).getTime();
        if (Date.now() > endTime + 3600000) { // 1 hour past end
          // Market past deadline but not resolved — check current price
          const currentPrice = pos.side === 'YES' ? (market.yesPrice || 0) : (market.noPrice || 0);
          if (currentPrice !== undefined) {
            pos.currentPrice = currentPrice;
            pos.unrealizedPnL = Math.round(((currentPrice - pos.entryPrice) * pos.shares) * 100) / 100;
          }
        }
      }
    } catch (err) {
      log.warn('BTC-BOT', `Resolution check failed for ${pos.conditionId}: ${err.message}`);
    }
  }

  if (toClose.length > 0) {
    // Move resolved to trade history
    for (const pos of toClose) {
      tradeHistory.push(pos);
    }
    positions = positions.filter(p => p.status === 'OPEN');
    saveState();

    // Push resolution alerts
    if (telegramSend) {
      for (const pos of toClose) {
        const emoji = pos.won ? '✅' : '❌';
        const msg = [
          `₿ ${emoji} BTC Trade Resolved`,
          ``,
          `${pos.question}`,
          `${pos.side} @ ${(pos.entryPrice * 100).toFixed(1)}¢ → ${pos.resolution}`,
          `P&L: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`,
          ``,
          `📊 Running: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | WR: ${stats.winRate}%`,
        ].join('\n');
        telegramSend(msg);
      }
    }
  }

  return toClose;
}

// ─── Main Scan Cycle ─────────────────────────────────────────────────

/**
 * Run a full scan cycle:
 * 1. Discover BTC markets
 * 2. Analyze each for edge
 * 3. Rank by edge * confidence
 * 4. Execute top opportunities
 * 5. Check resolutions
 * 6. Push alerts
 */
async function runScan() {
  if (!running) return;

  scanCount++;
  stats.totalScans++;
  const cycleStart = Date.now();

  log.info('BTC-BOT', `═══ Scan #${scanCount} starting ═══`);

  try {
    // 1. Discover markets
    const markets = await discoverBtcMarkets();
    trackedMarkets = markets;
    log.info('BTC-BOT', `Found ${markets.length} active BTC markets`);

    // 2. Analyze each market
    const analyses = [];
    for (const market of markets) {
      try {
        const result = await analyzeMarket(market);
        if (result) analyses.push(result);
      } catch (err) {
        log.warn('BTC-BOT', `Analysis failed for "${market.question}": ${err.message}`);
      }
    }

    log.info('BTC-BOT', `${analyses.length} markets with edge detected`);
    stats.totalEdgesFound += analyses.length;

    // 3. Rank by composite score: netEdge * confidenceScore
    analyses.sort((a, b) => {
      const scoreA = a.netEdge * a.confidenceScore * (a.strength === 'STRONG' ? 1.5 : 1);
      const scoreB = b.netEdge * b.confidenceScore * (b.strength === 'STRONG' ? 1.5 : 1);
      return scoreB - scoreA;
    });

    // 4. Execute top opportunities
    let tradesThisCycle = 0;
    const executedThisCycle = [];

    for (const analysis of analyses) {
      if (tradesThisCycle >= CONFIG.maxTradesPerCycle) break;

      // Skip if already have position in this market
      const hasPosition = positions.some(p => p.conditionId === analysis.market.conditionId);
      if (hasPosition) continue;

      const position = await executeTrade(analysis);
      if (position) {
        tradesThisCycle++;
        executedThisCycle.push({ analysis, position });
      }
    }

    // 5. Check stop-losses on price target positions
    const stopped = await checkStopLosses();

    // 6. Check resolutions
    const resolved = await checkResolutions();

    // 6. Push alerts
    if (analyses.length > 0 && telegramSend) {
      const alertLines = [
        `₿ BTC Bot Scan #${scanCount}`,
        `━━━━━━━━━━━━━━━━━━`,
        `📡 ${markets.length} markets | ${analyses.length} with edge`,
        ``,
      ];

      // Top 5 edges
      for (const a of analyses.slice(0, 5)) {
        const emoji = a.strength === 'STRONG' ? '🔥' : a.strength === 'MODERATE' ? '📊' : '📈';
        alertLines.push(
          `${emoji} ${a.side} "${a.market.question}"`,
          `   Edge: ${(a.netEdge * 100).toFixed(2)}% net | ${a.confidence}`,
          `   Model: ${(a.signal.prob * 100).toFixed(1)}% vs Market: ${(a.entryPrice * 100).toFixed(1)}%`,
          ``
        );
      }

      if (executedThisCycle.length > 0) {
        alertLines.push(`⚡ Trades placed: ${executedThisCycle.length}`);
        for (const { analysis, position } of executedThisCycle) {
          alertLines.push(`   ${analysis.side} $${position.size.toFixed(2)} on "${position.question}"`);
        }
        alertLines.push('');
      }

      if (resolved.length > 0) {
        alertLines.push(`✅ Resolved: ${resolved.length}`);
      }

      if (stopped.length > 0) {
        alertLines.push(`🛑 Stop-losses: ${stopped.length}`);
        for (const s of stopped) {
          alertLines.push(`   ${s.side} "${s.question.slice(0, 35)}" — cut at ${(s.exitPrice * 100).toFixed(1)}¢ (P&L: $${s.pnl.toFixed(2)})`);
        }
      }

      alertLines.push(
        `━━━━━━━━━━━━━━━━━━`,
        `📊 P&L: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | WR: ${stats.winRate}% | Pos: ${positions.length}`,
        `⏱ ${((Date.now() - cycleStart) / 1000).toFixed(1)}s`
      );

      // Send filtered alerts per user
      pushToUsers(alertLines.join('\n'), analyses);
    }

    lastScanAt = new Date().toISOString();
    stats.lastEdgeAt = analyses.length > 0 ? new Date().toISOString() : stats.lastEdgeAt;
    saveState();

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
    log.info('BTC-BOT', `═══ Scan #${scanCount} done: ${analyses.length} edges, ${tradesThisCycle} trades, ${resolved.length} resolved, ${stopped.length} stopped (${elapsed}s) ═══`);

  } catch (err) {
    log.error('BTC-BOT', `Scan cycle failed: ${err.message}`);
  }
}

/**
 * Push alerts to users based on their signal preferences.
 */
function pushToUsers(fullAlert, analyses) {
  const allUsers = userStore.getAllUsers();

  for (const user of allUsers) {
    if (!user.signals || !user.settings?.alerts) continue;

    const hasStrong = analyses.some(a => a.strength === 'STRONG');
    const hasModerate = analyses.some(a => a.strength === 'MODERATE');

    // Check user preferences
    if (hasStrong && user.signals.strong) {
      if (telegramSendTo) telegramSendTo(user.chatId, fullAlert);
    } else if (hasModerate && user.signals.moderate) {
      if (telegramSendTo) telegramSendTo(user.chatId, fullAlert);
    }
    // If only weak edges and user doesn't have moderate enabled, skip
  }
}

// ─── Start / Stop ────────────────────────────────────────────────────

function start() {
  if (running) return;
  running = true;
  stats.startedAt = new Date().toISOString();

  log.info('BTC-BOT', '₿ ═══════════════════════════════════════');
  log.info('BTC-BOT', '₿  5-Minute Bitcoin Polymarket Bot LIVE  ');
  log.info('BTC-BOT', '₿ ═══════════════════════════════════════');
  log.info('BTC-BOT', `  Scan interval: 5 min`);
  log.info('BTC-BOT', `  Min edge: ${(CONFIG.minNetEdgePct * 100).toFixed(1)}% net`);
  log.info('BTC-BOT', `  Max trade: $${CONFIG.maxTradeSizeUsd}`);
  log.info('BTC-BOT', `  Kelly fraction: ${CONFIG.kellyFraction}`);
  log.info('BTC-BOT', `  Bankroll: $${CONFIG.bankroll}`);

  // Run first scan immediately
  runScan();

  // Schedule recurring scans
  scanTimer = setInterval(() => runScan(), CONFIG.scanIntervalMs);

  if (telegramSend) {
    telegramSend([
      '₿ BTC Bot Started!',
      `━━━━━━━━━━━━━━━━━━`,
      `⏱ Scanning every 5 minutes`,
      `💰 Bankroll: $${CONFIG.bankroll}`,
      `📊 Min edge: ${(CONFIG.minNetEdgePct * 100).toFixed(1)}%`,
      `🔒 Max trade: $${CONFIG.maxTradeSizeUsd}`,
      ``,
      `Use /btc to see status`,
    ].join('\n'));
  }
}

function stop() {
  running = false;
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (fastScanTimer) { clearInterval(fastScanTimer); fastScanTimer = null; }
  saveState();
  log.info('BTC-BOT', '₿ Bitcoin bot stopped');

  if (telegramSend) {
    telegramSend('₿ BTC Bot stopped.');
  }
}

// ─── Telegram Command Handlers ───────────────────────────────────────

/**
 * /btc — Status overview
 */
function getStatusMessage() {
  const uptime = stats.startedAt
    ? Math.round((Date.now() - new Date(stats.startedAt).getTime()) / 60000)
    : 0;

  const lines = [
    `₿ BTC Bot Status${running ? ' 🟢' : ' 🔴'}`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `⏱ Uptime: ${uptime}m | Scans: ${stats.totalScans}`,
    `📡 Markets tracked: ${trackedMarkets.length}`,
    `📊 Edges found: ${stats.totalEdgesFound}`,
    ``,
    `💰 P&L: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`,
    `📈 Win rate: ${stats.winRate}% (${stats.totalTradesWon}W / ${stats.totalTradesLost}L)`,
    `⚡ Trades: ${stats.totalTradesPlaced} placed`,
    `📂 Open positions: ${positions.length}/${CONFIG.maxOpenPositions}`,
    ``,
  ];

  // Show open positions
  if (positions.length > 0) {
    lines.push(`Open Positions:`);
    for (const pos of positions) {
      const hoursLeft = pos.endDate
        ? Math.max(0, (new Date(pos.endDate).getTime() - Date.now()) / 3600000).toFixed(1)
        : '?';
      lines.push(
        `  ${pos.side} "${pos.question.slice(0, 40)}"`,
        `  $${pos.size.toFixed(2)} @ ${(pos.entryPrice * 100).toFixed(1)}¢ | ${hoursLeft}h left`,
      );
    }
    lines.push('');
  }

  if (stats.bestTrade) {
    lines.push(`🏆 Best: +$${stats.bestTrade.pnl.toFixed(2)} "${stats.bestTrade.market?.slice(0, 30)}"`);
  }
  if (stats.worstTrade) {
    lines.push(`💀 Worst: $${stats.worstTrade.pnl.toFixed(2)} "${stats.worstTrade.market?.slice(0, 30)}"`);
  }

  lines.push(``, `Last scan: ${lastScanAt || 'never'}`);

  return lines.join('\n');
}

/**
 * /btcmarkets — Show all tracked BTC markets
 */
function getMarketsMessage() {
  if (trackedMarkets.length === 0) {
    return '₿ No BTC markets currently tracked. Bot may not have scanned yet.';
  }

  const lines = [
    `₿ Active Bitcoin Markets (${trackedMarkets.length})`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
  ];

  for (const m of trackedMarkets.slice(0, 15)) {
    const hoursLeft = m.endDate
      ? Math.max(0, (new Date(m.endDate).getTime() - Date.now()) / 3600000).toFixed(1)
      : '?';
    const typeEmoji = m.type === 'UP_OR_DOWN' ? '↕️' : '🎯';
    
    lines.push(
      `${typeEmoji} ${m.question}`,
      `   YES: ${(m.yesPrice * 100).toFixed(1)}¢ | NO: ${(m.noPrice * 100).toFixed(1)}¢`,
      `   Vol: $${(m.volume24h / 1000).toFixed(0)}k | Liq: $${(m.liquidity / 1000).toFixed(0)}k | ${hoursLeft}h`,
      ``
    );
  }

  return lines.join('\n');
}

/**
 * /btctrades — Recent trade history
 */
function getTradesMessage() {
  const recent = [...tradeHistory].reverse().slice(0, 10);

  if (recent.length === 0 && positions.length === 0) {
    return '₿ No trades yet. Bot is scanning for opportunities...';
  }

  const lines = [
    `₿ BTC Trade History`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
  ];

  if (positions.length > 0) {
    lines.push(`📂 Open (${positions.length}):`);
    for (const p of positions) {
      lines.push(`  ${p.side} $${p.size.toFixed(2)} "${p.question.slice(0, 35)}" | ${(p.entryPrice * 100).toFixed(1)}¢`);
    }
    lines.push('');
  }

  if (recent.length > 0) {
    lines.push(`📋 Recent (${recent.length}):`);
    for (const t of recent) {
      const emoji = t.won ? '✅' : '❌';
      lines.push(
        `  ${emoji} ${t.side} $${t.size.toFixed(2)} "${t.question.slice(0, 30)}"`,
        `    ${(t.entryPrice * 100).toFixed(1)}¢ → ${t.resolution} | P&L: ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}`,
      );
    }
  }

  lines.push(``, `Total P&L: ${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)} | WR: ${stats.winRate}%`);

  return lines.join('\n');
}

/**
 * /btcsettings <key> <value> — Update bot settings
 */
function updateConfig(key, value) {
  const num = parseFloat(value);
  const map = {
    'maxsize': ['maxTradeSizeUsd', num],
    'edge': ['minNetEdgePct', num / 100],
    'kelly': ['kellyFraction', num],
    'bankroll': ['bankroll', num],
    'interval': ['scanIntervalMs', num * 60 * 1000],
    'maxpos': ['maxOpenPositions', Math.floor(num)],
  };

  const entry = map[key?.toLowerCase()];
  if (!entry) {
    return `Unknown setting. Available: maxsize, edge, kelly, bankroll, interval, maxpos`;
  }

  const [configKey, configValue] = entry;
  if (isNaN(configValue) || configValue <= 0) {
    return `Invalid value: ${value}`;
  }

  CONFIG[configKey] = configValue;
  
  // Restart scan timer if interval changed
  if (configKey === 'scanIntervalMs' && running) {
    clearInterval(scanTimer);
    scanTimer = setInterval(() => runScan(), CONFIG.scanIntervalMs);
  }

  return `₿ Updated ${key} → ${value} (${configKey}=${configValue})`;
}

// ─── Exports ─────────────────────────────────────────────────────────

module.exports = {
  initialize,
  start,
  stop,
  runScan,
  resetState,
  isRunning: () => running,

  // Telegram handlers
  getStatusMessage,
  getMarketsMessage,
  getTradesMessage,
  updateConfig,

  // Data access
  getPositions: () => [...positions],
  getTradeHistory: () => [...tradeHistory],
  getStats: () => ({ ...stats }),
  getTrackedMarkets: () => [...trackedMarkets],
  getConfig: () => ({ ...CONFIG }),
};
