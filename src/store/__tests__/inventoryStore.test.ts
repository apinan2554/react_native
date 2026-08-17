/**
 * Unit tests for inventoryStore
 */

import { useInventoryStore } from '../inventoryStore';
import { AlertResult, CycleCount, StockLevel } from '../../modules/inventory/types';

describe('inventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      stockLevels: [],
      alerts: [],
      currentCycleCount: null,
      loading: false,
      error: null,
    });
  });

  const mockStockLevel: StockLevel = {
    skuId: 'sku-1',
    binId: 'bin-1',
    quantity: 100,
    reservedQuantity: 20,
    availableQuantity: 80,
    minThreshold: 10,
    maxThreshold: 200,
    lastUpdated: new Date('2024-01-01'),
    syncStatus: 'synced',
  };

  const mockAlert: AlertResult = {
    type: 'min',
    skuId: 'sku-2',
    binId: 'bin-2',
    currentQuantity: 5,
    threshold: 10,
    message: 'Stock below minimum threshold',
  };

  const mockCycleCount: CycleCount = {
    id: 'cc-1',
    scheduledDate: new Date('2024-01-15'),
    status: 'pending',
    groupBy: 'sku_category',
    items: [],
    createdBy: 'user-1',
    syncStatus: 'synced',
  };

  describe('initial state', () => {
    it('should have default state', () => {
      const state = useInventoryStore.getState();
      expect(state.stockLevels).toEqual([]);
      expect(state.alerts).toEqual([]);
      expect(state.currentCycleCount).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setStockLevels', () => {
    it('should set stock levels', () => {
      useInventoryStore.getState().setStockLevels([mockStockLevel]);

      expect(useInventoryStore.getState().stockLevels).toEqual([mockStockLevel]);
    });
  });

  describe('setAlerts', () => {
    it('should set alerts', () => {
      useInventoryStore.getState().setAlerts([mockAlert]);

      expect(useInventoryStore.getState().alerts).toEqual([mockAlert]);
    });
  });

  describe('setCurrentCycleCount', () => {
    it('should set current cycle count', () => {
      useInventoryStore.getState().setCurrentCycleCount(mockCycleCount);

      expect(useInventoryStore.getState().currentCycleCount).toEqual(mockCycleCount);
    });

    it('should allow setting to null', () => {
      useInventoryStore.getState().setCurrentCycleCount(mockCycleCount);
      useInventoryStore.getState().setCurrentCycleCount(null);

      expect(useInventoryStore.getState().currentCycleCount).toBeNull();
    });
  });

  describe('updateStockLevel', () => {
    it('should update a specific stock level by skuId and binId', () => {
      useInventoryStore.getState().setStockLevels([mockStockLevel]);
      useInventoryStore.getState().updateStockLevel('sku-1', 'bin-1', {
        quantity: 150,
        availableQuantity: 130,
      });

      const updated = useInventoryStore.getState().stockLevels[0];
      expect(updated.quantity).toBe(150);
      expect(updated.availableQuantity).toBe(130);
      expect(updated.skuId).toBe('sku-1');
    });

    it('should not affect other stock levels', () => {
      const secondLevel: StockLevel = {
        ...mockStockLevel,
        skuId: 'sku-2',
        binId: 'bin-2',
        quantity: 50,
      };
      useInventoryStore.getState().setStockLevels([mockStockLevel, secondLevel]);
      useInventoryStore.getState().updateStockLevel('sku-1', 'bin-1', { quantity: 200 });

      const levels = useInventoryStore.getState().stockLevels;
      expect(levels[0].quantity).toBe(200);
      expect(levels[1].quantity).toBe(50);
    });
  });

  describe('setLoading and setError', () => {
    it('should set loading state', () => {
      useInventoryStore.getState().setLoading(true);
      expect(useInventoryStore.getState().loading).toBe(true);
    });

    it('should set error state', () => {
      useInventoryStore.getState().setError('Failed to fetch');
      expect(useInventoryStore.getState().error).toBe('Failed to fetch');
    });
  });
});
