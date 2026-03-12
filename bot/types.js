/**
 * @fileoverview JSDoc type definitions for MarketPlayMaker bot.
 *
 * These typedefs provide IDE autocompletion and documentation across the
 * codebase. Import them with:
 *
 *   const Types = require('./types'); // eslint-disable-line no-unused-vars
 *
 * Then reference via `@type {Types.Market}` etc.
 */

// ─── Market ──────────────────────────────────────────────────────────────────

/**
 * Normalized prediction-market data (Polymarket CLOB / Kalshi).
 * @typedef {Object} Market
 * @property {string}      conditionId    - Unique market identifier (hex hash)
 * @property {string}      question       - Market question text
 * @property {string}      slug           - URL-friendly market slug
 * @property {string|null} groupSlug      - Parent event group slug
 * @property {boolean}     negRisk        - Whether this is a neg-risk market
 * @property {string|null} groupItemTitle - Title within a group event
 * @property {number}      yesPrice       - Current YES price (0–1)
 * @property {number}      noPrice        - Current NO price (0–1)
 * @property {string}      yesTokenId     - CLOB token ID for YES shares
 * @property {string}      noTokenId      - CLOB token ID for NO shares
 * @property {string[]}    outcomes       - Outcome labels, e.g. ['Yes','No']
 * @property {number}      volume24hr     - 24-hour volume in USD
 * @property {number}      volumeNum      - Total lifetime volume in USD
 * @property {number}      liquidity      - Orderbook liquidity in USD
 * @property {number|null} bestBid        - Best bid price
 * @property {number|null} bestAsk        - Best ask price
 * @property {number|null} spread         - Bid-ask spread
 * @property {string|null} endDate        - ISO date string for market expiry
 * @property {string}      category       - 'politics'|'crypto'|'sports'|'unknown'
 * @property {boolean}     active         - Whether market is active
 * @property {boolean}     closed         - Whether market is closed
 * @property {string}      platform       - 'POLYMARKET' or 'KALSHI'
 * @property {Object}      raw            - Original raw API response
 */

// ─── Probability Model ──────────────────────────────────────────────────────

/**
 * Output from `probabilityModel.estimateProbability(market)`.
 * @typedef {Object} ProbabilityEstimate
 * @property {number}          estimatedProb         - Bayesian posterior probability
 * @property {number}          marketProb             - Market's current YES price
 * @property {number}          edge                   - estimatedProb − marketProb
 * @property {number}          absEdge                - Absolute edge
 * @property {string}          confidence             - 'HIGH'|'MEDIUM'|'LOW'
 * @property {number}          activeSignals          - Number of contributing signals
 * @property {boolean}         signalAgreement        - All signals point same direction
 * @property {{lower:number, upper:number, width:number}} credibleInterval - Bayesian CI
 * @property {number}          posteriorLogOdds       - Log-odds of posterior
 * @property {number}          totalLogLR             - Sum of dampened log-likelihood ratios
 * @property {SignalDetail[]}  signals                - Per-signal contributions
 * @property {string}          category               - Detected category
 * @property {number}          calibrationDataPoints  - Historical calibration records
 */

/**
 * Individual signal contribution inside a ProbabilityEstimate.
 * @typedef {Object} SignalDetail
 * @property {string}  name       - Signal name ('Orderbook','News','Bookmaker', …)
 * @property {number}  [adjustment] - Probability adjustment
 * @property {number}  logLR      - Raw log-likelihood ratio
 * @property {number}  weight     - Adaptive weight applied
 * @property {number}  scaledLR   - logLR × weight
 * @property {Object}  data       - Signal-specific metadata
 */

// ─── Edge Resolution ─────────────────────────────────────────────────────────

/**
 * A recorded edge, tracked from detection through resolution.
 * Persisted to `logs/edge-resolutions.json`.
 * @typedef {Object} EdgeResolution
 * @property {string}       conditionId    - Market condition ID
 * @property {string}       question       - Market question
 * @property {number}       ourProb        - Our estimated probability (0–1)
 * @property {number}       marketPrice    - Market YES price at detection
 * @property {number}       divergence     - ourProb − marketPrice
 * @property {string}       edgeDirection  - 'BUY_YES' or 'BUY_NO'
 * @property {string}       edgeSignal     - 'STRONG'|'MODERATE'|'WEAK'|'NONE'
 * @property {number}       edgeQuality    - Quality score 0–100
 * @property {string}       edgeGrade      - 'A'|'B'|'C'|'D'
 * @property {number}       sourceCount    - Number of independent sources used
 * @property {string}       recordedAt     - ISO timestamp when edge was detected
 * @property {boolean}      resolved       - Whether market has resolved
 * @property {number|null}  outcome        - 1 = YES, 0 = NO, null = pending
 * @property {string|null}  resolvedAt     - ISO timestamp of resolution
 * @property {number|null}  pnlPp          - Hypothetical P&L in percentage points
 * @property {boolean}      [weWereBetter] - Our estimate closer to reality than market
 * @property {number}       [ourError]     - abs(ourProb − outcome)
 * @property {number}       [marketError]  - abs(marketPrice − outcome)
 * @property {string}       [source]       - Origin: 'scanner'|'trending'|…
 * @property {Array<{marketPrice:number, ourProb:number, divergence:number, edgeQuality:number, timestamp:string}>} [priceHistory]
 * @property {EdgeDecay|null} [edgeDecay]  - Decay analysis data
 */

/**
 * Edge decay analysis over time.
 * @typedef {Object} EdgeDecay
 * @property {number}  initialDivergence  - Divergence at recording time
 * @property {number}  currentDivergence  - Latest divergence
 * @property {number}  decayRate          - Rate of decay
 * @property {number}  snapshots          - Number of snapshots taken
 * @property {boolean} edgeNarrowing      - Edge is getting smaller
 * @property {boolean} edgeWidening       - Edge is getting larger
 * @property {string}  lastUpdate         - ISO timestamp
 */

// ─── Trade Record ────────────────────────────────────────────────────────────

/**
 * Simplified public trade record.
 * Persisted to `logs/trade-record.json`.
 * @typedef {Object} TradeRecord
 * @property {number}       id             - Auto-incrementing numeric ID
 * @property {string}       conditionId    - Market condition ID
 * @property {string}       question       - Market question
 * @property {string}       source         - 'scanner'|'youtube'|'twitter'|'manual'|'trending'
 * @property {string}       side           - 'YES' or 'NO'
 * @property {number}       entryPrice     - Price we'd buy at
 * @property {number}       ourProb        - Our estimated probability
 * @property {number}       marketPrice    - Market YES price at entry
 * @property {number}       edgePp         - Edge in percentage points
 * @property {string}       edgeGrade      - 'A'|'B'|'C'|'D'
 * @property {number}       edgeQuality    - Quality score 0–100
 * @property {number}       sourceCount    - Number of independent sources
 * @property {string}       openedAt       - ISO timestamp
 * @property {boolean}      resolved       - Whether trade has resolved
 * @property {string|null}  outcome        - 'YES' or 'NO'
 * @property {string|null}  resolvedAt     - ISO timestamp of resolution
 * @property {number|null}  pnl            - P&L in dollars (based on $10 stake)
 * @property {number|null}  pnlPp          - P&L in percentage points
 * @property {boolean|null} won            - Whether trade was profitable
 * @property {boolean}      [weWereBetter] - Our estimate was closer
 */

// ─── Position ────────────────────────────────────────────────────────────────

/**
 * Live position tracked by the risk manager.
 * Persisted to `logs/risk-state.json`.
 * @typedef {Object} Position
 * @property {string}  conditionId - Market condition ID
 * @property {string}  market      - Market question text
 * @property {string}  slug        - Market slug (for correlation detection)
 * @property {string}  side        - 'YES' or 'NO'
 * @property {number}  size        - Position size in USD
 * @property {number}  avgPrice    - Average entry price
 * @property {string}  strategy    - Strategy that created it
 * @property {number}  edge        - Edge at time of entry
 * @property {string}  enteredAt   - ISO timestamp of first entry
 * @property {string}  updatedAt   - ISO timestamp of last update
 */

/**
 * Returned by riskManager.closePosition().
 * @typedef {Object} ClosedPosition
 * @property {string}  conditionId - Market condition ID
 * @property {string}  market      - Market question text
 * @property {string}  side        - 'YES' or 'NO'
 * @property {number}  size        - Position size in USD
 * @property {number}  avgPrice    - Average entry price
 * @property {number}  closePrice  - Close/settlement price
 * @property {number}  pnl         - Realised P&L
 * @property {string}  closedAt    - ISO timestamp
 */

// ─── Paper Trading ───────────────────────────────────────────────────────────

/**
 * A simulated trade tracked by the paper trader.
 * Persisted to `logs/paper-trades.json`.
 * @typedef {Object} PaperTrade
 * @property {string}       id             - Unique ID ('PT-…' or 'MT-…')
 * @property {string}       key            - Dedup key: conditionId:strategy:side
 * @property {string}       conditionId    - Market condition ID
 * @property {string}       market         - Market question text
 * @property {string}       strategy       - 'ARBITRAGE'|'NO_BETS'|'MANUAL'|…
 * @property {string}       side           - 'YES' or 'NO'
 * @property {number}       entryPrice     - Slippage-adjusted entry price
 * @property {number}       rawEntryPrice  - Pre-slippage entry price
 * @property {number}       slippage       - Estimated slippage percentage
 * @property {number|null}  score          - Opportunity score 0–100
 * @property {string}       confidence     - 'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN'|'USER'
 * @property {number|Object|null} edge     - Edge value or structured edge object
 * @property {number}       kellySize      - Position size in simulated USD
 * @property {string}       riskLevel      - 'LOW'|'MEDIUM'|'HIGH'|'UNKNOWN'|'USER'
 * @property {{scans:number, avgScore:number, boost:number}|null} persistence
 * @property {PaperTradeModelData} modelData
 * @property {string}       source         - 'BOT' or 'MANUAL'
 * @property {string}       recordedAt     - ISO timestamp
 * @property {boolean}      resolved       - Whether market has resolved
 * @property {string|null}  outcome        - 'YES' or 'NO'
 * @property {PaperTradePnL|null} pnl      - Resolution P&L
 * @property {string|null}  resolvedAt     - ISO timestamp of resolution
 */

/**
 * Model data snapshot at trade time.
 * @typedef {Object} PaperTradeModelData
 * @property {number}      trueProb           - Our probability estimate
 * @property {string}      confidence         - 'HIGH'|'MEDIUM'|'LOW'
 * @property {number}      signalCount        - Number of signals
 * @property {number}      edge               - Edge value
 * @property {number|null} bookmakerConsensus - Bookmaker consensus prob
 * @property {number}      bookmakerCount     - Number of bookmakers
 * @property {string}      regime             - Market regime label
 * @property {Object|null} domainSignal       - Domain-specific signal
 * @property {Object|null} newsData           - News sentiment data
 */

/**
 * Paper trade P&L breakdown on resolution.
 * @typedef {Object} PaperTradePnL
 * @property {number}  grossPnL           - Gross P&L before fees
 * @property {number}  fee                - Total fees
 * @property {number}  netPnL             - Net P&L after fees
 * @property {number}  payout             - Total payout
 * @property {number}  hypotheticalShares - Number of shares
 * @property {boolean} won                - Whether trade was profitable
 * @property {number}  returnPct          - Return percentage
 */

// ─── Scanner ─────────────────────────────────────────────────────────────────

/**
 * Output from scanner.scan().
 * @typedef {Object} ScanResult
 * @property {number}          scanNumber          - Incremental scan count
 * @property {string}          timestamp           - ISO timestamp
 * @property {number}          marketsScanned      - Total markets analyzed
 * @property {number}          opportunitiesFound  - Number found
 * @property {Opportunity[]}   topOpportunities    - Top 5 opportunities
 * @property {{filled:number, expired:number, pending:number}} pendingOrders
 * @property {Array}           alerts              - Fired alerts
 * @property {Array}           independentEdges    - Top 10 independent edges
 * @property {string}          [warning]           - Warning message
 * @property {string}          [error]             - Error message on failure
 */

/**
 * An opportunity surfaced by a strategy.
 * @typedef {Object} Opportunity
 * @property {string}          strategy       - 'NO_BETS'|'ARBITRAGE'|'SPORTS_EDGE'|…
 * @property {string}          market         - Market question text
 * @property {string}          conditionId    - Market condition ID
 * @property {string}          slug           - Market slug
 * @property {string}          [tokenId]      - Relevant token ID
 * @property {string}          platform       - 'POLYMARKET' or 'KALSHI'
 * @property {string}          side           - 'YES' or 'NO'
 * @property {number}          yesPrice       - YES price
 * @property {number}          noPrice        - NO price
 * @property {number}          [price]        - Entry price for chosen side
 * @property {number}          score          - Quality score 0–100
 * @property {number}          positionSize   - Kelly-sized position in USD
 * @property {number|Object}   edge           - Raw or structured edge
 * @property {number}          [netEV]        - Net expected value after costs
 * @property {string}          confidence     - 'HIGH'|'MEDIUM'|'LOW'
 * @property {string}          riskLevel      - 'LOW'|'MEDIUM'|'HIGH'
 * @property {string}          [riskNote]     - Human-readable risk description
 * @property {Object}          [model]        - Probability model output
 * @property {number}          liquidity      - Market liquidity
 * @property {number}          volume24hr     - 24h volume
 * @property {number|null}     spread         - Bid-ask spread
 * @property {string|null}     endDate        - Market expiry date
 * @property {{scans:number, avgScore:number, boost:number}|null} [persistence]
 */

// ─── Signals ─────────────────────────────────────────────────────────────────

/**
 * Independent signal consensus from `independentSignals.getIndependentSignal()`.
 * @typedef {Object} IndependentSignal
 * @property {number|null}      prob                 - Weighted consensus probability
 * @property {string}           confidence           - 'HIGH'|'MEDIUM'|'LOW'|'NONE'
 * @property {number}           sourceCount          - Number of available sources
 * @property {SourceBreakdown[]} sources             - Per-source detail
 * @property {number}           marketPrice          - Market's YES price
 * @property {number|null}      divergence           - prob − marketPrice
 * @property {number}           absDivergence        - Absolute divergence
 * @property {string}           edgeSignal           - 'STRONG'|'MODERATE'|'WEAK'|'NONE'
 * @property {string|null}      edgeDirection        - 'BUY_YES'|'BUY_NO'|null
 * @property {number}           edgeQuality          - Quality score 0–100
 * @property {string}           edgeGrade            - 'A'|'B'|'C'|'D'
 * @property {number}           validatedSourceCount - Hard data + validated sources
 * @property {string}           conditionId          - Market condition ID
 * @property {string}           question             - Market question (≤ 100 chars)
 * @property {number}           timestamp            - Unix timestamp ms
 * @property {string}           fetchedAt            - ISO timestamp
 */

/**
 * One source's contribution in an IndependentSignal.
 * @typedef {Object} SourceBreakdown
 * @property {string}      key            - 'espn'|'bookmaker'|'crypto'|'stock'|…
 * @property {string}      label          - Human-readable label
 * @property {number}      prob           - This source's probability estimate
 * @property {string}      confidence     - 'HIGH'|'MEDIUM'|'LOW'
 * @property {number}      weight         - Effective weight used in consensus
 * @property {string}      detail         - Human-readable detail
 * @property {string[]}    sources        - Sub-source labels
 * @property {boolean}     cached         - Whether result was from cache
 * @property {number|null} matchQuality   - Match quality 0–1
 * @property {boolean}     matchValidated - Whether match was validated
 */

/**
 * News sentiment signal from `newsSignal.getSentimentSignal()`.
 * @typedef {Object} NewsSentimentSignal
 * @property {number}  adjustment    - Probability shift (+0.02 = YES 2% more likely)
 * @property {number}  logLR         - Log-likelihood ratio for Bayesian model
 * @property {string}  confidence    - 'HIGH'|'MEDIUM'|'LOW'|'NONE'
 * @property {number}  headlineCount - Number of matched headlines
 * @property {number}  avgSentiment  - Average sentiment score
 * @property {Array<{headline:string, source:string, sentiment:number}>} headlines
 * @property {{totalHeadlinesSearched:number, matchedCount:number, avgSentiment:number, lastFetch:string}|null} data
 */

// ─── Watchlist ───────────────────────────────────────────────────────────────

/**
 * Item in the user's watchlist.
 * @typedef {Object} WatchlistItem
 * @property {string}  conditionId - Market condition ID
 * @property {string}  market      - Market question text
 * @property {string}  slug        - Market slug
 * @property {string}  platform    - 'POLYMARKET' or 'KALSHI'
 * @property {string}  addedAt     - ISO timestamp when added
 * @property {number}  priceAtAdd  - YES price when added
 * @property {string}  notes       - User notes
 */

/**
 * Enriched watchlist item with live market data.
 * @typedef {Object} EnrichedWatchlistItem
 * @property {string}       conditionId    - Market condition ID
 * @property {string}       market         - Market question text
 * @property {string}       slug           - Market slug
 * @property {string}       platform       - 'POLYMARKET' or 'KALSHI'
 * @property {string}       addedAt        - ISO timestamp when added
 * @property {number}       priceAtAdd     - YES price when added
 * @property {string}       notes          - User notes
 * @property {number|null}  currentPrice   - Live YES price
 * @property {number|null}  noPrice        - Live NO price
 * @property {number|null}  priceChange    - Price change since added
 * @property {number|null}  priceChangePct - % price change
 * @property {number}       volume24hr     - 24h volume
 * @property {number}       liquidity      - Current liquidity
 * @property {number|null}  spread         - Bid-ask spread
 * @property {string|null}  endDate        - Market end date
 * @property {boolean}      active         - Whether market is active
 * @property {number}       signalCount    - Number of active signals
 * @property {{strategy:string, score:number, side:string, confidence:string}|null} topSignal
 */

// ─── P&L Tracker ─────────────────────────────────────────────────────────────

/**
 * Aggregate P&L statistics from edgeResolver.
 * Persisted to `logs/edge-pnl.json`.
 * @typedef {Object} PnLTracker
 * @property {number}  totalEdges       - Total edges recorded
 * @property {number}  resolvedEdges    - Edges that have resolved
 * @property {number}  wins             - Profitable resolutions
 * @property {number}  losses           - Losing resolutions
 * @property {number}  push             - Break-even resolutions
 * @property {number}  totalPnLpp       - Cumulative P&L in percentage points
 * @property {number}  hypotheticalROI  - ROI metric
 * @property {number}  winRate          - Win percentage
 * @property {number}  avgPnLPp         - Average P&L per resolved edge
 * @property {number}  betterThanMarket - Count where our estimate was closer
 * @property {number}  betterRate       - Percentage better than market
 */

module.exports = {};
