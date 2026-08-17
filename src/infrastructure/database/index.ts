import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { GRNModel, GRNItemModel } from '../../modules/inbound/models';

/**
 * WatermelonDB SQLite Adapter Configuration
 *
 * Uses SQLite for persistent local storage with offline-first support.
 */
const adapter = new SQLiteAdapter({
  schema,
  // Enable WAL mode for better performance
  jsi: true,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Database setup error:', error);
  },
});

/**
 * Database instance
 *
 * Centralized database instance used throughout the application.
 * Supports offline-first operations and sync with remote backend.
 */
export const database = new Database({
  adapter,
  modelClasses: [GRNModel, GRNItemModel],
});

export { schema } from './schema';
