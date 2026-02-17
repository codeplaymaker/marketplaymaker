/**
 * Search Utilities — Smart Search Term Extraction
 *
 * Generates optimized search queries for cross-platform matching.
 * Instead of passing the full question to Metaculus/Manifold/Kalshi,
 * we extract key entities and try multiple search strategies.
 *
 * This directly addresses the #1 blocker: 76% single-source edges
 * caused by poor cross-platform match rates (Metaculus 31%, Manifold 6%).
 */

const STOP_WORDS = new Set([
  // Articles & prepositions
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with',
  'from', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'about', 'against', 'within',
  // Common question words
  'will', 'would', 'could', 'should', 'does', 'did', 'has', 'have', 'had',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do',
  // Conjunctions & misc
  'and', 'or', 'but', 'nor', 'not', 'no', 'yes', 'than', 'that', 'this',
  'these', 'those', 'which', 'who', 'whom', 'whose', 'what', 'when',
  'where', 'why', 'how', 'if', 'then', 'else', 'so', 'just', 'also',
  'any', 'each', 'every', 'all', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'only', 'own', 'same', 'very', 'can', 'may', 'might',
  // Prediction market filler
  'happen', 'occur', 'take', 'place', 'result', 'end', 'become',
  'whether', 'either', 'neither',
]);

/**
 * Extract key terms from a prediction market question.
 * Keeps named entities (capitalized words), numbers, and important nouns.
 *
 * @param {string} question - Full question text
 * @returns {string[]} Array of search strategies (most specific → broadest)
 */
function extractSearchStrategies(question) {
  if (!question) return [];

  // Clean up the question
  const clean = question
    .replace(/\?/g, '')
    .replace(/^Will\s+/i, '')
    .replace(/[""'']/g, '')
    .trim();

  const strategies = [];

  // ─── Strategy 1: Key entities + topic (short, targeted) ────────────
  // Extract words that are likely named entities or important terms
  const words = clean.split(/\s+/);
  const keyTerms = [];
  const allCleanWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!lower || lower.length < 2) continue;

    allCleanWords.push(word.replace(/[^a-zA-Z0-9'-]/g, ''));

    // Named entities: capitalized words (not at sentence start unless they look like names)
    const isCapitalized = /^[A-Z]/.test(word) && !/^(The|A|An|In|On|At|To|For|By|With|From)$/i.test(word);
    // Numbers (years, amounts, thresholds)
    const isNumber = /\d/.test(word);
    // Long meaningful words that aren't stop words
    const isMeaningful = lower.length >= 4 && !STOP_WORDS.has(lower);

    if (isCapitalized || isNumber) {
      keyTerms.push(word.replace(/[^a-zA-Z0-9'-]/g, ''));
    } else if (isMeaningful && keyTerms.length < 6) {
      keyTerms.push(lower);
    }
  }

  // Strategy 1: Just key entities (3-6 terms) — best for cross-platform search
  if (keyTerms.length >= 2) {
    strategies.push(keyTerms.slice(0, 6).join(' '));
  }

  // ─── Strategy 2: Medium — cleaned question without filler ──────────
  const mediumTerms = allCleanWords.filter(w => {
    const lower = w.toLowerCase();
    return lower.length >= 3 && !STOP_WORDS.has(lower);
  });
  if (mediumTerms.length >= 2) {
    const medium = mediumTerms.slice(0, 8).join(' ');
    if (!strategies.includes(medium)) {
      strategies.push(medium);
    }
  }

  // ─── Strategy 3: Full cleaned question (original approach) ─────────
  const full = clean;
  if (!strategies.includes(full)) {
    strategies.push(full);
  }

  return strategies;
}

/**
 * Extract just the core topic from a question (2-4 words max).
 * Used for broad fallback searches.
 *
 * @param {string} question
 * @returns {string} Core topic string
 */
function extractCoreTopic(question) {
  if (!question) return '';

  const clean = question
    .replace(/\?/g, '')
    .replace(/^Will\s+/i, '')
    .trim();

  const words = clean.split(/\s+/);
  const entities = [];

  for (const word of words) {
    const isCapitalized = /^[A-Z]/.test(word);
    const isNumber = /^\d{4}$/.test(word); // Years
    if (isCapitalized || isNumber) {
      entities.push(word.replace(/[^a-zA-Z0-9'-]/g, ''));
      if (entities.length >= 4) break;
    }
  }

  return entities.length >= 2 ? entities.join(' ') : clean.split(/\s+/).slice(0, 4).join(' ');
}

/**
 * Determine if a market question is likely to have cross-platform matches.
 * Used to prioritize which markets to analyze.
 *
 * Topics more likely to match across platforms:
 * - US elections (near-term)
 * - Economic indicators (GDP, inflation, rates)
 * - Geopolitics (wars, treaties)
 * - Technology (AI, space)
 * - Sports (major events)
 *
 * Topics LESS likely to match:
 * - Obscure primary candidates (2028 GOP primary 47th candidate)
 * - Social media metrics
 * - Very specific one-off events
 *
 * @param {Object} market - { question, category, endDate, volume }
 * @returns {number} 0-1 score of cross-platform match likelihood
 */
function crossPlatformLikelihood(market) {
  if (!market?.question) return 0;

  const q = market.question.toLowerCase();
  let score = 0.5; // baseline

  // ─── Boost: Topics with high cross-platform coverage ─────────────
  // NOW INCLUDES sports (via bookmaker odds) and crypto (via CoinGecko)
  const highCoverage = [
    // Sports — covered by The Odds API bookmaker consensus
    { pattern: /nba|nfl|nhl|mlb|epl|premier league|la liga|champions league|serie a|bundesliga|mls|ufc|mma|boxing/i, boost: 0.4 },
    { pattern: /super bowl|world cup|olympics|world series|nba finals|stanley cup/i, boost: 0.35 },
    { pattern: /win on \d{4}|beat |vs\.|tonight|game \d/i, boost: 0.35 },
    // Crypto — covered by CoinGecko market data
    { pattern: /bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge|xrp|crypto.*\$/i, boost: 0.35 },
    { pattern: /up or down/i, boost: 0.3 }, // Daily crypto direction bets
    { pattern: /\$\d+[kK]|\$\d{4,}/i, boost: 0.25 }, // Price targets
    // Economics — Metaculus/Manifold cover well
    { pattern: /gdp|inflation|interest rate|fed|federal reserve|recession/i, boost: 0.35 },
    // Geopolitics — Metaculus/Manifold cover
    { pattern: /war|invasion|ceasefire|nato|ukraine|russia|china|iran/i, boost: 0.3 },
    // US Politics — major topics on Metaculus/Manifold
    { pattern: /president|presidential election|white house/i, boost: 0.3 },
    { pattern: /supreme court|congress|senate|house of rep/i, boost: 0.25 },
    // Tech — Manifold covers
    { pattern: /ai |artificial intelligence|openai|gpt|chatgpt/i, boost: 0.25 },
    { pattern: /elon musk|trump|biden|harris/i, boost: 0.2 },
    { pattern: /climate|temperature|emissions/i, boost: 0.2 },
    { pattern: /spacex|nasa|mars|moon/i, boost: 0.2 },
  ];

  let bestBoost = 0;
  for (const { pattern, boost } of highCoverage) {
    if (pattern.test(q)) {
      bestBoost = Math.max(bestBoost, boost);
      // Also add smaller boosts for additional matches
      score += boost * 0.3;
    }
  }
  score += bestBoost * 0.7; // Best match gets 70% weight

  // ─── Penalty: Topics unlikely to have cross-platform matches ─────
  const lowCoverage = [
    { pattern: /2028|2029|2030|2031|2032/i, penalty: 0.3 },
    { pattern: /nomination|primary.*202[89]/i, penalty: 0.25 },
    { pattern: /tweet|follower|subscriber|tiktok|instagram/i, penalty: 0.2 },
    { pattern: /meme|coin.*launch|token/i, penalty: 0.15 },
  ];

  for (const { pattern, penalty } of lowCoverage) {
    if (pattern.test(q)) {
      score -= penalty;
      break;
    }
  }

  // ─── Resolution date factor ──────────────────────────────────────
  if (market.endDate) {
    const daysToResolution = (new Date(market.endDate).getTime() - Date.now()) / 86400000;
    if (daysToResolution <= 30) score += 0.15;      // Resolves soon → more coverage
    else if (daysToResolution <= 90) score += 0.1;
    else if (daysToResolution <= 180) score += 0.05;
    else if (daysToResolution > 365) score -= 0.2;  // Far future → less coverage
  }

  return Math.max(0, Math.min(1, score));
}

module.exports = {
  extractSearchStrategies,
  extractCoreTopic,
  crossPlatformLikelihood,
  STOP_WORDS,
};
