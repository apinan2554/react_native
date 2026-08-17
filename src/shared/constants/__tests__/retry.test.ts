import {
  getRetryDelay,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  MAX_RETRIES_REALTIME,
  MAX_RETRIES_BATCH,
  MAX_RETRIES_OFFLINE_QUEUE,
} from '../retry';

describe('Retry Configuration', () => {
  describe('getRetryDelay', () => {
    it('returns base delay for first retry', () => {
      expect(getRetryDelay(0)).toBe(RETRY_BASE_DELAY_MS);
    });

    it('applies exponential backoff', () => {
      expect(getRetryDelay(0)).toBe(1_000);
      expect(getRetryDelay(1)).toBe(2_000);
      expect(getRetryDelay(2)).toBe(4_000);
      expect(getRetryDelay(3)).toBe(8_000);
      expect(getRetryDelay(4)).toBe(16_000);
    });

    it('caps delay at RETRY_MAX_DELAY_MS', () => {
      expect(getRetryDelay(10)).toBe(RETRY_MAX_DELAY_MS);
      expect(getRetryDelay(20)).toBe(RETRY_MAX_DELAY_MS);
    });

    it('returns 30 seconds as maximum', () => {
      expect(getRetryDelay(5)).toBe(30_000);
      expect(getRetryDelay(100)).toBe(30_000);
    });
  });

  describe('Constants values', () => {
    it('has correct retry limits', () => {
      expect(MAX_RETRIES_REALTIME).toBe(3);
      expect(MAX_RETRIES_BATCH).toBe(10);
      expect(MAX_RETRIES_OFFLINE_QUEUE).toBe(5);
    });
  });
});
