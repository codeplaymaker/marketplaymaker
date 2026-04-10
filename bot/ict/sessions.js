/**
 * Session / Killzone Manager
 * All times in EST (America/New_York)
 */
const config = require('./config');

const SESSION_MAP = {
  London:   { start: [2, 0],  end: [5, 0] },
  NY_AM:    { start: [8, 30], end: [11, 0] },
  NY_PM:    { start: [13, 30], end: [16, 0] },
  SilverAM: { start: [10, 0], end: [11, 0] },
  SilverPM: { start: [14, 0], end: [15, 0] },
};

const MACRO_WINDOWS = [
  { start: [9, 50],  end: [10, 10] },
  { start: [10, 50], end: [11, 10] },
  { start: [13, 50], end: [14, 10] },
];

/**
 * Get current EST time
 */
function getESTTime() {
  const now = new Date();
  // Convert to EST using Intl
  const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const est = new Date(estStr);
  return {
    hour: est.getHours(),
    minute: est.getMinutes(),
    dayOfWeek: est.getDay(), // 0=Sun, 1=Mon, ..., 5=Fri
    totalMin: est.getHours() * 60 + est.getMinutes(),
  };
}

function inWindow(totalMin, startH, startM, endH, endM) {
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return totalMin >= start && totalMin < end;
}

function isLondonKZ(t)  { return inWindow(t.totalMin, 2, 0, 5, 0); }
function isNYAMKZ(t)    { return inWindow(t.totalMin, 8, 30, 11, 0); }
function isNYPMKZ(t)    { return inWindow(t.totalMin, 13, 30, 16, 0); }
function isSilverAM(t)  { return inWindow(t.totalMin, 10, 0, 11, 0); }
function isSilverPM(t)  { return inWindow(t.totalMin, 14, 0, 15, 0); }
function isNYLunch(t)   { return inWindow(t.totalMin, 12, 0, 13, 30); }

function isMacro(t) {
  if (!config.useMacro) return false;
  return MACRO_WINDOWS.some(w => inWindow(t.totalMin, w.start[0], w.start[1], w.end[0], w.end[1]));
}

/**
 * Get current session name (or null if off-hours)
 */
function getCurrentSession() {
  const t = getESTTime();
  if (isSilverAM(t))  return 'SilverAM';
  if (isSilverPM(t))  return 'SilverPM';
  if (isMacro(t))     return 'Macro';
  if (isLondonKZ(t))  return 'London';
  if (isNYAMKZ(t))    return 'NY_AM';
  if (isNYPMKZ(t))    return 'NY_PM';
  return null;
}

/**
 * Check if current time is allowed for trading
 */
function isSessionAllowed(adaptiveLearner) {
  const t = getESTTime();

  // Day filters
  if (config.avoidMonday && t.dayOfWeek === 1) return { allowed: false, reason: 'Monday avoided' };
  if (config.avoidFriday && t.dayOfWeek === 5) return { allowed: false, reason: 'Friday avoided' };
  if (t.dayOfWeek === 0 || t.dayOfWeek === 6) return { allowed: false, reason: 'Weekend' };

  // Lunch filter
  if (config.avoidLunch && isNYLunch(t)) return { allowed: false, reason: 'NY Lunch' };

  // Killzone filter
  if (config.onlyKillzones) {
    let inKZ = false;
    if (config.killzones.london.enabled && isLondonKZ(t)) inKZ = true;
    if (config.killzones.nyAM.enabled && isNYAMKZ(t)) inKZ = true;
    if (config.killzones.nyPM.enabled && isNYPMKZ(t)) inKZ = true;
    if (config.killzones.silverAM.enabled && isSilverAM(t)) inKZ = true;
    if (config.killzones.silverPM.enabled && isSilverPM(t)) inKZ = true;
    if (isMacro(t)) inKZ = true;

    if (!inKZ) return { allowed: false, reason: 'Outside killzone' };
  }

  // Adaptive session check
  const session = getCurrentSession();
  if (adaptiveLearner && session && !adaptiveLearner.isSessionEnabled(session)) {
    return { allowed: false, reason: `Session ${session} disabled by adaptive learner` };
  }

  return { allowed: true, session };
}

/**
 * Should close before lunch?
 */
function shouldCloseForLunch() {
  if (!config.closeBeforeLunch) return false;
  const t = getESTTime();
  return isNYLunch(t);
}

module.exports = {
  getESTTime,
  getCurrentSession,
  isSessionAllowed,
  shouldCloseForLunch,
  isNYLunch: () => isNYLunch(getESTTime()),
};
