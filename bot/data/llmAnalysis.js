/**
 * LLM-Powered News & Market Analysis
 *
 * Uses GPT-4o-mini / Claude Haiku (cheap, fast) to generate truly
 * INDEPENDENT probability estimates by analyzing:
 * - Recent news headlines matched to market questions
 * - Historical context and base rates
 * - Domain-specific reasoning
 *
 * This is the #1 independent data source — the LLM produces probability
 * estimates that are NOT derived from market prices, giving us genuine
 * edge detection when LLM disagrees with the market.
 *
 * Supports: OpenAI, Anthropic, or any OpenAI-compatible API.
 *
 * Rate control: one LLM call per market per hour (cached).
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../logs/llm-analysis-cache.json');
const CACHE_TTL = 3600000; // 1 hour — LLM re-analyzes each market at most once/hour
const MAX_CACHE_ENTRIES = 200;

// State
let apiKey = null;
let provider = 'openai'; // 'openai' | 'anthropic' | 'openrouter'
let model = null;
let cache = new Map(); // conditionId → { prob, reasoning, headlines, timestamp }
let totalCalls = 0;
let totalTokens = 0;

// Provider configs
const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-20241022',
    headers: (key) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
};

// ─── Load cache ──────────────────────────────────────────────────────
try {
  if (fs.existsSync(CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (saved.entries) {
      const now = Date.now();
      for (const [k, v] of Object.entries(saved.entries)) {
        if (now - v.timestamp < CACHE_TTL * 4) cache.set(k, v); // Keep 4h of cache for fallback
      }
      log.info('LLM', `Loaded ${cache.size} cached analyses from disk`);
    }
    if (saved.totalCalls) totalCalls = saved.totalCalls;
    if (saved.totalTokens) totalTokens = saved.totalTokens;
  }
} catch { /* fresh start */ }

function saveCache() {
  try {
    const entries = {};
    let count = 0;
    for (const [k, v] of cache) {
      if (count >= MAX_CACHE_ENTRIES) break;
      entries[k] = v;
      count++;
    }
    fs.promises.writeFile(CACHE_FILE, JSON.stringify({
      entries, totalCalls, totalTokens, savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

// ─── Configuration ───────────────────────────────────────────────────

function configure(config) {
  if (config.apiKey) apiKey = config.apiKey.trim();
  if (config.provider && PROVIDERS[config.provider]) provider = config.provider;
  if (config.model) model = config.model;
  log.info('LLM', `Configured: provider=${provider}, model=${model || PROVIDERS[provider].defaultModel}`);
}

function isConfigured() {
  return !!apiKey;
}

// ─── Core: Analyze a market question with LLM ───────────────────────

const SYSTEM_PROMPT = `You are a quantitative prediction market analyst. Your job is to estimate the probability of events resolving YES, using ONLY the news headlines and your general knowledge — NOT the current market price.

Rules:
1. Output a JSON object with exactly these fields: {"probability": 0.XX, "confidence": "HIGH"|"MEDIUM"|"LOW", "reasoning": "one sentence", "keyFactors": ["factor1", "factor2"]}
2. probability must be between 0.02 and 0.98
3. Base your estimate on: a) the news evidence provided, b) historical base rates for similar events, c) domain knowledge
4. Be CALIBRATED — a 70% estimate should resolve YES about 70% of the time
5. Do NOT anchor to any market price. Estimate independently.
6. For sports: consider team strength, recent form, injuries, venue
7. For politics: consider polls, incumbency, fundraising, historical patterns
8. For crypto/business: consider fundamentals, macro trends, regulatory environment
9. confidence = HIGH if strong evidence exists, LOW if mostly speculation`;

/**
 * Get an LLM probability estimate for a single market.
 * Returns cached result if fresh enough.
 *
 * @param {Object} market - Market object with question, conditionId, category
 * @param {Array} headlines - Recent relevant headlines [{title, source, pubDate}]
 * @returns {Object} { prob, confidence, reasoning, keyFactors, source, cached }
 */
async function analyzeMarket(market, headlines = []) {
  if (!apiKey) return null;
  if (!market?.question) return null;

  const cacheKey = market.conditionId;

  // Return cached if still fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached, cached: true };
  }

  // Build the prompt
  const headlineText = headlines.length > 0
    ? `\n\nRelevant recent news:\n${headlines.slice(0, 8).map((h, i) =>
      `${i + 1}. [${h.source}] ${h.title} (${h.pubDate?.split('T')[0] || 'recent'})`
    ).join('\n')}`
    : '\n\nNo recent news available for this market. Use your general knowledge.';

  const userPrompt = `Market question: "${market.question}"
Category: ${market.category || 'unknown'}
${market.endDate ? `Resolution date: ${market.endDate}` : ''}${headlineText}

Estimate the probability this resolves YES. Output ONLY valid JSON.`;

  try {
    let result;
    if (provider === 'anthropic') {
      result = await callAnthropic(userPrompt);
    } else {
      result = await callOpenAI(userPrompt);
    }

    if (result) {
      const entry = {
        prob: result.probability,
        confidence: result.confidence || 'LOW',
        reasoning: result.reasoning || '',
        keyFactors: result.keyFactors || [],
        headlineCount: headlines.length,
        source: `${provider}/${model || PROVIDERS[provider].defaultModel}`,
        timestamp: Date.now(),
        analyzedAt: new Date().toISOString(),
      };

      cache.set(cacheKey, entry);
      saveCache();
      log.info('LLM', `Analyzed: "${market.question?.slice(0, 50)}" → ${(entry.prob * 100).toFixed(0)}% (${entry.confidence})`);
      return { ...entry, cached: false };
    }
  } catch (err) {
    log.warn('LLM', `Analysis failed for "${market.question?.slice(0, 40)}": ${err.message}`);
  }

  // Return stale cache as fallback
  if (cached) return { ...cached, cached: true, stale: true };
  return null;
}

async function callOpenAI(userPrompt) {
  const cfg = PROVIDERS[provider] || PROVIDERS.openai;
  const mdl = model || cfg.defaultModel;

  const resp = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers(apiKey),
    body: JSON.stringify({
      model: mdl,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  totalCalls++;
  totalTokens += data.usage?.total_tokens || 0;

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in response');

  return parseJSON(content);
}

async function callAnthropic(userPrompt) {
  const mdl = model || PROVIDERS.anthropic.defaultModel;

  const resp = await fetch(PROVIDERS.anthropic.url, {
    method: 'POST',
    headers: PROVIDERS.anthropic.headers(apiKey),
    body: JSON.stringify({
      model: mdl,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  totalCalls++;
  totalTokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No content in response');

  return parseJSON(content);
}

function parseJSON(text) {
  // Extract JSON even if wrapped in markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate
  if (typeof parsed.probability !== 'number' || parsed.probability < 0.01 || parsed.probability > 0.99) {
    throw new Error(`Invalid probability: ${parsed.probability}`);
  }

  return {
    probability: Math.round(parsed.probability * 1000) / 1000,
    confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidence) ? parsed.confidence : 'LOW',
    reasoning: String(parsed.reasoning || '').slice(0, 300),
    keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors.slice(0, 5).map(f => String(f).slice(0, 100)) : [],
  };
}

// ─── Match Validation (prevents garbage edges) ──────────────────────

const MATCH_VALIDATION_PROMPT = `You are a match-quality validator for prediction market questions. Given a POLYMARKET question and a CANDIDATE match from another platform, determine if they are asking about the SAME specific event or outcome.

Rules:
1. Output ONLY valid JSON: {"isMatch": true|false, "matchQuality": 0.0-1.0, "reason": "one sentence"}
2. matchQuality = 1.0 means identical questions about the same event
3. matchQuality = 0.0 means completely unrelated
4. CRITICAL: Questions about DIFFERENT people, teams, or thresholds are NOT matches even if the topic is similar
5. "Will X win?" and "Will Y win?" are NOT matches (different people)
6. "Will X happen by March?" and "Will X happen by December?" may be partial matches (~0.5)
7. Generic/broad questions that don't specifically address the Polymarket question score < 0.3
8. SPORTS EXCEPTION: If BOTH questions mention the SAME two teams (e.g., "Rockets vs Hornets" and "Rockets beat Hornets"), they are LIKELY the same game even if one omits the date. Score >= 0.7 for same-team matchups.
9. If the Polymarket question is about whether Team A beats Team B, and the candidate is about Team A vs Team B on a nearby date, score >= 0.6.
10. Be strict for non-sports, but lenient when the same specific teams/entities appear in both questions.`;

// Cache for match validations (separate from analysis cache)
const matchValidationCache = new Map();
const MATCH_CACHE_TTL = 86400000; // 24 hours — matches don't change quickly

/**
 * Use LLM to validate whether a candidate question from Metaculus/Manifold
 * actually matches a Polymarket market question.
 * 
 * This prevents the critical fuzzy-matching problem where keyword search
 * returns wrong questions (e.g., all 2028 presidential candidates matching
 * the same generic Metaculus question).
 *
 * @param {string} polymarketQuestion - The original Polymarket question
 * @param {string} candidateQuestion  - The candidate match from another platform
 * @param {string} candidateSource    - 'Metaculus' | 'Manifold' etc.
 * @returns {Object} { isMatch, matchQuality, reason, cached }
 */
async function validateMatch(polymarketQuestion, candidateQuestion, candidateSource = '') {
  if (!apiKey) return { isMatch: false, matchQuality: 0, reason: 'LLM not configured' };
  if (!polymarketQuestion || !candidateQuestion) return { isMatch: false, matchQuality: 0, reason: 'Missing questions' };

  // Quick exact-match shortcut
  const normPoly = polymarketQuestion.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normCand = candidateQuestion.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (normPoly === normCand) {
    return { isMatch: true, matchQuality: 1.0, reason: 'Exact match', cached: false };
  }

  // Check cache
  const cacheKey = `match_${normPoly.slice(0, 50)}_${normCand.slice(0, 50)}`;
  const cached = matchValidationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MATCH_CACHE_TTL) {
    return { ...cached, cached: true };
  }

  const userPrompt = `POLYMARKET question: "${polymarketQuestion}"
CANDIDATE match from ${candidateSource || 'another platform'}: "${candidateQuestion}"

Are these asking about the SAME specific event/outcome? Output ONLY valid JSON.`;

  try {
    const cfg = PROVIDERS[provider] || PROVIDERS.openai;
    const mdl = model || cfg.defaultModel;

    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers: cfg.headers(apiKey),
      body: JSON.stringify({
        model: mdl,
        messages: [
          { role: 'system', content: MATCH_VALIDATION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent validation
        max_tokens: 100,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      throw new Error(`${resp.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await resp.json();
    totalCalls++;
    totalTokens += data.usage?.total_tokens || 0;

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      isMatch: !!parsed.isMatch,
      matchQuality: typeof parsed.matchQuality === 'number'
        ? Math.max(0, Math.min(1, Math.round(parsed.matchQuality * 100) / 100))
        : (parsed.isMatch ? 0.8 : 0.1),
      reason: String(parsed.reason || '').slice(0, 200),
      timestamp: Date.now(),
    };

    matchValidationCache.set(cacheKey, result);
    saveCache();

    log.info('LLM', `Match validation: "${polymarketQuestion.slice(0, 35)}" vs "${candidateQuestion.slice(0, 35)}" → ${result.isMatch ? '✅' : '❌'} (${result.matchQuality})`);

    return { ...result, cached: false };
  } catch (err) {
    log.warn('LLM', `Match validation failed: ${err.message}`);
    // Fail closed — if we can't validate, treat as non-match
    return { isMatch: false, matchQuality: 0, reason: `Validation error: ${err.message}`, cached: false };
  }
}

// ─── Batch Analysis (for scan cycle) ─────────────────────────────────

/**
 * Analyze the top N markets that have the most potential edge.
 * Prioritizes markets where we already have headlines or bookmaker data.
 * Rate-limited to avoid burning API credits.
 */
async function batchAnalyze(markets, headlines = [], maxCalls = 5) {
  if (!apiKey) return [];

  const results = [];
  let callsMade = 0;

  // Priority: markets not yet cached or with stale cache
  const needsAnalysis = markets.filter(m => {
    const cached = cache.get(m.conditionId);
    return !cached || Date.now() - cached.timestamp > CACHE_TTL;
  });

  // Sort by volume (analyze popular markets first)
  needsAnalysis.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));

  for (const market of needsAnalysis.slice(0, maxCalls)) {
    if (callsMade >= maxCalls) break;

    // Find relevant headlines for this market
    const marketHeadlines = findRelevantHeadlines(market.question, headlines);

    const result = await analyzeMarket(market, marketHeadlines);
    if (result) {
      results.push({
        conditionId: market.conditionId,
        market: market.question,
        ...result,
      });
      callsMade++;
    }

    // Small delay between calls to avoid rate limits
    if (callsMade < maxCalls) await new Promise(r => setTimeout(r, 500));
  }

  if (callsMade > 0) {
    log.info('LLM', `Batch analysis: ${callsMade} markets analyzed, ${results.length} results`);
  }

  return results;
}

/**
 * Simple headline-to-market matching using keyword overlap.
 */
function findRelevantHeadlines(question, headlines) {
  if (!question || !headlines?.length) return [];

  const qWords = new Set(
    question.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 4)
  );

  return headlines
    .map(h => {
      const hWords = (h.title || '').toLowerCase().split(/\s+/);
      const overlap = hWords.filter(w => qWords.has(w)).length;
      return { ...h, overlap };
    })
    .filter(h => h.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8);
}

// ─── Get cached estimate for a market ────────────────────────────────

function getCachedEstimate(conditionId) {
  return cache.get(conditionId) || null;
}

function getAllCached() {
  const entries = [];
  for (const [conditionId, data] of cache) {
    entries.push({ conditionId, ...data });
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Status ──────────────────────────────────────────────────────────

function getStatus() {
  return {
    configured: !!apiKey,
    provider,
    model: model || PROVIDERS[provider]?.defaultModel,
    cachedAnalyses: cache.size,
    totalCalls,
    totalTokens,
    estimatedCost: provider === 'anthropic'
      ? `~$${(totalTokens * 0.0000008).toFixed(4)}`
      : `~$${(totalTokens * 0.00000015).toFixed(4)}`,
  };
}

module.exports = {
  configure,
  isConfigured,
  analyzeMarket,
  validateMatch,
  batchAnalyze,
  getCachedEstimate,
  getAllCached,
  getStatus,
};
