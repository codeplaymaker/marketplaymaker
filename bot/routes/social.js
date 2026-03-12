const express = require('express');

/**
 * Social / Cultural Intelligence routes — YouTube, Twitter, Cultural Events
 *
 * Deps:
 *   youtubeTracker, twitterTracker, culturalEvents (all optional)
 *   markets, edgeResolver (optional — for trade-record recording)
 */
module.exports = function createSocialRoutes(deps) {
  const router = express.Router();
  const { youtubeTracker, twitterTracker, culturalEvents, markets, edgeResolver } = deps;

  // ─── YouTube Tracker ───────────────────────────────────────────────
  router.get('/intel/youtube/status', (req, res) => {
    if (!youtubeTracker) return res.json({ available: false });
    res.json({
      available: true,
      ...youtubeTracker.getStatus(),
      trackedVideos: youtubeTracker.getTrackedVideos(),
    });
  });

  router.post('/intel/youtube/analyze', async (req, res) => {
    if (!youtubeTracker) return res.status(400).json({ error: 'YouTube tracker not available' });
    const { question, endDate } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });
    try {
      const signal = await youtubeTracker.getYouTubeSignal({ question, endDate, conditionId: 'manual-' + Date.now() });
      res.json({ signal });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/intel/youtube/creators', (_req, res) => {
    const CREATORS = {
      'mrbeast':       { name: 'MrBeast', avgFirst24h: 80_000_000, avgFirst48h: 120_000_000 },
      'pewdiepie':     { name: 'PewDiePie', avgFirst24h: 8_000_000, avgFirst48h: 15_000_000 },
      'markrober':     { name: 'Mark Rober', avgFirst24h: 20_000_000, avgFirst48h: 35_000_000 },
      'mkbhd':         { name: 'MKBHD', avgFirst24h: 5_000_000, avgFirst48h: 10_000_000 },
      'loganpaul':     { name: 'Logan Paul', avgFirst24h: 10_000_000, avgFirst48h: 18_000_000 },
      'ksi':           { name: 'KSI', avgFirst24h: 8_000_000, avgFirst48h: 14_000_000 },
      'ishowspeed':    { name: 'IShowSpeed', avgFirst24h: 12_000_000, avgFirst48h: 20_000_000 },
      'airrack':       { name: 'Airrack', avgFirst24h: 15_000_000, avgFirst48h: 25_000_000 },
      'dude perfect':  { name: 'Dude Perfect', avgFirst24h: 15_000_000, avgFirst48h: 25_000_000 },
      'ryan trahan':   { name: 'Ryan Trahan', avgFirst24h: 10_000_000, avgFirst48h: 18_000_000 },
    };
    res.json({ creators: CREATORS });
  });

  router.get('/intel/youtube/trending', async (req, res) => {
    if (!youtubeTracker) return res.json({ markets: [], error: 'YouTube tracker not available' });
    try {
      const allMarkets = markets ? markets.getCachedMarkets() : [];
      const ytRegex = /youtube|video|views|watch|stream|subscriber|upload|MrBeast|PewDiePie|Mark Rober|MKBHD|Logan Paul|KSI|IShowSpeed|Airrack|Dude Perfect|Ryan Trahan/i;
      const ytMarkets = allMarkets.filter(m => ytRegex.test(m.question));

      const analyzed = [];
      for (const mkt of ytMarkets.slice(0, 20)) {
        try {
          const signal = await youtubeTracker.getYouTubeSignal({
            question: mkt.question, endDate: mkt.endDate,
            conditionId: mkt.conditionId, yesPrice: mkt.yesPrice,
          });
          const edge = signal?.prob != null ? (signal.prob - mkt.yesPrice) : null;
          const absEdge = edge != null ? Math.abs(edge) : 0;
          const suggestion = edge != null ? (edge > 0.05 ? 'YES' : edge < -0.05 ? 'NO' : 'HOLD') : 'NO DATA';
          analyzed.push({
            conditionId: mkt.conditionId, question: mkt.question, slug: mkt.slug,
            yesPrice: mkt.yesPrice, noPrice: mkt.noPrice, volume24hr: mkt.volume24hr,
            liquidity: mkt.liquidity, endDate: mkt.endDate,
            signal: signal ? {
              prob: signal.prob, confidence: signal.confidence, detail: signal.detail,
              currentViews: signal.currentViews, projectedViews: signal.projectedViews,
              targetViews: signal.targetViews, velocity: signal.velocity,
              channel: signal.channel, videoTitle: signal.videoTitle,
              isBaseline: signal.isBaseline || false,
            } : null,
            edge: edge != null ? Math.round(edge * 1000) / 1000 : null,
            absEdge: Math.round(absEdge * 1000) / 1000, suggestion,
            suggestedSide: edge > 0.05 ? 'YES' : edge < -0.05 ? 'NO' : null,
            suggestedPrice: edge > 0.05 ? mkt.yesPrice : edge < -0.05 ? mkt.noPrice : null,
            edgePct: edge != null ? Math.round(edge * 10000) / 100 : null,
          });
        } catch (err) {
          analyzed.push({
            conditionId: mkt.conditionId, question: mkt.question, slug: mkt.slug,
            yesPrice: mkt.yesPrice, volume24hr: mkt.volume24hr, endDate: mkt.endDate,
            signal: null, edge: null, suggestion: 'ERROR', error: err.message,
          });
        }
      }
      analyzed.sort((a, b) => (b.absEdge || 0) - (a.absEdge || 0));

      // Record YouTube edges in trade record
      if (edgeResolver) {
        for (const a of analyzed) {
          if (a.edge != null && Math.abs(a.edge) > 0.05 && a.conditionId) {
            edgeResolver.recordTrendingEdge({
              conditionId: a.conditionId, question: a.question,
              yesPrice: a.yesPrice, noPrice: a.noPrice, marketPrice: a.yesPrice,
              prob: a.signal?.prob, edge: a.edge, source: 'youtube',
            });
          }
        }
      }

      res.json({ markets: analyzed, total: ytMarkets.length, analyzed: analyzed.length, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Twitter Tracker ───────────────────────────────────────────────
  router.get('/intel/twitter/status', (req, res) => {
    if (!twitterTracker) return res.json({ available: false });
    res.json({
      available: true,
      ...twitterTracker.getStatus(),
      trackedAccounts: twitterTracker.getTrackedAccounts(),
    });
  });

  router.post('/intel/twitter/analyze', async (req, res) => {
    if (!twitterTracker) return res.status(400).json({ error: 'Twitter tracker not available' });
    const { question, endDate } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });
    try {
      const signal = await twitterTracker.getTwitterSignal({ question, endDate, conditionId: 'manual-' + Date.now() });
      res.json({ signal });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/intel/twitter/simulate', (req, res) => {
    if (!twitterTracker) return res.status(400).json({ error: 'Twitter tracker not available' });
    const { username, currentCount, targetCount, hoursRemaining } = req.body;
    try {
      const result = twitterTracker.calculateTweetProbability(
        username || 'elonmusk', Number(currentCount) || 0,
        Number(targetCount) || 120, Number(hoursRemaining) || 168,
      );
      const pattern = twitterTracker.buildPattern(username || 'elonmusk');
      res.json({ result, pattern });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/intel/twitter/accounts', (_req, res) => {
    if (!twitterTracker) return res.json({ accounts: {} });
    const TRACKED_ACCOUNTS = {
      'elonmusk':        { name: 'Elon Musk', avgDailyTweets: 35, stdDev: 12, topics: ['tech', 'space', 'politics', 'crypto', 'ai'] },
      'realdonaldtrump': { name: 'Donald Trump', avgDailyTweets: 15, stdDev: 8, topics: ['politics'] },
      'joebiden':        { name: 'Joe Biden', avgDailyTweets: 5, stdDev: 3, topics: ['politics'] },
      'vaborehim':       { name: 'Vitalik Buterin', avgDailyTweets: 8, stdDev: 5, topics: ['crypto', 'tech'] },
      'caborehim':       { name: 'CZ (Binance)', avgDailyTweets: 10, stdDev: 6, topics: ['crypto'] },
    };
    res.json({ accounts: TRACKED_ACCOUNTS });
  });

  router.get('/intel/twitter/trending', async (req, res) => {
    if (!twitterTracker) return res.json({ markets: [], error: 'Twitter tracker not available' });
    try {
      const allMarkets = markets ? markets.getCachedMarkets() : [];
      const twRegex = /tweet|twitter|post.*on x|elon.*tweet|trump.*tweet|@\w+.*tweet|post.*x\.com|weekly.*tweet|daily.*tweet/i;
      const twMarkets = allMarkets.filter(m => twRegex.test(m.question));

      const analyzed = [];
      for (const mkt of twMarkets.slice(0, 20)) {
        try {
          const signal = await twitterTracker.getTwitterSignal({
            question: mkt.question, endDate: mkt.endDate,
            conditionId: mkt.conditionId, yesPrice: mkt.yesPrice,
          });
          const edge = signal?.prob != null ? (signal.prob - mkt.yesPrice) : null;
          const absEdge = edge != null ? Math.abs(edge) : 0;
          const suggestion = edge != null ? (edge > 0.05 ? 'YES' : edge < -0.05 ? 'NO' : 'HOLD') : 'NO DATA';
          analyzed.push({
            conditionId: mkt.conditionId, question: mkt.question, slug: mkt.slug,
            yesPrice: mkt.yesPrice, noPrice: mkt.noPrice, volume24hr: mkt.volume24hr,
            liquidity: mkt.liquidity, endDate: mkt.endDate,
            signal: signal ? {
              prob: signal.prob, confidence: signal.confidence, detail: signal.detail,
              currentCount: signal.currentCount, targetCount: signal.targetCount,
              username: signal.username, hoursRemaining: signal.hoursRemaining,
              dataSource: signal.dataSource, isBaseline: signal.isBaseline || false,
            } : null,
            edge: edge != null ? Math.round(edge * 1000) / 1000 : null,
            absEdge: Math.round(absEdge * 1000) / 1000, suggestion,
            suggestedSide: edge > 0.05 ? 'YES' : edge < -0.05 ? 'NO' : null,
            edgePct: edge != null ? Math.round(edge * 10000) / 100 : null,
          });
        } catch (err) {
          analyzed.push({
            conditionId: mkt.conditionId, question: mkt.question, slug: mkt.slug,
            yesPrice: mkt.yesPrice, volume24hr: mkt.volume24hr, endDate: mkt.endDate,
            signal: null, edge: null, suggestion: 'ERROR', error: err.message,
          });
        }
      }
      analyzed.sort((a, b) => (b.absEdge || 0) - (a.absEdge || 0));

      // Record Twitter edges in trade record
      if (edgeResolver) {
        for (const a of analyzed) {
          if (a.edge != null && Math.abs(a.edge) > 0.05 && a.conditionId) {
            edgeResolver.recordTrendingEdge({
              conditionId: a.conditionId, question: a.question,
              yesPrice: a.yesPrice, noPrice: a.noPrice, marketPrice: a.yesPrice,
              prob: a.signal?.prob, edge: a.edge, source: 'twitter',
            });
          }
        }
      }

      res.json({ markets: analyzed, total: twMarkets.length, analyzed: analyzed.length, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Cultural Events ───────────────────────────────────────────────
  router.get('/intel/cultural/status', (req, res) => {
    if (!culturalEvents) return res.json({ available: false });
    res.json({ available: true, ...culturalEvents.getStatus() });
  });

  router.get('/intel/cultural/youtube-impact/:creator', async (req, res) => {
    if (!culturalEvents) return res.json({ available: false });
    try {
      const impact = await culturalEvents.getYouTubeImpact(req.params.creator);
      res.json(impact);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/intel/cultural/elon-impact', async (req, res) => {
    if (!culturalEvents) return res.json({ available: false });
    try {
      const impact = await culturalEvents.getElonTweetImpact();
      res.json(impact);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
