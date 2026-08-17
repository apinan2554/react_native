/**
 * Cross-Module Flow Orchestrators - Unit Tests
 *
 * Tests for Inbound → Putaway → Inventory flows and stock alert flow.
 */

import {
  executeInboundToPutawayFlow,
  mapGRNItemToReceivedItem,
  SKUInfo,
  SKUInfoRepository,
} from '../inboundToPutawayFlow';
import {
  executePutawayToInventoryFlow,
  PutawayConfirmation,
} from '../putawayToInventoryFlow';
import { executeStockAlertFlow } from '../stockAlertFlow';
import { GRN, GRNItem } from '../../../modules/inbound/types';
import { Bin } from '../../../modules/putaway/types';
import { StockLevel } from '../../../modules/inventory/types';
import { InventoryRepository } from '../../../modules/inventory/repositories/InventoryRepository';

// === Test Helpers ===

function createMockGRN(overrides: Partial<GRN> = {}): GRN {
  return {
    id: 'grn-001',
    poId: 'po-001',
    receivedAt: new Date(),
    receivedBy: 'user-001',
    items: [
      {
        id: 'item-001',
        grnId: 'grn-001',
        skuId: 'sku-001',
        expectedQuantity: 100,
        receivedQuantity: 100,
        isDamaged: false,
      },
      {
        id: 'item-002',
        grnId: 'grn-001',
        skuId: 'sku-002',
        expectedQuantity: 50,
        receivedQuantity: 50,
        isDamaged: false,
      },
    ],
    status: 'confirmed',
    totalQuantityExpected: 150,
    totalQuantityReceived: 150,
    syncStatus: 'pending',
    ...overrides,
  };
}

function createMockBin(overrides: Partial<Bin> = {}): Bin {
  return {
    id: 'bin-001',
    code: 'A-01-01',
    zone: 'A',
    aisle: '01',
    rack: '01',
    level: '1',
    capacity: 200,
    currentOccupancy: 50,
    temperatureControlled: false,
    distanceFromDoor: 10,
    isActive: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

function createMockSKUInfoRepository(
  skuInfoMap: Record<string, SKUInfo>,
): SKUInfoRepository {
  return {
    getSKUInfo: jest.fn(async (skuId: string) => skuInfoMap[skuId] || null),
  };
}

function createMockInventoryRepository(
  overrides: Partial<InventoryRepository> = {},
): InventoryRepository {
  return {
    getStockLevel: jest.fn(async () => null),
    getAllStockLevels: jest.fn(async () => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    })),
    updateStockLevel: jest.fn(async (skuId, binId, quantity) => ({
      skuId,
      binId,
      quantity,
      reservedQuantity: 0,
      availableQuantity: quantity,
      minThreshold: 10,
      maxThreshold: 500,
      lastUpdated: new Date(),
      syncStatus: 'pending' as const,
    })),
    saveStockTransfer: jest.fn(async (t) => t),
    getStockLevelBySkuAndBin: jest.fn(async () => null),
    getAllStockLevelsUnpaginated: jest.fn(async () => []),
    saveCycleCount: jest.fn(async (c) => c),
    getCycleCount: jest.fn(async () => null),
    updateCycleCount: jest.fn(async (c) => c),
    getItemsByGroup: jest.fn(async () => []),
    ...overrides,
  };
}

// === Inbound → Putaway Flow Tests ===

describe('executeInboundToPutawayFlow', () => {
  it('should return error if GRN is not confirmed', async () => {
    const grn = createMockGRN({ status: 'draft' });
    const bins = [createMockBin()];
    const skuRepo = createMockSKUInfoRepository({});

    const result = await executeInboundToPutawayFlow(grn, bins, skuRepo);

    expect(result.grnId).toBe('grn-001');
    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('confirmed');
  });

  it('should map GRN items to received items and suggest bins', async () => {
    const grn = createMockGRN();
    const bins = [
      createMockBin({ id: 'bin-001', distanceFromDoor: 5 }),
      createMockBin({ id: 'bin-002', distanceFromDoor: 30 }),
    ];
    const skuRepo = createMockSKUInfoRepository({
      'sku-001': { id: 'sku-001', movementRate: 'fast' },
      'sku-002': { id: 'sku-002', movementRate: 'slow' },
    });

    const result = await executeInboundToPutawayFlow(grn, bins, skuRepo);

    expect(result.grnId).toBe('grn-001');
    expect(result.results).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    // First item should be fast-moving
    expect(result.results[0].receivedItem.movementRate).toBe('fast');
    expect(result.results[0].suggestions.length).toBeGreaterThan(0);

    // Second item should be slow-moving
    expect(result.results[1].receivedItem.movementRate).toBe('slow');
    expect(result.results[1].suggestions.length).toBeGreaterThan(0);
  });

  it('should report errors for SKUs not found in repository', async () => {
    const grn = createMockGRN();
    const bins = [createMockBin()];
    // Only sku-001 has info, sku-002 is missing
    const skuRepo = createMockSKUInfoRepository({
      'sku-001': { id: 'sku-001', movementRate: 'medium' },
    });

    const result = await executeInboundToPutawayFlow(grn, bins, skuRepo);

    expect(result.results).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].skuId).toBe('sku-002');
  });

  it('should handle temperature-controlled items', async () => {
    const grn = createMockGRN({
      items: [
        {
          id: 'item-001',
          grnId: 'grn-001',
          skuId: 'sku-cold',
          expectedQuantity: 20,
          receivedQuantity: 20,
          isDamaged: false,
        },
      ],
    });
    const coldBin = createMockBin({
      id: 'bin-cold',
      temperatureControlled: true,
      temperatureRange: { min: 2, max: 8 },
    });
    const normalBin = createMockBin({ id: 'bin-normal' });
    const bins = [coldBin, normalBin];
    const skuRepo = createMockSKUInfoRepository({
      'sku-cold': {
        id: 'sku-cold',
        movementRate: 'medium',
        temperatureRequirement: { min: 2, max: 8 },
      },
    });

    const result = await executeInboundToPutawayFlow(grn, bins, skuRepo);

    expect(result.results).toHaveLength(1);
    // Only the cold bin should be suggested (normal bin incompatible)
    const suggestions = result.results[0].suggestions;
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.bin.temperatureControlled)).toBe(true);
  });
});

describe('mapGRNItemToReceivedItem', () => {
  it('should correctly map GRNItem fields to ReceivedItem', () => {
    const grnItem: GRNItem = {
      id: 'item-001',
      grnId: 'grn-001',
      skuId: 'sku-001',
      expectedQuantity: 100,
      receivedQuantity: 95,
      isDamaged: false,
    };
    const skuInfo: SKUInfo = {
      id: 'sku-001',
      movementRate: 'fast',
      temperatureRequirement: { min: 0, max: 5 },
    };

    const result = mapGRNItemToReceivedItem(grnItem, skuInfo);

    expect(result.id).toBe('item-001');
    expect(result.skuId).toBe('sku-001');
    expect(result.quantity).toBe(95); // uses receivedQuantity
    expect(result.movementRate).toBe('fast');
    expect(result.temperatureRequirement).toEqual({ min: 0, max: 5 });
  });
});

// === Putaway → Inventory Flow Tests ===

describe('executePutawayToInventoryFlow', () => {
  it('should increase stock when no previous stock exists', async () => {
    const confirmation: PutawayConfirmation = {
      skuId: 'sku-001',
      binId: 'bin-001',
      quantity: 50,
    };
    const repo = createMockInventoryRepository({
      getStockLevelBySkuAndBin: jest.fn(async () => null),
    });

    const result = await executePutawayToInventoryFlow(confirmation, repo);

    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-001', 50);
    expect(result.updatedStock.quantity).toBe(50);
  });

  it('should add to existing stock', async () => {
    const confirmation: PutawayConfirmation = {
      skuId: 'sku-001',
      binId: 'bin-001',
      quantity: 30,
    };
    const existingStock: StockLevel = {
      skuId: 'sku-001',
      binId: 'bin-001',
      quantity: 70,
      reservedQuantity: 10,
      availableQuantity: 60,
      minThreshold: 20,
      maxThreshold: 200,
      lastUpdated: new Date(),
      syncStatus: 'synced',
    };
    const repo = createMockInventoryRepository({
      getStockLevelBySkuAndBin: jest.fn(async () => existingStock),
    });

    const result = await executePutawayToInventoryFlow(confirmation, repo);

    // Should update with 70 + 30 = 100
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-001', 100);
    expect(result.updatedStock.quantity).toBe(100);
  });

  it('should trigger max threshold alert when stock exceeds max', async () => {
    const confirmation: PutawayConfirmation = {
      skuId: 'sku-001',
      binId: 'bin-001',
      quantity: 100,
    };
    const repo = createMockInventoryRepository({
      getStockLevelBySkuAndBin: jest.fn(async () => null),
      updateStockLevel: jest.fn(async (skuId, binId, quantity) => ({
        skuId,
        binId,
        quantity,
        reservedQuantity: 0,
        availableQuantity: quantity,
        minThreshold: 10,
        maxThreshold: 80, // Max is 80, we're putting 100
        lastUpdated: new Date(),
        syncStatus: 'pending' as const,
      })),
    });

    const result = await executePutawayToInventoryFlow(confirmation, repo);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('max');
    expect(result.alerts[0].skuId).toBe('sku-001');
  });

  it('should return no alerts when stock is within thresholds', async () => {
    const confirmation: PutawayConfirmation = {
      skuId: 'sku-001',
      binId: 'bin-001',
      quantity: 50,
    };
    const repo = createMockInventoryRepository({
      getStockLevelBySkuAndBin: jest.fn(async () => null),
      updateStockLevel: jest.fn(async (skuId, binId, quantity) => ({
        skuId,
        binId,
        quantity,
        reservedQuantity: 0,
        availableQuantity: quantity,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'pending' as const,
      })),
    });

    const result = await executePutawayToInventoryFlow(confirmation, repo);

    expect(result.alerts).toHaveLength(0);
  });
});

// === Stock Alert Flow Tests ===

describe('executeStockAlertFlow', () => {
  it('should return empty alerts when no stocks exist', async () => {
    const repo = createMockInventoryRepository({
      getAllStockLevelsUnpaginated: jest.fn(async () => []),
    });

    const result = await executeStockAlertFlow(repo);

    expect(result.alerts).toHaveLength(0);
    expect(result.checkedCount).toBe(0);
  });

  it('should detect min threshold breach', async () => {
    const stocks: StockLevel[] = [
      {
        skuId: 'sku-low',
        binId: 'bin-001',
        quantity: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
    ];
    const repo = createMockInventoryRepository({
      getAllStockLevelsUnpaginated: jest.fn(async () => stocks),
    });

    const result = await executeStockAlertFlow(repo);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('min');
    expect(result.alerts[0].skuId).toBe('sku-low');
    expect(result.checkedCount).toBe(1);
  });

  it('should detect max threshold breach', async () => {
    const stocks: StockLevel[] = [
      {
        skuId: 'sku-high',
        binId: 'bin-001',
        quantity: 300,
        reservedQuantity: 0,
        availableQuantity: 300,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
    ];
    const repo = createMockInventoryRepository({
      getAllStockLevelsUnpaginated: jest.fn(async () => stocks),
    });

    const result = await executeStockAlertFlow(repo);

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('max');
    expect(result.alerts[0].skuId).toBe('sku-high');
    expect(result.checkedCount).toBe(1);
  });

  it('should detect both min and max breaches across multiple items', async () => {
    const stocks: StockLevel[] = [
      {
        skuId: 'sku-low',
        binId: 'bin-001',
        quantity: 3,
        reservedQuantity: 0,
        availableQuantity: 3,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
      {
        skuId: 'sku-ok',
        binId: 'bin-002',
        quantity: 50,
        reservedQuantity: 5,
        availableQuantity: 45,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
      {
        skuId: 'sku-high',
        binId: 'bin-003',
        quantity: 250,
        reservedQuantity: 0,
        availableQuantity: 250,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
    ];
    const repo = createMockInventoryRepository({
      getAllStockLevelsUnpaginated: jest.fn(async () => stocks),
    });

    const result = await executeStockAlertFlow(repo);

    expect(result.checkedCount).toBe(3);
    expect(result.alerts).toHaveLength(2);
    expect(result.alerts.find((a) => a.type === 'min')).toBeDefined();
    expect(result.alerts.find((a) => a.type === 'max')).toBeDefined();
  });

  it('should return no alerts when all stocks are within thresholds', async () => {
    const stocks: StockLevel[] = [
      {
        skuId: 'sku-001',
        binId: 'bin-001',
        quantity: 50,
        reservedQuantity: 5,
        availableQuantity: 45,
        minThreshold: 10,
        maxThreshold: 200,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
      {
        skuId: 'sku-002',
        binId: 'bin-002',
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
        minThreshold: 20,
        maxThreshold: 150,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      },
    ];
    const repo = createMockInventoryRepository({
      getAllStockLevelsUnpaginated: jest.fn(async () => stocks),
    });

    const result = await executeStockAlertFlow(repo);

    expect(result.alerts).toHaveLength(0);
    expect(result.checkedCount).toBe(2);
  });
});
