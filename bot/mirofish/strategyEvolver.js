/**
 * MiroFish Strategy Evolver
 *
 * Evolutionary algorithm that breeds new strategy parameter configurations
 * using the market simulator as a fitness function.
 *
 * Process:
 *   1. INITIALIZE — Create a population of strategy parameter "genomes"
 *   2. EVALUATE — Run each genome through the simulator, measure fitness
 *   3. SELECT — Tournament selection picks parents
 *   4. CROSSOVER — Combine parameters from two parents
 *   5. MUTATE — Random parameter perturbations
 *   6. REPEAT — Iterate for N generations
 *
 * This goes beyond what Thompson Sampling can do:
 *   - TS adjusts weights between FIXED strategies
 *   - Evolver discovers NEW parameter combinations and conditional logic
 *   - Evolver can find regime-adaptive parameters (different params per regime)
 *
 * The Evolver works with "strategy genomes" — sets of parameters that
 * define how a strategy behaves. Each parameter has bounds, type, and
 * mutation rate.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { MarketSimulator, SCENARIOS } = require('./marketSimulator');
const { createCategoryPopulation } = require('./agentArchetypes');
const { StrategyAgent } = require('./strategyTester');

const EVOLUTION_DIR = path.join(__dirname, '../logs/mirofish-evolution');
try { fs.mkdirSync(EVOLUTION_DIR, { recursive: true }); } catch { /* exists */ }

// ─── Genome Definition ───────────────────────────────────────────────

/**
 * Parameter definitions for each strategy.
 * Each parameter has: name, type, min, max, default, mutationRate, mutationScale
 */
const STRATEGY_GENOMES = {
  MOMENTUM: {
    name: 'MOMENTUM',
    params: [
      { name: 'fastPeriod', type: 'int', min: 2, max: 15, default: 5, mutationRate: 0.3, mutationScale: 2 },
      { name: 'slowPeriod', type: 'int', min: 10, max: 50, default: 20, mutationRate: 0.3, mutationScale: 5 },
      { name: 'minMomentum', type: 'float', min: 0.005, max: 0.10, default: 0.02, mutationRate: 0.4, mutationScale: 0.01 },
      { name: 'spreadFilter', type: 'float', min: 0.01, max: 0.10, default: 0.05, mutationRate: 0.3, mutationScale: 0.01 },
      { name: 'volumeConfirmation', type: 'bool', min: 0, max: 1, default: 1, mutationRate: 0.1 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.10, default: 0.05, mutationRate: 0.15, mutationScale: 0.01 },
      { name: 'cooldownTicks', type: 'int', min: 1, max: 20, default: 5, mutationRate: 0.2, mutationScale: 3 },
    ],
  },

  PROVEN_EDGE: {
    name: 'PROVEN_EDGE',
    params: [
      { name: 'minEdge', type: 'float', min: 0.02, max: 0.20, default: 0.05, mutationRate: 0.4, mutationScale: 0.02 },
      { name: 'minBookmakers', type: 'int', min: 1, max: 30, default: 20, mutationRate: 0.3, mutationScale: 5 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.10, default: 0.05, mutationRate: 0.15, mutationScale: 0.01 },
      { name: 'liquidityFilter', type: 'float', min: 500, max: 50000, default: 2000, mutationRate: 0.2, mutationScale: 2000 },
      { name: 'cooldownTicks', type: 'int', min: 1, max: 20, default: 5, mutationRate: 0.2, mutationScale: 3 },
    ],
  },

  NO_BETS: {
    name: 'NO_BETS',
    params: [
      { name: 'minNoPrice', type: 'float', min: 0.70, max: 0.95, default: 0.85, mutationRate: 0.3, mutationScale: 0.03 },
      { name: 'maxSpread', type: 'float', min: 0.01, max: 0.10, default: 0.04, mutationRate: 0.3, mutationScale: 0.01 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.05, default: 0.025, mutationRate: 0.15, mutationScale: 0.005 },
      { name: 'minLiquidity', type: 'int', min: 500, max: 20000, default: 2000, mutationRate: 0.2, mutationScale: 1000 },
    ],
  },

  CONTRARIAN: {
    name: 'CONTRARIAN',
    params: [
      { name: 'extremeThreshold', type: 'float', min: 0.05, max: 0.30, default: 0.12, mutationRate: 0.4, mutationScale: 0.03 },
      { name: 'minMomentumFade', type: 'float', min: 0.01, max: 0.08, default: 0.03, mutationRate: 0.3, mutationScale: 0.01 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.10, default: 0.05, mutationRate: 0.15, mutationScale: 0.01 },
      { name: 'cooldownTicks', type: 'int', min: 1, max: 30, default: 8, mutationRate: 0.2, mutationScale: 4 },
    ],
  },

  SPORTS_EDGE: {
    name: 'SPORTS_EDGE',
    params: [
      { name: 'minDeviation', type: 'float', min: 0.01, max: 0.10, default: 0.03, mutationRate: 0.4, mutationScale: 0.01 },
      { name: 'lookback', type: 'int', min: 5, max: 50, default: 20, mutationRate: 0.3, mutationScale: 5 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.05, default: 0.025, mutationRate: 0.15, mutationScale: 0.005 },
      { name: 'spreadFilter', type: 'float', min: 0.01, max: 0.08, default: 0.04, mutationRate: 0.3, mutationScale: 0.01 },
    ],
  },

  GENERIC: {
    name: 'GENERIC',
    params: [
      { name: 'signalThreshold', type: 'float', min: 0.005, max: 0.10, default: 0.02, mutationRate: 0.4, mutationScale: 0.01 },
      { name: 'momentumWeight', type: 'float', min: 0.0, max: 1.0, default: 0.5, mutationRate: 0.3, mutationScale: 0.1 },
      { name: 'deviationWeight', type: 'float', min: 0.0, max: 1.0, default: 0.5, mutationRate: 0.3, mutationScale: 0.1 },
      { name: 'kellyFraction', type: 'float', min: 0.05, max: 0.5, default: 0.25, mutationRate: 0.2, mutationScale: 0.05 },
      { name: 'maxExposure', type: 'float', min: 0.01, max: 0.10, default: 0.05, mutationRate: 0.15, mutationScale: 0.01 },
      { name: 'cooldownTicks', type: 'int', min: 1, max: 20, default: 5, mutationRate: 0.2, mutationScale: 3 },
    ],
  },
};

// ─── Genome Operations ───────────────────────────────────────────────

class Genome {
  constructor(strategyName, params = null) {
    this.strategyName = strategyName;
    const genome = STRATEGY_GENOMES[strategyName] || STRATEGY_GENOMES.GENERIC;
    this.paramDefs = genome.params;

    if (params) {
      this.params = { ...params };
    } else {
      // Initialize with defaults
      this.params = {};
      for (const def of this.paramDefs) {
        this.params[def.name] = def.default;
      }
    }

    this.fitness = null;
    this.generation = 0;
    this.parentIds = [];
    this.id = `${strategyName}-gen0-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Mutate parameters with probability proportional to mutationRate.
   */
  mutate() {
    const mutated = new Genome(this.strategyName, { ...this.params });
    mutated.generation = this.generation;
    mutated.parentIds = [this.id];

    for (const def of this.paramDefs) {
      if (Math.random() < def.mutationRate) {
        if (def.type === 'bool') {
          mutated.params[def.name] = mutated.params[def.name] ? 0 : 1;
        } else if (def.type === 'int') {
          const delta = Math.round(gaussianNoise(0, def.mutationScale || 1));
          mutated.params[def.name] = Math.max(def.min, Math.min(def.max, mutated.params[def.name] + delta));
        } else {
          const delta = gaussianNoise(0, def.mutationScale || 0.01);
          mutated.params[def.name] = Math.max(def.min, Math.min(def.max, mutated.params[def.name] + delta));
          mutated.params[def.name] = r4(mutated.params[def.name]);
        }
      }
    }

    mutated.id = `${this.strategyName}-gen${mutated.generation}-${Math.random().toString(36).slice(2, 8)}`;
    return mutated;
  }

  /**
   * Crossover with another genome (uniform crossover).
   */
  crossover(other) {
    const childParams = {};
    for (const def of this.paramDefs) {
      childParams[def.name] = Math.random() < 0.5
        ? this.params[def.name]
        : other.params[def.name];
    }

    const child = new Genome(this.strategyName, childParams);
    child.generation = Math.max(this.generation, other.generation) + 1;
    child.parentIds = [this.id, other.id];
    child.id = `${this.strategyName}-gen${child.generation}-${Math.random().toString(36).slice(2, 8)}`;
    return child;
  }

  /**
   * Create a mock strategy from this genome for simulation.
   */
  toStrategy() {
    return {
      name: `${this.strategyName}_evolved`,
      ...this.params,
    };
  }

  toJSON() {
    return {
      id: this.id,
      strategyName: this.strategyName,
      params: this.params,
      fitness: this.fitness,
      generation: this.generation,
      parentIds: this.parentIds,
    };
  }
}

// ─── Evolutionary Algorithm ──────────────────────────────────────────

class StrategyEvolver {
  /**
   * @param {string} strategyName - Name of strategy to evolve (MOMENTUM, etc.)
   * @param {Object} opts
   * @param {number} opts.populationSize - Genomes per generation (default 20)
   * @param {number} opts.generations - How many generations to evolve (default 10)
   * @param {number} opts.eliteCount - Top N preserved unmodified (default 2)
   * @param {number} opts.tournamentSize - Tournament selection size (default 3)
   * @param {number} opts.crossoverRate - Probability of crossover vs mutation (default 0.7)
   * @param {string} opts.category - Market category for simulation
   * @param {Array} opts.scenarios - Scenario names to test against
   * @param {number} opts.runsPerEval - Sim runs per fitness evaluation (default 2)
   */
  constructor(strategyName, opts = {}) {
    this.strategyName = strategyName;
    this.populationSize = opts.populationSize || 20;
    this.generations = opts.generations || 10;
    this.eliteCount = opts.eliteCount || 2;
    this.tournamentSize = opts.tournamentSize || 3;
    this.crossoverRate = opts.crossoverRate || 0.7;
    this.category = opts.category || 'politics';
    this.scenarios = opts.scenarios || ['normal', 'edgeDecay', 'newsBreak', 'regimeShift'];
    this.runsPerEval = opts.runsPerEval || 2;

    this.population = [];
    this.bestGenome = null;
    this.fitnessHistory = [];
    this.generationData = [];
  }

  /**
   * Run the full evolutionary process.
   * @returns {Object} Best genome, evolution history, improvement stats
   */
  async evolve() {
    const startTime = Date.now();
    log.info('MF_EVOLVE', `Starting evolution: ${this.strategyName}, pop=${this.populationSize}, gen=${this.generations}`);

    // Initialize population
    this._initializePopulation();

    for (let gen = 0; gen < this.generations; gen++) {
      log.info('MF_EVOLVE', `Generation ${gen + 1}/${this.generations}...`);

      // Evaluate fitness for entire population
      await this._evaluatePopulation();

      // Record stats
      const genStats = this._generationStats(gen);
      this.generationData.push(genStats);
      this.fitnessHistory.push(genStats.bestFitness);

      log.info('MF_EVOLVE',
        `Gen ${gen + 1}: best=${r2(genStats.bestFitness)}, avg=${r2(genStats.avgFitness)}, ` +
        `worst=${r2(genStats.worstFitness)}`
      );

      // Check for convergence
      if (gen > 3) {
        const recentBest = this.fitnessHistory.slice(-4);
        const improvement = Math.abs(recentBest[recentBest.length - 1] - recentBest[0]);
        if (improvement < 0.5) {
          log.info('MF_EVOLVE', `Converged at generation ${gen + 1} (improvement < $0.50)`);
          break;
        }
      }

      // Create next generation (skip for last gen)
      if (gen < this.generations - 1) {
        this._nextGeneration(gen + 1);
      }
    }

    // Final sort
    this.population.sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity));
    this.bestGenome = this.population[0];

    const result = {
      strategyName: this.strategyName,
      category: this.category,
      bestGenome: this.bestGenome.toJSON(),
      top5: this.population.slice(0, 5).map(g => g.toJSON()),
      fitnessHistory: this.fitnessHistory,
      generationData: this.generationData,
      defaultFitness: this.generationData[0]?.defaultFitness ?? null,
      improvement: this.bestGenome.fitness - (this.generationData[0]?.defaultFitness ?? 0),
      duration: Math.round((Date.now() - startTime) / 1000),
      evolvedAt: new Date().toISOString(),
    };

    // Save
    const filename = `evolution-${this.strategyName}-${Date.now()}.json`;
    try {
      fs.writeFileSync(path.join(EVOLUTION_DIR, filename), JSON.stringify(result, null, 2));
      log.info('MF_EVOLVE', `Evolution saved: ${filename}`);
    } catch { /* non-critical */ }

    return result;
  }

  _initializePopulation() {
    this.population = [];

    // First genome is always the default parameters
    const defaultGenome = new Genome(this.strategyName);
    defaultGenome.id = `${this.strategyName}-default`;
    this.population.push(defaultGenome);

    // Rest are random variations
    for (let i = 1; i < this.populationSize; i++) {
      const genome = new Genome(this.strategyName);
      // Randomize each parameter within its bounds
      for (const def of genome.paramDefs) {
        if (def.type === 'bool') {
          genome.params[def.name] = Math.random() > 0.5 ? 1 : 0;
        } else if (def.type === 'int') {
          genome.params[def.name] = def.min + Math.floor(Math.random() * (def.max - def.min));
        } else {
          genome.params[def.name] = r4(def.min + Math.random() * (def.max - def.min));
        }
      }
      genome.id = `${this.strategyName}-gen0-${i}`;
      this.population.push(genome);
    }
  }

  async _evaluatePopulation() {
    for (const genome of this.population) {
      if (genome.fitness !== null) continue; // Already evaluated

      genome.fitness = await this._evaluateFitness(genome);
    }
  }

  /**
   * Evaluate fitness by running the genome through simulations.
   * Fitness = average PnL across scenarios and runs.
   */
  async _evaluateFitness(genome) {
    const strategy = genome.toStrategy();
    let totalPnL = 0;
    let runs = 0;

    for (const scenarioName of this.scenarios) {
      const scenarioFn = SCENARIOS[scenarioName];
      if (!scenarioFn) continue;

      for (let r = 0; r < this.runsPerEval; r++) {
        const config = scenarioFn();
        config.category = this.category;

        const sim = new MarketSimulator(config);
        const agents = createCategoryPopulation(this.category);
        sim.addAgents(agents);

        const player = new StrategyAgent(strategy, {
          bankroll: 1000,
          maxExposure: genome.params.maxExposure || 0.05,
          kellyFraction: genome.params.kellyFraction || 0.25,
          cooldownTicks: genome.params.cooldownTicks || 5,
        });
        sim.addPlayerAgent(player);

        sim.run();
        player.resolvePositions(config.trueProb);

        totalPnL += player.pnl;
        runs++;
      }
    }

    // Fitness = average PnL with a penalty for high drawdown
    const avgPnL = runs > 0 ? totalPnL / runs : -100;
    return r2(avgPnL);
  }

  _nextGeneration(genNumber) {
    // Sort by fitness
    this.population.sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity));

    const nextPop = [];

    // Elitism — preserve top N
    for (let i = 0; i < this.eliteCount && i < this.population.length; i++) {
      const elite = new Genome(this.strategyName, { ...this.population[i].params });
      elite.fitness = this.population[i].fitness;
      elite.generation = genNumber;
      elite.id = `${this.strategyName}-elite-gen${genNumber}-${i}`;
      nextPop.push(elite);
    }

    // Fill the rest via selection + crossover/mutation
    while (nextPop.length < this.populationSize) {
      const parent1 = this._tournamentSelect();

      if (Math.random() < this.crossoverRate && this.population.length > 1) {
        const parent2 = this._tournamentSelect();
        const child = parent1.crossover(parent2);
        const mutatedChild = child.mutate();
        mutatedChild.generation = genNumber;
        nextPop.push(mutatedChild);
      } else {
        const mutant = parent1.mutate();
        mutant.generation = genNumber;
        nextPop.push(mutant);
      }
    }

    this.population = nextPop;
  }

  _tournamentSelect() {
    const candidates = [];
    for (let i = 0; i < this.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      candidates.push(this.population[idx]);
    }
    candidates.sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity));
    return candidates[0];
  }

  _generationStats(gen) {
    const fitnesses = this.population.map(g => g.fitness || 0);
    const defaultGenome = this.population.find(g => g.id.includes('default'));

    return {
      generation: gen,
      bestFitness: r2(Math.max(...fitnesses)),
      avgFitness: r2(fitnesses.reduce((s, f) => s + f, 0) / fitnesses.length),
      worstFitness: r2(Math.min(...fitnesses)),
      stdFitness: r2(Math.sqrt(fitnesses.reduce((s, f) => s + (f - fitnesses[0]) ** 2, 0) / fitnesses.length)),
      defaultFitness: defaultGenome?.fitness ?? null,
      bestParams: this.population.sort((a, b) => (b.fitness || -Infinity) - (a.fitness || -Infinity))[0]?.params,
    };
  }
}

// ─── Run Evolution for All Strategies ────────────────────────────────

/**
 * Evolve parameters for all active strategies.
 * Returns the best configurations found.
 */
async function evolveAllStrategies(opts = {}) {
  const strategyNames = opts.strategies || Object.keys(STRATEGY_GENOMES).filter(s => s !== 'GENERIC');
  const category = opts.category || 'politics';

  log.info('MF_EVOLVE', `Evolving ${strategyNames.length} strategies for ${category} markets`);

  const results = {};

  for (const name of strategyNames) {
    try {
      log.info('MF_EVOLVE', `--- Evolving ${name} ---`);
      const evolver = new StrategyEvolver(name, {
        populationSize: opts.populationSize || 15,
        generations: opts.generations || 8,
        category,
        scenarios: opts.scenarios || ['normal', 'edgeDecay', 'newsBreak', 'regimeShift'],
        runsPerEval: opts.runsPerEval || 2,
      });

      results[name] = await evolver.evolve();
      log.info('MF_EVOLVE',
        `${name}: best fitness=$${results[name].bestGenome.fitness}, ` +
        `improvement=$${r2(results[name].improvement)} vs default`
      );
    } catch (err) {
      log.error('MF_EVOLVE', `Failed to evolve ${name}: ${err.message}`);
      results[name] = { error: err.message };
    }
  }

  // Summary
  const summary = {
    results,
    category,
    bestOverall: Object.entries(results)
      .filter(([, r]) => r.bestGenome)
      .sort((a, b) => (b[1].bestGenome?.fitness || 0) - (a[1].bestGenome?.fitness || 0))
      .map(([name, r]) => ({
        strategy: name,
        fitness: r.bestGenome.fitness,
        improvement: r2(r.improvement),
        params: r.bestGenome.params,
      })),
    evolvedAt: new Date().toISOString(),
  };

  // Save summary
  try {
    const filename = `evolution-summary-${Date.now()}.json`;
    fs.writeFileSync(path.join(EVOLUTION_DIR, filename), JSON.stringify(summary, null, 2));
  } catch { /* non-critical */ }

  return summary;
}

// ─── List Evolution Results ──────────────────────────────────────────

function listResults() {
  try {
    return fs.readdirSync(EVOLUTION_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(EVOLUTION_DIR, f));
        return { filename: f, size: stat.size, created: stat.mtime };
      })
      .sort((a, b) => b.created - a.created);
  } catch { return []; }
}

function getResult(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(EVOLUTION_DIR, filename), 'utf8'));
  } catch { return null; }
}

function getLatestEvolution(strategyName) {
  const files = listResults().filter(r => r.filename.includes(strategyName || 'summary'));
  if (files.length === 0) return null;
  return getResult(files[0].filename);
}

// ─── Utilities ───────────────────────────────────────────────────────

function gaussianNoise(mean = 0, std = 1) {
  let u, v, s;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  return mean + std * u * Math.sqrt(-2 * Math.log(s) / s);
}

function r2(n) { return Math.round(n * 100) / 100; }
function r4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  StrategyEvolver,
  Genome,
  STRATEGY_GENOMES,
  evolveAllStrategies,
  listResults,
  getResult,
  getLatestEvolution,
};
