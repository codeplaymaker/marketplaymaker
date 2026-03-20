/**
 * MiroFish Simulation Analyzer
 *
 * Extracts quantitative probability estimates from MiroFish simulation
 * output. The simulation produces agent posts/actions on social media —
 * this module converts that qualitative data into a probability signal.
 *
 * Analysis methods:
 *   1. Stance Analysis — count agents supporting YES vs NO
 *   2. Sentiment Aggregation — weighted average of agent sentiment
 *   3. Influence-Weighted Consensus — high-influence agents count more
 *   4. Temporal Convergence — track how opinion shifts during simulation
 *   5. Report Extraction — parse structured predictions from ReACT report
 *
 * The final probability is a composite of all methods, weighted by
 * how much data each method had to work with.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const ANALYSIS_CACHE = path.join(__dirname, '../logs/mirofish-analysis-cache.json');

// Analysis result cache
let analysisCache = new Map(); // conditionId → { prob, analysis, timestamp }
const CACHE_TTL = 4 * 3600000; // 4 hours — simulations are expensive, cache results longer

try {
  if (fs.existsSync(ANALYSIS_CACHE)) {
    const saved = JSON.parse(fs.readFileSync(ANALYSIS_CACHE, 'utf8'));
    if (saved.entries) {
      const now = Date.now();
      for (const [k, v] of Object.entries(saved.entries)) {
        if (now - v.timestamp < CACHE_TTL * 2) analysisCache.set(k, v);
      }
      log.info('MF_ANALYZE', `Loaded ${analysisCache.size} cached analyses`);
    }
  }
} catch { /* fresh start */ }

function saveAnalysisCache() {
  try {
    const entries = {};
    for (const [k, v] of analysisCache) entries[k] = v;
    fs.promises.writeFile(ANALYSIS_CACHE, JSON.stringify({
      entries, savedAt: new Date().toISOString(),
    }, null, 2)).catch(() => {});
  } catch { /* non-critical */ }
}

// ─── Stance Keywords ─────────────────────────────────────────────────

const YES_INDICATORS = [
  'will happen', 'likely', 'expect', 'confident', 'inevitable', 'certain',
  'support', 'approve', 'pass', 'win', 'succeed', 'agree', 'optimistic',
  'absolutely', 'definitely', 'for sure', 'no doubt', 'bet on it',
  'going to happen', 'on track', 'strong chance', 'high probability',
  'favor', 'endorse', 'positive', 'momentum', 'breakthrough',
];

const NO_INDICATORS = [
  'won\'t happen', 'unlikely', 'doubt', 'skeptical', 'impossible',
  'oppose', 'reject', 'fail', 'lose', 'block', 'veto', 'pessimistic',
  'no way', 'never', 'not going to', 'dead on arrival', 'doomed',
  'against', 'obstacle', 'resistance', 'stalled', 'collapse',
  'derail', 'prevent', 'stop', 'halt', 'negative', 'threat',
];

// ─── Core Analysis Functions ─────────────────────────────────────────

/**
 * Analyze simulation actions and report to extract a probability estimate.
 *
 * @param {Object} params
 * @param {string} params.conditionId - Market condition ID
 * @param {Object} params.actions - Simulation action log from MiroFish
 * @param {Object} params.report - Generated report content from MiroFish
 * @param {Object} params.market - Original market object { question, yesPrice }
 * @returns {Object} { prob, confidence, reasoning, methods, detail }
 */
function analyzeSimulation({ conditionId, actions, report, market }) {
  // Check cache
  const cached = analysisCache.get(conditionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached, cached: true };
  }

  const methods = [];
  const weights = [];

  // Method 1: Stance analysis from agent posts
  const stanceResult = analyzeStances(actions);
  if (stanceResult) {
    methods.push({ name: 'Stance Analysis', ...stanceResult });
    weights.push({ prob: stanceResult.prob, weight: stanceResult.weight });
  }

  // Method 2: Sentiment aggregation
  const sentimentResult = analyzeSentiment(actions);
  if (sentimentResult) {
    methods.push({ name: 'Sentiment Aggregation', ...sentimentResult });
    weights.push({ prob: sentimentResult.prob, weight: sentimentResult.weight });
  }

  // Method 3: Influence-weighted consensus
  const influenceResult = analyzeInfluenceWeighted(actions);
  if (influenceResult) {
    methods.push({ name: 'Influence-Weighted', ...influenceResult });
    weights.push({ prob: influenceResult.prob, weight: influenceResult.weight });
  }

  // Method 4: Temporal convergence
  const convergenceResult = analyzeConvergence(actions);
  if (convergenceResult) {
    methods.push({ name: 'Temporal Convergence', ...convergenceResult });
    weights.push({ prob: convergenceResult.prob, weight: convergenceResult.weight });
  }

  // Method 5: Report extraction
  const reportResult = analyzeReport(report);
  if (reportResult) {
    methods.push({ name: 'Report Extraction', ...reportResult });
    weights.push({ prob: reportResult.prob, weight: reportResult.weight });
  }

  // No usable signals
  if (weights.length === 0) {
    return { prob: null, confidence: 'NONE', methods: [], detail: 'No simulation data to analyze' };
  }

  // Weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  for (const w of weights) {
    weightedSum += w.prob * w.weight;
    totalWeight += w.weight;
  }
  const consensusProb = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Confidence based on method count and agreement
  const probSpread = weights.length > 1
    ? Math.max(...weights.map(w => w.prob)) - Math.min(...weights.map(w => w.prob))
    : 0.5;

  let confidence = 'LOW';
  if (weights.length >= 3 && probSpread < 0.15) confidence = 'HIGH';
  else if (weights.length >= 2 && probSpread < 0.25) confidence = 'MEDIUM';

  const result = {
    prob: Math.round(consensusProb * 1000) / 1000,
    confidence,
    methodCount: methods.length,
    probSpread: Math.round(probSpread * 1000) / 1000,
    methods,
    reasoning: buildReasoning(methods, consensusProb),
    detail: `MiroFish: ${(consensusProb * 100).toFixed(0)}% from ${methods.length} methods (spread: ${(probSpread * 100).toFixed(0)}pp)`,
    timestamp: Date.now(),
    analyzedAt: new Date().toISOString(),
  };

  // Cache
  analysisCache.set(conditionId, result);
  saveAnalysisCache();

  return result;
}

// ─── Method 1: Stance Analysis ───────────────────────────────────────

function analyzeStances(actions) {
  if (!actions?.actions?.length && !actions?.length) return null;

  const posts = extractPosts(actions);
  if (posts.length === 0) return null;

  let yesCount = 0;
  let noCount = 0;
  let neutralCount = 0;

  for (const post of posts) {
    const text = (post.content || post.text || '').toLowerCase();
    const yesScore = YES_INDICATORS.filter(w => text.includes(w)).length;
    const noScore = NO_INDICATORS.filter(w => text.includes(w)).length;

    if (yesScore > noScore) yesCount++;
    else if (noScore > yesScore) noCount++;
    else neutralCount++;
  }

  const total = yesCount + noCount + neutralCount;
  if (total < 3) return null; // Too few posts

  // Probability from stance ratio (neutrals split 50/50)
  const effectiveYes = yesCount + neutralCount * 0.5;
  const prob = effectiveYes / total;

  // Weight based on sample size
  const weight = Math.min(total / 20, 1.0) * 0.30; // Max weight 0.30

  return {
    prob: clamp(prob, 0.05, 0.95),
    weight,
    yesCount,
    noCount,
    neutralCount,
    totalPosts: total,
  };
}

// ─── Method 2: Sentiment Aggregation ─────────────────────────────────

function analyzeSentiment(actions) {
  const posts = extractPosts(actions);
  if (posts.length < 3) return null;

  let totalSentiment = 0;
  let count = 0;

  for (const post of posts) {
    const text = (post.content || post.text || '').toLowerCase();
    const sentiment = quickSentiment(text);
    totalSentiment += sentiment;
    count++;
  }

  if (count === 0) return null;

  // Average sentiment (-1 to +1) → probability (0 to 1)
  const avgSentiment = totalSentiment / count;
  const prob = 0.5 + avgSentiment * 0.3; // Sentiment contributes ±30% to baseline

  const weight = Math.min(count / 15, 1.0) * 0.20;

  return {
    prob: clamp(prob, 0.05, 0.95),
    weight,
    avgSentiment: Math.round(avgSentiment * 1000) / 1000,
    postCount: count,
  };
}

/**
 * Quick VADER-like sentiment scorer.
 * Returns -1 to +1.
 */
function quickSentiment(text) {
  const positiveWords = ['good', 'great', 'excellent', 'progress', 'success', 'win', 'achieve', 'strong', 'positive', 'hope', 'optimistic', 'support', 'approve', 'agree', 'confident'];
  const negativeWords = ['bad', 'terrible', 'fail', 'crisis', 'danger', 'threat', 'weak', 'negative', 'fear', 'pessimistic', 'oppose', 'reject', 'doubt', 'collapse', 'disaster'];

  let score = 0;
  const words = text.split(/\s+/);

  for (const word of words) {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  }

  // Normalize
  return words.length > 0 ? Math.max(-1, Math.min(1, score / Math.sqrt(words.length))) : 0;
}

// ─── Method 3: Influence-Weighted Consensus ──────────────────────────

function analyzeInfluenceWeighted(actions) {
  const posts = extractPosts(actions);
  if (posts.length < 3) return null;

  let weightedYes = 0;
  let weightedNo = 0;
  let totalInfluence = 0;

  for (const post of posts) {
    const text = (post.content || post.text || '').toLowerCase();
    const yesScore = YES_INDICATORS.filter(w => text.includes(w)).length;
    const noScore = NO_INDICATORS.filter(w => text.includes(w)).length;

    // Influence proxy: follower count, likes, reposts
    const influence = Math.sqrt(
      (post.follower_count || post.followers || 10) +
      (post.likes || post.like_count || 0) * 5 +
      (post.reposts || post.repost_count || 0) * 10
    );

    if (yesScore > noScore) weightedYes += influence;
    else if (noScore > yesScore) weightedNo += influence;
    else { weightedYes += influence * 0.5; weightedNo += influence * 0.5; }

    totalInfluence += influence;
  }

  if (totalInfluence === 0) return null;

  const prob = weightedYes / totalInfluence;
  const weight = Math.min(posts.length / 10, 1.0) * 0.25;

  return {
    prob: clamp(prob, 0.05, 0.95),
    weight,
    totalInfluence: Math.round(totalInfluence),
    postCount: posts.length,
  };
}

// ─── Method 4: Temporal Convergence ──────────────────────────────────

function analyzeConvergence(actions) {
  const posts = extractPosts(actions);
  if (posts.length < 6) return null;

  // Split into first half and second half
  const mid = Math.floor(posts.length / 2);
  const firstHalf = posts.slice(0, mid);
  const secondHalf = posts.slice(mid);

  const firstProb = stanceRatio(firstHalf);
  const secondProb = stanceRatio(secondHalf);

  if (firstProb === null || secondProb === null) return null;

  // The second half is more informed (simulation has evolved)
  // Weight convergence direction
  const shift = secondProb - firstProb;
  const isConverging = Math.abs(secondProb - 0.5) > Math.abs(firstProb - 0.5);

  // Use second-half probability but dampen extreme swings
  const prob = secondProb * 0.7 + firstProb * 0.3;
  const weight = isConverging ? 0.25 : 0.15; // Higher weight if opinions are crystallizing

  return {
    prob: clamp(prob, 0.05, 0.95),
    weight,
    firstHalfProb: Math.round(firstProb * 1000) / 1000,
    secondHalfProb: Math.round(secondProb * 1000) / 1000,
    shift: Math.round(shift * 1000) / 1000,
    isConverging,
  };
}

function stanceRatio(posts) {
  let yes = 0, no = 0, total = 0;
  for (const post of posts) {
    const text = (post.content || post.text || '').toLowerCase();
    const yesScore = YES_INDICATORS.filter(w => text.includes(w)).length;
    const noScore = NO_INDICATORS.filter(w => text.includes(w)).length;
    if (yesScore > noScore) yes++;
    else if (noScore > yesScore) no++;
    total++;
  }
  if (total < 2) return null;
  return (yes + (total - yes - no) * 0.5) / total;
}

// ─── Method 5: Report Extraction ─────────────────────────────────────

function analyzeReport(report) {
  if (!report?.content && !report?.sections && !report?.markdown) return null;

  const text = (report.content || report.markdown || 
    (report.sections || []).map(s => s.content || s.text || '').join('\n'))
    .toLowerCase();

  if (text.length < 100) return null;

  // Look for explicit probability mentions
  const probMatch = text.match(/(\d{1,3})\s*%\s*(probability|chance|likelihood|likely)/i)
    || text.match(/(probability|chance|likelihood)[^.]*?(\d{1,3})\s*%/i);

  if (probMatch) {
    const pct = parseInt(probMatch[1] || probMatch[2]);
    if (pct >= 1 && pct <= 99) {
      return {
        prob: pct / 100,
        weight: 0.40, // Reports are the most structured signal
        source: 'explicit_probability',
        rawMatch: probMatch[0],
      };
    }
  }

  // Look for qualitative predictions
  const highlyLikely = /highly likely|very probable|almost certain|overwhelming|strong consensus/i.test(text);
  const likely = /likely|probable|expected|favored|leaning towards yes/i.test(text);
  const unlikely = /unlikely|improbable|not expected|long shot|leaning towards no/i.test(text);
  const highlyUnlikely = /highly unlikely|very improbable|almost impossible|negligible chance/i.test(text);

  let prob = 0.5;
  if (highlyLikely) prob = 0.82;
  else if (likely) prob = 0.65;
  else if (highlyUnlikely) prob = 0.15;
  else if (unlikely) prob = 0.32;
  else return null; // No clear signal

  return {
    prob,
    weight: 0.30,
    source: 'qualitative',
    signal: highlyLikely ? 'highly_likely' : likely ? 'likely' : highlyUnlikely ? 'highly_unlikely' : 'unlikely',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extractPosts(actions) {
  if (!actions) return [];

  // Handle different action log formats
  let items = [];
  if (Array.isArray(actions)) items = actions;
  else if (actions.actions) items = actions.actions;
  else if (actions.twitter_actions) items = actions.twitter_actions;
  else if (actions.reddit_actions) items = actions.reddit_actions;

  // Filter to content-bearing actions (posts and comments)
  return items.filter(a => {
    const type = (a.action_type || a.type || '').toUpperCase();
    return (type === 'CREATE_POST' || type === 'CREATE_COMMENT' || type === 'QUOTE_POST')
      && (a.content || a.text);
  });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildReasoning(methods, prob) {
  const parts = methods.map(m => {
    if (m.name === 'Stance Analysis') {
      return `${m.yesCount} agents support YES vs ${m.noCount} NO (${m.neutralCount} neutral)`;
    }
    if (m.name === 'Report Extraction') {
      return `Report ${m.source === 'explicit_probability' ? 'explicitly states' : 'suggests'} ${(m.prob * 100).toFixed(0)}%`;
    }
    if (m.name === 'Temporal Convergence') {
      return `Opinion shifted from ${(m.firstHalfProb * 100).toFixed(0)}% → ${(m.secondHalfProb * 100).toFixed(0)}% during simulation`;
    }
    return `${m.name}: ${(m.prob * 100).toFixed(0)}%`;
  });

  return `MiroFish multi-agent simulation: ${parts.join('; ')}. Composite: ${(prob * 100).toFixed(0)}%`;
}

// ─── Public API ──────────────────────────────────────────────────────

function getCachedAnalysis(conditionId) {
  const cached = analysisCache.get(conditionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached;
  return null;
}

function getStatus() {
  return {
    cachedAnalyses: analysisCache.size,
    cacheTTL: CACHE_TTL / 3600000 + 'h',
  };
}

module.exports = {
  analyzeSimulation,
  getCachedAnalysis,
  getStatus,
  // Exported for testing
  analyzeStances,
  analyzeSentiment,
  analyzeInfluenceWeighted,
  analyzeConvergence,
  analyzeReport,
};
