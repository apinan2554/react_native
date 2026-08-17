/**
 * Putaway → Inventory Flow Orchestrator
 *
 * Orchestrates the transition from Putaway confirmation to Inventory stock update.
 * After putaway is confirmed (item placed in bin):
 * 1. Updates stock level in Inventory for the confirmed bin/SKU
 * 2. Checks stock alerts (min/max thresholds) after the update
 * 3. Returns any triggered alerts
 *
 * Requirements: 1.1-3.6, 3.2, 3.3
 */

import { StockLevel, AlertResult, stockAlertRules } from '../../modules/inventory/types';
import { InventoryRepository } from '../../modules/inventory/repositories/InventoryRepository';

/** Input for the putaway → inventory flow */
export interface PutawayConfirmation {
  skuId: string;
  binId: string;
  quantity: number;
}

/** Result of the Putaway → Inventory flow */
export interface PutawayToInventoryFlowResult {
  updatedStock: StockLevel;
  alerts: AlertResult[];
}

/**
 * executePutawayToInventoryFlow - Orchestrates Putaway → Inventory transition.
 *
 * After putaway is confirmed (bin updated), increases stock levels in Inventory
 * for the confirmed bin/SKU. Then checks stock alerts for threshold breaches.
 *
 * @param confirmation - The putaway confirmation details (skuId, binId, quantity)
 * @param inventoryRepository - Repository for stock level operations
 * @returns Updated stock level and any triggered alerts
 */
export async function executePutawayToInventoryFlow(
  confirmation: PutawayConfirmation,
  inventoryRepository: InventoryRepository,
): Promise<PutawayToInventoryFlowResult> {
  // Get current stock level for this SKU in this bin
  const currentStock = await inventoryRepository.getStockLevelBySkuAndBin(
    confirmation.skuId,
    confirmation.binId,
  );

  const currentQuantity = currentStock ? currentStock.quantity : 0;
  const newQuantity = currentQuantity + confirmation.quantity;

  // Update stock level in the confirmed bin
  const updatedStock = await inventoryRepository.updateStockLevel(
    confirmation.skuId,
    confirmation.binId,
    newQuantity,
  );

  // Compute availableQuantity for alert checking
  const stockWithAvailable: StockLevel = {
    ...updatedStock,
    availableQuantity: updatedStock.quantity - updatedStock.reservedQuantity,
  };

  // Check stock alerts (min/max thresholds)
  const alerts: AlertResult[] = [];

  const minAlert = stockAlertRules.checkMinThreshold(stockWithAvailable);
  if (minAlert) {
    alerts.push(minAlert);
  }

  const maxAlert = stockAlertRules.checkMaxThreshold(stockWithAvailable);
  if (maxAlert) {
    alerts.push(maxAlert);
  }

  return { updatedStock: stockWithAvailable, alerts };
}
