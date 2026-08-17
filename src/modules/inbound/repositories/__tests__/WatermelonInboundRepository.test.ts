/**
 * Unit tests for WatermelonInboundRepository
 *
 * Tests CRUD operations and GRN filtering using mocked WatermelonDB.
 * We mock the Database since WatermelonDB requires native SQLite in tests.
 *
 * Requirements: 1.4
 */

import { WatermelonInboundRepository } from '../WatermelonInboundRepository';
import { GRN, GRNStatus } from '../../types';
import { GRNFilter } from '../InboundRepository';

// --- Mock Helpers ---

function createMockGRNRecord(overrides: Partial<any> = {}) {
  return {
    id: 'grn-1',
    grnNumber: 'GRN-001',
    poId: 'po-1',
    supplierId: 'supplier-1',
    status: 'confirmed' as GRNStatus,
    receivedBy: 'user-1',
    receivedAt: new Date('2024-01-15T10:00:00Z'),
    notes: undefined,
    dataSyncStatus: 'pending',
    items: {
      fetch: jest.fn().mockResolvedValue([]),
    },
    update: jest.fn().mockImplementation(async (updater: Function) => {
      updater(createMockGRNRecord(overrides));
    }),
    ...overrides,
  };
}

function createMockGRNItemRecord(overrides: Partial<any> = {}) {
  return {
    id: 'item-1',
    grnId: 'grn-1',
    skuId: 'sku-1',
    expectedQuantity: 10,
    receivedQuantity: 8,
    damagedQuantity: 1,
    barcode: '123456',
    dataSyncStatus: 'pending',
    ...overrides,
  };
}

function createMockDatabase() {
  const collections: Record<string, any> = {};

  const mockDb = {
    get: jest.fn((tableName: string) => {
      if (!collections[tableName]) {
        collections[tableName] = {
          query: jest.fn().mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
          }),
          find: jest.fn(),
          create: jest.fn(),
        };
      }
      return collections[tableName];
    }),
    write: jest.fn(async (callback: Function) => {
      return callback();
    }),
    _collections: collections,
  };

  return mockDb as any;
}

// --- Tests ---

describe('WatermelonInboundRepository', () => {
  let repository: WatermelonInboundRepository;
  let mockDatabase: any;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    repository = new WatermelonInboundRepository(mockDatabase);
  });

  describe('findSKUByBarcode', () => {
    it('should return SKU data when barcode matches', async () => {
      const mockSku = {
        id: 'sku-1',
        code: 'SKU001',
        name: 'Test Item',
        barcode: 'BC123',
        category: 'electronics',
      };

      mockDatabase.get.mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockSku]),
        }),
      });

      const result = await repository.findSKUByBarcode('BC123');

      expect(result).toEqual({
        id: 'sku-1',
        code: 'SKU001',
        name: 'Test Item',
        barcode: 'BC123',
        category: 'electronics',
      });
    });

    it('should return null when barcode does not match', async () => {
      mockDatabase.get.mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await repository.findSKUByBarcode('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('findOpenPOsForSKU', () => {
    it('should return empty array (POs not stored locally)', async () => {
      const result = await repository.findOpenPOsForSKU('sku-1');
      expect(result).toEqual([]);
    });
  });

  describe('getPurchaseOrder', () => {
    it('should return null (POs not stored locally)', async () => {
      const result = await repository.getPurchaseOrder('po-1');
      expect(result).toBeNull();
    });
  });

  describe('saveGRN', () => {
    it('should create GRN and items in database', async () => {
      const mockCreatedGRN = { id: 'new-grn-id' };
      const grnsCollection = {
        create: jest.fn().mockImplementation(async (builder: Function) => {
          const record: any = {};
          builder(record);
          return { ...record, ...mockCreatedGRN };
        }),
      };
      const grnItemsCollection = {
        create: jest.fn().mockImplementation(async (builder: Function) => {
          const record: any = {};
          builder(record);
          return record;
        }),
      };

      mockDatabase.get.mockImplementation((table: string) => {
        if (table === 'grns') return grnsCollection;
        if (table === 'grn_items') return grnItemsCollection;
        return { query: jest.fn().mockReturnValue({ fetch: jest.fn().mockResolvedValue([]) }) };
      });

      const grn: GRN = {
        id: 'GRN-001',
        poId: 'po-1',
        receivedAt: new Date('2024-01-15T10:00:00Z'),
        receivedBy: 'user-1',
        items: [
          {
            id: 'item-1',
            grnId: 'GRN-001',
            skuId: 'sku-1',
            expectedQuantity: 10,
            receivedQuantity: 10,
            isDamaged: false,
          },
          {
            id: 'item-2',
            grnId: 'GRN-001',
            skuId: 'sku-2',
            expectedQuantity: 5,
            receivedQuantity: 3,
            isDamaged: true,
            damageReport: {
              id: 'dmg-1',
              grnItemId: 'item-2',
              photos: ['photo1.jpg'],
              reason: 'Crushed box',
              quantity: 2,
              reportedAt: new Date(),
            },
          },
        ],
        status: 'confirmed',
        totalQuantityExpected: 15,
        totalQuantityReceived: 13,
        syncStatus: 'pending',
      };

      const result = await repository.saveGRN(grn);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(grnsCollection.create).toHaveBeenCalledTimes(1);
      expect(grnItemsCollection.create).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('new-grn-id');
    });
  });

  describe('updateGRN', () => {
    it('should update existing GRN record', async () => {
      const mockRecord = createMockGRNRecord();
      const grnsCollection = {
        find: jest.fn().mockResolvedValue(mockRecord),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const grn: GRN = {
        id: 'grn-1',
        poId: 'po-1',
        receivedAt: new Date('2024-01-15T10:00:00Z'),
        receivedBy: 'user-1',
        items: [],
        status: 'discrepancy',
        totalQuantityExpected: 10,
        totalQuantityReceived: 8,
        discrepancyNotes: 'Missing 2 items',
        syncStatus: 'pending',
      };

      const result = await repository.updateGRN(grn);

      expect(grnsCollection.find).toHaveBeenCalledWith('grn-1');
      expect(mockRecord.update).toHaveBeenCalled();
      expect(result).toEqual(grn);
    });
  });

  describe('getGRN', () => {
    it('should return GRN with items when found', async () => {
      const mockItems = [
        createMockGRNItemRecord({ id: 'item-1', expectedQuantity: 10, receivedQuantity: 8, damagedQuantity: 1 }),
        createMockGRNItemRecord({ id: 'item-2', skuId: 'sku-2', expectedQuantity: 5, receivedQuantity: 5, damagedQuantity: 0 }),
      ];

      const mockGRN = createMockGRNRecord({
        items: { fetch: jest.fn().mockResolvedValue(mockItems) },
      });

      const grnsCollection = {
        find: jest.fn().mockResolvedValue(mockGRN),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const result = await repository.getGRN('grn-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('grn-1');
      expect(result!.items).toHaveLength(2);
      expect(result!.items[0].isDamaged).toBe(true);
      expect(result!.items[1].isDamaged).toBe(false);
      expect(result!.totalQuantityExpected).toBe(15);
      expect(result!.totalQuantityReceived).toBe(13);
    });

    it('should return null when GRN not found', async () => {
      const grnsCollection = {
        find: jest.fn().mockRejectedValue(new Error('Not found')),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const result = await repository.getGRN('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('saveDamageReport', () => {
    it('should return the report as-is (stored via API)', async () => {
      const report = {
        id: 'dmg-1',
        grnItemId: 'item-1',
        photos: ['photo1.jpg'],
        reason: 'Crushed',
        quantity: 2,
        reportedAt: new Date(),
      };

      const result = await repository.saveDamageReport(report);
      expect(result).toEqual(report);
    });
  });

  describe('filterGRNs', () => {
    it('should filter by date range', async () => {
      const mockGRN1 = createMockGRNRecord({
        id: 'grn-1',
        receivedAt: new Date('2024-01-15T10:00:00Z'),
      });
      const mockGRN2 = createMockGRNRecord({
        id: 'grn-2',
        receivedAt: new Date('2024-01-20T10:00:00Z'),
      });

      const grnsCollection = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockGRN1, mockGRN2]),
        }),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const filter: GRNFilter = {
        dateFrom: new Date('2024-01-10'),
        dateTo: new Date('2024-01-25'),
      };

      const result = await repository.filterGRNs(filter);

      expect(grnsCollection.query).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('grn-1');
      expect(result[1].id).toBe('grn-2');
    });

    it('should filter by supplier', async () => {
      const mockGRN = createMockGRNRecord({
        id: 'grn-1',
        supplierId: 'supplier-abc',
      });

      const grnsCollection = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockGRN]),
        }),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const filter: GRNFilter = {
        supplierId: 'supplier-abc',
      };

      const result = await repository.filterGRNs(filter);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('grn-1');
    });

    it('should filter by status', async () => {
      const mockGRN = createMockGRNRecord({
        id: 'grn-1',
        status: 'discrepancy',
      });

      const grnsCollection = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockGRN]),
        }),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const filter: GRNFilter = {
        status: 'discrepancy',
      };

      const result = await repository.filterGRNs(filter);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('discrepancy');
    });

    it('should return empty array when no GRNs match', async () => {
      const grnsCollection = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const filter: GRNFilter = {
        status: 'confirmed',
        supplierId: 'non-existent',
      };

      const result = await repository.filterGRNs(filter);

      expect(result).toEqual([]);
    });

    it('should combine multiple filters', async () => {
      const mockGRN = createMockGRNRecord({
        id: 'grn-1',
        supplierId: 'supplier-1',
        status: 'confirmed',
        receivedAt: new Date('2024-01-15T10:00:00Z'),
      });

      const grnsCollection = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([mockGRN]),
        }),
      };

      mockDatabase.get.mockReturnValue(grnsCollection);

      const filter: GRNFilter = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        supplierId: 'supplier-1',
        status: 'confirmed',
      };

      const result = await repository.filterGRNs(filter);

      expect(result).toHaveLength(1);
      // Verify query was called (conditions are applied)
      expect(grnsCollection.query).toHaveBeenCalled();
    });
  });
});
