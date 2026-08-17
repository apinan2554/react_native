/**
 * WatermelonDB Model for GRN Item
 *
 * Maps to the 'grn_items' table in the database schema.
 * Represents a single line item within a GRN, tracking expected vs received quantities.
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class GRNItemModel extends Model {
  static table = 'grn_items';

  static associations = {
    grns: { type: 'belongs_to' as const, key: 'grn_id' },
  };

  @field('grn_id') grnId!: string;
  @field('sku_id') skuId!: string;
  @field('expected_quantity') expectedQuantity!: number;
  @field('received_quantity') receivedQuantity!: number;
  @field('damaged_quantity') damagedQuantity!: number;
  @field('barcode') barcode?: string;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('grns', 'grn_id') grn: any;
}
