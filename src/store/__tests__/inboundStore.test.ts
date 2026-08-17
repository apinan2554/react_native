/**
 * Unit tests for inboundStore
 */

import { useInboundStore } from '../inboundStore';
import { GRN, ScannedItemResult } from '../../modules/inbound/types';

describe('inboundStore', () => {
  beforeEach(() => {
    useInboundStore.setState({
      currentGRN: null,
      scannedItems: [],
      grnList: [],
      loading: false,
      error: null,
    });
  });

  const mockScannedItem: ScannedItemResult = {
    skuId: 'sku-1',
    name: 'Test Item',
    barcode: '1234567890',
    matchedPO: true,
    poId: 'po-1',
    expectedQuantity: 10,
  };

  const mockGRN: GRN = {
    id: 'grn-1',
    poId: 'po-1',
    receivedAt: new Date('2024-01-01'),
    receivedBy: 'user-1',
    items: [],
    status: 'confirmed',
    totalQuantityExpected: 100,
    totalQuantityReceived: 100,
    syncStatus: 'synced',
  };

  describe('initial state', () => {
    it('should have default state', () => {
      const state = useInboundStore.getState();
      expect(state.currentGRN).toBeNull();
      expect(state.scannedItems).toEqual([]);
      expect(state.grnList).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('addScannedItem', () => {
    it('should add a scanned item to the list', () => {
      useInboundStore.getState().addScannedItem(mockScannedItem);

      const state = useInboundStore.getState();
      expect(state.scannedItems).toHaveLength(1);
      expect(state.scannedItems[0]).toEqual(mockScannedItem);
    });

    it('should append items without removing existing ones', () => {
      const secondItem: ScannedItemResult = {
        ...mockScannedItem,
        skuId: 'sku-2',
        name: 'Second Item',
      };

      useInboundStore.getState().addScannedItem(mockScannedItem);
      useInboundStore.getState().addScannedItem(secondItem);

      expect(useInboundStore.getState().scannedItems).toHaveLength(2);
    });
  });

  describe('removeScannedItem', () => {
    it('should remove item by skuId', () => {
      useInboundStore.getState().addScannedItem(mockScannedItem);
      useInboundStore.getState().removeScannedItem('sku-1');

      expect(useInboundStore.getState().scannedItems).toHaveLength(0);
    });

    it('should not affect other items', () => {
      const secondItem: ScannedItemResult = {
        ...mockScannedItem,
        skuId: 'sku-2',
      };
      useInboundStore.getState().addScannedItem(mockScannedItem);
      useInboundStore.getState().addScannedItem(secondItem);
      useInboundStore.getState().removeScannedItem('sku-1');

      const state = useInboundStore.getState();
      expect(state.scannedItems).toHaveLength(1);
      expect(state.scannedItems[0].skuId).toBe('sku-2');
    });
  });

  describe('setGRNList', () => {
    it('should set the GRN list', () => {
      useInboundStore.getState().setGRNList([mockGRN]);

      expect(useInboundStore.getState().grnList).toEqual([mockGRN]);
    });
  });

  describe('clearScannedItems', () => {
    it('should clear all scanned items', () => {
      useInboundStore.getState().addScannedItem(mockScannedItem);
      useInboundStore.getState().clearScannedItems();

      expect(useInboundStore.getState().scannedItems).toEqual([]);
    });
  });

  describe('setCurrentGRN', () => {
    it('should set current GRN', () => {
      useInboundStore.getState().setCurrentGRN(mockGRN);

      expect(useInboundStore.getState().currentGRN).toEqual(mockGRN);
    });

    it('should allow setting to null', () => {
      useInboundStore.getState().setCurrentGRN(mockGRN);
      useInboundStore.getState().setCurrentGRN(null);

      expect(useInboundStore.getState().currentGRN).toBeNull();
    });
  });

  describe('setLoading and setError', () => {
    it('should set loading state', () => {
      useInboundStore.getState().setLoading(true);
      expect(useInboundStore.getState().loading).toBe(true);
    });

    it('should set error state', () => {
      useInboundStore.getState().setError('Something failed');
      expect(useInboundStore.getState().error).toBe('Something failed');
    });
  });
});
