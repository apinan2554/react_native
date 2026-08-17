/**
 * API-backed Inbound Repository
 *
 * Implements InboundRepository using the Axios API client for online operations.
 * Delegates HTTP calls to the centralized apiClient instance.
 *
 * Requirements: 1.4
 */

import { AxiosInstance } from 'axios';
import {
  InboundRepository,
  SKUData,
  PurchaseOrder,
  LabelData,
  GRNFilter,
} from './InboundRepository';
import { GRN, GRNItem, DamageReport } from '../types';

/**
 * ApiInboundRepository
 *
 * Online-first implementation that communicates with the backend API.
 * Used when network is available; falls back to WatermelonDB otherwise.
 */
export class ApiInboundRepository implements InboundRepository {
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async findSKUByBarcode(barcode: string): Promise<SKUData | null> {
    try {
      const response = await this.client.get<SKUData>('/skus/barcode', {
        params: { barcode },
      });
      return response.data;
    } catch {
      return null;
    }
  }

  async findOpenPOsForSKU(skuId: string): Promise<PurchaseOrder[]> {
    const response = await this.client.get<PurchaseOrder[]>('/purchase-orders', {
      params: { skuId, status: 'open' },
    });
    return response.data;
  }

  async getPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
    try {
      const response = await this.client.get<PurchaseOrder>(
        `/purchase-orders/${poId}`,
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async saveGRN(grn: GRN): Promise<GRN> {
    const response = await this.client.post<GRN>('/grns', grn);
    return response.data;
  }

  async updateGRN(grn: GRN): Promise<GRN> {
    const response = await this.client.put<GRN>(`/grns/${grn.id}`, grn);
    return response.data;
  }

  async getGRN(grnId: string): Promise<GRN | null> {
    try {
      const response = await this.client.get<GRN>(`/grns/${grnId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async saveDamageReport(report: DamageReport): Promise<DamageReport> {
    const response = await this.client.post<DamageReport>(
      '/damage-reports',
      report,
    );
    return response.data;
  }

  async filterGRNs(filter: GRNFilter): Promise<GRN[]> {
    const params: Record<string, string> = {};

    if (filter.dateFrom) {
      params.dateFrom = filter.dateFrom.toISOString();
    }
    if (filter.dateTo) {
      params.dateTo = filter.dateTo.toISOString();
    }
    if (filter.supplierId) {
      params.supplierId = filter.supplierId;
    }
    if (filter.status) {
      params.status = filter.status;
    }

    const response = await this.client.get<GRN[]>('/grns', { params });
    return response.data;
  }
}
