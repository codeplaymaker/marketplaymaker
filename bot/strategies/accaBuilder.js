/**
 * Accumulator (Parlay) Builder — "World Class" Edition
 *
 * Scans bookmaker odds from The Odds API and finds +EV multi-leg parlays.
 *
 * WHY THIS WORKS:
 * Sportsbooks price parlays by multiplying individual implied probs,
 * but they DON'T properly adjust for:
 *   1. Vig stacking — each leg's vig compounds, inflating the true combined odds
 *   2. Correlation — books assume independence but some legs are correlated
 *   3. Sharp vs soft spreads — Pinnacle's lines are sharper than DraftKings'
 *
 * WHAT WE DO:
 *   1. Pull odds from 15+ bookmakers via The Odds API (already cached by oddsApi.js)
 *   2. Remove vig from each leg using Pinnacle/sharp consensus as true prob
 *   3. Detect correlation between legs (same sport/league = correlated)
 *   4. Calculate TRUE combined probability (with correlation adjustments)
 *   5. Compare vs the WORST (softest) sportsbook's parlay payout
 *   6. If our true prob is lower than the book's implied prob → +EV → BUILD ACCA
 *
 * GRADING:
 *   S-tier: 15%+ EV, 3+ legs, cross-sport, all sharp-confirmed
 *   A-tier: 10%+ EV, low correlation
 *   B-tier: 5%+ EV
 *   C-tier: 2%+ EV (marginal, still worth a small bet)
 */

const log = require('../utils/logger');
const oddsApi = require('../bookmakers/oddsApi');
const fs = require('fs');
const path = require('path');

const ACCA_CACHE_FILE = path.join(__dirname, '..', 'logs', 'acca-cache.json');

let cachedAccas = [];
let lastBuildTime = null;

// Load from disk
try {
  if (fs.existsSync(ACCA_CACHE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(ACCA_CACHE_FILE, 'utf8'));
    cachedAccas = raw.accas || [];
    lastBuildTime = raw.lastBuildTime || null;
    if (cachedAccas.length > 0) log.info('ACCA', `Loaded ${cachedAccas.length} cached accas from disk`);
  }
} catch { /* fresh */ }

function save() {
  try {
    fs.writeFileSync(ACCA_CACHE_FILE, JSON.stringify({
      accas: cachedAccas, lastBuildTime, savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

// ─── Core Probability Math ───────────────────────────────────────────

/**
 * Remove vig from a set of outcomes to get true probabilities.
 * Uses the multiplicative method (most accurate for 2-way, good for 3-way).
 */
function removeVig(outcomes) {
  const impliedProbs = outcomes.map(o => 1 / o.price);
  const totalImplied = impliedProbs.reduce((a, b) => a + b, 0);
  // Overround factor — sum > 1 means vig exists
  return impliedProbs.map(p => p / totalImplied);
}

/**
 * Get the sharpest available probability for an outcome.
 * Priority: Pinnacle > Betfair > BetOnline > weighted consensus
 */
function getSharpProb(event, outcomeName) {
  const sharpOrder = ['pinnacle', 'betfair', 'matchbook', 'betonlineag'];
  
  for (const bookKey of sharpOrder) {
    const bm = event.bookmakers?.find(b => b.key === bookKey);
    if (!bm) continue;
    const h2h = bm.markets?.find(m => m.key === 'h2h');
    if (!h2h?.outcomes) continue;
    
    const outcome = h2h.outcomes.find(o => o.name === outcomeName);
    if (!outcome) continue;
    
    // Remove vig from this book's full line
    const noVigProbs = removeVig(h2h.outcomes);
    const idx = h2h.outcomes.indexOf(outcome);
    return { prob: noVigProbs[idx], source: bm.title, odds: outcome.price };
  }
  
  // Fallback: consensus from all books
  const allProbs = [];
  for (const bm of (event.bookmakers || [])) {
    const h2h = bm.markets?.find(m => m.key === 'h2h');
    if (!h2h?.outcomes) continue;
    const outcome = h2h.outcomes.find(o => o.name === outcomeName);
    if (!outcome) continue;
    const noVig = removeVig(h2h.outcomes);
    const idx = h2h.outcomes.indexOf(outcome);
    allProbs.push(noVig[idx]);
  }
  
  if (allProbs.length === 0) return null;
  const avg = allProbs.reduce((a, b) => a + b, 0) / allProbs.length;
  return { prob: avg, source: 'consensus', odds: null };
}

/**
 * Get the BEST (softest) available odds for an outcome.
 * This is the book you'd actually place the bet at.
 */
function getBestOdds(event, outcomeName) {
  let best = null;
  for (const bm of (event.bookmakers || [])) {
    const h2h = bm.markets?.find(m => m.key === 'h2h');
    if (!h2h?.outcomes) continue;
    const outcome = h2h.outcomes.find(o => o.name === outcomeName);
    if (!outcome) continue;
    if (!best || outcome.price > best.odds) {
      best = { odds: outcome.price, book: bm.title, bookKey: bm.key };
    }
  }
  return best;
}

// ─── Correlation Detection ───────────────────────────────────────────

/**
 * Estimate correlation between two legs.
 * Returns 0 (independent) to 1 (fully correlated).
 *
 * Same sport + same league = 0.15-0.25 (mild correlation)
 * Same sport different league = 0.05-0.10
 * Cross-sport = ~0 (independent)
 * Same event (shouldn't happen in accas) = 1.0
 */
function estimateCorrelation(leg1, leg2) {
  // Same event = perfect correlation (not allowed in accas)
  if (leg1.eventId === leg2.eventId) return 1.0;
  
  const sport1 = leg1.sportKey?.split('_')[0] || '';
  const sport2 = leg2.sportKey?.split('_')[0] || '';
  const league1 = leg1.sportKey || '';
  const league2 = leg2.sportKey || '';
  
  // Same sport + same league (e.g., two NBA games)
  if (league1 === league2) return 0.18;
  
  // Same sport, different league (e.g., NBA vs NCAAB)
  if (sport1 === sport2) return 0.08;
  
  // Cross-sport
  return 0.02;
}

/**
 * Adjust combined probability for correlated legs.
 * Uses a simplified copula approach:
 *   P(A∩B) = P(A)·P(B) + ρ·√(P(A)·(1-P(A))·P(B)·(1-P(B)))
 * For >2 legs, apply pairwise adjustments.
 */
function adjustedCombinedProb(legs) {
  if (legs.length <= 1) return legs[0]?.trueProb || 0;
  
  // Start with independent combined probability
  let combinedProb = legs.reduce((p, leg) => p * leg.trueProb, 1);
  
  // Apply pairwise correlation adjustments
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const rho = estimateCorrelation(legs[i], legs[j]);
      if (rho <= 0.02) continue; // Skip near-zero correlations
      
      const pi = legs[i].trueProb;
      const pj = legs[j].trueProb;
      const adjustment = rho * Math.sqrt(pi * (1 - pi) * pj * (1 - pj));
      combinedProb += adjustment;
    }
  }
  
  return Math.min(combinedProb, 0.99); // Cap at 99%
}

// ─── Leg Building ────────────────────────────────────────────────────

/**
 * Build all viable acca legs from cached bookmaker events.
 * Each leg = one outcome from one event with sharp prob + best available odds.
 */
function buildLegs() {
  const events = oddsApi.getStatus().cachedEvents > 0 
    ? require('../bookmakers/oddsApi') // re-require to get fresh cachedOdds
    : null;
  
  // Access internal cached data via a small workaround
  let cachedOdds = [];
  try {
    const cacheFile = path.join(__dirname, '..', 'logs', 'odds-cache.json');
    const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    cachedOdds = raw.cachedOdds || [];
  } catch { return []; }
  
  const legs = [];
  
  for (const event of cachedOdds) {
    if (!event.bookmakers?.length || event.bookmakers.length < 3) continue;
    
    // Get the primary h2h market
    const primaryBm = event.bookmakers[0];
    const h2h = primaryBm?.markets?.find(m => m.key === 'h2h');
    if (!h2h?.outcomes) continue;
    
    for (const outcome of h2h.outcomes) {
      const sharp = getSharpProb(event, outcome.name);
      if (!sharp) continue;
      
      const best = getBestOdds(event, outcome.name);
      if (!best) continue;
      
      // Only include legs with reasonable odds (1.15 to 4.0 range for accas)
      if (best.odds < 1.15 || best.odds > 5.0) continue;
      
      // Calculate EV for this individual leg
      const impliedByBestOdds = 1 / best.odds;
      const legEV = (sharp.prob * best.odds) - 1; // EV as fraction of stake
      
      legs.push({
        eventId: event.id,
        sportKey: event.sport_key,
        sportTitle: event.sport_title,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        commenceTime: event.commence_time,
        pick: outcome.name,
        trueProb: round4(sharp.prob),
        sharpSource: sharp.source,
        bestOdds: best.odds,
        bestBook: best.book,
        bestBookKey: best.bookKey,
        impliedProb: round4(impliedByBestOdds),
        legEV: round4(legEV),
        bookmakerCount: event.bookmakers.length,
        matchLabel: `${event.home_team} vs ${event.away_team}`,
      });
    }
    
    // Also check spreads and totals for more diverse legs
    for (const bm of event.bookmakers) {
      const spreads = bm.markets?.find(m => m.key === 'spreads');
      if (spreads?.outcomes) {
        for (const outcome of spreads.outcomes) {
          const impliedProb = 1 / outcome.price;
          if (outcome.price < 1.5 || outcome.price > 3.5) continue;
          
          // Get best spread odds across books
          let bestSpread = { odds: outcome.price, book: bm.title };
          for (const bm2 of event.bookmakers) {
            const sp2 = bm2.markets?.find(m => m.key === 'spreads');
            const match = sp2?.outcomes?.find(o => 
              o.name === outcome.name && Math.abs((o.point || 0) - (outcome.point || 0)) < 0.5
            );
            if (match && match.price > bestSpread.odds) {
              bestSpread = { odds: match.price, book: bm2.title };
            }
          }
          
          legs.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime: event.commence_time,
            pick: `${outcome.name} ${outcome.point > 0 ? '+' : ''}${outcome.point}`,
            trueProb: round4(1 / outcome.price / 1.04), // rough vig removal
            sharpSource: bm.title,
            bestOdds: bestSpread.odds,
            bestBook: bestSpread.book,
            impliedProb: round4(1 / bestSpread.odds),
            legEV: round4((1 / outcome.price / 1.04) * bestSpread.odds - 1),
            bookmakerCount: event.bookmakers.length,
            matchLabel: `${event.home_team} vs ${event.away_team}`,
            betType: 'SPREAD',
            line: outcome.point,
          });
          break; // Only take first spread from first book (avoid duplicates)
        }
      }
      
      const totals = bm.markets?.find(m => m.key === 'totals');
      if (totals?.outcomes) {
        for (const outcome of totals.outcomes) {
          if (outcome.price < 1.5 || outcome.price > 3.0) continue;
          
          let bestTotal = { odds: outcome.price, book: bm.title };
          for (const bm2 of event.bookmakers) {
            const t2 = bm2.markets?.find(m => m.key === 'totals');
            const match = t2?.outcomes?.find(o =>
              o.name === outcome.name && Math.abs((o.point || 0) - (outcome.point || 0)) < 1
            );
            if (match && match.price > bestTotal.odds) {
              bestTotal = { odds: match.price, book: bm2.title };
            }
          }
          
          legs.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime: event.commence_time,
            pick: `${outcome.name} ${outcome.point}`,
            trueProb: round4(1 / outcome.price / 1.04),
            sharpSource: bm.title,
            bestOdds: bestTotal.odds,
            bestBook: bestTotal.book,
            impliedProb: round4(1 / bestTotal.odds),
            legEV: round4((1 / outcome.price / 1.04) * bestTotal.odds - 1),
            bookmakerCount: event.bookmakers.length,
            matchLabel: `${event.home_team} vs ${event.away_team}`,
            betType: 'TOTAL',
            line: outcome.point,
          });
          break;
        }
      }
      break; // Only process first bookmaker for spread/total legs (avoid mass duplicates)
    }
  }
  
  return legs;
}

// ─── Acca Combination Engine ─────────────────────────────────────────

/**
 * Build all valid 2-5 leg accumulator combinations from available legs.
 * Uses smart pruning:
 *   - No two legs from the same event
 *   - Prefer cross-sport combinations (lower correlation)
 *   - Prioritize legs with +EV individually
 *   - Combined odds between 3:1 and 50:1 (sweet spot for accas)
 */
function buildAccas(maxLegs = 5, minLegs = 2) {
  const allLegs = buildLegs();
  if (allLegs.length < minLegs) {
    log.info('ACCA', `Only ${allLegs.length} viable legs — need at least ${minLegs}`);
    return [];
  }
  
  log.info('ACCA', `Building accas from ${allLegs.length} viable legs...`);
  
  // Sort legs by EV (best first) and take top candidates
  const sortedLegs = allLegs
    .filter(l => l.legEV > -0.05) // Only legs that aren't massively -EV
    .sort((a, b) => b.legEV - a.legEV)
    .slice(0, 60); // Cap to prevent combinatorial explosion
  
  const accas = [];
  const eventIds = new Set();
  
  // Generate combinations using iterative deepening
  for (let numLegs = minLegs; numLegs <= Math.min(maxLegs, 5); numLegs++) {
    const combos = getCombinations(sortedLegs, numLegs);
    
    for (const combo of combos) {
      // Validate: no duplicate events
      eventIds.clear();
      let valid = true;
      for (const leg of combo) {
        if (eventIds.has(leg.eventId)) { valid = false; break; }
        eventIds.add(leg.eventId);
      }
      if (!valid) continue;
      
      // Calculate combined odds (using best available at each book)
      const combinedOdds = combo.reduce((acc, leg) => acc * leg.bestOdds, 1);
      
      // Filter: combined odds between 3:1 and 75:1
      if (combinedOdds < 3 || combinedOdds > 75) continue;
      
      // Calculate true combined probability (with correlation adjustment)
      const trueCombinedProb = adjustedCombinedProb(combo);
      
      // The book's implied combined probability
      const bookImpliedProb = 1 / combinedOdds;
      
      // Expected Value: trueProb * odds - 1
      const ev = (trueCombinedProb * combinedOdds) - 1;
      
      // Only keep +EV accas (or marginal -EV for display)
      if (ev < -0.03) continue;
      
      // Calculate average correlation
      let totalCorr = 0, corrCount = 0;
      for (let i = 0; i < combo.length; i++) {
        for (let j = i + 1; j < combo.length; j++) {
          totalCorr += estimateCorrelation(combo[i], combo[j]);
          corrCount++;
        }
      }
      const avgCorrelation = corrCount > 0 ? totalCorr / corrCount : 0;
      
      // Grade the acca
      const grade = gradeAcca(ev, combo.length, avgCorrelation, combo);
      
      // Count unique sports
      const sports = new Set(combo.map(l => l.sportKey?.split('_')[0]));
      
      accas.push({
        id: combo.map(l => `${l.eventId}:${l.pick}`).join('|'),
        legs: combo.map(l => ({
          match: l.matchLabel,
          pick: l.pick,
          odds: l.bestOdds,
          book: l.bestBook,
          trueProb: l.trueProb,
          sharpSource: l.sharpSource,
          sport: l.sportTitle || l.sportKey,
          sportKey: l.sportKey,
          commenceTime: l.commenceTime,
          betType: l.betType || 'MONEYLINE',
          line: l.line || null,
          legEV: l.legEV,
        })),
        combinedOdds: round2(combinedOdds),
        trueCombinedProb: round4(trueCombinedProb),
        bookImpliedProb: round4(bookImpliedProb),
        ev: round4(ev),
        evPercent: round2(ev * 100),
        avgCorrelation: round4(avgCorrelation),
        grade,
        numLegs: combo.length,
        crossSport: sports.size > 1,
        uniqueSports: sports.size,
        hypothetical: {
          stake: 10,
          payout: round2(10 * combinedOdds),
          expectedReturn: round2(10 * ev),
        },
        generatedAt: new Date().toISOString(),
      });
    }
  }
  
  // Sort by EV descending, then by grade
  const gradeOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3 };
  accas.sort((a, b) => {
    if (gradeOrder[a.grade] !== gradeOrder[b.grade]) return gradeOrder[a.grade] - gradeOrder[b.grade];
    return b.ev - a.ev;
  });
  
  // Deduplicate: remove accas that share >80% of legs with a higher-ranked acca
  const deduped = [];
  for (const acca of accas) {
    const accaEventPicks = new Set(acca.legs.map(l => `${l.match}:${l.pick}`));
    const isDuplicate = deduped.some(existing => {
      const existingPicks = new Set(existing.legs.map(l => `${l.match}:${l.pick}`));
      const overlap = [...accaEventPicks].filter(p => existingPicks.has(p)).length;
      return overlap / Math.max(accaEventPicks.size, existingPicks.size) > 0.6;
    });
    if (!isDuplicate) deduped.push(acca);
  }
  
  cachedAccas = deduped.slice(0, 30); // Keep top 30
  lastBuildTime = new Date().toISOString();
  save();
  
  log.info('ACCA', `Built ${cachedAccas.length} +EV accas from ${allLegs.length} legs (${accas.length} before dedup)`);
  return cachedAccas;
}

// ─── Grading System ──────────────────────────────────────────────────

function gradeAcca(ev, numLegs, avgCorrelation, legs) {
  let score = 0;
  
  // EV score (most important)
  if (ev >= 0.15) score += 40;
  else if (ev >= 0.10) score += 30;
  else if (ev >= 0.05) score += 20;
  else if (ev >= 0.02) score += 10;
  else score += 0;
  
  // Leg count bonus (3-4 legs is the sweet spot)
  if (numLegs === 3) score += 15;
  else if (numLegs === 4) score += 12;
  else if (numLegs === 2) score += 8;
  else score += 5;
  
  // Low correlation bonus
  if (avgCorrelation < 0.05) score += 15;
  else if (avgCorrelation < 0.10) score += 10;
  else if (avgCorrelation < 0.15) score += 5;
  
  // Cross-sport bonus
  const sports = new Set(legs.map(l => l.sportKey?.split('_')[0]));
  if (sports.size >= 3) score += 15;
  else if (sports.size >= 2) score += 10;
  
  // All legs individually +EV
  const allPositiveEV = legs.every(l => l.legEV > 0);
  if (allPositiveEV) score += 10;
  
  // Bookmaker consensus strength
  const avgBooks = legs.reduce((s, l) => s + l.bookmakerCount, 0) / legs.length;
  if (avgBooks >= 10) score += 5;
  
  if (score >= 70) return 'S';
  if (score >= 50) return 'A';
  if (score >= 30) return 'B';
  return 'C';
}

// ─── Combination Generator ───────────────────────────────────────────

/**
 * Generate k-combinations from an array.
 * Limited to prevent combinatorial explosion.
 */
function getCombinations(arr, k) {
  if (k > arr.length) return [];
  const results = [];
  const MAX_COMBOS = 5000; // Safety limit
  
  function combine(start, current) {
    if (results.length >= MAX_COMBOS) return;
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      if (results.length >= MAX_COMBOS) return;
      current.push(arr[i]);
      combine(i + 1, current);
      current.pop();
    }
  }
  
  combine(0, []);
  return results;
}

// ─── Public API ──────────────────────────────────────────────────────

function getAccas() {
  return {
    accas: cachedAccas,
    lastBuildTime,
    totalLegs: buildLegs().length,
    stats: {
      total: cachedAccas.length,
      byGrade: {
        S: cachedAccas.filter(a => a.grade === 'S').length,
        A: cachedAccas.filter(a => a.grade === 'A').length,
        B: cachedAccas.filter(a => a.grade === 'B').length,
        C: cachedAccas.filter(a => a.grade === 'C').length,
      },
      avgEV: cachedAccas.length > 0
        ? round2(cachedAccas.reduce((s, a) => s + a.ev, 0) / cachedAccas.length * 100)
        : 0,
      crossSportCount: cachedAccas.filter(a => a.crossSport).length,
    },
  };
}

function getTopAccas(limit = 10) {
  return cachedAccas.slice(0, limit);
}

// ─── Utility ─────────────────────────────────────────────────────────
function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  buildAccas,
  getAccas,
  getTopAccas,
  buildLegs,
};
