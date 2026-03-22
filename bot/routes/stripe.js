/**
 * Stripe Webhook Route
 *
 * Listens for Stripe events and updates Firestore user records.
 *
 * Handled events:
 *   checkout.session.completed  → sets subscription = 'active'
 *   customer.subscription.deleted → sets subscription = null
 *   customer.subscription.updated → syncs status
 *
 * IMPORTANT: This route must receive the RAW request body for signature
 * verification. It is mounted BEFORE express.json() in server.js.
 *
 * Setup:
 *   1. npm install stripe firebase-admin
 *   2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in bot/.env
 *   3. Set FIREBASE_SERVICE_ACCOUNT (JSON string) or GOOGLE_APPLICATION_CREDENTIALS
 *   4. In Stripe Dashboard → Developers → Webhooks → add endpoint:
 *        URL:    https://<your-domain>/api/stripe/webhook
 *        Events: checkout.session.completed,
 *                customer.subscription.deleted,
 *                customer.subscription.updated
 */

const express = require('express');
const log     = require('../utils/logger');

const router = express.Router();

// ─── Lazy-load Stripe (only when env vars present) ─────────────────────
let stripe = null;
function getStripe() {
  if (stripe) return stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    log.warn('STRIPE', 'STRIPE_SECRET_KEY not set — webhook disabled');
    return null;
  }
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

// ─── Lazy-load Firestore ───────────────────────────────────────────────
let db = null;
function getDB() {
  if (db) return db;
  try {
    db = require('../utils/firebaseAdmin').db;
  } catch (err) {
    log.warn('STRIPE', `Firestore unavailable: ${err.message}`);
  }
  return db;
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Find the Firestore user doc by email.
 * Returns { ref, data } or null.
 */
async function findUserByEmail(email) {
  const firestore = getDB();
  if (!firestore) return null;

  const snap = await firestore
    .collection('users')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ref: doc.ref, data: doc.data() };
}

/**
 * Update a user's subscription status in Firestore.
 */
async function updateSubscription(email, status) {
  const user = await findUserByEmail(email);
  if (!user) {
    log.warn('STRIPE', `No Firestore user found for ${email} — cannot update subscription`);
    return false;
  }

  await user.ref.update({
    subscription: status,
    subscriptionUpdatedAt: new Date().toISOString(),
  });

  log.info('STRIPE', `${email} → subscription = ${status ?? 'null'}`);
  return true;
}

// ─── Webhook Endpoint ──────────────────────────────────────────────────
// Body must be RAW (Buffer) — express.raw() is applied at the route level
// in server.js, BEFORE express.json().
router.post(
  '/stripe/webhook',
  async (req, res) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      log.warn('STRIPE', 'STRIPE_WEBHOOK_SECRET not set — cannot verify signature');
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }

    // ── Verify signature ──────────────────────────────────────────────
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      log.warn('STRIPE', `Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
    }

    log.info('STRIPE', `Received event: ${event.type} (${event.id})`);

    // ── Handle events ─────────────────────────────────────────────────
    try {
      switch (event.type) {
        // ── Checkout completed (new subscription or one-time payment) ──
        case 'checkout.session.completed': {
          const session = event.data.object;
          const email = session.customer_details?.email || session.customer_email;
          if (!email) {
            log.warn('STRIPE', 'checkout.session.completed — no email found in session');
            break;
          }
          await updateSubscription(email, 'active');
          break;
        }

        // ── Subscription cancelled ────────────────────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          // Fetch customer email from Stripe
          const customer = await stripeClient.customers.retrieve(sub.customer);
          if (customer?.email) {
            await updateSubscription(customer.email, null);
          } else {
            log.warn('STRIPE', `subscription.deleted — no email for customer ${sub.customer}`);
          }
          break;
        }

        // ── Subscription updated (pause, resume, status change) ───────
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const customer = await stripeClient.customers.retrieve(sub.customer);
          if (customer?.email) {
            const status = sub.status === 'active' ? 'active'
                         : sub.status === 'past_due' ? 'past_due'
                         : sub.status === 'canceled' ? null
                         : sub.status;
            await updateSubscription(customer.email, status);
          }
          break;
        }

        // ── Invoice payment failed ────────────────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const email = invoice.customer_email;
          if (email) {
            await updateSubscription(email, 'past_due');
          }
          break;
        }

        default:
          log.info('STRIPE', `Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      log.error('STRIPE', `Error processing ${event.type}: ${err.message}`);
      // Still return 200 so Stripe doesn't retry
    }

    // Always acknowledge receipt
    res.json({ received: true });
  },
);

// ─── Status endpoint (admin) ───────────────────────────────────────────
router.get('/stripe/status', (req, res) => {
  res.json({
    configured: !!process.env.STRIPE_SECRET_KEY,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    firestoreConnected: !!getDB(),
  });
});

module.exports = router;
