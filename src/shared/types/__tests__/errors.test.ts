import {
  createNetworkError,
  createValidationError,
  createSyncConflictError,
  createPermissionError,
  createDeviceError,
  createBusinessRuleError,
  isNetworkError,
  isValidationError,
  isSyncConflictError,
  isPermissionError,
  isDeviceError,
  isBusinessRuleError,
  isRetryableError,
  isRecoverableError,
  AppError,
} from '../errors';

describe('Error Types', () => {
  describe('Factory Functions', () => {
    it('creates a NetworkError with correct defaults', () => {
      const error = createNetworkError('Connection timeout', {
        statusCode: 408,
        url: '/api/orders',
      });

      expect(error.type).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection timeout');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(408);
      expect(error.url).toBe('/api/orders');
    });

    it('creates a ValidationError with field info', () => {
      const error = createValidationError('SKU code is required', {
        field: 'skuCode',
        validationRule: 'required',
      });

      expect(error.type).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(false);
      expect(error.field).toBe('skuCode');
      expect(error.validationRule).toBe('required');
    });

    it('creates a SyncConflictError with entity info', () => {
      const error = createSyncConflictError('Data conflict detected', {
        entityType: 'sku',
        entityId: 'sku-123',
        serverVersion: { name: 'Server SKU' },
        clientVersion: { name: 'Client SKU' },
      });

      expect(error.type).toBe('SyncConflictError');
      expect(error.entityType).toBe('sku');
      expect(error.entityId).toBe('sku-123');
      expect(error.serverVersion).toEqual({ name: 'Server SKU' });
      expect(error.clientVersion).toEqual({ name: 'Client SKU' });
    });

    it('creates a PermissionError with role info', () => {
      const error = createPermissionError('Access denied', {
        requiredRole: 'admin',
        action: 'approve',
        resource: 'stock_adjustment',
      });

      expect(error.type).toBe('PermissionError');
      expect(error.recoverable).toBe(false);
      expect(error.retryable).toBe(false);
      expect(error.requiredRole).toBe('admin');
    });

    it('creates a DeviceError with fallback info', () => {
      const error = createDeviceError('Camera not available', {
        device: 'camera',
        fallbackAvailable: true,
      });

      expect(error.type).toBe('DeviceError');
      expect(error.device).toBe('camera');
      expect(error.fallbackAvailable).toBe(true);
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(true);
    });

    it('creates a BusinessRuleError with suggestion', () => {
      const error = createBusinessRuleError('Load exceeds vehicle capacity', {
        rule: 'max_weight',
        suggestion: 'Split the load across two vehicles',
      });

      expect(error.type).toBe('BusinessRuleError');
      expect(error.rule).toBe('max_weight');
      expect(error.suggestion).toBe('Split the load across two vehicles');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(false);
    });
  });

  describe('Type Guards', () => {
    const errors: AppError[] = [
      createNetworkError('net'),
      createValidationError('val'),
      createSyncConflictError('sync', { entityType: 'sku', entityId: '1' }),
      createPermissionError('perm'),
      createDeviceError('dev', { device: 'gps', fallbackAvailable: false }),
      createBusinessRuleError('biz', { rule: 'test' }),
    ];

    it('isNetworkError identifies NetworkError only', () => {
      expect(isNetworkError(errors[0])).toBe(true);
      expect(isNetworkError(errors[1])).toBe(false);
    });

    it('isValidationError identifies ValidationError only', () => {
      expect(isValidationError(errors[1])).toBe(true);
      expect(isValidationError(errors[0])).toBe(false);
    });

    it('isSyncConflictError identifies SyncConflictError only', () => {
      expect(isSyncConflictError(errors[2])).toBe(true);
      expect(isSyncConflictError(errors[0])).toBe(false);
    });

    it('isPermissionError identifies PermissionError only', () => {
      expect(isPermissionError(errors[3])).toBe(true);
      expect(isPermissionError(errors[0])).toBe(false);
    });

    it('isDeviceError identifies DeviceError only', () => {
      expect(isDeviceError(errors[4])).toBe(true);
      expect(isDeviceError(errors[0])).toBe(false);
    });

    it('isBusinessRuleError identifies BusinessRuleError only', () => {
      expect(isBusinessRuleError(errors[5])).toBe(true);
      expect(isBusinessRuleError(errors[0])).toBe(false);
    });
  });

  describe('Error Properties', () => {
    it('isRetryableError returns true for retryable errors', () => {
      const networkErr = createNetworkError('timeout');
      const validationErr = createValidationError('invalid');

      expect(isRetryableError(networkErr)).toBe(true);
      expect(isRetryableError(validationErr)).toBe(false);
    });

    it('isRecoverableError returns true for recoverable errors', () => {
      const deviceErr = createDeviceError('cam off', {
        device: 'camera',
        fallbackAvailable: true,
      });
      const permErr = createPermissionError('denied');

      expect(isRecoverableError(deviceErr)).toBe(true);
      expect(isRecoverableError(permErr)).toBe(false);
    });
  });
});
