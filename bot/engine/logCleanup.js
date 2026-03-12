/**
 * Log Cleanup Utility — Prevents unbounded log file growth.
 *
 * Manages:
 *   - Daily log files (bot-*.log, trades-*.json) — retains last 30 days
 *   - JSON state files (*.json in logs/) — compacts if > 10MB
 *   - SQLite WAL checkpoint — keeps WAL file small
 *   - Stale cache cleanup — removes expired cache entries
 */
const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const MAX_LOG_AGE_DAYS = 30;
const MAX_JSON_SIZE_MB = 10;
const MAX_ARRAY_ENTRIES = 5000;

// ─── Daily Log Rotation ──────────────────────────────────────────────
function cleanOldLogs() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_LOG_AGE_DAYS);
  let removed = 0;

  try {
    const files = fs.readdirSync(LOGS_DIR);
    for (const file of files) {
      // Match daily log pattern: bot-2026-01-15.log or trades-2026-01-15.json
      const match = file.match(/^(bot|trades)-(\d{4}-\d{2}-\d{2})\.(log|json)$/);
      if (!match) continue;

      const fileDate = new Date(match[2]);
      if (isNaN(fileDate.getTime())) continue;

      if (fileDate < cutoff) {
        try {
          fs.unlinkSync(path.join(LOGS_DIR, file));
          removed++;
        } catch { /* ignore individual file errors */ }
      }
    }
  } catch (err) {
    log.warn('CLEANUP', `Log cleanup failed: ${err.message}`);
  }

  if (removed > 0) {
    log.info('CLEANUP', `Removed ${removed} log files older than ${MAX_LOG_AGE_DAYS} days`);
  }
  return removed;
}

// ─── JSON State File Compaction ──────────────────────────────────────
function compactJsonFiles() {
  const compactableFiles = [
    { file: 'paper-trades.json', keepLast: 2000 },
    { file: 'executed-trades.json', keepLast: 2000 },
    { file: 'edge-resolutions.json', keepLast: 3000, nested: 'edges' },
    { file: 'picks-history.json', keepLast: 1000, nested: 'picks' },
    { file: 'line-history.json', keepLast: 2000, nested: 'history' },
    { file: 'clv-tracker.json', keepLast: 2000, nested: 'entries' },
    { file: 'odds-cache.json', clear: true, maxAge: 24 * 60 * 60 * 1000 },
    { file: 'news-cache.json', clear: true, maxAge: 24 * 60 * 60 * 1000 },
    { file: 'llm-analysis-cache.json', clear: true, maxAge: 48 * 60 * 60 * 1000 },
  ];

  let compacted = 0;

  for (const cfg of compactableFiles) {
    const filePath = path.join(LOGS_DIR, cfg.file);
    try {
      if (!fs.existsSync(filePath)) continue;

      const stat = fs.statSync(filePath);
      const sizeMB = stat.size / (1024 * 1024);

      // Only compact files that are getting large
      if (sizeMB < 1 && !cfg.clear) continue;

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (cfg.clear && cfg.maxAge) {
        // Age-based cleanup for caches
        const cutoff = Date.now() - cfg.maxAge;
        let data = raw;
        if (typeof data === 'object' && !Array.isArray(data)) {
          let changed = false;
          for (const key of Object.keys(data)) {
            const entry = data[key];
            if (entry?.timestamp && new Date(entry.timestamp).getTime() < cutoff) {
              delete data[key];
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            compacted++;
          }
        }
      } else if (Array.isArray(raw) && raw.length > (cfg.keepLast || MAX_ARRAY_ENTRIES)) {
        // Trim array to keep only recent entries
        const trimmed = raw.slice(-cfg.keepLast);
        fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2));
        compacted++;
        log.info('CLEANUP', `Compacted ${cfg.file}: ${raw.length} → ${trimmed.length} entries (${sizeMB.toFixed(1)}MB → est. ${(sizeMB * trimmed.length / raw.length).toFixed(1)}MB)`);
      } else if (cfg.nested && typeof raw === 'object') {
        const arr = raw[cfg.nested];
        if (Array.isArray(arr) && arr.length > (cfg.keepLast || MAX_ARRAY_ENTRIES)) {
          raw[cfg.nested] = arr.slice(-cfg.keepLast);
          fs.writeFileSync(filePath, JSON.stringify(raw, null, 2));
          compacted++;
          log.info('CLEANUP', `Compacted ${cfg.file}.${cfg.nested}: ${arr.length} → ${raw[cfg.nested].length} entries`);
        }
      }
    } catch (err) {
      log.debug('CLEANUP', `Compact ${cfg.file} failed: ${err.message}`);
    }
  }

  return compacted;
}

// ─── SQLite WAL Checkpoint ───────────────────────────────────────────
function checkpointDatabase() {
  try {
    const database = require('../engine/database');
    const db = database.raw();
    if (db) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      log.debug('CLEANUP', 'SQLite WAL checkpoint completed');
      return true;
    }
  } catch { /* SQLite not available */ }
  return false;
}

// ─── Disk Usage Report ───────────────────────────────────────────────
function getDiskUsage() {
  const report = { files: [], totalSizeMB: 0 };
  try {
    const files = fs.readdirSync(LOGS_DIR);
    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(LOGS_DIR, file));
        const sizeMB = stat.size / (1024 * 1024);
        report.files.push({ file, sizeMB: Math.round(sizeMB * 100) / 100, modified: stat.mtime });
        report.totalSizeMB += sizeMB;
      } catch { continue; }
    }
    report.files.sort((a, b) => b.sizeMB - a.sizeMB);
    report.totalSizeMB = Math.round(report.totalSizeMB * 100) / 100;
  } catch (err) {
    report.error = err.message;
  }
  return report;
}

// ─── Full Cleanup Run ────────────────────────────────────────────────
function runCleanup() {
  log.info('CLEANUP', 'Starting cleanup cycle...');
  const logsRemoved = cleanOldLogs();
  const filesCompacted = compactJsonFiles();
  const walCheckpointed = checkpointDatabase();
  const disk = getDiskUsage();

  const result = {
    logsRemoved,
    filesCompacted,
    walCheckpointed,
    diskUsageMB: disk.totalSizeMB,
    timestamp: new Date().toISOString(),
  };

  log.info('CLEANUP', `Cleanup complete: ${logsRemoved} logs removed, ${filesCompacted} files compacted, disk: ${disk.totalSizeMB}MB`);
  return result;
}

// ─── Scheduled Cleanup ───────────────────────────────────────────────
let _interval = null;

function start(intervalMs = 6 * 60 * 60 * 1000) { // Default: every 6 hours
  // Initial cleanup on start
  setTimeout(() => runCleanup(), 30000); // 30s after boot

  _interval = setInterval(runCleanup, intervalMs);
  log.info('CLEANUP', `Log cleanup scheduled every ${intervalMs / 3600000}h`);
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = {
  cleanOldLogs,
  compactJsonFiles,
  checkpointDatabase,
  getDiskUsage,
  runCleanup,
  start,
  stop,
};
