/**
 * ICT Analysis Engine — Core ICT concept detection
 * 
 * Detects: Market Structure (MSS/BOS), FVG, Order Blocks, OTE, Liquidity Sweeps
 * Works on candle arrays from MetaAPI
 */
const config = require('./config');
const log = require('../utils/logger');

// ── State (per-symbol) ──
const states = {};

function getSymbolState(symbol) {
  if (!states[symbol]) {
    states[symbol] = {
      lastSwingHigh: 0, lastSwingLow: 0,
      prevSwingHigh: 0, prevSwingLow: 0,
      lastSwingHighBar: 0, lastSwingLowBar: 0,
      structureBias: 0,
      mssLevel: 0,
      htfBias: 0,
      fvgs: [],
      obs: [],
      oteSwingHigh: 0, oteSwingLow: 0,
      oteActive: false, oteDirection: 0,
      pdh: 0, pdl: 0,
    };
  }
  return states[symbol];
}

// Active state pointer — set per scan call
let state = null;

/**
 * Run full ICT analysis on candles
 * @param {Array} candles - M5 candles [{time, open, high, low, close, volume}]
 * @param {Array} htfCandles - H4 candles for bias
 * @param {Array} dailyCandles - Daily candles for PDH/PDL/ADR
 * @returns {Object} analysis result with signals
 */
function analyze(candles, htfCandles, dailyCandles, symbol = 'XAUUSD') {
  if (!candles || candles.length < 50) return null;

  // Set active state for this symbol
  state = getSymbolState(symbol);

  const atr14 = calcATR(candles, 14);
  if (atr14 <= 0) return null;

  // Update components
  updatePDLevels(dailyCandles);
  updateHTFBias(htfCandles);
  updateStructure(candles, atr14);
  updateFVGs(candles, atr14);
  updateOrderBlocks(candles, atr14);
  updateOTE(candles);

  // Build signals
  const cur = candles[candles.length - 1];
  const signals = buildSignals(candles, atr14, cur);

  return {
    structureBias: state.structureBias,
    htfBias: state.htfBias,
    atr14,
    pdh: state.pdh,
    pdl: state.pdl,
    activeFVGs: state.fvgs.filter(f => f.active).length,
    activeOBs: state.obs.filter(o => o.active).length,
    oteActive: state.oteActive,
    signals,
  };
}

// ═══════════════════════════════════════════════════════════════
// ── ATR Calculation ──
// ═══════════════════════════════════════════════════════════════
function calcATR(candles, period) {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sum += tr;
  }
  return sum / period;
}

// ═══════════════════════════════════════════════════════════════
// ── Previous Day Levels ──
// ═══════════════════════════════════════════════════════════════
function updatePDLevels(dailyCandles) {
  if (!dailyCandles || dailyCandles.length < 2) return;
  const prevDay = dailyCandles[dailyCandles.length - 2];
  state.pdh = prevDay.high;
  state.pdl = prevDay.low;
}

// ═══════════════════════════════════════════════════════════════
// ── HTF Bias (H4 structure) ──
// ═══════════════════════════════════════════════════════════════
function updateHTFBias(htfCandles) {
  if (!config.useHTFBias || !htfCandles || htfCandles.length < 20) return;

  const len = config.htfSwingLen;
  let htfHigh = 0, htfLow = 0;

  for (let i = len; i < htfCandles.length - len; i++) {
    // Check pivot high
    let isPivotHigh = true;
    for (let j = i - len; j <= i + len; j++) {
      if (j === i) continue;
      if (htfCandles[j].high >= htfCandles[i].high) { isPivotHigh = false; break; }
    }
    if (isPivotHigh) htfHigh = htfCandles[i].high;

    // Check pivot low
    let isPivotLow = true;
    for (let j = i - len; j <= i + len; j++) {
      if (j === i) continue;
      if (htfCandles[j].low <= htfCandles[i].low) { isPivotLow = false; break; }
    }
    if (isPivotLow) htfLow = htfCandles[i].low;
  }

  const htfClose = htfCandles[htfCandles.length - 1].close;
  if (htfClose > htfHigh && htfHigh > 0) state.htfBias = 1;
  else if (htfClose < htfLow && htfLow > 0) state.htfBias = -1;
}

// ═══════════════════════════════════════════════════════════════
// ── Market Structure (Swing Pivots + MSS) ──
// ═══════════════════════════════════════════════════════════════
function updateStructure(candles, atr14) {
  const len = config.swingLength;
  if (candles.length < len * 2 + 1) return;

  // Check for swing high/low at position [len] from the end
  const pivotIdx = candles.length - 1 - len;

  // Swing high check
  let isPivotHigh = true;
  for (let j = pivotIdx - len; j <= pivotIdx + len; j++) {
    if (j === pivotIdx || j < 0 || j >= candles.length) continue;
    if (candles[j].high >= candles[pivotIdx].high) { isPivotHigh = false; break; }
  }
  if (isPivotHigh && candles[pivotIdx].high !== state.lastSwingHigh) {
    state.prevSwingHigh = state.lastSwingHigh;
    state.lastSwingHigh = candles[pivotIdx].high;
    state.lastSwingHighBar = pivotIdx;
  }

  // Swing low check
  let isPivotLow = true;
  for (let j = pivotIdx - len; j <= pivotIdx + len; j++) {
    if (j === pivotIdx || j < 0 || j >= candles.length) continue;
    if (candles[j].low <= candles[pivotIdx].low) { isPivotLow = false; break; }
  }
  if (isPivotLow && candles[pivotIdx].low !== state.lastSwingLow) {
    state.prevSwingLow = state.lastSwingLow;
    state.lastSwingLow = candles[pivotIdx].low;
    state.lastSwingLowBar = pivotIdx;
  }

  // MSS detection on current candle
  const cur = candles[candles.length - 1];
  const bodySize = Math.abs(cur.close - cur.open);
  const isDisplacement = bodySize > atr14 * config.mssDisplacementATR;

  const bullMSS = cur.close > state.lastSwingHigh && state.lastSwingHigh > 0
    && (!config.requireDisplacement || isDisplacement)
    && state.structureBias <= 0;

  const bearMSS = cur.close < state.lastSwingLow && state.lastSwingLow > 0
    && (!config.requireDisplacement || isDisplacement)
    && state.structureBias >= 0;

  if (bullMSS) {
    state.structureBias = 1;
    state.mssLevel = state.lastSwingHigh;
    state.oteSwingLow = state.lastSwingLow;
    state.oteSwingHigh = cur.high;
    state.oteActive = true;
    state.oteDirection = 1;
  }

  if (bearMSS) {
    state.structureBias = -1;
    state.mssLevel = state.lastSwingLow;
    state.oteSwingHigh = state.lastSwingHigh;
    state.oteSwingLow = cur.low;
    state.oteActive = true;
    state.oteDirection = -1;
  }
}

// ═══════════════════════════════════════════════════════════════
// ── Fair Value Gaps ──
// ═══════════════════════════════════════════════════════════════
function updateFVGs(candles, atr14) {
  if (!config.useFVG) return;

  const n = candles.length;
  if (n < 3) return;

  const c0 = candles[n - 1]; // current
  const c2 = candles[n - 3]; // 2 bars ago

  // Bullish FVG: current low > 2-bars-ago high
  if (c0.low > c2.high && (c0.low - c2.high) > atr14 * config.fvgMinSizeATR) {
    state.fvgs.push({ top: c0.low, bot: c2.high, bar: n - 1, dir: 1, active: true });
  }
  // Bearish FVG: current high < 2-bars-ago low
  if (c0.high < c2.low && (c2.low - c0.high) > atr14 * config.fvgMinSizeATR) {
    state.fvgs.push({ top: c2.low, bot: c0.high, bar: n - 1, dir: -1, active: true });
  }

  // Manage lifecycle
  state.fvgs = state.fvgs.filter(f => {
    if (!f.active) return false;
    const age = (n - 1) - f.bar;
    if (age > config.fvgMaxAge) return false;

    // Check if filled
    if (f.dir === 1 && c0.low <= f.bot) { f.active = false; return false; }
    if (f.dir === -1 && c0.high >= f.top) { f.active = false; return false; }
    return true;
  });

  // Cap to 30
  if (state.fvgs.length > 30) state.fvgs = state.fvgs.slice(-30);
}

function findNearestFVG(dir) {
  let best = null, bestDist = Infinity;
  for (const f of state.fvgs) {
    if (!f.active || f.dir !== dir) continue;
    const ce = (f.top + f.bot) / 2;
    const dist = Math.abs(state._curClose - ce);
    if (dist < bestDist) { bestDist = dist; best = f; }
  }
  return best;
}

function getFVGEntryPrice(fvg) {
  if (!fvg) return null;
  if (config.fvgEntryMethod === 'fill') return fvg.dir === 1 ? fvg.bot : fvg.top;
  if (config.fvgEntryMethod === 'CE') return (fvg.top + fvg.bot) / 2;
  return fvg.dir === 1 ? fvg.top : fvg.bot; // edge
}

// ═══════════════════════════════════════════════════════════════
// ── Order Blocks ──
// ═══════════════════════════════════════════════════════════════
function updateOrderBlocks(candles, atr14) {
  if (!config.useOB) return;
  const n = candles.length;
  if (n < 2) return;

  const c0 = candles[n - 1];
  const c1 = candles[n - 2];
  const bodySize = Math.abs(c0.close - c0.open);

  // Bullish OB: bullish displacement after bearish candle
  if (c0.close > c0.open && bodySize > atr14 * config.mssDisplacementATR && c1.close < c1.open) {
    state.obs.push({
      top: Math.max(c1.open, c1.close),
      bot: Math.min(c1.open, c1.close),
      bar: n - 2, dir: 1, touches: 0, active: true,
    });
  }
  // Bearish OB
  if (c0.close < c0.open && bodySize > atr14 * config.mssDisplacementATR && c1.close > c1.open) {
    state.obs.push({
      top: Math.max(c1.open, c1.close),
      bot: Math.min(c1.open, c1.close),
      bar: n - 2, dir: -1, touches: 0, active: true,
    });
  }

  // Manage lifecycle
  const cur = candles[n - 1];
  state.obs = state.obs.filter(ob => {
    if (!ob.active) return false;
    const age = (n - 1) - ob.bar;
    if (age > config.obMaxAge) return false;

    // Touch check
    if (cur.low <= ob.top && cur.high >= ob.bot) ob.touches++;
    if (ob.touches >= config.obMaxTouches) { ob.active = false; return false; }

    // Invalidation
    if (ob.dir === 1 && cur.close < ob.bot) { ob.active = false; return false; }
    if (ob.dir === -1 && cur.close > ob.top) { ob.active = false; return false; }
    return true;
  });

  if (state.obs.length > 20) state.obs = state.obs.slice(-20);
}

function findNearestOB(dir) {
  let best = null, bestDist = Infinity;
  for (const ob of state.obs) {
    if (!ob.active || ob.dir !== dir) continue;
    const mid = (ob.top + ob.bot) / 2;
    const dist = Math.abs(state._curClose - mid);
    if (dist < bestDist) { bestDist = dist; best = ob; }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════
// ── OTE (Optimal Trade Entry) ──
// ═══════════════════════════════════════════════════════════════
function updateOTE(candles) {
  if (!config.useOTE || !state.oteActive) return;
  const cur = candles[candles.length - 1];

  if (state.oteDirection === 1 && cur.close < state.oteSwingLow) state.oteActive = false;
  if (state.oteDirection === -1 && cur.close > state.oteSwingHigh) state.oteActive = false;
}

function isInOTEZone(cur) {
  if (!state.oteActive) return false;
  const range = state.oteSwingHigh - state.oteSwingLow;
  let oteLow, oteHigh;

  if (state.oteDirection === 1) {
    oteHigh = state.oteSwingHigh - range * config.oteFibLow;
    oteLow = state.oteSwingHigh - range * config.oteFibHigh;
  } else {
    oteLow = state.oteSwingLow + range * config.oteFibLow;
    oteHigh = state.oteSwingLow + range * config.oteFibHigh;
  }

  return cur.low <= Math.max(oteLow, oteHigh) && cur.high >= Math.min(oteLow, oteHigh);
}

// ═══════════════════════════════════════════════════════════════
// ── Liquidity Sweeps ──
// ═══════════════════════════════════════════════════════════════
function isBullishLiqSweep(cur) {
  if (!config.useLiqSweep) return false;
  return (cur.low < state.pdl || cur.low < state.lastSwingLow)
    && cur.close > cur.open
    && cur.close > state.pdl;
}

function isBearishLiqSweep(cur) {
  if (!config.useLiqSweep) return false;
  return (cur.high > state.pdh || cur.high > state.lastSwingHigh)
    && cur.close < cur.open
    && cur.close < state.pdh;
}

// ═══════════════════════════════════════════════════════════════
// ── ADR Filter ──
// ═══════════════════════════════════════════════════════════════
function isADROK(dailyCandles) {
  if (!config.useADRFilter || !dailyCandles || dailyCandles.length < config.adrLookback + 1) return true;

  let sum = 0;
  for (let i = dailyCandles.length - config.adrLookback - 1; i < dailyCandles.length - 1; i++) {
    sum += dailyCandles[i].high - dailyCandles[i].low;
  }
  const adr = sum / config.adrLookback;

  const today = dailyCandles[dailyCandles.length - 1];
  const todayRange = today.high - today.low;
  const usedPct = adr > 0 ? (todayRange / adr) * 100 : 0;

  return usedPct < config.adrMaxUsedPct;
}

// ═══════════════════════════════════════════════════════════════
// ── Build Signals ──
// ═══════════════════════════════════════════════════════════════
function buildSignals(candles, atr14, cur) {
  state._curClose = cur.close; // temp for nearest lookups

  const canLong = config.direction !== 'short' && state.structureBias === 1;
  const canShort = config.direction !== 'long' && state.structureBias === -1;

  const signals = { long: null, short: null };

  if (canLong && (!config.useHTFBias || state.htfBias !== -1)) {
    const sig = buildDirectionalSignal(1, cur, atr14);
    if (sig) signals.long = sig;
  }

  if (canShort && (!config.useHTFBias || state.htfBias !== 1)) {
    const sig = buildDirectionalSignal(-1, cur, atr14);
    if (sig) signals.short = sig;
  }

  return signals;
}

function buildDirectionalSignal(dir, cur, atr14) {
  let confluence = 0;
  let bestEntry = null;
  const triggers = {};

  // FVG
  if (config.useFVG) {
    const fvg = findNearestFVG(dir);
    if (fvg) {
      const inZone = dir === 1
        ? (cur.low <= fvg.top && cur.close > fvg.bot)
        : (cur.high >= fvg.bot && cur.close < fvg.top);
      if (inZone) {
        triggers.fvg = fvg;
        confluence++;
        if (!bestEntry) bestEntry = 'FVG';
      }
    }
  }

  // OB
  if (config.useOB) {
    const ob = findNearestOB(dir);
    if (ob) {
      const inZone = dir === 1
        ? (cur.low <= ob.top && cur.close > ob.bot)
        : (cur.high >= ob.bot && cur.close < ob.top);
      if (inZone) {
        triggers.ob = ob;
        confluence++;
        if (!bestEntry) bestEntry = 'OB';
      }
    }
  }

  // OTE
  if (config.useOTE && isInOTEZone(cur) && state.oteDirection === dir) {
    triggers.ote = true;
    confluence++;
    if (!bestEntry) bestEntry = 'OTE';
  }

  // Liquidity sweep
  const liqSweep = dir === 1 ? isBullishLiqSweep(cur) : isBearishLiqSweep(cur);
  if (liqSweep) {
    triggers.liqSweep = true;
    confluence++;
    if (!bestEntry) bestEntry = 'LiqSweep';
  }

  // HTF alignment bonus
  if (config.useHTFBias && state.htfBias === dir) confluence++;

  if (confluence < config.minConfluence || !bestEntry) return null;

  // Calculate SL
  const buffer = atr14 * config.slBufferATR;
  let sl = calcStopLoss(dir, cur, atr14, buffer, triggers);

  const risk = Math.abs(cur.close - sl);
  if (risk <= 0) return null;

  const tp1 = dir === 1 ? cur.close + risk * config.tp1RR : cur.close - risk * config.tp1RR;
  const tp2 = dir === 1 ? cur.close + risk * config.tp2RR : cur.close - risk * config.tp2RR;

  return {
    direction: dir === 1 ? 'buy' : 'sell',
    entryType: bestEntry,
    confluence,
    entryPrice: cur.close,
    sl, tp1, tp2, risk,
    triggers,
    atr14,
    structureBias: state.structureBias,
    htfBias: state.htfBias,
  };
}

function calcStopLoss(dir, cur, atr14, buffer, triggers) {
  const slType = config.slType;

  if (slType === 'candle') {
    return dir === 1
      ? Math.min(cur.open, cur.close) - buffer
      : Math.max(cur.open, cur.close) + buffer;
  }

  if (slType === 'fvg' && triggers.fvg) {
    return dir === 1 ? triggers.fvg.bot - buffer : triggers.fvg.top + buffer;
  }

  if (slType === 'ob' && triggers.ob) {
    return dir === 1 ? triggers.ob.bot - buffer : triggers.ob.top + buffer;
  }

  if (slType === 'swing') {
    return dir === 1
      ? (state.lastSwingLow > 0 ? state.lastSwingLow - buffer : cur.low - atr14)
      : (state.lastSwingHigh > 0 ? state.lastSwingHigh + buffer : cur.high + atr14);
  }

  // Default fallback to FVG/candle
  if (triggers.fvg) {
    return dir === 1 ? triggers.fvg.bot - buffer : triggers.fvg.top + buffer;
  }
  return dir === 1 ? Math.min(cur.open, cur.close) - buffer : Math.max(cur.open, cur.close) + buffer;
}

function getState(symbol) {
  if (symbol) return { ...getSymbolState(symbol) };
  // Return merged summary of all symbols
  const allStates = {};
  for (const [sym, s] of Object.entries(states)) allStates[sym] = { ...s };
  return Object.keys(allStates).length === 1 ? allStates[Object.keys(allStates)[0]] : allStates;
}

function reset(symbol) {
  if (symbol) {
    delete states[symbol];
    return;
  }
  for (const key of Object.keys(states)) delete states[key];
}

module.exports = { analyze, getState, reset, isADROK, calcATR };
