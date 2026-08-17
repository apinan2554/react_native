// Shared Types - Global types used across all modules
export type { SyncStatus } from './common';
export type { DateRange } from './common';
export type { PaginatedResult } from './common';
export type { Money } from './common';
export type { ECommercePlatform } from './common';

export type {
  AppError,
  AppErrorBase,
  NetworkError,
  ValidationError,
  SyncConflictError,
  PermissionError,
  DeviceError,
  BusinessRuleError,
} from './errors';

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
} from './errors';
