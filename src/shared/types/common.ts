/**
 * Shared common types used across all modules
 */

/** Synchronization status for offline-first data */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'failed';

/** Date range for filtering and billing calculations */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Generic paginated result for list queries */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Monetary value with currency */
export interface Money {
  amount: number;
  currency: string;
}

/** Supported e-commerce platforms */
export type ECommercePlatform = 'shopee' | 'lazada' | 'tiktok_shop';
