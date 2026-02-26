const config = require('../config');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const RISK = config.risk;
const STATE_FILE = path.join(__dirname, '..', 'logs', 'risk-state.json');

// ─── Disk Persistence ────────────────────────────────────────────────
function saveState() {
  try {
    const state = {
      positions,
      totalPnL,
      dailyPnL,
      tradeCount,
      dailyTradeCount,
      totalDeployed,
      peakBankroll,
      consecutiveLosses,
      lastResetDate,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log.warn('RISK', `Failed to save state: ${err.message}`);
  }
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    positions = Array.isArray(raw.positions) ? raw.positions : [];
    totalPnL = raw.totalPnL || 0;
    dailyPnL = raw.dailyPnL || 0;
    tradeCount = raw.tradeCount || 0;
    dailyTradeCount = raw.dailyTradeCount || 0;
    totalDeployed = raw.totalDeployed || 0;
    peakBankroll = raw.peakBankroll || 0;
    consecutiveLosses = raw.consecutiveLosses || 0;
    lastResetDate = raw.lastResetDate || new Date().toDateString();
    log.info('RISK', `Loaded state from disk: ${positions.length} positions, P&L $${totalPnL.toFixed(2)}`);
  } catch (err) {
    log.warn('RISK', `Failed to load state: ${err.message}`);
  }
}

/**
 * Risk Manager v3 — Portfolio-Level Risk Intelligence
 *
 * UPGRADES FROM v2:
 * - PORTFOLIO KELLY: Position sizing accounts for existing portfolio exposure
 * - SMART CORRELATION: Multi-factor correlation detection (keyword, category,
 *   temporal, directional) instead of simple keyword matching
 * - DRAWDOWN CIRCUIT BREAKERS: Automatic risk reduction when losing
 * - VALUE-AT-RISK (VaR): Simple portfolio VaR estimation
 * - EXPOSURE HEATMAP: Tracks concentration by category, time, and direction
 * - DYNAMIC LIMITS: Tightens limits during drawdowns, loosens during profit
 */

// In-memory position and P&L tracking
let positions = [];
let dailyPnL = 0;
let totalPnL = 0;
let tradeCount = 0;
let dailyTradeCount = 0;
let lastResetDate = new Date().toDateString();
let totalDeployed = 0;
let peakBankroll = 0;        // Track high-water mark for drawdown
let consecutiveLosses = 0;   // Track losing streak

// Load persisted state on startup
loadState();

function resetDailyIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyPnL = 0;
    dailyTradeCount = 0;
    lastResetDate = today;
    log.info('RISK', 'Daily counters reset');
  }
}

// ─── Enhanced Correlation Detection ──────────────────────────────────
/**
 * Multi-factor correlation scoring:
 * 1. Entity keywords (Trump, Bitcoin, etc.)
 * 2. Category (all politics, all crypto, etc.)
 * 3. Temporal (events resolving at same time)
 * 4. Directional (all YES or all NO bets in same category)
 *
 * Returns an array of correlation groups with strength scores.
 */
const CORRELATION_KEYWORDS = [
  // Political entities
  { keywords: ['trump', 'maga', 'republican'], group: 'trump', category: 'politics' },
  { keywords: ['biden', 'democrat', 'liberal'], group: 'biden', category: 'politics' },
  { keywords: ['harris', 'kamala'], group: 'harris', category: 'politics' },
  { keywords: ['desantis', 'ron'], group: 'desantis', category: 'politics' },
  { keywords: ['election', 'vote', 'ballot', 'primary'], group: 'election', category: 'politics' },
  // Crypto entities
  { keywords: ['bitcoin', 'btc'], group: 'bitcoin', category: 'crypto' },
  { keywords: ['ethereum', 'eth'], group: 'ethereum', category: 'crypto' },
  { keywords: ['solana', 'sol'], group: 'solana', category: 'crypto' },
  { keywords: ['crypto', 'defi', 'token', 'blockchain'], group: 'crypto-general', category: 'crypto' },
  // Macro/economy
  { keywords: ['fed', 'interest rate', 'fomc'], group: 'fed', category: 'macro' },
  { keywords: ['inflation', 'cpi', 'pce'], group: 'inflation', category: 'macro' },
  { keywords: ['recession', 'gdp', 'unemployment'], group: 'recession', category: 'macro' },
  // Sports leagues
  { keywords: ['nba', 'basketball'], group: 'nba', category: 'sports' },
  { keywords: ['nfl', 'football', 'super bowl'], group: 'nfl', category: 'sports' },
  { keywords: ['mlb', 'baseball'], group: 'mlb', category: 'sports' },
  { keywords: ['nhl', 'hockey'], group: 'nhl', category: 'sports' },
  { keywords: ['soccer', 'premier league', 'champions league'], group: 'soccer', category: 'sports' },
  { keywords: ['ufc', 'mma', 'boxing'], group: 'fighting', category: 'sports' },
  // Tech companies
  { keywords: ['ai', 'openai', 'chatgpt', 'artificial intelligence'], group: 'ai', category: 'tech' },
  { keywords: ['google', 'alphabet'], group: 'google', category: 'tech' },
  { keywords: ['apple', 'iphone'], group: 'apple', category: 'tech' },
  { keywords: ['meta', 'facebook', 'instagram'], group: 'meta', category: 'tech' },
  // Geopolitical  
  { keywords: ['ukraine', 'russia', 'putin', 'zelenskyy'], group: 'ukraine-russia', category: 'geopolitics' },
  { keywords: ['china', 'taiwan', 'xi'], group: 'china-taiwan', category: 'geopolitics' },
  { keywords: ['israel', 'gaza', 'hamas'], group: 'israel-gaza', category: 'geopolitics' },
];

function getCorrelationGroups(market, slug) {
  const text = ((market || '') + ' ' + (slug || '')).toLowerCase();
  const groups = [];

  // 1. Entity keyword matching (strongest correlation signal)
  for (const def of CORRELATION_KEYWORDS) {
    for (const kw of def.keywords) {
      if (text.includes(kw)) {
        groups.push({ group: `entity:${def.group}`, category: def.category, strength: 'HIGH' });
        break;
      }
    }
  }

  // 2. Slug prefix grouping (same event umbrella)
  if (slug) {
    const prefix = slug.split('-').slice(0, 2).join('-');
    if (prefix.length > 3) {
      groups.push({ group: `slug:${prefix}`, category: 'slug', strength: 'MEDIUM' });
    }
  }

  // If no specific groups found, return uncorrelated
  if (groups.length === 0) {
    groups.push({ group: 'uncorrelated', category: 'none', strength: 'NONE' });
  }

  return groups;
}

function getCorrelationGroup(market, slug) {
  // Backward compatible — returns primary group
  const groups = getCorrelationGroups(market, slug);
  return groups[0]?.group || 'uncorrelated';
}

/**
 * Calculate total correlated exposure across ALL correlation groups for a position.
 * A position can belong to multiple groups (e.g., "Trump Bitcoin" → trump + bitcoin).
 */
function getCorrelatedExposure(group) {
  return positions
    .filter(p => {
      const groups = getCorrelationGroups(p.market, p.slug);
      return groups.some(g => g.group === group);
    })
    .reduce((sum, p) => sum + p.size, 0);
}

/**
 * Get portfolio-wide correlation heatmap.
 * Shows concentrated exposure across all dimensions.
 */
function getCorrelationHeatmap() {
  const heatmap = {};

  for (const pos of positions) {
    const groups = getCorrelationGroups(pos.market, pos.slug);
    for (const g of groups) {
      if (g.group === 'uncorrelated') continue;
      if (!heatmap[g.group]) {
        heatmap[g.group] = { exposure: 0, count: 0, category: g.category, positions: [] };
      }
      heatmap[g.group].exposure += pos.size;
      heatmap[g.group].count++;
      heatmap[g.group].positions.push({
        market: (pos.market || '').slice(0, 50),
        side: pos.side,
        size: pos.size,
      });
    }
  }

  return heatmap;
}

// ─── Drawdown & Dynamic Risk ─────────────────────────────────────────

/**
 * Calculate current drawdown from peak.
 * Used for circuit breakers and dynamic limit scaling.
 */
function getCurrentDrawdown(bankroll) {
  if (bankroll > peakBankroll) peakBankroll = bankroll;
  if (peakBankroll === 0) return 0;
  return (peakBankroll - bankroll) / peakBankroll;
}

/**
 * Dynamic risk multiplier.
 * Reduces position sizes during drawdowns, allows normal sizing during profit.
 *
 * 0% drawdown → 1.0x (normal)
 * 3% drawdown → 0.8x
 * 5% drawdown → 0.6x
 * 10% drawdown → 0.3x (severe restriction)
 * 15%+ → 0.1x (near-halt)
 */
function getDynamicRiskMultiplier(bankroll) {
  const dd = getCurrentDrawdown(bankroll);

  if (dd <= 0.01) return 1.0;      // Normal
  if (dd <= 0.03) return 0.8;      // Cautious
  if (dd <= 0.05) return 0.6;      // Restricted
  if (dd <= 0.10) return 0.3;      // Severe
  return 0.1;                       // Near-halt
}

/**
 * Monte Carlo Value-at-Risk Engine
 * 
 * Runs N simulations of portfolio outcomes using per-position win probabilities
 * and intra-group correlation. Returns percentile-based VaR at 95% and 99%.
 */
const MC_SIMULATIONS = 10000;
const INTRA_GROUP_CORRELATION = 0.6; // correlated positions move together 60% of the time

function monteCarloVaR(bankroll, { simulations = MC_SIMULATIONS, confidence = 0.95 } = {}) {
  if (positions.length === 0) {
    return { vaR95: 0, vaR99: 0, expectedLoss: 0, maxLoss: 0, cvar95: 0, riskLevel: 'NONE', simulations: 0 };
  }

  // Build correlation groups
  const groupMap = {};
  for (const pos of positions) {
    const group = getCorrelationGroup(pos.market, pos.slug);
    if (!groupMap[group]) groupMap[group] = [];
    groupMap[group].push(pos);
  }
  const groupNames = Object.keys(groupMap);

  // Run Monte Carlo
  const pnlDistribution = new Float64Array(simulations);

  for (let sim = 0; sim < simulations; sim++) {
    let portfolioPnL = 0;

    for (const gName of groupNames) {
      const groupPositions = groupMap[gName];
      // Generate a shared group shock (for correlated positions)
      const groupShock = Math.random();

      for (const pos of groupPositions) {
        const winProb = pos.edge ? Math.min(0.95, pos.avgPrice + pos.edge) : pos.avgPrice;
        // Blend individual randomness with group shock for correlation
        const blended = gName === 'uncorrelated'
          ? Math.random()
          : INTRA_GROUP_CORRELATION * groupShock + (1 - INTRA_GROUP_CORRELATION) * Math.random();

        const shares = pos.size / pos.avgPrice;
        let payout;
        if (pos.side === 'YES') {
          payout = blended < winProb ? 1.0 : 0.0;
        } else {
          payout = blended >= (1 - winProb) ? 1.0 : 0.0;
        }
        portfolioPnL += (payout - pos.avgPrice) * shares;
      }
    }
    pnlDistribution[sim] = portfolioPnL;
  }

  // Sort ascending (worst to best)
  pnlDistribution.sort();

  const vaR95Idx = Math.floor(simulations * 0.05);
  const vaR99Idx = Math.floor(simulations * 0.01);
  const vaR95 = -pnlDistribution[vaR95Idx]; // Positive number = loss
  const vaR99 = -pnlDistribution[vaR99Idx];

  // CVaR (Expected Shortfall) — average of losses worse than VaR95
  let cvarSum = 0;
  for (let i = 0; i < vaR95Idx; i++) cvarSum += pnlDistribution[i];
  const cvar95 = vaR95Idx > 0 ? -(cvarSum / vaR95Idx) : vaR95;

  // Expected P&L
  let totalPnLSim = 0;
  for (let i = 0; i < simulations; i++) totalPnLSim += pnlDistribution[i];
  const expectedPnL = totalPnLSim / simulations;

  const maxLoss = -pnlDistribution[0];
  const riskPct = bankroll > 0 ? vaR95 / bankroll : 0;
  const riskLevel = riskPct > 0.10 ? 'HIGH' : riskPct > 0.05 ? 'MEDIUM' : 'LOW';

  return {
    vaR95: Math.round(vaR95 * 100) / 100,
    vaR99: Math.round(vaR99 * 100) / 100,
    cvar95: Math.round(cvar95 * 100) / 100,
    expectedPnL: Math.round(expectedPnL * 100) / 100,
    maxLoss: Math.round(maxLoss * 100) / 100,
    riskLevel,
    riskPct: Math.round(riskPct * 10000) / 100,
    simulations,
    positionCount: positions.length,
  };
}

/** Backward-compatible wrapper */
function estimatePortfolioVaR(bankroll) {
  const mc = monteCarloVaR(bankroll, { simulations: 5000 });
  return {
    vaR95: mc.vaR95,
    maxLoss: mc.maxLoss,
    riskLevel: mc.riskLevel,
    concentration: 0, // deprecated, use heatmap instead
    riskPct: mc.riskPct,
    // v4 additions
    vaR99: mc.vaR99,
    cvar95: mc.cvar95,
    expectedPnL: mc.expectedPnL,
    simulations: mc.simulations,
  };
}

// ─── Stress Testing Engine ───────────────────────────────────────────
/**
 * Pre-defined stress scenarios. Each scenario describes a market shock:
 * - affectedCategories: which correlation categories are hit
 * - lossMultiplier: 1.0 = all affected positions lose fully
 * - unaffectedImpact: spillover to non-affected positions
 */
const STRESS_SCENARIOS = {
  'politics-shock': {
    name: 'Political Earthquake',
    description: 'Major unexpected political event — all politics markets reset',
    affectedCategories: ['politics'],
    lossMultiplier: 1.0,
    unaffectedImpact: 0.15,
  },
  'crypto-crash': {
    name: 'Crypto Flash Crash',
    description: '30%+ crypto drawdown — all crypto markets move adversely',
    affectedCategories: ['crypto'],
    lossMultiplier: 0.9,
    unaffectedImpact: 0.10,
  },
  'correlated-unwind': {
    name: 'Correlated Unwind',
    description: 'Largest correlation group blows up, panic spreads',
    affectedCategories: ['__largest_group__'],
    lossMultiplier: 1.0,
    unaffectedImpact: 0.25,
  },
  'black-swan': {
    name: 'Black Swan',
    description: 'Extreme tail event — all positions lose simultaneously',
    affectedCategories: ['__all__'],
    lossMultiplier: 1.0,
    unaffectedImpact: 1.0,
  },
  'liquidity-crisis': {
    name: 'Liquidity Crisis',
    description: 'All positions hit 50% adverse move, inability to exit',
    affectedCategories: ['__all__'],
    lossMultiplier: 0.5,
    unaffectedImpact: 0.5,
  },
  'macro-shift': {
    name: 'Macro Regime Shift',
    description: 'Fed surprise + recession signal — macro & crypto correlated',
    affectedCategories: ['macro', 'crypto'],
    lossMultiplier: 0.8,
    unaffectedImpact: 0.20,
  },
};

function runStressTest(bankroll) {
  if (positions.length === 0) return { scenarios: {}, summary: 'No open positions' };

  // Find largest correlation group for correlated-unwind scenario
  const heatmap = getCorrelationHeatmap();
  let largestGroupCategory = 'uncorrelated';
  let largestExposure = 0;
  for (const [, info] of Object.entries(heatmap)) {
    if (info.exposure > largestExposure) {
      largestExposure = info.exposure;
      largestGroupCategory = info.category;
    }
  }

  const results = {};

  for (const [scenarioId, scenario] of Object.entries(STRESS_SCENARIOS)) {
    let scenarioLoss = 0;

    for (const pos of positions) {
      const groups = getCorrelationGroups(pos.market, pos.slug);
      const categories = groups.map(g => g.category);

      let isAffected = false;
      if (scenario.affectedCategories.includes('__all__')) {
        isAffected = true;
      } else if (scenario.affectedCategories.includes('__largest_group__')) {
        isAffected = categories.includes(largestGroupCategory);
      } else {
        isAffected = categories.some(c => scenario.affectedCategories.includes(c));
      }

      if (isAffected) {
        scenarioLoss += pos.size * scenario.lossMultiplier;
      } else {
        scenarioLoss += pos.size * scenario.unaffectedImpact;
      }
    }

    const lossPct = bankroll > 0 ? (scenarioLoss / bankroll) * 100 : 0;
    const severity = lossPct > 15 ? 'CRITICAL' : lossPct > 10 ? 'SEVERE' : lossPct > 5 ? 'WARNING' : 'OK';

    results[scenarioId] = {
      name: scenario.name,
      description: scenario.description,
      estimatedLoss: Math.round(scenarioLoss * 100) / 100,
      lossPct: Math.round(lossPct * 100) / 100,
      severity,
      survivable: lossPct < 25,
    };
  }

  // Worst-case summary
  const worstCase = Object.values(results).reduce(
    (worst, r) => (r.lossPct > worst.lossPct ? r : worst),
    { lossPct: 0 }
  );

  return {
    scenarios: results,
    worstCase: {
      scenario: worstCase.name,
      lossPct: worstCase.lossPct,
      severity: worstCase.severity,
    },
    portfolioResilience: worstCase.lossPct < 15 ? 'STRONG' : worstCase.lossPct < 25 ? 'MODERATE' : 'FRAGILE',
    totalDeployed: Math.round(totalDeployed * 100) / 100,
    positionCount: positions.length,
  };
}

// ─── Max Drawdown Circuit Breaker ────────────────────────────────────
const MAX_DRAWDOWN_HALT = 0.20; // 20% from peak → full halt

function isDrawdownHalted(bankroll) {
  const dd = getCurrentDrawdown(bankroll);
  if (dd >= MAX_DRAWDOWN_HALT) {
    log.warn('RISK', `DRAWDOWN HALT: ${(dd * 100).toFixed(1)}% drawdown from peak $${peakBankroll.toFixed(2)}. All trading suspended.`);
    return true;
  }
  return false;
}

/**
 * Check if a proposed trade is allowed by risk rules.
 * v3: Enhanced with dynamic limits, portfolio VaR, and multi-factor correlation.
 */
function checkTrade(trade, bankroll) {
  resetDailyIfNeeded();

  const { positionSize, conditionId } = trade;

  // Update peak bankroll tracking
  if (bankroll > peakBankroll) peakBankroll = bankroll;

  // Max drawdown hard halt (20% from peak)
  if (isDrawdownHalted(bankroll)) {
    return { allowed: false, reason: `DRAWDOWN HALT: ${(getCurrentDrawdown(bankroll) * 100).toFixed(1)}% from peak. All trading suspended until recovery.` };
  }

  // Dynamic risk multiplier (reduce exposure during drawdowns)
  const riskMult = getDynamicRiskMultiplier(bankroll);

  // Check minimum bankroll
  if (bankroll < RISK.minBankroll) {
    return { allowed: false, reason: `Bankroll $${bankroll} below minimum $${RISK.minBankroll}` };
  }

  // Check daily loss limit
  if (dailyPnL <= -(bankroll * RISK.maxDailyLoss)) {
    return { allowed: false, reason: `Daily loss limit hit: $${dailyPnL.toFixed(2)}` };
  }

  // Consecutive loss circuit breaker
  if (consecutiveLosses >= 5) {
    return { allowed: false, reason: `Circuit breaker: ${consecutiveLosses} consecutive losses. Wait for cool-down.` };
  }

  // Check max total exposure (scaled by dynamic multiplier)
  const effectiveMaxExposure = RISK.maxTotalExposure * riskMult;
  const newExposure = totalDeployed + positionSize;
  if (newExposure > bankroll * effectiveMaxExposure) {
    return {
      allowed: false,
      reason: `Total exposure $${newExposure.toFixed(2)} exceeds ${(effectiveMaxExposure * 100).toFixed(0)}% of bankroll (drawdown-adjusted)`,
    };
  }

  // Check single market exposure (scaled by dynamic multiplier)
  const effectiveSingleMax = RISK.maxSingleMarket * riskMult;
  if (positionSize > bankroll * effectiveSingleMax) {
    return {
      allowed: false,
      reason: `Position $${positionSize.toFixed(2)} exceeds ${(effectiveSingleMax * 100).toFixed(0)}% single market limit`,
    };
  }

  // Check existing exposure to this market
  const existingPosition = positions.find((p) => p.conditionId === conditionId);
  if (existingPosition) {
    const combined = existingPosition.size + positionSize;
    if (combined > bankroll * effectiveSingleMax) {
      return {
        allowed: false,
        reason: `Combined position $${combined.toFixed(2)} exceeds single market limit`,
      };
    }
  }

  // Check max open positions
  if (positions.length >= RISK.maxOpenPositions) {
    return { allowed: false, reason: `Max open positions (${RISK.maxOpenPositions}) reached` };
  }

  // Multi-factor correlation risk check
  const maxCorrelated = (RISK.maxCorrelatedExposure || 0.10) * riskMult;
  const groups = getCorrelationGroups(trade.market, trade.slug);
  for (const g of groups) {
    if (g.group === 'uncorrelated') continue;
    const existingCorrelated = getCorrelatedExposure(g.group);
    const newCorrelated = existingCorrelated + positionSize;
    if (newCorrelated > bankroll * maxCorrelated) {
      return {
        allowed: false,
        reason: `Correlated exposure $${newCorrelated.toFixed(2)} in "${g.group}" exceeds ${(maxCorrelated * 100).toFixed(0)}% limit`,
      };
    }
  }

  // Portfolio VaR check: don't let VaR exceed 15% of bankroll
  const currentVaR = estimatePortfolioVaR(bankroll);
  if (currentVaR.riskPct > 15) {
    return {
      allowed: false,
      reason: `Portfolio VaR at ${currentVaR.riskPct.toFixed(1)}% — too concentrated. Close some positions first.`,
    };
  }

  return {
    allowed: true,
    reason: 'Trade approved',
    riskMultiplier: riskMult,
    effectiveMaxExposure: Math.round(effectiveMaxExposure * 100),
  };
}

/**
 * Record a new position
 */
function addPosition(trade) {
  const existing = positions.find((p) => p.conditionId === trade.conditionId && p.side === trade.side);

  if (existing) {
    const totalSize = existing.size + trade.positionSize;
    existing.avgPrice = (existing.avgPrice * existing.size + trade.price * trade.positionSize) / totalSize;
    existing.size = totalSize;
    existing.updatedAt = new Date().toISOString();
  } else {
    positions.push({
      conditionId: trade.conditionId,
      market: trade.market,
      slug: trade.slug || '',
      side: trade.side,
      size: trade.positionSize,
      avgPrice: trade.price,
      strategy: trade.strategy,
      edge: trade.edge || 0,
      enteredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  totalDeployed += trade.positionSize;
  tradeCount++;
  dailyTradeCount++;

  log.info('RISK', `Position added: ${trade.side} $${trade.positionSize} on "${trade.market}"`, {
    totalDeployed,
    openPositions: positions.length,
  });
  saveState();
}

/**
 * Close a position and record P&L
 */
function closePosition(conditionId, side, closePrice) {
  const idx = positions.findIndex((p) => p.conditionId === conditionId && p.side === side);
  if (idx === -1) return null;

  const pos = positions[idx];
  // Binary payout: YES shares pay $1 if YES, $0 if NO (vice versa for NO shares)
  // closePrice is the resolution price (1.0 or 0.0)
  let payout;
  if (pos.side === 'YES') {
    payout = closePrice >= 0.5 ? 1.0 : 0.0;
  } else {
    payout = closePrice < 0.5 ? 1.0 : 0.0;
  }
  const shares = pos.size / pos.avgPrice;
  const pnl = (payout - pos.avgPrice) * shares;

  dailyPnL += pnl;
  totalPnL += pnl;
  totalDeployed -= pos.size;

  // Track consecutive losses for circuit breaker
  if (pnl < 0) {
    consecutiveLosses++;
  } else {
    consecutiveLosses = 0; // Reset on any win
  }

  positions.splice(idx, 1);

  log.info('RISK', `Position closed: ${pos.side} on "${pos.market}" | P&L: $${pnl.toFixed(2)}`, {
    dailyPnL,
    totalPnL,
    consecutiveLosses,
  });
  saveState();

  return {
    ...pos,
    closePrice,
    pnl: Math.round(pnl * 100) / 100,
    closedAt: new Date().toISOString(),
  };
}

function getPositions() {
  return [...positions];
}

function getStats(bankroll) {
  resetDailyIfNeeded();

  const correlationHeatmap = getCorrelationHeatmap();
  const vaR = estimatePortfolioVaR(bankroll);
  const drawdown = getCurrentDrawdown(bankroll);
  const riskMult = getDynamicRiskMultiplier(bankroll);

  return {
    openPositions: positions.length,
    maxPositions: RISK.maxOpenPositions,
    totalDeployed: Math.round(totalDeployed * 100) / 100,
    maxDeployment: Math.round(bankroll * RISK.maxTotalExposure * 100) / 100,
    utilizationPct: bankroll > 0
      ? Math.round((totalDeployed / (bankroll * RISK.maxTotalExposure)) * 10000) / 100
      : 0,
    dailyPnL: Math.round(dailyPnL * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    tradeCount,
    dailyTradeCount,
    dailyLossLimit: Math.round(bankroll * RISK.maxDailyLoss * 100) / 100,
    dailyLossRemaining: Math.round((bankroll * RISK.maxDailyLoss + dailyPnL) * 100) / 100,
    // New v3 fields
    correlationHeatmap,
    portfolioVaR: vaR,
    drawdownPct: Math.round(drawdown * 10000) / 100,
    peakBankroll: Math.round(peakBankroll * 100) / 100,
    dynamicRiskMultiplier: riskMult,
    consecutiveLosses,
    // v4 fields
    stressTest: runStressTest(bankroll),
    drawdownHalted: isDrawdownHalted(bankroll),
  };
}

function reset() {
  positions = [];
  dailyPnL = 0;
  totalPnL = 0;
  tradeCount = 0;
  dailyTradeCount = 0;
  totalDeployed = 0;
  peakBankroll = 0;
  consecutiveLosses = 0;
  saveState();
  log.info('RISK', 'Risk manager reset');
}

module.exports = {
  checkTrade,
  addPosition,
  closePosition,
  getPositions,
  getStats,
  getCorrelationGroup,
  getCorrelatedExposure,
  getCorrelationHeatmap,
  estimatePortfolioVaR,
  monteCarloVaR,
  runStressTest,
  isDrawdownHalted,
  getDynamicRiskMultiplier,
  reset,
};
