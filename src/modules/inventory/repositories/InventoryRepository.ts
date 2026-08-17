/**
 * Inventory Repository Interface
 *
 * Defines the data access contract for the Inventory module.
 * Implementations can use WatermelonDB (offline) or API (online).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { StockLevel, StockTransfer, CycleCount, CycleCountItem } from '../types';
import { PaginatedResult } from '../../../shared/types/common';

/** Filters for querying stock levels */
export interface StockLevelFilter {
  skuId?: string;
  binId?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

/** Parameters for creating a cycle count */
export interface CycleCountParams {
  scheduledDate: Date;
  groupBy: 'sku_category' | 'bin_zone';
  groupValue: string; // category name or zone name
  createdBy: string;
}

/** Individual count result recorded by a worker */
export interface CountResult {
  itemId: string;
  countedQuantity: number;
  countedBy: string;
}

/**
 * InventoryRepository - Data access interface for Inventory module
 *
 * This interface abstracts the data layer so use cases remain
 * independent of the storage mechanism (WatermelonDB, API, etc.)
 */
export interface InventoryRepository {
  /** Get stock level for a specific SKU (across all bins or a specific bin) */
  getStockLevel(skuId: string): Promise<StockLevel | null>;

  /** Get all stock levels with filters and pagination */
  getAllStockLevels(filters: StockLevelFilter): Promise<PaginatedResult<StockLevel>>;

  /** Update stock level quantity for a specific SKU in a specific bin */
  updateStockLevel(skuId: string, binId: string, quantity: number): Promise<StockLevel>;

  /** Save a stock transfer record */
  saveStockTransfer(transfer: StockTransfer): Promise<StockTransfer>;

  /** Get stock level for a specific SKU in a specific bin */
  getStockLevelBySkuAndBin(skuId: string, binId: string): Promise<StockLevel | null>;

  /** Get all stock levels (unfiltered, for alert checking) */
  getAllStockLevelsUnpaginated(): Promise<StockLevel[]>;

  /** Create a new cycle count */
  saveCycleCount(cycleCount: CycleCount): Promise<CycleCount>;

  /** Get cycle count by ID */
  getCycleCount(countId: string): Promise<CycleCount | null>;

  /** Update cycle count */
  updateCycleCount(cycleCount: CycleCount): Promise<CycleCount>;

  /** Get items for a cycle count by group criteria */
  getItemsByGroup(groupBy: 'sku_category' | 'bin_zone', groupValue: string): Promise<CycleCountItem[]>;
}
