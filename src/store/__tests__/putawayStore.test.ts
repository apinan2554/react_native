/**
 * Unit tests for putawayStore
 */

import { usePutawayStore } from '../putawayStore';
import { BinSuggestion, ReceivedItem } from '../../modules/putaway/types';

describe('putawayStore', () => {
  beforeEach(() => {
    usePutawayStore.setState({
      currentItem: null,
      suggestions: [],
      selectedBin: null,
      loading: false,
      error: null,
    });
  });

  const mockItem: ReceivedItem = {
    id: 'item-1',
    skuId: 'sku-1',
    quantity: 50,
    movementRate: 'fast',
  };

  const mockSuggestion: BinSuggestion = {
    bin: {
      id: 'bin-1',
      code: 'A-01-01-01',
      zone: 'A',
      aisle: '01',
      rack: '01',
      level: '01',
      capacity: 100,
      currentOccupancy: 30,
      temperatureControlled: false,
      distanceFromDoor: 5,
      isActive: true,
      syncStatus: 'synced',
    },
    score: 85,
    reason: 'Near door, low occupancy',
    isAlternative: false,
  };

  describe('initial state', () => {
    it('should have default state', () => {
      const state = usePutawayStore.getState();
      expect(state.currentItem).toBeNull();
      expect(state.suggestions).toEqual([]);
      expect(state.selectedBin).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setCurrentItem', () => {
    it('should set the current item', () => {
      usePutawayStore.getState().setCurrentItem(mockItem);

      expect(usePutawayStore.getState().currentItem).toEqual(mockItem);
    });

    it('should allow setting to null', () => {
      usePutawayStore.getState().setCurrentItem(mockItem);
      usePutawayStore.getState().setCurrentItem(null);

      expect(usePutawayStore.getState().currentItem).toBeNull();
    });
  });

  describe('setSuggestions', () => {
    it('should set bin suggestions', () => {
      usePutawayStore.getState().setSuggestions([mockSuggestion]);

      expect(usePutawayStore.getState().suggestions).toEqual([mockSuggestion]);
    });
  });

  describe('selectBin', () => {
    it('should select a bin by id', () => {
      usePutawayStore.getState().selectBin('bin-1');

      expect(usePutawayStore.getState().selectedBin).toBe('bin-1');
    });

    it('should allow deselecting', () => {
      usePutawayStore.getState().selectBin('bin-1');
      usePutawayStore.getState().selectBin(null);

      expect(usePutawayStore.getState().selectedBin).toBeNull();
    });
  });

  describe('clearSuggestions', () => {
    it('should clear suggestions and selected bin', () => {
      usePutawayStore.getState().setSuggestions([mockSuggestion]);
      usePutawayStore.getState().selectBin('bin-1');
      usePutawayStore.getState().clearSuggestions();

      const state = usePutawayStore.getState();
      expect(state.suggestions).toEqual([]);
      expect(state.selectedBin).toBeNull();
    });
  });

  describe('setLoading and setError', () => {
    it('should set loading state', () => {
      usePutawayStore.getState().setLoading(true);
      expect(usePutawayStore.getState().loading).toBe(true);
    });

    it('should set error state', () => {
      usePutawayStore.getState().setError('Network error');
      expect(usePutawayStore.getState().error).toBe('Network error');
    });
  });
});
