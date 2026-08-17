/**
 * Unit tests for ApiInboundRepository
 *
 * Tests API-backed repository operations using a mocked Axios client.
 *
 * Requirements: 1.4
 */

import { ApiInboundRepository } from '../ApiInboundRepository';
import { GRN, GRNStatus } from '../../types';
import { GRNFilter } from '../InboundRepository';

function createMockAxiosClient() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  } as any;
}

describe('ApiInboundRepository', () => {
  let repository: ApiInboundRepository;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockAxiosClient();
    repository = new ApiInboundRepository(mockClient);
  });

  describe('findSKUByBarcode', () => {
    it('should return SKU data from API', async () => {
      const skuData = {
        id: 'sku-1',
        code: 'SKU001',
        name: 'Test Item',
        barcode: 'BC123',
        category: 'electronics',
      };
      mockClient.get.mockResolvedValue({ data: skuData });

      const result = await repository.findSKUByBarcode('BC123');

      expect(mockClient.get).toHaveBeenCalledWith('/skus/barcode', {
        params: { barcode: 'BC123' },
      });
      expect(result).toEqual(skuData);
    });

    it('should return null when API returns error', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'));

      const result = await repository.findSKUByBarcode('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('findOpenPOsForSKU', () => {
    it('should fetch open POs for SKU from API', async () => {
      const pos = [
        { id: 'po-1', supplierId: 'sup-1', status: 'open', items: [] },
      ];
      mockClient.get.mockResolvedValue({ data: pos });

      const result = await repository.findOpenPOsForSKU('sku-1');

      expect(mockClient.get).toHaveBeenCalledWith('/purchase-orders', {
        params: { skuId: 'sku-1', status: 'open' },
      });
      expect(result).toEqual(pos);
    });
  });

  describe('getPurchaseOrder', () => {
    it('should return PO from API', async () => {
      const po = { id: 'po-1', supplierId: 'sup-1', status: 'open', items: [] };
      mockClient.get.mockResolvedValue({ data: po });

      const result = await repository.getPurchaseOrder('po-1');

      expect(mockClient.get).toHaveBeenCalledWith('/purchase-orders/po-1');
      expect(result).toEqual(po);
    });

    it('should return null when PO not found', async () => {
      mockClient.get.mockRejectedValue(new Error('404'));

      const result = await repository.getPurchaseOrder('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('saveGRN', () => {
    it('should POST GRN to API', async () => {
      const grn: GRN = {
        id: 'grn-1',
        poId: 'po-1',
        receivedAt: new Date('2024-01-15'),
        receivedBy: 'user-1',
        items: [],
        status: 'confirmed',
        totalQuantityExpected: 10,
        totalQuantityReceived: 10,
        syncStatus: 'pending',
      };
      const savedGrn = { ...grn, id: 'server-grn-1' };
      mockClient.post.mockResolvedValue({ data: savedGrn });

      const result = await repository.saveGRN(grn);

      expect(mockClient.post).toHaveBeenCalledWith('/grns', grn);
      expect(result.id).toBe('server-grn-1');
    });
  });

  describe('updateGRN', () => {
    it('should PUT GRN to API', async () => {
      const grn: GRN = {
        id: 'grn-1',
        poId: 'po-1',
        receivedAt: new Date('2024-01-15'),
        receivedBy: 'user-1',
        items: [],
        status: 'discrepancy',
        totalQuantityExpected: 10,
        totalQuantityReceived: 8,
        discrepancyNotes: 'Missing items',
        syncStatus: 'pending',
      };
      mockClient.put.mockResolvedValue({ data: grn });

      const result = await repository.updateGRN(grn);

      expect(mockClient.put).toHaveBeenCalledWith('/grns/grn-1', grn);
      expect(result).toEqual(grn);
    });
  });

  describe('getGRN', () => {
    it('should GET GRN from API', async () => {
      const grn: GRN = {
        id: 'grn-1',
        poId: 'po-1',
        receivedAt: new Date('2024-01-15'),
        receivedBy: 'user-1',
        items: [],
        status: 'confirmed',
        totalQuantityExpected: 10,
        totalQuantityReceived: 10,
        syncStatus: 'synced',
      };
      mockClient.get.mockResolvedValue({ data: grn });

      const result = await repository.getGRN('grn-1');

      expect(mockClient.get).toHaveBeenCalledWith('/grns/grn-1');
      expect(result).toEqual(grn);
    });

    it('should return null when GRN not found', async () => {
      mockClient.get.mockRejectedValue(new Error('404'));

      const result = await repository.getGRN('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('saveDamageReport', () => {
    it('should POST damage report to API', async () => {
      const report = {
        id: 'dmg-1',
        grnItemId: 'item-1',
        photos: ['photo1.jpg'],
        reason: 'Crushed box',
        quantity: 2,
        reportedAt: new Date(),
      };
      mockClient.post.mockResolvedValue({ data: report });

      const result = await repository.saveDamageReport(report);

      expect(mockClient.post).toHaveBeenCalledWith('/damage-reports', report);
      expect(result).toEqual(report);
    });
  });

  describe('filterGRNs', () => {
    it('should GET GRNs with filter params', async () => {
      const grns: GRN[] = [
        {
          id: 'grn-1',
          poId: 'po-1',
          receivedAt: new Date('2024-01-15'),
          receivedBy: 'user-1',
          items: [],
          status: 'confirmed',
          totalQuantityExpected: 10,
          totalQuantityReceived: 10,
          syncStatus: 'synced',
        },
      ];
      mockClient.get.mockResolvedValue({ data: grns });

      const filter: GRNFilter = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        supplierId: 'supplier-1',
        status: 'confirmed',
      };

      const result = await repository.filterGRNs(filter);

      expect(mockClient.get).toHaveBeenCalledWith('/grns', {
        params: {
          dateFrom: filter.dateFrom!.toISOString(),
          dateTo: filter.dateTo!.toISOString(),
          supplierId: 'supplier-1',
          status: 'confirmed',
        },
      });
      expect(result).toEqual(grns);
    });

    it('should only include defined filter params', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const filter: GRNFilter = {
        status: 'draft',
      };

      await repository.filterGRNs(filter);

      expect(mockClient.get).toHaveBeenCalledWith('/grns', {
        params: { status: 'draft' },
      });
    });

    it('should return empty array when no results', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const result = await repository.filterGRNs({});

      expect(result).toEqual([]);
    });
  });
});
