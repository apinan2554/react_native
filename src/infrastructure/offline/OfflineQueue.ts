/**
 * OfflineQueue - Manages queued actions when the device is offline.
 *
 * Items are stored in memory and processed in FIFO order with
 * exponential backoff retry logic.
 */
import {
  getRetryDelay,
  MAX_RETRIES_OFFLINE_QUEUE,
} from '../../shared/constants/retry';
import { SyncAction } from '../sync/types';
import { OfflineQueueItem, ProcessResult, QueueItemStatus } from './types';

/**
 * Interface for the OfflineQueue
 */
export interface IOfflineQueue {
  add(action: SyncAction): OfflineQueueItem;
  peek(): OfflineQueueItem | null;
  process(): Promise<ProcessResult>;
  getCount(): number;
  getItems(): OfflineQueueItem[];
  getItemsByStatus(status: QueueItemStatus): OfflineQueueItem[];
  remove(id: string): void;
  clear(): void;
}

/**
 * Executor function type for processing sync actions.
 * Returns true on success, throws or returns false on failure.
 */
export type ActionExecutor = (action: SyncAction) => Promise<boolean>;

/**
 * Delay function type for testability
 */
export type DelayFn = (ms: number) => Promise<void>;

/**
 * Creates a unique ID for queue items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default delay implementation using setTimeout
 */
const defaultDelay: DelayFn = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * OfflineQueue implementation that stores actions for later processing
 * with exponential backoff retry strategy.
 */
export class OfflineQueue implements IOfflineQueue {
  private queue: OfflineQueueItem[] = [];
  private executor: ActionExecutor;
  private delayFn: DelayFn;

  constructor(executor: ActionExecutor, delayFn?: DelayFn) {
    this.executor = executor;
    this.delayFn = delayFn ?? defaultDelay;
  }

  /**
   * Add a new action to the offline queue
   */
  add(action: SyncAction): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: generateId(),
      action,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: MAX_RETRIES_OFFLINE_QUEUE,
      status: 'pending',
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Peek at the next item in the queue without removing it
   */
  peek(): OfflineQueueItem | null {
    const processable = this.queue.find(
      (item) => item.status === 'pending' || item.status === 'retrying',
    );
    return processable ?? null;
  }

  /**
   * Process items in the queue sequentially.
   * Successfully processed items are removed from the queue.
   * Failed items are retried with exponential backoff up to maxRetries.
   */
  async process(): Promise<ProcessResult> {
    let processed = 0;
    let failed = 0;

    const processableItems = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'retrying',
    );

    for (const item of processableItems) {
      try {
        // Calculate delay based on retry count (skip delay on first attempt)
        if (item.retryCount > 0) {
          const delay = getRetryDelay(item.retryCount - 1);
          await this.delayFn(delay);
        }

        const success = await this.executor(item.action);

        if (success) {
          item.status = 'completed';
          this.removeItem(item.id);
          processed++;
        } else {
          this.handleItemFailure(item, 'Executor returned false');
          if (item.status === 'failed') {
            failed++;
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.handleItemFailure(item, errorMessage);
        if (item.status === 'failed') {
          failed++;
        }
      }
    }

    const remaining = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'retrying',
    ).length;

    return { processed, failed, remaining };
  }

  /**
   * Get the total number of items in the queue (all statuses)
   */
  getCount(): number {
    return this.queue.length;
  }

  /**
   * Get all items in the queue
   */
  getItems(): OfflineQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get items filtered by status
   */
  getItemsByStatus(status: QueueItemStatus): OfflineQueueItem[] {
    return this.queue.filter((item) => item.status === status);
  }

  /**
   * Remove an item from the queue by ID
   */
  remove(id: string): void {
    this.removeItem(id);
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Handle a failed item by incrementing retry count or marking as failed
   */
  private handleItemFailure(item: OfflineQueueItem, errorMessage: string): void {
    item.retryCount++;
    item.lastError = errorMessage;

    if (item.retryCount >= item.maxRetries) {
      item.status = 'failed';
    } else {
      item.status = 'retrying';
    }
  }

  /**
   * Remove an item from the internal queue array
   */
  private removeItem(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
  }
}
