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
const crypto = require('crypto');
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
  name: 'CTF Exchange',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: CTF_EXCHANGE,
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
let clobClient = null; // Official @polymarket/clob-client instance
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
    try {
      ethers = require('ethers');
    } catch {
      log.warn('CLOB_EXEC', 'ethers.js not installed. Run: npm install ethers@6');
      return false;
    }

    const provider = new ethers.JsonRpcProvider(
      options.rpcUrl || 'https://polygon-bor-rpc.publicnode.com'
    );
    wallet = new ethers.Wallet(privateKey, provider);

    apiKey = options.apiKey || null;
    apiSecret = options.apiSecret || null;
    apiPassphrase = options.apiPassphrase || null;

    dryRun = options.dryRun !== false;
    isInitialized = true;

    // Build official CLOB client if API credentials are available
    if (apiKey && apiSecret && apiPassphrase && !dryRun) {
      try {
        const { ClobClient } = require('@polymarket/clob-client');
        // ethers v5 Wallet needed by clob-client (v5 API)
        let v5Wallet;
        try {
          const ethers5 = require('@polymarket/clob-client/node_modules/ethers');
          v5Wallet = new ethers5.Wallet(privateKey);
        } catch {
          // fallback: use ethers v6 wallet directly — clob-client may accept it
          v5Wallet = wallet;
        }
        const creds = { key: apiKey, secret: apiSecret, passphrase: apiPassphrase };
        // signatureType 0 = EOA, funder = EOA address (funds held in proxy but signing is EOA)
        clobClient = new ClobClient(CLOB_API, CHAIN_ID, v5Wallet, creds, 0);
        log.info('CLOB_EXEC', 'Official CLOB client initialized');
      } catch (e) {
        log.warn('CLOB_EXEC', `ClobClient init failed: ${e.message} — falling back to manual signing`);
        clobClient = null;
      }
    }

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
    // Check proxy wallet balance (where Polymarket holds user funds)
    const balance = await usdc.balanceOf(PROXY_ADDRESS);
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
async function createOrder({ tokenId, side, price, size, expiration }) {
  if (!isInitialized) throw new Error('CLOB executor not initialized');
  if (!tokenId || !side || !price || !size) throw new Error('Missing required order params');
  if (price <= 0 || price >= 1) throw new Error(`Invalid price: ${price}`);
  if (size <= 0) throw new Error(`Invalid size: ${size}`);
  if (size > 1000) throw new Error(`Order too large: $${size} (max $1000)`);

  if (clobClient) {
    // Use official SDK — handles EIP-712, signatureType, funder correctly
    const orderArgs = { tokenID: tokenId, price, size, side };
    const marketInfo = { tickSize: '0.01', negRisk: false };
    const signedOrder = await clobClient.createOrder(orderArgs, marketInfo);
    return {
      order: signedOrder,
      signature: null, // embedded by SDK
      metadata: { side, price, size, tokenId, dryRun },
      _sdkOrder: signedOrder,
    };
  }

  // Manual fallback (EOA, signatureType 0)
  const USDC_DECIMALS = 6;
  const sideNum = side === 'BUY' ? 0 : 1;
  const usdcAmount = size;
  const shares = usdcAmount / price;
  const makerAmount = BigInt(Math.floor(usdcAmount * 10 ** USDC_DECIMALS));
  const takerAmount = BigInt(Math.floor(shares * 10 ** USDC_DECIMALS));
  const exp = expiration || Math.floor(Date.now() / 1000) + 3600;
  const salt = BigInt(Math.floor(Math.random() * 2 ** 128));

  const order = {
    salt: salt.toString(),
    maker: wallet.address,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId,
    makerAmount: makerAmount.toString(),
    takerAmount: takerAmount.toString(),
    expiration: exp.toString(),
    nonce: (nonce++).toString(),
    feeRateBps: '0',
    side: sideNum,
    signatureType: 0,
  };

  const signature = dryRun
    ? '0x_DRY_RUN_SIGNATURE'
    : await wallet.signTypedData(EIP712_DOMAIN, ORDER_TYPES_EIP712, order);

  return {
    order,
    signature,
    metadata: { side, price, size, tokenId, expiration: new Date(exp * 1000).toISOString(), dryRun },
  };
}

// ─── Order Submission ────────────────────────────────────────────────
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

  // Use SDK if available
  if (clobClient && signedOrder._sdkOrder) {
    try {
      const result = await clobClient.postOrder(signedOrder._sdkOrder);
      const orderRecord = {
        orderId: result.orderID || result.id,
        status: 'OPEN',
        ...signedOrder.metadata,
        createdAt: new Date().toISOString(),
        clobResponse: result,
      };
      liveOrders.push(orderRecord);
      saveOrders();
      log.info('CLOB_EXEC', `Order placed via SDK: ${orderRecord.orderId} | ${signedOrder.metadata.side} ${signedOrder.metadata.size} @ ${signedOrder.metadata.price}`);
      return orderRecord;
    } catch (err) {
      log.error('CLOB_EXEC', `SDK order submission failed: ${err.message}`);
      throw err;
    }
  }

  // Manual fallback
  try {
    const orderWithSig = { ...signedOrder.order, signature: signedOrder.signature };
    const requestBody = JSON.stringify({
      order: orderWithSig,
      owner: wallet.address,
      orderType: 'GTC',
    });

    const authHeaders = buildL2Headers('POST', '/order', requestBody);
    const headers = { 'Content-Type': 'application/json', ...(authHeaders || {}) };

    const response = await fetch(`${CLOB_API}/order`, { method: 'POST', headers, body: requestBody });
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
const POLL_INTERVAL_MS = 5000;       // Poll every 5 seconds
const MAX_POLL_DURATION_MS = 300000; // Stop polling after 5 minutes
const FILL_CHECK_MAX_RETRIES = 60;   // 60 × 5s = 5 minutes

let pollTimer = null;

async function getOpenOrders() {
  if (!isInitialized || dryRun) return liveOrders.filter(o => o.status === 'OPEN' || o.status === 'DRY_RUN');

  try {
    const headers = apiKey ? {
      'POLY_API_KEY': apiKey,
      'POLY_API_SECRET': apiSecret,
      'POLY_PASSPHRASE': apiPassphrase,
    } : {};
    const response = await fetch(`${CLOB_API}/orders?market=${wallet.address}`, { headers });
    if (response.ok) return response.json();
    return [];
  } catch {
    return [];
  }
}

/**
 * Check the fill status of a specific order via the CLOB API.
 * Returns { status, filledSize, remainingSize, avgFillPrice, fills }
 */
async function checkOrderStatus(orderId) {
  if (dryRun) {
    const local = liveOrders.find(o => o.orderId === orderId);
    return { status: local?.status || 'UNKNOWN', filledSize: local?.size || 0, remainingSize: 0, fills: [] };
  }

  try {
    const headers = apiKey ? {
      'POLY_API_KEY': apiKey,
      'POLY_API_SECRET': apiSecret,
      'POLY_PASSPHRASE': apiPassphrase,
    } : {};
    const response = await fetch(`${CLOB_API}/order/${orderId}`, { headers });
    if (!response.ok) {
      log.warn('CLOB_EXEC', `Order status check failed: ${response.status}`);
      return { status: 'UNKNOWN', filledSize: 0, remainingSize: 0, fills: [] };
    }

    const data = await response.json();
    const filledSize = parseFloat(data.size_matched || data.filledSize || 0);
    const totalSize = parseFloat(data.original_size || data.size || 0);
    const remainingSize = totalSize - filledSize;

    let status = 'OPEN';
    if (data.status === 'MATCHED' || data.status === 'FILLED' || remainingSize <= 0) {
      status = 'FILLED';
    } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
      status = data.status;
    } else if (filledSize > 0) {
      status = 'PARTIAL';
    }

    return {
      status,
      filledSize,
      remainingSize,
      totalSize,
      avgFillPrice: parseFloat(data.associate_trades?.[0]?.price || data.price || 0),
      fills: data.associate_trades || [],
      raw: data,
    };
  } catch (err) {
    log.warn('CLOB_EXEC', `Order status error: ${err.message}`);
    return { status: 'UNKNOWN', filledSize: 0, remainingSize: 0, fills: [] };
  }
}

/**
 * Poll an order until it fills, expires, or times out.
 * Returns the final order status with fill details.
 * Handles partial fills by updating the local order record.
 */
async function waitForFill(orderId, { timeoutMs = MAX_POLL_DURATION_MS, onPartialFill } = {}) {
  const startTime = Date.now();
  let lastFilledSize = 0;

  while (Date.now() - startTime < timeoutMs) {
    const status = await checkOrderStatus(orderId);

    // Update local order record
    const local = liveOrders.find(o => o.orderId === orderId);
    if (local) {
      local.status = status.status;
      local.filledSize = status.filledSize;
      local.remainingSize = status.remainingSize;
      local.lastChecked = new Date().toISOString();
      saveOrders();
    }

    if (status.status === 'FILLED') {
      log.info('CLOB_EXEC', `Order ${orderId} fully filled: ${status.filledSize} @ ${status.avgFillPrice}`);
      return { ...status, outcome: 'FILLED' };
    }

    if (status.status === 'CANCELLED' || status.status === 'EXPIRED') {
      log.info('CLOB_EXEC', `Order ${orderId} ${status.status} (filled ${status.filledSize}/${status.totalSize})`);
      return { ...status, outcome: status.filledSize > 0 ? 'PARTIAL' : status.status };
    }

    // Notify on new partial fills
    if (status.filledSize > lastFilledSize) {
      const newFill = status.filledSize - lastFilledSize;
      log.info('CLOB_EXEC', `Order ${orderId} partial fill: +${newFill} (total ${status.filledSize}/${status.totalSize})`);
      if (onPartialFill) onPartialFill(status);
      lastFilledSize = status.filledSize;
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  // Timeout — check one last time
  const finalStatus = await checkOrderStatus(orderId);
  log.warn('CLOB_EXEC', `Order ${orderId} timed out after ${timeoutMs / 1000}s (status: ${finalStatus.status}, filled: ${finalStatus.filledSize})`);

  // If partially filled, cancel remainder
  if (finalStatus.status === 'PARTIAL' || (finalStatus.status === 'OPEN' && finalStatus.filledSize > 0)) {
    try {
      await cancelOrder(orderId);
      log.info('CLOB_EXEC', `Cancelled remaining size on timed-out order ${orderId}`);
    } catch { /* best effort */ }
  }

  return { ...finalStatus, outcome: finalStatus.filledSize > 0 ? 'PARTIAL' : 'TIMEOUT' };
}

/**
 * Start background polling for all open orders.
 * Updates statuses and logs fill events.
 */
function startOrderPolling() {
  if (pollTimer) return; // Already running

  pollTimer = setInterval(async () => {
    const openOrders = liveOrders.filter(o => o.status === 'OPEN' || o.status === 'PARTIAL');
    if (openOrders.length === 0) return;

    for (const order of openOrders) {
      try {
        const status = await checkOrderStatus(order.orderId);
        order.status = status.status;
        order.filledSize = status.filledSize;
        order.remainingSize = status.remainingSize;
        order.lastChecked = new Date().toISOString();

        if (status.status === 'FILLED' || status.status === 'CANCELLED' || status.status === 'EXPIRED') {
          log.info('CLOB_EXEC', `[POLL] Order ${order.orderId} → ${status.status} (filled: ${status.filledSize})`);
        }
      } catch { /* skip this order */ }
    }

    saveOrders();
  }, POLL_INTERVAL_MS * 6); // Poll all orders every 30s
}

function stopOrderPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
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

// ─── L2 HMAC Auth ────────────────────────────────────────────────────
function buildL2Headers(method, requestPath, body = '') {
  if (!apiKey || !apiSecret || !apiPassphrase) return null;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  let message = timestamp + method + requestPath;
  if (body) message += body;

  // base64url → base64 for decoding
  const secretStd = apiSecret.replace(/-/g, '+').replace(/_/g, '/');
  const key = Buffer.from(secretStd, 'base64');
  const sig = crypto.createHmac('sha256', key).update(message).digest('base64');
  // base64 → base64url for the header
  const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

  return {
    'POLY_ADDRESS': wallet?.address || '',
    'POLY_SIGNATURE': sigUrlSafe,
    'POLY_TIMESTAMP': timestamp,
    'POLY_API_KEY': apiKey,
    'POLY_PASSPHRASE': apiPassphrase,
  };
}

// ─── Exchange Balance (Polymarket portfolio) ─────────────────────────
async function getExchangeBalance() {
  const endpoint = '/balance-allowance';
  const headers = buildL2Headers('GET', endpoint);
  if (!headers) return null;
  try {
    const params = new URLSearchParams({
      asset_type: 'COLLATERAL',
      signature_type: '0',
    });
    const res = await fetch(`${CLOB_API}${endpoint}?${params}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      log.warn('CLOB_EXEC', `Exchange balance ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    // balance is in USDC smallest units (6 decimals)
    const raw = parseFloat(data.balance || '0');
    return raw / 1e6;
  } catch (err) {
    log.warn('CLOB_EXEC', `Exchange balance fetch failed: ${err.message}`);
    return null;
  }
}

// ─── Proxy Wallet Balance (main Polymarket account) ──────────────────
const PROXY_ADDRESS = '0x4bee8CbE37f36DC5f8C9d7acB109Ab573baf5653';
async function getProxyBalance() {
  try {
    // Raw eth_call — no ethers dependency needed
    const addr = PROXY_ADDRESS.toLowerCase().replace('0x', '').padStart(64, '0');
    const data = '0x70a08231' + addr; // balanceOf(address)
    const rpcs = ['https://polygon-bor-rpc.publicnode.com', 'https://1rpc.io/matic'];
    let json;
    for (const rpc of rpcs) {
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'eth_call',
            params: [{ to: USDC_ADDRESS, data }, 'latest'],
          }),
        });
        json = await res.json();
        if (json.result) break;
      } catch { continue; }
    }
    if (!json?.result) throw new Error('All RPCs failed');
    const raw = parseInt(json.result, 16);
    return raw / 1e6; // USDC has 6 decimals
  } catch (err) {
    log.warn('CLOB_EXEC', `Proxy balance failed: ${err.message}`);
    return null;
  }
}

// ─── Data API (public, no auth) ──────────────────────────────────────
async function getPortfolioData() {
  try {
    const [valueRes, tradesRes, positionsRes] = await Promise.all([
      fetch(`https://data-api.polymarket.com/value?user=${PROXY_ADDRESS}`).catch(() => null),
      fetch(`https://data-api.polymarket.com/trades?user=${PROXY_ADDRESS}&limit=50`).catch(() => null),
      fetch(`https://data-api.polymarket.com/positions?user=${PROXY_ADDRESS}`).catch(() => null),
    ]);
    const value = valueRes?.ok ? await valueRes.json() : null;
    const trades = tradesRes?.ok ? await tradesRes.json() : [];
    const positions = positionsRes?.ok ? await positionsRes.json() : [];
    // Compute P&L from trades (size * price = USDC amount)
    let totalBought = 0, totalSold = 0, tradeCount = 0;
    for (const t of trades) {
      const usdcAmount = (t.size || 0) * (t.price || 0);
      if (t.side === 'BUY') totalBought += usdcAmount;
      else if (t.side === 'SELL') totalSold += usdcAmount;
      tradeCount++;
    }
    return {
      positionsValue: value?.[0]?.value || 0,
      openPositions: positions.length,
      recentTrades: tradeCount,
      totalBought,
      totalSold,
      tradingPnL: totalSold - totalBought,
    };
  } catch (err) {
    log.warn('CLOB_EXEC', `Data API failed: ${err.message}`);
    return null;
  }
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
    sdkClient: !!clobClient,
  };
}

module.exports = {
  initialize,
  getUSDCBalance,
  getExchangeBalance,
  getProxyBalance,
  getPortfolioData,
  approveUSDC,
  createOrder,
  submitOrder,
  cancelOrder,
  placeTrade,
  getOpenOrders,
  checkOrderStatus,
  waitForFill,
  startOrderPolling,
  stopOrderPolling,
  getStatus,
};
