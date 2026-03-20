/**
 * MiroFish Strategy Suggester
 *
 * LLM-powered strategy analysis engine that:
 *   1. DIAGNOSES failure modes from simulation test results
 *   2. HYPOTHESIZES concrete strategy improvements
 *   3. VALIDATES suggestions by re-running simulations
 *   4. RANKS recommendations by expected ROI improvement
 *
 * Uses the same LLM infrastructure as llmAnalysis.js (OpenAI/Anthropic/OpenRouter)
 * but with specialized prompts for strategy optimization.
 *
 * Output: Actionable recommendations with confidence intervals,
 * specific parameter changes, and the market regimes where each applies.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Lazy imports to avoid circular deps
let llmAnalysis = null;
let strategyTester = null;
function getLLM() { if (!llmAnalysis) llmAnalysis = require('../data/llmAnalysis'); return llmAnalysis; }
function getTester() { if (!strategyTester) strategyTester = require('./strategyTester'); return strategyTester; }

const SUGGESTIONS_DIR = path.join(__dirname, '../logs/mirofish-suggestions');
try { fs.mkdirSync(SUGGESTIONS_DIR, { recursive: true }); } catch { /* exists */ }

const SUGGESTION_CACHE = path.join(SUGGESTIONS_DIR, 'latest-suggestions.json');

// ─── LLM Configuration ──────────────────────────────────────────────

// Provider settings — reuse same env vars as llmAnalysis
function getLLMConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY,
    provider: process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai'),
    model: process.env.LLM_MODEL || null,
  };
}

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    headers: (key) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  },
};

// ─── Prompts ─────────────────────────────────────────────────────────

const DIAGNOSIS_SYSTEM_PROMPT = `You are an expert quantitative trading strategy analyst. You specialize in prediction market strategies (Polymarket, Kalshi) and agent-based simulation.

Your task is to analyze strategy simulation test results and diagnose specific failure modes.

For each strategy, identify:
1. FAILURE MODES — specific scenarios where the strategy loses money and WHY
2. PARAMETER SENSITIVITIES — which parameters matter most and their optimal ranges
3. REGIME DEPENDENCIES — which market regimes the strategy works/fails in
4. INTERACTION EFFECTS — how the strategy interacts with other market participants
5. EDGE DECAY PATTERN — how fast the strategy's edge evaporates

Be extremely specific. Don't give generic advice like "improve risk management."
Instead: "MOMENTUM loses 12% ROI in VOLATILE regimes because the EMA crossover signal generates false positives when spread > 3%. Fix: add a spread filter of 0.03."

Output valid JSON with this schema:
{
  "diagnoses": [
    {
      "strategy": "STRATEGY_NAME",
      "failureModes": [
        {
          "mode": "Short description",
          "severity": "HIGH|MEDIUM|LOW",
          "scenario": "Which sim scenario exposed this",
          "mechanism": "Detailed explanation of WHY it fails",
          "dataEvidence": "Specific numbers from the test results"
        }
      ],
      "strengthModes": [
        {
          "mode": "What works well",
          "scenario": "Best scenario",
          "mechanism": "Why it works"
        }
      ],
      "overallGrade": "A|B|C|D|F",
      "viability": "STRONG|VIABLE|MARGINAL|UNPROFITABLE"
    }
  ]
}`;

const SUGGESTION_SYSTEM_PROMPT = `You are an expert quantitative strategy designer for prediction markets. You take failure diagnoses and produce CONCRETE, IMPLEMENTABLE strategy improvements.

Rules:
1. Every suggestion must be specific enough to implement in code
2. Include the exact parameter values to change
3. Specify which market regimes the suggestion applies to
4. Estimate the expected improvement with confidence intervals
5. Prioritize suggestions by expected impact

Suggestion types:
- PARAMETER_CHANGE: Change a numeric parameter (threshold, window size, etc.)
- ADD_FILTER: Add a new condition that must be true before trading
- REGIME_SWITCH: Use different parameters in different market regimes
- STRATEGY_COMBO: Combine signals from two strategies
- NEW_STRATEGY: Propose an entirely new strategy concept
- KILL_STRATEGY: Recommend disabling a strategy entirely

Output valid JSON:
{
  "suggestions": [
    {
      "id": 1,
      "type": "PARAMETER_CHANGE|ADD_FILTER|REGIME_SWITCH|STRATEGY_COMBO|NEW_STRATEGY|KILL_STRATEGY",
      "strategy": "STRATEGY_NAME or NEW",
      "title": "Short descriptive title",
      "description": "Detailed explanation",
      "implementation": {
        "changes": [
          {
            "file": "strategies/momentum.js or engine/xxx.js",
            "description": "What to change",
            "before": "Current code/behavior",
            "after": "Proposed code/behavior",
            "parameterName": "paramName",
            "oldValue": "current value",
            "newValue": "proposed value"
          }
        ]
      },
      "expectedImprovement": {
        "roiDelta": "+X.X%",
        "winRateDelta": "+X.X%",
        "drawdownImprovement": "-X%"
      },
      "confidence": "HIGH|MEDIUM|LOW",
      "applicableRegimes": ["CALM", "TRENDING"],
      "risk": "What could go wrong",
      "priority": 1
    }
  ],
  "summary": "One paragraph summary of all recommendations"
}`;

// ─── Core Analysis Pipeline ──────────────────────────────────────────

/**
 * Run the full suggestion pipeline:
 *   1. Get latest test results (or run tests if none exist)
 *   2. Diagnose failure modes via LLM
 *   3. Generate improvement suggestions via LLM
 *   4. Validate top suggestions via re-simulation
 *   5. Rank and return final recommendations
 *
 * @param {Object} opts
 * @param {Object} opts.testResults - Pre-computed test results (or null to use latest)
 * @param {boolean} opts.validate - Whether to re-simulate suggestions (slower but more accurate)
 * @param {number} opts.maxSuggestions - Max suggestions to return
 * @returns {Object} Ranked recommendations with validation results
 */
async function generateSuggestions(opts = {}) {
  const config = getLLMConfig();
  if (!config.apiKey) {
    log.warn('MF_SUGGEST', 'No LLM API key configured — cannot generate suggestions');
    return { error: 'No LLM API key. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or LLM_API_KEY.' };
  }

  const startTime = Date.now();
  log.info('MF_SUGGEST', '=== Starting Strategy Suggestion Pipeline ===');

  // Step 1: Get test results
  let testResults = opts.testResults;
  if (!testResults) {
    testResults = getTester().getLatestFullSuite();
    if (!testResults) {
      log.warn('MF_SUGGEST', 'No test results found. Run strategy tests first.');
      return { error: 'No test results available. Run runFullTestSuite() first.' };
    }
  }

  // Step 2: Diagnose failure modes
  log.info('MF_SUGGEST', 'Phase 1: Diagnosing failure modes via LLM...');
  const diagnosis = await diagnoseFaults(testResults, config);
  if (!diagnosis) return { error: 'LLM diagnosis failed' };

  // Step 3: Generate suggestions
  log.info('MF_SUGGEST', 'Phase 2: Generating improvement suggestions via LLM...');
  const suggestions = await generateImprovements(diagnosis, testResults, config);
  if (!suggestions) return { error: 'LLM suggestion generation failed' };

  // Step 4: Validate (optional)
  let validated = suggestions;
  if (opts.validate !== false && suggestions.suggestions?.length > 0) {
    log.info('MF_SUGGEST', 'Phase 3: Validating top suggestions via simulation...');
    validated = await validateSuggestions(suggestions, testResults);
  }

  // Step 5: Rank and format
  const result = formatRecommendations(validated, diagnosis, testResults);
  result.duration = Math.round((Date.now() - startTime) / 1000);
  result.generatedAt = new Date().toISOString();

  // Cache
  try {
    fs.writeFileSync(SUGGESTION_CACHE, JSON.stringify(result, null, 2));
    const filename = `suggestions-${Date.now()}.json`;
    fs.writeFileSync(path.join(SUGGESTIONS_DIR, filename), JSON.stringify(result, null, 2));
    log.info('MF_SUGGEST', `Suggestions saved: ${filename} (${result.duration}s)`);
  } catch { /* non-critical */ }

  return result;
}

// ─── Phase 1: Diagnosis ──────────────────────────────────────────────

async function diagnoseFaults(testResults, config) {
  // Build a compact summary of test results for the LLM
  const dataSummary = buildTestSummary(testResults);

  const prompt = `Here are the simulation test results for our prediction market trading bot's strategies. Analyze each strategy and diagnose failure modes.

${dataSummary}

Provide a thorough diagnosis for EACH strategy. Be specific about numbers, scenarios, and mechanisms.`;

  try {
    const response = await callLLM(DIAGNOSIS_SYSTEM_PROMPT, prompt, config, { maxTokens: 4000 });
    const parsed = parseJSON(response);
    if (parsed?.diagnoses) {
      log.info('MF_SUGGEST', `Diagnosed ${parsed.diagnoses.length} strategies`);
      return parsed;
    }
    log.warn('MF_SUGGEST', 'Diagnosis response missing expected structure');
    return { diagnoses: [{ strategy: 'ALL', failureModes: [{ mode: response.slice(0, 200), severity: 'MEDIUM' }], overallGrade: 'C', viability: 'VIABLE' }] };
  } catch (err) {
    log.error('MF_SUGGEST', `Diagnosis LLM call failed: ${err.message}`);
    return null;
  }
}

// ─── Phase 2: Suggestion Generation ──────────────────────────────────

async function generateImprovements(diagnosis, testResults, config) {
  const diagnosisSummary = JSON.stringify(diagnosis, null, 2);
  const testSummary = buildTestSummary(testResults);

  const prompt = `Based on these diagnosis results and test data, generate concrete strategy improvements.

## Diagnosis
${diagnosisSummary}

## Test Data Summary
${testSummary}

## Current Bot Architecture
- 12 strategies: PROVEN_EDGE (highest priority), ARBITRAGE, NO_BETS (demoted 47% WR), SPORTS_EDGE (demoted), MOMENTUM, WHALE_DETECTION, CONTRARIAN, SHARP_MONEY, EARLY_MOVER, CROSS_PLATFORM, NEWS_BREAK, PANIC_DIP
- Thompson Sampling Bayesian bandit for capital allocation
- Strategies trade on Polymarket prediction markets (binary YES/NO)
- Risk: Kelly criterion (quarter-Kelly), max 5% per position, 20% total exposure
- Slippage model: static formula based on liquidity
- Strategy optimizer runs every 30 minutes

Generate 5-8 HIGH-IMPACT suggestions. Prioritize by expected ROI improvement.
Include at least one NEW_STRATEGY suggestion if the data supports it.
Include KILL_STRATEGY if any strategy is consistently unprofitable.`;

  try {
    const response = await callLLM(SUGGESTION_SYSTEM_PROMPT, prompt, config, { maxTokens: 5000 });
    const parsed = parseJSON(response);
    if (parsed?.suggestions) {
      log.info('MF_SUGGEST', `Generated ${parsed.suggestions.length} suggestions`);
      return parsed;
    }
    return { suggestions: [], summary: response.slice(0, 500) };
  } catch (err) {
    log.error('MF_SUGGEST', `Suggestion LLM call failed: ${err.message}`);
    return null;
  }
}

// ─── Phase 3: Validation via Re-Simulation ───────────────────────────

async function validateSuggestions(suggestions, testResults) {
  const tester = getTester();
  const topSuggestions = (suggestions.suggestions || [])
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .slice(0, 5); // Validate top 5

  for (const suggestion of topSuggestions) {
    try {
      if (suggestion.type === 'KILL_STRATEGY') {
        // For kill suggestions, validate by checking current test results
        const stratData = testResults.individual?.[suggestion.strategy];
        if (stratData?.overall?.overallPnL < 0) {
          suggestion.validated = true;
          suggestion.validationResult = 'CONFIRMED — strategy is net negative in simulation';
        } else {
          suggestion.validated = false;
          suggestion.validationResult = 'NOT CONFIRMED — strategy is positive in some scenarios';
        }
        continue;
      }

      if (suggestion.type === 'PARAMETER_CHANGE' || suggestion.type === 'ADD_FILTER') {
        // Create a mock strategy with the suggested parameter change
        const mockStrategy = createMockStrategy(suggestion);
        if (mockStrategy) {
          const result = await tester.testStrategy(mockStrategy, {
            category: 'politics',
            runsPerScenario: 2,
            scenarios: ['normal', 'edgeDecay', 'newsBreak'],
          });

          // Compare with original
          const originalOverall = testResults.individual?.[suggestion.strategy]?.overall;
          if (originalOverall && result.overall) {
            const pnlImprovement = result.overall.overallPnL - originalOverall.overallPnL;
            const wrImprovement = result.overall.overallWinRate - originalOverall.overallWinRate;

            suggestion.validated = pnlImprovement > 0;
            suggestion.validationResult = {
              originalPnL: originalOverall.overallPnL,
              suggestedPnL: result.overall.overallPnL,
              improvement: r2(pnlImprovement),
              wrImprovement: r2(wrImprovement),
              confirmed: pnlImprovement > 0,
            };

            log.info('MF_SUGGEST', `Validated "${suggestion.title}": ${pnlImprovement > 0 ? '✓' : '✗'} (PnL ${pnlImprovement > 0 ? '+' : ''}${pnlImprovement.toFixed(2)})`);
          }
        }
      }
    } catch (err) {
      suggestion.validated = false;
      suggestion.validationResult = `Validation failed: ${err.message}`;
    }
  }

  return suggestions;
}

/**
 * Create a mock strategy object from a suggestion.
 * The mock has modified parameters based on the suggestion's implementation changes.
 */
function createMockStrategy(suggestion) {
  if (!suggestion.implementation?.changes) return null;

  // Build a simple strategy that uses the suggested parameters
  const stratName = suggestion.strategy || 'GENERIC';
  const changes = suggestion.implementation.changes;

  // Extract key parameter changes
  const params = {};
  for (const change of changes) {
    if (change.parameterName && change.newValue != null) {
      params[change.parameterName] = typeof change.newValue === 'string'
        ? parseFloat(change.newValue) || change.newValue
        : change.newValue;
    }
  }

  return {
    name: `${stratName}_suggested`,
    findOpportunities: async () => [], // Not used in sim — StrategyAgent uses its own eval
    ...params,
  };
}

// ─── Output Formatting ───────────────────────────────────────────────

function formatRecommendations(suggestions, diagnosis, testResults) {
  const recList = (suggestions.suggestions || [])
    .map((s, i) => ({
      rank: i + 1,
      id: s.id || i + 1,
      type: s.type,
      strategy: s.strategy,
      title: s.title,
      description: s.description,
      implementation: s.implementation,
      expectedImprovement: s.expectedImprovement,
      confidence: s.confidence || 'MEDIUM',
      applicableRegimes: s.applicableRegimes || ['ALL'],
      risk: s.risk,
      validated: s.validated ?? null,
      validationResult: s.validationResult ?? null,
    }))
    .sort((a, b) => {
      // Sort: validated first, then by priority
      if (a.validated === true && b.validated !== true) return -1;
      if (b.validated === true && a.validated !== true) return 1;
      return (a.rank || 99) - (b.rank || 99);
    });

  // Strategy grades from diagnosis
  const grades = {};
  for (const d of (diagnosis.diagnoses || [])) {
    grades[d.strategy] = {
      grade: d.overallGrade,
      viability: d.viability,
      failureModeCount: d.failureModes?.length || 0,
    };
  }

  // Build summary table
  const summaryRows = recList.slice(0, 8).map(r => {
    const validMark = r.validated === true ? ' ✓' : r.validated === false ? ' ✗' : '';
    const roi = r.expectedImprovement?.roiDelta || 'TBD';
    return `  #${r.rank}  ${r.title.padEnd(40)} ${roi.padEnd(10)} ${r.confidence}${validMark}`;
  });

  return {
    recommendations: recList,
    diagnosis: grades,
    summary: suggestions.summary || '',
    displayTable: [
      '┌─────────────────────────────────────────────────────────────────┐',
      `│  MiroFish Strategy Recommendations — ${new Date().toISOString().split('T')[0]}              │`,
      '├─────────────────────────────────────────────────────────────────┤',
      ...summaryRows.map(r => `│${r.padEnd(65)}│`),
      '└─────────────────────────────────────────────────────────────────┘',
    ].join('\n'),
    strategyGrades: grades,
    stats: {
      totalSuggestions: recList.length,
      validated: recList.filter(r => r.validated === true).length,
      rejected: recList.filter(r => r.validated === false).length,
      pending: recList.filter(r => r.validated === null).length,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildTestSummary(testResults) {
  const lines = [];

  // Rankings
  if (testResults.rankings) {
    lines.push('## Strategy Rankings (by simulated PnL)');
    for (const r of testResults.rankings) {
      lines.push(`- ${r.strategy}: PnL=$${r.overallPnL}, ROI=${r.overallROI}%, WR=${(r.overallWinRate * 100).toFixed(0)}%, Drawdown=${(r.overallDrawdown * 100).toFixed(1)}%, MinEdge=${r.edgeDecayMinEdge}`);
    }
  }

  // Per-strategy scenario breakdown
  if (testResults.individual) {
    lines.push('\n## Per-Strategy Scenario Results');
    for (const [name, data] of Object.entries(testResults.individual)) {
      if (data.error) { lines.push(`- ${name}: ERROR (${data.error})`); continue; }
      lines.push(`\n### ${name}`);
      if (data.overall) {
        lines.push(`  Overall: PnL=$${data.overall.overallPnL}, ROI=${data.overall.overallROI}%, WR=${(data.overall.overallWinRate * 100).toFixed(0)}%, DD=${(data.overall.overallDrawdown * 100).toFixed(1)}%`);
        lines.push(`  Best scenario: ${data.overall.bestScenario}, Worst: ${data.overall.worstScenario}`);
      }
      if (data.scenarios) {
        for (const [scenario, sd] of Object.entries(data.scenarios)) {
          lines.push(`  ${scenario}: PnL=$${sd.avgPnL}, ROI=${sd.avgROI}%, WR=${(sd.avgWinRate * 100).toFixed(0)}%, DD=${(sd.avgDrawdown * 100).toFixed(1)}%, EdgeDecay=${sd.avgEdgeDecay}, HalfLife=${sd.avgEdgeHalfLife}`);
        }
      }
    }
  }

  // Portfolio results
  if (testResults.portfolio) {
    lines.push('\n## Portfolio Test');
    lines.push(`  Total PnL: $${testResults.portfolio.totalPortfolioPnL}`);
    lines.push(`  Crowding frequency: ${testResults.portfolio.crowdingFrequency}`);
    for (const [name, data] of Object.entries(testResults.portfolio.strategies || {})) {
      lines.push(`  ${name}: PnL=$${data.avgPnL}, WR=${(data.avgWinRate * 100).toFixed(0)}%`);
    }
  }

  // Edge decay
  if (testResults.edgeDecay) {
    lines.push('\n## Edge Decay Analysis');
    for (const [name, data] of Object.entries(testResults.edgeDecay)) {
      if (data.error) continue;
      lines.push(`  ${name}: MinProfitableEdge=${data.minProfitableEdge}`);
      if (data.edgeDecayResults) {
        for (const [edge, ed] of Object.entries(data.edgeDecayResults)) {
          lines.push(`    ${edge}: HalfLife=${ed.avgHalfLife}, DecayRate=${ed.avgDecayRate}, PnL=$${ed.avgPnL}, Profitable=${ed.profitable}`);
        }
      }
    }
  }

  // Adversarial
  if (testResults.adversarial) {
    lines.push('\n## Adversarial Test Results');
    for (const [name, data] of Object.entries(testResults.adversarial)) {
      if (data.error) continue;
      lines.push(`  ${name}:`);
      for (const [scenario, ad] of Object.entries(data.adversarialResults || {})) {
        lines.push(`    ${scenario}: PnL=$${ad.avgPnL}, Survival=${(ad.survivalRate * 100).toFixed(0)}%, WR=${(ad.avgWinRate * 100).toFixed(0)}%`);
      }
    }
  }

  return lines.join('\n');
}

async function callLLM(systemPrompt, userPrompt, config, opts = {}) {
  const provider = config.provider || 'openai';
  const providerConfig = PROVIDERS[provider] || PROVIDERS.openai;
  const mdl = config.model || providerConfig.defaultModel;
  const maxTokens = opts.maxTokens || 3000;

  if (provider === 'anthropic') {
    const resp = await fetch(providerConfig.url, {
      method: 'POST',
      headers: providerConfig.headers(config.apiKey),
      body: JSON.stringify({
        model: mdl,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text().catch(() => '')}`);
    const data = await resp.json();
    return data.content?.[0]?.text || '';
  } else {
    const resp = await fetch(providerConfig.url, {
      method: 'POST',
      headers: providerConfig.headers(config.apiKey),
      body: JSON.stringify({
        model: mdl,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text().catch(() => '')}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

function parseJSON(text) {
  if (!text) return null;

  // Try direct parse
  try { return JSON.parse(text); } catch { /* continue */ }

  // Try extracting JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()); } catch { /* continue */ }
  }

  // Try finding JSON object in text
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
  }

  return null;
}

function r2(n) { return Math.round(n * 100) / 100; }

// ─── Get Cached Suggestions ──────────────────────────────────────────

function getLatestSuggestions() {
  try {
    if (fs.existsSync(SUGGESTION_CACHE)) {
      return JSON.parse(fs.readFileSync(SUGGESTION_CACHE, 'utf8'));
    }
  } catch { /* no cache */ }
  return null;
}

function listSuggestions() {
  try {
    return fs.readdirSync(SUGGESTIONS_DIR)
      .filter(f => f.startsWith('suggestions-') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(SUGGESTIONS_DIR, f));
        return { filename: f, size: stat.size, created: stat.mtime };
      })
      .sort((a, b) => b.created - a.created);
  } catch {
    return [];
  }
}

function getSuggestion(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SUGGESTIONS_DIR, filename), 'utf8'));
  } catch {
    return null;
  }
}

function getStatus() {
  const config = getLLMConfig();
  const latest = getLatestSuggestions();

  return {
    configured: !!config.apiKey,
    provider: config.provider,
    model: config.model || PROVIDERS[config.provider]?.defaultModel || 'unknown',
    latestSuggestions: latest ? {
      generatedAt: latest.generatedAt,
      count: latest.stats?.totalSuggestions || 0,
      validated: latest.stats?.validated || 0,
    } : null,
    historyCount: listSuggestions().length,
  };
}

module.exports = {
  generateSuggestions,
  getLatestSuggestions,
  listSuggestions,
  getSuggestion,
  getStatus,
  // Exported for testing
  diagnoseFaults,
  generateImprovements,
  validateSuggestions,
};
