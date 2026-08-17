/**
 * Putaway Repository Interface
 *
 * Defines the data access contract for the Putaway module.
 * Implementations can use WatermelonDB (offline) or API (online).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Bin, ReceivedItem } from '../types';

/** Putaway record - tracks where an item was stored */
export interface PutawayRecord {
  id: string;
  itemId: string;
  binId: string;
  quantity: number;
  putawayAt: Date;
  confirmedBy?: string;
}

/**
 * PutawayRepository - Data access interface for Putaway module
 *
 * This interface abstracts the data layer so use cases remain
 * independent of the storage mechanism (WatermelonDB, API, etc.)
 */
export interface PutawayRepository {
  /** Get all active bins in the warehouse */
  getActiveBins(): Promise<Bin[]>;

  /** Get a specific bin by ID */
  getBin(binId: string): Promise<Bin | null>;

  /** Update bin occupancy after putaway */
  updateBinOccupancy(binId: string, newOccupancy: number): Promise<Bin>;

  /** Save a putaway record */
  savePutawayRecord(record: PutawayRecord): Promise<PutawayRecord>;

  /** Get received item by ID */
  getReceivedItem(itemId: string): Promise<ReceivedItem | null>;

  /** Get bins by zone */
  getBinsByZone(zone: string): Promise<Bin[]>;
}
