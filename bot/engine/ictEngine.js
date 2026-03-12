/**
 * ICT Engine — Ported from ICT-Playbook-Strategy-v2.pine
 * 
 * Computes ICT concepts from OHLCV candle data:
 *   - Market Structure (HH/HL/LH/LL, MSS, BOS)
 *   - Premium / Discount zones (relative to swing range)
 *   - Fair Value Gaps (FVG)
 *   - Order Blocks (OB)
 *   - Breaker Blocks (BB)
 *   - Optimal Trade Entry zone (OTE)
 *   - Liquidity levels (PDH/PDL, EQH/EQL)
 *   - Confluence scoring (0-7)
 *
 * Input: Array of { open, high, low, close, volume, time } candles (oldest first)
 * Output: Full ICT analysis object
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════
// ATR
// ═══════════════════════════════════════════════════════════════════════

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const prev = candles[i - 1];
    const c = candles[i];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
    sum += tr;
  }
  return sum / period;
}

// ═══════════════════════════════════════════════════════════════════════
// SWING STRUCTURE (Nephew_Sam_-style confirmed pivots)
// ═══════════════════════════════════════════════════════════════════════

function detectStructure(candles, opts = {}) {
  const requireCandleConfirm = opts.requireCandleConfirm !== false;
  const mssDisplace = opts.mssDisplace || 0.5;

  const structHighs = [];
  const structLows = [];
  let pendingHigh = null;
  let pendingHighIdx = -1;
  let pendingLow = null;
  let pendingLowIdx = -1;
  let lastStructType = '';
  let structureBias = 0;
  let mssLevel = null;
  let mssBullish = false;
  let mssBearish = false;
  let bullishBOS = false;
  let bearishBOS = false;

  const atr14 = calcATR(candles);

  // Track bars since last bull/bear candle
  let barsSinceBull = 0;
  let barsSinceBear = 0;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const isBull = c.close > c.open;
    const isBear = c.close < c.open;

    barsSinceBull = isBull ? 0 : barsSinceBull + 1;
    barsSinceBear = isBear ? 0 : barsSinceBear + 1;

    // Track pending extremes
    if (pendingHigh === null || c.high > pendingHigh) {
      pendingHigh = c.high;
      pendingHighIdx = i;
    }
    if (pendingLow === null || c.low < pendingLow) {
      pendingLow = c.low;
      pendingLowIdx = i;
    }

    const lastHigh = structHighs.length > 0 ? structHighs[structHighs.length - 1].price : null;
    const lastLow = structLows.length > 0 ? structLows[structLows.length - 1].price : null;

    // Confirm HIGH
    const confirmHigh = pendingHigh !== null && (lastHigh === null || pendingHigh > lastHigh);
    const candleConfirmH = requireCandleConfirm ? (barsSinceBull >= 1 && isBear) : true;

    if (confirmHigh && candleConfirmH && lastStructType !== 'high') {
      structHighs.push({ price: pendingHigh, idx: pendingHighIdx, time: candles[pendingHighIdx].time });

      // Find lowest between this high and previous high
      if (structHighs.length >= 2) {
        const prevHighIdx = structHighs[structHighs.length - 2].idx;
        let lowestBetween = Infinity;
        let lowestIdx = -1;
        for (let j = prevHighIdx; j <= pendingHighIdx; j++) {
          if (candles[j].low < lowestBetween) {
            lowestBetween = candles[j].low;
            lowestIdx = j;
          }
        }
        if (lowestIdx >= 0 && (structLows.length === 0 || lowestIdx !== structLows[structLows.length - 1].idx)) {
          structLows.push({ price: lowestBetween, idx: lowestIdx, time: candles[lowestIdx].time });
        }
      }

      lastStructType = 'high';
      pendingLow = c.low;
      pendingLowIdx = i;
    }

    // Confirm LOW
    const confirmLow = pendingLow !== null && (lastLow === null || pendingLow < lastLow);
    const candleConfirmL = requireCandleConfirm ? (barsSinceBear >= 1 && isBull) : true;

    if (confirmLow && candleConfirmL && lastStructType !== 'low') {
      structLows.push({ price: pendingLow, idx: pendingLowIdx, time: candles[pendingLowIdx].time });

      // Find highest between this low and previous low
      if (structLows.length >= 2) {
        const prevLowIdx = structLows[structLows.length - 2].idx;
        let highestBetween = -Infinity;
        let highestIdx = -1;
        for (let j = prevLowIdx; j <= pendingLowIdx; j++) {
          if (candles[j].high > highestBetween) {
            highestBetween = candles[j].high;
            highestIdx = j;
          }
        }
        if (highestIdx >= 0 && (structHighs.length === 0 || highestIdx !== structHighs[structHighs.length - 1].idx)) {
          structHighs.push({ price: highestBetween, idx: highestIdx, time: candles[highestIdx].time });
        }
      }

      lastStructType = 'low';
      pendingHigh = c.high;
      pendingHighIdx = i;
    }
  }

  // Classify HH/HL/LH/LL from the last two confirmed swings
  const sh0 = structHighs.length > 0 ? structHighs[structHighs.length - 1].price : null;
  const sh1 = structHighs.length > 1 ? structHighs[structHighs.length - 2].price : null;
  const sl0 = structLows.length > 0 ? structLows[structLows.length - 1].price : null;
  const sl1 = structLows.length > 1 ? structLows[structLows.length - 2].price : null;

  const isHH = sh0 !== null && sh1 !== null && sh0 > sh1;
  const isLH = sh0 !== null && sh1 !== null && sh0 < sh1;
  const isHL = sl0 !== null && sl1 !== null && sl0 > sl1;
  const isLL = sl0 !== null && sl1 !== null && sl0 < sl1;

  if (isHH && isHL) structureBias = 1;
  else if (isLL && isLH) structureBias = -1;

  // MSS detection (simplified: last change of bias)
  const lastCandle = candles[candles.length - 1];
  const bodySize = Math.abs(lastCandle.close - lastCandle.open);
  const isDisplacement = bodySize > atr14 * mssDisplace;

  if (structureBias === 1 && isDisplacement) mssBullish = true;
  if (structureBias === -1 && isDisplacement) mssBearish = true;

  return {
    structureBias,          // 1=bullish, -1=bearish, 0=neutral
    swingHigh: sh0,
    swingLow: sl0,
    prevSwingHigh: sh1,
    prevSwingLow: sl1,
    isHH, isLH, isHL, isLL,
    structState: `${isHH ? 'HH' : isLH ? 'LH' : '—'} / ${isHL ? 'HL' : isLL ? 'LL' : '—'}`,
    mssBullish,
    mssBearish,
    structHighs: structHighs.slice(-5),
    structLows: structLows.slice(-5),
    atr14,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PREMIUM / DISCOUNT
// ═══════════════════════════════════════════════════════════════════════

function calcPremiumDiscount(currentPrice, swingHigh, swingLow) {
  if (!swingHigh || !swingLow || swingHigh <= swingLow) {
    return { zone: 'NEUTRAL', pct: 50, equilibrium: currentPrice };
  }
  const range = swingHigh - swingLow;
  const equilibrium = swingLow + range * 0.5;
  const pct = ((currentPrice - swingLow) / range) * 100;

  let zone;
  if (pct >= 62) zone = 'PREMIUM';
  else if (pct <= 38) zone = 'DISCOUNT';
  else zone = 'EQUILIBRIUM';

  return { zone, pct: Math.round(pct * 10) / 10, equilibrium, swingHigh, swingLow };
}

// ═══════════════════════════════════════════════════════════════════════
// FAIR VALUE GAPS
// ═══════════════════════════════════════════════════════════════════════

function detectFVGs(candles, atr14, opts = {}) {
  const minSize = (opts.minSize || 0.2) * atr14;
  const maxAge = opts.maxAge || 50;
  const fvgs = [];
  const len = candles.length;

  for (let i = 2; i < len; i++) {
    const c0 = candles[i];
    const c2 = candles[i - 2];

    // Bullish FVG: candle[i].low > candle[i-2].high
    if (c0.low > c2.high && (c0.low - c2.high) > minSize) {
      const age = len - 1 - i;
      if (age <= maxAge) {
        const top = c0.low;
        const bot = c2.high;
        const filled = candles.slice(i + 1).some(cc => cc.low <= bot);
        if (!filled) {
          fvgs.push({ dir: 1, top, bot, ce: (top + bot) / 2, bar: i, age, active: true });
        }
      }
    }

    // Bearish FVG: candle[i].high < candle[i-2].low
    if (c0.high < c2.low && (c2.low - c0.high) > minSize) {
      const age = len - 1 - i;
      if (age <= maxAge) {
        const top = c2.low;
        const bot = c0.high;
        const filled = candles.slice(i + 1).some(cc => cc.high >= top);
        if (!filled) {
          fvgs.push({ dir: -1, top, bot, ce: (top + bot) / 2, bar: i, age, active: true });
        }
      }
    }
  }

  return fvgs;
}

// ═══════════════════════════════════════════════════════════════════════
// ORDER BLOCKS
// ═══════════════════════════════════════════════════════════════════════

function detectOrderBlocks(candles, atr14, opts = {}) {
  const mssDisplace = opts.mssDisplace || 0.5;
  const maxAge = 200;
  const obs = [];
  const len = candles.length;

  for (let i = 1; i < len; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const bodySize = Math.abs(c.close - c.open);

    // Bullish OB: strong bullish candle after bearish candle
    const bullDispl = c.close > c.open && bodySize > atr14 * mssDisplace && prev.close < prev.open;
    // Bearish OB: strong bearish candle after bullish candle
    const bearDispl = c.close < c.open && bodySize > atr14 * mssDisplace && prev.close > prev.open;

    const age = len - 1 - i;
    if (age > maxAge) continue;

    if (bullDispl) {
      const top = Math.max(prev.open, prev.close);
      const bot = Math.min(prev.open, prev.close);
      // Check if broken
      const broken = candles.slice(i + 1).some(cc => cc.close < bot);
      if (!broken) {
        obs.push({ dir: 1, top, bot, mid: (top + bot) / 2, bar: i, age, active: true });
      }
    }

    if (bearDispl) {
      const top = Math.max(prev.open, prev.close);
      const bot = Math.min(prev.open, prev.close);
      const broken = candles.slice(i + 1).some(cc => cc.close > top);
      if (!broken) {
        obs.push({ dir: -1, top, bot, mid: (top + bot) / 2, bar: i, age, active: true });
      }
    }
  }

  return obs;
}

// ═══════════════════════════════════════════════════════════════════════
// OTE (Optimal Trade Entry) Zone
// ═══════════════════════════════════════════════════════════════════════

function calcOTE(currentPrice, swingHigh, swingLow, bias) {
  if (!swingHigh || !swingLow) return { active: false };

  const range = swingHigh - swingLow;
  const oteLow = 0.62;
  const oteHigh = 0.79;
  const oteSweet = 0.705;

  let zoneLow, zoneHigh, sweetSpot;

  if (bias === 1) {
    // Bullish: OTE in discount (retrace from high)
    zoneHigh = swingHigh - range * oteLow;
    zoneLow = swingHigh - range * oteHigh;
    sweetSpot = swingHigh - range * oteSweet;
  } else if (bias === -1) {
    // Bearish: OTE in premium (retrace from low)
    zoneLow = swingLow + range * oteLow;
    zoneHigh = swingLow + range * oteHigh;
    sweetSpot = swingLow + range * oteSweet;
  } else {
    return { active: false };
  }

  const inZone = currentPrice >= Math.min(zoneLow, zoneHigh) && currentPrice <= Math.max(zoneLow, zoneHigh);

  return {
    active: true,
    inZone,
    zoneLow: Math.min(zoneLow, zoneHigh),
    zoneHigh: Math.max(zoneLow, zoneHigh),
    sweetSpot,
    bias,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// LIQUIDITY LEVELS
// ═══════════════════════════════════════════════════════════════════════

function detectLiquidity(candles, structure) {
  const { swingHigh, swingLow, prevSwingHigh, prevSwingLow, atr14 } = structure;
  const last = candles[candles.length - 1];

  // EQH/EQL detection
  const eqhThreshold = atr14 * 0.1;
  const hasEQH = swingHigh && prevSwingHigh && Math.abs(swingHigh - prevSwingHigh) < eqhThreshold;
  const hasEQL = swingLow && prevSwingLow && Math.abs(swingLow - prevSwingLow) < eqhThreshold;

  // Previous day high/low (approximate from recent candles — use last 24 candles for 1h)
  const recentSlice = candles.slice(-24);
  const pdh = Math.max(...recentSlice.map(c => c.high));
  const pdl = Math.min(...recentSlice.map(c => c.low));

  // Liquidity sweep detection
  const bullLiqSweep = last.low < pdl && last.close > last.open && last.close > pdl;
  const bearLiqSweep = last.high > pdh && last.close < last.open && last.close < pdh;

  return {
    pdh, pdl,
    hasEQH, hasEQL,
    bullLiqSweep,
    bearLiqSweep,
    eqhLevel: hasEQH ? swingHigh : null,
    eqlLevel: hasEQL ? swingLow : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CONFLUENCE SCORING (max 7)
// ═══════════════════════════════════════════════════════════════════════

function scoreConfluence(analysis) {
  const { structure, fvgs, obs, ote, liquidity } = analysis;
  const last = analysis.lastPrice;
  const bias = structure.structureBias;

  const factors = {
    fvg: false,
    ob: false,
    ote: false,
    liqSweep: false,
    structure: false,
    breaker: false,  // simplified — active breakers
    eqLevel: false,  // EQH/EQL present
  };

  // Structure aligned
  if (bias !== 0) factors.structure = true;

  // FVG: price is near an active FVG in the right direction
  const alignedFVGs = fvgs.filter(f => f.dir === bias && f.active);
  if (alignedFVGs.length > 0) {
    const nearest = alignedFVGs.reduce((best, f) => {
      const dist = Math.abs(last - f.ce);
      return dist < best.dist ? { dist, f } : best;
    }, { dist: Infinity, f: null });
    if (nearest.f && last >= nearest.f.bot && last <= nearest.f.top) {
      factors.fvg = true;
    }
  }

  // OB: price is near an active OB in the right direction
  const alignedOBs = obs.filter(o => o.dir === bias && o.active);
  if (alignedOBs.length > 0) {
    const nearest = alignedOBs.reduce((best, o) => {
      const dist = Math.abs(last - o.mid);
      return dist < best.dist ? { dist, o } : best;
    }, { dist: Infinity, o: null });
    if (nearest.o && last >= nearest.o.bot && last <= nearest.o.top) {
      factors.ob = true;
    }
  }

  // OTE
  if (ote.active && ote.inZone) factors.ote = true;

  // Liquidity sweep
  if ((bias === 1 && liquidity.bullLiqSweep) || (bias === -1 && liquidity.bearLiqSweep)) {
    factors.liqSweep = true;
  }

  // EQH/EQL
  if ((bias === -1 && liquidity.hasEQH) || (bias === 1 && liquidity.hasEQL)) {
    factors.eqLevel = true;
  }

  const score = Object.values(factors).filter(Boolean).length;
  const max = 7;

  return { score, max, factors };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run full ICT analysis on candle data.
 * @param {Array} candles - Array of { open, high, low, close, volume, time }
 * @param {Object} opts - Optional overrides
 * @returns {Object} Complete ICT analysis
 */
function analyze(candles, opts = {}) {
  if (!candles || candles.length < 30) {
    return { error: 'Need at least 30 candles for analysis' };
  }

  const last = candles[candles.length - 1];
  const structure = detectStructure(candles, opts);
  const { swingHigh, swingLow, structureBias, atr14 } = structure;

  const premiumDiscount = calcPremiumDiscount(last.close, swingHigh, swingLow);
  const fvgs = detectFVGs(candles, atr14, opts);
  const obs = detectOrderBlocks(candles, atr14, opts);
  const ote = calcOTE(last.close, swingHigh, swingLow, structureBias);
  const liquidity = detectLiquidity(candles, structure);

  const analysisData = { structure, fvgs, obs, ote, liquidity, lastPrice: last.close };
  const confluence = scoreConfluence(analysisData);

  // Determine overall alert status
  let alertLevel = 'NONE';
  if (confluence.score >= 4) alertLevel = 'HIGH';
  else if (confluence.score >= 2) alertLevel = 'MODERATE';
  else if (confluence.score >= 1) alertLevel = 'LOW';

  return {
    symbol: opts.symbol || 'UNKNOWN',
    timeframe: opts.timeframe || '1h',
    timestamp: new Date().toISOString(),
    lastPrice: last.close,
    lastTime: last.time,

    // Premium / Discount
    premiumDiscount,

    // Structure
    bias: structureBias === 1 ? 'BULLISH' : structureBias === -1 ? 'BEARISH' : 'NEUTRAL',
    structure: {
      state: structure.structState,
      swingHigh,
      swingLow,
      isHH: structure.isHH,
      isHL: structure.isHL,
      isLH: structure.isLH,
      isLL: structure.isLL,
    },

    // OTE
    ote: {
      active: ote.active,
      inZone: ote.inZone || false,
      zoneLow: ote.zoneLow,
      zoneHigh: ote.zoneHigh,
      sweetSpot: ote.sweetSpot,
    },

    // PD Arrays
    activeFVGs: fvgs.filter(f => f.active).length,
    activeOBs: obs.filter(o => o.active).length,
    fvgs: fvgs.filter(f => f.active).slice(-5),
    obs: obs.filter(o => o.active).slice(-5),

    // Liquidity
    liquidity,

    // Confluence
    confluence,
    alertLevel,

    // ATR
    atr14,
  };
}

module.exports = { analyze, detectStructure, calcPremiumDiscount, detectFVGs, detectOrderBlocks, calcOTE, scoreConfluence };
