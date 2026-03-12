/**
 * Shared API helper for communicating with the bot server.
 * Used by all Polymarket tab components.
 */

const BOT_API = process.env.REACT_APP_BOT_URL || '';
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

export async function api(path, options = {}) {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resolvedPath = (BOT_API || isProduction)
        ? path.replace(/^\/polybot/, '/api')
        : path;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${BOT_API}${resolvedPath}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    } catch (err) {
      if (attempt < maxRetries && (
        err.name === 'AbortError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('Load failed') ||
        err.message?.includes('ERR_CONNECTION') ||
        err.message?.includes('NetworkError')
      )) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('Load failed') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('ECONNREFUSED') ||
        err.name === 'AbortError'
      ) {
        throw new Error('Bot server offline. Start it with: cd bot && node server.js');
      }
      throw err;
    }
  }
}

export { BOT_API };
