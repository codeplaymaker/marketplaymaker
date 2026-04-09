/**
 * Fee Calculator for Polymarket
 *
 * Polymarket charges fees on profits, not on the trade itself.
 * Fee structure (as of 2025-2026):
 * - 0% fee on losing trades
 * - ~2% fee on net profits (winning trades)
 * - No gas fees (operates on Polygon L2)
 *
 * For conservative edge calculation, we model fees as a
 * reduction in expected payout + estimated slippage.
 */

const DEFAULT_FEE_RATE = 0.02;      // 2% on profits
const SLIPPAGE_BASE = 0.005;        // 0.5% base slippage (increased from 0.3% — closer to real Polymarket fills)
const SLIPPAGE_SIZE_FACTOR = 0.001; // Additional slippage per $100 of size

/**
 * Estimate slippage based on position size and liquidity.
 * Uses a square-root impact model (more realistic than linear).
 * Calibrated against observed Polymarket orderbook fills.
 */
function estimateSlippage(positionSize, liquidity) {
  if (!liquidity || liquidity === 0) return SLIPPAGE_BASE * 5; // Unknown liquidity = assume bad
  const sizeRatio = positionSize / liquidity;
  // Square-root impact: slippage grows sub-linearly but faster at small sizes
  // This matches empirical market microstructure better than linear
  return SLIPPAGE_BASE + Math.sqrt(sizeRatio) * 0.08;
}

/**
 * Estimate slippage from real orderbook depth.
 * Walks the book to calculate actual cost of filling the order.
 * Returns fractional slippage (e.g. 0.02 = 2%).
 *
 * @param {number} positionSize - USDC amount
 * @param {Array<{price: string|number, size: string|number}>} bookSide - bids or asks from CLOB
 * @param {number} midPrice - current midpoint price
 * @returns {number} slippage as fraction (0.01 = 1%)
 */
function estimateSlippageFromBook(positionSize, bookSide, midPrice) {
  if (!bookSide || bookSide.length === 0 || !midPrice || midPrice <= 0) {
    // Fallback to model-based estimate with conservative liquidity assumption
    return estimateSlippage(positionSize, 5000);
  }

  let remaining = positionSize;
  let totalCost = 0;
  let totalShares = 0;

  for (const level of bookSide) {
    const price = parseFloat(level.price || level.p || 0);
    const size = parseFloat(level.size || level.s || 0);
    if (price <= 0 || size <= 0) continue;

    const levelUSDC = price * size; // USDC value at this level
    const fillAmount = Math.min(remaining, levelUSDC);
    const sharesFilled = fillAmount / price;

    totalCost += fillAmount;
    totalShares += sharesFilled;
    remaining -= fillAmount;

    if (remaining <= 0) break;
  }

  if (totalShares === 0) {
    // Book is empty or too thin — very high slippage
    return estimateSlippage(positionSize, 1000);
  }

  const avgFillPrice = totalCost / totalShares;
  const slippage = Math.abs(avgFillPrice - midPrice) / midPrice;

  // If we couldn't fill the full order, add penalty for remaining size
  if (remaining > 0) {
    const unfilled = remaining / positionSize;
    return slippage + unfilled * 0.10; // 10% penalty per unfilled fraction
  }

  return Math.max(slippage, SLIPPAGE_BASE); // At minimum, base slippage
}

/**
 * Calculate fee-adjusted expected value for a trade.
 * This is THE key function — tells you if a trade is actually +EV after all costs.
 *
 * @param {number} positionSize - Dollar amount to trade
 * @param {number} entryPrice - Price per share (0-1)
 * @param {number} trueWinProb - Our estimated probability of winning (NOT market price)
 * @param {number} liquidity - Market liquidity for slippage estimation
 * @returns {Object} - { grossEV, netEV, fees, slippage, isProfitable, edgeAfterCosts }
 */
function feeAdjustedEV(positionSize, entryPrice, trueWinProb, liquidity = 50000) {
  const shares = positionSize / entryPrice;

  // On win: each share pays $1. Profit per share = (1 - entryPrice)
  const grossPayoutOnWin = shares * (1 - entryPrice);
  // On lose: each share pays $0. Loss = full position
  const lossOnLose = positionSize;

  // Gross EV (before costs)
  const grossEV = trueWinProb * grossPayoutOnWin - (1 - trueWinProb) * lossOnLose;

  // Fee: 2% on profit, only when winning
  const feeOnWin = grossPayoutOnWin * DEFAULT_FEE_RATE;

  // Slippage: paid on every trade
  const slippage = estimateSlippage(positionSize, liquidity) * positionSize;

  // Net EV = gross EV - expected fees - slippage
  const netEV = trueWinProb * (grossPayoutOnWin - feeOnWin) - (1 - trueWinProb) * lossOnLose - slippage;

  return {
    grossEV: r4(grossEV),
    netEV: r4(netEV),
    fees: r4(feeOnWin * trueWinProb),    // Expected fee cost
    slippage: r4(slippage),
    isProfitable: netEV > 0,
    edgeAfterCosts: positionSize > 0 ? r4(netEV / positionSize) : 0,
    breakEvenProb: r4((lossOnLose + slippage) / (grossPayoutOnWin - feeOnWin + lossOnLose)),
  };
}

/**
 * Fee-adjusted Kelly Criterion
 * Adjusts optimal bet size for fee drag and slippage.
 *
 * f* = (p(b - f) - q) / (b - f)
 * where b = gross odds, f = fee rate, p = win prob, q = lose prob
 */
function feeAdjustedKelly(trueWinProb, entryPrice, bankroll, maxExposurePct, liquidity, kellyFraction = 0.25) {
  const grossOdds = (1 / entryPrice) - 1;            // Payout odds
  const netOdds = grossOdds * (1 - DEFAULT_FEE_RATE); // After fee
  const q = 1 - trueWinProb;

  // Kelly formula with net odds
  const f = (netOdds * trueWinProb - q) / netOdds;

  if (f <= 0) return 0; // Negative edge — don't bet

  const kellyBet = f * kellyFraction * bankroll;
  const maxBet = bankroll * maxExposurePct;

  // Liquidity constraint: never bet more than 5% of market liquidity
  const liquidityLimit = (liquidity || 50000) * 0.05;

  return Math.min(kellyBet, maxBet, liquidityLimit);
}

/**
 * Minimum edge needed to be profitable after all costs
 */
function minProfitableEdge(liquidity = 50000, positionSize = 100) {
  const slippage = estimateSlippage(positionSize, liquidity);
  return DEFAULT_FEE_RATE + slippage;
}

function r4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  feeAdjustedEV,
  feeAdjustedKelly,
  estimateSlippage,
  estimateSlippageFromBook,
  minProfitableEdge,
  DEFAULT_FEE_RATE,
  SLIPPAGE_BASE,
};
