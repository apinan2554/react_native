/**
 * Inbound Store - Zustand state management for Inbound module
 *
 * Manages state for goods receiving process including
 * scanned items, GRN list, and current GRN.
 *
 * Requirements: 13.1, 13.2
 */

import { create } from 'zustand';
import { GRN, ScannedItemResult } from '../modules/inbound/types';

export interface InboundState {
  currentGRN: GRN | null;
  scannedItems: ScannedItemResult[];
  grnList: GRN[];
  loading: boolean;
  error: string | null;
}

export interface InboundActions {
  addScannedItem: (item: ScannedItemResult) => void;
  removeScannedItem: (skuId: string) => void;
  setGRNList: (list: GRN[]) => void;
  clearScannedItems: () => void;
  setCurrentGRN: (grn: GRN | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type InboundStore = InboundState & InboundActions;

export const useInboundStore = create<InboundStore>()((set) => ({
  // State
  currentGRN: null,
  scannedItems: [],
  grnList: [],
  loading: false,
  error: null,

  // Actions
  addScannedItem: (item: ScannedItemResult) =>
    set((state) => ({
      scannedItems: [...state.scannedItems, item],
    })),

  removeScannedItem: (skuId: string) =>
    set((state) => ({
      scannedItems: state.scannedItems.filter((item) => item.skuId !== skuId),
    })),

  setGRNList: (list: GRN[]) =>
    set({
      grnList: list,
    }),

  clearScannedItems: () =>
    set({
      scannedItems: [],
    }),

  setCurrentGRN: (grn: GRN | null) =>
    set({
      currentGRN: grn,
    }),

  setLoading: (loading: boolean) =>
    set({
      loading,
    }),

  setError: (error: string | null) =>
    set({
      error,
    }),
}));
