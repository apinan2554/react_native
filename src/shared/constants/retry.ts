/**
 * Retry and offline queue configuration constants
 */

/** Maximum retry attempts for real-time operations */
export const MAX_RETRIES_REALTIME = 3;

/** Maximum retry attempts for batch/sync operations */
export const MAX_RETRIES_BATCH = 10;

/** Maximum retry attempts for offline queue items */
export const MAX_RETRIES_OFFLINE_QUEUE = 5;

/** Base delay in milliseconds for exponential backoff */
export const RETRY_BASE_DELAY_MS = 1_000;

/** Maximum delay in milliseconds for exponential backoff */
export const RETRY_MAX_DELAY_MS = 30_000;

/** HTTP status codes that trigger automatic retry */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/** Circuit breaker failure threshold before opening */
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;

/** Circuit breaker reset timeout in milliseconds (1 minute) */
export const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 60_000;

/**
 * Calculate exponential backoff delay
 * @param retryCount - Current retry attempt (0-indexed)
 * @returns Delay in milliseconds, capped at RETRY_MAX_DELAY_MS
 */
export function getRetryDelay(retryCount: number): number {
  return Math.min(
    RETRY_BASE_DELAY_MS * Math.pow(2, retryCount),
    RETRY_MAX_DELAY_MS
  );
}
