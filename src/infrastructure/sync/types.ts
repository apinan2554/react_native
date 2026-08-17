/**
 * Types for the Sync Engine
 */

/**
 * Conflict resolution strategies
 * - server_wins: Server data takes precedence (used for master data like SKU, supplier, etc.)
 * - client_wins: Client data takes precedence (used for in-progress work)
 * - manual_merge: Requires manual user intervention
 */
export type ConflictStrategy = 'server_wins' | 'client_wins' | 'manual_merge';

/**
 * Represents a sync action to be processed
 */
export interface SyncAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Represents a conflict between server and client versions
 */
export interface SyncConflict {
  entityType: string;
  entityId: string;
  serverVersion: Record<string, unknown>;
  clientVersion: Record<string, unknown>;
  serverTimestamp: Date;
  clientTimestamp: Date;
}

/**
 * Result of processing the sync queue
 */
export interface SyncResult {
  processed: number;
  failed: number;
  conflicts: SyncConflict[];
}

/**
 * Status of the sync queue
 */
export interface QueueStatus {
  pending: number;
  retrying: number;
  failed: number;
  total: number;
}

/**
 * Entity types that use server_wins strategy (master data)
 */
export const SERVER_WINS_ENTITIES = ['sku', 'supplier', 'customer', 'vehicle', 'driver'];

/**
 * Determines the default conflict resolution strategy based on entity type.
 * Master data entities use server_wins; in-progress work uses client_wins.
 */
export function getDefaultStrategy(entityType: string): ConflictStrategy {
  return SERVER_WINS_ENTITIES.includes(entityType) ? 'server_wins' : 'client_wins';
}
