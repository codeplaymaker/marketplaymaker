/**
 * MiroFish API Routes
 *
 * REST endpoints for MiroFish multi-agent simulation engine.
 * Includes:
 *   - Signal status, queue management, manual simulation triggers
 *   - Strategy testing via agent-based market simulator
 *   - LLM-powered strategy suggestions
 *   - Evolutionary parameter optimization
 */

const { Router } = require('express');

// Lazy-load strategy testing modules (heavy, optional)
let strategyTester = null;
let strategySuggester = null;
let strategyEvolver = null;
try { strategyTester = require('../mirofish/strategyTester'); } catch { /* optional */ }
try { strategySuggester = require('../mirofish/strategySuggester'); } catch { /* optional */ }
try { strategyEvolver = require('../mirofish/strategyEvolver'); } catch { /* optional */ }

module.exports = function createMiroFishRoutes({ miroFishSignal, markets, strategies }) {
  const router = Router();

  // ─── Evolved Param Management (works without MiroFish) ────────────
  let paramApplicator = null;
  try { paramApplicator = require('../mirofish/paramApplicator'); } catch { /* optional */ }

  router.get('/mirofish/params/status', (req, res) => {
    try {
      if (!paramApplicator) return res.json({ available: false });
      const status = paramApplicator.getStatus();
      res.json({ available: true, ...status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/mirofish/params/reapply', (req, res) => {
    try {
      if (!paramApplicator) return res.status(404).json({ error: 'paramApplicator not loaded' });
      const config = require('../config');
      const result = paramApplicator.applyAll(config);
      const count = result.filter(r => r.applied).length;
      res.json({ success: true, appliedCount: count, details: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Pipeline Overview (works with or without MiroFish) ────────────
  router.get('/mirofish/pipeline', async (req, res) => {
    try {
      let status = { configured: false, queueLength: 0, totalSimulations: 0, completedSimulations: 0, categoryWeights: {} };
      let queue = [];
      let enrichedSims = [];
      let assessedMarkets = [];
      let analyzerStatus = { cachedAnalyses: 0 };
      let backendReachable = false;

      if (miroFishSignal) {
        status = miroFishSignal.getStatus();
        try { backendReachable = await miroFishSignal.client.isAvailable(); } catch { backendReachable = false; }
        queue = miroFishSignal.getQueue();
        const sims = miroFishSignal.client.getCachedSimulations();
        analyzerStatus = miroFishSignal.simulationAnalyzer.getStatus();

        const allMkts = markets?.getCachedMarkets() || [];
        const mktMap = new Map(allMkts.map(m => [m.conditionId, m]));

        enrichedSims = sims.map(sim => {
          const analysis = miroFishSignal.simulationAnalyzer.getCachedAnalysis(sim.conditionId);
          const mkt = mktMap.get(sim.conditionId);
          return {
            conditionId: sim.conditionId,
            status: sim.status,
            startedAt: sim.startedAt,
            completedAt: sim.completedAt,
            question: sim.question || mkt?.question || sim.conditionId?.slice(0, 16) + '…',
            yesPrice: mkt?.yesPrice,
            hasAnalysis: !!analysis,
            prob: analysis?.prob,
            confidence: analysis?.confidence,
            methodCount: analysis?.methodCount,
            reasoning: analysis?.reasoning?.slice(0, 200),
            probSpread: analysis?.probSpread,
            detail: analysis?.detail,
          };
        });

        try {
          const allMarkets = markets?.getCachedMarkets() || [];
          const ranked = miroFishSignal.scenarioBuilder.rankMarketsForSimulation(allMarkets, 15);
          assessedMarkets = ranked.map(r => ({
            question: r.market.question?.slice(0, 80),
            conditionId: r.market.conditionId,
            yesPrice: r.market.yesPrice,
            category: r.assessment.category,
            priority: r.assessment.priority,
            suitable: r.assessment.suitable,
            reason: r.assessment.reason,
          }));
        } catch { /* markets may not be loaded */ }
      }

      // Always provide pipeline stage info
      const categoryWeights = status.categoryWeights || {
        geopolitics: 0.35, politics: 0.35, regulation: 0.25,
        economics: 0.25, tech: 0.20, science: 0.20, culture: 0.15, other: 0.15,
      };

      res.json({
        status,
        queue,
        simulations: enrichedSims,
        assessedMarkets,
        analyzerStatus,
        categoryWeights,
        miroFishAvailable: !!miroFishSignal,
        backendReachable,
        backendUrl: miroFishSignal ? (require('../config').mirofish?.url || 'http://localhost:5001') : null,
        pipelineStages: [
          { name: 'Question Intake', desc: 'Market question from Polymarket', count: assessedMarkets.length },
          { name: 'Scenario Builder', desc: 'Builds simulation scenarios with news context', count: assessedMarkets.filter(m => m.suitable).length },
          { name: 'MiroFish Engine', desc: 'Multi-agent knowledge graph simulation', count: enrichedSims.filter(s => s.status === 'completed').length },
          { name: 'Analysis Layer', desc: 'Stance, sentiment, convergence extraction', count: enrichedSims.filter(s => s.hasAnalysis).length },
          { name: 'Signal Output', desc: 'Probability signal → Polybot ensemble', count: enrichedSims.filter(s => s.prob != null).length },
        ],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  if (!miroFishSignal) {
    // MiroFish not loaded — stub routes for signal-specific endpoints only
    router.get('/mirofish/status', (req, res) => {
      res.json({ available: false, reason: 'MiroFish module not loaded. Set MIROFISH_URL env var.' });
    });
    router.post('/mirofish/batch', (req, res) => {
      res.json({ success: false, completed: 0, results: [], reason: 'MiroFish not configured. Set MIROFISH_URL env var.' });
    });
    // NOTE: Strategy lab, params, and pipeline routes are already registered above.
    // Fall through to register strategy lab routes below.
  }

  // ─── MiroFish Signal Routes (require MiroFish to be configured) ──
  if (miroFishSignal) {
    // ─── Status ─────────────────────────────────────────────────────
    router.get('/mirofish/status', (req, res) => {
    try {
      const status = miroFishSignal.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Simulation Queue ───────────────────────────────────────────
  router.get('/mirofish/queue', (req, res) => {
    try {
      const queue = miroFishSignal.getQueue();
      res.json({ queue, count: queue.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Assess Markets for Suitability ─────────────────────────────
  router.get('/mirofish/assess', (req, res) => {
    try {
      const allMarkets = markets?.getCachedMarkets() || [];
      const maxMarkets = parseInt(req.query.limit) || 10;
      const ranked = miroFishSignal.scenarioBuilder.rankMarketsForSimulation(allMarkets, maxMarkets);
      res.json({
        assessed: ranked.map(r => ({
          question: r.market.question,
          conditionId: r.market.conditionId,
          yesPrice: r.market.yesPrice,
          category: r.assessment.category,
          priority: r.assessment.priority,
          reason: r.assessment.reason,
        })),
        count: ranked.length,
        totalMarkets: allMarkets.length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Manual Simulation Trigger ──────────────────────────────────
  router.post('/mirofish/simulate', async (req, res) => {
    try {
      const { conditionId } = req.body;
      if (!conditionId) return res.status(400).json({ error: 'conditionId required' });

      const allMarkets = markets?.getCachedMarkets() || [];
      const market = allMarkets.find(m => m.conditionId === conditionId);
      if (!market) return res.status(404).json({ error: 'Market not found' });

      // Assess suitability
      const assessment = miroFishSignal.scenarioBuilder.assessSuitability(market);

      // Build scenario
      const scenario = await miroFishSignal.scenarioBuilder.buildScenario(market);

      // Run pipeline
      const result = await miroFishSignal.client.runFullPipeline(
        conditionId, scenario.path, scenario.requirement
      );

      res.json({
        success: true,
        conditionId,
        question: market.question,
        assessment,
        simulation: result,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get Cached Analysis ────────────────────────────────────────
  router.get('/mirofish/analysis/:conditionId', (req, res) => {
    try {
      const analysis = miroFishSignal.simulationAnalyzer.getCachedAnalysis(req.params.conditionId);
      if (!analysis) return res.status(404).json({ error: 'No analysis found for this market' });
      res.json(analysis);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // ─── Simulation Detail Report ────────────────────────────────
  router.get('/mirofish/simulation/:conditionId/report', async (req, res) => {
    try {
      const conditionId = req.params.conditionId;
      const simState = miroFishSignal.client.getSimulationState(conditionId);
      if (!simState) return res.status(404).json({ error: 'Simulation not found' });

      const analysis = miroFishSignal.simulationAnalyzer.getCachedAnalysis(conditionId);
      const allMarkets = markets?.getCachedMarkets() || [];
      const market = allMarkets.find(m => m.conditionId === conditionId);

      // Try to get report from cached state first, then from backend
      let reportMarkdown = simState.reportMarkdown || null;
      if (!reportMarkdown && simState.reportId) {
        try {
          const report = await miroFishSignal.client.getReport(simState.reportId);
          reportMarkdown = report?.content || report?.markdown || null;
          if (reportMarkdown) {
            simState.reportMarkdown = reportMarkdown;
            miroFishSignal.client.saveState();
          }
        } catch { /* backend may be down */ }
      }

      // Try to get agent posts from cached state first, then from backend
      let agentPosts = simState.agentPosts || null;
      if (!agentPosts && simState.simulationId) {
        try {
          const actionsData = await miroFishSignal.client.getSimulationActions(simState.simulationId);
          const posts = (actionsData?.actions || actionsData?.twitter_actions || [])
            .filter(a => a.content || a.text)
            .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
            .slice(0, 20)
            .map(a => ({
              agent: a.agent_name || a.agent_id,
              role: a.agent_name?.replace(/ #\d+$/, '') || 'Agent',
              content: (a.content || a.text || '').slice(0, 300),
              stance: a.stance || null,
              round: a.round || 0,
              followers: a.follower_count || 0,
              likes: a.likes || 0,
            }));
          agentPosts = posts;
          simState.agentPosts = posts;
          miroFishSignal.client.saveState();
        } catch { /* backend may be down */ }
      }

      res.json({
        conditionId,
        question: simState.question || market?.question || conditionId,
        status: simState.status,
        startedAt: simState.startedAt,
        completedAt: simState.completedAt,
        yesPrice: market?.yesPrice,
        // Analysis
        prob: analysis?.prob,
        confidence: analysis?.confidence,
        methodCount: analysis?.methodCount,
        probSpread: analysis?.probSpread,
        reasoning: analysis?.reasoning,
        methods: analysis?.methods || [],
        // Report
        reportMarkdown,
        // Agent posts
        agentPosts: agentPosts || [],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // ─── List All Simulations ───────────────────────────────────────
  router.get('/mirofish/simulations', (req, res) => {
    try {
      const sims = miroFishSignal.client.getCachedSimulations();
      res.json({
        simulations: sims,
        count: sims.length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Process Batch (manual trigger) ─────────────────────────────
  router.post('/mirofish/batch', async (req, res) => {
    try {
      const allMarkets = markets?.getCachedMarkets() || [];
      const maxSims = parseInt(req.body.maxSimulations) || 2;

      // Queue markets first
      miroFishSignal.assessAndQueue(allMarkets, 10);

      // Check if MiroFish backend is actually reachable before attempting
      const backendReachable = await miroFishSignal.client.isAvailable();
      if (!backendReachable) {
        const queueLen = miroFishSignal.getQueue().length;
        return res.json({
          success: false,
          completed: 0,
          queued: queueLen,
          results: [],
          reason: `MiroFish backend not reachable. ${queueLen} markets queued and ready — start MiroFish or set MIROFISH_URL to process them.`,
        });
      }

      // Reset cooldown for manual triggers (only auto-scan respects cooldown)
      miroFishSignal.resetCooldown();

      // Run batch
      const results = await miroFishSignal.processSimulationBatch(allMarkets, maxSims);

      res.json({
        success: true,
        completed: results.length,
        results: results.map(r => ({
          conditionId: r.conditionId,
          question: r.question,
          prob: r.prob,
          confidence: r.confidence,
          methodCount: r.methodCount,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── MiroFish Health Check ──────────────────────────────────────
  router.get('/mirofish/health', async (req, res) => {
    try {
      const available = await miroFishSignal.client.isAvailable();
      const status = miroFishSignal.getStatus();
      res.json({
        miroFishAvailable: available,
        ...status,
      });
    } catch (err) {
      res.status(500).json({ error: err.message, available: false });
    }
  });
  } // end if (miroFishSignal)

  // ═══════════════════════════════════════════════════════════════════
  // STRATEGY TESTER — Agent-based market simulation
  // ═══════════════════════════════════════════════════════════════════

  // ─── Test a single strategy across scenarios ────────────────────
  router.post('/mirofish/test/strategy', async (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const { strategyName, category, scenarios, runsPerScenario } = req.body;
      if (!strategyName) return res.status(400).json({ error: 'strategyName required' });

      // Load the strategy module
      const strategyModule = loadStrategy(strategyName, strategies);
      if (!strategyModule) return res.status(404).json({ error: `Strategy ${strategyName} not found` });

      const result = await strategyTester.testStrategy(strategyModule, {
        category: category || 'politics',
        scenarios,
        runsPerScenario: runsPerScenario || 3,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Portfolio test (all strategies simultaneously) ─────────────
  router.post('/mirofish/test/portfolio', async (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const { category, scenario, runs } = req.body;
      const strategyModules = loadAllStrategies(strategies);

      const result = await strategyTester.testPortfolio(strategyModules, {
        category: category || 'politics',
        scenario: scenario || 'normal',
        runs: runs || 5,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Adversarial test ───────────────────────────────────────────
  router.post('/mirofish/test/adversarial', async (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const { strategyName, category, runs } = req.body;
      if (!strategyName) return res.status(400).json({ error: 'strategyName required' });

      const strategyModule = loadStrategy(strategyName, strategies);
      if (!strategyModule) return res.status(404).json({ error: `Strategy ${strategyName} not found` });

      const result = await strategyTester.testAdversarial(strategyModule, {
        category: category || 'politics',
        runs: runs || 5,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Edge decay test ────────────────────────────────────────────
  router.post('/mirofish/test/edge-decay', async (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const { strategyName, category, edgeSizes } = req.body;
      if (!strategyName) return res.status(400).json({ error: 'strategyName required' });

      const strategyModule = loadStrategy(strategyName, strategies);
      if (!strategyModule) return res.status(404).json({ error: `Strategy ${strategyName} not found` });

      const result = await strategyTester.testEdgeDecay(strategyModule, {
        category: category || 'politics',
        edgeSizes,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Full test suite ────────────────────────────────────────────
  router.post('/mirofish/test/full-suite', async (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const { category } = req.body;
      const strategyModules = loadAllStrategies(strategies);

      // Run in background — this takes a while
      res.json({ status: 'started', message: `Running full test suite for ${strategyModules.length} strategies...` });

      strategyTester.runFullTestSuite(strategyModules, { category: category || 'politics' })
        .then(() => { /* results saved to disk */ })
        .catch(err => { console.error('Full suite error:', err.message); });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── List test results ──────────────────────────────────────────
  router.get('/mirofish/test/results', (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const results = strategyTester.listResults();
      res.json({ results, count: results.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get specific test result ───────────────────────────────────
  router.get('/mirofish/test/results/:filename', (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const result = strategyTester.getResult(req.params.filename);
      if (!result) return res.status(404).json({ error: 'Result not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get latest full suite ──────────────────────────────────────
  router.get('/mirofish/test/latest-suite', (req, res) => {
    if (!strategyTester) return res.status(503).json({ error: 'Strategy tester not loaded' });
    try {
      const result = strategyTester.getLatestFullSuite();
      if (!result) return res.status(404).json({ error: 'No full suite results yet. POST /mirofish/test/full-suite to run one.' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // STRATEGY SUGGESTER — LLM-powered improvement recommendations
  // ═══════════════════════════════════════════════════════════════════

  // ─── Generate new suggestions ───────────────────────────────────
  router.post('/mirofish/suggest', async (req, res) => {
    if (!strategySuggester) return res.status(503).json({ error: 'Strategy suggester not loaded' });
    try {
      const { validate } = req.body;

      // Run in background — LLM calls + validation can take minutes
      res.json({ status: 'started', message: 'Generating strategy suggestions via LLM...' });

      strategySuggester.generateSuggestions({ validate: validate !== false })
        .then(() => { /* results saved */ })
        .catch(err => { console.error('Suggestion error:', err.message); });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get latest suggestions ─────────────────────────────────────
  router.get('/mirofish/suggest/latest', (req, res) => {
    if (!strategySuggester) return res.status(503).json({ error: 'Strategy suggester not loaded' });
    try {
      const suggestions = strategySuggester.getLatestSuggestions();
      if (!suggestions) return res.status(404).json({ error: 'No suggestions yet. POST /mirofish/suggest to generate.' });
      res.json(suggestions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── List suggestion history ────────────────────────────────────
  router.get('/mirofish/suggest/history', (req, res) => {
    if (!strategySuggester) return res.status(503).json({ error: 'Strategy suggester not loaded' });
    try {
      res.json({ suggestions: strategySuggester.listSuggestions() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Suggester status ───────────────────────────────────────────
  router.get('/mirofish/suggest/status', (req, res) => {
    if (!strategySuggester) return res.status(503).json({ error: 'Strategy suggester not loaded' });
    try {
      res.json(strategySuggester.getStatus());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // STRATEGY EVOLVER — Evolutionary parameter optimization
  // ═══════════════════════════════════════════════════════════════════

  // ─── Evolve a single strategy ───────────────────────────────────
  router.post('/mirofish/evolve', async (req, res) => {
    if (!strategyEvolver) return res.status(503).json({ error: 'Strategy evolver not loaded' });
    try {
      const { strategyName, category, populationSize, generations } = req.body;
      if (!strategyName) return res.status(400).json({ error: 'strategyName required' });

      // Run in background — evolution takes a while
      res.json({ status: 'started', message: `Evolving ${strategyName} parameters...` });

      const evolver = new strategyEvolver.StrategyEvolver(strategyName, {
        category: category || 'politics',
        populationSize: populationSize || 15,
        generations: generations || 8,
      });

      evolver.evolve()
        .then(() => { /* results saved */ })
        .catch(err => { console.error('Evolution error:', err.message); });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Evolve all strategies ──────────────────────────────────────
  router.post('/mirofish/evolve/all', async (req, res) => {
    if (!strategyEvolver) return res.status(503).json({ error: 'Strategy evolver not loaded' });
    try {
      const { category, populationSize, generations } = req.body;

      res.json({ status: 'started', message: 'Evolving all strategy parameters...' });

      strategyEvolver.evolveAllStrategies({
        category: category || 'politics',
        populationSize: populationSize || 15,
        generations: generations || 8,
      })
        .then(() => { /* results saved */ })
        .catch(err => { console.error('Evolution all error:', err.message); });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get evolution results ──────────────────────────────────────
  router.get('/mirofish/evolve/results', (req, res) => {
    if (!strategyEvolver) return res.status(503).json({ error: 'Strategy evolver not loaded' });
    try {
      const results = strategyEvolver.listResults();
      res.json({ results, count: results.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Get latest evolution for a strategy ────────────────────────
  router.get('/mirofish/evolve/:strategyName', (req, res) => {
    if (!strategyEvolver) return res.status(503).json({ error: 'Strategy evolver not loaded' });
    try {
      const result = strategyEvolver.getLatestEvolution(req.params.strategyName);
      if (!result) return res.status(404).json({ error: `No evolution results for ${req.params.strategyName}` });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Available strategy genomes ─────────────────────────────────
  router.get('/mirofish/evolve/genomes', (req, res) => {
    if (!strategyEvolver) return res.status(503).json({ error: 'Strategy evolver not loaded' });
    try {
      const genomes = {};
      for (const [name, def] of Object.entries(strategyEvolver.STRATEGY_GENOMES)) {
        genomes[name] = {
          params: def.params.map(p => ({
            name: p.name,
            type: p.type,
            min: p.min,
            max: p.max,
            default: p.default,
          })),
        };
      }
      res.json({ genomes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // COMBINED STATUS
  // ═══════════════════════════════════════════════════════════════════

  router.get('/mirofish/lab/status', (req, res) => {
    try {
      res.json({
        simulator: { loaded: !!strategyTester },
        suggester: strategySuggester ? strategySuggester.getStatus() : { loaded: false },
        evolver: { loaded: !!strategyEvolver },
        latestTestSuite: strategyTester?.getLatestFullSuite()?.completedAt || null,
        latestSuggestions: strategySuggester?.getLatestSuggestions()?.generatedAt || null,
        latestEvolution: strategyEvolver?.listResults()?.[0]?.created || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// ─── Strategy Loading Helpers ────────────────────────────────────────

function loadStrategy(name, strategiesFromDeps) {
  // Try to load from deps first
  if (strategiesFromDeps) {
    const found = [
      strategiesFromDeps.provenEdge,
      strategiesFromDeps.arbitrage,
      strategiesFromDeps.noBets,
      strategiesFromDeps.sportsEdge,
    ].find(s => s?.name === name);
    if (found) return found;
  }

  // Try requiring directly
  const nameMap = {
    PROVEN_EDGE: 'provenEdge',
    ARBITRAGE: 'arbitrage',
    NO_BETS: 'noBets',
    SPORTS_EDGE: 'sportsEdge',
    MOMENTUM: 'momentum',
    WHALE_DETECTION: 'whaleDetection',
  };

  const filename = nameMap[name];
  if (!filename) {
    // Create a minimal mock strategy for simulation
    return { name, findOpportunities: async () => [] };
  }

  try {
    return require(`../strategies/${filename}`);
  } catch {
    return { name, findOpportunities: async () => [] };
  }
}

function loadAllStrategies(strategiesFromDeps) {
  const names = ['PROVEN_EDGE', 'ARBITRAGE', 'NO_BETS', 'SPORTS_EDGE', 'MOMENTUM', 'CONTRARIAN'];
  return names.map(n => loadStrategy(n, strategiesFromDeps));
}
