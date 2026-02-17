/**
 * API Key Authentication Middleware
 *
 * Simple but effective API key auth for a paid analytics product.
 * Keys are stored as environment variables or generated on first run.
 *
 * Usage:
 *   Set API_KEY env var, or let it auto-generate on first startup.
 *   Clients send: Authorization: Bearer <key>  OR  ?apiKey=<key>
 *
 * Public routes (no auth required): /api/health, /api/auth/verify
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const KEY_FILE = path.join(__dirname, '..', 'logs', '.api-key');

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/verify',
  '/api/auth/key',
];

let apiKey = process.env.API_KEY || null;

// Auto-generate a key if none exists
function ensureKey() {
  if (apiKey) return apiKey;

  // Try loading from disk
  try {
    if (fs.existsSync(KEY_FILE)) {
      apiKey = fs.readFileSync(KEY_FILE, 'utf8').trim();
      if (apiKey) {
        log.info('AUTH', `API key loaded from disk (${apiKey.slice(0, 8)}...)`);
        return apiKey;
      }
    }
  } catch { /* generate new */ }

  // Generate new key
  apiKey = 'mpm_' + crypto.randomBytes(24).toString('hex');
  try {
    fs.writeFileSync(KEY_FILE, apiKey);
    log.info('AUTH', `Generated new API key: ${apiKey}`);
    log.info('AUTH', `Key saved to ${KEY_FILE}`);
  } catch {
    log.warn('AUTH', `Could not persist key to disk — key: ${apiKey}`);
  }
  return apiKey;
}

/**
 * Express middleware — validates API key on protected routes.
 */
function authMiddleware(req, res, next) {
  // Skip auth for public routes
  if (PUBLIC_ROUTES.some(r => req.path === r || req.path.startsWith(r))) {
    return next();
  }

  // Skip auth if no key is configured (open mode / development)
  const key = ensureKey();
  if (!key || process.env.AUTH_DISABLED === 'true') {
    return next();
  }

  // Extract key from header or query param
  const authHeader = req.headers.authorization;
  const queryKey = req.query.apiKey;

  let providedKey = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  } else if (queryKey) {
    providedKey = queryKey;
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Send Authorization: Bearer <key> header or ?apiKey=<key> query param',
    });
  }

  // Timing-safe comparison
  try {
    const a = Buffer.from(providedKey);
    const b = Buffer.from(key);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

/**
 * Get the current API key (for display in dashboard).
 */
function getKey() {
  return ensureKey();
}

/**
 * Regenerate the API key.
 */
function regenerateKey() {
  apiKey = 'mpm_' + crypto.randomBytes(24).toString('hex');
  try { fs.writeFileSync(KEY_FILE, apiKey); } catch { /* ignore */ }
  log.info('AUTH', `API key regenerated: ${apiKey.slice(0, 8)}...`);
  return apiKey;
}

module.exports = {
  authMiddleware,
  getKey,
  regenerateKey,
  ensureKey,
};
