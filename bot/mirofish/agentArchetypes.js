/**
 * Agent Archetypes for Market Simulation
 *
 * Each agent archetype models a class of real market participant:
 *
 *   NoiseTRader     — Random buy/sell, represents retail flow
 *   TrendFollower   — Chases momentum via EMA crossover
 *   MeanReverter    — Fades extremes, bets on reversion to fundamental
 *   Whale           — Infrequent but massive orders, moves market
 *   ArbBot          — Exploits mispricing vs true probability
 *   MarketMaker     — Provides two-sided liquidity, profits from spread
 *   NewsTrader      — Reacts to info shocks with directional bets
 *   FrontRunner     — Detects large pending orders and front-runs them
 *   HerdAgent       — Copies the recent dominant direction (bandwagon)
 *   ContrarianAgent — Fades crowd consensus at extremes
 *
 * Each agent implements:
 *   act(marketState, orderBook, regime) → action | action[]
 *
 * Actions: { type: 'BID'|'ASK'|'MARKET_BUY'|'MARKET_SELL', price?, size }
 */

// ─── Utility ─────────────────────────────────────────────────────────

function ema(data, span) {
  if (data.length === 0) return 0;
  const k = 2 / (span + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) {
    val = data[i] * k + val * (1 - k);
  }
  return val;
}

function clampPrice(p) { return Math.max(0.02, Math.min(0.98, p)); }

function gaussianNoise(mean = 0, std = 1) {
  let u, v, s;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  return mean + std * u * Math.sqrt(-2 * Math.log(s) / s);
}

// ─── 1. Noise Trader ─────────────────────────────────────────────────

class NoiseTrader {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'NOISE';
    this.tradeProb = opts.tradeProb || 0.3;     // Probability of acting each tick
    this.sizeRange = opts.sizeRange || [0.5, 5]; // Order size range
    this.bias = opts.bias || 0;                   // Slight directional bias (-1 to 1)
  }

  act(market) {
    if (Math.random() > this.tradeProb) return null;

    const size = this.sizeRange[0] + Math.random() * (this.sizeRange[1] - this.sizeRange[0]);
    const buyProb = 0.5 + this.bias * 0.2;

    if (Math.random() < buyProb) {
      const price = clampPrice(market.midPrice + gaussianNoise(0, 0.01));
      return { type: 'BID', price, size };
    } else {
      const price = clampPrice(market.midPrice + gaussianNoise(0, 0.01));
      return { type: 'ASK', price, size };
    }
  }
}

// ─── 2. Trend Follower ───────────────────────────────────────────────

class TrendFollower {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'TREND';
    this.fastPeriod = opts.fastPeriod || 5;
    this.slowPeriod = opts.slowPeriod || 20;
    this.tradeProb = opts.tradeProb || 0.4;
    this.sizeMultiplier = opts.sizeMultiplier || 1.0;
    this.minHistory = opts.minHistory || 25;
  }

  act(market) {
    if (market.priceHistory.length < this.minHistory) return null;
    if (Math.random() > this.tradeProb) return null;

    const fastEma = ema(market.priceHistory, this.fastPeriod);
    const slowEma = ema(market.priceHistory, this.slowPeriod);
    const momentum = fastEma - slowEma;

    if (Math.abs(momentum) < 0.005) return null; // No clear signal

    const size = Math.abs(momentum) * 100 * this.sizeMultiplier;

    if (momentum > 0) {
      // Uptrend — buy
      return { type: 'MARKET_BUY', size: Math.min(size, 10) };
    } else {
      // Downtrend — sell
      return { type: 'MARKET_SELL', size: Math.min(size, 10) };
    }
  }
}

// ─── 3. Mean Reverter ────────────────────────────────────────────────

class MeanReverter {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'MEAN_REVERT';
    this.lookback = opts.lookback || 30;
    this.threshold = opts.threshold || 0.04; // 4% deviation triggers
    this.tradeProb = opts.tradeProb || 0.35;
    this.fundamentalEstimate = opts.fundamentalEstimate || null; // If null, uses rolling mean
  }

  act(market) {
    if (market.priceHistory.length < this.lookback) return null;
    if (Math.random() > this.tradeProb) return null;

    const recent = market.priceHistory.slice(-this.lookback);
    const mean = this.fundamentalEstimate || recent.reduce((s, p) => s + p, 0) / recent.length;
    const deviation = market.midPrice - mean;

    if (Math.abs(deviation) < this.threshold) return null;

    const size = Math.min(15, Math.abs(deviation) * 150);

    if (deviation > 0) {
      // Overpriced — sell
      return { type: 'ASK', price: clampPrice(market.midPrice - 0.005), size };
    } else {
      // Underpriced — buy
      return { type: 'BID', price: clampPrice(market.midPrice + 0.005), size };
    }
  }
}

// ─── 4. Whale ────────────────────────────────────────────────────────

class Whale {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'WHALE';
    this.tradeProb = opts.tradeProb || 0.03;        // Rare: ~3% per tick
    this.sizeMultiplier = opts.sizeMultiplier || 10;  // 10× normal size
    this.informed = opts.informed || false;            // Does whale know true prob?
    this.manipulative = opts.manipulative || false;    // Does whale want to push price?
    this.targetDirection = opts.targetDirection || 0;  // 1 = push up, -1 = push down
  }

  act(market) {
    const freq = market.regime === 'CRISIS' ? this.tradeProb * 3 : this.tradeProb;
    if (Math.random() > freq) return null;

    const baseSize = 5 * this.sizeMultiplier;
    const size = baseSize + baseSize * Math.random();

    if (this.manipulative) {
      // Whale is trying to push the market
      if (this.targetDirection > 0 || market.midPrice < 0.3) {
        return { type: 'MARKET_BUY', size };
      } else {
        return { type: 'MARKET_SELL', size };
      }
    }

    if (this.informed && market.fundamentalVisible !== false) {
      // Trade toward true value
      if (market.midPrice < market.trueProb - 0.03) {
        return { type: 'MARKET_BUY', size };
      } else if (market.midPrice > market.trueProb + 0.03) {
        return { type: 'MARKET_SELL', size };
      }
      return null;
    }

    // Uninformed whale — random direction
    return Math.random() > 0.5
      ? { type: 'MARKET_BUY', size }
      : { type: 'MARKET_SELL', size };
  }
}

// ─── 5. Arb Bot ──────────────────────────────────────────────────────

class ArbBot {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'ARB';
    this.minEdge = opts.minEdge || 0.03;     // 3% min edge to trade
    this.speed = opts.speed || 0.8;           // How often it acts (0-1)
    this.sizePerEdge = opts.sizePerEdge || 200; // $ per 1% edge
    this.noiseStd = opts.noiseStd || 0.02;    // Imperfect info
  }

  act(market) {
    if (Math.random() > this.speed) return null;

    // Arb bot has a noisy estimate of true probability
    const estimate = market.trueProb + gaussianNoise(0, this.noiseStd);
    const edge = estimate - market.midPrice;

    if (Math.abs(edge) < this.minEdge) return null;

    const size = Math.min(20, Math.abs(edge) * this.sizePerEdge);

    if (edge > 0) {
      return { type: 'MARKET_BUY', size };
    } else {
      return { type: 'MARKET_SELL', size };
    }
  }
}

// ─── 6. Market Maker ─────────────────────────────────────────────────

class MarketMaker {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'MM';
    this.spreadTarget = opts.spreadTarget || 0.02; // 2% target spread
    this.size = opts.size || 20;                    // Liquidity per side
    this.inventoryLimit = opts.inventoryLimit || 100;
    this.inventory = 0;
    this.pnl = 0;
  }

  act(market, orderBook, regime) {
    const spread = this.spreadTarget * regime.spreadMultiplier;
    const halfSpread = spread / 2;

    // Skew quotes based on inventory
    const skew = (this.inventory / this.inventoryLimit) * 0.01;
    const bidPrice = clampPrice(market.midPrice - halfSpread - skew);
    const askPrice = clampPrice(market.midPrice + halfSpread - skew);

    // Reduce size in volatile regimes
    const adjSize = this.size / regime.volatilityMultiplier;

    return [
      { type: 'BID', price: bidPrice, size: adjSize },
      { type: 'ASK', price: askPrice, size: adjSize },
    ];
  }
}

// ─── 7. News Trader ──────────────────────────────────────────────────

class NewsTrader {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'NEWS';
    this.reactionSpeed = opts.reactionSpeed || 0.9; // How fast they react (0-1)
    this.overreactionFactor = opts.overreactionFactor || 1.3; // How much they overreact
    this.lastShockTick = -Infinity;
    this.lastTrueProb = null;
  }

  act(market) {
    // Detect info shocks by watching trueProb changes
    if (this.lastTrueProb !== null && market.trueProb !== this.lastTrueProb) {
      this.lastShockTick = market.tick;
    }
    this.lastTrueProb = market.trueProb;

    // Only trade within 10 ticks of a shock
    const ticksSinceShock = market.tick - this.lastShockTick;
    if (ticksSinceShock > 10) return null;
    if (Math.random() > this.reactionSpeed) return null;

    const direction = market.trueProb - market.midPrice;
    const overreact = direction * this.overreactionFactor;
    const size = Math.min(25, Math.abs(overreact) * 200);

    if (overreact > 0.01) {
      return { type: 'MARKET_BUY', size };
    } else if (overreact < -0.01) {
      return { type: 'MARKET_SELL', size };
    }
    return null;
  }
}

// ─── 8. Front Runner ─────────────────────────────────────────────────

class FrontRunner {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'FRONTRUN';
    this.sensitivity = opts.sensitivity || 0.6;    // How often they detect signals
    this.lastVolume = 0;
    this.lastPrice = 0;
  }

  act(market) {
    if (Math.random() > this.sensitivity) return null;

    // Detect large volume bursts (potential incoming whale)
    const recentVol = market.volumeHistory.slice(-3);
    const avgVol = market.volumeHistory.slice(-20).reduce((s, v) => s + v, 0) / 20;
    const currentVol = recentVol[recentVol.length - 1] - (recentVol[recentVol.length - 2] || 0);

    if (currentVol < avgVol * 2) return null; // No volume spike

    // Guess direction from price movement
    const priceMove = market.midPrice - (market.priceHistory[market.priceHistory.length - 3] || market.midPrice);

    if (Math.abs(priceMove) < 0.005) return null;

    const size = Math.min(8, Math.abs(priceMove) * 300);
    if (priceMove > 0) {
      return { type: 'MARKET_BUY', size };
    } else {
      return { type: 'MARKET_SELL', size };
    }
  }
}

// ─── 9. Herd Agent ───────────────────────────────────────────────────

class HerdAgent {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'HERD';
    this.lookback = opts.lookback || 10;
    this.tradeProb = opts.tradeProb || 0.25;
    this.threshold = opts.threshold || 0.02;
  }

  act(market) {
    if (market.priceHistory.length < this.lookback + 5) return null;
    if (Math.random() > this.tradeProb) return null;

    const recentPrices = market.priceHistory.slice(-this.lookback);
    const trend = recentPrices[recentPrices.length - 1] - recentPrices[0];

    if (Math.abs(trend) < this.threshold) return null;

    const size = Math.min(5, Math.abs(trend) * 100);
    if (trend > 0) {
      return { type: 'MARKET_BUY', size };
    } else {
      return { type: 'MARKET_SELL', size };
    }
  }
}

// ─── 10. Contrarian Agent ────────────────────────────────────────────

class ContrarianAgent {
  constructor(id, opts = {}) {
    this.id = id;
    this.type = 'CONTRARIAN';
    this.extremeThreshold = opts.extremeThreshold || 0.15; // 15% from 0.5 = extreme
    this.tradeProb = opts.tradeProb || 0.2;
  }

  act(market) {
    if (Math.random() > this.tradeProb) return null;

    const deviation = market.midPrice - 0.5;
    if (Math.abs(deviation) < this.extremeThreshold) return null;

    const size = Math.min(10, Math.abs(deviation) * 50);
    if (deviation > 0) {
      // Price too high — fade it
      return { type: 'MARKET_SELL', size };
    } else {
      // Price too low — buy
      return { type: 'MARKET_BUY', size };
    }
  }
}

// ─── Agent Factory ───────────────────────────────────────────────────

/**
 * Create a standard population of trading agents for simulation.
 *
 * @param {Object} opts
 * @param {number} opts.noiseCount - Number of noise traders (default 8)
 * @param {number} opts.trendCount - Number of trend followers (default 3)
 * @param {number} opts.meanRevertCount - Number of mean reverters (default 2)
 * @param {number} opts.whaleCount - Number of whales (default 1)
 * @param {number} opts.arbCount - Number of arb bots (default 2)
 * @param {number} opts.mmCount - Number of market makers (default 2)
 * @param {number} opts.newsCount - Number of news traders (default 2)
 * @param {boolean} opts.includeFrontRunners - Add front-running agents
 * @param {boolean} opts.includeAdversarial - Add adversarial agents
 * @returns {Array} Array of agent instances
 */
function createPopulation(opts = {}) {
  const agents = [];
  let idCounter = 0;

  // Noise traders — the bulk of market activity
  const noiseCount = opts.noiseCount ?? 8;
  for (let i = 0; i < noiseCount; i++) {
    agents.push(new NoiseTrader(`noise-${idCounter++}`, {
      tradeProb: 0.2 + Math.random() * 0.3,
      sizeRange: [0.5, 3 + Math.random() * 5],
      bias: gaussianNoise(0, 0.1),
    }));
  }

  // Trend followers
  const trendCount = opts.trendCount ?? 3;
  for (let i = 0; i < trendCount; i++) {
    agents.push(new TrendFollower(`trend-${idCounter++}`, {
      fastPeriod: 3 + Math.floor(Math.random() * 5),
      slowPeriod: 15 + Math.floor(Math.random() * 15),
      sizeMultiplier: 0.5 + Math.random(),
    }));
  }

  // Mean reverters
  const meanRevertCount = opts.meanRevertCount ?? 2;
  for (let i = 0; i < meanRevertCount; i++) {
    agents.push(new MeanReverter(`meanrev-${idCounter++}`, {
      lookback: 20 + Math.floor(Math.random() * 20),
      threshold: 0.03 + Math.random() * 0.03,
    }));
  }

  // Whales
  const whaleCount = opts.whaleCount ?? 1;
  for (let i = 0; i < whaleCount; i++) {
    agents.push(new Whale(`whale-${idCounter++}`, {
      tradeProb: 0.02 + Math.random() * 0.03,
      sizeMultiplier: 5 + Math.random() * 15,
      informed: Math.random() > 0.5,
    }));
  }

  // Arb bots
  const arbCount = opts.arbCount ?? 2;
  for (let i = 0; i < arbCount; i++) {
    agents.push(new ArbBot(`arb-${idCounter++}`, {
      minEdge: 0.02 + Math.random() * 0.03,
      speed: 0.6 + Math.random() * 0.3,
      noiseStd: 0.01 + Math.random() * 0.03,
    }));
  }

  // Market makers
  const mmCount = opts.mmCount ?? 2;
  for (let i = 0; i < mmCount; i++) {
    agents.push(new MarketMaker(`mm-${idCounter++}`, {
      spreadTarget: 0.015 + Math.random() * 0.015,
      size: 10 + Math.random() * 20,
    }));
  }

  // News traders
  const newsCount = opts.newsCount ?? 2;
  for (let i = 0; i < newsCount; i++) {
    agents.push(new NewsTrader(`news-${idCounter++}`, {
      reactionSpeed: 0.7 + Math.random() * 0.25,
      overreactionFactor: 1.0 + Math.random() * 0.5,
    }));
  }

  // Optional: front-runners
  if (opts.includeFrontRunners) {
    agents.push(new FrontRunner(`frontrun-${idCounter++}`, { sensitivity: 0.5 + Math.random() * 0.3 }));
    agents.push(new FrontRunner(`frontrun-${idCounter++}`, { sensitivity: 0.3 + Math.random() * 0.4 }));
  }

  // Optional: herd + contrarian
  if (opts.includeHerd ?? true) {
    agents.push(new HerdAgent(`herd-${idCounter++}`));
    agents.push(new HerdAgent(`herd-${idCounter++}`, { lookback: 20, threshold: 0.03 }));
  }

  if (opts.includeContrarian ?? true) {
    agents.push(new ContrarianAgent(`contrarian-${idCounter++}`));
  }

  // Optional: adversarial agents (make life hard for the player)
  if (opts.includeAdversarial) {
    // Manipulative whale that pushes price AWAY from true value
    agents.push(new Whale(`adversarial-whale-${idCounter++}`, {
      tradeProb: 0.04,
      sizeMultiplier: 20,
      manipulative: true,
      targetDirection: Math.random() > 0.5 ? 1 : -1,
    }));
    // Fast front-runner
    agents.push(new FrontRunner(`adversarial-frontrun-${idCounter++}`, { sensitivity: 0.9 }));
  }

  return agents;
}

/**
 * Create a specific population profile for different market categories.
 */
function createCategoryPopulation(category) {
  switch (category) {
    case 'politics':
    case 'geopolitics':
      return createPopulation({
        noiseCount: 10,  // High retail interest
        trendCount: 4,   // News-driven momentum
        newsCount: 4,    // Lots of news traders
        whaleCount: 2,   // PACs, institutional bettors
        arbCount: 1,     // Fewer arbs in political markets
        includeHerd: true,
      });

    case 'crypto':
      return createPopulation({
        noiseCount: 6,
        trendCount: 5,   // Crypto is momentum-heavy
        whaleCount: 3,   // Many whales in crypto
        arbCount: 4,     // Dense arb infrastructure
        mmCount: 3,      // AMMs + centralised MMs
        includeFrontRunners: true, // MEV bots
      });

    case 'sports':
      return createPopulation({
        noiseCount: 12,  // High retail
        trendCount: 2,
        arbCount: 3,     // Sharp bettors arb Poly vs books
        mmCount: 1,
        newsCount: 1,
        whaleCount: 1,
      });

    default: // economics, regulation, tech, etc.
      return createPopulation({
        noiseCount: 8,
        trendCount: 3,
        meanRevertCount: 3,
        arbCount: 2,
        mmCount: 2,
        newsCount: 2,
      });
  }
}

module.exports = {
  // Agent classes
  NoiseTrader,
  TrendFollower,
  MeanReverter,
  Whale,
  ArbBot,
  MarketMaker,
  NewsTrader,
  FrontRunner,
  HerdAgent,
  ContrarianAgent,

  // Factories
  createPopulation,
  createCategoryPopulation,

  // Util
  ema,
  gaussianNoise,
};
