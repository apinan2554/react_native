/**
 * WatermelonDB Model for StockTransfer (การย้ายสต็อก)
 *
 * Maps to the 'stock_transfers' table in the database schema.
 * Records every stock movement between bins for full traceability.
 *
 * Requirements: 3.4
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class StockTransferModel extends Model {
  static table = 'stock_transfers';

  @field('sku_id') skuId!: string;
  @field('from_bin_id') fromBinId!: string;
  @field('to_bin_id') toBinId!: string;
  @field('quantity') quantity!: number;
  @field('transferred_by') transferredBy!: string;
  @date('transferred_at') transferredAt!: Date;
  @field('reason') reason?: string;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
