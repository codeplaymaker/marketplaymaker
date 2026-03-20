/**
 * MiroFish Market Simulator
 *
 * A full agent-based prediction market simulator that creates emergent
 * price dynamics from multiple trading agent archetypes competing:
 *
 *   - Noise Traders: random buy/sell with mean-reversion to fair value
 *   - Trend Followers: chase momentum via EMA crossovers
 *   - Mean Reverters: fade extremes when price deviates from "fundamental"
 *   - Whales: large orders at random intervals, move price significantly
 *   - Arb Bots: exploit mispricing vs a hidden "true probability"
 *   - Market Makers: provide liquidity, profit from spread
 *   - News Agents: inject info shocks that shift fundamental value
 *
 * The simulator runs a continuous limit order book (LOB) with realistic
 * fill dynamics: partial fills, slippage, spread widening under stress.
 *
 * Regimes:
 *   CALM      → tight spreads, low Vol, mean-reverting
 *   TRENDING  → directional flow, momentum dominates
 *   VOLATILE  → wide spreads, whipsaw, stop runs
 *   CRISIS    → correlations spike, liquidity evaporates
 *
 * Output: Tick-by-tick price/volume history that your strategies can
 * be tested against, with full order book snapshots.
 */

const log = require('../utils/logger');

// ─── Regime Definitions ──────────────────────────────────────────────

const REGIMES = {
  CALM: {
    name: 'CALM',
    spreadMultiplier: 1.0,
    volatilityMultiplier: 0.5,
    whaleFrequency: 0.02,
    newsFrequency: 0.01,
    correlationBase: 0.2,
    duration: { min: 50, max: 200 },
    transitionProbs: { CALM: 0.6, TRENDING: 0.25, VOLATILE: 0.1, CRISIS: 0.05 },
  },
  TRENDING: {
    name: 'TRENDING',
    spreadMultiplier: 1.3,
    volatilityMultiplier: 1.0,
    whaleFrequency: 0.05,
    newsFrequency: 0.03,
    correlationBase: 0.4,
    duration: { min: 30, max: 120 },
    transitionProbs: { CALM: 0.3, TRENDING: 0.4, VOLATILE: 0.2, CRISIS: 0.1 },
  },
  VOLATILE: {
    name: 'VOLATILE',
    spreadMultiplier: 2.5,
    volatilityMultiplier: 2.0,
    whaleFrequency: 0.08,
    newsFrequency: 0.06,
    correlationBase: 0.6,
    duration: { min: 20, max: 80 },
    transitionProbs: { CALM: 0.2, TRENDING: 0.2, VOLATILE: 0.35, CRISIS: 0.25 },
  },
  CRISIS: {
    name: 'CRISIS',
    spreadMultiplier: 5.0,
    volatilityMultiplier: 4.0,
    whaleFrequency: 0.15,
    newsFrequency: 0.10,
    correlationBase: 0.9,
    duration: { min: 10, max: 40 },
    transitionProbs: { CALM: 0.15, TRENDING: 0.15, VOLATILE: 0.4, CRISIS: 0.3 },
  },
};

// ─── Limit Order Book ────────────────────────────────────────────────

class OrderBook {
  constructor(initialPrice = 0.5) {
    this.bids = []; // { price, size, agentId, timestamp }
    this.asks = []; // { price, size, agentId, timestamp }
    this.lastTradePrice = initialPrice;
    this.trades = [];
    this.midPrice = initialPrice;
    this.spread = 0.02;
    this.totalVolume = 0;
    this.tickCount = 0;
  }

  addBid(price, size, agentId) {
    price = Math.max(0.01, Math.min(0.99, price));
    // Try to match against existing asks
    const fills = this._matchBuy(price, size, agentId);
    const remaining = size - fills.reduce((s, f) => s + f.size, 0);
    if (remaining > 0.01) {
      this.bids.push({ price, size: remaining, agentId, timestamp: this.tickCount });
      this.bids.sort((a, b) => b.price - a.price); // Best bid first
    }
    this._trimBook();
    this._recalc();
    return fills;
  }

  addAsk(price, size, agentId) {
    price = Math.max(0.01, Math.min(0.99, price));
    const fills = this._matchSell(price, size, agentId);
    const remaining = size - fills.reduce((s, f) => s + f.size, 0);
    if (remaining > 0.01) {
      this.asks.push({ price, size: remaining, agentId, timestamp: this.tickCount });
      this.asks.sort((a, b) => a.price - b.price); // Best ask first
    }
    this._trimBook();
    this._recalc();
    return fills;
  }

  // Market buy — take whatever asks are available
  marketBuy(size, agentId) {
    return this._matchBuy(0.99, size, agentId);
  }

  // Market sell — hit whatever bids are available
  marketSell(size, agentId) {
    return this._matchSell(0.01, size, agentId);
  }

  _matchBuy(maxPrice, size, buyerId) {
    const fills = [];
    let remaining = size;
    while (remaining > 0.01 && this.asks.length > 0 && this.asks[0].price <= maxPrice) {
      const ask = this.asks[0];
      const fillSize = Math.min(remaining, ask.size);
      const fillPrice = ask.price;

      fills.push({ price: fillPrice, size: fillSize, buyer: buyerId, seller: ask.agentId });
      this.trades.push({ price: fillPrice, size: fillSize, tick: this.tickCount, side: 'BUY' });
      this.lastTradePrice = fillPrice;
      this.totalVolume += fillSize;

      ask.size -= fillSize;
      remaining -= fillSize;
      if (ask.size < 0.01) this.asks.shift();
    }
    return fills;
  }

  _matchSell(minPrice, size, sellerId) {
    const fills = [];
    let remaining = size;
    while (remaining > 0.01 && this.bids.length > 0 && this.bids[0].price >= minPrice) {
      const bid = this.bids[0];
      const fillSize = Math.min(remaining, bid.size);
      const fillPrice = bid.price;

      fills.push({ price: fillPrice, size: fillSize, buyer: bid.agentId, seller: sellerId });
      this.trades.push({ price: fillPrice, size: fillSize, tick: this.tickCount, side: 'SELL' });
      this.lastTradePrice = fillPrice;
      this.totalVolume += fillSize;

      bid.size -= fillSize;
      remaining -= fillSize;
      if (bid.size < 0.01) this.bids.shift();
    }
    return fills;
  }

  _recalc() {
    const bestBid = this.bids[0]?.price || this.lastTradePrice - 0.01;
    const bestAsk = this.asks[0]?.price || this.lastTradePrice + 0.01;
    this.midPrice = (bestBid + bestAsk) / 2;
    this.spread = bestAsk - bestBid;
  }

  _trimBook() {
    // Remove stale orders (>100 ticks old)
    const cutoff = this.tickCount - 100;
    this.bids = this.bids.filter(o => o.timestamp > cutoff);
    this.asks = this.asks.filter(o => o.timestamp > cutoff);
    // Cap each side at 50 levels
    if (this.bids.length > 50) this.bids = this.bids.slice(0, 50);
    if (this.asks.length > 50) this.asks = this.asks.slice(0, 50);
  }

  getBidLiquidity(depth = 5) {
    return this.bids.slice(0, depth).reduce((s, o) => s + o.size, 0);
  }

  getAskLiquidity(depth = 5) {
    return this.asks.slice(0, depth).reduce((s, o) => s + o.size, 0);
  }

  getVWAP(n = 20) {
    const recent = this.trades.slice(-n);
    if (recent.length === 0) return this.midPrice;
    const totalVol = recent.reduce((s, t) => s + t.size, 0);
    if (totalVol === 0) return this.midPrice;
    return recent.reduce((s, t) => s + t.price * t.size, 0) / totalVol;
  }

  snapshot() {
    return {
      midPrice: r4(this.midPrice),
      spread: r4(this.spread),
      lastTrade: r4(this.lastTradePrice),
      bidDepth: r2(this.getBidLiquidity()),
      askDepth: r2(this.getAskLiquidity()),
      totalVolume: r2(this.totalVolume),
      tradeCount: this.trades.length,
      tick: this.tickCount,
    };
  }
}

// ─── Market Simulator Engine ─────────────────────────────────────────

class MarketSimulator {
  /**
   * @param {Object} opts
   * @param {number} opts.trueProb - Hidden true probability (0-1)
   * @param {number} opts.startPrice - Initial market price (0-1)
   * @param {number} opts.totalTicks - How many time steps to simulate
   * @param {string} opts.startRegime - Starting regime (CALM, TRENDING, etc.)
   * @param {Object} opts.shocks - Scheduled info shocks { tick: newTrueProb }
   * @param {number} opts.agentCount - Total agent count per archetype
   * @param {number} opts.marketVolume - Approximate total $ in market (for sizing)
   * @param {string} opts.category - Market category (politics, crypto, etc.)
   */
  constructor(opts = {}) {
    this.trueProb = opts.trueProb ?? 0.55;
    this.startPrice = opts.startPrice ?? 0.50;
    this.totalTicks = opts.totalTicks ?? 500;
    this.category = opts.category || 'politics';
    this.marketVolume = opts.marketVolume || 50000;
    this.shocks = opts.shocks || {};

    // Order book
    this.orderBook = new OrderBook(this.startPrice);

    // Regime engine
    this.currentRegime = REGIMES[opts.startRegime] || REGIMES.CALM;
    this.regimeTicksLeft = this._regimeDuration();
    this.regimeHistory = [{ regime: this.currentRegime.name, tick: 0 }];

    // Agents (populated by addAgents)
    this.agents = [];
    this.agentCount = opts.agentCount || 15;

    // Price history
    this.priceHistory = [this.startPrice];
    this.volumeHistory = [0];
    this.spreadHistory = [0.02];
    this.regimeTimeline = [];

    // Metrics
    this.tick = 0;
    this.infoEvents = [];
  }

  /**
   * Register trading agents. Called by strategyTester before running.
   * @param {Array} agents - Array of agent objects with { id, type, act(market, book) }
   */
  addAgents(agents) {
    this.agents = agents;
  }

  /**
   * Inject a "player agent" representing your strategy.
   * This agent's decisions come from the actual strategy code.
   */
  addPlayerAgent(agent) {
    this.agents.push(agent);
    this.playerAgentId = agent.id;
  }

  /**
   * Run the full simulation.
   * @returns {Object} Full simulation result with price history, fills, regimes, metrics.
   */
  run() {
    // Seed the order book with initial liquidity
    this._seedLiquidity();

    for (this.tick = 0; this.tick < this.totalTicks; this.tick++) {
      this.orderBook.tickCount = this.tick;

      // 1. Check for scheduled information shocks
      if (this.shocks[this.tick] != null) {
        const oldProb = this.trueProb;
        this.trueProb = this.shocks[this.tick];
        this.infoEvents.push({
          tick: this.tick,
          type: 'INFO_SHOCK',
          oldProb: r4(oldProb),
          newProb: r4(this.trueProb),
          priceAtShock: r4(this.orderBook.midPrice),
        });
      }

      // 2. Regime transitions
      this._updateRegime();

      // 3. Each agent acts
      const regime = this.currentRegime;
      const marketState = this._marketState();

      for (const agent of this.agents) {
        try {
          const actions = agent.act(marketState, this.orderBook, regime);
          if (actions) this._executeActions(actions, agent.id);
        } catch {
          // Agent error — skip
        }
      }

      // 4. Record state
      this.priceHistory.push(this.orderBook.midPrice);
      this.volumeHistory.push(this.orderBook.totalVolume);
      this.spreadHistory.push(this.orderBook.spread);
    }

    return this._buildResult();
  }

  _marketState() {
    return {
      tick: this.tick,
      totalTicks: this.totalTicks,
      midPrice: this.orderBook.midPrice,
      lastTrade: this.orderBook.lastTradePrice,
      spread: this.orderBook.spread,
      vwap: this.orderBook.getVWAP(20),
      bidDepth: this.orderBook.getBidLiquidity(),
      askDepth: this.orderBook.getAskLiquidity(),
      totalVolume: this.orderBook.totalVolume,
      priceHistory: this.priceHistory.slice(-50),
      volumeHistory: this.volumeHistory.slice(-50),
      regime: this.currentRegime.name,
      category: this.category,
      trueProb: this.trueProb, // Only visible to informed agents
      fundamentalVisible: false, // Override for specific agents
    };
  }

  _executeActions(actions, agentId) {
    const actionList = Array.isArray(actions) ? actions : [actions];
    for (const action of actionList) {
      if (!action || !action.type) continue;
      const size = Math.max(0.1, Math.min(action.size || 1, this.marketVolume * 0.01));
      switch (action.type) {
        case 'BID':
          this.orderBook.addBid(action.price, size, agentId);
          break;
        case 'ASK':
          this.orderBook.addAsk(action.price, size, agentId);
          break;
        case 'MARKET_BUY':
          this.orderBook.marketBuy(size, agentId);
          break;
        case 'MARKET_SELL':
          this.orderBook.marketSell(size, agentId);
          break;
      }
    }
  }

  _seedLiquidity() {
    const price = this.startPrice;
    for (let i = 1; i <= 10; i++) {
      const offset = i * 0.005;
      const size = (this.marketVolume * 0.001) * (11 - i); // More liquidity near price
      this.orderBook.addBid(price - offset, size, 'seed');
      this.orderBook.addAsk(price + offset, size, 'seed');
    }
  }

  _updateRegime() {
    this.regimeTicksLeft--;
    if (this.regimeTicksLeft <= 0) {
      const probs = this.currentRegime.transitionProbs;
      const r = Math.random();
      let cumulative = 0;
      let nextRegime = 'CALM';
      for (const [regime, prob] of Object.entries(probs)) {
        cumulative += prob;
        if (r <= cumulative) { nextRegime = regime; break; }
      }
      this.currentRegime = REGIMES[nextRegime];
      this.regimeTicksLeft = this._regimeDuration();
      this.regimeHistory.push({ regime: nextRegime, tick: this.tick });
    }
  }

  _regimeDuration() {
    const { min, max } = this.currentRegime.duration;
    return min + Math.floor(Math.random() * (max - min));
  }

  _buildResult() {
    // Calculate metrics
    const prices = this.priceHistory;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(prices[i] - prices[i - 1]);
    }
    const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length);

    // Hurst exponent approximation (R/S analysis)
    let hurst = 0.5;
    if (returns.length > 20) {
      const halfN = Math.floor(returns.length / 2);
      const rs1 = this._rescaledRange(returns.slice(0, halfN));
      const rs2 = this._rescaledRange(returns.slice(halfN));
      const rsAll = this._rescaledRange(returns);
      if (rs1 > 0 && rsAll > 0) {
        hurst = Math.log(rsAll / ((rs1 + rs2) / 2)) / Math.log(2);
        hurst = Math.max(0.1, Math.min(0.9, hurst));
      }
    }

    // Player agent P&L
    const playerTrades = this.orderBook.trades.filter(
      t => t.buyer === this.playerAgentId || t.seller === this.playerAgentId
    );

    // Edge decay — how fast did edge (trueProb - marketPrice) converge to 0?
    const edgeHistory = this.priceHistory.map(p => Math.abs(this.trueProb - p));
    const firstHalfEdge = edgeHistory.slice(0, Math.floor(edgeHistory.length / 2));
    const secondHalfEdge = edgeHistory.slice(Math.floor(edgeHistory.length / 2));
    const avgEdge1 = firstHalfEdge.reduce((s, e) => s + e, 0) / firstHalfEdge.length;
    const avgEdge2 = secondHalfEdge.reduce((s, e) => s + e, 0) / secondHalfEdge.length;
    const edgeDecayRate = avgEdge1 > 0 ? (avgEdge1 - avgEdge2) / avgEdge1 : 0;

    return {
      // Price data
      priceHistory: this.priceHistory,
      volumeHistory: this.volumeHistory,
      spreadHistory: this.spreadHistory,
      finalPrice: r4(prices[prices.length - 1]),
      trueProb: r4(this.trueProb),

      // Market microstructure
      totalTrades: this.orderBook.trades.length,
      totalVolume: r2(this.orderBook.totalVolume),
      avgSpread: r4(this.spreadHistory.reduce((s, sp) => s + sp, 0) / this.spreadHistory.length),
      maxSpread: r4(Math.max(...this.spreadHistory)),

      // Volatility & regime
      meanReturn: r6(meanReturn),
      volatility: r6(std),
      annualizedVol: r4(std * Math.sqrt(252)),
      hurstExponent: r4(hurst),
      regimeHistory: this.regimeHistory,
      regimeCount: this.regimeHistory.length,

      // Edge dynamics
      edgeDecayRate: r4(edgeDecayRate),
      edgeHalfLife: edgeDecayRate > 0 ? Math.round(this.totalTicks / 2 / edgeDecayRate) : Infinity,
      infoEvents: this.infoEvents,

      // Player performance
      playerTrades: playerTrades.length,
      playerVolume: r2(playerTrades.reduce((s, t) => s + t.size, 0)),

      // Ticks
      totalTicks: this.totalTicks,
      category: this.category,
    };
  }

  _rescaledRange(data) {
    if (data.length < 2) return 0;
    const mean = data.reduce((s, x) => s + x, 0) / data.length;
    const cumDevs = [];
    let cum = 0;
    for (const x of data) { cum += x - mean; cumDevs.push(cum); }
    const range = Math.max(...cumDevs) - Math.min(...cumDevs);
    const std = Math.sqrt(data.reduce((s, x) => s + (x - mean) ** 2, 0) / data.length);
    return std > 0 ? range / std : 0;
  }
}

// ─── Multi-Market Correlated Simulator ───────────────────────────────

/**
 * Simulates multiple correlated markets simultaneously.
 * Used for portfolio-level strategy testing and correlation stress tests.
 */
class CorrelatedSimulator {
  /**
   * @param {Array} marketDefs - Array of { id, trueProb, startPrice, category }
   * @param {Object} opts - { totalTicks, correlationMatrix, shocks }
   */
  constructor(marketDefs, opts = {}) {
    this.totalTicks = opts.totalTicks || 500;
    this.correlationMatrix = opts.correlationMatrix || {};
    this.shocks = opts.shocks || {}; // tick → { marketId: newTrueProb }

    this.markets = new Map();
    for (const def of marketDefs) {
      this.markets.set(def.id, new MarketSimulator({
        trueProb: def.trueProb,
        startPrice: def.startPrice,
        totalTicks: this.totalTicks,
        category: def.category || 'politics',
        marketVolume: def.volume || 50000,
      }));
    }
  }

  /**
   * Get the base correlation between two categories.
   * Spikes during CRISIS regime.
   */
  getCorrelation(cat1, cat2, regime) {
    if (cat1 === cat2) return 0.8;
    const base = this.correlationMatrix[`${cat1}:${cat2}`]
      || this.correlationMatrix[`${cat2}:${cat1}`]
      || 0.2;
    // Correlations spike during crisis
    if (regime === 'CRISIS') return Math.min(1.0, base + 0.4);
    if (regime === 'VOLATILE') return Math.min(1.0, base + 0.2);
    return base;
  }

  /**
   * Run all markets with correlated shocks.
   * Returns per-market results + portfolio-level metrics.
   */
  run(agentsPerMarket = []) {
    const results = {};
    for (const [id, sim] of this.markets) {
      const agents = agentsPerMarket.find(a => a.marketId === id)?.agents || [];
      sim.addAgents(agents);
      results[id] = sim.run();
    }

    // Portfolio correlation calculation
    const ids = [...this.markets.keys()];
    const correlations = {};
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const r1 = results[ids[i]].priceHistory;
        const r2 = results[ids[j]].priceHistory;
        correlations[`${ids[i]}:${ids[j]}`] = r4(pearsonCorrelation(r1, r2));
      }
    }

    return {
      markets: results,
      correlations,
      totalTicks: this.totalTicks,
    };
  }
}

// ─── Scenario Factory ────────────────────────────────────────────────

/**
 * Pre-built simulation scenarios for common strategy testing needs.
 */
const SCENARIOS = {
  /** Normal market — stable conditions, slow price discovery */
  normal: () => ({
    trueProb: 0.55,
    startPrice: 0.50,
    totalTicks: 500,
    startRegime: 'CALM',
    shocks: {},
  }),

  /** Edge decay — start with 15% edge, observe convergence speed */
  edgeDecay: () => ({
    trueProb: 0.65,
    startPrice: 0.50,
    totalTicks: 600,
    startRegime: 'CALM',
    shocks: {},
  }),

  /** News break — sudden info shock at tick 200 */
  newsBreak: () => ({
    trueProb: 0.55,
    startPrice: 0.50,
    totalTicks: 500,
    startRegime: 'CALM',
    shocks: { 200: 0.80 },
  }),

  /** Regime shift — calm → crisis at tick 150 */
  regimeShift: () => ({
    trueProb: 0.55,
    startPrice: 0.50,
    totalTicks: 500,
    startRegime: 'CALM',
    shocks: { 150: 0.30 }, // Crisis trigger
  }),

  /** Mean reversion trap — price spikes then reverts */
  meanReversionTrap: () => ({
    trueProb: 0.55,
    startPrice: 0.50,
    totalTicks: 500,
    startRegime: 'VOLATILE',
    shocks: { 100: 0.75, 250: 0.55 }, // Spike then revert
  }),

  /** Whale manipulation — large player drives price away from fair value */
  whaleManipulation: () => ({
    trueProb: 0.50,
    startPrice: 0.50,
    totalTicks: 400,
    startRegime: 'CALM',
    agentCount: 20,
    shocks: {},
    // Config note: strategyTester adds extra-large whale agents
  }),

  /** Low liquidity — thin book, large slippage, hard to exit */
  lowLiquidity: () => ({
    trueProb: 0.60,
    startPrice: 0.55,
    totalTicks: 400,
    startRegime: 'CALM',
    marketVolume: 5000, // Only $5K in the book
    agentCount: 5,
    shocks: {},
  }),

  /** Multi-shock — multiple info events testing adaptability */
  multiShock: () => ({
    trueProb: 0.50,
    startPrice: 0.50,
    totalTicks: 700,
    startRegime: 'CALM',
    shocks: { 100: 0.35, 250: 0.70, 400: 0.45, 550: 0.60 },
  }),

  /** Adversarial — arb bots that front-run your signals */
  adversarial: () => ({
    trueProb: 0.60,
    startPrice: 0.50,
    totalTicks: 500,
    startRegime: 'TRENDING',
    shocks: {},
    // Config note: strategyTester adds front-running agents
  }),

  /** Election night — rapid resolution with multiple info cascades */
  electionNight: () => ({
    trueProb: 0.52,
    startPrice: 0.50,
    totalTicks: 300,
    startRegime: 'VOLATILE',
    shocks: { 50: 0.55, 100: 0.60, 150: 0.48, 200: 0.70, 250: 0.85 },
  }),
};

// ─── Utilities ───────────────────────────────────────────────────────

function r2(n) { return Math.round(n * 100) / 100; }
function r4(n) { return Math.round(n * 10000) / 10000; }
function r6(n) { return Math.round(n * 1000000) / 1000000; }

function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const meanX = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = y.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den > 0 ? num / den : 0;
}

module.exports = {
  MarketSimulator,
  CorrelatedSimulator,
  OrderBook,
  REGIMES,
  SCENARIOS,
  pearsonCorrelation,
};
