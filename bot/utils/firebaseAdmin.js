/**
 * Firebase Admin SDK — server-side Firestore access.
 *
 * Initialises once and exports a shared `db` (Firestore) instance.
 *
 * Auth options (checked in order):
 *   1. GOOGLE_APPLICATION_CREDENTIALS env → path to service-account JSON
 *   2. FIREBASE_SERVICE_ACCOUNT env       → JSON string (for Railway / Docker)
 *   3. Application Default Credentials    → GCE / Cloud Run / emulator
 *
 * If none are set, Firestore calls will fail but the server still starts.
 */

const admin = require('firebase-admin');
const log   = require('./logger');

let db = null;

try {
  const opts = {};

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Railway: paste the entire service-account JSON into the env var
    opts.credential = admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
    );
    log.info('FIREBASE', 'Initialised with FIREBASE_SERVICE_ACCOUNT env');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local dev: point to the downloaded JSON file
    opts.credential = admin.credential.applicationDefault();
    log.info('FIREBASE', `Initialised with GOOGLE_APPLICATION_CREDENTIALS (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`);
  } else {
    // Fallback: ADC (Cloud Run, emulator, etc.)
    opts.credential = admin.credential.applicationDefault();
    log.info('FIREBASE', 'Initialised with Application Default Credentials');
  }

  admin.initializeApp(opts);
  db = admin.firestore();
} catch (err) {
  log.warn('FIREBASE', `Admin SDK init failed — Stripe webhook will not work: ${err.message}`);
}

module.exports = { admin, db };
