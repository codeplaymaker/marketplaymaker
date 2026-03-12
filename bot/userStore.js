/**
 * MarketPlayMaker — Multi-User Store
 *
 * Manages user accounts for the Telegram trading bot.
 * Each user has their own Polymarket API credentials, trade history,
 * settings, and copy-trading preferences.
 *
 * Data is encrypted at rest using AES-256-GCM.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('./utils/logger');

const USERS_FILE = path.join(__dirname, 'logs/users.enc.json');
const ENCRYPTION_KEY = deriveKey(process.env.USER_STORE_KEY || 'marketplaymaker-default-key');

// In-memory user map: chatId → userObject
const users = new Map();

// ─── Encryption ──────────────────────────────────────────────────────

function deriveKey(passphrase) {
  return crypto.scryptSync(passphrase, 'mpm-salt-v1', 32);
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(data) {
  const [ivHex, tagHex, encrypted] = data.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let text = decipher.update(encrypted, 'hex', 'utf8');
  text += decipher.final('utf8');
  return text;
}

// ─── User Model ──────────────────────────────────────────────────────

function createUser(chatId, username) {
  return {
    chatId,
    username: username || null,
    role: users.size === 0 ? 'admin' : 'user',   // First user = admin
    createdAt: new Date().toISOString(),

    // Polymarket CLOB credentials
    polymarket: {
      apiKey: null,
      apiSecret: null,
      passphrase: null,
    },

    // Trading settings
    settings: {
      enabled: false,           // Must explicitly enable after adding keys
      dryRun: true,             // Always start in dry-run
      maxTradeSize: 50,         // Max USDC per trade
      copyTrading: false,       // Copy admin's edges
      minEdgeQuality: 60,       // Only act on edges with quality ≥ this
      alerts: true,             // Receive edge alerts
      autoTrade: false,         // Auto-execute on strong edges
    },

    // Signal preferences
    signals: {
      strong: true,             // STRONG edge alerts
      moderate: false,          // MODERATE edge alerts
      paper: true,              // Paper trade notifications
      resolution: true,         // Market resolution alerts
      opportunity: false,       // Scanner opportunity alerts
      minQuality: 50,           // Min quality score for signals
    },

    // Per-user stats
    stats: {
      tradesExecuted: 0,
      tradesPaperOnly: 0,
      totalVolume: 0,
      lastTradeAt: null,
    },

    // Per-user trade log (last 100)
    trades: [],
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────

function getUser(chatId) {
  return users.get(String(chatId)) || null;
}

function getOrCreateUser(chatId, username) {
  const id = String(chatId);
  if (users.has(id)) return users.get(id);
  const user = createUser(id, username);
  users.set(id, user);
  save();
  log.info('USERS', `New user registered: ${id} (@${username || '?'}) as ${user.role}`);
  return user;
}

function updateUser(chatId, updates) {
  const user = getUser(chatId);
  if (!user) return null;
  Object.assign(user, updates);
  save();
  return user;
}

function setPolymarketKeys(chatId, { apiKey, apiSecret, passphrase }) {
  const user = getUser(chatId);
  if (!user) return null;
  user.polymarket = { apiKey, apiSecret, passphrase };
  save();
  log.info('USERS', `API keys set for user ${chatId}`);
  return user;
}

function clearPolymarketKeys(chatId) {
  const user = getUser(chatId);
  if (!user) return null;
  user.polymarket = { apiKey: null, apiSecret: null, passphrase: null };
  user.settings.enabled = false;
  user.settings.autoTrade = false;
  save();
  return user;
}

function updateSettings(chatId, settingUpdates) {
  const user = getUser(chatId);
  if (!user) return null;
  Object.assign(user.settings, settingUpdates);
  save();
  return user;
}

function recordTrade(chatId, trade) {
  const user = getUser(chatId);
  if (!user) return;
  user.trades.push({
    ...trade,
    timestamp: new Date().toISOString(),
  });
  // Keep last 100
  if (user.trades.length > 100) user.trades = user.trades.slice(-100);
  user.stats.tradesExecuted++;
  user.stats.totalVolume += (trade.size || trade.amount || 0);
  user.stats.lastTradeAt = new Date().toISOString();
  save();
}

function hasValidKeys(chatId) {
  const user = getUser(chatId);
  return !!(user?.polymarket?.apiKey && user?.polymarket?.apiSecret && user?.polymarket?.passphrase);
}

function isAdmin(chatId) {
  const user = getUser(chatId);
  return user?.role === 'admin';
}

function getAllUsers() {
  return Array.from(users.values());
}

function getActiveTraders() {
  return Array.from(users.values()).filter(u =>
    u.settings.enabled && hasValidKeys(u.chatId)
  );
}

function getUserCount() {
  return users.size;
}

// ─── Persistence ─────────────────────────────────────────────────────

function save() {
  try {
    const data = JSON.stringify(Array.from(users.entries()));
    const encrypted = encrypt(data);
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, encrypted, 'utf8');
  } catch (err) {
    log.error('USERS', `Failed to save: ${err.message}`);
  }
}

function load() {
  try {
    if (!fs.existsSync(USERS_FILE)) return;
    const encrypted = fs.readFileSync(USERS_FILE, 'utf8');
    const data = JSON.parse(decrypt(encrypted));
    for (const [id, user] of data) {
      users.set(id, user);
    }
    log.info('USERS', `Loaded ${users.size} users`);
  } catch (err) {
    log.warn('USERS', `Failed to load users (may be first run): ${err.message}`);
  }
}

// Auto-load on require
load();

module.exports = {
  getUser,
  getOrCreateUser,
  updateUser,
  setPolymarketKeys,
  clearPolymarketKeys,
  updateSettings,
  recordTrade,
  hasValidKeys,
  isAdmin,
  getAllUsers,
  getActiveTraders,
  getUserCount,
  save,
  load,
};
