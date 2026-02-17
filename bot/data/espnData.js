/**
 * ESPN Sports Data Source
 *
 * Uses ESPN's FREE public API (no key required) to get real sportsbook odds
 * for sports markets on Polymarket.
 *
 * Covers: NBA, NHL, NCAA Basketball, Champions League, Bundesliga,
 *         La Liga, Serie A, Premier League, MMA/UFC, and more.
 *
 * ESPN provides DraftKings moneylines and spreads, which we convert to
 * implied win probabilities. This is HARD DATA — not LLM guessing.
 */

const log = require('../utils/logger');

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// Cache to avoid hammering ESPN
const eventCache = new Map();
const CACHE_TTL = 300000; // 5 min (odds change frequently)

// ESPN league slugs → Polymarket question patterns
const LEAGUES = {
  'basketball/nba': { name: 'NBA', pattern: /\b(nba|rockets|celtics|lakers|warriors|knicks|nets|76ers|sixers|cavaliers|cavs|bucks|nuggets|suns|spurs|heat|mavericks|mavs|thunder|grizzlies|pelicans|timberwolves|wolves|clippers|hawks|bulls|pacers|pistons|hornets|magic|raptors|wizards|blazers|trail blazers|kings|jazz)\b/i },
  'hockey/nhl': { name: 'NHL', pattern: /\b(nhl|bruins|maple leafs|canadiens|rangers|islanders|devils|flyers|penguins|capitals|hurricanes|panthers|lightning|red wings|senators|sabres|blue jackets|blackhawks|predators|stars|blues|wild|avalanche|jets|flames|oilers|canucks|kraken|sharks|ducks|knights|coyotes)\b/i },
  'basketball/mens-college-basketball': { name: 'NCAAB', pattern: /\b(badgers|buckeyes|wolverines|boilermakers|wildcats|tar heels|blue devils|cavaliers|hokies|seminoles|hurricanes|fighting irish|orange|panthers|cardinal|bears|longhorns|sooners|jayhawks|cyclones|mountaineers|red raiders|cowboys|horned frogs|razorbacks|tigers|crimson tide|bulldogs|rebels|volunteers|commodores|gamecocks|gators|wildcats)\b/i },
  'soccer/uefa.champions': { name: 'UCL', pattern: /\b(champions league|ucl|juventus|galatasaray|paris saint-germain|psg|monaco|real madrid|benfica|atalanta|borussia dortmund|dortmund|barcelona|bayern|liverpool|manchester city|man city|arsenal|inter|internazionale|atletico madrid|napoli|milan)\b/i },
  'soccer/eng.1': { name: 'EPL', pattern: /\b(premier league|epl|manchester united|man utd|manchester city|man city|chelsea|tottenham|spurs|west ham|aston villa|newcastle|brighton|crystal palace|everton|fulham|brentford|bournemouth|nottingham forest|wolves|wolverhampton|leicester|ipswich|southampton|liverpool|arsenal)\b/i },
  'soccer/ger.1': { name: 'Bundesliga', pattern: /\b(bundesliga|borussia dortmund|dortmund|bayern munich|bayern|rb leipzig|leipzig|bayer leverkusen|leverkusen|eintracht frankfurt|wolfsburg|freiburg|hoffenheim|mainz|augsburg|werder bremen|union berlin|stuttgart|gladbach|heidenheim|darmstadt)\b/i },
  'soccer/esp.1': { name: 'La Liga', pattern: /\b(la liga|real madrid|barcelona|atletico|atlético|atletico madrid|sevilla|real sociedad|villarreal|real betis|athletic bilbao|osasuna|celta|girona|getafe|alaves|las palmas|mallorca|cadiz|granada|almeria|valencia)\b/i },
  'soccer/ita.1': { name: 'Serie A', pattern: /\b(serie a|inter|internazionale|inter milan|juventus|napoli|ac milan|roma|lazio|atalanta|fiorentina|bologna|torino|monza|udinese|sassuolo|genoa|cagliari|lecce|empoli|verona|frosinone|salernitana)\b/i },
  'mma/ufc': { name: 'UFC', pattern: /\b(ufc|mma|fight|bout)\b/i },
};

// Team name normalization for matching ESPN ↔ Polymarket
const TEAM_ALIASES = {
  // NBA
  'houston rockets': ['rockets', 'houston'],
  'charlotte hornets': ['hornets', 'charlotte'],
  'phoenix suns': ['suns', 'phoenix'],
  'san antonio spurs': ['spurs', 'san antonio'],
  'brooklyn nets': ['nets', 'brooklyn'],
  'cleveland cavaliers': ['cavaliers', 'cavs', 'cleveland'],
  'philadelphia 76ers': ['76ers', 'sixers', 'philadelphia'],
  'atlanta hawks': ['hawks', 'atlanta'],
  'indiana pacers': ['pacers', 'indiana'],
  'detroit pistons': ['pistons', 'detroit'],
  'new york knicks': ['knicks', 'new york'],
  'washington wizards': ['wizards', 'washington'],
  'golden state warriors': ['warriors', 'golden state'],
  'los angeles lakers': ['lakers', 'la lakers'],
  'boston celtics': ['celtics', 'boston'],
  'milwaukee bucks': ['bucks', 'milwaukee'],
  'denver nuggets': ['nuggets', 'denver'],
  'miami heat': ['heat', 'miami'],
  'dallas mavericks': ['mavericks', 'mavs', 'dallas'],
  'oklahoma city thunder': ['thunder', 'okc', 'oklahoma city'],
  'memphis grizzlies': ['grizzlies', 'memphis'],
  'new orleans pelicans': ['pelicans', 'new orleans'],
  'minnesota timberwolves': ['timberwolves', 'wolves', 'minnesota'],
  'la clippers': ['clippers', 'la clippers'],
  'chicago bulls': ['bulls', 'chicago'],
  'toronto raptors': ['raptors', 'toronto'],
  'portland trail blazers': ['blazers', 'trail blazers', 'portland'],
  'sacramento kings': ['kings', 'sacramento'],
  'utah jazz': ['jazz', 'utah'],
  'orlando magic': ['magic', 'orlando'],
  // Soccer — common short names
  'real madrid': ['real madrid cf', 'real madrid'],
  'fc barcelona': ['barcelona', 'barça', 'barca'],
  'galatasaray': ['galatasaray sk', 'galatasaray'],
  'juventus': ['juventus fc', 'juventus'],
  'benfica': ['sport lisboa e benfica', 'sl benfica', 'benfica'],
  'borussia dortmund': ['bv borussia 09 dortmund', 'borussia dortmund', 'dortmund'],
  'atalanta': ['atalanta bc', 'atalanta'],
  'internazionale': ['fc internazionale milano', 'inter milan', 'inter'],
  'paris saint-germain': ['paris saint-germain fc', 'psg'],
  'atletico madrid': ['club atlético de madrid', 'atletico madrid', 'atlético'],
  'manchester city': ['manchester city fc', 'man city'],
  // NCAAB
  'wisconsin badgers': ['badgers', 'wisconsin'],
  'ohio state buckeyes': ['buckeyes', 'ohio state'],
  'michigan wolverines': ['wolverines', 'michigan'],
  'purdue boilermakers': ['boilermakers', 'purdue'],
};

/**
 * Fetch events + odds for a specific league, optionally for a specific date.
 * @param {string} leagueSlug - e.g. 'basketball/nba'
 * @param {string} [dateStr] - YYYYMMDD format date, defaults to today
 */
async function fetchLeagueEvents(leagueSlug, dateStr = null) {
  const cacheKey = `league_${leagueSlug}_${dateStr || 'today'}`;
  const cached = eventCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.events;
  }

  try {
    let url = `${ESPN_BASE}/${leagueSlug}/scoreboard`;
    if (dateStr) url += `?dates=${dateStr}`;
    
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'MarketPlayMaker/2.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      log.warn('ESPN', `${leagueSlug} API returned ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const events = (data.events || []).map(e => parseEvent(e, leagueSlug));
    
    eventCache.set(cacheKey, { events, timestamp: Date.now() });
    return events;
  } catch (err) {
    log.warn('ESPN', `Failed to fetch ${leagueSlug}: ${err.message}`);
    return [];
  }
}

/**
 * Parse an ESPN event into a normalized format.
 */
function parseEvent(event, leagueSlug) {
  const comp = event.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const odds = comp.odds?.[0] || {};

  const homeTeam = competitors.find(c => c.homeAway === 'home');
  const awayTeam = competitors.find(c => c.homeAway === 'away');

  // Parse moneyline from details string: "HOU -150" or "JUV +125"
  let favoredTeam = null;
  let moneyline = null;
  const details = odds.details || '';
  const mlMatch = details.match(/([A-Z]{2,5})\s+([+-]\d+)/);
  if (mlMatch) {
    favoredTeam = mlMatch[1];
    moneyline = parseInt(mlMatch[2]);
  }

  return {
    id: event.id,
    name: event.name || '',
    shortName: event.shortName || '',
    date: event.date,
    league: LEAGUES[leagueSlug]?.name || leagueSlug,
    leagueSlug,
    status: comp.status?.type?.name || 'unknown', // pre, in, post
    home: {
      name: homeTeam?.team?.displayName || '',
      shortName: homeTeam?.team?.shortDisplayName || '',
      abbreviation: homeTeam?.team?.abbreviation || '',
    },
    away: {
      name: awayTeam?.team?.displayName || '',
      shortName: awayTeam?.team?.shortDisplayName || '',
      abbreviation: awayTeam?.team?.abbreviation || '',
    },
    odds: {
      provider: odds.provider?.name || null,
      details,
      spread: odds.spread != null ? parseFloat(odds.spread) : null,
      overUnder: odds.overUnder != null ? parseFloat(odds.overUnder) : null,
      moneyline,
      favoredTeam,
    },
  };
}

/**
 * Convert American moneyline to implied probability.
 * -150 → 60%, +125 → 44.4%
 */
function moneylineToProbability(ml) {
  if (ml == null) return null;
  if (ml < 0) {
    // Favorite: -150 means bet $150 to win $100
    return Math.abs(ml) / (Math.abs(ml) + 100);
  } else {
    // Underdog: +125 means bet $100 to win $125
    return 100 / (ml + 100);
  }
}

/**
 * Convert point spread to moneyline-equivalent probability.
 * Uses the standard NFL/NBA spread-to-ML conversion.
 * NBA: each spread point ≈ 3-4% probability
 * Soccer: spread is less meaningful, use moneyline directly
 */
function spreadToProbability(spread, sport) {
  if (spread == null) return null;
  const absSpread = Math.abs(spread);
  
  if (sport === 'basketball') {
    // NBA/NCAAB: ~ 3.5% per point of spread
    const prob = 0.5 + (absSpread * 0.035);
    return Math.min(0.95, Math.max(0.05, spread < 0 ? prob : 1 - prob));
  } else if (sport === 'football') {
    // NFL: ~ 3% per point
    const prob = 0.5 + (absSpread * 0.03);
    return Math.min(0.95, Math.max(0.05, spread < 0 ? prob : 1 - prob));
  }
  return null;
}

/**
 * Normalize a team name for matching.
 */
function normalizeTeam(name) {
  return (name || '').toLowerCase()
    .replace(/\b(fc|cf|sc|sk|bc|sv|bv|fk)\b/gi, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

/**
 * Check if a team name matches an ESPN team.
 */
function teamsMatch(polyTeam, espnTeam) {
  const pNorm = normalizeTeam(polyTeam);
  const eNorm = normalizeTeam(espnTeam.name);
  const eShort = normalizeTeam(espnTeam.shortName);
  const eAbbr = espnTeam.abbreviation?.toLowerCase() || '';

  // Direct match
  if (pNorm === eNorm || pNorm === eShort) return true;
  if (pNorm.includes(eShort) || eShort.includes(pNorm)) return true;
  if (pNorm.includes(eNorm) || eNorm.includes(pNorm)) return true;

  // Check aliases
  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    const allNames = [canonical, ...aliases].map(n => normalizeTeam(n));
    const pMatches = allNames.some(a => pNorm.includes(a) || a.includes(pNorm));
    const eMatches = allNames.some(a => eNorm.includes(a) || eShort.includes(a) || a === eAbbr);
    if (pMatches && eMatches) return true;
  }

  return false;
}

/**
 * Match a Polymarket question to an ESPN event.
 * Returns { event, homeWinProb, awayWinProb, matchType } or null.
 */
async function matchMarketToESPN(market) {
  const question = market.question || '';
  const qLower = question.toLowerCase();

  // Determine which leagues to check
  const relevantLeagues = [];
  for (const [slug, config] of Object.entries(LEAGUES)) {
    if (config.pattern.test(qLower)) {
      relevantLeagues.push(slug);
    }
  }

  // For dated soccer questions, always add ALL soccer leagues to ensure we don't miss cross-league matches
  // e.g., "Manchester City" might match UCL but the game is actually EPL
  const allSoccerLeagues = ['soccer/uefa.champions', 'soccer/eng.1', 'soccer/ger.1', 'soccer/esp.1', 'soccer/ita.1', 'soccer/uefa.europa', 'soccer/fra.1'];
  const hasSoccerLeague = relevantLeagues.some(l => l.startsWith('soccer/'));
  const hasDateInQuestion = /\d{4}-\d{2}-\d{2}|win on|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i.test(question);
  
  if (hasSoccerLeague && hasDateInQuestion) {
    // Add all soccer leagues that aren't already there
    for (const sl of allSoccerLeagues) {
      if (!relevantLeagues.includes(sl)) relevantLeagues.push(sl);
    }
  }
  
  // Fallback: if question mentions "win on" with a date, try all soccer leagues
  if (relevantLeagues.length === 0 && /win on \d{4}/i.test(question)) {
    relevantLeagues.push(...allSoccerLeagues);
  }
  if (relevantLeagues.length === 0 && /vs\./i.test(question)) {
    relevantLeagues.push('basketball/nba', 'hockey/nhl', 'basketball/mens-college-basketball');
  }

  if (relevantLeagues.length === 0) return null;

  // Extract date from question for fetching the right day's events
  // "win on 2026-02-24" or "February 21" etc.
  let queryDates = [null]; // null = today
  const isoDateMatch = question.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    queryDates = [`${isoDateMatch[1]}${isoDateMatch[2]}${isoDateMatch[3]}`];
  } else {
    // "February 21" or "Feb 24"
    const monthNames = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
                         july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
                         jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
                         aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const textDateMatch = question.match(/(?:on|[-–])\s*(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (textDateMatch) {
      const month = monthNames[textDateMatch[1].toLowerCase()];
      const day = textDateMatch[2].padStart(2, '0');
      const year = textDateMatch[3] || new Date().getFullYear().toString();
      if (month) queryDates = [`${year}${month}${day}`];
    }
  }

  // Fetch events for relevant leagues (possibly for a specific date)
  const allEvents = [];
  for (const slug of relevantLeagues) {
    for (const dateStr of queryDates) {
      const events = await fetchLeagueEvents(slug, dateStr);
      allEvents.push(...events);
    }
  }

  if (allEvents.length === 0) return null;

  // Extract team names from Polymarket question
  // Patterns: "Team A vs. Team B", "Will Team A win on DATE?"
  let polyTeams = [];
  
  // "X vs. Y" or "X vs Y"
  const vsMatch = question.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[:?]|$)/i);
  if (vsMatch) {
    polyTeams = [vsMatch[1].trim(), vsMatch[2].trim()];
  }
  
  // "Will X win on DATE?"
  const winMatch = question.match(/Will\s+(.+?)\s+win\s+on\s+/i);
  if (winMatch && polyTeams.length === 0) {
    polyTeams = [winMatch[1].trim()];
  }

  // "X: O/U Y" or "X: Both Teams to Score"
  const propMatch = question.match(/^(.+?)\s+vs\.?\s+(.+?):\s+(O\/U|Both Teams)/i);
  if (propMatch) {
    polyTeams = [propMatch[1].trim(), propMatch[2].trim()];
  }

  if (polyTeams.length === 0) return null;

  // Find matching ESPN event
  let bestMatch = null;
  let bestScore = 0;

  for (const event of allEvents) {
    // Skip completed games
    if (event.status === 'post') continue;

    let score = 0;
    let matchedHome = false;
    let matchedAway = false;

    for (const pt of polyTeams) {
      if (teamsMatch(pt, event.home)) { matchedHome = true; score += 2; }
      if (teamsMatch(pt, event.away)) { matchedAway = true; score += 2; }
    }

    // For "Will X win?" only one team needs to match
    if (polyTeams.length === 1 && (matchedHome || matchedAway)) {
      score += 1;
    }

    // Both teams match = strong match
    if (matchedHome && matchedAway) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { event, matchedHome, matchedAway };
    }
  }

  if (!bestMatch || bestScore < 2) return null;

  const { event } = bestMatch;

  // Calculate win probabilities
  let homeWinProb = null;
  let awayWinProb = null;
  const sport = event.leagueSlug.startsWith('basketball') ? 'basketball' :
                event.leagueSlug.startsWith('football') ? 'football' : 'soccer';

  // Use moneyline first (more accurate)
  if (event.odds.moneyline != null) {
    const favoredProb = moneylineToProbability(event.odds.moneyline);
    if (favoredProb != null) {
      // Determine which team is favored
      const favoredAbbr = event.odds.favoredTeam?.toLowerCase();
      const homeAbbr = event.home.abbreviation?.toLowerCase();
      const awayAbbr = event.away.abbreviation?.toLowerCase();

      if (favoredAbbr === homeAbbr) {
        homeWinProb = event.odds.moneyline < 0 ? favoredProb : 1 - favoredProb;
        awayWinProb = 1 - homeWinProb;
      } else if (favoredAbbr === awayAbbr) {
        awayWinProb = event.odds.moneyline < 0 ? favoredProb : 1 - favoredProb;
        homeWinProb = 1 - awayWinProb;
      } else {
        // Can't determine which team — try spread
        if (event.odds.spread != null && (sport === 'basketball' || sport === 'football')) {
          homeWinProb = spreadToProbability(event.odds.spread, sport);
          if (homeWinProb != null) awayWinProb = 1 - homeWinProb;
        }
      }
    }
  }

  // Fallback to spread if no moneyline
  if (homeWinProb == null && event.odds.spread != null && (sport === 'basketball' || sport === 'football')) {
    homeWinProb = spreadToProbability(event.odds.spread, sport);
    if (homeWinProb != null) awayWinProb = 1 - homeWinProb;
  }

  // For soccer with moneyline but draw possible, adjust:
  // In soccer, home + draw + away = 100%. Moneyline doesn't account for draw.
  // Approximate: multiply by ~0.85 to leave room for ~15% draw probability
  if (sport === 'soccer' && homeWinProb != null) {
    const drawProb = 0.25; // Average draw rate in top leagues
    homeWinProb = homeWinProb * (1 - drawProb);
    awayWinProb = awayWinProb * (1 - drawProb);
  }

  if (homeWinProb == null && awayWinProb == null) return null;

  return {
    event,
    homeWinProb: Math.round(homeWinProb * 1000) / 1000,
    awayWinProb: Math.round(awayWinProb * 1000) / 1000,
    drawProb: sport === 'soccer' ? 0.25 : null,
    sport,
    matchScore: bestScore,
  };
}

/**
 * Get ESPN signal for a Polymarket market.
 * Main entry point for the independent signals pipeline.
 */
async function getESPNSignal(market) {
  const question = market.question || '';

  const match = await matchMarketToESPN(market);
  if (!match) return null;

  const { event, homeWinProb, awayWinProb, drawProb, sport, matchScore } = match;

  // Determine which probability to return based on the question
  let prob = null;
  let detail = '';
  let matchType = 'moneyline';

  const qLower = question.toLowerCase();

  // "Will X win?" → return that team's win probability
  const winMatch = question.match(/Will\s+(.+?)\s+win/i);
  if (winMatch) {
    const teamName = winMatch[1].trim();
    if (teamsMatch(teamName, event.home)) {
      prob = homeWinProb;
      detail = `${event.home.shortName} ${(homeWinProb * 100).toFixed(0)}% to win (${event.odds.provider || 'ESPN'}: ${event.odds.details})`;
    } else if (teamsMatch(teamName, event.away)) {
      prob = awayWinProb;
      detail = `${event.away.shortName} ${(awayWinProb * 100).toFixed(0)}% to win (${event.odds.provider || 'ESPN'}: ${event.odds.details})`;
    }
  }

  // "X vs. Y" → return home team's probability (typical for Polymarket "who wins" style)
  if (prob == null && /vs\.?/i.test(question)) {
    // Check which team is listed first in Polymarket
    const vsMatch = question.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[:?]|$)/i);
    if (vsMatch) {
      const firstTeam = vsMatch[1].trim();
      if (teamsMatch(firstTeam, event.home)) {
        prob = homeWinProb;
      } else if (teamsMatch(firstTeam, event.away)) {
        prob = awayWinProb;
      } else {
        prob = homeWinProb; // Default to home
      }
    }
    detail = `${event.away.shortName} @ ${event.home.shortName} (${event.odds.provider || 'ESPN'}: ${event.odds.details})`;
  }

  // "O/U X.5" → use overUnder from ESPN
  if (prob == null && /o\/u\s+[\d.]+/i.test(question)) {
    const ouMatch = question.match(/o\/u\s+([\d.]+)/i);
    if (ouMatch && event.odds.overUnder != null) {
      const polyOU = parseFloat(ouMatch[1]);
      // If ESPN's O/U is higher than Polymarket's → lean toward Over
      // If lower → lean toward Under
      // Simple heuristic: each 0.5 point difference ≈ 5% shift
      const diff = event.odds.overUnder - polyOU;
      prob = 0.5 + (diff * 0.1); // Rough conversion
      prob = Math.min(0.85, Math.max(0.15, prob));
      detail = `ESPN O/U: ${event.odds.overUnder} vs Poly O/U: ${polyOU}`;
      matchType = 'overunder';
    }
  }

  // "Both Teams to Score" → use O/U as proxy (higher O/U = more likely both score)
  if (prob == null && /both teams to score/i.test(question)) {
    if (event.odds.overUnder != null) {
      // O/U > 3 → ~60% BTTS, O/U < 2 → ~35% BTTS (soccer heuristic)
      prob = 0.3 + (Math.min(event.odds.overUnder, 4) - 1.5) * 0.12;
      prob = Math.min(0.75, Math.max(0.25, prob));
      detail = `BTTS estimate from O/U ${event.odds.overUnder}`;
      matchType = 'btts';
    }
  }

  // "end in a draw" → use draw probability
  if (prob == null && /draw|tie/i.test(question)) {
    prob = drawProb || 0.25;
    detail = `Draw probability from ${event.odds.provider || 'ESPN'} odds`;
    matchType = 'draw';
  }

  if (prob == null) return null;

  return {
    prob: Math.round(prob * 1000) / 1000,
    confidence: event.odds.moneyline != null ? 'HIGH' : 'MEDIUM',
    detail,
    matchQuality: matchScore >= 5 ? 0.95 : matchScore >= 3 ? 0.85 : 0.7,
    matchedEvent: event.name,
    sport,
    league: event.league,
    matchType,
    provider: event.odds.provider || 'ESPN',
    homeTeam: event.home.name,
    awayTeam: event.away.name,
    homeWinProb,
    awayWinProb,
    drawProb,
    overUnder: event.odds.overUnder,
    moneyline: event.odds.moneyline,
    spread: event.odds.spread,
  };
}

/**
 * Fetch all events across all tracked leagues. 
 * Used for status/diagnostics.
 */
async function fetchAllEvents() {
  const all = [];
  for (const slug of Object.keys(LEAGUES)) {
    const events = await fetchLeagueEvents(slug);
    all.push(...events);
  }
  return all;
}

function getStatus() {
  const cached = [...eventCache.entries()].map(([key, val]) => ({
    league: key.replace('league_', ''),
    events: val.events.length,
    age: Math.round((Date.now() - val.timestamp) / 1000) + 's ago',
  }));

  return {
    source: 'ESPN',
    status: 'active',
    description: 'FREE sportsbook odds from ESPN (DraftKings)',
    cachedLeagues: cached.length,
    cachedEvents: cached.reduce((sum, c) => sum + c.events, 0),
    leagues: cached,
    supportedLeagues: Object.keys(LEAGUES).length,
    apiKeyRequired: false,
  };
}

function refresh() {
  eventCache.clear();
  log.info('ESPN', 'Cache cleared — will refetch on next request');
}

module.exports = {
  getESPNSignal,
  matchMarketToESPN,
  fetchAllEvents,
  fetchLeagueEvents,
  moneylineToProbability,
  spreadToProbability,
  getStatus,
  refresh,
  LEAGUES,
};
