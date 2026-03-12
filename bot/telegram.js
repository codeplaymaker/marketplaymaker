/**
 * Telegram Bot for MarketPlayMaker — Multi-User Edition
 *
 * All users:
 *   /start        — Register & welcome
 *   /status       — Bot status (scanner, markets, uptime)
 *   /edges        — Latest edge scan results
 *   /trades       — Recent executed trades
 *   /paper        — Paper trading performance
 *   /pnl          — P&L summary
 *   /opportunities — Top current opportunities
 *   /help         — Command list
 *
 * API key management:
 *   /setkeys      — Submit your Polymarket API credentials
 *   /mykeys       — Check if your keys are set
 *   /clearkeys    — Remove your stored keys
 *
 * Trading control:
 *   /enable       — Enable trading with your keys
 *   /disable      — Disable trading
 *   /settings     — View/update your settings
 *   /mytrades     — Your personal trade history
 *
 * Admin only:
 *   /scan         — Trigger an immediate scan
 *   /startbot     — Start the scanner
 *   /stopbot      — Stop the scanner
 *   /users        — List all registered users
 *   /broadcast    — Send message to all users
 */

const log = require('./utils/logger');
const userStore = require('./userStore');
const btcBot = require('./btcBot');
const btcSniper = require('./btcSniper');

const TELEGRAM_API = 'https://api.telegram.org/bot';
let botToken = null;
let pollingTimer = null;
let lastUpdateId = 0;

// Module references (injected at init)
let deps = {};

// Track pending key input sessions: chatId → { step, data }
const keySessions = new Map();

// ─── Core Telegram API ──────────────────────────────────────────────

async function apiCall(method, body = {}) {
  if (!botToken) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) log.debug('TELEGRAM', `API error: ${data.description}`);
    return data;
  } catch (err) {
    log.debug('TELEGRAM', `API call failed: ${err.message}`);
    return null;
  }
}

async function sendTo(chatId, text, options = {}) {
  if (!chatId) return;
  const chunks = chunkText(text, 4000);
  for (const chunk of chunks) {
    await apiCall('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options,
    });
  }
}

async function sendToAll(text) {
  const users = userStore.getAllUsers();
  for (const user of users) {
    if (user.settings.alerts !== false) {
      await sendTo(user.chatId, text);
    }
  }
}

function chunkText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut <= 0) cut = maxLen;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  return chunks;
}

// ─── Polling ─────────────────────────────────────────────────────────

async function pollUpdates() {
  const data = await apiCall('getUpdates', {
    offset: lastUpdateId + 1,
    timeout: 30,
    allowed_updates: ['message'],
  });
  if (!data?.result) return;

  for (const update of data.result) {
    lastUpdateId = update.update_id;
    const msg = update.message;
    if (!msg?.text) continue;

    const chatId = String(msg.chat.id);
    const username = msg.from?.username || msg.from?.first_name || null;

    // Auto-register every user who messages the bot
    userStore.getOrCreateUser(chatId, username);

    // Check if user is in a key-input session
    if (keySessions.has(chatId)) {
      try {
        await handleKeyInput(chatId, msg.text.trim());
      } catch (err) {
        log.error('TELEGRAM', `Key input error: ${err.message}`);
        await sendTo(chatId, `❌ Error: ${err.message}`);
        keySessions.delete(chatId);
      }
      continue;
    }

    const command = msg.text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, '');
    const args = msg.text.split(/\s+/).slice(1).join(' ');

    try {
      await handleCommand(chatId, command, args);
    } catch (err) {
      log.error('TELEGRAM', `Command ${command} failed: ${err.message}`);
      await sendTo(chatId, `❌ Error: ${err.message}`);
    }
  }
}

// ─── Command Router ──────────────────────────────────────────────────

async function handleCommand(chatId, command, args) {
  switch (command) {
    case '/start':     return handleStart(chatId);
    case '/help':      return handleHelp(chatId);
    case '/status':    return handleStatus(chatId);
    case '/edges':     return handleEdges(chatId);
    case '/trades':    return handleTrades(chatId);
    case '/paper':     return handlePaper(chatId);
    case '/pnl':       return handlePnl(chatId);
    case '/opportunities': return handleOpportunities(chatId);

    // Key management
    case '/setkeys':   return handleSetKeys(chatId);
    case '/mykeys':    return handleMyKeys(chatId);
    case '/clearkeys': return handleClearKeys(chatId);

    // Trading control
    case '/enable':    return handleEnable(chatId);
    case '/disable':   return handleDisable(chatId);
    case '/settings':  return handleSettings(chatId, args);
    case '/signals':   return handleSignals(chatId, args);
    case '/mytrades':  return handleMyTrades(chatId);

    // BTC Bot
    case '/btc':       return handleBtc(chatId);
    case '/btcmarkets': return handleBtcMarkets(chatId);
    case '/btctrades': return handleBtcTrades(chatId);
    case '/btcstart':  return requireAdmin(chatId, () => handleBtcStart(chatId));
    case '/btcstop':   return requireAdmin(chatId, () => handleBtcStop(chatId));
    case '/btcset':    return requireAdmin(chatId, () => handleBtcSet(chatId, args));

    // BTC 5-Min Sniper
    case '/sniper':    return handleSniper(chatId);
    case '/signal':    return handleSniperSignal(chatId);
    case '/snipertrades': return handleSniperTrades(chatId);
    case '/sniperstart': return requireAdmin(chatId, () => handleSniperStart(chatId));
    case '/sniperstop':  return requireAdmin(chatId, () => handleSniperStop(chatId));
    case '/sniperset':   return requireAdmin(chatId, () => handleSniperSet(chatId, args));

    // Admin only
    case '/scan':      return requireAdmin(chatId, () => handleScan(chatId));
    case '/startbot':  return requireAdmin(chatId, () => handleStartBot(chatId));
    case '/stopbot':   return requireAdmin(chatId, () => handleStopBot(chatId));
    case '/users':     return requireAdmin(chatId, () => handleUsers(chatId));
    case '/broadcast': return requireAdmin(chatId, () => handleBroadcast(chatId, args));

    // Proven Edge system
    case '/proven':    return handleProvenEdge(chatId);
    case '/clv':       return handleCLV(chatId);

    // ICT Playbook
    case '/ict':       return handleICT(chatId, args);
    case '/ictalert':  return handleICTAlert(chatId);

    default: break;
  }
}

async function requireAdmin(chatId, handler) {
  if (!userStore.isAdmin(chatId)) {
    return sendTo(chatId, `🔒 Admin-only command.`);
  }
  return handler();
}

// ─── Start / Help ────────────────────────────────────────────────────

async function handleStart(chatId) {
  const user = userStore.getUser(chatId);
  const admin = user?.role === 'admin';

  await sendTo(chatId,
    `🤖 *MarketPlayMaker Bot*\n\n` +
    `Welcome${user?.username ? ` @${user.username}` : ''}! ${admin ? '👑 You are the admin.' : ''}\n\n` +
    `₿ *BTC Bot (5-min scanner)*\n` +
    `/btc — BTC bot status & P&L\n` +
    `/btcmarkets — Active Bitcoin markets\n` +
    `/btctrades — BTC trade history\n` +
    `/btcstart — Start BTC bot (admin)\n` +
    `/btcstop — Stop BTC bot (admin)\n` +
    `/btcset — BTC bot settings (admin)\n\n` +
    `⚡ *BTC 5-Min Sniper*\n` +
    `/sniper — Sniper status & live indicators\n` +
    `/signal — Current directional signal\n` +
    `/snipertrades — Sniper trade history\n` +
    `/sniperstart — Start sniper (admin)\n` +
    `/sniperstop — Stop sniper (admin)\n` +
    `/sniperset — Sniper config (admin)\n\n` +
    `📊 *Market Info*\n` +
    `/status — Bot health & scanner state\n` +
    `/edges — Latest edge scan results\n` +
    `/proven — Proven edge system & active signals\n` +
    `/clv — CLV (Closing Line Value) report\n` +
    `/paper — Paper trading P&L\n` +
    `/pnl — Performance summary\n` +
    `/opportunities — Top opportunities\n\n` +
    `📐 *ICT Playbook*\n` +
    `/ict — ICT analysis (all markets)\n` +
    `/ict BTCUSDT — Single market deep dive\n` +
    `/ictalert — High-confluence alerts only\n\n` +
    `🔑 *Your Account*\n` +
    `/setkeys — Add your Polymarket API keys\n` +
    `/mykeys — Check key status\n` +
    `/enable — Enable trading\n` +
    `/disable — Disable trading\n` +
    `/settings — Your trading preferences\n` +
    `/signals — Configure signal alerts\n` +
    `/mytrades — Your trade history\n\n` +
    (admin ?
      `🛡 *Admin*\n` +
      `/scan — Trigger scan\n` +
      `/startbot — Start scanner\n` +
      `/stopbot — Stop scanner\n` +
      `/users — List users\n` +
      `/broadcast — Message all users\n\n` : '') +
    `_To start trading: /setkeys → /enable_`
  );
}

async function handleHelp(chatId) {
  return handleStart(chatId);
}

// ─── Key Management ──────────────────────────────────────────────────

async function handleSetKeys(chatId) {
  keySessions.set(chatId, { step: 'apiKey', data: {} });
  await sendTo(chatId,
    `🔑 *Set Polymarket API Keys*\n\n` +
    `I'll walk you through adding your keys one at a time.\n` +
    `⚠️ Your keys are encrypted at rest and never shared.\n\n` +
    `*Step 1/3:* Send your *API Key*\n` +
    `_(looks like: 019cd049-21d0-7cc7-...)_\n\n` +
    `Send /cancel to abort.`
  );
}

async function handleKeyInput(chatId, text) {
  if (text === '/cancel') {
    keySessions.delete(chatId);
    return sendTo(chatId, `❌ Key setup cancelled.`);
  }

  const session = keySessions.get(chatId);

  switch (session.step) {
    case 'apiKey':
      session.data.apiKey = text;
      session.step = 'apiSecret';
      await sendTo(chatId, `✅ API Key saved.\n\n*Step 2/3:* Now send your *API Secret*\n_(looks like: 1UBS4C6IEP9J6jBL...)_`);
      break;

    case 'apiSecret':
      session.data.apiSecret = text;
      session.step = 'passphrase';
      await sendTo(chatId, `✅ Secret saved.\n\n*Step 3/3:* Now send your *Passphrase*\n_(long hex string)_`);
      break;

    case 'passphrase':
      session.data.passphrase = text;
      keySessions.delete(chatId);

      // Save the keys
      userStore.setPolymarketKeys(chatId, session.data);

      await sendTo(chatId,
        `✅ *All keys saved & encrypted!*\n\n` +
        `Your Polymarket API credentials are stored securely.\n\n` +
        `Next steps:\n` +
        `• /mykeys — Verify key status\n` +
        `• /enable — Activate trading\n` +
        `• /settings — Configure preferences\n\n` +
        `Trading starts in *dry-run* mode by default (no real money).`
      );
      break;
  }
}

async function handleMyKeys(chatId) {
  const user = userStore.getUser(chatId);
  const hasKeys = userStore.hasValidKeys(chatId);

  if (!hasKeys) {
    return sendTo(chatId, `🔑 No API keys set.\n\nUse /setkeys to add your Polymarket credentials.`);
  }

  // Show masked keys
  const masked = (s) => s ? `${s.slice(0, 6)}...${s.slice(-4)}` : 'not set';

  await sendTo(chatId,
    `🔑 *Your API Keys*\n\n` +
    `API Key: \`${masked(user.polymarket.apiKey)}\`\n` +
    `Secret: \`${masked(user.polymarket.apiSecret)}\`\n` +
    `Passphrase: \`${masked(user.polymarket.passphrase)}\`\n\n` +
    `Trading: ${user.settings.enabled ? '✅ Enabled' : '⏸ Disabled'}\n` +
    `Mode: ${user.settings.dryRun ? '📝 Dry-run' : '💰 LIVE'}\n\n` +
    `Use /clearkeys to remove your keys.`
  );
}

async function handleClearKeys(chatId) {
  userStore.clearPolymarketKeys(chatId);
  await sendTo(chatId, `🗑 API keys removed. Trading disabled.`);
}

// ─── Trading Control ─────────────────────────────────────────────────

async function handleEnable(chatId) {
  if (!userStore.hasValidKeys(chatId)) {
    return sendTo(chatId, `❌ Set your API keys first: /setkeys`);
  }
  userStore.updateSettings(chatId, { enabled: true });
  const user = userStore.getUser(chatId);
  await sendTo(chatId,
    `✅ Trading enabled!\n\n` +
    `Mode: ${user.settings.dryRun ? '📝 Dry-run (safe)' : '💰 LIVE'}\n` +
    `Max trade: $${user.settings.maxTradeSize}\n` +
    `Min edge quality: ${user.settings.minEdgeQuality}\n` +
    `Auto-trade: ${user.settings.autoTrade ? 'ON' : 'OFF'}\n\n` +
    `Use /settings to adjust.`
  );
}

async function handleDisable(chatId) {
  userStore.updateSettings(chatId, { enabled: false, autoTrade: false });
  await sendTo(chatId, `⏸ Trading disabled. You'll still receive alerts.`);
}

async function handleSettings(chatId, args) {
  const user = userStore.getUser(chatId);
  if (!user) return;

  // If args provided, parse setting changes
  if (args) {
    const parts = args.split(/\s+/);
    const key = parts[0];
    const val = parts.slice(1).join(' ');

    const settingsMap = {
      'maxsize': { key: 'maxTradeSize', parse: Number, validate: v => v > 0 && v <= 1000 },
      'quality': { key: 'minEdgeQuality', parse: Number, validate: v => v >= 0 && v <= 100 },
      'autotrade': { key: 'autoTrade', parse: v => v === 'on' || v === 'true', validate: () => true },
      'alerts': { key: 'alerts', parse: v => v === 'on' || v === 'true', validate: () => true },
      'dryrun': { key: 'dryRun', parse: v => v === 'on' || v === 'true', validate: () => true },
      'copy': { key: 'copyTrading', parse: v => v === 'on' || v === 'true', validate: () => true },
    };

    const setting = settingsMap[key?.toLowerCase()];
    if (setting) {
      const parsed = setting.parse(val);
      if (setting.validate(parsed)) {
        userStore.updateSettings(chatId, { [setting.key]: parsed });
        await sendTo(chatId, `✅ Updated *${setting.key}* → \`${parsed}\``);
        return;
      }
    }

    return sendTo(chatId,
      `Usage: /settings <key> <value>\n\n` +
      `Keys: maxsize, quality, autotrade, alerts, dryrun, copy\n` +
      `Example: \`/settings maxsize 100\``
    );
  }

  // Show current settings
  const s = user.settings;
  await sendTo(chatId,
    `⚙️ *Your Settings*\n\n` +
    `Trading: ${s.enabled ? '✅ Enabled' : '⏸ Disabled'}\n` +
    `Mode: ${s.dryRun ? '📝 Dry-run' : '💰 LIVE'}\n` +
    `Max trade size: $${s.maxTradeSize}\n` +
    `Min edge quality: ${s.minEdgeQuality}\n` +
    `Auto-trade: ${s.autoTrade ? 'ON' : 'OFF'}\n` +
    `Copy trading: ${s.copyTrading ? 'ON' : 'OFF'}\n` +
    `Alerts: ${s.alerts ? 'ON' : 'OFF'}\n\n` +
    `_Change with:_ \`/settings <key> <value>\`\n` +
    `Keys: maxsize, quality, autotrade, alerts, dryrun, copy`
  );
}

async function handleMyTrades(chatId) {
  const user = userStore.getUser(chatId);
  if (!user || user.trades.length === 0) {
    return sendTo(chatId, `📭 No trades yet.${userStore.hasValidKeys(chatId) ? '' : ' Set your keys first: /setkeys'}`);
  }

  let text = `💹 *Your Trades* (${user.trades.length} total)\n\n`;
  for (const t of user.trades.slice(-10).reverse()) {
    const icon = t.status === 'FILLED' ? '✅' : t.status === 'DRY_RUN' ? '📝' : t.status === 'REJECTED' ? '❌' : '⏳';
    text += `${icon} *${truncate(t.market || t.question || 'Unknown', 45)}*\n`;
    text += `   ${t.side || '?'} @ ${((t.price || 0) * 100).toFixed(0)}% | $${(t.size || t.amount || 0).toFixed(2)}\n`;
    text += `   ${t.timestamp || ''}\n\n`;
  }

  text += `Total volume: $${user.stats.totalVolume.toFixed(2)}`;
  await sendTo(chatId, text);
}

// ─── Market Info (available to all) ──────────────────────────────────

async function handleStatus(chatId) {
  const { scanner, executor, paperTrader, markets, scanState } = deps;

  const scannerStatus = scanner?.getStatus() || {};
  const tradeStats = executor?.getTradeStats() || {};
  const paperStats = paperTrader?.getStats() || {};
  const marketCount = markets?.getCachedMarkets()?.length || 0;
  const lastScan = scanState?.lastScanTime;
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);

  const userCount = userStore.getUserCount();
  const activeTraders = userStore.getActiveTraders().length;

  await sendTo(chatId,
    `📊 *Bot Status*\n\n` +
    `🟢 Uptime: ${h}h ${m}m\n` +
    `📈 Markets: ${marketCount}\n` +
    `🔍 Scanner: ${scannerStatus.running ? '✅ Running' : '⏸ Stopped'}\n` +
    `📋 Scans: ${scannerStatus.scanCount || 0}\n` +
    `🕐 Last scan: ${lastScan ? timeAgo(lastScan) : 'Never'}\n` +
    `💰 Bankroll: $${(scannerStatus.bankroll || 0).toFixed(2)}\n\n` +
    `*Users*: ${userCount} registered, ${activeTraders} trading\n\n` +
    `*Execution*\n` +
    `Mode: ${tradeStats.mode || 'SIMULATION'}\n` +
    `Trades: ${tradeStats.totalTrades || 0} (${tradeStats.filled || 0} filled)\n\n` +
    `*Paper Trading*\n` +
    `Total: ${paperStats.totalRecorded || 0} | Resolved: ${paperStats.totalResolved || 0}\n` +
    `Sim bankroll: $${(paperStats.simBankroll || 0).toFixed(2)}`
  );
}

async function handleEdges(chatId) {
  const { scanState } = deps;
  const edges = scanState?.cachedScanResults || [];
  const lastScan = scanState?.lastScanTime;

  // Only show proven (bookmaker-validated) edges — old model signals are noise
  let provenEdges = [];
  try {
    const provenEdge = require('./strategies/provenEdge');
    const activeSignals = provenEdge.getActiveSignals ? provenEdge.getActiveSignals() : [];
    provenEdges = activeSignals;
  } catch { }

  if (provenEdges.length === 0) {
    return sendTo(chatId, `📭 No proven edges right now.\n_Only bookmaker-validated signals shown._\nLast scan: ${lastScan ? timeAgo(lastScan) : 'Never'}`);
  }

  let text = `🎯 *Proven Edges* (${provenEdges.length})\n_${lastScan ? timeAgo(lastScan) : '?'}_\n\n`;

  for (const e of provenEdges.slice(0, 8)) {
    const netEdge = e.edge?.net || e.net || 0;
    const div = (Math.abs(netEdge) * 100).toFixed(1);
    text += `🎯 *${truncate(e.market || e.question || 'Unknown', 50)}*\n`;
    text += `   ${e.side || '?'} | Net edge: ${div}%\n`;
    text += `   Grade: ${e.grade || '?'} | Score: ${e.score || 0}/100\n`;
    const bkCount = e.edge?.bookmakerCount || e.bookmakerCount;
    if (bkCount) text += `   📚 ${bkCount} bookmakers confirm\n`;
    text += `\n`;
  }

  text += `_Only externally-validated signals shown._`;
  await sendTo(chatId, text);
}

async function handleTrades(chatId) {
  const { executor } = deps;
  const trades = executor?.getTradeHistory(10) || [];

  if (trades.length === 0) return sendTo(chatId, `📭 No executed trades yet.`);

  let text = `💹 *Recent Trades* (${trades.length})\n\n`;
  for (const t of trades.slice(-10).reverse()) {
    const icon = t.status === 'FILLED' ? '✅' : t.status === 'REJECTED' ? '❌' : '⏳';
    text += `${icon} *${truncate(t.market || t.question || 'Unknown', 45)}*\n`;
    text += `   ${t.side || '?'} @ ${((t.price || 0) * 100).toFixed(0)}% | $${(t.amount || 0).toFixed(2)} | ${t.orderType || 'MARKET'}\n`;
    text += `   ${t.strategy || ''} | ${t.timestamp ? timeAgo(new Date(t.timestamp)) : ''}\n\n`;
  }
  await sendTo(chatId, text);
}

async function handlePaper(chatId) {
  const { paperTrader } = deps;
  const history = paperTrader?.getHistory(10) || [];
  if (history.length === 0) return sendTo(chatId, `📭 No paper trades yet.`);

  let text = `📝 *Paper Trades* (${history.length})\n\n`;
  for (const t of history.slice(0, 10)) {
    const status = t.resolved ? (t.pnl > 0 ? '✅' : '❌') : '⏳';
    text += `${status} *${truncate(t.question || t.market || 'Unknown', 45)}*\n`;
    text += `   ${t.side || '?'} @ ${((t.entryPrice || 0) * 100).toFixed(0)}%`;
    if (t.resolved) text += ` → P&L: ${t.pnl >= 0 ? '+' : ''}$${(t.pnl || 0).toFixed(2)}`;
    text += `\n   ${t.strategy || ''} | ${t.timestamp ? timeAgo(new Date(t.timestamp)) : ''}\n\n`;
  }
  await sendTo(chatId, text);
}

async function handlePnl(chatId) {
  const { paperTrader } = deps;
  const perf = paperTrader?.getPerformance() || {};

  await sendTo(chatId,
    `💰 *P&L Summary*\n\n` +
    `Trades: ${perf.totalPaperTrades || 0} | Resolved: ${perf.resolvedCount || 0}\n` +
    `Win rate: ${((perf.winRate || 0) * 100).toFixed(1)}%\n` +
    `P&L: ${(perf.totalPnL || 0) >= 0 ? '+' : ''}$${(perf.totalPnL || 0).toFixed(2)}\n` +
    `ROI: ${((perf.roi || 0) * 100).toFixed(1)}%\n` +
    `Sharpe: ${(perf.sharpeRatio || 0).toFixed(2)}\n` +
    `Drawdown: ${((perf.maxDrawdown || 0) * 100).toFixed(1)}%\n` +
    `Bankroll: $${(perf.simBankroll || 0).toFixed(2)} ${perf.simBusted ? '💀' : ''}`
  );
}

async function handleOpportunities(chatId) {
  const { scanner } = deps;
  const opps = scanner?.getOpportunities(10) || [];
  if (opps.length === 0) return sendTo(chatId, `📭 No opportunities. Use /scan or /startbot.`);

  let text = `⚡ *Top Opportunities*\n\n`;
  for (const o of opps.slice(0, 10)) {
    const conf = o.confidence === 'HIGH' ? '🟢' : o.confidence === 'MEDIUM' ? '🟡' : '⚪';
    text += `${conf} *${truncate(o.question || o.market || 'Unknown', 45)}*\n`;
    text += `   Score: ${o.score || 0} | Edge: ${((o.edge || 0) * 100).toFixed(1)}%\n`;
    text += `   ${o.strategy || ''} | ${o.side || '?'} @ ${((o.price || 0) * 100).toFixed(0)}%\n\n`;
  }
  await sendTo(chatId, text);
}

// ─── Admin Commands ──────────────────────────────────────────────────

async function handleScan(chatId) {
  const { scanState } = deps;
  if (!scanState?.runAutoScan) return sendTo(chatId, `❌ Scan not available.`);
  if (scanState.scanRunning) return sendTo(chatId, `⏳ Scan already running…`);

  await sendTo(chatId, `🔍 Scanning…`);
  try {
    await scanState.runAutoScan();
    const edges = scanState.cachedScanResults || [];
    const strong = edges.filter(e => e.edgeSignal === 'STRONG').length;
    await sendTo(chatId, `✅ Done: ${edges.length} edges (${strong} STRONG)\nUse /edges to view.`);
  } catch (err) {
    await sendTo(chatId, `❌ Scan failed: ${err.message}`);
  }
}

async function handleStartBot(chatId) {
  const { scanner } = deps;
  if (!scanner) return sendTo(chatId, `❌ Scanner not available.`);
  const status = scanner.getStatus();
  if (status.running) return sendTo(chatId, `✅ Already running (${status.scanCount} scans).`);
  scanner.start(status.bankroll || 1000);
  await sendTo(chatId, `🚀 Scanner started! Bankroll: $${(status.bankroll || 1000).toFixed(2)}`);
}

async function handleStopBot(chatId) {
  const { scanner } = deps;
  if (!scanner) return sendTo(chatId, `❌ Scanner not available.`);
  const status = scanner.getStatus();
  if (!status.running) return sendTo(chatId, `⏸ Already stopped.`);
  scanner.stop();
  await sendTo(chatId, `⏸ Scanner stopped. ${status.scanCount} scans completed.`);
}

async function handleUsers(chatId) {
  const users = userStore.getAllUsers();
  if (users.length === 0) return sendTo(chatId, `No users registered.`);

  let text = `👥 *Users* (${users.length})\n\n`;
  for (const u of users) {
    const keys = userStore.hasValidKeys(u.chatId) ? '🔑' : '  ';
    const active = u.settings.enabled ? '✅' : '⏸';
    const role = u.role === 'admin' ? '👑' : '  ';
    text += `${role}${keys}${active} @${u.username || u.chatId}\n`;
    text += `   Trades: ${u.stats.tradesExecuted} | Vol: $${u.stats.totalVolume.toFixed(0)}\n`;
    text += `   Joined: ${u.createdAt?.slice(0, 10) || '?'}\n\n`;
  }
  await sendTo(chatId, text);
}

async function handleBroadcast(chatId, message) {
  if (!message) return sendTo(chatId, `Usage: /broadcast <message>`);
  const users = userStore.getAllUsers();
  let sent = 0;
  for (const u of users) {
    try {
      await sendTo(u.chatId, `📢 *Broadcast*\n\n${message}`);
      sent++;
    } catch { /* some chats may be unreachable */ }
  }
  await sendTo(chatId, `✅ Broadcast sent to ${sent}/${users.length} users.`);
}

// ─── Signal Preferences ──────────────────────────────────────────────

async function handleSignals(chatId, args) {
  const user = userStore.getUser(chatId);
  if (!user) return;

  // Ensure signals object exists (for users created before this feature)
  if (!user.signals) {
    user.signals = { strong: true, moderate: false, paper: true, resolution: true, opportunity: false, minQuality: 50 };
    userStore.save();
  }

  if (args) {
    const parts = args.split(/\s+/);
    const key = parts[0]?.toLowerCase();
    const val = parts.slice(1).join(' ');

    const signalMap = {
      'strong': { key: 'strong', parse: v => v === 'on' || v === 'true' },
      'moderate': { key: 'moderate', parse: v => v === 'on' || v === 'true' },
      'paper': { key: 'paper', parse: v => v === 'on' || v === 'true' },
      'resolution': { key: 'resolution', parse: v => v === 'on' || v === 'true' },
      'opportunity': { key: 'opportunity', parse: v => v === 'on' || v === 'true' },
      'quality': { key: 'minQuality', parse: Number },
      'all': { key: '_all', parse: v => v === 'on' || v === 'true' },
    };

    const setting = signalMap[key];
    if (setting) {
      const parsed = setting.parse(val);
      if (setting.key === '_all') {
        user.signals = { ...user.signals, strong: parsed, moderate: parsed, paper: parsed, resolution: parsed, opportunity: parsed };
      } else {
        user.signals[setting.key] = parsed;
      }
      userStore.save();
      await sendTo(chatId, `✅ Signal *${setting.key === '_all' ? 'all' : setting.key}* → \`${parsed}\``);
      return;
    }

    return sendTo(chatId,
      `Usage: /signals <type> <on|off>\n\n` +
      `Types: strong, moderate, paper, resolution, opportunity, quality, all\n` +
      `Example: \`/signals moderate on\``
    );
  }

  const s = user.signals;
  await sendTo(chatId,
    `📡 *Your Signal Preferences*\n\n` +
    `🟢 Strong edges: ${s.strong ? 'ON' : 'OFF'}\n` +
    `🟡 Moderate edges: ${s.moderate ? 'ON' : 'OFF'}\n` +
    `📝 Paper trades: ${s.paper ? 'ON' : 'OFF'}\n` +
    `🏁 Market resolutions: ${s.resolution ? 'ON' : 'OFF'}\n` +
    `⚡ Scanner opportunities: ${s.opportunity ? 'ON' : 'OFF'}\n` +
    `📊 Min quality: ${s.minQuality}\n\n` +
    `_Change with:_ \`/signals <type> <on|off>\`\n` +
    `Turn all on: \`/signals all on\``
  );
}

// ─── Per-User Trade Execution ────────────────────────────────────────

/**
 * Execute a trade on behalf of a specific user using their API credentials.
 * Called when edges are found and user has autoTrade enabled.
 */
async function executeForUser(user, edge) {
  if (!user.settings.enabled || !user.settings.autoTrade) return null;
  if (!userStore.hasValidKeys(user.chatId)) return null;
  if ((edge.edgeQuality || 0) < user.settings.minEdgeQuality) return null;

  const tokenId = edge.yesTokenId || edge.tokenId;
  if (!tokenId) return null;

  const side = edge.edgeDirection === 'BUY_YES' ? 'BUY' : edge.edgeDirection === 'BUY_NO' ? 'BUY' : null;
  if (!side) return null;

  const price = edge.edgeDirection === 'BUY_YES' ? (edge.marketPrice || 0) : (1 - (edge.marketPrice || 0));
  const size = Math.min(user.settings.maxTradeSize, 50); // Cap at user's max

  try {
    const result = await executeWithCredentials(user.polymarket, {
      tokenId,
      side,
      price,
      size,
      dryRun: user.settings.dryRun,
    });

    // Record in user's trade history
    userStore.recordTrade(user.chatId, {
      market: edge.question || edge.market,
      conditionId: edge.conditionId,
      side,
      price,
      size,
      status: result.status || 'DRY_RUN',
      edge: edge.edgeSignal,
      quality: edge.edgeQuality,
    });

    // Notify user
    const icon = result.status === 'DRY_RUN' ? '📝' : '✅';
    await sendTo(user.chatId,
      `${icon} *Trade ${result.status === 'DRY_RUN' ? '(Dry Run)' : 'Executed'}*\n\n` +
      `${truncate(edge.question || 'Unknown', 50)}\n` +
      `${side} @ ${(price * 100).toFixed(0)}% | $${size.toFixed(2)}\n` +
      `Edge: ${edge.edgeSignal} (${edge.edgeQuality}/100)`
    );

    return result;
  } catch (err) {
    log.error('TELEGRAM', `Trade for user ${user.chatId} failed: ${err.message}`);
    await sendTo(user.chatId, `❌ Trade failed: ${err.message}\n\n${truncate(edge.question || '', 40)}`);
    return null;
  }
}

/**
 * Submit an order using a specific user's CLOB API credentials.
 * This uses raw CLOB API calls (API key auth).
 */
async function executeWithCredentials(creds, { tokenId, side, price, size, dryRun = true }) {
  if (dryRun) {
    return {
      status: 'DRY_RUN',
      orderId: `dry_${Date.now()}`,
      side, price, size, tokenId,
      message: 'Validated — not submitted (dry-run)',
    };
  }

  // Real CLOB API order placement with user's credentials
  const CLOB_API = deps.config?.CLOB_API || 'https://clob.polymarket.com';

  const response = await fetch(`${CLOB_API}/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'POLY_API_KEY': creds.apiKey,
      'POLY_API_SECRET': creds.apiSecret,
      'POLY_PASSPHRASE': creds.passphrase,
    },
    body: JSON.stringify({
      tokenID: tokenId,
      price: price.toFixed(4),
      size: size.toFixed(2),
      side: side,
      type: 'GTC',
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CLOB ${response.status}: ${text.slice(0, 200)}`);
  }

  return await response.json();
}

// ─── Alert Push (called after scans) ─────────────────────────────────

async function pushEdgeAlert(edges) {
  if (!botToken) return;

  const allUsers = userStore.getAllUsers();

  for (const user of allUsers) {
    if (!user.settings.alerts) continue;
    const sig = user.signals || { strong: true, moderate: false, minQuality: 50 };

    // Filter edges for this user's preferences
    const userEdges = edges.filter(e => {
      const q = e.edgeQuality || 0;
      if (q < (sig.minQuality || 0)) return false;
      if (e.edgeSignal === 'STRONG' && sig.strong) return true;
      if (e.edgeSignal === 'MODERATE' && sig.moderate) return true;
      return false;
    });

    if (userEdges.length === 0) continue;

    const strongCount = userEdges.filter(e => e.edgeSignal === 'STRONG').length;
    const modCount = userEdges.filter(e => e.edgeSignal === 'MODERATE').length;
    const label = [strongCount && `${strongCount} strong`, modCount && `${modCount} moderate`].filter(Boolean).join(', ');

    let text = `📡 *Trade Signal* — ${label}\n\n`;
    for (const e of userEdges.slice(0, 8)) {
      const isProven = e.provenEdge;
      const icon = isProven ? '🎯' : e.edgeSignal === 'STRONG' ? '🟢' : '🟡';
      const mktPrice = ((e.marketPrice || 0) * 100).toFixed(0);
      const estPrice = ((e.prob || 0) * 100).toFixed(0);
      const div = (Math.abs(e.divergence || 0) * 100).toFixed(1);
      text += `${icon} *${truncate(e.question || 'Unknown', 50)}*\n`;
      if (isProven) {
        text += `   ${e.edgeDirection || ''} | Net edge: ${div}%\n`;
        text += `   Grade: ${e.edgeGrade || '?'} | Quality: ${e.edgeQuality || 0}/100\n`;
        if (e.riskNote) text += `   ${truncate(e.riskNote, 80)}\n`;
      } else {
        text += `   Mkt: ${mktPrice}% → Est: ${estPrice}% (${div}pp)\n`;
        text += `   Quality: ${e.edgeQuality || 0}/100 | ${e.edgeDirection || ''}\n`;
      }
      text += `\n`;
    }
    if (userEdges.length > 8) text += `_…and ${userEdges.length - 8} more_`;

    await sendTo(user.chatId, text);

    // Auto-trade for this user if enabled
    if (user.settings.enabled && user.settings.autoTrade && userStore.hasValidKeys(user.chatId)) {
      const tradeable = userEdges.filter(e => e.edgeSignal === 'STRONG');
      for (const edge of tradeable.slice(0, 3)) {
        await executeForUser(user, edge);
      }
    }
  }
}

/**
 * Push paper trade signal to users who have paper notifications enabled.
 */
async function pushPaperTradeSignal(trades) {
  if (!botToken || !trades || trades.length === 0) return;

  const allUsers = userStore.getAllUsers();
  for (const user of allUsers) {
    const sig = user.signals || {};
    if (!sig.paper) continue;

    let text = `📝 *Paper Trade Signal* — ${trades.length} new\n\n`;
    for (const t of trades.slice(0, 5)) {
      text += `• *${truncate(t.question || t.market || 'Unknown', 45)}*\n`;
      text += `   ${t.side || '?'} @ ${((t.entryPrice || t.price || 0) * 100).toFixed(0)}%`;
      text += ` | ${t.strategy || 'auto'}\n\n`;
    }
    if (trades.length > 5) text += `_…and ${trades.length - 5} more_`;
    await sendTo(user.chatId, text);
  }
}

/**
 * Push market resolution signal to users.
 */
async function pushResolutionSignal(resolutions) {
  if (!botToken || !resolutions || resolutions.length === 0) return;

  const allUsers = userStore.getAllUsers();
  for (const user of allUsers) {
    const sig = user.signals || {};
    if (!sig.resolution) continue;

    let text = `🏁 *Market Resolved* — ${resolutions.length} market${resolutions.length > 1 ? 's' : ''}\n\n`;
    for (const r of resolutions.slice(0, 5)) {
      const icon = r.pnl > 0 ? '✅' : r.pnl < 0 ? '❌' : '⚪';
      text += `${icon} *${truncate(r.question || r.market || 'Unknown', 45)}*\n`;
      text += `   Result: ${r.outcome || r.result || '?'}`;
      if (r.pnl != null) text += ` | P&L: ${r.pnl >= 0 ? '+' : ''}$${r.pnl.toFixed(2)}`;
      text += `\n\n`;
    }
    await sendTo(user.chatId, text);
  }
}

/**
 * Push scanner opportunity signal to users who want it.
 */
async function pushOpportunitySignal(opportunities) {
  if (!botToken || !opportunities || opportunities.length === 0) return;

  const allUsers = userStore.getAllUsers();
  for (const user of allUsers) {
    const sig = user.signals || {};
    if (!sig.opportunity) continue;

    const filtered = opportunities.filter(o => (o.score || 0) >= 50).slice(0, 5);
    if (filtered.length === 0) continue;

    let text = `⚡ *Opportunity Signal* — ${filtered.length} found\n\n`;
    for (const o of filtered) {
      const conf = o.confidence === 'HIGH' ? '🟢' : o.confidence === 'MEDIUM' ? '🟡' : '⚪';
      text += `${conf} *${truncate(o.question || o.market || 'Unknown', 45)}*\n`;
      text += `   Score: ${o.score || 0} | Edge: ${((o.edge || 0) * 100).toFixed(1)}%\n`;
      text += `   ${o.strategy || ''} | ${o.side || '?'} @ ${((o.price || 0) * 100).toFixed(0)}%\n\n`;
    }
    await sendTo(user.chatId, text);
  }
}

// ─── BTC Bot Commands ────────────────────────────────────────────────

async function handleBtc(chatId) {
  return sendTo(chatId, btcBot.getStatusMessage());
}

async function handleBtcMarkets(chatId) {
  return sendTo(chatId, btcBot.getMarketsMessage());
}

async function handleBtcTrades(chatId) {
  return sendTo(chatId, btcBot.getTradesMessage());
}

async function handleBtcStart(chatId) {
  if (btcBot.isRunning()) {
    return sendTo(chatId, '₿ BTC bot is already running.');
  }
  btcBot.start();
  return sendTo(chatId, '₿ BTC bot started! Scanning every 5 minutes.');
}

async function handleBtcStop(chatId) {
  if (!btcBot.isRunning()) {
    return sendTo(chatId, '₿ BTC bot is not running.');
  }
  btcBot.stop();
  return sendTo(chatId, '₿ BTC bot stopped.');
}

async function handleBtcSet(chatId, args) {
  if (!args || !args.trim()) {
    const cfg = btcBot.getConfig();
    return sendTo(chatId,
      `₿ *BTC Bot Settings*\n\n` +
      `maxsize — Max trade size: $${cfg.maxTradeSizeUsd}\n` +
      `edge — Min net edge: ${(cfg.minNetEdgePct * 100).toFixed(1)}%\n` +
      `kelly — Kelly fraction: ${cfg.kellyFraction}\n` +
      `bankroll — Bankroll: $${cfg.bankroll}\n` +
      `interval — Scan interval: ${cfg.scanIntervalMs / 60000}m\n` +
      `maxpos — Max positions: ${cfg.maxOpenPositions}\n\n` +
      `Usage: /btcset <key> <value>`
    );
  }
  const [key, ...rest] = args.split(/\s+/);
  const value = rest.join(' ');
  const result = btcBot.updateConfig(key, value);
  return sendTo(chatId, result);
}

// ─── BTC 5-Min Sniper Commands ───────────────────────────────────────

async function handleSniper(chatId) {
  return sendTo(chatId, btcSniper.getStatusMessage());
}

async function handleSniperSignal(chatId) {
  return sendTo(chatId, btcSniper.getSignalMessage());
}

async function handleSniperTrades(chatId) {
  return sendTo(chatId, btcSniper.getTradesMessage());
}

async function handleSniperStart(chatId) {
  if (btcSniper.isRunning()) {
    return sendTo(chatId, '⚡ Sniper is already running.');
  }
  btcSniper.start();
  return sendTo(chatId, '⚡ BTC 5-min Sniper started! Binance feed + Polymarket scanner active.');
}

async function handleSniperStop(chatId) {
  if (!btcSniper.isRunning()) {
    return sendTo(chatId, '⚡ Sniper is not running.');
  }
  btcSniper.stop();
  return sendTo(chatId, '⚡ BTC Sniper stopped.');
}

async function handleSniperSet(chatId, args) {
  if (!args || !args.trim()) {
    const cfg = btcSniper.getConfig();
    return sendTo(chatId,
      `⚡ *Sniper Settings*\n\n` +
      `maxsize — Max trade: $${cfg.maxTradeSize}\n` +
      `kelly — Kelly fraction: ${cfg.kellyFraction}\n` +
      `bankroll — Bankroll: $${cfg.bankroll}\n` +
      `threshold — Signal threshold: ${cfg.signalThreshold}\n` +
      `maxloss — Daily loss limit: $${cfg.maxDailyLoss}\n` +
      `poll — Market poll interval: ${cfg.marketPollMs / 1000}s\n\n` +
      `Usage: /sniperset <key> <value>`
    );
  }
  const [key, ...rest] = args.split(/\s+/);
  const value = rest.join(' ');
  const result = btcSniper.updateConfig(key, value);
  return sendTo(chatId, result);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

function timeAgo(date) {
  if (!date) return '?';
  const d = date instanceof Date ? date : new Date(date);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ─── Lifecycle ───────────────────────────────────────────────────────

function initialize(token, dependencies = {}) {
  if (!token) {
    log.debug('TELEGRAM', 'No TELEGRAM_BOT_TOKEN — Telegram disabled');
    return false;
  }

  botToken = token;
  deps = dependencies;

  startPolling();
  log.info('TELEGRAM', `Bot initialized — ${userStore.getUserCount()} users loaded`);
  return true;
}

function startPolling() {
  if (pollingTimer) return;
  async function poll() {
    try {
      await pollUpdates();
    } catch (err) {
      log.debug('TELEGRAM', `Poll error: ${err.message}`);
    }
    pollingTimer = setTimeout(poll, 1000);
  }
  poll();
}

function stop() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
  userStore.save();
  log.info('TELEGRAM', 'Bot stopped');
}

function isActive() {
  return !!botToken;
}

// ─── Proven Edge & CLV Commands ──────────────────────────────────────

async function handleProvenEdge(chatId) {
  try {
    const { scanner } = deps;
    const strategies = require('./strategies');
    const provenEdge = strategies.provenEdge;
    if (!provenEdge) return sendTo(chatId, `❌ Proven Edge strategy not loaded.`);

    const stats = provenEdge.getStats();
    const opps = scanner?.getOpportunitiesByStrategy?.('PROVEN_EDGE') || [];

    let msg = `🎯 *Proven Edge System*\n\n`;

    // Active opportunities
    if (opps.length > 0) {
      msg += `*Active Edges:* ${opps.length}\n\n`;
      for (const opp of opps.slice(0, 5)) {
        const emoji = opp.type === 'ORDERBOOK_ARB' ? '🔒' :
                      opp.type === 'BOOKMAKER_CONSENSUS' ? '📊' : '🔄';
        msg += `${emoji} *${opp.type}* [${opp.grade}]\n`;
        msg += `  ${(opp.market || '').slice(0, 50)}\n`;
        msg += `  ${opp.side} @ ${(opp.entryPrice * 100).toFixed(0)}¢ | Edge: ${(opp.edge.net * 100).toFixed(1)}%\n`;
        msg += `  Size: $${opp.positionSize} | Score: ${opp.score}\n`;
        if (opp.clvConfirmed) msg += `  ✅ CLV Confirmed\n`;
        msg += `\n`;
      }
    } else {
      msg += `*No active edges right now.*\n\n`;
    }

    // CLV stats
    const clv = stats.clv;
    msg += `📈 *CLV Tracking:*\n`;
    msg += `  Tracked: ${clv.tracked} | Confirmed: ${clv.confirmed} | Denied: ${clv.denied}\n`;
    msg += `  Rate: ${(clv.confirmationRate * 100).toFixed(0)}% ${clv.isReliable ? '✅' : '⏳'}\n\n`;

    // Signal breakdown
    msg += `📡 *Signal Sources:*\n`;
    msg += `  Bookmaker: ${stats.signalBreakdown.bookmaker}\n`;
    msg += `  Cross-Platform: ${stats.signalBreakdown.kalshi}\n`;
    msg += `  Orderbook Arb: ${stats.signalBreakdown.orderbook}\n`;

    return sendTo(chatId, msg);
  } catch (err) {
    return sendTo(chatId, `❌ Error: ${err.message}`);
  }
}

async function handleCLV(chatId) {
  try {
    const strategies = require('./strategies');
    const provenEdge = strategies.provenEdge;
    if (!provenEdge) return sendTo(chatId, `❌ Proven Edge strategy not loaded.`);

    const clvStats = provenEdge.getCLVStats();

    let msg = `📊 *Closing Line Value (CLV) Report*\n\n`;
    msg += `CLV measures if the market moves in the direction we predicted.\n`;
    msg += `If CLV > 55%, we have real information (not noise).\n\n`;
    msg += `*Tracked:* ${clvStats.tracked}\n`;
    msg += `*Confirmed:* ${clvStats.confirmed} (market moved our way)\n`;
    msg += `*Denied:* ${clvStats.denied} (market went against us)\n`;
    msg += `*Pending:* ${clvStats.pending}\n\n`;
    msg += `*CLV Rate:* ${(clvStats.confirmationRate * 100).toFixed(1)}%\n`;
    msg += `*Reliable:* ${clvStats.isReliable ? '✅ Yes — our predictions have proven CLV' : '⏳ Not yet — need 10+ confirmed with >55% rate'}\n\n`;

    if (!clvStats.isReliable) {
      msg += `_Keep the scanner running. CLV builds over time as we track predictions and see if markets agree._`;
    } else {
      msg += `_Your edge is confirmed by market movement. The model is finding real mispricing._`;
    }

    return sendTo(chatId, msg);
  } catch (err) {
    return sendTo(chatId, `❌ Error: ${err.message}`);
  }
}

// ─── ICT Playbook Commands ────────────────────────────────────────────

const ictEngine = require('./engine/ictEngine');

const ICT_MARKETS = [
  { symbol: 'BTCUSDT', label: 'BTC/USD' },
  { symbol: 'ETHUSDT', label: 'ETH/USD' },
  { symbol: 'SOLUSDT', label: 'SOL/USD' },
  { symbol: 'BNBUSDT', label: 'BNB/USD' },
  { symbol: 'XRPUSDT', label: 'XRP/USD' },
  { symbol: 'DOGEUSDT', label: 'DOGE/USD' },
  { symbol: 'ADAUSDT', label: 'ADA/USD' },
  { symbol: 'AVAXUSDT', label: 'AVAX/USD' },
  { symbol: 'PAXGUSDT', label: 'XAU/USD' },
];

async function fetchBinanceCandles(symbol, interval = '1h', limit = 200) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`Binance ${resp.status}`);
  const data = await resp.json();
  return data.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
  }));
}

function zoneEmoji(zone) {
  if (zone === 'PREMIUM') return '🔴';
  if (zone === 'DISCOUNT') return '🟢';
  return '⚪';
}

function biasEmoji(bias) {
  if (bias === 'BULLISH') return '▲';
  if (bias === 'BEARISH') return '▼';
  return '—';
}

function confBar(score, max) {
  const filled = '█'.repeat(score);
  const empty = '░'.repeat(max - score);
  return `${filled}${empty} ${score}/${max}`;
}

async function handleICT(chatId, args) {
  try {
    const singleSymbol = args && args.length > 0 ? args[0].toUpperCase() : null;
    const markets = singleSymbol
      ? [{ symbol: singleSymbol.includes('USDT') ? singleSymbol : singleSymbol + 'USDT', label: singleSymbol.replace('USDT', '/USD') }]
      : ICT_MARKETS;

    await sendTo(chatId, `⏳ Analyzing ${markets.length} market${markets.length > 1 ? 's' : ''}...`);

    const results = [];
    for (const m of markets) {
      try {
        const candles = await fetchBinanceCandles(m.symbol, '1h', 200);
        const analysis = ictEngine.analyze(candles, { symbol: m.label, timeframe: '1h' });
        results.push(analysis);
      } catch (err) {
        results.push({ symbol: m.label, error: err.message });
      }
    }

    // Sort by confluence
    results.sort((a, b) => (b.confluence?.score ?? -1) - (a.confluence?.score ?? -1));

    if (singleSymbol && results.length === 1) {
      // Deep dive for single market
      const r = results[0];
      if (r.error) return sendTo(chatId, `❌ ${r.symbol}: ${r.error}`);

      const pd = r.premiumDiscount || {};
      const conf = r.confluence || { score: 0, max: 7, factors: {} };
      const ote = r.ote || {};
      const liq = r.liquidity || {};
      const f = conf.factors || {};

      let msg = `📐 *ICT Analysis — ${r.symbol}*\n`;
      msg += `_1h timeframe • ${new Date().toLocaleTimeString()}_\n\n`;
      msg += `*Price:* $${r.lastPrice?.toLocaleString()}\n`;
      msg += `*Bias:* ${biasEmoji(r.bias)} ${r.bias} (${r.structure?.state || '—'})\n`;
      msg += `*Zone:* ${zoneEmoji(pd.zone)} ${pd.zone || 'N/A'} (${pd.pct ?? '—'}%)\n`;
      msg += `*Range:* $${pd.swingLow?.toLocaleString()} — $${pd.swingHigh?.toLocaleString()}\n`;
      msg += `*EQ:* $${pd.equilibrium?.toLocaleString()}\n\n`;

      msg += `*Confluence:* ${confBar(conf.score, conf.max)}\n`;
      msg += `${f.structure ? '✅' : '❌'} Structure\n`;
      msg += `${f.fvg ? '✅' : '❌'} FVG (${r.activeFVGs || 0} active)\n`;
      msg += `${f.ob ? '✅' : '❌'} Order Block (${r.activeOBs || 0} active)\n`;
      msg += `${f.ote ? '✅' : '❌'} OTE Zone${ote.inZone ? ' — IN ZONE' : ''}\n`;
      msg += `${f.liqSweep ? '✅' : '❌'} Liquidity Sweep\n`;
      msg += `${f.eqLevel ? '✅' : '❌'} EQH/EQL\n`;
      msg += `${f.breaker ? '✅' : '❌'} Breaker Block\n\n`;

      if (ote.active) {
        msg += `*OTE Zone:* $${ote.zoneLow?.toFixed(2)} — $${ote.zoneHigh?.toFixed(2)}\n`;
        msg += `*Sweet Spot:* $${ote.sweetSpot?.toFixed(2)}\n\n`;
      }

      if (liq.hasEQH) msg += `⚖️ *EQH detected* — buy-side liquidity pooling\n`;
      if (liq.hasEQL) msg += `⚖️ *EQL detected* — sell-side liquidity pooling\n`;
      if (liq.bullLiqSweep) msg += `💧 *BSL swept* — potential long reversal\n`;
      if (liq.bearLiqSweep) msg += `💧 *SSL swept* — potential short reversal\n`;

      msg += `\n*Alert:* ${r.alertLevel || 'NONE'}`;
      return sendTo(chatId, msg);
    }

    // Multi-market overview
    let msg = `📐 *ICT Playbook Scanner*\n`;
    msg += `_1h timeframe • ${results.length} markets • ${new Date().toLocaleTimeString()}_\n\n`;

    for (const r of results) {
      if (r.error) {
        msg += `❌ *${r.symbol}* — ${r.error}\n\n`;
        continue;
      }
      const pd = r.premiumDiscount || {};
      const conf = r.confluence || { score: 0, max: 7 };

      msg += `${zoneEmoji(pd.zone)} *${r.symbol}* — $${r.lastPrice?.toLocaleString()}\n`;
      msg += `${biasEmoji(r.bias)} ${r.bias} • ${pd.zone || 'EQ'} ${pd.pct ?? '—'}% • Conf: ${confBar(conf.score, conf.max)}\n`;

      const tags = [];
      if (r.activeFVGs > 0) tags.push(`FVG:${r.activeFVGs}`);
      if (r.activeOBs > 0) tags.push(`OB:${r.activeOBs}`);
      if (r.ote?.inZone) tags.push('OTE✓');
      if (r.liquidity?.hasEQH) tags.push('EQH');
      if (r.liquidity?.hasEQL) tags.push('EQL');
      if (r.liquidity?.bullLiqSweep) tags.push('BSL💧');
      if (r.liquidity?.bearLiqSweep) tags.push('SSL💧');
      if (tags.length > 0) msg += `_${tags.join(' • ')}_\n`;
      msg += `\n`;
    }

    msg += `_Use /ict BTCUSDT for deep dive_`;
    return sendTo(chatId, msg);
  } catch (err) {
    return sendTo(chatId, `❌ ICT analysis failed: ${err.message}`);
  }
}

async function handleICTAlert(chatId) {
  try {
    await sendTo(chatId, `⏳ Scanning for high-confluence setups...`);

    const results = [];
    for (const m of ICT_MARKETS) {
      try {
        const candles = await fetchBinanceCandles(m.symbol, '1h', 200);
        const analysis = ictEngine.analyze(candles, { symbol: m.label, timeframe: '1h' });
        if ((analysis.confluence?.score ?? 0) >= 3) {
          results.push(analysis);
        }
      } catch (err) {
        // skip failed markets
      }
    }

    if (results.length === 0) {
      return sendTo(chatId,
        `📐 *ICT Alerts*\n\n` +
        `No markets with 3+ confluence factors right now.\n` +
        `_The market is quiet — patience is edge._\n\n` +
        `Use /ict to see all markets.`
      );
    }

    results.sort((a, b) => (b.confluence?.score ?? 0) - (a.confluence?.score ?? 0));

    let msg = `⚡ *ICT High-Confluence Alerts*\n`;
    msg += `_${results.length} market${results.length > 1 ? 's' : ''} with 3+ factors_\n\n`;

    for (const r of results) {
      const pd = r.premiumDiscount || {};
      const conf = r.confluence || { score: 0, max: 7 };
      msg += `${zoneEmoji(pd.zone)} *${r.symbol}* — $${r.lastPrice?.toLocaleString()}\n`;
      msg += `${biasEmoji(r.bias)} ${r.bias} • ${pd.zone} ${pd.pct}% • ${confBar(conf.score, conf.max)}\n\n`;
    }

    msg += `_Use /ict SYMBOL for full breakdown_`;
    return sendTo(chatId, msg);
  } catch (err) {
    return sendTo(chatId, `❌ ICT alert scan failed: ${err.message}`);
  }
}

module.exports = { initialize, stop, isActive, sendTo, sendToAll, pushEdgeAlert, pushPaperTradeSignal, pushResolutionSignal, pushOpportunitySignal };
