/**
 * Unit tests for Inventory Module types and StockAlertRules
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { StockLevel, AlertResult, stockAlertRules } from '../types';

describe('StockAlertRules', () => {
  const createStockLevel = (overrides: Partial<StockLevel> = {}): StockLevel => ({
    skuId: 'SKU-001',
    binId: 'BIN-A01',
    quantity: 100,
    reservedQuantity: 10,
    availableQuantity: 90,
    minThreshold: 20,
    maxThreshold: 200,
    lastUpdated: new Date(),
    syncStatus: 'synced',
    ...overrides,
  });

  describe('checkMinThreshold', () => {
    it('should return null when available quantity is above min threshold', () => {
      const stock = createStockLevel({
        availableQuantity: 50,
        minThreshold: 20,
      });

      const result = stockAlertRules.checkMinThreshold(stock);
      expect(result).toBeNull();
    });

    it('should return null when available quantity equals min threshold', () => {
      const stock = createStockLevel({
        availableQuantity: 20,
        minThreshold: 20,
      });

      const result = stockAlertRules.checkMinThreshold(stock);
      expect(result).toBeNull();
    });

    it('should return alert when available quantity is below min threshold', () => {
      const stock = createStockLevel({
        skuId: 'SKU-LOW',
        binId: 'BIN-B02',
        availableQuantity: 5,
        minThreshold: 20,
      });

      const result = stockAlertRules.checkMinThreshold(stock);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('min');
      expect(result!.skuId).toBe('SKU-LOW');
      expect(result!.binId).toBe('BIN-B02');
      expect(result!.currentQuantity).toBe(5);
      expect(result!.threshold).toBe(20);
      expect(result!.message).toContain('below minimum threshold');
    });

    it('should return alert when available quantity is zero', () => {
      const stock = createStockLevel({
        availableQuantity: 0,
        minThreshold: 10,
      });

      const result = stockAlertRules.checkMinThreshold(stock);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('min');
      expect(result!.currentQuantity).toBe(0);
    });
  });

  describe('checkMaxThreshold', () => {
    it('should return null when quantity is below max threshold', () => {
      const stock = createStockLevel({
        quantity: 100,
        maxThreshold: 200,
      });

      const result = stockAlertRules.checkMaxThreshold(stock);
      expect(result).toBeNull();
    });

    it('should return null when quantity equals max threshold', () => {
      const stock = createStockLevel({
        quantity: 200,
        maxThreshold: 200,
      });

      const result = stockAlertRules.checkMaxThreshold(stock);
      expect(result).toBeNull();
    });

    it('should return alert when quantity exceeds max threshold', () => {
      const stock = createStockLevel({
        skuId: 'SKU-HIGH',
        binId: 'BIN-C03',
        quantity: 250,
        maxThreshold: 200,
      });

      const result = stockAlertRules.checkMaxThreshold(stock);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('max');
      expect(result!.skuId).toBe('SKU-HIGH');
      expect(result!.binId).toBe('BIN-C03');
      expect(result!.currentQuantity).toBe(250);
      expect(result!.threshold).toBe(200);
      expect(result!.message).toContain('exceeds maximum threshold');
    });
  });

  describe('AlertResult type validation', () => {
    it('should produce correctly structured AlertResult for min alert', () => {
      const stock = createStockLevel({
        skuId: 'SKU-TEST',
        binId: 'BIN-TEST',
        availableQuantity: 3,
        minThreshold: 10,
      });

      const result = stockAlertRules.checkMinThreshold(stock) as AlertResult;
      expect(result).toEqual({
        type: 'min',
        skuId: 'SKU-TEST',
        binId: 'BIN-TEST',
        currentQuantity: 3,
        threshold: 10,
        message: expect.stringContaining('SKU-TEST'),
      });
    });

    it('should produce correctly structured AlertResult for max alert', () => {
      const stock = createStockLevel({
        skuId: 'SKU-OVER',
        binId: 'BIN-FULL',
        quantity: 500,
        maxThreshold: 300,
      });

      const result = stockAlertRules.checkMaxThreshold(stock) as AlertResult;
      expect(result).toEqual({
        type: 'max',
        skuId: 'SKU-OVER',
        binId: 'BIN-FULL',
        currentQuantity: 500,
        threshold: 300,
        message: expect.stringContaining('SKU-OVER'),
      });
    });
  });
});
