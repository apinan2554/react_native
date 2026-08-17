/**
 * Stock Alert Flow
 *
 * Handles stock threshold notifications by checking all stock levels
 * against configured min/max thresholds. Returns AlertResult[] for
 * items that breach thresholds.
 *
 * In a real app this would trigger push notifications to warehouse managers.
 * For now it returns the alerts for consumption by stores or screens.
 *
 * Requirements: 3.2, 3.3
 */

import { StockLevel, AlertResult, stockAlertRules } from '../../modules/inventory/types';
import { InventoryRepository } from '../../modules/inventory/repositories/InventoryRepository';

/** Result of the stock alert flow */
export interface StockAlertFlowResult {
  alerts: AlertResult[];
  checkedCount: number;
}

/**
 * executeStockAlertFlow - Checks all stock levels against min/max thresholds.
 *
 * Iterates over all stock levels, computes available quantity,
 * and checks both min and max threshold rules.
 * Returns AlertResult[] for items that breach thresholds.
 *
 * @param inventoryRepository - Repository for fetching all stock levels
 * @returns Alert results and count of items checked
 */
export async function executeStockAlertFlow(
  inventoryRepository: InventoryRepository,
): Promise<StockAlertFlowResult> {
  const allStocks = await inventoryRepository.getAllStockLevelsUnpaginated();
  const alerts: AlertResult[] = [];

  for (const stock of allStocks) {
    // Ensure availableQuantity is computed
    const stockWithAvailable: StockLevel = {
      ...stock,
      availableQuantity: stock.quantity - stock.reservedQuantity,
    };

    const minAlert = stockAlertRules.checkMinThreshold(stockWithAvailable);
    if (minAlert) {
      alerts.push(minAlert);
    }

    const maxAlert = stockAlertRules.checkMaxThreshold(stockWithAvailable);
    if (maxAlert) {
      alerts.push(maxAlert);
    }
  }

  return { alerts, checkedCount: allStocks.length };
}
