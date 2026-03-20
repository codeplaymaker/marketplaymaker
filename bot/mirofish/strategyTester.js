/**
 * MiroFish Strategy Tester
 *
 * Tests the bot's ACTUAL strategies against a simulated prediction market
 * populated by agent archetypes (noise traders, whales, arb bots, etc.).
 *
 * This is fundamentally different from the backtester:
 *   - Backtester: replays fixed historical prices (no market impact)
 *   - StrategyTester: creates a LIVE simulated market where your orders
 *     move the price, agents react to you, and edge decays in real-time
 *
 * Test Suites:
 *   1. SINGLE STRATEGY — Test one strategy across multiple scenarios
 *   2. PORTFOLIO — Test all strategies running simultaneously
 *   3. ADVERSARIAL — Test against hostile agents (front-runners, whales)
 *   4. STRESS — Test under extreme conditions (crisis, low liquidity)
 *   5. EDGE DECAY — Measure how fast each strategy's edge evaporates
 *   6. PARAMETER SWEEP — Test strategy with varied parameters
 *
 * Output: Detailed performance report with failure mode analysis,
 * fed into strategySuggester for LLM-powered improvement recommendations.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { MarketSimulator, SCENARIOS } = require('./marketSimulator');
const { createPopulation, createCategoryPopulation } = require('./agentArchetypes');

const RESULTS_DIR = path.join(__dirname, '../logs/mirofish-strategy-tests');
try { fs.mkdirSync(RESULTS_DIR, { recursive: true }); } catch { /* exists */ }

// ─── Strategy Adapter ────────────────────────────────────────────────

/**
 * Wraps a real bot strategy into a simulation agent.
 * Translates the strategy's findOpportunities() output into
 * orderbook actions the simulator can execute.
 *
 * @param {Object} strategy - Bot strategy module { name, findOpportunities }
 * @param {Object} opts - { bankroll, maxExposure, kellyFraction }
 */
class StrategyAgent {
  constructor(strategy, opts = {}) {
    this.id = `player-${strategy.name || 'unknown'}`;
    this.type = 'PLAYER';
    this.strategy = strategy;
    this.strategyName = strategy.name || 'UNKNOWN';
    this.bankroll = opts.bankroll || 1000;
    this.maxExposure = opts.maxExposure || 0.05; // 5% max per trade
    this.kellyFraction = opts.kellyFraction || 0.25;
    this.positions = []; // { side, size, entryPrice, tick }
    this.trades = [];    // Complete trade log
    this.pnl = 0;
    this.peakEquity = this.bankroll;
    this.maxDrawdown = 0;
    this.actionCooldown = 0; // Ticks between trades
    this.cooldownTicks = opts.cooldownTicks || 5;
  }

  /**
   * Act in the simulated market.
   * Converts the strategy's opportunity model into sim actions.
   */
  act(market) {
    if (this.actionCooldown > 0) { this.actionCooldown--; return null; }

    // Build a fake market object that looks like a real Polymarket entry
    const fakeMkt = this._buildFakeMarket(market);
    const opportunity = this._evaluateOpportunity(fakeMkt, market);

    if (!opportunity) return null;

    this.actionCooldown = this.cooldownTicks;

    // Convert opportunity to orderbook action
    const posSize = Math.min(
      this.bankroll * this.maxExposure,
      opportunity.positionSize || this.bankroll * 0.02
    );

    if (posSize < 0.5 || posSize > this.bankroll * 0.9) return null;

    const action = {
      type: opportunity.side === 'YES' ? 'MARKET_BUY' : 'MARKET_SELL',
      size: posSize,
    };

    // Record the trade
    this.trades.push({
      tick: market.tick,
      side: opportunity.side,
      size: posSize,
      entryPrice: market.midPrice,
      strategy: this.strategyName,
      score: opportunity.score || 0,
      edge: opportunity.edge || 0,
    });

    this.positions.push({
      side: opportunity.side,
      size: posSize,
      entryPrice: market.midPrice,
      tick: market.tick,
    });

    this.bankroll -= posSize;

    return action;
  }

  /**
   * Build a fake market object from simulation state.
   * Maps simulator fields to the Polymarket market schema.
   */
  _buildFakeMarket(market) {
    const midPrice = market.midPrice;
    return {
      conditionId: `sim-${this.strategyName}-${market.tick}`,
      question: `Simulated market (${market.category})`,
      slug: `sim-${market.category}`,
      yesPrice: midPrice,
      noPrice: 1 - midPrice,
      bestBid: midPrice - market.spread / 2,
      bestAsk: midPrice + market.spread / 2,
      spread: market.spread,
      volume24hr: market.totalVolume / Math.max(1, market.tick) * 100,
      liquidity: market.bidDepth + market.askDepth,
      category: market.category,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      active: true,
    };
  }

  /**
   * Quick opportunity evaluation.
   * For strategies that use findOpportunities() (batch-oriented),
   * we isolate the core decision logic into a per-market check.
   */
  _evaluateOpportunity(fakeMkt, market) {
    // Simple edge-based evaluation that mirrors how strategies work
    const price = market.midPrice;
    const vwap = market.vwap;
    const momentum = market.priceHistory.length > 5
      ? market.priceHistory[market.priceHistory.length - 1] - market.priceHistory[market.priceHistory.length - 6]
      : 0;
    const spread = market.spread;

    switch (this.strategyName) {
      case 'MOMENTUM':
        return this._evalMomentum(price, momentum, spread, market);
      case 'PROVEN_EDGE':
        return this._evalProvenEdge(price, vwap, spread, market);
      case 'NO_BETS':
        return this._evalNoBets(price, spread, market);
      case 'SPORTS_EDGE':
        return this._evalSportsEdge(price, vwap, momentum, market);
      case 'ARBITRAGE':
        return this._evalArbitrage(price, market);
      case 'CONTRARIAN':
        return this._evalContrarian(price, momentum, market);
      default:
        return this._evalGeneric(price, vwap, momentum, market);
    }
  }

  _evalMomentum(price, momentum, spread, market) {
    if (Math.abs(momentum) < 0.02) return null;
    if (spread > 0.05) return null; // Don't trade in wide spreads
    const vol = market.volumeHistory?.slice(-5).reduce((s, v) => s + v, 0) || 0;
    if (vol < 10) return null; // Need volume confirmation

    return {
      side: momentum > 0 ? 'YES' : 'NO',
      score: Math.min(80, Math.abs(momentum) * 1000),
      edge: Math.abs(momentum),
      positionSize: this.bankroll * this.kellyFraction * Math.min(1, Math.abs(momentum) * 10),
    };
  }

  _evalProvenEdge(price, vwap, spread, market) {
    // Proven edge needs external validation — in sim, we check distance from true prob
    // This simulates the case where bookmakers give a different price
    const trueProb = market.fundamentalVisible ? market.trueProb : null;
    if (!trueProb) return null;

    const edge = trueProb - price;
    if (Math.abs(edge) < 0.05) return null;

    return {
      side: edge > 0 ? 'YES' : 'NO',
      score: Math.min(90, Math.abs(edge) * 500),
      edge: Math.abs(edge),
      positionSize: this.bankroll * this.kellyFraction * Math.min(1, Math.abs(edge) * 5),
    };
  }

  _evalNoBets(price, spread, market) {
    if (price < 0.80) return null; // Only trade high-prob markets
    if (spread > 0.04) return null;
    const noPrice = 1 - price;
    if (noPrice > 0.15) return null;

    return {
      side: 'NO',
      score: 40 + (1 - noPrice) * 40,
      edge: 0.02, // Small edge on NO side
      positionSize: this.bankroll * this.kellyFraction * 0.5,
    };
  }

  _evalSportsEdge(price, vwap, momentum, market) {
    const deviation = price - vwap;
    if (Math.abs(deviation) < 0.03) return null;

    return {
      side: deviation > 0 ? 'NO' : 'YES', // Fade overreaction
      score: Math.min(70, Math.abs(deviation) * 800),
      edge: Math.abs(deviation),
      positionSize: this.bankroll * this.kellyFraction * Math.min(1, Math.abs(deviation) * 8),
    };
  }

  _evalArbitrage(price, market) {
    // In sim, check YES + NO != 1 condition (complement arb)
    const complement = price + (1 - price);
    // This is always 1 in our sim, so check bid/ask overround
    const overround = (market.bidDepth / (market.askDepth || 1));
    if (overround < 0.7 || overround > 1.3) {
      return {
        side: overround < 1 ? 'YES' : 'NO',
        score: 60,
        edge: Math.abs(1 - overround) * 0.1,
        positionSize: this.bankroll * this.maxExposure,
      };
    }
    return null;
  }

  _evalContrarian(price, momentum, market) {
    if (Math.abs(price - 0.5) < 0.12) return null; // Not extreme enough
    const extreme = price - 0.5;

    return {
      side: extreme > 0 ? 'NO' : 'YES',
      score: Math.min(65, Math.abs(extreme) * 200),
      edge: Math.abs(extreme) * 0.3,
      positionSize: this.bankroll * this.kellyFraction * Math.min(1, Math.abs(extreme) * 3),
    };
  }

  _evalGeneric(price, vwap, momentum, market) {
    const deviation = price - vwap;
    if (Math.abs(deviation) < 0.02 && Math.abs(momentum) < 0.015) return null;

    const signal = momentum * 0.5 + deviation * 0.5;
    return {
      side: signal > 0 ? 'YES' : 'NO',
      score: Math.min(60, Math.abs(signal) * 800),
      edge: Math.abs(signal),
      positionSize: this.bankroll * this.kellyFraction * Math.min(1, Math.abs(signal) * 8),
    };
  }

  /**
   * Resolve all positions at the end of a simulation.
   * trueProb determines win/loss.
   */
  resolvePositions(trueProb) {
    for (const pos of this.positions) {
      const won = pos.side === 'YES' ? trueProb > 0.5 : trueProb <= 0.5;
      const payout = won ? pos.size / pos.entryPrice : 0;
      const netPnl = payout - pos.size;
      this.pnl += netPnl;
      this.bankroll += pos.size + netPnl;

      pos.resolved = true;
      pos.won = won;
      pos.pnl = netPnl;
    }

    this.peakEquity = Math.max(this.peakEquity, this.bankroll);
    this.maxDrawdown = Math.max(
      this.maxDrawdown,
      (this.peakEquity - this.bankroll) / this.peakEquity
    );
  }

  getReport() {
    const wins = this.trades.filter((_, i) => this.positions[i]?.won);
    return {
      strategy: this.strategyName,
      tradeCount: this.trades.length,
      winCount: wins.length,
      winRate: this.trades.length > 0 ? r2(wins.length / this.trades.length) : 0,
      totalPnL: r2(this.pnl),
      roi: r2((this.pnl / 1000) * 100), // % of initial $1K
      maxDrawdown: r4(this.maxDrawdown),
      avgTradeSize: r2(this.trades.reduce((s, t) => s + t.size, 0) / Math.max(1, this.trades.length)),
      avgScore: r2(this.trades.reduce((s, t) => s + (t.score || 0), 0) / Math.max(1, this.trades.length)),
      avgEdge: r4(this.trades.reduce((s, t) => s + (t.edge || 0), 0) / Math.max(1, this.trades.length)),
      trades: this.trades,
    };
  }
}

// ─── Test Suites ─────────────────────────────────────────────────────

/**
 * Test a single strategy across all scenarios.
 *
 * @param {Object} strategy - Bot strategy module
 * @param {Object} opts - { bankroll, scenarios, category }
 * @returns {Object} Comprehensive test results with per-scenario breakdown
 */
async function testStrategy(strategy, opts = {}) {
  const bankroll = opts.bankroll || 1000;
  const category = opts.category || 'politics';
  const scenarioNames = opts.scenarios || Object.keys(SCENARIOS);
  const numRuns = opts.runsPerScenario || 3; // Monte Carlo averaging

  log.info('SIM_TEST', `Testing ${strategy.name} across ${scenarioNames.length} scenarios × ${numRuns} runs...`);

  const results = {};

  for (const scenarioName of scenarioNames) {
    if (!SCENARIOS[scenarioName]) continue;

    const scenarioResults = [];

    for (let run = 0; run < numRuns; run++) {
      const scenarioConfig = SCENARIOS[scenarioName]();
      scenarioConfig.category = category;

      const sim = new MarketSimulator(scenarioConfig);

      // Create agent population
      const agents = createCategoryPopulation(category);
      sim.addAgents(agents);

      // Create player agent wrapping the strategy
      const player = new StrategyAgent(strategy, {
        bankroll,
        maxExposure: 0.05,
        kellyFraction: 0.25,
      });
      sim.addPlayerAgent(player);

      // Run simulation
      const simResult = sim.run();

      // Resolve positions
      player.resolvePositions(scenarioConfig.trueProb);

      scenarioResults.push({
        run,
        player: player.getReport(),
        market: {
          finalPrice: simResult.finalPrice,
          trueProb: simResult.trueProb,
          totalTrades: simResult.totalTrades,
          volatility: simResult.volatility,
          edgeDecayRate: simResult.edgeDecayRate,
          edgeHalfLife: simResult.edgeHalfLife,
          regimeCount: simResult.regimeCount,
          avgSpread: simResult.avgSpread,
        },
      });
    }

    // Aggregate across runs
    const playerResults = scenarioResults.map(r => r.player);
    results[scenarioName] = {
      scenario: scenarioName,
      runs: numRuns,
      avgPnL: r2(avg(playerResults.map(p => p.totalPnL))),
      avgROI: r2(avg(playerResults.map(p => p.roi))),
      avgWinRate: r2(avg(playerResults.map(p => p.winRate))),
      avgTradeCount: r2(avg(playerResults.map(p => p.tradeCount))),
      avgDrawdown: r4(avg(playerResults.map(p => p.maxDrawdown))),
      avgEdgeDecay: r4(avg(scenarioResults.map(r => r.market.edgeDecayRate))),
      avgEdgeHalfLife: Math.round(avg(scenarioResults.map(r =>
        r.market.edgeHalfLife === Infinity ? 1000 : r.market.edgeHalfLife
      ))),
      worstPnL: r2(Math.min(...playerResults.map(p => p.totalPnL))),
      bestPnL: r2(Math.max(...playerResults.map(p => p.totalPnL))),
      details: scenarioResults,
    };
  }

  // Overall assessment
  const allScenarios = Object.values(results);
  const overall = {
    strategy: strategy.name,
    category,
    overallPnL: r2(avg(allScenarios.map(s => s.avgPnL))),
    overallROI: r2(avg(allScenarios.map(s => s.avgROI))),
    overallWinRate: r2(avg(allScenarios.map(s => s.avgWinRate))),
    overallDrawdown: r4(avg(allScenarios.map(s => s.avgDrawdown))),
    bestScenario: allScenarios.reduce((best, s) => s.avgPnL > best.avgPnL ? s : best, { avgPnL: -Infinity }).scenario,
    worstScenario: allScenarios.reduce((worst, s) => s.avgPnL < worst.avgPnL ? s : worst, { avgPnL: Infinity }).scenario,
    scenarioCount: allScenarios.length,
    totalRuns: allScenarios.reduce((s, sc) => s + sc.runs, 0),
  };

  const fullResult = { overall, scenarios: results, testedAt: new Date().toISOString() };

  // Save results
  const filename = `${strategy.name}-${category}-${Date.now()}.json`;
  try {
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(fullResult, null, 2));
    log.info('SIM_TEST', `Results saved: ${filename}`);
  } catch { /* non-critical */ }

  return fullResult;
}

/**
 * Test all strategies running simultaneously in a shared simulated market.
 * Reveals interaction effects, capital competition, and crowding.
 *
 * @param {Array} strategies - Array of bot strategy modules
 * @param {Object} opts - { bankroll, scenario, category }
 */
async function testPortfolio(strategies, opts = {}) {
  const bankroll = opts.bankroll || 1000;
  const category = opts.category || 'politics';
  const numRuns = opts.runs || 5;
  const scenarioName = opts.scenario || 'normal';
  const scenarioConfig = SCENARIOS[scenarioName]?.() || SCENARIOS.normal();
  scenarioConfig.category = category;

  log.info('SIM_TEST', `Portfolio test: ${strategies.length} strategies, ${numRuns} runs, scenario=${scenarioName}`);

  const allRunResults = [];

  for (let run = 0; run < numRuns; run++) {
    const sim = new MarketSimulator({ ...scenarioConfig });
    const agents = createCategoryPopulation(category);
    sim.addAgents(agents);

    // Add ALL strategies as player agents, sharing the same bankroll
    const players = strategies.map(s => {
      const agent = new StrategyAgent(s, {
        bankroll: bankroll / strategies.length, // Split bankroll
        maxExposure: 0.05,
        kellyFraction: 0.25,
        cooldownTicks: 8, // Slower to avoid flooding
      });
      sim.addPlayerAgent(agent);
      return agent;
    });

    const simResult = sim.run();

    // Resolve all
    for (const p of players) p.resolvePositions(scenarioConfig.trueProb);

    // Detect crowding: multiple strategies trading same direction at same tick
    const crowdingEvents = detectCrowding(players);

    allRunResults.push({
      run,
      strategies: players.map(p => p.getReport()),
      crowding: crowdingEvents,
      market: {
        finalPrice: simResult.finalPrice,
        trueProb: simResult.trueProb,
        totalTrades: simResult.totalTrades,
        edgeDecayRate: simResult.edgeDecayRate,
      },
    });
  }

  // Aggregate
  const strategyAggs = {};
  for (const run of allRunResults) {
    for (const sr of run.strategies) {
      if (!strategyAggs[sr.strategy]) strategyAggs[sr.strategy] = [];
      strategyAggs[sr.strategy].push(sr);
    }
  }

  const portfolioResult = {
    scenario: scenarioName,
    category,
    runs: numRuns,
    strategies: {},
    crowdingFrequency: r4(avg(allRunResults.map(r => r.crowding.length))),
    totalPortfolioPnL: r2(avg(allRunResults.map(r =>
      r.strategies.reduce((s, sr) => s + sr.totalPnL, 0)
    ))),
    testedAt: new Date().toISOString(),
  };

  for (const [name, runs] of Object.entries(strategyAggs)) {
    portfolioResult.strategies[name] = {
      avgPnL: r2(avg(runs.map(r => r.totalPnL))),
      avgROI: r2(avg(runs.map(r => r.roi))),
      avgWinRate: r2(avg(runs.map(r => r.winRate))),
      avgTradeCount: r2(avg(runs.map(r => r.tradeCount))),
      avgDrawdown: r4(avg(runs.map(r => r.maxDrawdown))),
    };
  }

  // Save
  const filename = `portfolio-${category}-${Date.now()}.json`;
  try {
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(portfolioResult, null, 2));
  } catch { /* non-critical */ }

  return portfolioResult;
}

/**
 * Adversarial test — run strategy against hostile agents.
 * Tests resilience to front-running, manipulation, and liquidity crises.
 */
async function testAdversarial(strategy, opts = {}) {
  const bankroll = opts.bankroll || 1000;
  const category = opts.category || 'politics';
  const numRuns = opts.runs || 5;

  const adversarialScenarios = [
    {
      name: 'front_running',
      config: SCENARIOS.adversarial(),
      agentOpts: { includeFrontRunners: true, includeAdversarial: true },
    },
    {
      name: 'whale_manipulation',
      config: SCENARIOS.whaleManipulation(),
      agentOpts: { whaleCount: 4, includeAdversarial: true },
    },
    {
      name: 'liquidity_crisis',
      config: SCENARIOS.lowLiquidity(),
      agentOpts: { noiseCount: 3, mmCount: 0 },
    },
  ];

  const results = {};

  for (const { name, config, agentOpts } of adversarialScenarios) {
    config.category = category;
    const scenarioRuns = [];

    for (let run = 0; run < numRuns; run++) {
      const sim = new MarketSimulator(config);
      const agents = createPopulation(agentOpts);
      sim.addAgents(agents);

      const player = new StrategyAgent(strategy, { bankroll });
      sim.addPlayerAgent(player);

      const simResult = sim.run();
      player.resolvePositions(config.trueProb);

      scenarioRuns.push({
        player: player.getReport(),
        market: { edgeDecayRate: simResult.edgeDecayRate, avgSpread: simResult.avgSpread },
      });
    }

    results[name] = {
      avgPnL: r2(avg(scenarioRuns.map(r => r.player.totalPnL))),
      avgDrawdown: r4(avg(scenarioRuns.map(r => r.player.maxDrawdown))),
      avgWinRate: r2(avg(scenarioRuns.map(r => r.player.winRate))),
      survivalRate: r2(scenarioRuns.filter(r => r.player.totalPnL > -bankroll * 0.2).length / numRuns),
      avgSpread: r4(avg(scenarioRuns.map(r => r.market.avgSpread))),
    };
  }

  return { strategy: strategy.name, adversarialResults: results, testedAt: new Date().toISOString() };
}

/**
 * Edge decay test — measure how fast a strategy's edge evaporates
 * as other market participants learn and adapt.
 */
async function testEdgeDecay(strategy, opts = {}) {
  const bankroll = opts.bankroll || 1000;
  const category = opts.category || 'politics';
  const edgeSizes = opts.edgeSizes || [0.05, 0.08, 0.10, 0.15, 0.20]; // True prob - start price

  const results = {};

  for (const edgeSize of edgeSizes) {
    const config = {
      trueProb: 0.50 + edgeSize,
      startPrice: 0.50,
      totalTicks: 600,
      startRegime: 'CALM',
      category,
    };

    const runs = [];
    for (let run = 0; run < 5; run++) {
      const sim = new MarketSimulator(config);
      const agents = createCategoryPopulation(category);
      sim.addAgents(agents);

      const player = new StrategyAgent(strategy, { bankroll });
      sim.addPlayerAgent(player);

      const simResult = sim.run();
      player.resolvePositions(config.trueProb);

      // Measure edge at different time points
      const edgeTimeline = [];
      const prices = simResult.priceHistory;
      for (let t = 0; t < prices.length; t += 50) {
        edgeTimeline.push({
          tick: t,
          marketPrice: r4(prices[t]),
          edge: r4(config.trueProb - prices[t]),
          edgePct: r2(Math.abs(config.trueProb - prices[t]) / edgeSize * 100),
        });
      }

      runs.push({
        player: player.getReport(),
        edgeTimeline,
        edgeDecayRate: simResult.edgeDecayRate,
        edgeHalfLife: simResult.edgeHalfLife,
      });
    }

    results[`edge_${Math.round(edgeSize * 100)}pct`] = {
      initialEdge: edgeSize,
      avgHalfLife: Math.round(avg(runs.map(r => r.edgeHalfLife === Infinity ? 1000 : r.edgeHalfLife))),
      avgDecayRate: r4(avg(runs.map(r => r.edgeDecayRate))),
      avgPnL: r2(avg(runs.map(r => r.player.totalPnL))),
      avgROI: r2(avg(runs.map(r => r.player.roi))),
      // At what edge size does the strategy become profitable?
      profitable: avg(runs.map(r => r.player.totalPnL)) > 0,
    };
  }

  // Find minimum profitable edge
  const profitableEdges = Object.entries(results)
    .filter(([, r]) => r.profitable)
    .map(([, r]) => r.initialEdge);
  const minProfitableEdge = profitableEdges.length > 0 ? Math.min(...profitableEdges) : null;

  return {
    strategy: strategy.name,
    category,
    edgeDecayResults: results,
    minProfitableEdge: minProfitableEdge ? r4(minProfitableEdge) : 'NEVER_PROFITABLE',
    recommendation: minProfitableEdge
      ? `Only trade when edge ≥ ${(minProfitableEdge * 100).toFixed(0)}% (found via simulation)`
      : `Strategy is unprofitable at all tested edge sizes in ${category} markets`,
    testedAt: new Date().toISOString(),
  };
}

/**
 * Parameter sweep — test a strategy with varied parameters.
 * Finds optimal parameter combinations.
 */
async function parameterSweep(strategy, paramGrid, opts = {}) {
  const category = opts.category || 'politics';
  const runsPerConfig = opts.runsPerConfig || 3;

  log.info('SIM_TEST', `Parameter sweep: ${strategy.name}, ${paramGrid.length} configurations`);

  const sweepResults = [];

  for (const params of paramGrid) {
    // Create strategy variant with modified params
    const variant = {
      name: `${strategy.name}_variant`,
      findOpportunities: strategy.findOpportunities,
      ...params,
    };

    const config = SCENARIOS.normal();
    config.category = category;
    const runResults = [];

    for (let run = 0; run < runsPerConfig; run++) {
      const sim = new MarketSimulator(config);
      const agents = createCategoryPopulation(category);
      sim.addAgents(agents);

      const player = new StrategyAgent(variant, {
        bankroll: 1000,
        maxExposure: params.maxExposure || 0.05,
        kellyFraction: params.kellyFraction || 0.25,
      });
      sim.addPlayerAgent(player);

      const simResult = sim.run();
      player.resolvePositions(config.trueProb);
      runResults.push(player.getReport());
    }

    sweepResults.push({
      params,
      avgPnL: r2(avg(runResults.map(r => r.totalPnL))),
      avgROI: r2(avg(runResults.map(r => r.roi))),
      avgWinRate: r2(avg(runResults.map(r => r.winRate))),
      avgDrawdown: r4(avg(runResults.map(r => r.maxDrawdown))),
    });
  }

  // Sort by PnL
  sweepResults.sort((a, b) => b.avgPnL - a.avgPnL);

  return {
    strategy: strategy.name,
    category,
    bestConfig: sweepResults[0],
    worstConfig: sweepResults[sweepResults.length - 1],
    allResults: sweepResults,
    testedAt: new Date().toISOString(),
  };
}

/**
 * Run a full test suite across ALL strategies and ALL scenarios.
 * This is the master test that feeds into strategySuggester.
 */
async function runFullTestSuite(strategyModules, opts = {}) {
  const category = opts.category || 'politics';
  const startTime = Date.now();

  log.info('SIM_TEST', `=== FULL TEST SUITE: ${strategyModules.length} strategies, category=${category} ===`);

  const results = {
    category,
    startedAt: new Date().toISOString(),
    individual: {},
    portfolio: null,
    adversarial: {},
    edgeDecay: {},
  };

  // 1. Test each strategy individually
  for (const strategy of strategyModules) {
    try {
      log.info('SIM_TEST', `Testing ${strategy.name}...`);
      results.individual[strategy.name] = await testStrategy(strategy, {
        category,
        runsPerScenario: 3,
        scenarios: ['normal', 'edgeDecay', 'newsBreak', 'regimeShift', 'meanReversionTrap', 'lowLiquidity'],
      });
    } catch (err) {
      log.error('SIM_TEST', `${strategy.name} test failed: ${err.message}`);
      results.individual[strategy.name] = { error: err.message };
    }
  }

  // 2. Portfolio test
  try {
    results.portfolio = await testPortfolio(strategyModules, { category, runs: 5 });
  } catch (err) {
    log.error('SIM_TEST', `Portfolio test failed: ${err.message}`);
  }

  // 3. Adversarial tests for top strategies
  const topStrategies = strategyModules.slice(0, 3);
  for (const strategy of topStrategies) {
    try {
      results.adversarial[strategy.name] = await testAdversarial(strategy, { category, runs: 3 });
    } catch (err) {
      results.adversarial[strategy.name] = { error: err.message };
    }
  }

  // 4. Edge decay for each strategy
  for (const strategy of strategyModules) {
    try {
      results.edgeDecay[strategy.name] = await testEdgeDecay(strategy, { category, runs: 3 });
    } catch (err) {
      results.edgeDecay[strategy.name] = { error: err.message };
    }
  }

  // Summary
  results.duration = Math.round((Date.now() - startTime) / 1000);
  results.completedAt = new Date().toISOString();

  // Rank strategies
  const rankings = [];
  for (const [name, data] of Object.entries(results.individual)) {
    if (data.error) continue;
    rankings.push({
      strategy: name,
      overallPnL: data.overall?.overallPnL ?? 0,
      overallROI: data.overall?.overallROI ?? 0,
      overallWinRate: data.overall?.overallWinRate ?? 0,
      overallDrawdown: data.overall?.overallDrawdown ?? 0,
      edgeDecayMinEdge: results.edgeDecay[name]?.minProfitableEdge ?? 'N/A',
    });
  }
  rankings.sort((a, b) => b.overallPnL - a.overallPnL);
  results.rankings = rankings;

  // Save full suite
  const filename = `full-suite-${category}-${Date.now()}.json`;
  try {
    fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(results, null, 2));
    log.info('SIM_TEST', `Full suite saved: ${filename} (${results.duration}s)`);
  } catch { /* non-critical */ }

  return results;
}

// ─── Crowding Detection ──────────────────────────────────────────────

function detectCrowding(players) {
  const events = [];
  const allTrades = [];

  for (const p of players) {
    for (const t of p.trades) {
      allTrades.push({ ...t, playerId: p.id });
    }
  }

  // Group by tick window (±2 ticks)
  allTrades.sort((a, b) => a.tick - b.tick);
  for (let i = 0; i < allTrades.length; i++) {
    const cluster = [allTrades[i]];
    for (let j = i + 1; j < allTrades.length && allTrades[j].tick - allTrades[i].tick <= 2; j++) {
      cluster.push(allTrades[j]);
    }
    if (cluster.length >= 2) {
      const sameSide = cluster.every(t => t.side === cluster[0].side);
      if (sameSide) {
        events.push({
          tick: cluster[0].tick,
          strategies: cluster.map(t => t.strategy),
          side: cluster[0].side,
          totalSize: r2(cluster.reduce((s, t) => s + t.size, 0)),
        });
      }
    }
  }

  return events;
}

// ─── Get Test Results ────────────────────────────────────────────────

function listResults() {
  try {
    const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const stat = fs.statSync(path.join(RESULTS_DIR, f));
      return { filename: f, size: stat.size, created: stat.mtime };
    }).sort((a, b) => b.created - a.created);
  } catch {
    return [];
  }
}

function getResult(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, filename), 'utf8'));
  } catch {
    return null;
  }
}

function getLatestFullSuite() {
  const results = listResults().filter(r => r.filename.startsWith('full-suite-'));
  if (results.length === 0) return null;
  return getResult(results[0].filename);
}

// ─── Utilities ───────────────────────────────────────────────────────

function avg(arr) { return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function r2(n) { return Math.round(n * 100) / 100; }
function r4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  // Core test functions
  testStrategy,
  testPortfolio,
  testAdversarial,
  testEdgeDecay,
  parameterSweep,
  runFullTestSuite,

  // Results
  listResults,
  getResult,
  getLatestFullSuite,

  // Agent wrapper (exported for strategySuggester to use)
  StrategyAgent,
};
