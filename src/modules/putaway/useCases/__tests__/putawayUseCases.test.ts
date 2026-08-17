/**
 * Unit Tests for Putaway Use Cases
 *
 * Tests cover:
 * - calculateBinScore: scoring algorithm with temperature, distance, occupancy
 * - suggestBin: filtering and sorting bins by score
 * - confirmPutaway: validation, occupancy update, record creation
 * - getSuggestedAlternatives: excluding current bin
 * - putawayRules: isFastMoving, requiresTemperatureControl, getBinPriority
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import {
  calculateBinScore,
  suggestBin,
  confirmPutaway,
  getSuggestedAlternatives,
  putawayRules,
} from '../putawayUseCases';
import { Bin, ReceivedItem } from '../../types';
import { PutawayRepository, PutawayRecord } from '../../repositories/PutawayRepository';

// === Test Fixtures ===

function createBin(overrides: Partial<Bin> = {}): Bin {
  return {
    id: 'bin-1',
    code: 'A-01-01-01',
    zone: 'A',
    aisle: '01',
    rack: '01',
    level: '01',
    capacity: 100,
    currentOccupancy: 20,
    temperatureControlled: false,
    distanceFromDoor: 30,
    isActive: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

function createItem(overrides: Partial<ReceivedItem> = {}): ReceivedItem {
  return {
    id: 'item-1',
    skuId: 'sku-1',
    quantity: 10,
    movementRate: 'medium',
    ...overrides,
  };
}

function createMockRepository(overrides: Partial<PutawayRepository> = {}): PutawayRepository {
  return {
    getActiveBins: jest.fn().mockResolvedValue([]),
    getBin: jest.fn().mockResolvedValue(null),
    updateBinOccupancy: jest.fn().mockResolvedValue(createBin()),
    savePutawayRecord: jest.fn().mockImplementation((record) => Promise.resolve(record)),
    getReceivedItem: jest.fn().mockResolvedValue(null),
    getBinsByZone: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// === calculateBinScore Tests ===

describe('calculateBinScore', () => {
  it('should return base score of 100 for a standard item and bin', () => {
    const bin = createBin({ currentOccupancy: 0 });
    const item = createItem();

    const score = calculateBinScore(bin, item);

    // Base 100, no fast-moving bonus, 0% occupancy penalty = 100
    expect(score).toBe(100);
  });

  it('should return -1 when item requires temperature control but bin does not have it', () => {
    const bin = createBin({ temperatureControlled: false });
    const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });

    const score = calculateBinScore(bin, item);

    expect(score).toBe(-1);
  });

  it('should return -1 when bin temperature range does not cover item requirement', () => {
    const bin = createBin({
      temperatureControlled: true,
      temperatureRange: { min: 0, max: 5 },
    });
    const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });

    const score = calculateBinScore(bin, item);

    expect(score).toBe(-1);
  });

  it('should allow bin when temperature range fully covers item requirement', () => {
    const bin = createBin({
      temperatureControlled: true,
      temperatureRange: { min: 0, max: 10 },
      currentOccupancy: 0,
    });
    const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });

    const score = calculateBinScore(bin, item);

    expect(score).toBeGreaterThan(0);
  });

  it('should add bonus for fast-moving items when bin is near door', () => {
    const nearDoorBin = createBin({ distanceFromDoor: 10, currentOccupancy: 0 });
    const farBin = createBin({ distanceFromDoor: 60, currentOccupancy: 0 });
    const item = createItem({ movementRate: 'fast' });

    const nearScore = calculateBinScore(nearDoorBin, item);
    const farScore = calculateBinScore(farBin, item);

    // Near door: 100 + max(0, 50 - 10) = 140
    expect(nearScore).toBe(140);
    // Far: 100 + max(0, 50 - 60) = 100 (no bonus)
    expect(farScore).toBe(100);
    expect(nearScore).toBeGreaterThan(farScore);
  });

  it('should not add fast-moving bonus for medium or slow items', () => {
    const bin = createBin({ distanceFromDoor: 5, currentOccupancy: 0 });
    const mediumItem = createItem({ movementRate: 'medium' });
    const slowItem = createItem({ movementRate: 'slow' });

    expect(calculateBinScore(bin, mediumItem)).toBe(100);
    expect(calculateBinScore(bin, slowItem)).toBe(100);
  });

  it('should apply occupancy penalty proportional to current occupancy', () => {
    const emptyBin = createBin({ currentOccupancy: 0, capacity: 100 });
    const halfFullBin = createBin({ currentOccupancy: 50, capacity: 100 });
    const item = createItem();

    const emptyScore = calculateBinScore(emptyBin, item);
    const halfFullScore = calculateBinScore(halfFullBin, item);

    // Empty: 100 - (0/100 * 30) = 100
    expect(emptyScore).toBe(100);
    // Half full: 100 - (50/100 * 30) = 85
    expect(halfFullScore).toBe(85);
    expect(emptyScore).toBeGreaterThan(halfFullScore);
  });

  it('should return -1 when bin is at full capacity', () => {
    const fullBin = createBin({ currentOccupancy: 100, capacity: 100 });
    const item = createItem();

    const score = calculateBinScore(fullBin, item);

    expect(score).toBe(-1);
  });

  it('should handle item without temperature requirement on temperature-controlled bin', () => {
    const bin = createBin({
      temperatureControlled: true,
      temperatureRange: { min: 0, max: 10 },
      currentOccupancy: 0,
    });
    const item = createItem(); // no temperatureRequirement

    const score = calculateBinScore(bin, item);

    // Should still work - item doesn't need temp control but bin has it
    expect(score).toBe(100);
  });
});

// === suggestBin Tests ===

describe('suggestBin', () => {
  it('should return empty array when no bins available', () => {
    const item = createItem();

    const suggestions = suggestBin(item, []);

    expect(suggestions).toEqual([]);
  });

  it('should filter out inactive bins', () => {
    const activeBin = createBin({ id: 'active', isActive: true, currentOccupancy: 0 });
    const inactiveBin = createBin({ id: 'inactive', isActive: false, currentOccupancy: 0 });
    const item = createItem();

    const suggestions = suggestBin(item, [activeBin, inactiveBin]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].bin.id).toBe('active');
  });

  it('should filter out bins with score -1 (ineligible)', () => {
    const fullBin = createBin({ id: 'full', currentOccupancy: 100, capacity: 100 });
    const availableBin = createBin({ id: 'available', currentOccupancy: 10, capacity: 100 });
    const item = createItem();

    const suggestions = suggestBin(item, [fullBin, availableBin]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].bin.id).toBe('available');
  });

  it('should sort suggestions by score descending (best first)', () => {
    const emptyBin = createBin({ id: 'empty', currentOccupancy: 0, capacity: 100 });
    const halfBin = createBin({ id: 'half', currentOccupancy: 50, capacity: 100 });
    const almostFullBin = createBin({ id: 'almost-full', currentOccupancy: 90, capacity: 100 });
    const item = createItem();

    const suggestions = suggestBin(item, [almostFullBin, halfBin, emptyBin]);

    expect(suggestions[0].bin.id).toBe('empty');
    expect(suggestions[1].bin.id).toBe('half');
    expect(suggestions[2].bin.id).toBe('almost-full');
  });

  it('should mark first suggestion as not alternative, others as alternative', () => {
    const bin1 = createBin({ id: 'bin-1', currentOccupancy: 0 });
    const bin2 = createBin({ id: 'bin-2', currentOccupancy: 10 });
    const item = createItem();

    const suggestions = suggestBin(item, [bin1, bin2]);

    expect(suggestions[0].isAlternative).toBe(false);
    expect(suggestions[1].isAlternative).toBe(true);
  });

  it('should include score and reason in each suggestion', () => {
    const bin = createBin({ currentOccupancy: 0 });
    const item = createItem();

    const suggestions = suggestBin(item, [bin]);

    expect(suggestions[0].score).toBeGreaterThan(0);
    expect(suggestions[0].reason).toBeTruthy();
  });

  it('should prefer bins near door for fast-moving items', () => {
    const nearBin = createBin({ id: 'near', distanceFromDoor: 5, currentOccupancy: 0 });
    const farBin = createBin({ id: 'far', distanceFromDoor: 80, currentOccupancy: 0 });
    const fastItem = createItem({ movementRate: 'fast' });

    const suggestions = suggestBin(fastItem, [farBin, nearBin]);

    expect(suggestions[0].bin.id).toBe('near');
  });
});

// === confirmPutaway Tests ===

describe('confirmPutaway', () => {
  it('should throw validation error when itemId is empty', async () => {
    const repo = createMockRepository();

    await expect(confirmPutaway('', 'bin-1', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      message: 'Item ID cannot be empty',
    });
  });

  it('should throw validation error when binId is empty', async () => {
    const repo = createMockRepository();

    await expect(confirmPutaway('item-1', '', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      message: 'Bin ID cannot be empty',
    });
  });

  it('should throw business rule error when bin not found', async () => {
    const repo = createMockRepository({
      getBin: jest.fn().mockResolvedValue(null),
    });

    await expect(confirmPutaway('item-1', 'bin-1', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      message: 'Bin not found',
    });
  });

  it('should throw business rule error when bin is full', async () => {
    const fullBin = createBin({ currentOccupancy: 100, capacity: 100 });
    const repo = createMockRepository({
      getBin: jest.fn().mockResolvedValue(fullBin),
    });

    await expect(confirmPutaway('item-1', 'bin-1', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      message: 'Bin is full',
    });
  });

  it('should throw business rule error when item not found', async () => {
    const bin = createBin({ currentOccupancy: 20, capacity: 100 });
    const repo = createMockRepository({
      getBin: jest.fn().mockResolvedValue(bin),
      getReceivedItem: jest.fn().mockResolvedValue(null),
    });

    await expect(confirmPutaway('item-1', 'bin-1', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      message: 'Received item not found',
    });
  });

  it('should throw business rule error when bin is incompatible with item', async () => {
    const bin = createBin({ temperatureControlled: false });
    const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });
    const repo = createMockRepository({
      getBin: jest.fn().mockResolvedValue(bin),
      getReceivedItem: jest.fn().mockResolvedValue(item),
    });

    await expect(confirmPutaway('item-1', 'bin-1', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      message: 'Bin is not compatible with this item',
    });
  });

  it('should update bin occupancy and save putaway record on success', async () => {
    const bin = createBin({ id: 'bin-1', currentOccupancy: 20, capacity: 100 });
    const item = createItem({ id: 'item-1', quantity: 10 });
    const repo = createMockRepository({
      getBin: jest.fn().mockResolvedValue(bin),
      getReceivedItem: jest.fn().mockResolvedValue(item),
      updateBinOccupancy: jest.fn().mockResolvedValue({ ...bin, currentOccupancy: 30 }),
      savePutawayRecord: jest.fn().mockImplementation((record) => Promise.resolve(record)),
    });

    const result = await confirmPutaway('item-1', 'bin-1', repo);

    expect(repo.updateBinOccupancy).toHaveBeenCalledWith('bin-1', 30);
    expect(repo.savePutawayRecord).toHaveBeenCalled();
    expect(result.itemId).toBe('item-1');
    expect(result.binId).toBe('bin-1');
    expect(result.quantity).toBe(10);
    expect(result.putawayAt).toBeInstanceOf(Date);
  });
});

// === getSuggestedAlternatives Tests ===

describe('getSuggestedAlternatives', () => {
  it('should exclude the current bin from suggestions', () => {
    const currentBin = createBin({ id: 'current', currentOccupancy: 0 });
    const altBin1 = createBin({ id: 'alt-1', currentOccupancy: 10 });
    const altBin2 = createBin({ id: 'alt-2', currentOccupancy: 20 });
    const item = createItem();

    const alternatives = getSuggestedAlternatives(
      'current',
      item,
      [currentBin, altBin1, altBin2],
    );

    expect(alternatives.map((s) => s.bin.id)).not.toContain('current');
    expect(alternatives).toHaveLength(2);
  });

  it('should mark all results as alternatives', () => {
    const bin1 = createBin({ id: 'bin-1', currentOccupancy: 0 });
    const bin2 = createBin({ id: 'bin-2', currentOccupancy: 10 });
    const item = createItem();

    const alternatives = getSuggestedAlternatives('other-bin', item, [bin1, bin2]);

    alternatives.forEach((alt) => {
      expect(alt.isAlternative).toBe(true);
    });
  });

  it('should return empty array when no alternatives available', () => {
    const onlyBin = createBin({ id: 'only-bin' });
    const item = createItem();

    const alternatives = getSuggestedAlternatives('only-bin', item, [onlyBin]);

    expect(alternatives).toEqual([]);
  });

  it('should sort alternatives by score descending', () => {
    const emptyBin = createBin({ id: 'empty', currentOccupancy: 0, capacity: 100 });
    const halfBin = createBin({ id: 'half', currentOccupancy: 50, capacity: 100 });
    const item = createItem();

    const alternatives = getSuggestedAlternatives(
      'excluded',
      item,
      [halfBin, emptyBin],
    );

    expect(alternatives[0].bin.id).toBe('empty');
    expect(alternatives[1].bin.id).toBe('half');
  });
});

// === putawayRules Tests ===

describe('putawayRules', () => {
  describe('isFastMoving', () => {
    it('should return true for fast movement rate', () => {
      const item = createItem({ movementRate: 'fast' });
      expect(putawayRules.isFastMoving(item)).toBe(true);
    });

    it('should return false for medium movement rate', () => {
      const item = createItem({ movementRate: 'medium' });
      expect(putawayRules.isFastMoving(item)).toBe(false);
    });

    it('should return false for slow movement rate', () => {
      const item = createItem({ movementRate: 'slow' });
      expect(putawayRules.isFastMoving(item)).toBe(false);
    });
  });

  describe('requiresTemperatureControl', () => {
    it('should return true when item has temperature requirement', () => {
      const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });
      expect(putawayRules.requiresTemperatureControl(item)).toBe(true);
    });

    it('should return false when item has no temperature requirement', () => {
      const item = createItem();
      expect(putawayRules.requiresTemperatureControl(item)).toBe(false);
    });
  });

  describe('getBinPriority', () => {
    it('should delegate to calculateBinScore', () => {
      const bin = createBin({ currentOccupancy: 0 });
      const item = createItem();

      const priority = putawayRules.getBinPriority(bin, item);
      const directScore = calculateBinScore(bin, item);

      expect(priority).toBe(directScore);
    });

    it('should return -1 for incompatible bin', () => {
      const bin = createBin({ temperatureControlled: false });
      const item = createItem({ temperatureRequirement: { min: 2, max: 8 } });

      expect(putawayRules.getBinPriority(bin, item)).toBe(-1);
    });
  });
});
