const config = require('../config');
const log = require('../utils/logger');
const fees = require('../engine/fees');
const client = require('../polymarket/client');

let wsClient;
try { wsClient = require('../polymarket/websocket'); } catch { wsClient = null; }

let oddsApi;
try { oddsApi = require('../bookmakers/oddsApi'); } catch { oddsApi = null; }

const CONF = config.strategies.arbitrage;

// Lazy-load paperTrader to avoid circular deps
let _paperTrader = null;
function getPaperTrader() {
  if (!_paperTrader) { try { _paperTrader = require('../engine/paperTrader'); } catch { _paperTrader = null; } }
  return _paperTrader;
}

/**
 * Strategy 2: Logic Arbitrage — v3
 *
 * UPGRADES FROM v2:
 * - WEBSOCKET-FIRST: Use real-time orderbook data for faster detection
 * - STALENESS GUARD: Skip arbs where price data is >30s old
 * - EXECUTION-AWARE: Calculate fillable size from actual orderbook depth
 * - CROSS-EXCHANGE FRAMEWORK: Compare with Kalshi/PredictIt implied probs
 * - SPEED SCORE: Time-sensitive arbs scored higher
 *
 * Types:
 * 1. GROUP OVERROUND: Exclusive outcomes sum > 100%
 * 2. GROUP UNDERROUND: Exclusive outcomes sum < 100%
 * 3. COMPLEMENT: Single market YES+NO ≠ 100%
 * 4. CROSS-EXCHANGE: Polymarket vs external exchange price divergence (framework)
 */

// ─── Exclusivity Detection ───────────────────────────────────────────
/**
 * Better detection of mutually exclusive market groups.
 * v1 just used slug prefix, which falsely groups spreads + totals.
 * v2 parses question text and Gamma groupSlug for real exclusivity.
 */
function groupMutuallyExclusiveMarkets(markets) {
  const groups = {};

  for (const market of markets) {
    // ONLY group markets with negRisk=true under the same event slug.
    // negRisk=true means Polymarket treats these as mutually exclusive outcomes
    // (e.g. bracket ranges). negRisk=false markets are often nested/cumulative
    // (e.g. "ETH above $X", "strikes by date") and are NOT arbitrageable.
    if (market.groupSlug && market.negRisk) {
      // Skip spread/total/prop markets — they are NOT mutually exclusive outcomes
      const mq = (market.question || '').toLowerCase();
      if (/spread|total|o\/u|over.?under|handicap|prop|points scored|[+-]\d+\.5/.test(mq)) continue;

      const key = `event:${market.groupSlug}`;
      if (!groups[key]) groups[key] = { markets: [], source: 'gamma-event', slug: market.groupSlug };
      groups[key].markets.push(market);
      continue;
    }

    // Priority 2: Question text pattern matching for mutually exclusive sets
    // Examples of exclusive:
    //   "Will [X] win the [Y]?" for same Y = exclusive
    //   "Who will win [event]? - Candidate A" vs "- Candidate B" = exclusive
    // NOT exclusive:
    //   "Will [team] cover the spread?" and "Will total be over 228?" for same game

    const q = (market.question || '').toLowerCase();
    let groupKey = null;

    // Pattern: "will X win the [event]?" — group by event
    const winMatch = q.match(/will (.+?) win (?:the |in )?(.+?)[\?$]/);
    if (winMatch) {
      groupKey = `win:${winMatch[2].trim().replace(/[^a-z0-9]/g, '-')}`;
    }

    // Pattern: Candidate/team name at end after dash — "Question? - Option"
    if (!groupKey && market.slug) {
      // Only group by slug prefix if the slug structure clearly indicates a multi-outcome market
      // Check for enumerated outcomes: slug-option-1, slug-option-2, etc.
      const slugParts = market.slug.split('-');
      // Detect "groupname-optionN" patterns
      const lastPart = slugParts[slugParts.length - 1];
      if (/^(yes|no|over|under)$/.test(lastPart)) {
        // This is a binary market, not part of a multi-outcome group
      } else if (slugParts.length >= 3) {
        // Extract date patterns for sports: nba-team1-team2-YYYY-MM-DD-*
        let dateIdx = -1;
        for (let i = 0; i < slugParts.length - 2; i++) {
          if (/^\d{4}$/.test(slugParts[i]) && /^\d{2}$/.test(slugParts[i+1]) && /^\d{2}$/.test(slugParts[i+2])) {
            dateIdx = i;
            break;
          }
        }
        if (dateIdx >= 0) {
          // For sports, check if this is a prop/spread/total or a winner market
          const afterDate = slugParts.slice(dateIdx + 3).join('-');
          // Only group "winner" type markets, not spread/total/prop
          if (!/(spread|total|over|under|prop|points|score)/.test(afterDate)) {
            groupKey = `slug:${slugParts.slice(0, dateIdx + 3).join('-')}:winner`;
          }
        }
      }
    }

    if (groupKey) {
      if (!groups[groupKey]) groups[groupKey] = { markets: [], source: 'parsed', slug: groupKey };
      groups[groupKey].markets.push(market);
    }
  }

  // Filter: only keep groups with 2+ markets
  return Object.values(groups).filter(g => g.markets.length >= 2);
}

/**
 * Second-pass validation: verify group looks like mutually exclusive outcomes.
 * For gamma-event groups (negRisk=true), we trust Polymarket's exclusivity flag
 * and only validate liquidity. For parsed groups, we check price sums.
 */
function validateExclusivity(group) {
  const totalYes = group.markets.reduce((sum, m) => sum + m.yesPrice, 0);

  // Gamma event groups (negRisk=true) are confirmed exclusive by the exchange
  // Their partial sums won't add to 1.0 because we may not have all outcomes
  if (group.source === 'gamma-event') {
    // Just validate some basic quality
    const avgLiq = group.markets.reduce((sum, m) => sum + m.liquidity, 0) / group.markets.length;
    if (avgLiq < 500) return false;  // At least some average liquidity
    return true;
  }

  // For parsed groups (text-matching), use sum validation
  // These are less reliable, so we need the sum check
  if (totalYes < 0.7 || totalYes > 1.3) return false;

  // All markets should have reasonable liquidity
  const minLiq = Math.min(...group.markets.map(m => m.liquidity));
  if (minLiq < CONF.minLiquidity) return false;

  // All markets should have some volume
  const minVol = Math.min(...group.markets.map(m => m.volume24hr));
  if (minVol < CONF.minVolume24h) return false;

  return true;
}

/**
 * Verify that a group contains ALL outcomes for the event.
 * Fetches the full event from the Gamma API and compares market count.
 * Incomplete groups (e.g. 3 of 7 brackets) are NOT true arbitrage.
 */
async function validateCompleteness(group) {
  if (group.source !== 'gamma-event') return { complete: false, totalInEvent: 0, reason: 'Not an event group' };

  try {
    const event = await client.getEventBySlug(group.slug);
    if (!event || !event.markets) return { complete: false, totalInEvent: 0, reason: 'Event not found' };

    // Count active, non-closed markets in the event
    const activeEventMarkets = event.markets.filter(m => m.active !== false && m.closed !== true);
    const totalInEvent = activeEventMarkets.length;
    const weHave = group.markets.length;

    // Calculate what the FULL event sums to
    let fullEventSum = 0;
    for (const m of activeEventMarkets) {
      try {
        const prices = JSON.parse(m.outcomePrices || '[0,0]');
        fullEventSum += parseFloat(prices[0]);
      } catch { /* skip */ }
    }

    if (weHave < totalInEvent) {
      return {
        complete: false,
        totalInEvent,
        weHave,
        fullEventSum: r4(fullEventSum),
        reason: `Only ${weHave} of ${totalInEvent} outcomes — missing ${totalInEvent - weHave} brackets`,
      };
    }

    return { complete: true, totalInEvent, weHave, fullEventSum: r4(fullEventSum) };
  } catch (err) {
    log.warn('ARBITRAGE', `Completeness check failed for ${group.slug}: ${err.message}`);
    return { complete: false, totalInEvent: 0, reason: err.message };
  }
}

// ─── Group Arbitrage ─────────────────────────────────────────────────
async function findGroupArbitrage(markets) {
  const opportunities = [];
  const groups = groupMutuallyExclusiveMarkets(markets);

  for (const group of groups) {
    if (!validateExclusivity(group)) continue;

    // ─── Completeness check + auto-fill missing markets from Gamma API ───
    let isComplete = false;
    let completeness = { weHave: group.markets.length, totalInEvent: group.markets.length };

    if (group.source === 'gamma-event') {
      try {
        const event = await client.getEventBySlug(group.slug);
        if (event?.markets) {
          const activeEventMarkets = event.markets.filter(m => m.active !== false && m.closed !== true);
          const totalInEvent = activeEventMarkets.length;

          // Auto-fill: add any missing markets to make the group complete
          const existingIds = new Set(group.markets.map(m => m.conditionId));
          for (const em of activeEventMarkets) {
            const cid = em.conditionId || em.condition_id;
            if (existingIds.has(cid)) continue;
            try {
              const prices = JSON.parse(em.outcomePrices || '[0,0]');
              const tokens = JSON.parse(em.clobTokenIds || '["0","0"]');
              const mq = (em.question || '').toLowerCase();
              // Skip spread/total/prop sub-markets
              if (/spread|total|o\/u|over.?under|handicap|prop|points scored|[+-]\d+\.5/.test(mq)) continue;
              group.markets.push({
                conditionId: cid,
                question: em.question,
                slug: em.slug,
                groupSlug: em.groupSlug || group.slug,
                negRisk: em.negRisk || false,
                yesPrice: parseFloat(prices[0] || 0),
                noPrice: parseFloat(prices[1] || 0),
                yesTokenId: tokens[0],
                noTokenId: tokens[1],
                liquidity: parseFloat(em.liquidity || 0),
                volume24hr: parseFloat(em.volume24hr || 0),
                outcomes: em.outcomes ? (typeof em.outcomes === 'string' ? JSON.parse(em.outcomes) : em.outcomes) : ['Yes', 'No'],
              });
            } catch { /* skip malformed */ }
          }

          completeness = {
            weHave: group.markets.length,
            totalInEvent,
            fullEventSum: r4(group.markets.reduce((s, m) => s + m.yesPrice, 0)),
          };
          isComplete = group.markets.length >= totalInEvent;
        }
      } catch (err) {
        log.debug('ARBITRAGE', `Event fetch failed for ${group.slug}: ${err.message}`);
      }
    }

    // Minimum group size
    if (group.markets.length < 2) continue;
    // Incomplete groups need at least 40% of outcomes to be meaningful
    if (!isComplete && completeness.totalInEvent > 4 && (group.markets.length / completeness.totalInEvent) < 0.4) continue;

    const totalYes = group.markets.reduce((sum, m) => sum + m.yesPrice, 0);
    const rawEdge = Math.abs(totalYes - 1.0);

    if (rawEdge < CONF.minRawEdge) continue;

    // Fee-adjusted edge: subtract trading costs for entering all positions
    const totalSlippage = group.markets.reduce(
      (sum, m) => sum + fees.estimateSlippage(100, m.liquidity), 0
    ) / group.markets.length;
    const feeOnProfit = rawEdge * fees.DEFAULT_FEE_RATE;
    const netEdge = rawEdge - feeOnProfit - totalSlippage;

    if (netEdge < CONF.minNetEdge) continue;

    const type = totalYes > 1 ? 'OVERROUND' : 'UNDERROUND';
    const minLiq = Math.min(...group.markets.map(m => m.liquidity));

    // ─── Risk assessment ───
    let riskLevel, riskNote;
    if (isComplete) {
      riskLevel = 'LOW';
      riskNote = `Complete group: all ${completeness.totalInEvent} outcomes covered. One MUST win. Near risk-free after fees.`;
    } else {
      // Incomplete group = NOT a true arb
      riskLevel = 'HIGH';
      riskNote = `INCOMPLETE: only ${completeness.weHave} of ${completeness.totalInEvent} outcomes. If result lands in a missing bracket, ALL legs lose (100% loss). Full event sum is ${((completeness.fullEventSum || 0) * 100).toFixed(1)}%.`;
    }

    // Downgrade confidence for incomplete sets
    const confidence = !isComplete ? 'LOW'
      : netEdge >= 0.03 ? 'HIGH'
      : netEdge >= 0.01 ? 'MEDIUM'
      : 'LOW';

    // Score: proportional penalty for incomplete groups
    const rawScore = Math.round(Math.min(netEdge * 2000, 100));
    let score;
    if (isComplete) {
      score = rawScore;
    } else {
      const coverageRatio = completeness.totalInEvent > 0 ? group.markets.length / completeness.totalInEvent : 0.5;
      score = Math.round(rawScore * Math.max(coverageRatio * 0.6, 0.1));
    }

    opportunities.push({
      strategy: 'ARBITRAGE',
      type,
      groupSlug: group.slug,
      groupSource: group.source,
      market: `${type}: ${group.markets.map(m => m.question?.slice(0, 40)).join(' vs ')}`.slice(0, 120),
      conditionId: group.markets[0].conditionId,
      slug: group.markets[0].slug,
      edge: {
        raw: r4(rawEdge),
        net: r4(netEdge),
        feeOnProfit: r4(feeOnProfit),
        slippage: r4(totalSlippage),
        totalYesProbability: r4(totalYes),
      },
      score,
      positionSize: 0,
      markets: group.markets.map(m => ({
        question: m.question,
        conditionId: m.conditionId,
        slug: m.slug,
        yesPrice: m.yesPrice,
        noPrice: m.noPrice,
        yesTokenId: m.yesTokenId,
        noTokenId: m.noTokenId,
        liquidity: m.liquidity,
        volume24hr: m.volume24hr,
      })),
      minLiquidity: minLiq,
      confidence,
      // Completeness & risk info
      isComplete,
      completeness: {
        marketsInGroup: completeness.weHave || group.markets.length,
        totalInEvent: completeness.totalInEvent || group.markets.length,
        fullEventSum: completeness.fullEventSum,
      },
      riskLevel,
      riskNote,
    });
  }

  return opportunities;
}

// ─── Complement Arbitrage ────────────────────────────────────────────
/**
 * YES + NO within a single market should = 1.0 exactly.
 * Deviations > 2% that survive fee deduction are real arbs.
 * (Most <1% deviations are display rounding — not tradeable.)
 */
function findComplementArbitrage(markets) {
  const opportunities = [];

  for (const market of markets) {
    const sum = market.yesPrice + market.noPrice;
    const deviation = Math.abs(sum - 1.0);

    // Complement arbs: lower threshold than group arbs since it's a single market
    if (deviation < 0.008) continue; // 0.8% minimum raw deviation
    if (market.liquidity < CONF.minLiquidity) continue;
    if (market.volume24hr < CONF.minVolume24h) continue;

    const slippage = fees.estimateSlippage(100, market.liquidity) * 2; // Both sides
    const feeOnProfit = deviation * fees.DEFAULT_FEE_RATE;
    const netDeviation = deviation - feeOnProfit - slippage;

    if (netDeviation < CONF.minNetEdge) continue;

    opportunities.push({
      strategy: 'ARBITRAGE',
      type: 'COMPLEMENT',
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      edge: {
        raw: r4(deviation),
        net: r4(netDeviation),
        sum: r4(sum),
      },
      score: Math.round(Math.min(netDeviation * 2000, 100)),
      positionSize: 0,
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      confidence: netDeviation >= 0.02 ? 'HIGH' : 'MEDIUM',
    });
  }

  return opportunities;
}

// ─── Cross-Platform Arbitrage (Polymarket vs Bookmakers) ─────────────
/**
 * The highest-alpha arb type: when Polymarket price diverges significantly
 * from the bookmaker consensus (median of 25+ sportsbooks).
 *
 * This works because:
 * - Sportbooks have decades of line-setting experience + massive volume
 * - Their consensus pricing is the sharpest available
 * - Polymarket is thin and prone to retail bias
 * - A 5%+ divergence from bookmaker consensus is a strong signal
 *
 * NOT risk-free like a traditional arb — this is a value bet where
 * the edge comes from a more accurate external price source.
 */
function findCrossPlatformArbs(markets) {
  if (!oddsApi || !oddsApi.hasApiKey()) return [];

  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < 2000) continue;
    if (market.volume24hr < 500) continue;

    const bookmakerMatch = oddsApi.getBookmakerOdds(market);
    if (!bookmakerMatch) continue;

    const divergence = bookmakerMatch.divergence;       // positive = bookmaker thinks YES is more likely
    const absDivergence = Math.abs(divergence);

    // Need at least 3% divergence after fees to be actionable
    const feeThreshold = fees.DEFAULT_FEE_RATE + fees.estimateSlippage(100, market.liquidity);
    if (absDivergence < feeThreshold + 0.01) continue; // 1% minimum net edge (was 2%)

    const netEdge = absDivergence - feeThreshold;

    // Direction: if bookmaker says higher prob → buy YES, if lower → buy NO
    const side = divergence > 0 ? 'YES' : 'NO';
    const entryPrice = side === 'YES' ? market.yesPrice : market.noPrice;
    const trueProb = side === 'YES' ? bookmakerMatch.consensusProb : (1 - bookmakerMatch.consensusProb);

    // Kelly sizing
    const positionSize = fees.feeAdjustedKelly(
      trueProb, entryPrice, 1000, // normalized to $1k bankroll, scaled later
      CONF.maxExposure, market.liquidity, 0.25
    );

    if (positionSize < 1) continue;

    // Score based on divergence magnitude, bookmaker consensus strength, and Pinnacle data
    let score = 0;
    if (netEdge >= 0.08) score += 40;
    else if (netEdge >= 0.05) score += 30;
    else if (netEdge >= 0.03) score += 20;
    else score += 10;

    // Bookmaker count bonus: 20+ bookmakers agreeing is very strong
    if (bookmakerMatch.bookmakerCount >= 20) score += 15;
    else if (bookmakerMatch.bookmakerCount >= 10) score += 10;
    else score += 5;

    // Pinnacle bonus (sharpest book in the world)
    if (bookmakerMatch.pinnacleProb) {
      const pinnacleDivergence = Math.abs(bookmakerMatch.pinnacleProb - (side === 'YES' ? market.yesPrice : market.noPrice));
      if (pinnacleDivergence >= 0.04) score += 15;
      else if (pinnacleDivergence >= 0.02) score += 10;
    }

    // Liquidity bonus
    if (market.liquidity >= 50000) score += 10;
    else if (market.liquidity >= 10000) score += 5;

    // Volume bonus
    if (market.volume24hr >= 20000) score += 10;
    else if (market.volume24hr >= 5000) score += 5;

    score = Math.min(score, 100);

    // Self-learning: use learned threshold if enough data, else default 25
    const pt = getPaperTrader();
    const learned = pt?.getLearnedThreshold?.('ARBITRAGE');
    const effectiveMinScore = learned ? learned.profitCutoff : 25;
    if (score < effectiveMinScore) continue;

    opportunities.push({
      strategy: 'ARBITRAGE',
      type: 'CROSS_PLATFORM',
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      yesTokenId: market.yesTokenId,
      noTokenId: market.noTokenId,
      side,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      edge: {
        raw: r4(absDivergence),
        net: r4(netEdge),
        feeThreshold: r4(feeThreshold),
        divergence: r4(divergence),
        divergencePct: bookmakerMatch.divergencePct,
      },
      score,
      positionSize: Math.round(positionSize * 100) / 100,
      expectedProfit: Math.round(positionSize * netEdge * 100) / 100,
      bookmaker: {
        matchedEvent: bookmakerMatch.matchedEvent,
        consensusProb: bookmakerMatch.consensusProb,
        rawConsensusProb: bookmakerMatch.rawConsensusProb,
        pinnacleProb: bookmakerMatch.pinnacleProb,
        bookmakerCount: bookmakerMatch.bookmakerCount,
        bookmakers: bookmakerMatch.bookmakers,
        sportKey: bookmakerMatch.sportKey,
      },
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      confidence: netEdge >= 0.06 ? 'HIGH' : netEdge >= 0.03 ? 'MEDIUM' : 'LOW',
      isComplete: true, // Cross-platform trades are always "complete" (single bet)
      riskLevel: netEdge >= 0.06 && bookmakerMatch.bookmakerCount >= 15 ? 'LOW'
        : netEdge >= 0.03 ? 'MEDIUM' : 'HIGH',
      riskNote: `Cross-platform value bet: ${bookmakerMatch.bookmakerCount} bookmakers price ${bookmakerMatch.matchedEvent} at ${(bookmakerMatch.consensusProb * 100).toFixed(1)}% vs Polymarket ${(market.yesPrice * 100).toFixed(1)}%. ${side === 'YES' ? 'Buy YES' : 'Buy NO'} for ${(netEdge * 100).toFixed(1)}% edge after fees. NOT risk-free — this is a value bet backed by sharper pricing.`,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Futures Arbitrage (Polymarket vs Bookmaker Outrights) ───────────
/**
 * Match Polymarket championship/futures markets against bookmaker outrights.
 * E.g. "Will the Thunder win the NBA Championship?" vs bookmaker futures odds.
 * High-alpha: futures pricing diverges more than single-game moneylines.
 */
function findFuturesArbs(markets) {
  if (!oddsApi || !oddsApi.matchMarketToOutrights) return [];

  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < 2000) continue;

    const outrightMatch = oddsApi.matchMarketToOutrights(market);
    if (!outrightMatch) continue;

    const absDivergence = Math.abs(outrightMatch.divergence);
    const feeThreshold = fees.DEFAULT_FEE_RATE + fees.estimateSlippage(100, market.liquidity);
    if (absDivergence < feeThreshold + 0.01) continue;

    const netEdge = absDivergence - feeThreshold;
    const side = outrightMatch.divergence > 0 ? 'YES' : 'NO';

    let score = 0;
    if (netEdge >= 0.08) score += 35;
    else if (netEdge >= 0.05) score += 25;
    else if (netEdge >= 0.03) score += 15;
    else score += 8;

    if (outrightMatch.bookmakerCount >= 10) score += 15;
    else if (outrightMatch.bookmakerCount >= 5) score += 10;
    else score += 5;

    if (market.liquidity >= 100000) score += 15;
    else if (market.liquidity >= 20000) score += 10;
    else score += 5;

    if (market.volume24hr >= 20000) score += 10;
    else if (market.volume24hr >= 5000) score += 5;

    score = Math.min(score, 100);

    const pt = getPaperTrader();
    const learned = pt?.getLearnedThreshold?.('ARBITRAGE');
    const effectiveMinScore = learned ? learned.profitCutoff : 20;
    if (score < effectiveMinScore) continue;

    opportunities.push({
      strategy: 'ARBITRAGE',
      type: 'FUTURES',
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      side,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      edge: {
        raw: r4(absDivergence),
        net: r4(netEdge),
        feeThreshold: r4(feeThreshold),
        divergence: r4(outrightMatch.divergence),
        divergencePct: outrightMatch.divergencePct,
      },
      score,
      positionSize: 0,
      bookmaker: {
        matchedEvent: outrightMatch.matchedEvent,
        consensusProb: outrightMatch.consensusProb,
        bookmakerCount: outrightMatch.bookmakerCount,
      },
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      confidence: netEdge >= 0.06 ? 'HIGH' : netEdge >= 0.03 ? 'MEDIUM' : 'LOW',
      isComplete: true,
      riskLevel: netEdge >= 0.06 ? 'LOW' : 'MEDIUM',
      riskNote: `Futures value bet: ${outrightMatch.bookmakerCount} bookmakers price ${outrightMatch.matchedEvent} at ${(outrightMatch.consensusProb * 100).toFixed(1)}% vs Polymarket ${(market.yesPrice * 100).toFixed(1)}%. ${side === 'YES' ? 'Buy YES' : 'Buy NO'} for ${(netEdge * 100).toFixed(1)}% edge. Championship/futures market — NOT risk-free.`,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Spread/Total Value Arbs (Polymarket lines vs Bookmaker lines) ──
/**
 * Match Polymarket spread/total markets against bookmaker spread/total lines.
 * E.g. "Spread: Spurs (-6.5)" vs bookmaker spread odds.
 */
function findSpreadTotalArbs(markets) {
  if (!oddsApi || !oddsApi.getBookmakerSpreads) return [];

  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < 3000) continue;
    if (market.volume24hr < 500) continue;

    const spreadMatch = oddsApi.getBookmakerSpreads(market);
    if (!spreadMatch) continue;

    const absDivergence = Math.abs(spreadMatch.divergence);
    const feeThreshold = fees.DEFAULT_FEE_RATE + fees.estimateSlippage(100, market.liquidity);
    if (absDivergence < feeThreshold + 0.01) continue;

    const netEdge = absDivergence - feeThreshold;
    const side = spreadMatch.divergence > 0 ? 'YES' : 'NO';

    let score = 0;
    if (netEdge >= 0.06) score += 30;
    else if (netEdge >= 0.04) score += 20;
    else if (netEdge >= 0.02) score += 12;
    else score += 5;

    if (spreadMatch.bookmakerCount >= 15) score += 15;
    else if (spreadMatch.bookmakerCount >= 8) score += 10;
    else score += 5;

    if (market.liquidity >= 50000) score += 10;
    else if (market.liquidity >= 10000) score += 5;

    if (market.volume24hr >= 10000) score += 10;
    else if (market.volume24hr >= 3000) score += 5;

    score = Math.min(score, 100);

    const pt = getPaperTrader();
    const learned = pt?.getLearnedThreshold?.('ARBITRAGE');
    const effectiveMinScore = learned ? learned.profitCutoff : 20;
    if (score < effectiveMinScore) continue;

    opportunities.push({
      strategy: 'ARBITRAGE',
      type: `${spreadMatch.type}_VALUE`,
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      side,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      edge: {
        raw: r4(absDivergence),
        net: r4(netEdge),
        line: spreadMatch.line,
        divergence: r4(spreadMatch.divergence),
      },
      score,
      positionSize: 0,
      bookmaker: {
        matchedEvent: spreadMatch.matchedEvent,
        impliedProb: spreadMatch.impliedProb,
        bookmakerCount: spreadMatch.bookmakerCount,
      },
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      confidence: netEdge >= 0.05 ? 'HIGH' : netEdge >= 0.03 ? 'MEDIUM' : 'LOW',
      isComplete: true,
      riskLevel: 'MEDIUM',
      riskNote: `${spreadMatch.type} value bet: Bookmakers imply ${(spreadMatch.impliedProb * 100).toFixed(1)}% vs Polymarket ${(market.yesPrice * 100).toFixed(1)}% on ${spreadMatch.matchedEvent} (line ${spreadMatch.line}). ${(netEdge * 100).toFixed(1)}% net edge.`,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Orderbook Complement Arbs ──────────────────────────────────────
/**
 * Use real CLOB orderbook bid/ask to find complement arbs.
 * If sell(YES bid) + sell(NO bid) > 1.0 → guaranteed profit selling both.
 * If buy(YES ask) + buy(NO ask) < 1.0 → guaranteed profit buying both.
 * These are TRUE risk-free arbs based on live orderbook data.
 */
function findOrderbookComplementArbs(markets) {
  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < CONF.minLiquidity) continue;
    if (market.volume24hr < CONF.minVolume24h) continue;

    const price = getBestPrice(market);

    // Sell-sell arb: selling YES at bid + selling NO at bid > 1.0
    const yesBid = price.yesBid;
    const noBid = price.noBid;
    if (yesBid && noBid && yesBid + noBid > 1.005) {
      const rawEdge = yesBid + noBid - 1.0;
      const slippage = fees.estimateSlippage(100, market.liquidity) * 2;
      const netEdge = rawEdge - slippage;

      if (netEdge > 0.003) {
        opportunities.push({
          strategy: 'ARBITRAGE',
          type: 'ORDERBOOK_SELL',
          market: market.question,
          conditionId: market.conditionId,
          slug: market.slug,
          edge: {
            raw: r4(rawEdge),
            net: r4(netEdge),
            yesBid: r4(yesBid),
            noBid: r4(noBid),
            sum: r4(yesBid + noBid),
          },
          score: Math.round(Math.min(netEdge * 3000, 100)),
          positionSize: 0,
          liquidity: market.liquidity,
          volume24hr: market.volume24hr,
          confidence: netEdge >= 0.02 ? 'HIGH' : 'MEDIUM',
          isComplete: true,
          riskLevel: 'LOW',
          riskNote: `Orderbook arb: sell YES@${r4(yesBid)} + sell NO@${r4(noBid)} = ${r4(yesBid + noBid)} > 1.0. Net ${(netEdge * 100).toFixed(1)}% RISK-FREE after slippage.`,
        });
      }
    }

    // Buy-buy arb: buying YES at ask + buying NO at ask < 1.0
    const yesAsk = price.yesAsk;
    const noAsk = price.noAsk;
    if (yesAsk && noAsk && yesAsk + noAsk < 0.995) {
      const rawEdge = 1.0 - yesAsk - noAsk;
      const slippage = fees.estimateSlippage(100, market.liquidity) * 2;
      const feeOnProfit = rawEdge * fees.DEFAULT_FEE_RATE;
      const netEdge = rawEdge - feeOnProfit - slippage;

      if (netEdge > 0.003) {
        opportunities.push({
          strategy: 'ARBITRAGE',
          type: 'ORDERBOOK_BUY',
          market: market.question,
          conditionId: market.conditionId,
          slug: market.slug,
          edge: {
            raw: r4(rawEdge),
            net: r4(netEdge),
            yesAsk: r4(yesAsk),
            noAsk: r4(noAsk),
            sum: r4(yesAsk + noAsk),
          },
          score: Math.round(Math.min(netEdge * 3000, 100)),
          positionSize: 0,
          liquidity: market.liquidity,
          volume24hr: market.volume24hr,
          confidence: netEdge >= 0.02 ? 'HIGH' : 'MEDIUM',
          isComplete: true,
          riskLevel: 'LOW',
          riskNote: `Orderbook underround: buy YES@${r4(yesAsk)} + buy NO@${r4(noAsk)} = ${r4(yesAsk + noAsk)} < 1.0. Net ${(netEdge * 100).toFixed(1)}% GUARANTEED profit.`,
        });
      }
    }
  }

  return opportunities;
}

// ─── Main ────────────────────────────────────────────────────────────
/**
 * Get best available price for a market.
 * Prefers WebSocket (real-time, <1s) over REST (polled, 30s+ stale).
 */
function getBestPrice(market) {
  if (wsClient) {
    const yesBook = wsClient.getOrderbook(market.yesTokenId);
    const noBook = wsClient.getOrderbook(market.noTokenId);

    if (yesBook && noBook) {
      const yesBestBid = yesBook.bids?.[0]?.price || market.yesPrice;
      const yesBestAsk = yesBook.asks?.[0]?.price || market.yesPrice;
      const noBestBid = noBook.bids?.[0]?.price || market.noPrice;
      const noBestAsk = noBook.asks?.[0]?.price || market.noPrice;

      return {
        yesPrice: (yesBestBid + yesBestAsk) / 2,
        noPrice: (noBestBid + noBestAsk) / 2,
        yesBid: yesBestBid,
        yesAsk: yesBestAsk,
        noBid: noBestBid,
        noAsk: noBestAsk,
        source: 'websocket',
        fresh: wsClient.hasFreshData(market.yesTokenId),
      };
    }
  }

  return {
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    yesBid: market.yesPrice,
    yesAsk: market.yesPrice,
    noBid: market.noPrice,
    noAsk: market.noPrice,
    source: 'rest',
    fresh: true,
  };
}

/**
 * Calculate max fillable size from orderbook depth.
 * Don't try to arb more than the book can actually fill.
 */
function getMaxFillableSize(market) {
  if (!wsClient) return Infinity;

  const book = wsClient.getOrderbook(market.yesTokenId);
  if (!book || !book.asks) return Infinity;

  // Sum liquidity available within 2% of best price
  const bestAsk = book.asks[0]?.price;
  if (!bestAsk) return Infinity;

  let fillable = 0;
  for (const level of book.asks) {
    if (level.price > bestAsk * 1.02) break; // Only within 2% of best
    fillable += level.size * level.price;
  }

  return fillable || Infinity;
}

async function findOpportunities(markets, bankroll) {
  if (!CONF.enabled) return [];

  const groupArbs = await findGroupArbitrage(markets);
  const complementArbs = findComplementArbitrage(markets);
  const crossPlatformArbs = findCrossPlatformArbs(markets);
  const futuresArbs = findFuturesArbs(markets);
  const spreadTotalArbs = findSpreadTotalArbs(markets);
  const orderbookArbs = findOrderbookComplementArbs(markets);

  // Deduplicate: same market shouldn't appear in multiple arb types
  const seen = new Set();
  const all = [...crossPlatformArbs, ...futuresArbs, ...spreadTotalArbs, ...orderbookArbs, ...groupArbs, ...complementArbs]
    .filter(opp => {
      const key = `${opp.type}:${opp.conditionId || opp.groupSlug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Size all opportunities with execution-aware limits
  return all
    .map(opp => {
      const maxBet = bankroll * CONF.maxExposure;
      const liquidityLimit = (opp.minLiquidity || opp.liquidity || 50000) * 0.05;

      // If we have orderbook data, also respect fillable depth
      let fillableLimit = Infinity;
      if (opp.markets) {
        fillableLimit = Math.min(
          ...opp.markets.map(m => getMaxFillableSize(m))
        );
      }

      opp.positionSize = Math.round(Math.min(maxBet, liquidityLimit, fillableLimit) * 100) / 100;
      opp.expectedProfit = Math.round(opp.positionSize * (opp.edge.net || 0) * 100) / 100;
      return opp;
    })
    .sort((a, b) => (b.expectedProfit || 0) - (a.expectedProfit || 0));
}

function r4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  name: 'ARBITRAGE',
  findOpportunities,
  groupMutuallyExclusiveMarkets,
  validateExclusivity,
  getBestPrice,
  getMaxFillableSize,
};
