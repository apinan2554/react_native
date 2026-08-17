/**
 * Putaway Module - แนะนำตำแหน่งจัดเก็บ (Put-away Optimization)
 *
 * Type definitions for the Putaway module covering:
 * - Bin (ตำแหน่งจัดเก็บสินค้า) management
 * - Bin suggestion with scoring
 * - Received item for putaway processing
 * - Putaway rules for bin prioritization
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { SyncStatus } from '../../shared/types/common';

// === Core Interfaces ===

/**
 * Bin - ตำแหน่งจัดเก็บสินค้าในคลัง
 * Represents a physical storage location within the warehouse.
 */
export interface Bin {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  capacity: number;
  currentOccupancy: number;
  temperatureControlled: boolean;
  temperatureRange?: { min: number; max: number };
  distanceFromDoor: number; // meters
  isActive: boolean;
  syncStatus: SyncStatus;
}

/**
 * BinSuggestion - ตำแหน่งที่แนะนำพร้อมคะแนนและเหตุผล
 * Returned by the putaway engine with a priority score indicating suitability.
 */
export interface BinSuggestion {
  bin: Bin;
  score: number; // priority score (higher = better)
  reason: string;
  isAlternative: boolean;
}

/**
 * ReceivedItem - สินค้าที่เพิ่งรับเข้าและต้องการจัดเก็บ
 * Represents an item that was just received and needs to be put away.
 */
export interface ReceivedItem {
  id: string;
  skuId: string;
  quantity: number;
  movementRate: 'fast' | 'medium' | 'slow';
  temperatureRequirement?: { min: number; max: number };
}

/**
 * PutawayRules - กฎสำหรับการแนะนำตำแหน่งจัดเก็บ
 * Business rules used to determine optimal bin placement for received items.
 *
 * - isFastMoving: checks if item has high movement rate (should be near door)
 * - requiresTemperatureControl: checks if item needs temperature-controlled storage
 * - getBinPriority: calculates priority score for a bin given an item
 */
export interface PutawayRules {
  isFastMoving(item: ReceivedItem): boolean;
  requiresTemperatureControl(item: ReceivedItem): boolean;
  getBinPriority(bin: Bin, item: ReceivedItem): number;
}
