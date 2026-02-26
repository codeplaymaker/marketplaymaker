/**
 * SQLite Persistence Layer
 * 
 * Replaces JSON file persistence with proper relational storage.
 * Uses better-sqlite3 for synchronous, fast, reliable persistence.
 * 
 * Tables:
 *   trades        — all executed/paper trades with full context
 *   edges         — recorded edge signals with decay tracking
 *   calibration   — probability bucket calibration data
 *   positions     — open position state
 *   signals       — historical signal snapshots
 *   scans         — scan cycle metadata & performance
 *   backtests     — backtest run results
 */
const path = require('path');
const fs = require('fs');
const log = require('../utils/logger');

const DB_PATH = path.join(__dirname, '..', 'logs', 'bot.db');
let db = null;

// ─── Initialization ──────────────────────────────────────────────────
function initialize() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH, { verbose: null });

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    createTables();
    log.info('DB', `SQLite initialized at ${DB_PATH}`);
    return true;
  } catch (err) {
    log.warn('DB', `SQLite not available (install better-sqlite3): ${err.message}`);
    return false;
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condition_id TEXT NOT NULL,
      market TEXT,
      slug TEXT,
      side TEXT NOT NULL,
      size REAL NOT NULL,
      price REAL NOT NULL,
      edge REAL,
      true_prob REAL,
      strategy TEXT,
      quality_grade TEXT,
      quality_score REAL,
      mode TEXT DEFAULT 'paper',
      status TEXT DEFAULT 'open',
      close_price REAL,
      pnl REAL,
      resolution TEXT,
      entered_at TEXT NOT NULL,
      closed_at TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trades_condition ON trades(condition_id);
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_trades_entered ON trades(entered_at);
    CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);

    CREATE TABLE IF NOT EXISTS edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condition_id TEXT NOT NULL,
      market TEXT,
      slug TEXT,
      our_prob REAL NOT NULL,
      market_price REAL NOT NULL,
      edge REAL NOT NULL,
      quality_grade TEXT,
      quality_score REAL,
      strategy TEXT,
      source_signals TEXT,
      detected_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution_price REAL,
      outcome TEXT,
      pnl_if_traded REAL,
      price_history TEXT,
      decay_status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_edges_condition ON edges(condition_id);
    CREATE INDEX IF NOT EXISTS idx_edges_detected ON edges(detected_at);

    CREATE TABLE IF NOT EXISTS calibration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket TEXT NOT NULL,
      bucket_low REAL NOT NULL,
      bucket_high REAL NOT NULL,
      predicted_prob REAL NOT NULL,
      market_price REAL NOT NULL,
      actual_outcome INTEGER,
      condition_id TEXT,
      market TEXT,
      recorded_at TEXT NOT NULL,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cal_bucket ON calibration(bucket);
    CREATE INDEX IF NOT EXISTS idx_cal_resolved ON calibration(resolved_at);

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condition_id TEXT NOT NULL UNIQUE,
      market TEXT,
      slug TEXT,
      side TEXT NOT NULL,
      size REAL NOT NULL,
      avg_price REAL NOT NULL,
      edge REAL,
      strategy TEXT,
      entered_at TEXT NOT NULL,
      updated_at TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      condition_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      signal_value REAL,
      signal_data TEXT,
      confidence REAL,
      recorded_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_signals_condition ON signals(condition_id);
    CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);

    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_type TEXT DEFAULT 'full',
      markets_scanned INTEGER,
      edges_found INTEGER,
      trades_executed INTEGER,
      duration_ms INTEGER,
      errors INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS backtests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      initial_bankroll REAL,
      final_bankroll REAL,
      total_trades INTEGER,
      win_rate REAL,
      sharpe_ratio REAL,
      max_drawdown REAL,
      total_pnl REAL,
      config TEXT,
      results TEXT,
      run_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function isReady() {
  return db !== null;
}

// ─── Trade Operations ────────────────────────────────────────────────
function insertTrade(trade) {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO trades (condition_id, market, slug, side, size, price, edge, true_prob,
        strategy, quality_grade, quality_score, mode, status, entered_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `);
    const result = stmt.run(
      trade.conditionId, trade.market, trade.slug, trade.side,
      trade.positionSize || trade.size, trade.price, trade.edge, trade.trueProb,
      trade.strategy, trade.qualityGrade, trade.qualityScore,
      trade.mode || 'paper', trade.enteredAt || new Date().toISOString(),
      JSON.stringify(trade.metadata || {})
    );
    return result.lastInsertRowid;
  } catch (err) {
    log.warn('DB', `Insert trade failed: ${err.message}`);
    return null;
  }
}

function closeTrade(conditionId, side, closePrice, pnl, resolution) {
  if (!db) return;
  try {
    db.prepare(`
      UPDATE trades SET status = 'closed', close_price = ?, pnl = ?,
        resolution = ?, closed_at = datetime('now')
      WHERE condition_id = ? AND side = ? AND status = 'open'
    `).run(closePrice, pnl, resolution, conditionId, side);
  } catch (err) {
    log.warn('DB', `Close trade failed: ${err.message}`);
  }
}

function getTradeHistory({ limit = 100, offset = 0, strategy, status } = {}) {
  if (!db) return [];
  let sql = 'SELECT * FROM trades WHERE 1=1';
  const params = [];
  if (strategy) { sql += ' AND strategy = ?'; params.push(strategy); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY entered_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
}

function getTradeStats() {
  if (!db) return null;
  return db.prepare(`
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN pnl = 0 OR pnl IS NULL THEN 1 ELSE 0 END) as pending,
      ROUND(SUM(pnl), 2) as total_pnl,
      ROUND(AVG(pnl), 2) as avg_pnl,
      ROUND(MAX(pnl), 2) as best_trade,
      ROUND(MIN(pnl), 2) as worst_trade,
      COUNT(DISTINCT strategy) as strategies_used,
      COUNT(DISTINCT DATE(entered_at)) as active_days
    FROM trades WHERE status = 'closed'
  `).get();
}

function getStrategyBreakdown() {
  if (!db) return [];
  return db.prepare(`
    SELECT
      strategy,
      COUNT(*) as trades,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
      ROUND(SUM(pnl), 2) as total_pnl,
      ROUND(AVG(pnl), 2) as avg_pnl,
      ROUND(AVG(CASE WHEN pnl > 0 THEN pnl END), 2) as avg_win,
      ROUND(AVG(CASE WHEN pnl < 0 THEN pnl END), 2) as avg_loss
    FROM trades WHERE status = 'closed' AND strategy IS NOT NULL
    GROUP BY strategy ORDER BY total_pnl DESC
  `).all();
}

function getPnlTimeseries({ days = 30, mode } = {}) {
  if (!db) return [];
  let sql = `
    SELECT DATE(closed_at) as date, 
      ROUND(SUM(pnl), 2) as daily_pnl,
      COUNT(*) as trades
    FROM trades WHERE status = 'closed' AND closed_at IS NOT NULL
  `;
  const params = [];
  if (mode) { sql += ' AND mode = ?'; params.push(mode); }
  sql += ` AND closed_at >= datetime('now', '-${parseInt(days)} days')`;
  sql += ' GROUP BY DATE(closed_at) ORDER BY date';
  return db.prepare(sql).all(...params);
}

// ─── Edge Operations ─────────────────────────────────────────────────
function insertEdge(edge) {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO edges (condition_id, market, slug, our_prob, market_price, edge,
        quality_grade, quality_score, strategy, source_signals, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      edge.conditionId, edge.market, edge.slug, edge.ourProb, edge.marketPrice,
      edge.edge, edge.qualityGrade, edge.qualityScore, edge.strategy,
      JSON.stringify(edge.sourceSignals || []), edge.detectedAt || new Date().toISOString()
    );
    return result.lastInsertRowid;
  } catch (err) {
    log.warn('DB', `Insert edge failed: ${err.message}`);
    return null;
  }
}

function resolveEdge(conditionId, resolutionPrice, outcome) {
  if (!db) return;
  try {
    db.prepare(`
      UPDATE edges SET resolved_at = datetime('now'), resolution_price = ?,
        outcome = ? WHERE condition_id = ? AND resolved_at IS NULL
    `).run(resolutionPrice, outcome, conditionId);
  } catch (err) {
    log.warn('DB', `Resolve edge failed: ${err.message}`);
  }
}

function getEdgeAccuracy() {
  if (!db) return null;
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN outcome = 'incorrect' THEN 1 ELSE 0 END) as incorrect,
      ROUND(AVG(edge), 4) as avg_edge,
      ROUND(AVG(CASE WHEN outcome = 'correct' THEN edge END), 4) as avg_winning_edge,
      quality_grade,
      COUNT(*) as grade_count
    FROM edges WHERE resolved_at IS NOT NULL
    GROUP BY quality_grade ORDER BY grade_count DESC
  `).all();
}

// ─── Calibration Operations ──────────────────────────────────────────
function insertCalibration(record) {
  if (!db) return null;
  try {
    const stmt = db.prepare(`
      INSERT INTO calibration (bucket, bucket_low, bucket_high, predicted_prob,
        market_price, actual_outcome, condition_id, market, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      record.bucket, record.bucketLow, record.bucketHigh,
      record.predictedProb, record.marketPrice, record.actualOutcome,
      record.conditionId, record.market, record.recordedAt || new Date().toISOString()
    ).lastInsertRowid;
  } catch (err) {
    log.warn('DB', `Insert calibration failed: ${err.message}`);
    return null;
  }
}

function getCalibrationCurve() {
  if (!db) return [];
  return db.prepare(`
    SELECT
      bucket,
      bucket_low,
      bucket_high,
      COUNT(*) as sample_count,
      ROUND(AVG(predicted_prob), 4) as avg_predicted,
      ROUND(AVG(actual_outcome), 4) as actual_rate,
      ROUND(AVG(predicted_prob) - AVG(actual_outcome), 4) as bias
    FROM calibration WHERE actual_outcome IS NOT NULL
    GROUP BY bucket ORDER BY bucket_low
  `).all();
}

// ─── Signal Operations ───────────────────────────────────────────────
function insertSignal(signal) {
  if (!db) return null;
  try {
    return db.prepare(`
      INSERT INTO signals (condition_id, signal_type, signal_value, signal_data, confidence, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      signal.conditionId, signal.signalType, signal.value,
      JSON.stringify(signal.data || {}), signal.confidence,
      signal.recordedAt || new Date().toISOString()
    ).lastInsertRowid;
  } catch (err) {
    log.warn('DB', `Insert signal failed: ${err.message}`);
    return null;
  }
}

// ─── Scan Operations ─────────────────────────────────────────────────
function startScan(type = 'full') {
  if (!db) return null;
  try {
    return db.prepare(`
      INSERT INTO scans (scan_type, started_at) VALUES (?, datetime('now'))
    `).run(type).lastInsertRowid;
  } catch (err) { return null; }
}

function completeScan(scanId, stats) {
  if (!db || !scanId) return;
  try {
    db.prepare(`
      UPDATE scans SET markets_scanned = ?, edges_found = ?, trades_executed = ?,
        duration_ms = ?, errors = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(stats.marketsScanned, stats.edgesFound, stats.tradesExecuted,
      stats.durationMs, stats.errors || 0, scanId);
  } catch (err) {
    log.warn('DB', `Complete scan failed: ${err.message}`);
  }
}

// ─── Backtest Operations ─────────────────────────────────────────────
function insertBacktest(result) {
  if (!db) return null;
  try {
    return db.prepare(`
      INSERT INTO backtests (strategy, start_date, end_date, initial_bankroll,
        final_bankroll, total_trades, win_rate, sharpe_ratio, max_drawdown,
        total_pnl, config, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.strategy, result.startDate, result.endDate,
      result.initialBankroll, result.finalBankroll, result.totalTrades,
      result.winRate, result.sharpeRatio, result.maxDrawdown,
      result.totalPnl, JSON.stringify(result.config || {}),
      JSON.stringify(result.results || {})
    ).lastInsertRowid;
  } catch (err) {
    log.warn('DB', `Insert backtest failed: ${err.message}`);
    return null;
  }
}

// ─── Migration: Import from JSON files ───────────────────────────────
function migrateFromJSON() {
  if (!db) return { migrated: false };
  const logsDir = path.join(__dirname, '..', 'logs');
  const stats = { trades: 0, edges: 0, calibration: 0 };

  // Migrate paper trades
  try {
    const paperFile = path.join(logsDir, 'paper-trades.json');
    if (fs.existsSync(paperFile)) {
      const trades = JSON.parse(fs.readFileSync(paperFile, 'utf8'));
      if (Array.isArray(trades)) {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO trades (condition_id, market, slug, side, size, price,
            edge, true_prob, strategy, quality_grade, mode, status, close_price, pnl,
            entered_at, closed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paper', ?, ?, ?, ?, ?)
        `);
        const batchInsert = db.transaction((tradeList) => {
          for (const t of tradeList) {
            insert.run(
              t.conditionId, t.market, t.slug, t.side, t.size || t.positionSize,
              t.price, t.edge, t.trueProb, t.strategy, t.qualityGrade,
              t.pnl !== undefined ? 'closed' : 'open',
              t.closePrice, t.pnl,
              t.enteredAt || t.timestamp, t.closedAt
            );
            stats.trades++;
          }
        });
        batchInsert(trades);
      }
    }
  } catch (err) {
    log.warn('DB', `Paper trade migration failed: ${err.message}`);
  }

  // Migrate edge resolutions
  try {
    const edgeFile = path.join(logsDir, 'edge-resolutions.json');
    if (fs.existsSync(edgeFile)) {
      const raw = JSON.parse(fs.readFileSync(edgeFile, 'utf8'));
      const edges = Array.isArray(raw) ? raw : (raw.edges || []);
      const insert = db.prepare(`
        INSERT OR IGNORE INTO edges (condition_id, market, our_prob, market_price,
          edge, quality_grade, quality_score, detected_at, resolved_at,
          resolution_price, outcome)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const batchInsert = db.transaction((edgeList) => {
        for (const e of edgeList) {
          insert.run(
            e.conditionId, e.market, e.ourProb, e.marketPrice,
            e.edge, e.qualityGrade, e.qualityScore,
            e.detectedAt, e.resolvedAt, e.resolutionPrice, e.outcome
          );
          stats.edges++;
        }
      });
      batchInsert(edges);
    }
  } catch (err) {
    log.warn('DB', `Edge migration failed: ${err.message}`);
  }

  // Migrate calibration
  try {
    const calFile = path.join(logsDir, 'calibration.json');
    if (fs.existsSync(calFile)) {
      const raw = JSON.parse(fs.readFileSync(calFile, 'utf8'));
      const records = raw.records || [];
      const insert = db.prepare(`
        INSERT OR IGNORE INTO calibration (bucket, bucket_low, bucket_high,
          predicted_prob, market_price, actual_outcome, condition_id, market, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const batchInsert = db.transaction((recList) => {
        for (const r of recList) {
          const bucketLow = r.predictedProb ? Math.floor(r.predictedProb * 10) / 10 : 0;
          insert.run(
            r.bucket || `${bucketLow}-${bucketLow + 0.1}`,
            bucketLow, bucketLow + 0.1,
            r.predictedProb, r.marketPrice, r.resolvedYes ? 1 : 0,
            r.conditionId, r.market, r.recordedAt || new Date().toISOString()
          );
          stats.calibration++;
        }
      });
      batchInsert(records);
    }
  } catch (err) {
    log.warn('DB', `Calibration migration failed: ${err.message}`);
  }

  log.info('DB', `Migration complete: ${stats.trades} trades, ${stats.edges} edges, ${stats.calibration} calibration records`);
  return { migrated: true, stats };
}

// ─── Utility ─────────────────────────────────────────────────────────
function close() {
  if (db) {
    db.close();
    db = null;
  }
}

function raw() {
  return db;
}

module.exports = {
  initialize,
  isReady,
  close,
  raw,
  // Trades
  insertTrade,
  closeTrade,
  getTradeHistory,
  getTradeStats,
  getStrategyBreakdown,
  getPnlTimeseries,
  // Edges
  insertEdge,
  resolveEdge,
  getEdgeAccuracy,
  // Calibration
  insertCalibration,
  getCalibrationCurve,
  // Signals
  insertSignal,
  // Scans
  startScan,
  completeScan,
  // Backtests
  insertBacktest,
  // Migration
  migrateFromJSON,
};
