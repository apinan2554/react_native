/**
 * WatermelonDB Model for CycleCountItem (รายการนับสต็อก)
 *
 * Maps to the 'cycle_count_items' table in the database schema.
 * Tracks individual SKU/Bin count results within a cycle count session.
 *
 * Requirements: 3.5, 3.6
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import { type Relation } from '@nozbe/watermelondb';
import { type CycleCountModel } from './CycleCountModel';

export class CycleCountItemModel extends Model {
  static table = 'cycle_count_items';

  static associations = {
    cycle_counts: { type: 'belongs_to' as const, key: 'cycle_count_id' },
  };

  @relation('cycle_counts', 'cycle_count_id') cycleCount!: Relation<CycleCountModel>;
  @field('cycle_count_id') cycleCountId!: string;
  @field('sku_id') skuId!: string;
  @field('bin_id') binId!: string;
  @field('system_quantity') systemQuantity!: number;
  @field('counted_quantity') countedQuantity?: number;
  @field('discrepancy') discrepancy?: number;
  @field('counted_by') countedBy?: string;
  @date('counted_at') countedAt?: Date;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
