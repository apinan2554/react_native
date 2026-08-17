/**
 * Inbound Module - การรับสินค้าเข้า (Goods Receipt)
 *
 * Type definitions for the Inbound module covering:
 * - GRN (Goods Receipt Note) management
 * - Barcode scanning results
 * - PO comparison and discrepancy detection
 * - Damage reporting
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { SyncStatus } from '../../shared/types/common';

// === GRN Status ===
export type GRNStatus = 'draft' | 'confirmed' | 'discrepancy';

// === Core Interfaces ===

/**
 * Goods Receipt Note (GRN) - ใบรับสินค้า
 * Created when goods are received at the warehouse and compared against a PO.
 */
export interface GRN {
  id: string;
  poId: string;
  receivedAt: Date;
  receivedBy: string;
  items: GRNItem[];
  status: GRNStatus;
  totalQuantityExpected: number;
  totalQuantityReceived: number;
  discrepancyNotes?: string;
  syncStatus: SyncStatus;
}

/**
 * GRN Item - รายการสินค้าในใบรับสินค้า
 * Each item represents a single SKU line within a GRN.
 */
export interface GRNItem {
  id: string;
  grnId: string;
  skuId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  isDamaged: boolean;
  damageReport?: DamageReport;
}

/**
 * Damage Report - รายงานสินค้าเสียหาย
 * Attached to a GRNItem when goods arrive damaged, includes photo evidence.
 */
export interface DamageReport {
  id: string;
  grnItemId: string;
  photos: string[]; // URI paths to photos
  reason: string;
  quantity: number;
  reportedAt: Date;
}

/**
 * Scanned Item Result - ผลลัพธ์จากการสแกนบาร์โค้ด
 * Returned after scanning a barcode/QR code to identify the item and match against PO.
 */
export interface ScannedItemResult {
  skuId: string;
  name: string;
  barcode: string;
  matchedPO: boolean;
  poId?: string;
  expectedQuantity?: number;
  category?: string;
}

/**
 * Discrepancy Item - รายการที่มีความคลาดเคลื่อน
 * Represents a single SKU where received quantity differs from expected.
 */
export interface DiscrepancyItem {
  skuId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  difference: number; // receivedQuantity - expectedQuantity
}

/**
 * PO Comparison Result - ผลการเปรียบเทียบกับใบสั่งซื้อ
 * Result of comparing received items against the Purchase Order.
 * Identifies matches and discrepancies.
 */
export interface POComparisonResult {
  poId: string;
  isMatch: boolean;
  totalExpected: number;
  totalReceived: number;
  matchedItems: GRNItem[];
  discrepancies: DiscrepancyItem[];
}
