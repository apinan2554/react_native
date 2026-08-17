/**
 * Types for the Offline Queue
 */
import { SyncAction } from '../sync/types';

/**
 * Status of an offline queue item
 */
export type QueueItemStatus = 'pending' | 'retrying' | 'failed' | 'completed';

/**
 * An item in the offline queue
 */
export interface OfflineQueueItem {
  id: string;
  action: SyncAction;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  status: QueueItemStatus;
}

/**
 * Result of processing a single queue item
 */
export interface ProcessResult {
  processed: number;
  failed: number;
  remaining: number;
}
