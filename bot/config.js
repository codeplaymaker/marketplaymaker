module.exports = {
  // Polymarket API endpoints
  GAMMA_API: 'https://gamma-api.polymarket.com',
  CLOB_API: 'https://clob.polymarket.com',
  CHAIN_ID: 137,

  // Bot server (Railway injects PORT automatically)
  PORT: process.env.PORT || process.env.BOT_PORT || 4000,

  // Fee model
  fees: {
    profitFeeRate: 0.02,       // 2% on profits (Polymarket standard)
    slippageBase: 0.003,       // 0.3% base slippage estimate
  },

  // Strategy defaults
  strategies: {
    noBets: {
      enabled: true,
      minNoPrice: 0.85,        // Minimum NO price (85%+ probability)
      maxExposure: 0.025,      // Max 2.5% of bankroll per trade
      minLiquidity: 2000,      // Minimum market liquidity in USDC
      minVolume24h: 500,       // Minimum 24h volume
      maxSpread: 0.08,         // Max bid-ask spread
      kellyFraction: 0.25,     // Quarter-Kelly for safety
      minEdgeAfterFees: 0.003, // Need 0.3% net edge minimum to trade
      minScore: 20,            // Minimum composite score
    },
    arbitrage: {
      enabled: true,
      minRawEdge: 0.015,       // Min 1.5% raw edge (must exceed fees+slippage)
      minNetEdge: 0.003,       // Min 0.3% net edge after costs
      maxExposure: 0.03,       // Max 3% of bankroll per arb
      minLiquidity: 2000,      // Minimum per-market liquidity
      minVolume24h: 500,       // Need some trade activity
    },
    sportsEdge: {
      enabled: true,
      minVolume24h: 3000,      // Needs decent volume for signal reliability
      minLiquidity: 2000,      // Needs depth for fills
      maxExposure: 0.025,      // Max 2.5% per trade
      minPriceMove: 0.03,      // 3% move triggers overreaction signal
      meanReversionWindow: 20, // Lookback for mean-reversion detection
      minEdgeAfterFees: 0.003, // Min 0.3% net edge
    },

  },

  // Risk management
  risk: {
    maxTotalExposure: 0.20,    // Max 20% of bankroll deployed
    maxSingleMarket: 0.05,    // Max 5% in any single market
    maxDailyLoss: 0.05,        // Stop trading at 5% daily loss
    maxOpenPositions: 40,      // Max concurrent positions
    minBankroll: 10,           // Minimum bankroll to operate (USDC)
    maxCorrelatedExposure: 0.10, // Max 10% in correlated markets
  },

  // Kalshi API
  KALSHI_API: 'https://api.elections.kalshi.com/trade-api/v2',
  kalshi: {
    enabled: true,
    maxMarkets: 300,
    marketRefreshMs: 30000,
  },

  // Scanner intervals
  scanner: {
    marketRefreshMs: 30000,    // Refresh market list every 30s
    opportunityScanMs: 5000,   // Scan for opportunities every 5s
    positionCheckMs: 10000,    // Check positions every 10s
    resolutionCheckMs: 60000,  // Check for market resolutions every 60s
  },
};
