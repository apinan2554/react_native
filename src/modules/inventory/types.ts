/**
 * Inventory Module - การจัดการสต็อกและสินค้าคงคลัง (Inventory & Stock Control)
 *
 * Type definitions for the Inventory module covering:
 * - StockLevel: ระดับสต็อกปัจจุบันในแต่ละตำแหน่ง
 * - StockTransfer: การย้ายสต็อกระหว่างตำแหน่ง
 * - CycleCount: รอบการนับสต็อก
 * - CycleCountItem: รายการนับสต็อกแต่ละรายการ
 * - AlertResult: ผลแจ้งเตือนระดับสต็อก
 * - StockAlertRules: กฎตรวจสอบ threshold
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { SyncStatus } from '../../shared/types/common';

// === Core Interfaces ===

/**
 * StockLevel - ระดับสต็อกของ SKU ในตำแหน่ง Bin
 * Tracks real-time quantity, reserved quantity, and threshold values.
 */
export interface StockLevel {
  skuId: string;
  binId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number; // quantity - reservedQuantity
  minThreshold: number;
  maxThreshold: number;
  lastUpdated: Date;
  syncStatus: SyncStatus;
}

/**
 * StockTransfer - การย้ายสต็อกระหว่างตำแหน่ง
 * Records every stock movement between bins with full traceability.
 */
export interface StockTransfer {
  id: string;
  skuId: string;
  fromBinId: string;
  toBinId: string;
  quantity: number;
  transferredBy: string;
  transferredAt: Date;
  reason?: string;
  syncStatus: SyncStatus;
}

/**
 * CycleCount - รอบการนับสต็อก
 * Represents a scheduled stock count session grouped by category or zone.
 */
export interface CycleCount {
  id: string;
  scheduledDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  groupBy: 'sku_category' | 'bin_zone';
  items: CycleCountItem[];
  createdBy: string;
  syncStatus: SyncStatus;
}

/**
 * CycleCountItem - รายการนับสต็อกแต่ละรายการ
 * Individual item within a cycle count, tracking system vs actual quantities.
 */
export interface CycleCountItem {
  id: string;
  cycleCountId: string;
  skuId: string;
  binId: string;
  systemQuantity: number;
  countedQuantity?: number;
  discrepancy?: number;
  countedBy?: string;
  countedAt?: Date;
  syncStatus: SyncStatus;
}

/**
 * AlertResult - ผลแจ้งเตือนระดับสต็อก
 * Returned when stock levels breach min or max thresholds.
 */
export interface AlertResult {
  type: 'min' | 'max';
  skuId: string;
  binId: string;
  currentQuantity: number;
  threshold: number;
  message: string;
}

/**
 * StockAlertRules - กฎตรวจสอบ Threshold ของสต็อก
 * Business rules for detecting stock alerts based on min/max thresholds.
 *
 * - checkMinThreshold: returns alert when available quantity falls below minimum
 * - checkMaxThreshold: returns alert when quantity exceeds maximum
 */
export interface StockAlertRules {
  checkMinThreshold(stock: StockLevel): AlertResult | null;
  checkMaxThreshold(stock: StockLevel): AlertResult | null;
}

// === Implementation ===

/**
 * Default implementation of StockAlertRules.
 * Checks stock levels against configured min/max thresholds.
 *
 * Requirements: 3.2, 3.3
 */
export const stockAlertRules: StockAlertRules = {
  /**
   * Checks if available quantity has fallen below the minimum threshold.
   * Returns an AlertResult if threshold is breached, null otherwise.
   */
  checkMinThreshold(stock: StockLevel): AlertResult | null {
    if (stock.availableQuantity < stock.minThreshold) {
      return {
        type: 'min',
        skuId: stock.skuId,
        binId: stock.binId,
        currentQuantity: stock.availableQuantity,
        threshold: stock.minThreshold,
        message: `Stock for SKU ${stock.skuId} in bin ${stock.binId} is below minimum threshold: ${stock.availableQuantity} < ${stock.minThreshold}`,
      };
    }
    return null;
  },

  /**
   * Checks if quantity has exceeded the maximum threshold.
   * Returns an AlertResult if threshold is breached, null otherwise.
   */
  checkMaxThreshold(stock: StockLevel): AlertResult | null {
    if (stock.quantity > stock.maxThreshold) {
      return {
        type: 'max',
        skuId: stock.skuId,
        binId: stock.binId,
        currentQuantity: stock.quantity,
        threshold: stock.maxThreshold,
        message: `Stock for SKU ${stock.skuId} in bin ${stock.binId} exceeds maximum threshold: ${stock.quantity} > ${stock.maxThreshold}`,
      };
    }
    return null;
  },
};
