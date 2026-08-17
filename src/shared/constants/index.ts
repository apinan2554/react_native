// Shared Constants - Configuration values used across the application
export {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_UPLOAD_TIMEOUT_MS,
  API_MAX_PAYLOAD_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './api';

export {
  MAX_RETRIES_REALTIME,
  MAX_RETRIES_BATCH,
  MAX_RETRIES_OFFLINE_QUEUE,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRYABLE_STATUS_CODES,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  getRetryDelay,
} from './retry';

export {
  SESSION_TIMEOUT_MS,
  SESSION_TIMEOUT_MINUTES,
  ROLES,
  ALL_ROLES,
  CRITICAL_ACTIONS,
} from './auth';

export type { Role, CriticalAction } from './auth';
