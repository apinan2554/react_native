/**
 * Application error types and error handling utilities
 *
 * Layered error handling strategy:
 * - NetworkError: Queue for retry + notify user
 * - ValidationError: Show field-level error + block submission
 * - SyncConflictError: Last-write-wins or prompt user
 * - PermissionError: Show message + redirect
 * - DeviceError: Fallback + notify user
 * - BusinessRuleError: Alert + suggest alternatives
 */

/** Base interface for all application errors */
export interface AppErrorBase {
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  context?: Record<string, unknown>;
}

/** Network connectivity or API errors */
export interface NetworkError extends AppErrorBase {
  type: 'NetworkError';
  statusCode?: number;
  url?: string;
}

/** Input validation errors */
export interface ValidationError extends AppErrorBase {
  type: 'ValidationError';
  field?: string;
  validationRule?: string;
}

/** Offline sync conflict errors */
export interface SyncConflictError extends AppErrorBase {
  type: 'SyncConflictError';
  entityType: string;
  entityId: string;
  serverVersion?: Record<string, unknown>;
  clientVersion?: Record<string, unknown>;
}

/** Permission/authorization errors */
export interface PermissionError extends AppErrorBase {
  type: 'PermissionError';
  requiredRole?: string;
  action?: string;
  resource?: string;
}

/** Device hardware errors (camera, GPS, scanner) */
export interface DeviceError extends AppErrorBase {
  type: 'DeviceError';
  device: 'camera' | 'gps' | 'scanner' | 'printer';
  fallbackAvailable: boolean;
}

/** Business rule violation errors */
export interface BusinessRuleError extends AppErrorBase {
  type: 'BusinessRuleError';
  rule: string;
  suggestion?: string;
}

/** Union type of all application errors */
export type AppError =
  | NetworkError
  | ValidationError
  | SyncConflictError
  | PermissionError
  | DeviceError
  | BusinessRuleError;

// === Type Guards ===

export function isNetworkError(error: AppError): error is NetworkError {
  return error.type === 'NetworkError';
}

export function isValidationError(error: AppError): error is ValidationError {
  return error.type === 'ValidationError';
}

export function isSyncConflictError(error: AppError): error is SyncConflictError {
  return error.type === 'SyncConflictError';
}

export function isPermissionError(error: AppError): error is PermissionError {
  return error.type === 'PermissionError';
}

export function isDeviceError(error: AppError): error is DeviceError {
  return error.type === 'DeviceError';
}

export function isBusinessRuleError(error: AppError): error is BusinessRuleError {
  return error.type === 'BusinessRuleError';
}

/** Check if an error can be retried automatically */
export function isRetryableError(error: AppError): boolean {
  return error.retryable;
}

/** Check if an error can be recovered from by user action */
export function isRecoverableError(error: AppError): boolean {
  return error.recoverable;
}

// === Factory Functions ===

export function createNetworkError(
  message: string,
  options?: { statusCode?: number; url?: string; context?: Record<string, unknown> }
): NetworkError {
  return {
    type: 'NetworkError',
    code: 'NETWORK_ERROR',
    message,
    recoverable: true,
    retryable: true,
    statusCode: options?.statusCode,
    url: options?.url,
    context: options?.context,
  };
}

export function createValidationError(
  message: string,
  options?: { field?: string; validationRule?: string; context?: Record<string, unknown> }
): ValidationError {
  return {
    type: 'ValidationError',
    code: 'VALIDATION_ERROR',
    message,
    recoverable: true,
    retryable: false,
    field: options?.field,
    validationRule: options?.validationRule,
    context: options?.context,
  };
}

export function createSyncConflictError(
  message: string,
  options: {
    entityType: string;
    entityId: string;
    serverVersion?: Record<string, unknown>;
    clientVersion?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }
): SyncConflictError {
  return {
    type: 'SyncConflictError',
    code: 'SYNC_CONFLICT',
    message,
    recoverable: true,
    retryable: false,
    entityType: options.entityType,
    entityId: options.entityId,
    serverVersion: options.serverVersion,
    clientVersion: options.clientVersion,
    context: options.context,
  };
}

export function createPermissionError(
  message: string,
  options?: { requiredRole?: string; action?: string; resource?: string; context?: Record<string, unknown> }
): PermissionError {
  return {
    type: 'PermissionError',
    code: 'PERMISSION_DENIED',
    message,
    recoverable: false,
    retryable: false,
    requiredRole: options?.requiredRole,
    action: options?.action,
    resource: options?.resource,
    context: options?.context,
  };
}

export function createDeviceError(
  message: string,
  options: {
    device: 'camera' | 'gps' | 'scanner' | 'printer';
    fallbackAvailable: boolean;
    context?: Record<string, unknown>;
  }
): DeviceError {
  return {
    type: 'DeviceError',
    code: 'DEVICE_ERROR',
    message,
    recoverable: options.fallbackAvailable,
    retryable: true,
    device: options.device,
    fallbackAvailable: options.fallbackAvailable,
    context: options.context,
  };
}

export function createBusinessRuleError(
  message: string,
  options: { rule: string; suggestion?: string; context?: Record<string, unknown> }
): BusinessRuleError {
  return {
    type: 'BusinessRuleError',
    code: 'BUSINESS_RULE_VIOLATION',
    message,
    recoverable: true,
    retryable: false,
    rule: options.rule,
    suggestion: options.suggestion,
    context: options.context,
  };
}
