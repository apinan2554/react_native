/**
 * SyncEngine - Orchestrates offline-first data synchronization.
 *
 * Manages a queue of sync actions, processes them with retry logic,
 * and resolves conflicts using configurable strategies.
 */
import {
  getRetryDelay,
  MAX_RETRIES_OFFLINE_QUEUE,
} from '../../shared/constants/retry';
import { OfflineQueue, ActionExecutor } from '../offline/OfflineQueue';
import { OfflineQueueItem } from '../offline/types';
import {
  ConflictStrategy,
  getDefaultStrategy,
  QueueStatus,
  SyncAction,
  SyncConflict,
  SyncResult,
} from './types';

/**
 * Interface for the SyncEngine
 */
export interface ISyncEngine {
  enqueue(action: SyncAction): void;
  processQueue(): Promise<SyncResult>;
  getQueueStatus(): QueueStatus;
  resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
  ): Promise<void>;
}

/**
 * Callback invoked when a conflict is resolved
 */
export type ConflictResolver = (
  conflict: SyncConflict,
  resolvedData: Record<string, unknown>,
) => Promise<void>;

/**
 * Configuration options for the SyncEngine
 */
export interface SyncEngineOptions {
  /** Function that executes a sync action against the server */
  executor: ActionExecutor;
  /** Callback invoked when a conflict is resolved */
  onConflictResolved?: ConflictResolver;
}

/**
 * SyncEngine implementation that coordinates offline queue processing,
 * conflict detection and resolution using configurable strategies.
 */
export class SyncEngine implements ISyncEngine {
  private offlineQueue: OfflineQueue;
  private conflicts: SyncConflict[] = [];
  private onConflictResolved?: ConflictResolver;

  constructor(options: SyncEngineOptions) {
    this.offlineQueue = new OfflineQueue(options.executor);
    this.onConflictResolved = options.onConflictResolved;
  }

  /**
   * Enqueue a sync action to be processed later.
   * The action is added to the offline queue and will be processed
   * when processQueue() is called.
   */
  enqueue(action: SyncAction): void {
    this.offlineQueue.add(action);
  }

  /**
   * Process all pending items in the queue.
   * Returns a summary of processed, failed, and conflicting items.
   */
  async processQueue(): Promise<SyncResult> {
    const result = await this.offlineQueue.process();

    return {
      processed: result.processed,
      failed: result.failed,
      conflicts: [...this.conflicts],
    };
  }

  /**
   * Get the current status of the sync queue
   */
  getQueueStatus(): QueueStatus {
    const items = this.offlineQueue.getItems();
    const pending = items.filter(
      (item) => item.status === 'pending',
    ).length;
    const retrying = items.filter(
      (item) => item.status === 'retrying',
    ).length;
    const failed = items.filter(
      (item) => item.status === 'failed',
    ).length;

    return {
      pending,
      retrying,
      failed,
      total: items.length,
    };
  }

  /**
   * Resolve a sync conflict using the specified strategy.
   *
   * Strategies:
   * - server_wins: Use server data (default for master data entities)
   * - client_wins: Use client data (default for in-progress work)
   * - manual_merge: Requires manual user intervention (no-op here, user handles)
   */
  async resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictStrategy,
  ): Promise<void> {
    let resolvedData: Record<string, unknown>;

    switch (strategy) {
      case 'server_wins':
        resolvedData = { ...conflict.serverVersion };
        break;
      case 'client_wins':
        resolvedData = { ...conflict.clientVersion };
        break;
      case 'manual_merge':
        // For manual_merge, we merge both versions (client overrides server)
        resolvedData = {
          ...conflict.serverVersion,
          ...conflict.clientVersion,
        };
        break;
      default:
        resolvedData = { ...conflict.serverVersion };
        break;
    }

    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(
      (c) =>
        !(c.entityType === conflict.entityType &&
          c.entityId === conflict.entityId),
    );

    // Notify the resolver callback if provided
    if (this.onConflictResolved) {
      await this.onConflictResolved(conflict, resolvedData);
    }
  }

  /**
   * Register a conflict that was detected during sync processing
   */
  addConflict(conflict: SyncConflict): void {
    this.conflicts.push(conflict);
  }

  /**
   * Get all pending conflicts
   */
  getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  /**
   * Get the underlying offline queue for direct access if needed
   */
  getOfflineQueue(): OfflineQueue {
    return this.offlineQueue;
  }

  /**
   * Resolve a conflict using the default strategy based on entity type.
   * Master data entities (sku, supplier, customer, vehicle, driver) use server_wins.
   * In-progress work entities use client_wins.
   */
  async resolveConflictWithDefault(conflict: SyncConflict): Promise<void> {
    const strategy = getDefaultStrategy(conflict.entityType);
    await this.resolveConflict(conflict, strategy);
  }
}
