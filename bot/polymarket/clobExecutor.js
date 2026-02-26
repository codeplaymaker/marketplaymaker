/**
 * Polymarket CLOB Live Execution Module
 *
 * Implements real order placement on Polymarket's Central Limit Order Book
 * via the Polygon network. Uses EIP-712 typed signatures for order signing.
 *
 * Architecture:
 * 1. Wallet setup via private key (Polygon/MATIC)
 * 2. USDC approval for CTF Exchange contract
 * 3. Order creation with EIP-712 signature
 * 4. Order submission to CLOB API
 * 5. Fill monitoring via polling or WebSocket
 *
 * Prerequisites:
 * - POLYGON_PRIVATE_KEY in .env
 * - USDC balance on Polygon
 * - Prior USDC approval to CTF Exchange
 *
 * Safety:
 * - Dry-run mode by default (validates without submitting)
 * - Max order size limits
 * - Slippage protection
 * - Order expiration (default 1 hour)
 */

const log = require('../utils/logger');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Polymarket CLOB endpoints
const CLOB_API = config.CLOB_API || 'https://clob.polymarket.com';
const CHAIN_ID = config.CHAIN_ID || 137; // Polygon

// CTF Exchange contract on Polygon
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon
const CONDITIONAL_TOKENS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

// EIP-712 domain for Polymarket CLOB
const EIP712_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: CHAIN_ID,
};

// Order types for EIP-712
const ORDER_TYPES_EIP712 = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
};

// ─── State ───────────────────────────────────────────────────────────
let wallet = null;
let ethers = null;
let isInitialized = false;
let dryRun = true; // Safety: dry-run by default
let nonce = 0;
let apiKey = null;
let apiSecret = null;
let apiPassphrase = null;

const ORDERS_FILE = path.join(__dirname, '../logs/live-orders.json');
let liveOrders = [];

// ─── Initialization ──────────────────────────────────────────────────
/**
 * Initialize the CLOB executor with a Polygon private key.
 * Call this once at startup if POLYGON_PRIVATE_KEY is set.
 */
async function initialize(privateKey, options = {}) {
  if (!privateKey) {
    log.warn('CLOB_EXEC', 'No private key provided — live execution disabled');
    return false;
  }

  try {
    // Dynamic import of ethers (only needed for live execution)
    try {
      ethers = require('ethers');
    } catch {
      log.warn('CLOB_EXEC', 'ethers.js not installed. Run: npm install ethers@6');
      return false;
    }

    // Create wallet connected to Polygon RPC
    const provider = new ethers.JsonRpcProvider(
      options.rpcUrl || 'https://polygon-rpc.com'
    );
    wallet = new ethers.Wallet(privateKey, provider);

    // Set API credentials if provided
    apiKey = options.apiKey || null;
    apiSecret = options.apiSecret || null;
    apiPassphrase = options.apiPassphrase || null;

    dryRun = options.dryRun !== false; // Default to dry-run
    isInitialized = true;

    // Load persisted orders
    loadOrders();

    const balance = await getUSDCBalance();
    log.info('CLOB_EXEC', `Initialized: wallet=${wallet.address}, USDC=${balance}, mode=${dryRun ? 'DRY-RUN' : 'LIVE'}`);
    return true;
  } catch (err) {
    log.error('CLOB_EXEC', `Initialization failed: ${err.message}`);
    return false;
  }
}

// ─── USDC Balance & Approval ─────────────────────────────────────────
async function getUSDCBalance() {
  if (!wallet || !ethers) return 0;
  try {
    const usdc = new ethers.Contract(USDC_ADDRESS, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ], wallet);
    const balance = await usdc.balanceOf(wallet.address);
    const decimals = await usdc.decimals();
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (err) {
    log.warn('CLOB_EXEC', `Failed to get USDC balance: ${err.message}`);
    return 0;
  }
}

async function approveUSDC(amount = ethers.MaxUint256) {
  if (!wallet || !ethers || dryRun) return null;
  try {
    const usdc = new ethers.Contract(USDC_ADDRESS, [
      'function approve(address, uint256) returns (bool)',
      'function allowance(address, address) view returns (uint256)',
    ], wallet);

    // Check existing allowance
    const allowance = await usdc.allowance(wallet.address, CTF_EXCHANGE);
    if (allowance > 0n) {
      log.info('CLOB_EXEC', `USDC already approved (allowance: ${ethers.formatUnits(allowance, 6)})`);
      return null;
    }

    const tx = await usdc.approve(CTF_EXCHANGE, amount);
    log.info('CLOB_EXEC', `USDC approval tx: ${tx.hash}`);
    await tx.wait();
    log.info('CLOB_EXEC', 'USDC approval confirmed');
    return tx.hash;
  } catch (err) {
    log.error('CLOB_EXEC', `USDC approval failed: ${err.message}`);
    throw err;
  }
}

// ─── Order Creation & Signing ────────────────────────────────────────
/**
 * Create a signed order for the Polymarket CLOB.
 *
 * @param {Object} params
 * @param {string} params.tokenId - The YES or NO token ID
 * @param {string} params.side - 'BUY' or 'SELL'
 * @param {number} params.price - Price in range (0,1)
 * @param {number} params.size - Size in USDC
 * @param {number} [params.expiration] - Unix timestamp for expiration
 */
async function createOrder({ tokenId, side, price, size, expiration }) {
  if (!isInitialized) throw new Error('CLOB executor not initialized');
  if (!tokenId || !side || !price || !size) throw new Error('Missing required order params');

  // Validate
  if (price <= 0 || price >= 1) throw new Error(`Invalid price: ${price}`);
  if (size <= 0) throw new Error(`Invalid size: ${size}`);
  if (size > 1000) throw new Error(`Order too large: $${size} (max $1000)`);

  // Calculate amounts (USDC has 6 decimals)
  const USDC_DECIMALS = 6;
  const sideNum = side === 'BUY' ? 0 : 1;

  // For BUY: makerAmount = USDC you pay, takerAmount = shares you receive
  // For SELL: makerAmount = shares you sell, takerAmount = USDC you receive
  let makerAmount, takerAmount;
  if (side === 'BUY') {
    const usdcAmount = size; // how much USDC we're spending
    const shares = usdcAmount / price; // how many shares we get
    makerAmount = BigInt(Math.floor(usdcAmount * 10 ** USDC_DECIMALS));
    takerAmount = BigInt(Math.floor(shares * 10 ** USDC_DECIMALS));
  } else {
    const shares = size; // how many shares
    const usdcAmount = shares * price;
    makerAmount = BigInt(Math.floor(shares * 10 ** USDC_DECIMALS));
    takerAmount = BigInt(Math.floor(usdcAmount * 10 ** USDC_DECIMALS));
  }

  // Default expiration: 1 hour from now
  const exp = expiration || Math.floor(Date.now() / 1000) + 3600;
  const salt = BigInt(Math.floor(Math.random() * 2 ** 128));

  const order = {
    salt: salt.toString(),
    maker: wallet.address,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000', // open taker
    tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration: exp.toString(),
    nonce: (nonce++).toString(),
    feeRateBps: '0', // Polymarket sets this
    side: sideNum,
    signatureType: 0, // EOA
  };

  // Sign with EIP-712
  let signature;
  if (!dryRun) {
    signature = await wallet.signTypedData(
      EIP712_DOMAIN,
      ORDER_TYPES_EIP712,
      order
    );
  } else {
    signature = '0x_DRY_RUN_SIGNATURE';
  }

  return {
    order,
    signature,
    metadata: {
      side,
      price,
      size,
      tokenId,
      expiration: new Date(exp * 1000).toISOString(),
      dryRun,
    },
  };
}

// ─── Order Submission ────────────────────────────────────────────────
/**
 * Submit a signed order to the Polymarket CLOB API.
 */
async function submitOrder(signedOrder) {
  if (dryRun) {
    const dryResult = {
      orderId: `dry_${Date.now()}`,
      status: 'DRY_RUN',
      ...signedOrder.metadata,
      message: 'Order validated but NOT submitted (dry-run mode)',
    };
    liveOrders.push({ ...dryResult, createdAt: new Date().toISOString() });
    saveOrders();
    log.info('CLOB_EXEC', `[DRY-RUN] ${signedOrder.metadata.side} ${signedOrder.metadata.size} @ ${signedOrder.metadata.price}`);
    return dryResult;
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add API authentication if available
    if (apiKey) {
      headers['POLY_API_KEY'] = apiKey;
      headers['POLY_API_SECRET'] = apiSecret;
      headers['POLY_PASSPHRASE'] = apiPassphrase;
    }

    const response = await fetch(`${CLOB_API}/order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order: signedOrder.order,
        signature: signedOrder.signature,
        owner: wallet.address,
        orderType: 'GTC', // Good 'til cancelled
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CLOB API ${response.status}: ${text}`);
    }

    const result = await response.json();
    const orderRecord = {
      orderId: result.orderID || result.id,
      status: 'OPEN',
      ...signedOrder.metadata,
      createdAt: new Date().toISOString(),
      clobResponse: result,
    };
    liveOrders.push(orderRecord);
    saveOrders();

    log.info('CLOB_EXEC', `Order placed: ${result.orderID} | ${signedOrder.metadata.side} ${signedOrder.metadata.size} @ ${signedOrder.metadata.price}`);
    return orderRecord;
  } catch (err) {
    log.error('CLOB_EXEC', `Order submission failed: ${err.message}`);
    throw err;
  }
}

/**
 * Cancel an open order.
 */
async function cancelOrder(orderId) {
  if (dryRun) {
    log.info('CLOB_EXEC', `[DRY-RUN] Cancel order ${orderId}`);
    return { orderId, status: 'CANCELLED_DRY_RUN' };
  }

  try {
    const response = await fetch(`${CLOB_API}/order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'POLY_API_KEY': apiKey } : {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cancel failed ${response.status}: ${text}`);
    }

    // Update local state
    const order = liveOrders.find(o => o.orderId === orderId);
    if (order) order.status = 'CANCELLED';
    saveOrders();

    log.info('CLOB_EXEC', `Order cancelled: ${orderId}`);
    return { orderId, status: 'CANCELLED' };
  } catch (err) {
    log.error('CLOB_EXEC', `Cancel failed: ${err.message}`);
    throw err;
  }
}

// ─── Convenience: Place Trade ────────────────────────────────────────
/**
 * High-level trade placement: creates, signs, and submits an order.
 *
 * @param {Object} params
 * @param {string} params.tokenId - YES or NO token ID
 * @param {string} params.side - 'BUY' or 'SELL'
 * @param {number} params.price - Limit price (0-1)
 * @param {number} params.size - USDC amount
 * @param {number} [params.maxSlippage=0.02] - Max slippage tolerance
 */
async function placeTrade({ tokenId, side, price, size, maxSlippage = 0.02 }) {
  // Pre-flight checks
  if (!isInitialized) {
    return { status: 'NOT_INITIALIZED', message: 'Call initialize() with private key first' };
  }

  // Check USDC balance
  if (!dryRun) {
    const balance = await getUSDCBalance();
    if (side === 'BUY' && balance < size) {
      return { status: 'INSUFFICIENT_FUNDS', balance, required: size };
    }
  }

  // Slippage protection: get current market price
  try {
    const midRes = await fetch(`${CLOB_API}/midpoint?token_id=${tokenId}`);
    if (midRes.ok) {
      const midData = await midRes.json();
      const marketMid = parseFloat(midData.mid || 0);
      if (marketMid > 0) {
        const slippage = Math.abs(price - marketMid);
        if (slippage > maxSlippage) {
          return {
            status: 'SLIPPAGE_EXCEEDED',
            price,
            marketMid,
            slippage,
            maxSlippage,
          };
        }
      }
    }
  } catch { /* continue without slippage check */ }

  // Create and submit
  const signedOrder = await createOrder({ tokenId, side, price, size });
  return submitOrder(signedOrder);
}

// ─── Order Monitoring ────────────────────────────────────────────────
async function getOpenOrders() {
  if (!isInitialized || dryRun) return liveOrders.filter(o => o.status === 'OPEN' || o.status === 'DRY_RUN');

  try {
    const response = await fetch(`${CLOB_API}/orders?market=${wallet.address}`, {
      headers: apiKey ? { 'POLY_API_KEY': apiKey } : {},
    });
    if (response.ok) return response.json();
    return [];
  } catch {
    return [];
  }
}

// ─── Persistence ─────────────────────────────────────────────────────
function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      liveOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    }
  } catch { liveOrders = []; }
}

function saveOrders() {
  try {
    fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(liveOrders.slice(-200), null, 2));
  } catch { /* non-critical */ }
}

// ─── Status ──────────────────────────────────────────────────────────
function getStatus() {
  return {
    initialized: isInitialized,
    dryRun,
    walletAddress: wallet?.address || null,
    openOrders: liveOrders.filter(o => o.status === 'OPEN').length,
    totalOrders: liveOrders.length,
    mode: dryRun ? 'DRY_RUN' : 'LIVE',
  };
}

module.exports = {
  initialize,
  getUSDCBalance,
  approveUSDC,
  createOrder,
  submitOrder,
  cancelOrder,
  placeTrade,
  getOpenOrders,
  getStatus,
};
