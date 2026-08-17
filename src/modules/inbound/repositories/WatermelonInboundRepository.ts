/**
 * WatermelonDB-backed Inbound Repository
 *
 * Implements InboundRepository using WatermelonDB for offline-first support.
 * Handles CRUD operations for GRN, GRN Items, and filtering.
 *
 * Requirements: 1.4
 */

import { Database, Q } from '@nozbe/watermelondb';
import {
  InboundRepository,
  SKUData,
  PurchaseOrder,
  LabelData,
  GRNFilter,
} from './InboundRepository';
import { GRN, GRNItem, DamageReport } from '../types';
import { GRNModel } from '../models/GRNModel';
import { GRNItemModel } from '../models/GRNItemModel';

/**
 * WatermelonInboundRepository
 *
 * Concrete implementation of InboundRepository using WatermelonDB.
 * Supports offline-first operations with sync status tracking.
 */
export class WatermelonInboundRepository implements InboundRepository {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async findSKUByBarcode(barcode: string): Promise<SKUData | null> {
    const skusCollection = this.database.get<any>('skus');
    const results = await skusCollection
      .query(Q.where('barcode', barcode))
      .fetch();

    if (results.length === 0) return null;

    const sku = results[0];
    return {
      id: sku.id,
      code: sku.code,
      name: sku.name,
      barcode: sku.barcode,
      category: sku.category,
    };
  }

  async findOpenPOsForSKU(_skuId: string): Promise<PurchaseOrder[]> {
    // POs are fetched from the API in practice.
    // This local implementation returns empty since POs are not stored locally.
    return [];
  }

  async getPurchaseOrder(_poId: string): Promise<PurchaseOrder | null> {
    // POs are managed server-side; not stored locally in WatermelonDB.
    return null;
  }

  async saveGRN(grn: GRN): Promise<GRN> {
    const grnsCollection = this.database.get<GRNModel>('grns');
    const grnItemsCollection = this.database.get<GRNItemModel>('grn_items');

    let createdGRNId = '';

    await this.database.write(async () => {
      const createdGRN = await grnsCollection.create((record) => {
        record.grnNumber = grn.id;
        record.poId = grn.poId;
        record.supplierId = '';
        record.status = grn.status;
        record.receivedBy = grn.receivedBy;
        record.receivedAt = grn.receivedAt;
        record.notes = grn.discrepancyNotes;
        record.dataSyncStatus = grn.syncStatus;
      });
      createdGRNId = createdGRN.id;

      for (const item of grn.items) {
        await grnItemsCollection.create((record) => {
          record.grnId = createdGRN.id;
          record.skuId = item.skuId;
          record.expectedQuantity = item.expectedQuantity;
          record.receivedQuantity = item.receivedQuantity;
          record.damagedQuantity = item.isDamaged
            ? item.damageReport?.quantity ?? 0
            : 0;
          record.barcode = undefined;
          record.dataSyncStatus = grn.syncStatus;
        });
      }
    });

    return { ...grn, id: createdGRNId };
  }

  async updateGRN(grn: GRN): Promise<GRN> {
    const grnsCollection = this.database.get<GRNModel>('grns');

    await this.database.write(async () => {
      const record = await grnsCollection.find(grn.id);
      await record.update((r) => {
        r.status = grn.status;
        r.receivedBy = grn.receivedBy;
        r.receivedAt = grn.receivedAt;
        r.notes = grn.discrepancyNotes;
        r.dataSyncStatus = grn.syncStatus;
      });
    });

    return grn;
  }

  async getGRN(grnId: string): Promise<GRN | null> {
    const grnsCollection = this.database.get<GRNModel>('grns');

    try {
      const grnRecord = await grnsCollection.find(grnId);
      const itemRecords: GRNItemModel[] = await grnRecord.items.fetch();

      const items: GRNItem[] = itemRecords.map((item) => ({
        id: item.id,
        grnId: item.grnId,
        skuId: item.skuId,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: item.receivedQuantity,
        isDamaged: item.damagedQuantity > 0,
      }));

      const totalExpected = items.reduce(
        (sum, i) => sum + i.expectedQuantity,
        0,
      );
      const totalReceived = items.reduce(
        (sum, i) => sum + i.receivedQuantity,
        0,
      );

      return {
        id: grnRecord.id,
        poId: grnRecord.poId,
        receivedAt: grnRecord.receivedAt,
        receivedBy: grnRecord.receivedBy,
        items,
        status: grnRecord.status,
        totalQuantityExpected: totalExpected,
        totalQuantityReceived: totalReceived,
        discrepancyNotes: grnRecord.notes,
        syncStatus: grnRecord.dataSyncStatus as GRN['syncStatus'],
      };
    } catch {
      return null;
    }
  }

  async saveDamageReport(report: DamageReport): Promise<DamageReport> {
    // Damage reports are stored as part of GRN items (damaged_quantity field).
    // The full report with photos is persisted through the API service.
    return report;
  }

  async filterGRNs(filter: GRNFilter): Promise<GRN[]> {
    const grnsCollection = this.database.get<GRNModel>('grns');
    const conditions: Q.Clause[] = [];

    if (filter.dateFrom) {
      conditions.push(
        Q.where('received_at', Q.gte(filter.dateFrom.getTime())),
      );
    }

    if (filter.dateTo) {
      conditions.push(Q.where('received_at', Q.lte(filter.dateTo.getTime())));
    }

    if (filter.supplierId) {
      conditions.push(Q.where('supplier_id', filter.supplierId));
    }

    if (filter.status) {
      conditions.push(Q.where('status', filter.status));
    }

    const grnRecords = await grnsCollection.query(...conditions).fetch();

    const results: GRN[] = [];
    for (const grnRecord of grnRecords) {
      const itemRecords: GRNItemModel[] = await grnRecord.items.fetch();

      const items: GRNItem[] = itemRecords.map((item) => ({
        id: item.id,
        grnId: item.grnId,
        skuId: item.skuId,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: item.receivedQuantity,
        isDamaged: item.damagedQuantity > 0,
      }));

      const totalExpected = items.reduce(
        (sum, i) => sum + i.expectedQuantity,
        0,
      );
      const totalReceived = items.reduce(
        (sum, i) => sum + i.receivedQuantity,
        0,
      );

      results.push({
        id: grnRecord.id,
        poId: grnRecord.poId,
        receivedAt: grnRecord.receivedAt,
        receivedBy: grnRecord.receivedBy,
        items,
        status: grnRecord.status,
        totalQuantityExpected: totalExpected,
        totalQuantityReceived: totalReceived,
        discrepancyNotes: grnRecord.notes,
        syncStatus: grnRecord.dataSyncStatus as GRN['syncStatus'],
      });
    }

    return results;
  }
}
