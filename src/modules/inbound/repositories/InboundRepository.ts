/**
 * Inbound Repository Interface
 *
 * Defines the data access contract for the Inbound module.
 * Implementations can use WatermelonDB (offline) or API (online).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { GRN, GRNItem, DamageReport, GRNStatus } from '../types';

/** SKU data from master data */
export interface SKUData {
  id: string;
  code: string;
  name: string;
  barcode: string;
  category?: string;
}

/** Purchase Order line item */
export interface POLineItem {
  skuId: string;
  expectedQuantity: number;
}

/** Purchase Order */
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: 'open' | 'partial' | 'closed';
  items: POLineItem[];
}

/** Label data generated for printing */
export interface LabelData {
  grnId: string;
  skuId: string;
  skuName: string;
  quantity: number;
  barcodeData: string;
  generatedAt: Date;
}

/** GRN filter criteria */
export interface GRNFilter {
  dateFrom?: Date;
  dateTo?: Date;
  supplierId?: string;
  status?: GRNStatus;
}

/**
 * InboundRepository - Data access interface for Inbound module
 *
 * This interface abstracts the data layer so use cases remain
 * independent of the storage mechanism (WatermelonDB, API, etc.)
 */
export interface InboundRepository {
  /** Find SKU by barcode string */
  findSKUByBarcode(barcode: string): Promise<SKUData | null>;

  /** Find open POs that contain a specific SKU */
  findOpenPOsForSKU(skuId: string): Promise<PurchaseOrder[]>;

  /** Get a specific PO by ID */
  getPurchaseOrder(poId: string): Promise<PurchaseOrder | null>;

  /** Save a new GRN */
  saveGRN(grn: GRN): Promise<GRN>;

  /** Update an existing GRN */
  updateGRN(grn: GRN): Promise<GRN>;

  /** Get GRN by ID */
  getGRN(grnId: string): Promise<GRN | null>;

  /** Save a damage report */
  saveDamageReport(report: DamageReport): Promise<DamageReport>;

  /** Filter GRNs by criteria */
  filterGRNs(filter: GRNFilter): Promise<GRN[]>;
}
