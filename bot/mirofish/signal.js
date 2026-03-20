/**
 * MiroFish Signal Adapter
 *
 * Plugs MiroFish multi-agent simulation into the polybot's
 * independent signals pipeline (independentSignals.js).
 *
 * Like bookmakerSignal.js or cryptoData.js, this module exposes:
 *   - getMiroFishSignal(market) → { prob, confidence, detail, ... }
 *   - getStatus() → { configured, ... }
 *
 * MiroFish is a SLOW but HIGH-ALPHA signal. Simulations take minutes,
 * so results are heavily cached and the bot pre-simulates high-priority
 * markets during scheduled scan windows.
 *
 * Signal weight strategy:
 *   - For politics/geopolitics: HIGH weight (0.35) — MiroFish's sweet spot
 *   - For regulation/economics: MEDIUM weight (0.25)
 *   - For other categories: LOW weight (0.15)
 *   - For sports/crypto: NOT USED (bookmakers/price feeds are better)
 */

const log = require('../utils/logger');
const client = require('./client');
const scenarioBuilder = require('./scenarioBuilder');
const simulationAnalyzer = require('./simulationAnalyzer');

// ─── Configuration ───────────────────────────────────────────────────

const CATEGORY_WEIGHTS = {
  geopolitics: 0.35,
  politics: 0.35,
  regulation: 0.25,
  economics: 0.25,
  tech: 0.20,
  science: 0.20,
  culture: 0.15,
  other: 0.15,
};

// Track simulation scheduling
let simulationQueue = [];     // Markets queued for MiroFish simulation
let isProcessingQueue = false;
let lastBatchTime = 0;
const BATCH_COOLDOWN = 30 * 60 * 1000; // 30 min between batch runs

// ─── Main Signal Interface ───────────────────────────────────────────

/**
 * Get MiroFish probability signal for a market.
 * Returns cached analysis if available, otherwise returns null
 * (simulation is too slow for real-time queries — use scheduleBatch).
 *
 * @param {Object} market - { question, conditionId, yesPrice, category, endDate }
 * @returns {Object|null} { prob, confidence, source, detail, matchQuality, ... }
 */
async function getMiroFishSignal(market) {
  if (!market?.question || !market?.conditionId) return null;

  // Check suitability first
  const assessment = scenarioBuilder.assessSuitability(market);
  if (!assessment.suitable) return null;

  // Check for cached analysis
  const cached = simulationAnalyzer.getCachedAnalysis(market.conditionId);
  if (cached) {
    const weight = CATEGORY_WEIGHTS[assessment.category] || 0.15;
    return formatSignal(cached, market, assessment, weight);
  }

  // Check if MiroFish has a completed simulation
  const simState = client.getSimulationState(market.conditionId);
  if (simState && simState.status === 'completed') {
    try {
      // Fetch and analyze the simulation results
      const analysis = await fetchAndAnalyze(market, simState);
      if (analysis?.prob != null) {
        const weight = CATEGORY_WEIGHTS[assessment.category] || 0.15;
        return formatSignal(analysis, market, assessment, weight);
      }
    } catch (err) {
      log.warn('MF_SIGNAL', `Failed to analyze completed simulation for ${market.conditionId}: ${err.message}`);
    }
  }

  // No cached result — queue for next batch if not already queued
  queueForSimulation(market, assessment);
  return null;
}

/**
 * Fetch simulation results and run analysis.
 */
async function fetchAndAnalyze(market, simState) {
  const [actions, report] = await Promise.allSettled([
    client.getSimulationActions(simState.simulationId),
    simState.reportId ? client.getReport(simState.reportId) : Promise.resolve(null),
  ]);

  const actionsData = actions.status === 'fulfilled' ? actions.value : null;
  const reportData = report.status === 'fulfilled' ? report.value : null;

  if (!actionsData && !reportData) return null;

  // Cache full report and top agent posts on the simulation state
  // so they're available for the detail view without re-fetching
  if (reportData?.content || reportData?.markdown) {
    simState.reportMarkdown = reportData.content || reportData.markdown;
  }
  if (actionsData) {
    // Store a summary of agent posts (top 20 by influence) instead of all
    const posts = (actionsData.actions || actionsData.twitter_actions || actionsData || [])
      .filter(a => a.content || a.text)
      .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
      .slice(0, 20)
      .map(a => ({
        agent: a.agent_name || a.agent_id,
        role: a.agent_name?.replace(/ #\d+$/, '') || 'Agent',
        content: (a.content || a.text || '').slice(0, 300),
        stance: a.stance || null,
        round: a.round || 0,
        followers: a.follower_count || a.followers || 0,
        likes: a.likes || a.like_count || 0,
      }));
    simState.agentPosts = posts;
  }
  client.saveState();

  return simulationAnalyzer.analyzeSimulation({
    conditionId: market.conditionId,
    actions: actionsData,
    report: reportData,
    market,
  });
}

function formatSignal(analysis, market, assessment, weight) {
  return {
    prob: analysis.prob,
    confidence: analysis.confidence,
    source: 'MiroFish Simulation',
    matchQuality: 0.85, // High — we built the scenario specifically for this market
    matchValidated: true,
    detail: analysis.detail,
    simWeight: weight,
    category: assessment.category,
    methodCount: analysis.methodCount,
    probSpread: analysis.probSpread,
    reasoning: analysis.reasoning,
    cached: !!analysis.cached,
  };
}

// ─── Batch Simulation Scheduling ─────────────────────────────────────

/**
 * Queue a market for MiroFish simulation.
 * Simulations run in batch during scheduled scan windows.
 */
function queueForSimulation(market, assessment) {
  // Don't re-queue if already queued or simulated
  if (simulationQueue.find(q => q.conditionId === market.conditionId)) return;
  if (client.getSimulationState(market.conditionId)) return;

  simulationQueue.push({
    conditionId: market.conditionId,
    question: market.question,
    priority: assessment.priority,
    category: assessment.category,
    queuedAt: Date.now(),
  });

  // Keep queue sorted by priority
  simulationQueue.sort((a, b) => b.priority - a.priority);

  // Cap queue size
  if (simulationQueue.length > 20) {
    simulationQueue = simulationQueue.slice(0, 20);
  }
}

/**
 * Process the simulation queue — run top N markets through MiroFish.
 * Called from the server's scan loop.
 *
 * @param {Array} allMarkets - All cached markets (for enrichment)
 * @param {number} maxSimulations - Max simulations to run this batch
 * @returns {Array} Analysis results for completed simulations
 */
async function processSimulationBatch(allMarkets, maxSimulations = 2) {
  if (isProcessingQueue) {
    log.debug('MF_SIGNAL', 'Batch already processing, skipping');
    return [];
  }

  if (Date.now() - lastBatchTime < BATCH_COOLDOWN) {
    log.debug('MF_SIGNAL', 'Batch cooldown active, skipping');
    return [];
  }

  // Check MiroFish availability
  const available = await client.isAvailable();
  if (!available) {
    log.debug('MF_SIGNAL', 'MiroFish not available, skipping batch');
    return [];
  }

  isProcessingQueue = true;
  lastBatchTime = Date.now();
  const results = [];

  try {
    // Get top priority markets from queue
    const toProcess = simulationQueue.slice(0, maxSimulations);

    for (const item of toProcess) {
      try {
        log.info('MF_SIGNAL', `Running MiroFish simulation for: "${item.question.slice(0, 50)}" (${item.category})`);

        // Find the full market object
        const market = allMarkets.find(m => m.conditionId === item.conditionId);
        if (!market) {
          log.warn('MF_SIGNAL', `Market ${item.conditionId} no longer in active markets, skipping`);
          continue;
        }

        // Build scenario
        const scenario = await scenarioBuilder.buildScenario(market);

        // Run full pipeline (pass question for display in UI)
        const simState = await client.runFullPipeline(
          market.conditionId,
          scenario.path,
          scenario.requirement,
          { question: market.question }
        );

        // Fetch and analyze results
        const analysis = await fetchAndAnalyze(market, simState);
        if (analysis?.prob != null) {
          results.push({
            conditionId: market.conditionId,
            question: market.question,
            ...analysis,
          });

          log.info('MF_SIGNAL',
            `MiroFish result for "${market.question.slice(0, 40)}": ` +
            `${(analysis.prob * 100).toFixed(0)}% (${analysis.confidence}, ${analysis.methodCount} methods)`
          );
        }

        // Remove from queue
        simulationQueue = simulationQueue.filter(q => q.conditionId !== item.conditionId);

      } catch (err) {
        log.error('MF_SIGNAL', `Simulation failed for ${item.conditionId}: ${err.message}`);
        // Remove from queue on failure to avoid re-trying immediately
        simulationQueue = simulationQueue.filter(q => q.conditionId !== item.conditionId);
      }
    }

  } finally {
    isProcessingQueue = false;
  }

  return results;
}

/**
 * Pre-assess markets and populate the queue.
 * Called during scan to identify which markets should get MiroFish treatment.
 *
 * @param {Array} markets - All available markets
 * @param {number} maxQueue - Max markets to queue
 */
function assessAndQueue(markets, maxQueue = 10) {
  const ranked = scenarioBuilder.rankMarketsForSimulation(markets, maxQueue);

  for (const { market, assessment } of ranked) {
    queueForSimulation(market, assessment);
  }

  if (ranked.length > 0) {
    log.info('MF_SIGNAL', `Queued ${ranked.length} markets for MiroFish simulation: ${ranked.map(r => r.assessment.category).join(', ')}`);
  }

  return ranked.length;
}

// ─── Status & Monitoring ─────────────────────────────────────────────

function getStatus() {
  const clientStatus = client.getStatus();
  const analyzerStatus = simulationAnalyzer.getStatus();

  return {
    configured: clientStatus.configured,
    available: clientStatus.configured,
    baseUrl: clientStatus.baseUrl,
    queueLength: simulationQueue.length,
    queuedMarkets: simulationQueue.slice(0, 5).map(q => ({
      question: q.question?.slice(0, 50),
      category: q.category,
      priority: q.priority,
    })),
    isProcessing: isProcessingQueue,
    lastBatchTime: lastBatchTime ? new Date(lastBatchTime).toISOString() : null,
    totalSimulations: clientStatus.totalSimulations,
    completedSimulations: clientStatus.completed,
    cachedAnalyses: analyzerStatus.cachedAnalyses,
    categoryWeights: CATEGORY_WEIGHTS,
  };
}

function getQueue() {
  return simulationQueue.map(q => ({
    conditionId: q.conditionId,
    question: q.question,
    priority: q.priority,
    category: q.category,
    queuedAt: new Date(q.queuedAt).toISOString(),
  }));
}

module.exports = {
  getMiroFishSignal,
  processSimulationBatch,
  assessAndQueue,
  getStatus,
  getQueue,
  resetCooldown() { lastBatchTime = 0; },
  // Re-export sub-modules
  client,
  scenarioBuilder,
  simulationAnalyzer,
};
