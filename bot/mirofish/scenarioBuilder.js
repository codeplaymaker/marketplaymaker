/**
 * MiroFish Scenario Builder
 *
 * Converts Polymarket market questions into rich scenario documents
 * optimized for MiroFish's multi-agent social simulation.
 *
 * MiroFish works best with documents that describe:
 *   - A specific question/prediction to evaluate
 *   - Key stakeholders and their known positions
 *   - Recent context and events
 *   - Timeline and resolution criteria
 *
 * This module uses the bot's existing LLM + news infrastructure to
 * build high-quality scenario docs, then saves them as .md files
 * for upload to MiroFish.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

let newsSignal = null;
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

let llmAnalysis = null;
try { llmAnalysis = require('../data/llmAnalysis'); } catch { /* optional */ }

const SCENARIO_DIR = path.join(__dirname, '../logs/mirofish-scenarios');

// Ensure scenario directory exists
try { fs.mkdirSync(SCENARIO_DIR, { recursive: true }); } catch { /* exists */ }

// ─── Market Category Detection ───────────────────────────────────────

const CATEGORY_PATTERNS = {
  politics: /trump|biden|election|congress|senate|governor|president|democrat|republican|vote|impeach|legislation|mandate|cabinet|campaign|poll|ballot|primary|caucus|inaugurat/i,
  geopolitics: /war|ceasefire|sanction|nato|invasion|nuclear|treaty|tariff|diplomat|peace.?deal|military|iran|ukraine|russia|china|taiwan|israel|gaza|hamas|hezbollah|north.?korea|india|pakistan/i,
  regulation: /ban|regulat|sec|fda|fcc|ftc|eu.?commission|antitrust|approve|approval|legislat|executive.?order|bill.?pass/i,
  economics: /recession|inflation|interest.?rate|gdp|fed|unemployment|debt.?ceiling|default|market.?crash|downturn|stimulus/i,
  tech: /ai|artificial.?intelligence|openai|google|apple|meta|amazon|microsoft|spacex|launch|agi|superintelligence/i,
  crypto: /bitcoin|ethereum|solana|crypto|btc|eth|halvening|etf/i,
  science: /climate|vaccine|pandemic|covid|fda.?approv|breakthrough|discover/i,
  culture: /oscar|grammy|super.?bowl|world.?cup|olympics|tiktok|youtube|spotify/i,
};

/**
 * Determine if a market is suitable for MiroFish simulation.
 * MiroFish excels at complex multi-stakeholder scenarios (politics,
 * geopolitics, regulation), NOT simple sports/crypto price markets.
 *
 * @param {Object} market - { question, category, yesPrice, endDate, ... }
 * @returns {{ suitable: boolean, category: string, priority: number, reason: string }}
 */
function assessSuitability(market) {
  const q = (market.question || '').toLowerCase();

  // ── Sports detection FIRST (highest priority exclusion) ─────────
  // "vs" or "vs." is the strongest sports indicator
  const hasVs = /\bvs\.?\s/i.test(q);
  const sportsLeague = /\b(nba|nfl|nhl|mlb|ufc|mls|epl|la liga|serie a|bundesliga|ligue 1|premier\s?league|champions\s?league|europa\s?league|world\s?series|afl|ipl|odi|t20|test\s?match|cricket|rugby|tennis|liga mx|super\s?bowl|march\s?madness)\b/i.test(q);
  const sportsTerms = /\b(win\s?(the|on|vs)|defeat|match|playoff|seed|standings|round\s?\d|game\s?\d|score|o\/u\s?\d|spread|moneyline|point\s?spread|over\/?under|total\s?points|total\s?goals)\b/i.test(q);
  const sportsTeamPattern = /\b(lakers|celtics|warriors|knicks|nets|bulls|heat|bucks|76ers|clippers|suns|grizzlies|cavaliers|mavericks|nuggets|thunder|rockets|pistons|hawks|magic|wizards|pacers|hornets|pelicans|raptors|spurs|blazers|kings|timberwolves|jazz|chiefs|eagles|cowboys|49ers|ravens|bills|dolphins|bengals|lions|packers|bears|rams|chargers|steelers|browns|saints|vikings|texans|falcons|cardinals|seahawks|panthers|jaguars|titans|broncos|raiders|commanders|giants|jets|colts|patriots|bruins|rangers|penguins|capitals|lightning|hurricanes|maple\s?leafs|canadiens|oilers|flames|canucks|avalanche|stars|blues|predators|red\s?wings|blackhawks|flyers|senators|sharks|devils|islanders|kraken|wild|coyotes|ducks|sabres|blue\s?jackets|yankees|dodgers|astros|braves|phillies|padres|mets|cubs|guardians|twins|orioles|rays|mariners|athletics|rangers|brewers|reds|pirates|rockies|diamondbacks|marlins|royals|tigers|white\s?sox|red\s?sox|angels|nationals|cardinals)\b/i.test(q);
  const sportsSuffix = /\b(fc|cf|sc|ac|afc|rfc|united|city|rovers|athletic|sporting|albion|wanderers|hotspur|real\s?madrid|barcelona|juventus|bayern|arsenal|chelsea|liverpool|man\s?(city|united)|tottenham|inter\s?milan|ac\s?milan|napoli|dortmund|psg|marseille|lyon|ajax|benfica|porto|feyenoord|galatasaray|fenerbahce|besiktas|celtic|toulouse)\b/i.test(q);
  const oddsFormat = /\bo\/u\s?\d|spread\s?[+-]?\d|moneyline/i.test(q);

  // Strong sports signals
  const isSports = (hasVs && (sportsTeamPattern || sportsSuffix || sportsLeague)) ||
                   sportsLeague ||
                   oddsFormat ||
                   (hasVs && sportsTerms) ||
                   (sportsTeamPattern && sportsTerms);

  if (isSports) {
    return { suitable: false, category: 'sports', priority: 0, reason: 'Sports market — bookmaker signals are superior' };
  }

  // ── Category matching ───────────────────────────────────────────
  const politicsMatch = CATEGORY_PATTERNS.politics.test(q);
  const geopoliticsMatch = CATEGORY_PATTERNS.geopolitics.test(q);
  const regulationMatch = CATEGORY_PATTERNS.regulation.test(q);
  const economicsMatch = CATEGORY_PATTERNS.economics.test(q);
  const techMatch = CATEGORY_PATTERNS.tech.test(q);
  const scienceMatch = CATEGORY_PATTERNS.science.test(q);
  const cryptoMatch = CATEGORY_PATTERNS.crypto.test(q);
  const cultureMatch = CATEGORY_PATTERNS.culture.test(q);

  // For "vs" questions that passed sports check — if the only geopolitics
  // signal is a country name and it looks like a matchup, still skip it
  if (hasVs && geopoliticsMatch && !politicsMatch && !regulationMatch) {
    // Likely a sports/competition matchup that slipped through
    const geoOnlyCountry = /\b(iran|ukraine|russia|china|taiwan|israel|gaza|pakistan|india|north\s?korea)\b/i.test(q);
    const noGeoPolicySig = !/\b(war|ceasefire|sanction|invasion|nuclear|treaty|tariff|diplomat|peace|military|strike|bomb|attack|blockade|embargo)\b/i.test(q);
    if (geoOnlyCountry && noGeoPolicySig) {
      return { suitable: false, category: 'sports', priority: 0, reason: 'Competition/matchup with country name — not geopolitical' };
    }
  }

  // Simple yes/no date thresholds — skip if too far out
  if (market.endDate) {
    const daysOut = (new Date(market.endDate).getTime() - Date.now()) / 86400000;
    if (daysOut > 180) {
      return { suitable: false, category: 'far_future', priority: 0, reason: 'Market >6 months out — simulation too speculative' };
    }
  }

  // Skip extreme prices (market already resolved essentially)
  const price = market.yesPrice ?? 0.5;
  if (price < 0.05 || price > 0.95) {
    return { suitable: false, category: 'resolved', priority: 0, reason: 'Market near resolution (price < 5% or > 95%)' };
  }

  // Geopolitics is MiroFish's sweet spot
  if (geopoliticsMatch) {
    return { suitable: true, category: 'geopolitics', priority: 95, reason: 'Multi-stakeholder geopolitical scenario — ideal for agent simulation' };
  }

  // Politics — complex dynamics with many actors
  if (politicsMatch) {
    return { suitable: true, category: 'politics', priority: 90, reason: 'Political scenario with multiple stakeholders' };
  }

  // Regulation — government agencies, industry, public
  if (regulationMatch) {
    return { suitable: true, category: 'regulation', priority: 85, reason: 'Regulatory decision with stakeholder dynamics' };
  }

  // Economics — Fed, markets, government interplay
  if (economicsMatch) {
    return { suitable: true, category: 'economics', priority: 75, reason: 'Economic scenario with institutional dynamics' };
  }

  // Tech — company decisions, regulatory, public opinion
  if (techMatch && !cryptoMatch) {
    return { suitable: true, category: 'tech', priority: 70, reason: 'Tech/AI scenario with multi-actor dynamics' };
  }

  // Science — public health, regulatory approval
  if (scienceMatch) {
    return { suitable: true, category: 'science', priority: 70, reason: 'Science/health scenario with institutional and public dynamics' };
  }

  // Crypto — on-chain data is better
  if (cryptoMatch) {
    return { suitable: false, category: 'crypto', priority: 0, reason: 'Crypto price market — on-chain data is superior' };
  }

  // Culture / entertainment — might work but lower priority
  if (cultureMatch) {
    return { suitable: true, category: 'culture', priority: 40, reason: 'Entertainment/culture market — moderate simulation value' };
  }

  // Default: check if it has enough complexity
  const wordCount = q.split(/\s+/).length;
  if (wordCount >= 8) {
    return { suitable: true, category: 'other', priority: 30, reason: 'Complex market question — may benefit from simulation' };
  }

  return { suitable: false, category: 'simple', priority: 0, reason: 'Simple market — standard signals sufficient' };
}

// ─── Scenario Document Generation ────────────────────────────────────

/**
 * Build a rich scenario document from a market question and context.
 * This is the key input for MiroFish's knowledge graph builder.
 *
 * @param {Object} market - { question, conditionId, category, endDate, description }
 * @param {Object} options - { headlines: [], enrichWithLLM: true }
 * @returns {{ path: string, content: string, requirement: string }}
 */
async function buildScenario(market, options = {}) {
  const { headlines = [], enrichWithLLM = true } = options;
  const q = market.question || '';
  const assessment = assessSuitability(market);

  // Gather news context
  let newsContext = '';
  if (newsSignal && headlines.length === 0) {
    try {
      const ns = newsSignal.getSentimentSignal(market);
      if (ns?.headlines?.length > 0) {
        newsContext = ns.headlines.map(h => `- ${h.title} (${h.source})`).join('\n');
      }
    } catch { /* no news available */ }
  } else if (headlines.length > 0) {
    newsContext = headlines.slice(0, 10).map(h => `- ${h.title || h} (${h.source || ''})`).join('\n');
  }

  // Use LLM to expand the market question into a rich scenario
  let expandedScenario = '';
  if (enrichWithLLM && llmAnalysis && llmAnalysis.getStatus().configured) {
    try {
      expandedScenario = await generateScenarioWithLLM(q, assessment.category, newsContext, market.endDate);
    } catch (err) {
      log.warn('MIROFISH', `LLM scenario expansion failed: ${err.message}`);
    }
  }

  // Build the scenario document
  const scenarioContent = buildScenarioMarkdown(market, assessment, newsContext, expandedScenario);

  // Build the simulation requirement (what MiroFish should focus on)
  const requirement = buildRequirement(market, assessment);

  // Save to disk
  const safeName = (market.conditionId || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const filePath = path.join(SCENARIO_DIR, `scenario_${safeName}.md`);
  fs.writeFileSync(filePath, scenarioContent, 'utf8');

  log.info('MIROFISH', `Scenario built for "${q.slice(0, 50)}": ${filePath} (${scenarioContent.length} chars)`);

  return {
    path: filePath,
    content: scenarioContent,
    requirement,
    category: assessment.category,
    priority: assessment.priority,
  };
}

function buildScenarioMarkdown(market, assessment, newsContext, expandedScenario) {
  const q = market.question || '';
  const lines = [];

  lines.push(`# Prediction Market Analysis: ${q}`);
  lines.push('');
  lines.push(`## Market Question`);
  lines.push(`**"${q}"**`);
  lines.push('');

  if (market.endDate) {
    lines.push(`**Resolution Date:** ${new Date(market.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    const daysOut = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
    lines.push(`**Days Until Resolution:** ${daysOut}`);
    lines.push('');
  }

  lines.push(`**Category:** ${assessment.category}`);
  lines.push(`**Current Market Price:** ${market.yesPrice ? `${(market.yesPrice * 100).toFixed(0)}% YES` : 'Unknown'}`);
  lines.push('');

  if (market.description) {
    lines.push(`## Market Description`);
    lines.push(market.description);
    lines.push('');
  }

  if (expandedScenario) {
    lines.push(`## Detailed Scenario Analysis`);
    lines.push(expandedScenario);
    lines.push('');
  }

  if (newsContext) {
    lines.push(`## Recent News and Developments`);
    lines.push(newsContext);
    lines.push('');
  }

  lines.push(`## Simulation Focus`);
  lines.push(`This scenario should be simulated to determine the likelihood of the prediction market question resolving YES. `);
  lines.push(`Key areas to model:`);
  lines.push(`- How do different stakeholders publicly discuss and react to this question?`);
  lines.push(`- What arguments do supporters and opponents make?`);
  lines.push(`- How does public opinion shift as new information emerges?`);
  lines.push(`- What are the likely outcomes based on stakeholder dynamics?`);
  lines.push('');

  return lines.join('\n');
}

function buildRequirement(market, assessment) {
  const q = market.question || '';
  const cat = assessment.category;

  const baseReq = `Simulate a social media discussion about the prediction market question: "${q}". `;

  const categoryReqs = {
    geopolitics: `Focus on government officials, military analysts, diplomats, journalists, and affected civilian populations. Model the information dynamics between official positions and public reaction. Track how escalation or de-escalation signals propagate through social media.`,
    politics: `Focus on politicians, political commentators, pollsters, campaign staff, journalists, and engaged voters. Model partisan dynamics, swing voter sentiment, and how news events shift the narrative.`,
    regulation: `Focus on regulators, industry representatives, lobbyists, consumer advocates, legal analysts, and technology executives. Model the regulatory process dynamics and lobbying pressures.`,
    economics: `Focus on central bankers, economists, financial analysts, business leaders, politicians, and workers/consumers. Model how economic indicators and policy signals affect expectations.`,
    tech: `Focus on tech executives, engineers, regulators, investors, media commentators, and users/consumers. Model how technological developments and competitive dynamics drive outcomes.`,
    science: `Focus on scientists, regulators (FDA/EMA), pharmaceutical executives, public health officials, and the general public. Model how scientific evidence and public perception interact.`,
    culture: `Focus on industry professionals, critics, fans, media outlets, and social media influencers. Model how cultural momentum and public engagement drive outcomes.`,
    other: `model the key stakeholders and their likely public positions on this topic, tracking how information and arguments flow through social media.`,
  };

  const catReq = categoryReqs[cat] || categoryReqs.other;

  return `${baseReq}${catReq} The simulation should reveal the collective intelligence signal about whether this event is likely to happen, by observing how informed actors discuss and react to it.`;
}

// ─── LLM Scenario Expansion ─────────────────────────────────────────

async function generateScenarioWithLLM(question, category, newsContext, endDate) {
  // Use the bot's existing LLM infrastructure
  const apiKey = process.env.OPENAI_API_KEY;
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (!apiKey) return '';

  const providers = {
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
  };
  const cfg = providers[provider] || providers.openai;

  const systemPrompt = `You are a scenario analyst. Given a prediction market question, write a 300-500 word scenario analysis that covers:
1. Background context and current state of affairs
2. Key stakeholders and their known positions
3. Recent developments (use the provided news if available)
4. Arguments FOR the event happening (why YES)
5. Arguments AGAINST the event happening (why NO)
6. Key uncertainties and catalysts

Write in a neutral, factual tone. This will be used for social media simulation, so emphasize WHO the key actors are and WHAT their public positions are likely to be.`;

  const userPrompt = `Prediction market question: "${question}"
Category: ${category}
${endDate ? `Resolution date: ${endDate}` : ''}
${newsContext ? `\nRecent news:\n${newsContext}` : ''}

Write the scenario analysis.`;

  try {
    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    const data = await resp.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }
  } catch (err) {
    log.debug('MIROFISH', `LLM scenario expansion error: ${err.message}`);
  }

  return '';
}

// ─── Batch Operations ────────────────────────────────────────────────

/**
 * Assess all markets and return the top N most suitable for MiroFish.
 *
 * @param {Array} markets - Full market list
 * @param {number} maxMarkets - Max markets to return
 * @returns {Array} Ranked markets with suitability assessments
 */
function rankMarketsForSimulation(markets, maxMarkets = 5) {
  const assessed = markets
    .map(m => ({
      market: m,
      assessment: assessSuitability(m),
    }))
    .filter(a => a.assessment.suitable)
    .sort((a, b) => b.assessment.priority - a.assessment.priority)
    .slice(0, maxMarkets);

  return assessed;
}

module.exports = {
  assessSuitability,
  buildScenario,
  rankMarketsForSimulation,
  SCENARIO_DIR,
};
