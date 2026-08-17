/**
 * WatermelonDB Model for GRN (Goods Receipt Note)
 *
 * Maps to the 'grns' table in the database schema.
 * Supports offline-first operations with sync status tracking.
 *
 * Requirements: 1.1, 1.2
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { GRNStatus } from '../types';

export class GRNModel extends Model {
  static table = 'grns';

  static associations = {
    grn_items: { type: 'has_many' as const, foreignKey: 'grn_id' },
  };

  @field('grn_number') grnNumber!: string;
  @field('po_id') poId!: string;
  @field('supplier_id') supplierId!: string;
  @field('status') status!: GRNStatus;
  @field('received_by') receivedBy!: string;
  @date('received_at') receivedAt!: Date;
  @field('notes') notes?: string;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('grn_items') items: any;
}
