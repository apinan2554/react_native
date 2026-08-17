/**
 * WatermelonDB Model for CycleCount (รอบการนับสต็อก)
 *
 * Maps to the 'cycle_counts' table in the database schema.
 * Represents a scheduled stock count session grouped by category or zone.
 *
 * Requirements: 3.5
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';
import { type Query } from '@nozbe/watermelondb';
import { type CycleCountItemModel } from './CycleCountItemModel';

export class CycleCountModel extends Model {
  static table = 'cycle_counts';

  static associations = {
    cycle_count_items: { type: 'has_many' as const, foreignKey: 'cycle_count_id' },
  };

  @date('scheduled_date') scheduledDate!: Date;
  @field('status') status!: 'pending' | 'in_progress' | 'completed' | 'approved';
  @field('group_by') groupBy!: 'sku_category' | 'bin_zone';
  @field('created_by') createdBy!: string;
  @field('sync_status') dataSyncStatus!: string;
  @children('cycle_count_items') items!: Query<CycleCountItemModel>;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
