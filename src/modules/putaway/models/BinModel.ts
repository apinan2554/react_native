/**
 * WatermelonDB Model for Bin (ตำแหน่งจัดเก็บสินค้า)
 *
 * Maps to the 'bins' table in the database schema.
 * Supports offline-first operations with sync status tracking.
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class BinModel extends Model {
  static table = 'bins';

  @field('code') code!: string;
  @field('zone') zone!: string;
  @field('aisle') aisle!: string;
  @field('rack') rack!: string;
  @field('level') level!: string;
  @field('max_capacity') maxCapacity!: number;
  @field('current_capacity') currentCapacity!: number;
  @field('temperature_zone') temperatureZone?: string;
  @field('distance_from_door') distanceFromDoor!: number;
  @field('is_active') isActive!: boolean;
  @field('sync_status') dataSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
