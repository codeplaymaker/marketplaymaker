const express = require('express');

/**
 * Social / Cultural Intelligence routes — YouTube, Twitter, Cultural Events
 *
 * Expected deps:
 *   youtubeTracker (optional), twitterTracker (optional), culturalEvents (optional)
 */
module.exports = function createSocialRoutes(deps) {
  const router = express.Router();
  const { youtubeTracker, twitterTracker, culturalEvents } = deps;

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
    try {
      const signal = await youtubeTracker.getYouTubeSignal({ question, endDate, conditionId: 'manual-' + Date.now() });
      res.json({ signal });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/intel/youtube/creators', (req, res) => {
    const CREATORS = {
      'mrbeast':       { name: 'MrBeast', avgFirst24h: 80000000, avgFirst48h: 120000000 },
      'pewdiepie':     { name: 'PewDiePie', avgFirst24h: 8000000, avgFirst48h: 15000000 },
      'markrober':     { name: 'Mark Rober', avgFirst24h: 20000000, avgFirst48h: 35000000 },
      'mkbhd':         { name: 'MKBHD', avgFirst24h: 5000000, avgFirst48h: 10000000 },
      'loganpaul':     { name: 'Logan Paul', avgFirst24h: 10000000, avgFirst48h: 18000000 },
      'ksi':           { name: 'KSI', avgFirst24h: 8000000, avgFirst48h: 14000000 },
      'ishowspeed':    { name: 'IShowSpeed', avgFirst24h: 12000000, avgFirst48h: 20000000 },
      'airrack':       { name: 'Airrack', avgFirst24h: 15000000, avgFirst48h: 25000000 },
      'dude perfect':  { name: 'Dude Perfect', avgFirst24h: 15000000, avgFirst48h: 25000000 },
      'ryan trahan':   { name: 'Ryan Trahan', avgFirst24h: 10000000, avgFirst48h: 18000000 },
    };
    res.json({ creators: CREATORS });
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
        username || 'elonmusk',
        Number(currentCount) || 0,
        Number(targetCount) || 120,
        Number(hoursRemaining) || 168
      );
      const pattern = twitterTracker.buildPattern(username || 'elonmusk');
      res.json({ result, pattern });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/intel/twitter/accounts', (req, res) => {
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
