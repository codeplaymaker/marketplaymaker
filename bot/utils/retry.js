/**
 * Retry helper with exponential backoff.
 *
 * @param {() => Promise<T>} fn       - Async function to retry
 * @param {Object}           [opts]
 * @param {number}           [opts.retries=3]      - Max retry attempts
 * @param {number}           [opts.baseDelay=1000]  - Base delay in ms
 * @param {number}           [opts.maxDelay=10000]  - Max delay cap in ms
 * @param {(err: Error, attempt: number) => boolean} [opts.shouldRetry] - Return false to abort early
 * @returns {Promise<T>}
 * @template T
 */
async function retry(fn, opts = {}) {
  const { retries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry } = opts;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      if (shouldRetry && !shouldRetry(err, attempt)) break;

      const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * 500, maxDelay);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

module.exports = { retry };
