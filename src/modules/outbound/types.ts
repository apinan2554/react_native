/**
 * Outbound Module - สินค้าขาออกและการหยิบสินค้า (Outbound & Order Picking)
 *
 * Type definitions for the Outbound module covering:
 * - PickList: รายการหยิบสินค้าจากคำสั่งซื้อ
 * - PickItem: รายการสินค้าแต่ละรายการใน Pick List
 * - BatchPickList: รายการหยิบแบบกลุ่ม (Batch Picking)
 * - ZonePickAssignment: การแบ่งรายการหยิบตามโซน
 * - WorkerQueue: คิวงานพนักงานหยิบสินค้า
 *
 * Requirements: 4.1, 4.3, 4.4
 */

import { SyncStatus } from '../../shared/types/common';

// === Core Interfaces ===

/**
 * PickList - รายการหยิบสินค้าจากคำสั่งซื้อ
 * Created automatically when an order enters the system.
 * Contains items ordered by the optimized pick route.
 */
export interface PickList {
  id: string;
  orderId: string;
  items: PickItem[];
  strategy: 'single' | 'batch' | 'zone';
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: number;
  optimizedRoute?: string[]; // ordered bin IDs
  createdAt: Date;
  syncStatus: SyncStatus;
}

/**
 * PickItem - รายการสินค้าแต่ละรายการใน Pick List
 * Represents a single item to be picked, with its bin location and sequence.
 */
export interface PickItem {
  id: string;
  pickListId: string;
  skuId: string;
  binId: string;
  quantity: number;
  pickedQuantity: number;
  status: 'pending' | 'picked' | 'error';
  sequence: number; // order in optimized route
}

/**
 * BatchPickList - รายการหยิบแบบกลุ่ม (Batch Picking)
 * Consolidates multiple orders with overlapping SKUs into a single pick run.
 *
 * Requirements: 4.3
 */
export interface BatchPickList {
  id: string;
  orderIds: string[];
  consolidatedItems: PickItem[];
  strategy: 'batch';
  status: 'pending' | 'in_progress' | 'completed';
  priority: number;
  createdAt: Date;
  syncStatus: SyncStatus;
}

/**
 * ZonePickAssignment - การแบ่งรายการหยิบตามโซน
 * Splits a pick list by warehouse zone and assigns each zone to a worker.
 *
 * Requirements: 4.4
 */
export interface ZonePickAssignment {
  id: string;
  pickListId: string;
  zone: string;
  assignedTo: string;
  items: PickItem[];
  status: 'pending' | 'in_progress' | 'completed';
  syncStatus: SyncStatus;
}

/**
 * WorkerQueue - คิวงานพนักงานหยิบสินค้า
 * Shows all pick lists assigned to a worker, sorted by priority.
 *
 * Requirements: 4.6
 */
export interface WorkerQueue {
  workerId: string;
  pickLists: PickList[];
  totalPending: number;
  totalInProgress: number;
}

/**
 * PickConfirmationResult - ผลการยืนยันหยิบสินค้า
 * Returned after a worker scans to confirm a pick.
 *
 * Requirements: 4.5, 4.7
 */
export interface PickConfirmationResult {
  success: boolean;
  pickItem: PickItem;
  errorMessage?: string;
}

/**
 * OrderItem - รายการสินค้าในคำสั่งซื้อ
 * Represents an item from an order that needs to be picked.
 */
export interface OrderItem {
  skuId: string;
  binId: string;
  quantity: number;
}

/**
 * Order - คำสั่งซื้อ
 * Represents a customer order that triggers pick list creation.
 */
export interface Order {
  id: string;
  items: OrderItem[];
  priority: number;
}
