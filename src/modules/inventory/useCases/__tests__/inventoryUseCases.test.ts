import {
  getStockLevel,
  getAllStockLevels,
  transferStock,
  createCycleCount,
  recordCountResult,
  approveAdjustment,
  checkStockAlerts,
} from '../inventoryUseCases';
import { StockLevel, CycleCount, CycleCountItem } from '../../types';
import {
  InventoryRepository,
  StockLevelFilter,
  CycleCountParams,
  CountResult,
} from '../../repositories/InventoryRepository';

// === Test Helpers ===

function createMockRepository(
  overrides?: Partial<InventoryRepository>,
): InventoryRepository {
  return {
    getStockLevel: jest.fn().mockResolvedValue(null),
    getAllStockLevels: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    }),
    updateStockLevel: jest.fn().mockImplementation((skuId, binId, qty) =>
      Promise.resolve(createStockLevel({ skuId, binId, quantity: qty })),
    ),
    saveStockTransfer: jest.fn().mockImplementation((t) => Promise.resolve(t)),
    getStockLevelBySkuAndBin: jest.fn().mockResolvedValue(null),
    getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue([]),
    saveCycleCount: jest.fn().mockImplementation((cc) => Promise.resolve(cc)),
    getCycleCount: jest.fn().mockResolvedValue(null),
    updateCycleCount: jest.fn().mockImplementation((cc) => Promise.resolve(cc)),
    getItemsByGroup: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createStockLevel(overrides?: Partial<StockLevel>): StockLevel {
  return {
    skuId: 'sku-001',
    binId: 'bin-A1',
    quantity: 100,
    reservedQuantity: 10,
    availableQuantity: 90,
    minThreshold: 20,
    maxThreshold: 200,
    lastUpdated: new Date('2024-01-15T10:00:00Z'),
    syncStatus: 'synced',
    ...overrides,
  };
}

function createCycleCountItem(overrides?: Partial<CycleCountItem>): CycleCountItem {
  return {
    id: 'cci-001',
    cycleCountId: 'cc-001',
    skuId: 'sku-001',
    binId: 'bin-A1',
    systemQuantity: 100,
    syncStatus: 'pending',
    ...overrides,
  };
}

function createCycleCountData(overrides?: Partial<CycleCount>): CycleCount {
  return {
    id: 'cc-001',
    scheduledDate: new Date('2024-02-01'),
    status: 'pending',
    groupBy: 'sku_category',
    items: [createCycleCountItem()],
    createdBy: 'manager-001',
    syncStatus: 'pending',
    ...overrides,
  };
}

// === Tests ===

describe('getStockLevel', () => {
  it('should return stock level with computed availableQuantity', async () => {
    const stock = createStockLevel({ quantity: 100, reservedQuantity: 25 });
    const repo = createMockRepository({
      getStockLevel: jest.fn().mockResolvedValue(stock),
    });

    const result = await getStockLevel('sku-001', repo);

    expect(result.skuId).toBe('sku-001');
    expect(result.quantity).toBe(100);
    expect(result.reservedQuantity).toBe(25);
    expect(result.availableQuantity).toBe(75);
  });

  it('should throw validation error for empty skuId', async () => {
    const repo = createMockRepository();

    await expect(getStockLevel('', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'skuId',
    });
  });

  it('should throw business rule error when stock not found', async () => {
    const repo = createMockRepository({
      getStockLevel: jest.fn().mockResolvedValue(null),
    });

    await expect(getStockLevel('sku-unknown', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'stock_must_exist',
    });
  });

  it('should trim skuId before querying', async () => {
    const stock = createStockLevel();
    const repo = createMockRepository({
      getStockLevel: jest.fn().mockResolvedValue(stock),
    });

    await getStockLevel('  sku-001  ', repo);

    expect(repo.getStockLevel).toHaveBeenCalledWith('sku-001');
  });
});

describe('getAllStockLevels', () => {
  it('should return paginated results with computed availableQuantity', async () => {
    const stocks = [
      createStockLevel({ skuId: 'sku-001', quantity: 100, reservedQuantity: 10 }),
      createStockLevel({ skuId: 'sku-002', quantity: 50, reservedQuantity: 5 }),
    ];
    const repo = createMockRepository({
      getAllStockLevels: jest.fn().mockResolvedValue({
        data: stocks,
        total: 2,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
    });

    const result = await getAllStockLevels({}, repo);

    expect(result.data).toHaveLength(2);
    expect(result.data[0].availableQuantity).toBe(90);
    expect(result.data[1].availableQuantity).toBe(45);
    expect(result.total).toBe(2);
  });

  it('should pass filters to repository', async () => {
    const repo = createMockRepository();
    const filters: StockLevelFilter = {
      skuId: 'sku-001',
      binId: 'bin-A1',
      category: 'electronics',
      page: 2,
      pageSize: 10,
    };

    await getAllStockLevels(filters, repo);

    expect(repo.getAllStockLevels).toHaveBeenCalledWith(filters);
  });

  it('should return empty results when no stock found', async () => {
    const repo = createMockRepository();

    const result = await getAllStockLevels({}, repo);

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('transferStock', () => {
  it('should transfer stock between bins and create record', async () => {
    const sourceStock = createStockLevel({ quantity: 100, reservedQuantity: 0 });
    const destStock = createStockLevel({ binId: 'bin-B2', quantity: 50 });
    const repo = createMockRepository({
      getStockLevelBySkuAndBin: jest.fn()
        .mockResolvedValueOnce(sourceStock) // source
        .mockResolvedValueOnce(destStock), // destination
    });

    const result = await transferStock(
      {
        skuId: 'sku-001',
        fromBinId: 'bin-A1',
        toBinId: 'bin-B2',
        quantity: 30,
        transferredBy: 'worker-001',
        reason: 'Rebalancing',
      },
      repo,
    );

    expect(result.id).toBeDefined();
    expect(result.skuId).toBe('sku-001');
    expect(result.fromBinId).toBe('bin-A1');
    expect(result.toBinId).toBe('bin-B2');
    expect(result.quantity).toBe(30);
    expect(result.transferredBy).toBe('worker-001');
    expect(result.transferredAt).toBeInstanceOf(Date);
    expect(result.reason).toBe('Rebalancing');
    expect(result.syncStatus).toBe('pending');

    // Verify source bin was decreased
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-A1', 70);
    // Verify destination bin was increased
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-B2', 80);
  });

  it('should throw validation error when quantity is 0', async () => {
    const repo = createMockRepository();

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: 0,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'quantity',
    });
  });

  it('should throw validation error when quantity is negative', async () => {
    const repo = createMockRepository();

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: -5,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'quantity',
    });
  });

  it('should throw validation error when from and to bins are the same', async () => {
    const repo = createMockRepository();

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-A1',
          quantity: 10,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'toBinId',
    });
  });

  it('should throw error when source bin has no stock', async () => {
    const repo = createMockRepository({
      getStockLevelBySkuAndBin: jest.fn().mockResolvedValue(null),
    });

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: 10,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'source_must_have_stock',
    });
  });

  it('should throw error when source bin has insufficient stock', async () => {
    const sourceStock = createStockLevel({ quantity: 5 });
    const repo = createMockRepository({
      getStockLevelBySkuAndBin: jest.fn().mockResolvedValue(sourceStock),
    });

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: 10,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'sufficient_stock_required',
    });
  });

  it('should handle transfer to bin with no existing stock', async () => {
    const sourceStock = createStockLevel({ quantity: 50 });
    const repo = createMockRepository({
      getStockLevelBySkuAndBin: jest.fn()
        .mockResolvedValueOnce(sourceStock) // source has stock
        .mockResolvedValueOnce(null), // destination has no stock
    });

    await transferStock(
      {
        skuId: 'sku-001',
        fromBinId: 'bin-A1',
        toBinId: 'bin-B2',
        quantity: 20,
        transferredBy: 'worker-001',
      },
      repo,
    );

    // Destination should start from 0
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-B2', 20);
  });

  it('should throw validation error when skuId is empty', async () => {
    const repo = createMockRepository();

    await expect(
      transferStock(
        {
          skuId: '',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: 10,
          transferredBy: 'worker-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'skuId',
    });
  });

  it('should throw validation error when transferredBy is empty', async () => {
    const repo = createMockRepository();

    await expect(
      transferStock(
        {
          skuId: 'sku-001',
          fromBinId: 'bin-A1',
          toBinId: 'bin-B2',
          quantity: 10,
          transferredBy: '',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'transferredBy',
    });
  });
});

describe('createCycleCount', () => {
  it('should create a cycle count with items from the group', async () => {
    const items: CycleCountItem[] = [
      createCycleCountItem({ id: 'cci-001', skuId: 'sku-001', binId: 'bin-A1', systemQuantity: 100 }),
      createCycleCountItem({ id: 'cci-002', skuId: 'sku-002', binId: 'bin-A2', systemQuantity: 50 }),
    ];
    const repo = createMockRepository({
      getItemsByGroup: jest.fn().mockResolvedValue(items),
    });

    const params: CycleCountParams = {
      scheduledDate: new Date('2024-02-01'),
      groupBy: 'sku_category',
      groupValue: 'electronics',
      createdBy: 'manager-001',
    };

    const result = await createCycleCount(params, repo);

    expect(result.id).toBeDefined();
    expect(result.status).toBe('pending');
    expect(result.groupBy).toBe('sku_category');
    expect(result.items).toHaveLength(2);
    expect(result.createdBy).toBe('manager-001');
    expect(result.syncStatus).toBe('pending');
    expect(repo.getItemsByGroup).toHaveBeenCalledWith('sku_category', 'electronics');
  });

  it('should create cycle count grouped by bin_zone', async () => {
    const items: CycleCountItem[] = [
      createCycleCountItem({ id: 'cci-001', binId: 'bin-Z1' }),
    ];
    const repo = createMockRepository({
      getItemsByGroup: jest.fn().mockResolvedValue(items),
    });

    const params: CycleCountParams = {
      scheduledDate: new Date('2024-02-01'),
      groupBy: 'bin_zone',
      groupValue: 'cold-zone',
      createdBy: 'manager-001',
    };

    const result = await createCycleCount(params, repo);

    expect(result.groupBy).toBe('bin_zone');
    expect(repo.getItemsByGroup).toHaveBeenCalledWith('bin_zone', 'cold-zone');
  });

  it('should throw validation error when createdBy is empty', async () => {
    const repo = createMockRepository();

    await expect(
      createCycleCount(
        {
          scheduledDate: new Date(),
          groupBy: 'sku_category',
          groupValue: 'electronics',
          createdBy: '',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'createdBy',
    });
  });

  it('should throw validation error when groupValue is empty', async () => {
    const repo = createMockRepository();

    await expect(
      createCycleCount(
        {
          scheduledDate: new Date(),
          groupBy: 'sku_category',
          groupValue: '',
          createdBy: 'manager-001',
        },
        repo,
      ),
    ).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'groupValue',
    });
  });
});

describe('recordCountResult', () => {
  it('should update items with counted quantities and calculate discrepancies', async () => {
    const cycleCount = createCycleCountData({
      status: 'pending',
      items: [
        createCycleCountItem({ id: 'cci-001', systemQuantity: 100 }),
        createCycleCountItem({ id: 'cci-002', skuId: 'sku-002', systemQuantity: 50 }),
      ],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    const results: CountResult[] = [
      { itemId: 'cci-001', countedQuantity: 98, countedBy: 'counter-001' },
      { itemId: 'cci-002', countedQuantity: 52, countedBy: 'counter-001' },
    ];

    const result = await recordCountResult('cc-001', results, repo);

    expect(result.status).toBe('completed');
    expect(result.items[0].countedQuantity).toBe(98);
    expect(result.items[0].discrepancy).toBe(-2); // 98 - 100
    expect(result.items[0].countedBy).toBe('counter-001');
    expect(result.items[0].countedAt).toBeInstanceOf(Date);
    expect(result.items[1].countedQuantity).toBe(52);
    expect(result.items[1].discrepancy).toBe(2); // 52 - 50
  });

  it('should calculate discrepancy as 0 when counts match system', async () => {
    const cycleCount = createCycleCountData({
      status: 'pending',
      items: [createCycleCountItem({ id: 'cci-001', systemQuantity: 100 })],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    const results: CountResult[] = [
      { itemId: 'cci-001', countedQuantity: 100, countedBy: 'counter-001' },
    ];

    const result = await recordCountResult('cc-001', results, repo);

    expect(result.items[0].discrepancy).toBe(0);
  });

  it('should throw validation error when countId is empty', async () => {
    const repo = createMockRepository();

    await expect(recordCountResult('', [{ itemId: 'x', countedQuantity: 1, countedBy: 'y' }], repo))
      .rejects.toMatchObject({
        type: 'ValidationError',
        field: 'countId',
      });
  });

  it('should throw validation error when results are empty', async () => {
    const repo = createMockRepository();

    await expect(recordCountResult('cc-001', [], repo))
      .rejects.toMatchObject({
        type: 'ValidationError',
        field: 'results',
      });
  });

  it('should throw error when cycle count not found', async () => {
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(null),
    });

    await expect(
      recordCountResult('cc-unknown', [{ itemId: 'x', countedQuantity: 1, countedBy: 'y' }], repo),
    ).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'cycle_count_must_exist',
    });
  });

  it('should throw error when cycle count is already approved', async () => {
    const cycleCount = createCycleCountData({ status: 'approved' });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    await expect(
      recordCountResult('cc-001', [{ itemId: 'cci-001', countedQuantity: 98, countedBy: 'counter' }], repo),
    ).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'cycle_count_not_approved',
    });
  });

  it('should only update items that have matching results', async () => {
    const cycleCount = createCycleCountData({
      status: 'pending',
      items: [
        createCycleCountItem({ id: 'cci-001', systemQuantity: 100 }),
        createCycleCountItem({ id: 'cci-002', skuId: 'sku-002', systemQuantity: 50 }),
      ],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    // Only record result for first item
    const results: CountResult[] = [
      { itemId: 'cci-001', countedQuantity: 95, countedBy: 'counter-001' },
    ];

    const result = await recordCountResult('cc-001', results, repo);

    expect(result.items[0].countedQuantity).toBe(95);
    expect(result.items[1].countedQuantity).toBeUndefined();
  });
});

describe('approveAdjustment', () => {
  it('should set status to approved and adjust stock levels', async () => {
    const cycleCount = createCycleCountData({
      status: 'completed',
      items: [
        createCycleCountItem({
          id: 'cci-001',
          skuId: 'sku-001',
          binId: 'bin-A1',
          systemQuantity: 100,
          countedQuantity: 95,
          discrepancy: -5,
        }),
      ],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    const result = await approveAdjustment('cc-001', 'manager-001', repo);

    expect(result.status).toBe('approved');
    // Stock should be adjusted to counted quantity
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-A1', 95);
  });

  it('should not adjust stock when discrepancy is 0', async () => {
    const cycleCount = createCycleCountData({
      status: 'completed',
      items: [
        createCycleCountItem({
          id: 'cci-001',
          systemQuantity: 100,
          countedQuantity: 100,
          discrepancy: 0,
        }),
      ],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    await approveAdjustment('cc-001', 'manager-001', repo);

    expect(repo.updateStockLevel).not.toHaveBeenCalled();
  });

  it('should throw validation error when countId is empty', async () => {
    const repo = createMockRepository();

    await expect(approveAdjustment('', 'manager', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'countId',
    });
  });

  it('should throw validation error when approvedBy is empty', async () => {
    const repo = createMockRepository();

    await expect(approveAdjustment('cc-001', '', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'approvedBy',
    });
  });

  it('should throw error when cycle count not found', async () => {
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(null),
    });

    await expect(approveAdjustment('cc-unknown', 'manager', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'cycle_count_must_exist',
    });
  });

  it('should throw error when cycle count is not completed', async () => {
    const cycleCount = createCycleCountData({ status: 'pending' });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    await expect(approveAdjustment('cc-001', 'manager', repo)).rejects.toMatchObject({
      type: 'BusinessRuleError',
      rule: 'cycle_count_must_be_completed',
    });
  });

  it('should adjust multiple items with discrepancies', async () => {
    const cycleCount = createCycleCountData({
      status: 'completed',
      items: [
        createCycleCountItem({
          id: 'cci-001',
          skuId: 'sku-001',
          binId: 'bin-A1',
          systemQuantity: 100,
          countedQuantity: 95,
          discrepancy: -5,
        }),
        createCycleCountItem({
          id: 'cci-002',
          skuId: 'sku-002',
          binId: 'bin-A2',
          systemQuantity: 50,
          countedQuantity: 55,
          discrepancy: 5,
        }),
      ],
    });
    const repo = createMockRepository({
      getCycleCount: jest.fn().mockResolvedValue(cycleCount),
    });

    await approveAdjustment('cc-001', 'manager-001', repo);

    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-001', 'bin-A1', 95);
    expect(repo.updateStockLevel).toHaveBeenCalledWith('sku-002', 'bin-A2', 55);
  });
});

describe('checkStockAlerts', () => {
  it('should return min alert when available quantity is below threshold', async () => {
    const stocks = [
      createStockLevel({
        skuId: 'sku-001',
        binId: 'bin-A1',
        quantity: 15,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
    ];
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue(stocks),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('min');
    expect(alerts[0].skuId).toBe('sku-001');
    expect(alerts[0].currentQuantity).toBe(15);
    expect(alerts[0].threshold).toBe(20);
  });

  it('should return max alert when quantity exceeds threshold', async () => {
    const stocks = [
      createStockLevel({
        skuId: 'sku-001',
        binId: 'bin-A1',
        quantity: 250,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
    ];
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue(stocks),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('max');
    expect(alerts[0].skuId).toBe('sku-001');
    expect(alerts[0].currentQuantity).toBe(250);
    expect(alerts[0].threshold).toBe(200);
  });

  it('should return no alerts when stock is within thresholds', async () => {
    const stocks = [
      createStockLevel({
        quantity: 50,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
    ];
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue(stocks),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(0);
  });

  it('should return both min and max alerts for different stocks', async () => {
    const stocks = [
      createStockLevel({
        skuId: 'sku-low',
        quantity: 5,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
      createStockLevel({
        skuId: 'sku-high',
        quantity: 300,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
      createStockLevel({
        skuId: 'sku-ok',
        quantity: 100,
        reservedQuantity: 0,
        minThreshold: 20,
        maxThreshold: 200,
      }),
    ];
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue(stocks),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(2);
    expect(alerts.find((a) => a.type === 'min')).toBeDefined();
    expect(alerts.find((a) => a.type === 'max')).toBeDefined();
  });

  it('should return empty alerts for empty stock list', async () => {
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue([]),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(0);
  });

  it('should use computed availableQuantity for min threshold check', async () => {
    // quantity=50, reserved=35, available=15 (below min threshold 20)
    const stocks = [
      createStockLevel({
        skuId: 'sku-001',
        quantity: 50,
        reservedQuantity: 35,
        minThreshold: 20,
        maxThreshold: 200,
      }),
    ];
    const repo = createMockRepository({
      getAllStockLevelsUnpaginated: jest.fn().mockResolvedValue(stocks),
    });

    const alerts = await checkStockAlerts(repo);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('min');
    expect(alerts[0].currentQuantity).toBe(15); // availableQuantity
  });
});
