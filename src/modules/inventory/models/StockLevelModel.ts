/**
 * WatermelonDB Model for StockLevel (ระดับสต็อก)
 *
 * Maps to the 'stock_levels' table in the database schema.
 * Tracks real-time stock quantities and threshold values per SKU/Bin combination.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class StockLevelModel extends Model {
  static table = 'stock_levels';

  @field('sku_id') skuId!: string;
  @field('bin_id') binId!: string;
  @field('quantity') quantity!: number;
  @field('reserved_quantity') reservedQuantity!: number;
  @field('min_threshold') minThreshold!: number;
  @field('max_threshold') maxThreshold!: number;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /** Computed available quantity (quantity - reservedQuantity) */
  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
}
