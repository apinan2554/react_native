/**
 * Navigation Type Definitions
 *
 * Type-safe navigation params for WMS app navigation structure.
 * Uses React Navigation v7 typing patterns.
 *
 * Requirements: 1.1-3.6
 */

// === Inbound Stack ===
export type InboundStackParamList = {
  BarcodeScan: undefined;
  ReceivingConfirm: { poId?: string };
  DamageReport: { itemId: string; itemName: string };
  GRNHistory: undefined;
};

// === Putaway Stack ===
export type PutawayStackParamList = {
  BinSuggestion: { itemId?: string };
  PutawayConfirm: { itemId: string; binId: string };
};

// === Inventory Stack ===
export type InventoryStackParamList = {
  StockList: undefined;
  StockTransfer: { skuId?: string };
  CycleCount: { countId?: string };
};

// === Tab Navigator ===
export type TabParamList = {
  InboundTab: undefined;
  PutawayTab: undefined;
  InventoryTab: undefined;
};

// === Root Stack ===
export type RootStackParamList = {
  MainTabs: undefined;
};
