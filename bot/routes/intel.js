const express = require('express');
const path = require('path');
const fs = require('fs');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

/**
 * Intel / Analytics routes — odds, accas, picks, learning, signals,
 * independent analysis, track record, webhooks, news, ws
 *
 * Expected deps:
 *   oddsApi, markets, scanner, signalTracker, alerts, watchlist,
 *   accaBuilder (optional), picksTracker (optional), picksLearner (optional),
 *   paperTrader, independentSignals (optional), edgeResolver (optional),
 *   wsClient (optional), newsSignal (optional),
 *   kalshiMarkets (optional),
 *   scanState: { cachedScanResults, lastScanTime, scanRunning, SCAN_INTERVAL, runAutoScan }
 *   webhooks:  { config, save, fire }
 */
module.exports = function createIntelRoutes(deps) {
  const router = express.Router();
  const {
    oddsApi, markets, scanner, signalTracker, alerts, watchlist,
    accaBuilder, picksTracker, picksLearner,
    paperTrader, independentSignals, edgeResolver,
    wsClient, newsSignal,
    kalshiMarkets,
    scanState, webhooks,
  } = deps;

  // ─── WebSocket Status ──────────────────────────────────────────────
  router.get('/ws/status', (req, res) => {
    if (!wsClient) return res.json({ available: false, reason: 'WebSocket module not loaded' });
    res.json(wsClient.getStatus());
  });

  // ─── News Sentiment ────────────────────────────────────────────────
  router.get('/news/status', (req, res) => {
    if (!newsSignal) return res.json({ available: false, reason: 'News module not loaded' });
    try {
      const status = newsSignal.getStatus ? newsSignal.getStatus() : { available: true };
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/news/key', (req, res) => {
    if (!newsSignal) return res.status(501).json({ error: 'News module not loaded' });
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'API key required' });
    try {
      if (newsSignal.setApiKey) newsSignal.setApiKey(key);
      else process.env.NEWSDATA_API_KEY = key;
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ─── Bookmaker Odds ────────────────────────────────────────────────
  router.post('/odds/key', (req, res) => {
    try {
      const { key } = req.body;
      oddsApi.setApiKey(key);
      res.json({ status: 'ok', ...oddsApi.getStatus() });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/odds/status', (req, res) => {
    res.json(oddsApi.getStatus());
  });

  router.post('/odds/fetch', async (req, res) => {
    try {
      const events = await oddsApi.fetchAllOdds();
      const mktList = markets.getCachedMarkets();
      const matches = oddsApi.matchAllMarkets(mktList);
      const matchArr = Array.from(matches.entries()).map(([condId, data]) => ({ conditionId: condId, ...data }));
      res.json({
        status: 'ok',
        bookmakerEvents: events.length,
        polymarketMatches: matchArr.length,
        matches: matchArr.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence)).slice(0, 20),
        ...oddsApi.getStatus(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/odds/sports', async (req, res) => {
    const sports = await oddsApi.getSports();
    res.json(sports);
  });

  // ─── Accumulator (Parlay) Builder ──────────────────────────────────
  router.post('/accas/build', async (req, res) => {
    if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
    try {
      const { maxLegs, minLegs } = req.body || {};
      accaBuilder.buildAccas(maxLegs || 5, minLegs || 2);
      const result = accaBuilder.getAccas();
      if (picksTracker && result.accas?.length > 0) {
        picksTracker.snapshotAccas(result.accas);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/accas', (req, res) => {
    if (!accaBuilder) return res.json({ accas: [], stats: { total: 0 }, lastBuildTime: null });
    res.json(accaBuilder.getAccas());
  });

  router.get('/accas/top', (req, res) => {
    if (!accaBuilder) return res.json([]);
    const limit = parseInt(req.query.limit) || 10;
    res.json(accaBuilder.getTopAccas(limit));
  });

  router.get('/public/accas', (req, res) => {
    if (!accaBuilder) return res.json({ accas: [], stats: { total: 0 }, lastBuildTime: null });
    const data = accaBuilder.getAccas();
    const publicAccas = (data.accas || []).slice(0, 5).map(a => ({
      grade: a.grade,
      numLegs: a.numLegs,
      combinedOdds: a.combinedOdds,
      evPercent: a.evPercent,
      crossSport: a.crossSport,
      legs: a.legs.map(l => ({
        match: l.match,
        pick: l.pick,
        odds: l.odds,
        sport: l.sport,
        betType: l.betType,
      })),
      hypothetical: a.hypothetical,
      generatedAt: a.generatedAt,
    }));
    res.json({ accas: publicAccas, stats: data.stats, lastBuildTime: data.lastBuildTime });
  });

  router.get('/accas/clv', (req, res) => {
    if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
    try {
      const clv = accaBuilder.analyzeCLV();
      res.json(clv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/accas/movements', (req, res) => {
    if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
    try {
      const data = accaBuilder.getAccas();
      const movements = data.stats?.lineMovements || 0;
      const steamMoves = data.stats?.steamMoves || 0;
      let lineHistory = {};
      try {
        lineHistory = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, 'line-history.json'), 'utf-8'));
      } catch { /* no history yet */ }
      const recentMoves = Object.entries(lineHistory)
        .map(([key, snapshots]) => ({ key, snapshots: snapshots.slice(-5), count: snapshots.length }))
        .filter(m => m.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      res.json({ movements, steamMoves, recentMoves });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Picks Track Record ────────────────────────────────────────────
  router.get('/picks/track-record', (req, res) => {
    if (!picksTracker) return res.json({ summary: { totalPicks: 0 }, recent: [], byGrade: {}, dailyPnl: [] });
    res.json(picksTracker.getTrackRecord());
  });

  router.get('/picks/history', (req, res) => {
    if (!picksTracker) return res.json({ picks: [], total: 0, page: 1, totalPages: 0 });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    res.json(picksTracker.getHistory(page, limit));
  });

  router.post('/picks/resolve', async (req, res) => {
    if (!picksTracker) return res.status(503).json({ error: 'Picks tracker not available' });
    try {
      const apiKey = oddsApi.hasApiKey() ? process.env.ODDS_API_KEY : null;
      const result = await picksTracker.checkAndResolve(apiKey);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/public/picks/track-record', (req, res) => {
    if (!picksTracker) return res.json({ summary: { totalPicks: 0 }, recent: [], byGrade: {}, dailyPnl: [] });
    const record = picksTracker.getTrackRecord();
    record.recent = record.recent.slice(0, 10).map(p => ({
      grade: p.grade, numLegs: p.numLegs, combinedOdds: p.combinedOdds,
      result: p.result, pnl: p.pnl, savedAt: p.savedAt, wonLegs: p.wonLegs,
      legs: p.legs.map(l => ({ match: l.match, pick: l.pick, sport: l.sport, result: l.result, score: l.score })),
    }));
    res.json(record);
  });

  // ─── Picks Learning / Intelligence ────────────────────────────────
  router.get('/picks/learning', (req, res) => {
    if (!picksLearner) return res.json({ learnedAt: null, totalResolved: 0, adjustments: null, insights: ['Learning engine not available'] });
    const report = picksLearner.getLearningReport();
    res.json(report);
  });

  router.post('/picks/learn', (req, res) => {
    if (!picksLearner) return res.status(503).json({ error: 'Learning engine not available' });
    const result = picksLearner.learn();
    if (!result) return res.json({ success: false, message: 'Not enough resolved picks to learn from' });
    res.json({ success: true, totalResolved: result.totalResolved, insights: result.insights });
  });

  router.get('/public/picks/learning', (req, res) => {
    if (!picksLearner) return res.json({ insights: [], adjustments: null });
    const report = picksLearner.getLearningReport();
    res.json({
      totalResolved: report.totalResolved || 0,
      overallWinRate: report.overallWinRate || 0,
      overallROI: report.overallROI || 0,
      insights: report.insights || [],
      learnedAt: report.learnedAt,
    });
  });

  // ─── Self-Learning Dashboard ───────────────────────────────────────
  router.get('/learning/insights', (req, res) => {
    try {
      const insights = paperTrader.getLearningInsights
        ? paperTrader.getLearningInsights()
        : { status: 'Not available' };
      res.json(insights);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/learning/thresholds', (req, res) => {
    try {
      const strategies = ['NO_BETS', 'SPORTS_EDGE', 'ARBITRAGE'];
      const thresholds = {};
      for (const s of strategies) {
        const t = paperTrader.getLearnedThreshold ? paperTrader.getLearnedThreshold(s) : null;
        thresholds[s] = t || { status: 'Insufficient data (need 10+ resolved trades)' };
      }
      res.json(thresholds);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/learning/cycle', (req, res) => {
    try {
      if (!paperTrader.runLearningCycle) {
        return res.status(501).json({ error: 'Learning cycle not available' });
      }
      paperTrader.runLearningCycle();
      const insights = paperTrader.getLearningInsights();
      res.json({ status: 'ok', message: 'Learning cycle executed', insights });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/learning/signals', (req, res) => {
    try {
      const insights = paperTrader.getLearningInsights
        ? paperTrader.getLearningInsights()
        : {};
      res.json({
        signalAccuracy: insights.signalAccuracy || {},
        topSignals: insights.topSignals || [],
        weakSignals: insights.weakSignals || [],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Intelligence: Market Movers ───────────────────────────────────
  router.get('/intel/movers', (req, res) => {
    const currentMarkets = markets.getCachedMarkets();
    const limit = parseInt(req.query.limit) || 10;
    res.json(alerts.getMarketMovers(currentMarkets, limit));
  });

  // ─── Intelligence: Signal Credibility ──────────────────────────────
  router.get('/intel/credibility', (req, res) => {
    res.json(signalTracker.getReport());
  });

  // ─── Intelligence: Cross-Platform Divergences ──────────────────────
  router.get('/intel/divergences', (req, res) => {
    try {
      const mktList = markets.getCachedMarkets();
      const matches = oddsApi.matchAllMarkets(mktList);
      const divergences = Array.from(matches.entries())
        .map(([condId, data]) => ({ conditionId: condId, ...data }))
        .filter(d => Math.abs(d.divergence || 0) >= 0.03)
        .sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

      res.json({
        count: divergences.length,
        divergences,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Intelligence: Market Comparison ───────────────────────────────
  router.get('/intel/compare/:conditionId', (req, res) => {
    try {
      const condId = req.params.conditionId;
      const polyMarket = markets.getCachedMarkets().find(m => m.conditionId === condId);
      const kalshiMkt = kalshiMarkets ? kalshiMarkets.getCachedMarkets().find(m => m.conditionId === condId) : null;
      const bookmaker = oddsApi.matchAllMarkets(markets.getCachedMarkets()).get(condId);
      const signals = scanner.getOpportunities(500).filter(o => o.conditionId === condId);

      const badge = signals.length > 0 ? signalTracker.getBadge(signals[0].strategy, signals[0].score) : null;

      res.json({
        conditionId: condId,
        polymarket: polyMarket || null,
        kalshi: kalshiMkt || null,
        bookmaker: bookmaker || null,
        signals,
        credibilityBadge: badge,
        watched: watchlist.isWatched(condId),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Independent Data Sources ──────────────────────────────────────
  router.get('/intel/independent/status', (req, res) => {
    if (!independentSignals) return res.json({ available: false });
    res.json(independentSignals.getStatus());
  });

  router.post('/intel/independent/llm/configure', (req, res) => {
    if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
    try {
      const { apiKey, provider, model } = req.body;
      if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
      independentSignals.llm.configure({ apiKey, provider, model });
      res.json({ status: 'configured', provider: provider || 'openai', model });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/intel/independent/llm/status', (req, res) => {
    if (!independentSignals) return res.json({ available: false });
    res.json(independentSignals.llm.getStatus());
  });

  router.get('/intel/independent/edges', (req, res) => {
    if (!independentSignals) return res.json({ edges: [], available: false });
    const limit = parseInt(req.query.limit) || 20;
    const minQuality = parseInt(req.query.minQuality) || 0;

    let edges = scanState.cachedScanResults.length > 0
      ? scanState.cachedScanResults.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE')
      : independentSignals.getRecentEdges(limit * 2);

    if (minQuality > 0) {
      edges = edges.filter(e => (e.edgeQuality || 0) >= minQuality);
    }

    res.json({
      edges: edges.slice(0, limit),
      calibration: independentSignals.getCalibrationData(),
      lastScan: scanState.lastScanTime ? scanState.lastScanTime.toISOString() : null,
      nextScan: scanState.lastScanTime ? new Date(scanState.lastScanTime.getTime() + scanState.SCAN_INTERVAL).toISOString() : null,
      scanRunning: scanState.scanRunning,
    });
  });

  router.get('/intel/independent/cached', (req, res) => {
    const minQuality = parseInt(req.query.minQuality) || 0;
    let results = [...scanState.cachedScanResults];
    if (minQuality > 0) {
      results = results.filter(e => (e.edgeQuality || 0) >= minQuality);
    }
    res.json({
      count: results.length,
      results,
      lastScan: scanState.lastScanTime ? scanState.lastScanTime.toISOString() : null,
      nextScan: scanState.lastScanTime ? new Date(scanState.lastScanTime.getTime() + scanState.SCAN_INTERVAL).toISOString() : null,
      scanRunning: scanState.scanRunning,
      totalCached: scanState.cachedScanResults.length,
    });
  });

  router.post('/intel/independent/scan', (req, res) => {
    if (scanState.scanRunning) return res.json({ status: 'already_running', lastScan: scanState.lastScanTime?.toISOString() });
    scanState.runAutoScan().catch(() => {});
    res.json({ status: 'started', lastScan: scanState.lastScanTime?.toISOString() });
  });

  router.get('/intel/independent/scanner', (req, res) => {
    res.json({
      running: scanState.scanRunning,
      lastScan: scanState.lastScanTime ? scanState.lastScanTime.toISOString() : null,
      nextScan: scanState.lastScanTime ? new Date(scanState.lastScanTime.getTime() + scanState.SCAN_INTERVAL).toISOString() : null,
      cachedResults: scanState.cachedScanResults.length,
      interval: scanState.SCAN_INTERVAL / 1000 + 's',
      edgeCount: scanState.cachedScanResults.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE').length,
      aGrade: scanState.cachedScanResults.filter(e => (e.edgeQuality || 0) >= 75).length,
      bGrade: scanState.cachedScanResults.filter(e => (e.edgeQuality || 0) >= 55 && (e.edgeQuality || 0) < 75).length,
    });
  });

  router.get('/intel/independent/:conditionId', async (req, res) => {
    if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
    try {
      const condId = req.params.conditionId;
      const market = markets.getCachedMarkets().find(m => m.conditionId === condId);
      if (!market) return res.status(404).json({ error: 'Market not found' });

      const signal = await independentSignals.getIndependentSignal(market);
      res.json(signal);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/intel/independent/llm/analyze', async (req, res) => {
    if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
    try {
      const { conditionId, headlines } = req.body;
      if (!conditionId) return res.status(400).json({ error: 'conditionId required' });

      const market = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
      if (!market) return res.status(404).json({ error: 'Market not found' });

      const result = await independentSignals.llm.analyzeMarket(market, headlines || []);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/intel/independent/batch', async (req, res) => {
    if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
    try {
      const body = req.body || {};
      const maxMarkets = body.maxMarkets || body.count || 10;
      const skipLLM = body.skipLLM || false;
      const allMarkets = markets.getCachedMarkets();
      const results = await independentSignals.batchAnalyze(allMarkets, { maxMarkets, skipLLM });

      const entries = [];
      for (const [condId, signal] of results) {
        entries.push({ conditionId: condId, ...signal });
      }

      if (edgeResolver) {
        for (const e of entries) {
          if ((e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') && (e.sourceCount || 0) >= 1) {
            edgeResolver.recordEdge(e);
          }
        }
      }

      const strongEdges = entries.filter(e => e.edgeSignal === 'STRONG' && (e.edgeQuality || 0) >= 55);
      if (strongEdges.length > 0 && webhooks.fire) {
        webhooks.fire(strongEdges).catch(() => {});
      }

      res.json({
        count: entries.length,
        results: entries.sort((a, b) => (b.absDivergence || 0) - (a.absDivergence || 0)),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Calibration & Track Record ────────────────────────────────────
  router.get('/intel/calibration', (req, res) => {
    if (!independentSignals) return res.json({ available: false });

    const calibration = independentSignals.getCalibrationData();
    const edges = independentSignals.getRecentEdges(200);

    const last24h = edges.filter(e => Date.now() - (e.timestamp || 0) < 86400000);
    const last7d = edges.filter(e => Date.now() - (e.timestamp || 0) < 604800000);

    const qualityDist = { A: 0, B: 0, C: 0, D: 0 };
    for (const e of edges) {
      const grade = e.edgeGrade || (e.edgeQuality >= 75 ? 'A' : e.edgeQuality >= 55 ? 'B' : e.edgeQuality >= 35 ? 'C' : 'D');
      qualityDist[grade] = (qualityDist[grade] || 0) + 1;
    }

    const avgQuality = edges.length > 0
      ? Math.round(edges.reduce((sum, e) => sum + (e.edgeQuality || 0), 0) / edges.length)
      : 0;

    const sourceHits = {};
    for (const e of edges) {
      const count = e.sourceCount || e.validatedSourceCount || 0;
      sourceHits[count] = (sourceHits[count] || 0) + 1;
    }

    res.json({
      calibration,
      metrics: {
        totalEdges: edges.length,
        last24h: last24h.length,
        last7d: last7d.length,
        avgQuality,
        qualityDistribution: qualityDist,
        sourceHitRates: sourceHits,
        strongEdges: edges.filter(e => e.edgeSignal === 'STRONG').length,
        moderateEdges: edges.filter(e => e.edgeSignal === 'MODERATE').length,
        highQualityEdges: edges.filter(e => (e.edgeQuality || 0) >= 55).length,
      },
      systemStatus: independentSignals.getStatus(),
    });
  });

  // ─── Public Track Record ───────────────────────────────────────────
  router.get('/public/track-record', (req, res) => {
    try {
      const record = edgeResolver ? edgeResolver.getTrackRecord() : null;
      const resFile = path.join(LOGS_DIR, 'edge-resolutions.json');
      let allEdges = [];
      try {
        const raw = JSON.parse(fs.readFileSync(resFile, 'utf8'));
        allEdges = raw.resolutions || [];
      } catch { /* empty */ }

      const pending = allEdges.filter(e => !e.resolved);
      const resolved = allEdges.filter(e => e.resolved);

      const gradeDistribution = {};
      for (const e of allEdges) {
        const g = e.edgeGrade || '?';
        if (!gradeDistribution[g]) gradeDistribution[g] = 0;
        gradeDistribution[g]++;
      }

      const sourceCountDist = {};
      for (const e of allEdges) {
        const sc = e.sourceCount || 0;
        const bucket = sc >= 6 ? '6+' : String(sc);
        if (!sourceCountDist[bucket]) sourceCountDist[bucket] = 0;
        sourceCountDist[bucket]++;
      }

      const activeEdges = pending
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
        .map(e => ({
          question: e.question,
          edgeGrade: e.edgeGrade,
          edgeDirection: e.edgeDirection,
          divergence: e.divergence,
          sourceCount: e.sourceCount,
          recordedAt: e.recordedAt,
          marketPrice: e.marketPrice,
          ourProb: e.ourProb,
        }));

      const resolvedEdges = resolved
        .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
        .map(e => ({
          question: e.question,
          edgeGrade: e.edgeGrade,
          edgeDirection: e.edgeDirection,
          outcome: e.outcome === 1 ? 'YES' : 'NO',
          pnlPp: e.pnlPp,
          weWereBetter: e.weWereBetter,
          ourProb: e.ourProb,
          marketPrice: e.marketPrice,
          resolvedAt: e.resolvedAt,
          recordedAt: e.recordedAt,
        }));

      const timeline = {};
      for (const e of allEdges) {
        const day = e.recordedAt?.slice(0, 10);
        if (day) {
          if (!timeline[day]) timeline[day] = { recorded: 0, resolved: 0 };
          timeline[day].recorded++;
          if (e.resolved) timeline[day].resolved++;
        }
      }

      res.json({
        summary: record?.summary || { totalEdges: allEdges.length, resolvedEdges: resolved.length, wins: 0, losses: 0, totalPnLpp: 0, pending: pending.length },
        hypothetical: record?.hypothetical || { totalBets: 0, totalReturn: 0, roi: 0 },
        byGrade: record?.byGrade || {},
        gradeDistribution,
        sourceCountDist,
        activeEdges,
        resolvedEdges,
        timeline,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Track record unavailable' });
    }
  });

  // ─── Track Record & Resolution ─────────────────────────────────────
  router.get('/intel/track-record', (req, res) => {
    if (!edgeResolver) return res.json({ available: false, summary: { totalEdges: 0, resolvedEdges: 0, wins: 0, losses: 0, totalPnLpp: 0 }, pending: 0, recent: [], byGrade: {}, hypothetical: { totalBets: 0, totalReturn: 0, roi: 0 } });
    res.json(edgeResolver.getTrackRecord());
  });

  router.post('/intel/check-resolutions', async (req, res) => {
    if (!edgeResolver) return res.status(503).json({ error: 'Edge resolver not loaded' });
    try {
      const result = await edgeResolver.checkResolutions(async (conditionId) => {
        const pm = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
        if (pm) return pm;
        if (kalshiMarkets) {
          const km = kalshiMarkets.getCachedMarkets().find(m => m.conditionId === conditionId);
          if (km) return km;
        }
        return null;
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Webhook / Discord Alerts ──────────────────────────────────────
  router.get('/intel/webhooks', (req, res) => {
    res.json({
      enabled: webhooks.config.enabled,
      urlCount: webhooks.config.urls.length,
      minQuality: webhooks.config.minQuality,
      minEdge: webhooks.config.minEdge,
      hasUrls: webhooks.config.urls.length > 0,
    });
  });

  router.post('/intel/webhooks', (req, res) => {
    const { url, enabled, minQuality, minEdge } = req.body;
    if (url) {
      if (!webhooks.config.urls.includes(url)) webhooks.config.urls.push(url);
    }
    if (typeof enabled === 'boolean') webhooks.config.enabled = enabled;
    if (typeof minQuality === 'number') webhooks.config.minQuality = minQuality;
    if (minEdge) webhooks.config.minEdge = minEdge;
    webhooks.save();
    res.json({ status: 'updated', config: { enabled: webhooks.config.enabled, urlCount: webhooks.config.urls.length, minQuality: webhooks.config.minQuality } });
  });

  router.delete('/intel/webhooks', (req, res) => {
    const { url } = req.body;
    if (url) webhooks.config.urls = webhooks.config.urls.filter(u => u !== url);
    webhooks.save();
    res.json({ status: 'deleted', urlCount: webhooks.config.urls.length });
  });

  return router;
};
