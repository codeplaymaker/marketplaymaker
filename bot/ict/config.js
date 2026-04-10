/**
 * ICT Gold Bot — Configuration
 * Railway deployment, connects to IC Markets via MetaAPI
 */
module.exports = {
  // MetaAPI connection
  metaApi: {
    token: process.env.META_API_TOKEN,           // MetaAPI auth token
    accountId: process.env.META_API_ACCOUNT_ID,  // Your MT4 account ID in MetaAPI
  },

  // Instruments (comma-separated, or single)
  symbols: (process.env.ICT_SYMBOLS || process.env.ICT_SYMBOL || 'XAUUSD').split(',').map(s => s.trim()),
  timeframe: process.env.ICT_TIMEFRAME || '5m',   // Entry timeframe
  htfTimeframe: process.env.ICT_HTF || '4h',       // HTF bias timeframe

  // General
  riskPercent: parseFloat(process.env.ICT_RISK_PCT || '1.0'),
  maxDailyTrades: parseInt(process.env.ICT_MAX_DAILY || '3'),
  minConfluence: parseInt(process.env.ICT_MIN_CONFLUENCE || '2'),
  maxSpreadPips: parseFloat(process.env.ICT_MAX_SPREAD || '5.0'),  // Max spread in pips

  // Direction: 'both', 'long', 'short'
  direction: process.env.ICT_DIRECTION || 'both',

  // HTF Bias
  useHTFBias: process.env.ICT_HTF_BIAS !== 'false',
  htfSwingLen: parseInt(process.env.ICT_HTF_SWING || '5'),

  // Structure Detection
  swingLength: parseInt(process.env.ICT_SWING_LEN || '5'),
  mssDisplacementATR: parseFloat(process.env.ICT_MSS_DISP || '0.5'),
  requireDisplacement: process.env.ICT_REQUIRE_DISP !== 'false',

  // FVG
  useFVG: process.env.ICT_FVG !== 'false',
  fvgMinSizeATR: parseFloat(process.env.ICT_FVG_MIN || '0.2'),
  fvgMaxAge: parseInt(process.env.ICT_FVG_AGE || '50'),
  fvgEntryMethod: process.env.ICT_FVG_ENTRY || 'CE',  // 'fill', 'CE', 'edge'

  // Order Blocks
  useOB: process.env.ICT_OB !== 'false',
  obMaxTouches: parseInt(process.env.ICT_OB_TOUCHES || '2'),
  obMaxAge: parseInt(process.env.ICT_OB_AGE || '200'),

  // OTE
  useOTE: process.env.ICT_OTE !== 'false',
  oteFibLow: parseFloat(process.env.ICT_OTE_LOW || '0.62'),
  oteFibHigh: parseFloat(process.env.ICT_OTE_HIGH || '0.79'),
  oteFibSweet: parseFloat(process.env.ICT_OTE_SWEET || '0.705'),

  // Liquidity Sweeps
  useLiqSweep: process.env.ICT_LIQ !== 'false',

  // Stop Loss: 'candle', 'fvg', 'ob', 'swing'
  slType: process.env.ICT_SL_TYPE || 'fvg',
  slBufferATR: parseFloat(process.env.ICT_SL_BUFFER || '0.5'),
  moveSLtoBE: process.env.ICT_SL_BE !== 'false',

  // Take Profit
  tp1RR: parseFloat(process.env.ICT_TP1_RR || '2.0'),
  tp1ClosePct: parseFloat(process.env.ICT_TP1_PCT || '25'),
  tp2RR: parseFloat(process.env.ICT_TP2_RR || '4.0'),
  tp2ClosePct: parseFloat(process.env.ICT_TP2_PCT || '50'),
  useTrailing: process.env.ICT_TRAIL !== 'false',
  trailATR: parseFloat(process.env.ICT_TRAIL_ATR || '2.0'),

  // Killzones (EST hours)
  onlyKillzones: process.env.ICT_KZ_ONLY !== 'false',
  killzones: {
    london:   { enabled: process.env.ICT_KZ_LONDON !== 'false', start: '02:00', end: '05:00' },
    nyAM:     { enabled: process.env.ICT_KZ_NYAM !== 'false',   start: '08:30', end: '11:00' },
    nyPM:     { enabled: process.env.ICT_KZ_NYPM === 'true',    start: '13:30', end: '16:00' },
    silverAM: { enabled: process.env.ICT_KZ_SILVAM !== 'false', start: '10:00', end: '11:00' },
    silverPM: { enabled: process.env.ICT_KZ_SILVPM === 'true',  start: '14:00', end: '15:00' },
  },
  macroWindows: [
    { start: '09:50', end: '10:10' },
    { start: '10:50', end: '11:10' },
    { start: '13:50', end: '14:10' },
  ],
  useMacro: process.env.ICT_KZ_MACRO !== 'false',
  avoidMonday: process.env.ICT_AVOID_MON !== 'false',
  avoidFriday: process.env.ICT_AVOID_FRI === 'true',
  avoidLunch: process.env.ICT_AVOID_LUNCH !== 'false',
  closeBeforeLunch: process.env.ICT_CLOSE_LUNCH !== 'false',

  // ADR filter
  useADRFilter: process.env.ICT_ADR !== 'false',
  adrLookback: parseInt(process.env.ICT_ADR_LEN || '20'),
  adrMaxUsedPct: parseFloat(process.env.ICT_ADR_MAX || '80'),

  // Adaptive learning
  useAdaptive: process.env.ICT_ADAPTIVE !== 'false',
  adaptWindowSize: parseInt(process.env.ICT_ADAPT_WIN || '50'),
  adaptMinWinRate: parseFloat(process.env.ICT_ADAPT_MINWR || '0.30'),
  adaptConsecLossCut: parseInt(process.env.ICT_ADAPT_CONSEC || '3'),
  adaptLossReduction: parseFloat(process.env.ICT_ADAPT_REDUCE || '0.5'),

  // Telegram (reuse existing bot token)
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,

  // Scanner interval
  scanIntervalMs: parseInt(process.env.ICT_SCAN_INTERVAL || '60000'),  // Check every 60s (new bar on M1)
};
