/**
 * Putaway Store - Zustand state management for Putaway module
 *
 * Manages state for put-away process including current item,
 * bin suggestions, and selected bin.
 *
 * Requirements: 13.1, 13.2
 */

import { create } from 'zustand';
import { BinSuggestion, ReceivedItem } from '../modules/putaway/types';

export interface PutawayState {
  currentItem: ReceivedItem | null;
  suggestions: BinSuggestion[];
  selectedBin: string | null; // binId
  loading: boolean;
  error: string | null;
}

export interface PutawayActions {
  setSuggestions: (suggestions: BinSuggestion[]) => void;
  selectBin: (binId: string | null) => void;
  clearSuggestions: () => void;
  setCurrentItem: (item: ReceivedItem | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type PutawayStore = PutawayState & PutawayActions;

export const usePutawayStore = create<PutawayStore>()((set) => ({
  // State
  currentItem: null,
  suggestions: [],
  selectedBin: null,
  loading: false,
  error: null,

  // Actions
  setSuggestions: (suggestions: BinSuggestion[]) =>
    set({
      suggestions,
    }),

  selectBin: (binId: string | null) =>
    set({
      selectedBin: binId,
    }),

  clearSuggestions: () =>
    set({
      suggestions: [],
      selectedBin: null,
    }),

  setCurrentItem: (item: ReceivedItem | null) =>
    set({
      currentItem: item,
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
