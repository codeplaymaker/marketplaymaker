/**
 * The Odds API Integration
 * 
 * Cross-references Polymarket event prices with bookmaker consensus odds.
 * This creates the HIGHEST-ALPHA signal: when Polymarket diverges from
 * sharp bookmaker lines (Pinnacle, DraftKings, FanDuel), there's real edge.
 * 
 * Free tier: 500 requests/month (enough for ~16 scans/day)
 * Each scan = 1 request per sport per region
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://api.the-odds-api.com/v4';
const ODDS_CACHE_FILE = path.join(__dirname, '..', 'logs', 'odds-cache.json');

// ─── Disk Persistence ────────────────────────────────────────────────
function saveOddsCache() {
  try {
    fs.writeFileSync(ODDS_CACHE_FILE, JSON.stringify({
      cachedOdds, cachedOutrights, lastFetchTime, requestsRemaining, requestsUsed, savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log.warn('ODDS_API', `Failed to save cache: ${err.message}`);
  }
}

function loadOddsCache() {
  try {
    if (!fs.existsSync(ODDS_CACHE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(ODDS_CACHE_FILE, 'utf8'));
    if (Array.isArray(raw.cachedOdds) && raw.cachedOdds.length > 0) {
      cachedOdds = raw.cachedOdds;
      lastFetchTime = raw.lastFetchTime || null;
      requestsRemaining = raw.requestsRemaining ?? null;
      requestsUsed = raw.requestsUsed ?? null;
      log.info('ODDS_API', `Loaded ${cachedOdds.length} cached events from disk (${requestsRemaining} credits remaining)`);
    }
    if (Array.isArray(raw.cachedOutrights) && raw.cachedOutrights.length > 0) {
      cachedOutrights = raw.cachedOutrights;
      log.info('ODDS_API', `Loaded ${cachedOutrights.length} cached outright events from disk`);
    }
  } catch (err) {
    log.warn('ODDS_API', `Failed to load cache: ${err.message}`);
  }
}

// Supported sport keys that commonly appear on Polymarket
const SPORT_KEYS = [
  // US major leagues
  'americanfootball_nfl',
  'americanfootball_ncaaf',
  'basketball_nba',
  'basketball_ncaab',
  'basketball_wnba',
  'baseball_mlb',
  'icehockey_nhl',
  // Soccer
  'soccer_epl',
  'soccer_usa_mls',
  'soccer_uefa_champs_league',
  'soccer_spain_la_liga',
  'soccer_germany_bundesliga',
  'soccer_italy_serie_a',
  'soccer_france_ligue_one',
  // Combat
  'mma_mixed_martial_arts',
  'boxing_boxing',
];

// Championship/outright sport keys — for futures matching
const OUTRIGHT_SPORT_KEYS = [
  'basketball_nba_championship',
  'americanfootball_nfl_super_bowl_winner',
  'baseball_mlb_world_series_winner',
  'icehockey_nhl_championship',
];

// Team alias map: nickname → full bookmaker name
// Enables matching "Spurs" in Polymarket to "San Antonio Spurs" in bookmaker data
const TEAM_ALIASES = {};
[
  // NBA
  ['hawks','atlanta hawks'],['celtics','boston celtics'],['nets','brooklyn nets'],
  ['hornets','charlotte hornets'],['bulls','chicago bulls'],['cavaliers','cleveland cavaliers'],
  ['cavs','cleveland cavaliers'],['mavericks','dallas mavericks'],['mavs','dallas mavericks'],
  ['nuggets','denver nuggets'],['pistons','detroit pistons'],['warriors','golden state warriors'],
  ['rockets','houston rockets'],['pacers','indiana pacers'],['clippers','los angeles clippers'],
  ['lakers','los angeles lakers'],['grizzlies','memphis grizzlies'],['heat','miami heat'],
  ['bucks','milwaukee bucks'],['timberwolves','minnesota timberwolves'],['pelicans','new orleans pelicans'],
  ['knicks','new york knicks'],['thunder','oklahoma city thunder'],['magic','orlando magic'],
  ['76ers','philadelphia 76ers'],['sixers','philadelphia 76ers'],['suns','phoenix suns'],
  ['blazers','portland trail blazers'],['kings','sacramento kings'],['spurs','san antonio spurs'],
  ['raptors','toronto raptors'],['jazz','utah jazz'],['wizards','washington wizards'],
  // NFL
  ['chiefs','kansas city chiefs'],['eagles','philadelphia eagles'],['49ers','san francisco 49ers'],
  ['niners','san francisco 49ers'],['cowboys','dallas cowboys'],['ravens','baltimore ravens'],
  ['lions','detroit lions'],['packers','green bay packers'],['vikings','minnesota vikings'],
  ['steelers','pittsburgh steelers'],['raiders','las vegas raiders'],['dolphins','miami dolphins'],
  ['bengals','cincinnati bengals'],['chargers','los angeles chargers'],['broncos','denver broncos'],
  ['seahawks','seattle seahawks'],['patriots','new england patriots'],['bears','chicago bears'],
  ['saints','new orleans saints'],['colts','indianapolis colts'],['commanders','washington commanders'],
  ['jaguars','jacksonville jaguars'],['titans','tennessee titans'],['texans','houston texans'],
  ['falcons','atlanta falcons'],['cardinals','arizona cardinals'],['browns','cleveland browns'],
  // NHL
  ['maple leafs','toronto maple leafs'],['leafs','toronto maple leafs'],
  ['canadiens','montreal canadiens'],['habs','montreal canadiens'],
  ['oilers','edmonton oilers'],['avalanche','colorado avalanche'],['avs','colorado avalanche'],
  ['golden knights','vegas golden knights'],['lightning','tampa bay lightning'],
  ['hurricanes','carolina hurricanes'],['canes','carolina hurricanes'],
  ['bruins','boston bruins'],['penguins','pittsburgh penguins'],
  ['red wings','detroit red wings'],['blackhawks','chicago blackhawks'],
  ['predators','nashville predators'],['flames','calgary flames'],
  ['canucks','vancouver canucks'],['wild','minnesota wild'],
  ['islanders','new york islanders'],['rangers','new york rangers'],
  ['stars','dallas stars'],['kraken','seattle kraken'],['blues','st louis blues'],
  ['sharks','san jose sharks'],['devils','new jersey devils'],
].forEach(([alias, full]) => { TEAM_ALIASES[alias] = full; });

/**
 * Check if question text mentions a team (with alias expansion).
 * Returns hit count (0 = no match, 1+ = match strength).
 */
function textMentionsTeam(text, bookmakerTeamName) {
  const q = text.toLowerCase();
  const team = bookmakerTeamName.toLowerCase();
  // Direct word match
  const words = team.split(/\s+/).filter(w => w.length >= 3);
  let hits = 0;
  for (const w of words) if (q.includes(w)) hits++;
  if (hits > 0) return hits;
  // Reverse alias check: does any alias for this team appear in the question?
  for (const [alias, full] of Object.entries(TEAM_ALIASES)) {
    if (full === team && q.includes(alias)) return 1;
  }
  return 0;
}

let apiKey = null;
let cachedOdds = [];          // All fetched bookmaker events (h2h + spreads + totals)
let cachedOutrights = [];     // Championship/futures odds
let lastFetchTime = null;
let requestsRemaining = null;
let requestsUsed = null;

// Load cached odds from disk on startup
loadOddsCache();

// ─── API Key Management ─────────────────────────────────────────────

function setApiKey(key) {
  if (!key || typeof key !== 'string' || key.length < 10) {
    throw new Error('Invalid API key');
  }
  apiKey = key.trim();
  log.info('ODDS_API', `API key set (${apiKey.slice(0, 6)}...)`);
  return true;
}

function getApiKey() {
  return apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : null;
}

function hasApiKey() {
  return !!apiKey;
}

// ─── Fetch Odds ──────────────────────────────────────────────────────

/**
 * Fetch odds for a single sport from The Odds API.
 * Returns array of events with bookmaker odds.
 */
async function fetchSportOdds(sportKey, markets = 'h2h,spreads,totals') {
  if (!apiKey) return [];

  const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us,uk&markets=${markets}&oddsFormat=decimal`;
  
  try {
    const resp = await fetch(url);
    
    // Track quota
    requestsRemaining = resp.headers.get('x-requests-remaining');
    requestsUsed = resp.headers.get('x-requests-used');
    
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Invalid API key');
      if (resp.status === 429) throw new Error('Rate limited — try again later');
      throw new Error(`HTTP ${resp.status}`);
    }
    
    const data = await resp.json();
    return data || [];
  } catch (err) {
    log.warn('ODDS_API', `Failed to fetch ${sportKey}: ${err.message}`);
    return [];
  }
}

/**
 * Fetch ALL available sports odds. Costs ~2 requests per sport (us + uk regions).
 * Only fetches sports that have active events.
 */
async function fetchAllOdds() {
  if (!apiKey) {
    log.warn('ODDS_API', 'No API key set — skipping bookmaker odds fetch');
    return [];
  }

  log.info('ODDS_API', 'Fetching bookmaker odds...');
  const allEvents = [];

  // Fetch upcoming (all sports in one call — costs 1 request per region)
  const upcomingUrl = `${BASE_URL}/sports/upcoming/odds/?apiKey=${apiKey}&regions=us,uk&markets=h2h,spreads,totals&oddsFormat=decimal`;
  
  try {
    const resp = await fetch(upcomingUrl);
    requestsRemaining = resp.headers.get('x-requests-remaining');
    requestsUsed = resp.headers.get('x-requests-used');
    
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Invalid Odds API key');
      if (resp.status === 429) throw new Error('Odds API rate limited');
      throw new Error(`Odds API HTTP ${resp.status}`);
    }
    
    const data = await resp.json();
    if (data?.length) {
      allEvents.push(...data);
      log.info('ODDS_API', `Got ${data.length} upcoming events from bookmakers`);
    }
  } catch (err) {
    log.error('ODDS_API', `Fetch failed: ${err.message}`);
    return cachedOdds; // Return cached on failure
  }

  // Also fetch specific sport pages for more coverage
  // Only fetch NFL/NBA/MLB as they overlap most with Polymarket
  const prioritySports = ['americanfootball_nfl', 'basketball_nba', 'baseball_mlb', 'mma_mixed_martial_arts'];
  
  for (const sport of prioritySports) {
    try {
      const events = await fetchSportOdds(sport);
      // Merge, dedup by event id
      const existingIds = new Set(allEvents.map(e => e.id));
      for (const ev of events) {
        if (!existingIds.has(ev.id)) {
          allEvents.push(ev);
          existingIds.add(ev.id);
        }
      }
    } catch { /* skip */ }
  }

  cachedOdds = allEvents;

  // Fetch championship outrights for futures matching
  const outrightEvents = [];
  for (const sport of OUTRIGHT_SPORT_KEYS) {
    try {
      const url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${apiKey}&regions=us,uk&markets=outrights&oddsFormat=decimal`;
      const resp = await fetch(url);
      requestsRemaining = resp.headers.get('x-requests-remaining') || requestsRemaining;
      requestsUsed = resp.headers.get('x-requests-used') || requestsUsed;
      if (resp.ok) {
        const data = await resp.json();
        if (data?.length) {
          for (const ev of data) { ev._sportKey = sport; }
          outrightEvents.push(...data);
        }
      }
    } catch { /* skip sport */ }
  }
  cachedOutrights = outrightEvents;

  lastFetchTime = new Date().toISOString();
  saveOddsCache();
  log.info('ODDS_API', `Total: ${allEvents.length} events + ${outrightEvents.length} outrights cached (${requestsRemaining} API credits remaining)`);
  
  return allEvents;
}

// ─── Matching Engine ─────────────────────────────────────────────────

/**
 * Convert American odds to implied probability.
 */
function americanToProb(price) {
  if (price > 0) return 100 / (price + 100);
  return Math.abs(price) / (Math.abs(price) + 100);
}

/**
 * Convert decimal odds to implied probability.
 */
function decimalToProb(price) {
  if (price <= 1) return 1;
  return 1 / price;
}

/**
 * Extract team/player names from a Polymarket question.
 * e.g. "Will the Lakers win tonight?" → ["Lakers"]
 * e.g. "Will Manchester United beat Chelsea?" → ["Manchester United", "Chelsea"]
 */
function extractEntities(question) {
  if (!question) return [];
  // Common patterns in Polymarket sports questions
  const q = question.toLowerCase();
  const entities = [];
  
  // Already lowercase for matching
  return q;
}

/**
 * Detect if a Polymarket question is about a specific single game or a
 * season-long / futures market (championship, award, etc.).
 *
 * Single-game indicators: "vs", "beat", "win on [date]", team-vs-team slug
 * Futures indicators: "win the [championship]", "Finals", "Champion",
 *                     "Super Bowl", "World Series", "MVP", "most"
 */
const FUTURES_PATTERNS = [
  /win the .*(championship|finals|title|cup|series|bowl|medal|pennant)/i,
  /champion/i, /mvp/i, /win .*(award|trophy)/i,
  /most .*(gold|wins|points|goals)/i,
  /make the playoffs/i, /qualify for/i, /seeded/i,
  /over\/under.*season/i, /regular season/i,
  /win \d+ (or more |\+)/i, // "win 50 or more games"
];

const SINGLE_GAME_PATTERNS = [
  /win on \d{4}-\d{2}-\d{2}/i,
  /beat .* on/i,
  /vs\./i,
  /tonight/i,
  /game \d/i,
];

// Spread, totals, over/under, and prop-bet patterns.
// These should NOT be matched to bookmaker h2h (moneyline) odds.
const NON_MONEYLINE_PATTERNS = [
  /o\/u\s*\d/i,             // "O/U 232.5"
  /over\/?under/i,          // "Over/Under"
  /total\s*(points|goals|runs|score)/i, // "Total Points"
  /spread[:\s]/i,           // "Spread: Nets (-5.5)"
  /[+-]\d+\.5/,             // Point spread like "-5.5" or "+3.5"
  /\bhits\b.*\d/i,          // "Hits O/U 8.5"
  /\b(rebounds|assists|steals|blocks|strikeouts|passing yards|touchdowns)\b.*\d/i,
  /\bpoints\b.*\d/i,        // "Points O/U 25.5" (player props)
  /\bfirst (team|player|half|quarter|set|inning)/i, // First-half/quarter props
  /\b(exact|correct) score\b/i,
  /\bmargin\b/i,            // Winning margin
  /\bhandicap\b/i,          // Asian handicap
  /\b(bo3|bo5|bo7)\b/i,     // Best-of-N (esports/tennis sets)
];

function classifyMarketType(question, slug) {
  const q = (question || '').toLowerCase();
  const s = (slug || '').toLowerCase();

  for (const pat of FUTURES_PATTERNS) {
    if (pat.test(q)) return 'FUTURES';
  }
  for (const pat of SINGLE_GAME_PATTERNS) {
    if (pat.test(q)) return 'SINGLE_GAME';
  }

  // Slug-based heuristics: single-game slugs often have dates
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return 'SINGLE_GAME';

  // "Will [team] win [event]?" with no date → likely futures
  if (/will .* win the /i.test(q)) return 'FUTURES';

  return 'UNKNOWN';
}

/**
 * Fuzzy match a Polymarket market to a bookmaker event.
 * v2: Rejects false matches between single-game odds and futures markets.
 * Returns the best matching bookmaker event + consensus probability, or null.
 */
function matchMarketToOdds(market) {
  if (!cachedOdds.length) return null;
  if (!market.question) return null;

  const q = market.question.toLowerCase();
  const marketType = classifyMarketType(market.question, market.slug);

  // Bookmaker events from the-odds-api are SINGLE GAME moneylines.
  // They should ONLY match Polymarket markets about that specific game.
  // Reject matching against futures/championship markets entirely.
  if (marketType === 'FUTURES') return null;

  // Reject spread, totals, O/U, and prop-bet markets.
  // These have both team names but are NOT moneyline bets.
  for (const pat of NON_MONEYLINE_PATTERNS) {
    if (pat.test(q)) return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const event of cachedOdds) {
    const home = (event.home_team || '').toLowerCase();
    const away = (event.away_team || '').toLowerCase();

    if (!home || !away) continue;

    let score = 0;

    // Both teams must be referenced for a single-game match
    // Alias-aware team matching (handles "Spurs" → "San Antonio Spurs" etc.)
    const homeHits = textMentionsTeam(q, event.home_team);
    const awayHits = textMentionsTeam(q, event.away_team);

    // Both teams must appear for a valid single-game match
    if (homeHits === 0 || awayHits === 0) continue;

    score += homeHits * 3 + awayHits * 3;
    if (q.includes(home)) score += 5;
    if (q.includes(away)) score += 5;

    // Temporal check: if event has a date, check if market references same date
    if (event.commence_time) {
      const eventDate = event.commence_time.slice(0, 10); // "2026-02-12"
      const slug = (market.slug || '').toLowerCase();
      if (slug.includes(eventDate) || q.includes(eventDate)) {
        score += 10; // Strong date match
      } else if (marketType === 'SINGLE_GAME') {
        // It's a single-game market but dates don't line up — still possible
        score += 2;
      }
      // If we can't confirm the date, reduce confidence
    }

    // Sport context bonus
    const sportContextMap = {
      'nfl': ['nfl', 'football', 'super bowl', 'touchdown'],
      'nba': ['nba', 'basketball', 'points'],
      'mlb': ['mlb', 'baseball', 'home run'],
      'nhl': ['nhl', 'hockey', 'puck'],
      'soccer': ['soccer', 'football', 'goal', 'premier league', 'champions league'],
      'mma': ['mma', 'ufc', 'fight', 'knock'],
    };

    const sportGroup = event.sport_key?.split('_')[0] || '';
    const contextWords = sportContextMap[sportGroup] || [];
    for (const cw of contextWords) {
      if (q.includes(cw)) score += 1;
    }

    // Threshold: 4 is enough when both teams confirmed present via aliases
    if (score > bestScore && score >= 4) {
      bestScore = score;
      bestMatch = event;
    }
  }

  if (!bestMatch) return null;

  // Extract consensus probability from bookmaker odds
  return extractConsensus(bestMatch, market);
}

/**
 * Extract consensus probability from all bookmakers for an event.
 * Uses the median implied probability from sharp books.
 */
function extractConsensus(event, market) {
  const q = (market.question || '').toLowerCase();
  
  // Determine which outcome maps to Polymarket YES
  // Check if the question asks about home or away team winning
  const home = (event.home_team || '').toLowerCase();
  const away = (event.away_team || '').toLowerCase();
  
  let targetTeam = null;
  let targetIndex = 0; // 0 = first outcome (usually home), 1 = second (usually away)
  
  // Simple heuristic: which team appears in the question?
  if (q.includes(home) && !q.includes(away)) {
    targetTeam = event.home_team;
    targetIndex = 0;
  } else if (q.includes(away) && !q.includes(home)) {
    targetTeam = event.away_team;
    targetIndex = 1;
  } else {
    // Both teams appear (e.g. "Pacers vs. Nets" or "Will X beat Y?")
    // Use individual significant words for position detection, since
    // Polymarket uses short names ("Nuggets") not full ("Denver Nuggets").
    const findFirstPos = (team) => {
      const words = team.split(/\s+/).filter(w => w.length >= 3);
      let earliest = Infinity;
      for (const w of words) {
        const pos = q.indexOf(w.toLowerCase());
        if (pos >= 0 && pos < earliest) earliest = pos;
      }
      return earliest === Infinity ? -1 : earliest;
    };
    const homePos = findFirstPos(event.home_team);
    const awayPos = findFirstPos(event.away_team);
    if (homePos >= 0 && (awayPos < 0 || homePos < awayPos)) {
      targetTeam = event.home_team;
      targetIndex = 0;
    } else {
      targetTeam = event.away_team;
      targetIndex = 1;
    }
  }

  // Collect implied probabilities from all bookmakers
  const probs = [];
  const bookmakerDetails = [];
  
  // Sharp books get extra weight
  const sharpBooks = ['pinnacle', 'betfair', 'matchbook'];
  
  for (const bm of (event.bookmakers || [])) {
    const h2h = bm.markets?.find(m => m.key === 'h2h');
    if (!h2h?.outcomes?.length) continue;
    
    // Find the outcome matching our target
    let outcome = h2h.outcomes.find(o => 
      (o.name || '').toLowerCase() === (targetTeam || '').toLowerCase()
    );
    
    // Fallback: use positional index
    if (!outcome && h2h.outcomes[targetIndex]) {
      outcome = h2h.outcomes[targetIndex];
    }
    
    if (!outcome) continue;
    
    const impliedProb = decimalToProb(outcome.price);
    const isSharp = sharpBooks.includes(bm.key);
    
    probs.push({ prob: impliedProb, weight: isSharp ? 2 : 1 });
    bookmakerDetails.push({
      name: bm.title,
      odds: outcome.price,
      impliedProb: Math.round(impliedProb * 1000) / 1000,
      isSharp,
    });
  }

  if (probs.length === 0) return null;

  // Weighted average (sharp books count 2x)
  const totalWeight = probs.reduce((sum, p) => sum + p.weight, 0);
  const weightedProb = probs.reduce((sum, p) => sum + p.prob * p.weight, 0) / totalWeight;
  
  // Also find the Pinnacle line if available (sharpest benchmark)
  const pinnacle = bookmakerDetails.find(b => b.name.toLowerCase().includes('pinnacle'));
  
  // Remove vig: sum of implied probs > 100%, normalize
  const allOutcomeProbs = [];
  const mainBm = event.bookmakers?.[0];
  if (mainBm) {
    const h2h = mainBm.markets?.find(m => m.key === 'h2h');
    if (h2h?.outcomes) {
      for (const o of h2h.outcomes) {
        allOutcomeProbs.push(decimalToProb(o.price));
      }
    }
  }
  const vigFactor = allOutcomeProbs.length > 0 ? allOutcomeProbs.reduce((a, b) => a + b, 0) : 1;
  const noVigProb = vigFactor > 0 ? weightedProb / vigFactor : weightedProb;
  
  return {
    matchedEvent: `${event.home_team} vs ${event.away_team}`,
    sportKey: event.sport_key,
    commenceTime: event.commence_time,
    targetTeam,
    consensusProb: Math.round(noVigProb * 1000) / 1000,      // Vig-removed consensus
    rawConsensusProb: Math.round(weightedProb * 1000) / 1000, // Raw (with vig)
    pinnacleProb: pinnacle ? pinnacle.impliedProb : null,
    bookmakerCount: bookmakerDetails.length,
    bookmakers: bookmakerDetails.slice(0, 6), // Top 6 for display
    polymarketYesPrice: market.yesPrice,
    polymarketNoPrice: market.noPrice,
    // The key metric: divergence between Polymarket and bookmaker consensus
    divergence: Math.round((noVigProb - market.yesPrice) * 1000) / 1000,
    divergencePct: Math.round(((noVigProb - market.yesPrice) / market.yesPrice) * 100 * 10) / 10,
  };
}

// ─── Integration Points ──────────────────────────────────────────────

/**
 * Get bookmaker odds for a specific Polymarket market.
 * Used by sportsEdge strategy to find cross-market edges.
 */
function getBookmakerOdds(market) {
  return matchMarketToOdds(market);
}

/**
 * Get ALL matched odds for a list of Polymarket markets.
 * Returns a Map of conditionId → bookmaker consensus.
 */
function matchAllMarkets(markets) {
  const matches = new Map();
  for (const market of markets) {
    const match = matchMarketToOdds(market);
    if (match) {
      matches.set(market.conditionId, match);
    }
  }
  return matches;
}

/**
 * Get status info for the API (displayed in UI).
 */
function getStatus() {
  return {
    hasKey: !!apiKey,
    keyPreview: getApiKey(),
    cachedEvents: cachedOdds.length,
    cachedOutrights: cachedOutrights.length,
    lastFetch: lastFetchTime,
    requestsRemaining: requestsRemaining ? parseInt(requestsRemaining) : null,
    requestsUsed: requestsUsed ? parseInt(requestsUsed) : null,
  };
}

/**
 * Get available sports list (free — doesn't cost quota).
 */
async function getSports() {
  if (!apiKey) return [];
  try {
    const resp = await fetch(`${BASE_URL}/sports/?apiKey=${apiKey}&all=false`);
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

/**
 * Match a Polymarket futures market to bookmaker outright odds.
 * For markets like "Will X win the NBA Championship?"
 */
function matchMarketToOutrights(market) {
  if (!cachedOutrights.length) return null;
  const q = (market.question || '').toLowerCase();

  // Only match futures/championship markets
  if (!FUTURES_PATTERNS.some(p => p.test(q))) return null;

  let bestResult = null;
  let bestDivergence = 0;

  for (const event of cachedOutrights) {
    for (const bm of (event.bookmakers || [])) {
      const outrights = bm.markets?.find(m => m.key === 'outrights');
      if (!outrights?.outcomes?.length) continue;

      for (const outcome of outrights.outcomes) {
        const outcomeName = (outcome.name || '').toLowerCase();
        if (!outcomeName) continue;

        // Check if this outcome matches the Polymarket market
        const hits = textMentionsTeam(q, outcome.name);
        if (hits === 0) continue;

        const impliedProb = decimalToProb(outcome.price);
        const divergence = impliedProb - market.yesPrice;
        if (Math.abs(divergence) < 0.02) continue;

        // Collect consensus from all bookmakers for this outcome
        const allProbs = [];
        for (const bm2 of (event.bookmakers || [])) {
          const outs = bm2.markets?.find(m => m.key === 'outrights');
          const match = outs?.outcomes?.find(o => (o.name || '').toLowerCase() === outcomeName);
          if (match) {
            const isSharp = ['pinnacle', 'betfair'].includes(bm2.key);
            allProbs.push({ prob: decimalToProb(match.price), weight: isSharp ? 2 : 1 });
          }
        }

        if (allProbs.length < 2) continue;

        const totalWeight = allProbs.reduce((s, p) => s + p.weight, 0);
        const consensusProb = allProbs.reduce((s, p) => s + p.prob * p.weight, 0) / totalWeight;
        const finalDivergence = consensusProb - market.yesPrice;

        if (Math.abs(finalDivergence) > Math.abs(bestDivergence)) {
          bestDivergence = finalDivergence;
          bestResult = {
            matchedEvent: `${outcome.name} — ${event.sport_title || event._sportKey || 'Championship'}`,
            sportKey: event._sportKey || event.sport_key,
            targetTeam: outcome.name,
            consensusProb: Math.round(consensusProb * 1000) / 1000,
            rawConsensusProb: Math.round(impliedProb * 1000) / 1000,
            pinnacleProb: null,
            bookmakerCount: allProbs.length,
            bookmakers: [],
            polymarketYesPrice: market.yesPrice,
            divergence: Math.round(finalDivergence * 1000) / 1000,
            divergencePct: Math.round((finalDivergence / (market.yesPrice || 0.01)) * 100 * 10) / 10,
            type: 'OUTRIGHT',
          };
        }
      }
    }
  }
  return bestResult;
}

/**
 * Get bookmaker spread/total lines for a Polymarket market.
 * Returns match info with divergence, or null.
 */
function getBookmakerSpreads(market) {
  if (!cachedOdds.length) return null;
  const q = (market.question || '').toLowerCase();

  // Only match spread/total markets
  if (!NON_MONEYLINE_PATTERNS.some(p => p.test(q))) return null;

  for (const event of cachedOdds) {
    const homeHit = textMentionsTeam(q, event.home_team || '');
    const awayHit = textMentionsTeam(q, event.away_team || '');
    if (homeHit === 0 && awayHit === 0) continue;

    for (const bm of (event.bookmakers || [])) {
      // Check spreads
      const spreads = bm.markets?.find(m => m.key === 'spreads');
      if (spreads?.outcomes?.length) {
        const lineMatch = q.match(/[+-]?\d+\.5/);
        if (lineMatch) {
          const polyLine = parseFloat(lineMatch[0]);
          for (const outcome of spreads.outcomes) {
            if (Math.abs((outcome.point || 0) - polyLine) <= 1) {
              const impliedProb = decimalToProb(outcome.price);
              return {
                type: 'SPREAD',
                matchedEvent: `${event.home_team} vs ${event.away_team}`,
                line: outcome.point,
                impliedProb,
                bookmakerCount: event.bookmakers?.length || 0,
                polymarketPrice: market.yesPrice,
                divergence: impliedProb - market.yesPrice,
              };
            }
          }
        }
      }

      // Check totals
      const totals = bm.markets?.find(m => m.key === 'totals');
      if (totals?.outcomes?.length) {
        const totalMatch = q.match(/(?:o\/u|over.?under|total)\s*(\d+\.?\d*)/i);
        if (totalMatch) {
          const polyTotal = parseFloat(totalMatch[1]);
          for (const outcome of totals.outcomes) {
            if (Math.abs((outcome.point || 0) - polyTotal) <= 1.5) {
              const isOver = /over/i.test(q);
              if ((isOver && outcome.name === 'Over') || (!isOver && outcome.name === 'Under')) {
                const impliedProb = decimalToProb(outcome.price);
                return {
                  type: 'TOTAL',
                  matchedEvent: `${event.home_team} vs ${event.away_team}`,
                  line: outcome.point,
                  impliedProb,
                  bookmakerCount: event.bookmakers?.length || 0,
                  polymarketPrice: market.yesPrice,
                  divergence: impliedProb - market.yesPrice,
                };
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/** Get the cached outright events */
function getCachedOutrights() { return cachedOutrights; }

module.exports = {
  setApiKey,
  getApiKey,
  hasApiKey,
  fetchAllOdds,
  fetchSportOdds,
  getBookmakerOdds,
  matchAllMarkets,
  matchMarketToOutrights,
  getBookmakerSpreads,
  getCachedOutrights,
  getStatus,
  getSports,
  decimalToProb,
  americanToProb,
  textMentionsTeam,
  TEAM_ALIASES,
};
