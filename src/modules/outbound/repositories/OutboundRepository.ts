/**
 * Outbound Repository Interface
 *
 * Defines the data access contract for the Outbound module.
 * Implementations can use WatermelonDB (offline) or API (online).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { PickList, PickItem, Order } from '../types';
import { Bin } from '../../putaway/types';

/**
 * OutboundRepository - Data access interface for Outbound module
 *
 * This interface abstracts the data layer so use cases remain
 * independent of the storage mechanism (WatermelonDB, API, etc.)
 */
export interface OutboundRepository {
  /** Get an order by ID */
  getOrder(orderId: string): Promise<Order | null>;

  /** Get a pick list by ID */
  getPickList(pickListId: string): Promise<PickList | null>;

  /** Save a new pick list */
  savePickList(pickList: PickList): Promise<PickList>;

  /** Update an existing pick list */
  updatePickList(pickList: PickList): Promise<PickList>;

  /** Get a pick item by ID */
  getPickItem(pickItemId: string): Promise<PickItem | null>;

  /** Update a pick item */
  updatePickItem(pickItem: PickItem): Promise<PickItem>;

  /** Get all bins (for route optimization) */
  getBins(): Promise<Bin[]>;

  /** Get a bin by ID */
  getBin(binId: string): Promise<Bin | null>;

  /** Get all pick lists assigned to a worker, sorted by priority */
  getPickListsByWorker(workerId: string): Promise<PickList[]>;

  /** Get orders by IDs (for batch picking) */
  getOrders(orderIds: string[]): Promise<Order[]>;
}
