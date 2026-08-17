/**
 * Inventory Store - Zustand state management for Inventory module
 *
 * Manages state for stock levels, alerts, and cycle counts.
 *
 * Requirements: 13.1, 13.2
 */

import { create } from 'zustand';
import { AlertResult, CycleCount, StockLevel } from '../modules/inventory/types';

export interface InventoryState {
  stockLevels: StockLevel[];
  alerts: AlertResult[];
  currentCycleCount: CycleCount | null;
  loading: boolean;
  error: string | null;
}

export interface InventoryActions {
  setStockLevels: (levels: StockLevel[]) => void;
  setAlerts: (alerts: AlertResult[]) => void;
  setCurrentCycleCount: (cycleCount: CycleCount | null) => void;
  updateStockLevel: (skuId: string, binId: string, updates: Partial<StockLevel>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type InventoryStore = InventoryState & InventoryActions;

export const useInventoryStore = create<InventoryStore>()((set) => ({
  // State
  stockLevels: [],
  alerts: [],
  currentCycleCount: null,
  loading: false,
  error: null,

  // Actions
  setStockLevels: (levels: StockLevel[]) =>
    set({
      stockLevels: levels,
    }),

  setAlerts: (alerts: AlertResult[]) =>
    set({
      alerts,
    }),

  setCurrentCycleCount: (cycleCount: CycleCount | null) =>
    set({
      currentCycleCount: cycleCount,
    }),

  updateStockLevel: (skuId: string, binId: string, updates: Partial<StockLevel>) =>
    set((state) => ({
      stockLevels: state.stockLevels.map((level) =>
        level.skuId === skuId && level.binId === binId
          ? { ...level, ...updates }
          : level
      ),
    })),

  setLoading: (loading: boolean) =>
    set({
      loading,
    }),

  setError: (error: string | null) =>
    set({
      error,
    }),
}));
