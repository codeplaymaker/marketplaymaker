/**
 * MiroFish Parameter Applicator
 *
 * Reads evolved strategy parameters from disk and applies them as overrides
 * to live strategy configs. Conservative approach — only applies at startup
 * (or on explicit reload), with minimum fitness thresholds and logging.
 *
 * Flow: Evolution saves results → Server restarts → Applicator reads latest
 * → Compares fitness vs threshold → Overrides strategy CONF objects → Logs
 *
 * Config toggle: config.mirofish.strategyLab.autoApplyEvolved (default: true)
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const EVOLUTION_DIR = path.join(__dirname, '../logs/mirofish-evolution');
const APPLIED_LOG = path.join(__dirname, '../logs/mirofish-applied-params.json');

// Minimum fitness score to consider applying (prevents applying bad genomes)
const MIN_FITNESS_THRESHOLD = 10;

// ─── Mapping: Genome param names → Strategy config keys ─────────────
// Each strategy has a map from evolved param names to the config key they override
const PARAM_MAP = {
  MOMENTUM: {
    // Genome param → config key
    fastPeriod:          'fastEmaPeriod',
    slowPeriod:          'slowEmaPeriod',
    minMomentum:         'minMomentumThreshold',
    spreadFilter:        'spreadFilter',
    volumeConfirmation:  'requireVolumeConfirmation',
    kellyFraction:       'kellyFraction',
    maxExposure:         'maxExposurePct',
    cooldownTicks:       'cooldownTicks',
  },
  PROVEN_EDGE: {
    minEdge:             'minDivergence',
    minBookmakers:       'minBookmakers',
    kellyFraction:       'kellyFraction',
    maxExposure:         'maxExposurePct',
    liquidityFilter:     'minLiquidity',
    cooldownTicks:       'cooldownTicks',
  },
  NO_BETS: {
    minNoPrice:          'minNoPrice',
    maxSpread:           'maxSpread',
    kellyFraction:       'kellyFraction',
    maxExposure:         'maxExposure',
    minLiquidity:        'minLiquidity',
  },
  SPORTS_EDGE: {
    minDeviation:        'minPriceMove',
    lookback:            'meanReversionWindow',
    kellyFraction:       'kellyFraction',
    maxExposure:         'maxExposure',
    spreadFilter:        'spreadFilter',
  },
  CONTRARIAN: {
    extremeThreshold:    'extremeThreshold',
    minMomentumFade:     'minMomentumFade',
    kellyFraction:       'kellyFraction',
    maxExposure:         'maxExposurePct',
    cooldownTicks:       'cooldownTicks',
  },
};

// ─── Read latest evolution result for a strategy ────────────────────
function getLatestEvolved(strategyName) {
  try {
    if (!fs.existsSync(EVOLUTION_DIR)) return null;
    const files = fs.readdirSync(EVOLUTION_DIR)
      .filter(f => f.startsWith(`evolution-${strategyName}-`) && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return JSON.parse(fs.readFileSync(path.join(EVOLUTION_DIR, files[0]), 'utf8'));
  } catch {
    return null;
  }
}

// ─── Apply evolved params to a strategy's config object ─────────────
function applyToConfig(strategyName, configObj) {
  const evolution = getLatestEvolved(strategyName);
  if (!evolution?.bestGenome) return { applied: false, reason: 'no evolution results' };

  const genome = evolution.bestGenome;
  if (genome.fitness < MIN_FITNESS_THRESHOLD) {
    return { applied: false, reason: `fitness ${genome.fitness.toFixed(1)} below threshold ${MIN_FITNESS_THRESHOLD}` };
  }

  const map = PARAM_MAP[strategyName];
  if (!map) return { applied: false, reason: 'no param map defined' };

  const overrides = {};
  const params = genome.params || {};

  for (const [genomeName, configKey] of Object.entries(map)) {
    if (params[genomeName] !== undefined) {
      const oldVal = configObj[configKey];
      const newVal = params[genomeName];

      // Only override if the value actually differs
      if (oldVal !== newVal) {
        configObj[configKey] = newVal;
        overrides[configKey] = { old: oldVal, new: newVal, genomeParam: genomeName };
      }
    }
  }

  const result = {
    applied: Object.keys(overrides).length > 0,
    strategy: strategyName,
    fitness: genome.fitness,
    generation: genome.generation,
    genomeId: genome.id,
    overrides,
    overrideCount: Object.keys(overrides).length,
    appliedAt: new Date().toISOString(),
  };

  if (result.applied) {
    log.info('PARAM_APPLY', `${strategyName}: Applied ${result.overrideCount} evolved params (fitness ${genome.fitness.toFixed(1)}, gen ${genome.generation})`);
    for (const [key, change] of Object.entries(overrides)) {
      log.info('PARAM_APPLY', `  ${key}: ${change.old} → ${change.new}`);
    }
  }

  return result;
}

// ─── Apply all evolved params at startup ────────────────────────────
function applyAll(config) {
  const results = [];
  const strategyConfigs = {};

  // NO_BETS and SPORTS_EDGE — reset mapped keys to defaults before applying
  // (preserves non-evolved keys like 'enabled', 'minEdgeAfterFees' etc.)
  const noBetsDefaults = {
    minNoPrice: 0.85, maxExposure: 0.025, minLiquidity: 2000,
    maxSpread: 0.08, kellyFraction: 0.25,
  };
  const sportsEdgeDefaults = {
    maxExposure: 0.025, minPriceMove: 0.03, meanReversionWindow: 20,
  };
  if (config.strategies?.noBets) {
    // Delete any evolved-only keys that weren't in original config
    const noBetsMap = PARAM_MAP.NO_BETS || {};
    Object.values(noBetsMap).forEach(k => { delete config.strategies.noBets[k]; });
    Object.assign(config.strategies.noBets, noBetsDefaults);
    strategyConfigs.NO_BETS = config.strategies.noBets;
  }
  if (config.strategies?.sportsEdge) {
    const seMap = PARAM_MAP.SPORTS_EDGE || {};
    Object.values(seMap).forEach(k => { delete config.strategies.sportsEdge[k]; });
    Object.assign(config.strategies.sportsEdge, sportsEdgeDefaults);
    strategyConfigs.SPORTS_EDGE = config.strategies.sportsEdge;
  }

  // Always reset to defaults before applying evolved params.
  // This ensures re-apply works correctly (otherwise evolved values
  // already in config would compare equal → 0 overrides detected).
  config.strategies.momentum = {
    fastEmaPeriod: 5,
    slowEmaPeriod: 15,
    minMomentumThreshold: 25,
    spreadFilter: 0.08,
    requireVolumeConfirmation: false,
    kellyFraction: 0.15,
    maxExposurePct: 0.025,
    cooldownTicks: 0,
  };
  strategyConfigs.MOMENTUM = config.strategies.momentum;

  config.strategies.provenEdge = {
    minDivergence: 0.05,
    minBookmakers: 6,
    kellyFraction: 0.25,
    maxExposurePct: 0.03,
    minLiquidity: 2000,
    cooldownTicks: 0,
  };
  strategyConfigs.PROVEN_EDGE = config.strategies.provenEdge;

  config.strategies.contrarian = {
    extremeThreshold: 0.15,
    minMomentumFade: 0.03,
    kellyFraction: 0.20,
    maxExposurePct: 0.025,
    cooldownTicks: 5,
  };
  strategyConfigs.CONTRARIAN = config.strategies.contrarian;

  // Apply evolved params to each strategy's config
  for (const [name, conf] of Object.entries(strategyConfigs)) {
    const result = applyToConfig(name, conf);
    results.push(result);
  }

  // Save application log
  try {
    fs.writeFileSync(APPLIED_LOG, JSON.stringify({
      appliedAt: new Date().toISOString(),
      results,
      totalApplied: results.filter(r => r.applied).length,
      totalStrategies: results.length,
    }, null, 2));
  } catch { /* non-critical */ }

  const appliedCount = results.filter(r => r.applied).length;
  if (appliedCount > 0) {
    log.info('PARAM_APPLY', `Startup: Applied evolved params to ${appliedCount}/${results.length} strategies`);
  } else {
    log.info('PARAM_APPLY', 'Startup: No evolved param overrides applied');
  }

  return results;
}

// ─── Get current application status ─────────────────────────────────
function getStatus() {
  try {
    if (fs.existsSync(APPLIED_LOG)) {
      return JSON.parse(fs.readFileSync(APPLIED_LOG, 'utf8'));
    }
  } catch { /* fresh */ }
  return { appliedAt: null, results: [], totalApplied: 0 };
}

// ─── Reload and re-apply (call from route) ──────────────────────────
function reapply(config) {
  log.info('PARAM_APPLY', 'Re-applying evolved parameters...');
  return applyAll(config);
}

module.exports = {
  applyAll,
  applyToConfig,
  reapply,
  getStatus,
  getLatestEvolved,
  PARAM_MAP,
  MIN_FITNESS_THRESHOLD,
};
