// Shared - Reusable utilities, types, and constants
export {
  apiClient,
  createApiClient,
  requestQueue,
  processQueue,
  calculateBackoffDelay,
} from './services';
export type { QueuedRequest, RetryConfig } from './services';

// Types
export type {
  SyncStatus,
  DateRange,
  PaginatedResult,
  Money,
  ECommercePlatform,
  AppError,
  AppErrorBase,
  NetworkError,
  ValidationError,
  SyncConflictError,
  PermissionError,
  DeviceError,
  BusinessRuleError,
} from './types';

export {
  isNetworkError,
  isValidationError,
  isSyncConflictError,
  isPermissionError,
  isDeviceError,
  isBusinessRuleError,
  isRetryableError,
  isRecoverableError,
  createNetworkError,
  createValidationError,
  createSyncConflictError,
  createPermissionError,
  createDeviceError,
  createBusinessRuleError,
} from './types';

// Constants
export {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_UPLOAD_TIMEOUT_MS,
  API_MAX_PAYLOAD_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_RETRIES_REALTIME,
  MAX_RETRIES_BATCH,
  MAX_RETRIES_OFFLINE_QUEUE,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRYABLE_STATUS_CODES,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  getRetryDelay,
  SESSION_TIMEOUT_MS,
  SESSION_TIMEOUT_MINUTES,
  ROLES,
  ALL_ROLES,
  CRITICAL_ACTIONS,
} from './constants';

export type { Role, CriticalAction } from './constants';
