/**
 * Putaway Use Cases
 *
 * Business logic for the Putaway module covering:
 * - Bin scoring algorithm for optimal placement
 * - Bin suggestion based on item characteristics
 * - Putaway confirmation with occupancy update
 * - Alternative bin suggestions
 * - Putaway rules (fast-moving, temperature control, priority)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Bin, BinSuggestion, ReceivedItem, PutawayRules } from '../types';
import { PutawayRepository, PutawayRecord } from '../repositories/PutawayRepository';
import {
  createValidationError,
  createBusinessRuleError,
} from '../../../shared/types/errors';

/**
 * calculateBinScore - คำนวณคะแนนตามประเภทสินค้า, อุณหภูมิ, ระยะทาง, ความจุ
 *
 * Pure function that scores a bin for a given item.
 * Returns -1 if the bin is not eligible (temperature incompatible or full).
 *
 * Scoring logic:
 * - Base score: 100
 * - Temperature compatibility: mandatory (returns -1 if incompatible)
 * - Fast-moving bonus: up to 50 points for bins near door
 * - Occupancy penalty: up to 30 points for fuller bins
 * - Full bin: returns -1
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export function calculateBinScore(bin: Bin, item: ReceivedItem): number {
  let score = 100;

  // Temperature compatibility (mandatory)
  if (item.temperatureRequirement && !bin.temperatureControlled) return -1;
  if (item.temperatureRequirement && bin.temperatureControlled) {
    const tempOk =
      bin.temperatureRange!.min <= item.temperatureRequirement.min &&
      bin.temperatureRange!.max >= item.temperatureRequirement.max;
    if (!tempOk) return -1;
  }

  // Fast-moving items prefer bins near door
  if (item.movementRate === 'fast') {
    score += Math.max(0, 50 - bin.distanceFromDoor);
  }

  // Occupancy penalty (prefer emptier bins)
  const occupancyRatio = bin.currentOccupancy / bin.capacity;
  score -= occupancyRatio * 30;

  // Capacity check
  if (bin.currentOccupancy >= bin.capacity) return -1;

  return score;
}

/**
 * suggestBin - แนะนำตำแหน่ง Bin ที่เหมาะสม
 *
 * Filters eligible bins (score > -1), sorts by score descending,
 * and returns top suggestions with reasons.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
export function suggestBin(item: ReceivedItem, availableBins: Bin[]): BinSuggestion[] {
  if (!availableBins || availableBins.length === 0) {
    return [];
  }

  const scored: { bin: Bin; score: number }[] = [];

  for (const bin of availableBins) {
    if (!bin.isActive) continue;
    const score = calculateBinScore(bin, item);
    if (score > -1) {
      scored.push({ bin, score });
    }
  }

  // Sort by score descending (higher = better)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((entry, index) => ({
    bin: entry.bin,
    score: entry.score,
    reason: buildReason(entry.bin, item),
    isAlternative: index > 0,
  }));
}

/**
 * confirmPutaway - ยืนยันและอัปเดตตำแหน่ง
 *
 * Validates item and bin, checks capacity, updates bin occupancy,
 * and records the putaway action.
 *
 * Requirements: 2.4
 */
export async function confirmPutaway(
  itemId: string,
  binId: string,
  repository: PutawayRepository,
): Promise<PutawayRecord> {
  if (!itemId || itemId.trim().length === 0) {
    throw createValidationError('Item ID cannot be empty', {
      field: 'itemId',
      validationRule: 'required',
    });
  }

  if (!binId || binId.trim().length === 0) {
    throw createValidationError('Bin ID cannot be empty', {
      field: 'binId',
      validationRule: 'required',
    });
  }

  const bin = await repository.getBin(binId);
  if (!bin) {
    throw createBusinessRuleError('Bin not found', {
      rule: 'bin_must_exist',
      suggestion: 'Select a valid bin from the suggestions',
    });
  }

  if (bin.currentOccupancy >= bin.capacity) {
    throw createBusinessRuleError('Bin is full', {
      rule: 'bin_must_have_capacity',
      suggestion: 'Select an alternative bin with available capacity',
    });
  }

  const item = await repository.getReceivedItem(itemId);
  if (!item) {
    throw createBusinessRuleError('Received item not found', {
      rule: 'item_must_exist',
      suggestion: 'Verify the item ID is correct',
    });
  }

  // Verify temperature compatibility
  const score = calculateBinScore(bin, item);
  if (score === -1) {
    throw createBusinessRuleError('Bin is not compatible with this item', {
      rule: 'bin_must_be_compatible',
      suggestion: 'Select a bin that meets temperature and capacity requirements',
    });
  }

  // Update bin occupancy
  const newOccupancy = bin.currentOccupancy + item.quantity;
  await repository.updateBinOccupancy(binId, newOccupancy);

  // Record the putaway
  const record: PutawayRecord = {
    id: generateId(),
    itemId,
    binId,
    quantity: item.quantity,
    putawayAt: new Date(),
  };

  return repository.savePutawayRecord(record);
}

/**
 * getSuggestedAlternatives - แนะนำตำแหน่งสำรอง
 *
 * Returns alternative bins excluding the current bin, sorted by score.
 * Used when the recommended bin is full or rejected by the user.
 *
 * Requirements: 2.5
 */
export function getSuggestedAlternatives(
  currentBinId: string,
  item: ReceivedItem,
  availableBins: Bin[],
): BinSuggestion[] {
  const filteredBins = availableBins.filter((bin) => bin.id !== currentBinId);
  const suggestions = suggestBin(item, filteredBins);

  // Mark all as alternatives
  return suggestions.map((suggestion) => ({
    ...suggestion,
    isAlternative: true,
  }));
}

// === Putaway Rules Implementation ===

/**
 * PutawayRules implementation
 *
 * Business rules used to determine optimal bin placement for received items.
 */
export const putawayRules: PutawayRules = {
  /**
   * isFastMoving - returns true if item.movementRate === 'fast'
   */
  isFastMoving(item: ReceivedItem): boolean {
    return item.movementRate === 'fast';
  },

  /**
   * requiresTemperatureControl - returns true if item has temperature requirement
   */
  requiresTemperatureControl(item: ReceivedItem): boolean {
    return item.temperatureRequirement !== undefined;
  },

  /**
   * getBinPriority - delegates to calculateBinScore
   */
  getBinPriority(bin: Bin, item: ReceivedItem): number {
    return calculateBinScore(bin, item);
  },
};

// === Helper Functions ===

/**
 * Build a human-readable reason for why a bin was suggested.
 */
function buildReason(bin: Bin, item: ReceivedItem): string {
  const reasons: string[] = [];

  if (item.movementRate === 'fast' && bin.distanceFromDoor < 20) {
    reasons.push('ใกล้ประตูคลัง เหมาะกับสินค้าเคลื่อนไหวเร็ว');
  }

  if (item.temperatureRequirement && bin.temperatureControlled) {
    reasons.push('โซนควบคุมอุณหภูมิเหมาะสม');
  }

  const occupancyPercent = Math.round((bin.currentOccupancy / bin.capacity) * 100);
  if (occupancyPercent < 50) {
    reasons.push(`มีพื้นที่ว่างเพียงพอ (${occupancyPercent}% ใช้งาน)`);
  }

  if (reasons.length === 0) {
    reasons.push('ตำแหน่งพร้อมใช้งาน');
  }

  return reasons.join(', ');
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
