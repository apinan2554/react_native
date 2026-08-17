import {
  scanBarcode,
  compareWithPO,
  confirmReceiving,
  recordDamage,
  generateLabel,
  encodeLabelData,
  decodeLabelData,
} from '../inboundUseCases';
import { GRN, GRNItem } from '../../types';
import {
  InboundRepository,
  PurchaseOrder,
  SKUData,
} from '../../repositories/InboundRepository';

// === Test Helpers ===

function createMockRepository(
  overrides?: Partial<InboundRepository>,
): InboundRepository {
  return {
    findSKUByBarcode: jest.fn().mockResolvedValue(null),
    findOpenPOsForSKU: jest.fn().mockResolvedValue([]),
    getPurchaseOrder: jest.fn().mockResolvedValue(null),
    saveGRN: jest.fn().mockImplementation((grn) => Promise.resolve(grn)),
    updateGRN: jest.fn().mockImplementation((grn) => Promise.resolve(grn)),
    getGRN: jest.fn().mockResolvedValue(null),
    saveDamageReport: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    filterGRNs: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createSKU(overrides?: Partial<SKUData>): SKUData {
  return {
    id: 'sku-001',
    code: 'SKU001',
    name: 'Test Product',
    barcode: '1234567890',
    category: 'electronics',
    ...overrides,
  };
}

function createPO(overrides?: Partial<PurchaseOrder>): PurchaseOrder {
  return {
    id: 'po-001',
    supplierId: 'supplier-001',
    status: 'open',
    items: [
      { skuId: 'sku-001', expectedQuantity: 100 },
      { skuId: 'sku-002', expectedQuantity: 50 },
    ],
    ...overrides,
  };
}

function createGRNItem(overrides?: Partial<GRNItem>): GRNItem {
  return {
    id: 'item-001',
    grnId: 'grn-001',
    skuId: 'sku-001',
    expectedQuantity: 100,
    receivedQuantity: 100,
    isDamaged: false,
    ...overrides,
  };
}

function createGRN(overrides?: Partial<GRN>): GRN {
  return {
    id: 'grn-001',
    poId: 'po-001',
    receivedAt: new Date('2024-01-15T10:00:00Z'),
    receivedBy: 'user-001',
    items: [createGRNItem()],
    status: 'draft',
    totalQuantityExpected: 100,
    totalQuantityReceived: 100,
    syncStatus: 'pending',
    ...overrides,
  };
}

// === Tests ===

describe('scanBarcode', () => {
  it('should return SKU data with matched PO when barcode exists and has open PO', async () => {
    const sku = createSKU();
    const po = createPO();
    const repo = createMockRepository({
      findSKUByBarcode: jest.fn().mockResolvedValue(sku),
      findOpenPOsForSKU: jest.fn().mockResolvedValue([po]),
    });

    const result = await scanBarcode('1234567890', repo);

    expect(result.skuId).toBe('sku-001');
    expect(result.name).toBe('Test Product');
    expect(result.barcode).toBe('1234567890');
    expect(result.matchedPO).toBe(true);
    expect(result.poId).toBe('po-001');
    expect(result.expectedQuantity).toBe(100);
    expect(result.category).toBe('electronics');
  });

  it('should return unmatched result when SKU exists but no open PO', async () => {
    const sku = createSKU();
    const repo = createMockRepository({
      findSKUByBarcode: jest.fn().mockResolvedValue(sku),
      findOpenPOsForSKU: jest.fn().mockResolvedValue([]),
    });

    const result = await scanBarcode('1234567890', repo);

    expect(result.skuId).toBe('sku-001');
    expect(result.matchedPO).toBe(false);
    expect(result.poId).toBeUndefined();
  });

  it('should return empty result when barcode not found', async () => {
    const repo = createMockRepository();

    const result = await scanBarcode('unknown-barcode', repo);

    expect(result.skuId).toBe('');
    expect(result.name).toBe('');
    expect(result.matchedPO).toBe(false);
  });

  it('should throw validation error for empty barcode', async () => {
    const repo = createMockRepository();

    await expect(scanBarcode('', repo)).rejects.toMatchObject({
      type: 'ValidationError',
      field: 'barcode',
    });
  });

  it('should trim whitespace from barcode', async () => {
    const sku = createSKU();
    const repo = createMockRepository({
      findSKUByBarcode: jest.fn().mockResolvedValue(sku),
      findOpenPOsForSKU: jest.fn().mockResolvedValue([]),
    });

    await scanBarcode('  1234567890  ', repo);

    expect(repo.findSKUByBarcode).toHaveBeenCalledWith('1234567890');
  });
});

describe('compareWithPO', () => {
  it('should return isMatch=true when all quantities match', () => {
    const items: GRNItem[] = [
      createGRNItem({ skuId: 'sku-001', expectedQuantity: 100, receivedQuantity: 100 }),
      createGRNItem({ skuId: 'sku-002', expectedQuantity: 50, receivedQuantity: 50 }),
    ];
    const po = createPO();

    const result = compareWithPO(items, po);

    expect(result.isMatch).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
    expect(result.totalExpected).toBe(150);
    expect(result.totalReceived).toBe(150);
  });

  it('should detect over-receiving discrepancy', () => {
    const items: GRNItem[] = [
      createGRNItem({ skuId: 'sku-001', expectedQuantity: 100, receivedQuantity: 120 }),
    ];
    const po = createPO({ items: [{ skuId: 'sku-001', expectedQuantity: 100 }] });

    const result = compareWithPO(items, po);

    expect(result.isMatch).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].difference).toBe(20); // 120 - 100
  });

  it('should detect under-receiving discrepancy', () => {
    const items: GRNItem[] = [
      createGRNItem({ skuId: 'sku-001', expectedQuantity: 100, receivedQuantity: 80 }),
    ];
    const po = createPO({ items: [{ skuId: 'sku-001', expectedQuantity: 100 }] });

    const result = compareWithPO(items, po);

    expect(result.isMatch).toBe(false);
    expect(result.discrepancies[0].difference).toBe(-20); // 80 - 100
  });

  it('should detect items in PO but not received', () => {
    const items: GRNItem[] = [
      createGRNItem({ skuId: 'sku-001', receivedQuantity: 100 }),
    ];
    const po = createPO({
      items: [
        { skuId: 'sku-001', expectedQuantity: 100 },
        { skuId: 'sku-002', expectedQuantity: 50 },
      ],
    });

    const result = compareWithPO(items, po);

    expect(result.isMatch).toBe(false);
    const missingDisc = result.discrepancies.find((d) => d.skuId === 'sku-002');
    expect(missingDisc).toBeDefined();
    expect(missingDisc!.receivedQuantity).toBe(0);
    expect(missingDisc!.difference).toBe(-50);
  });

  it('should return correct poId', () => {
    const items: GRNItem[] = [createGRNItem()];
    const po = createPO({ id: 'po-xyz' });

    const result = compareWithPO(items, po);

    expect(result.poId).toBe('po-xyz');
  });
});

describe('confirmReceiving', () => {
  it('should set status to confirmed and calculate totals', () => {
    const grn = createGRN({
      status: 'draft',
      items: [
        createGRNItem({ expectedQuantity: 100, receivedQuantity: 95 }),
        createGRNItem({ id: 'item-002', skuId: 'sku-002', expectedQuantity: 50, receivedQuantity: 50 }),
      ],
    });

    const result = confirmReceiving(grn);

    expect(result.status).toBe('confirmed');
    expect(result.totalQuantityExpected).toBe(150);
    expect(result.totalQuantityReceived).toBe(145);
    expect(result.receivedAt).toBeInstanceOf(Date);
    expect(result.syncStatus).toBe('pending');
  });

  it('should throw error when GRN has no items', () => {
    const grn = createGRN({ items: [] });

    expect(() => confirmReceiving(grn)).toThrow();
  });

  it('should throw error when GRN has no poId', () => {
    const grn = createGRN({ poId: '' });

    expect(() => confirmReceiving(grn)).toThrow();
  });

  it('should throw error when GRN has no receivedBy', () => {
    const grn = createGRN({ receivedBy: '' });

    expect(() => confirmReceiving(grn)).toThrow();
  });

  it('should preserve other GRN fields', () => {
    const grn = createGRN({
      id: 'grn-test',
      poId: 'po-test',
      receivedBy: 'worker-123',
      discrepancyNotes: 'some notes',
    });

    const result = confirmReceiving(grn);

    expect(result.id).toBe('grn-test');
    expect(result.poId).toBe('po-test');
    expect(result.receivedBy).toBe('worker-123');
    expect(result.discrepancyNotes).toBe('some notes');
  });
});

describe('recordDamage', () => {
  it('should create a valid damage report', () => {
    const result = recordDamage(
      'item-001',
      ['photo1.jpg', 'photo2.jpg'],
      'Box was crushed during shipping',
      5,
    );

    expect(result.grnItemId).toBe('item-001');
    expect(result.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result.reason).toBe('Box was crushed during shipping');
    expect(result.quantity).toBe(5);
    expect(result.reportedAt).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should throw error when no photos provided', () => {
    expect(() => recordDamage('item-001', [], 'reason', 1)).toThrow();
  });

  it('should throw error when reason is empty', () => {
    expect(() => recordDamage('item-001', ['photo.jpg'], '', 1)).toThrow();
  });

  it('should throw error when reason is whitespace only', () => {
    expect(() => recordDamage('item-001', ['photo.jpg'], '   ', 1)).toThrow();
  });

  it('should throw error when quantity is 0', () => {
    expect(() => recordDamage('item-001', ['photo.jpg'], 'reason', 0)).toThrow();
  });

  it('should throw error when quantity is negative', () => {
    expect(() => recordDamage('item-001', ['photo.jpg'], 'reason', -1)).toThrow();
  });

  it('should throw error when grnItemId is empty', () => {
    expect(() => recordDamage('', ['photo.jpg'], 'reason', 1)).toThrow();
  });

  it('should trim reason', () => {
    const result = recordDamage('item-001', ['photo.jpg'], '  damaged  ', 1);
    expect(result.reason).toBe('damaged');
  });
});

describe('generateLabel', () => {
  it('should generate labels for each item in a confirmed GRN', () => {
    const grn = createGRN({
      status: 'confirmed',
      items: [
        createGRNItem({ skuId: 'sku-001', receivedQuantity: 100 }),
        createGRNItem({ id: 'item-002', skuId: 'sku-002', receivedQuantity: 50 }),
      ],
    });

    const labels = generateLabel(grn);

    expect(labels).toHaveLength(2);
    expect(labels[0].grnId).toBe('grn-001');
    expect(labels[0].skuId).toBe('sku-001');
    expect(labels[0].quantity).toBe(100);
    expect(labels[0].generatedAt).toBeInstanceOf(Date);
    expect(labels[1].skuId).toBe('sku-002');
    expect(labels[1].quantity).toBe(50);
  });

  it('should throw error for non-confirmed GRN', () => {
    const grn = createGRN({ status: 'draft' });

    expect(() => generateLabel(grn)).toThrow();
  });

  it('should throw error for discrepancy status GRN', () => {
    const grn = createGRN({ status: 'discrepancy' });

    expect(() => generateLabel(grn)).toThrow();
  });

  it('should generate decodeable barcode data', () => {
    const grn = createGRN({
      id: 'grn-test',
      status: 'confirmed',
      items: [createGRNItem({ skuId: 'sku-abc', receivedQuantity: 42 })],
    });

    const labels = generateLabel(grn);
    const decoded = decodeLabelData(labels[0].barcodeData);

    expect(decoded).not.toBeNull();
    expect(decoded!.grnId).toBe('grn-test');
    expect(decoded!.skuId).toBe('sku-abc');
    expect(decoded!.quantity).toBe(42);
  });
});

describe('encodeLabelData / decodeLabelData', () => {
  it('should encode and decode round-trip correctly', () => {
    const encoded = encodeLabelData('grn-123', 'sku-456', 99);
    const decoded = decodeLabelData(encoded);

    expect(decoded).toEqual({
      grnId: 'grn-123',
      skuId: 'sku-456',
      quantity: 99,
    });
  });

  it('should return null for invalid format', () => {
    expect(decodeLabelData('invalid-data')).toBeNull();
    expect(decodeLabelData('')).toBeNull();
    expect(decodeLabelData('GRN:a|SKU:b')).toBeNull(); // missing QTY part
  });

  it('should return null for wrong prefixes', () => {
    expect(decodeLabelData('XXX:a|YYY:b|ZZZ:1')).toBeNull();
  });

  it('should return null for non-numeric quantity', () => {
    expect(decodeLabelData('GRN:a|SKU:b|QTY:abc')).toBeNull();
  });
});
