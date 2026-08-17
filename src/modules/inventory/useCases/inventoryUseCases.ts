/**
 * Inventory Use Cases
 *
 * Business logic for the Inventory module covering:
 * - Real-time stock level queries
 * - Stock transfers between bins
 * - Cycle count creation and recording
 * - Adjustment approval
 * - Threshold alert checking
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import {
  StockLevel,
  StockTransfer,
  CycleCount,
  CycleCountItem,
  AlertResult,
  stockAlertRules,
} from '../types';
import {
  InventoryRepository,
  StockLevelFilter,
  CycleCountParams,
  CountResult,
} from '../repositories/InventoryRepository';
import { PaginatedResult } from '../../../shared/types/common';
import {
  createValidationError,
  createBusinessRuleError,
} from '../../../shared/types/errors';

/**
 * getStockLevel - แสดงสต็อกเรียลไทม์ของ SKU
 *
 * Queries stock level by skuId and returns the StockLevel
 * with computed availableQuantity = quantity - reservedQuantity.
 *
 * Requirements: 3.1
 */
export async function getStockLevel(
  skuId: string,
  repository: InventoryRepository,
): Promise<StockLevel> {
  if (!skuId || skuId.trim().length === 0) {
    throw createValidationError('SKU ID cannot be empty', {
      field: 'skuId',
      validationRule: 'required',
    });
  }

  const stock = await repository.getStockLevel(skuId.trim());

  if (!stock) {
    throw createBusinessRuleError('Stock level not found for SKU', {
      rule: 'stock_must_exist',
      suggestion: 'Verify the SKU ID is correct',
    });
  }

  // Ensure availableQuantity is computed correctly
  return {
    ...stock,
    availableQuantity: stock.quantity - stock.reservedQuantity,
  };
}

/**
 * getAllStockLevels - แสดงสต็อกเรียลไทม์พร้อมตัวกรอง
 *
 * Accepts filters (skuId, binId, category) and returns paginated results.
 * Each result has computed availableQuantity.
 *
 * Requirements: 3.1
 */
export async function getAllStockLevels(
  filters: StockLevelFilter,
  repository: InventoryRepository,
): Promise<PaginatedResult<StockLevel>> {
  const result = await repository.getAllStockLevels(filters);

  // Ensure availableQuantity is computed for all items
  return {
    ...result,
    data: result.data.map((stock) => ({
      ...stock,
      availableQuantity: stock.quantity - stock.reservedQuantity,
    })),
  };
}

/**
 * transferStock - ย้ายสต็อกพร้อมบันทึกประวัติ
 *
 * Validates the transfer, decreases source bin quantity,
 * increases destination bin quantity, and creates a StockTransfer record.
 *
 * Requirements: 3.4
 */
export async function transferStock(
  transfer: Omit<StockTransfer, 'id' | 'transferredAt' | 'syncStatus'>,
  repository: InventoryRepository,
): Promise<StockTransfer> {
  // Validate quantity
  if (!transfer.quantity || transfer.quantity <= 0) {
    throw createValidationError('Transfer quantity must be greater than 0', {
      field: 'quantity',
      validationRule: 'min',
    });
  }

  // Validate from != to
  if (transfer.fromBinId === transfer.toBinId) {
    throw createValidationError('Source and destination bins must be different', {
      field: 'toBinId',
      validationRule: 'notEqual',
    });
  }

  // Validate required fields
  if (!transfer.skuId || transfer.skuId.trim().length === 0) {
    throw createValidationError('SKU ID cannot be empty', {
      field: 'skuId',
      validationRule: 'required',
    });
  }

  if (!transfer.fromBinId || transfer.fromBinId.trim().length === 0) {
    throw createValidationError('Source bin ID cannot be empty', {
      field: 'fromBinId',
      validationRule: 'required',
    });
  }

  if (!transfer.toBinId || transfer.toBinId.trim().length === 0) {
    throw createValidationError('Destination bin ID cannot be empty', {
      field: 'toBinId',
      validationRule: 'required',
    });
  }

  if (!transfer.transferredBy || transfer.transferredBy.trim().length === 0) {
    throw createValidationError('TransferredBy cannot be empty', {
      field: 'transferredBy',
      validationRule: 'required',
    });
  }

  // Verify source bin has sufficient stock
  const sourceStock = await repository.getStockLevelBySkuAndBin(
    transfer.skuId,
    transfer.fromBinId,
  );

  if (!sourceStock) {
    throw createBusinessRuleError('No stock found in source bin for this SKU', {
      rule: 'source_must_have_stock',
      suggestion: 'Verify the SKU exists in the source bin',
    });
  }

  if (sourceStock.quantity < transfer.quantity) {
    throw createBusinessRuleError('Insufficient stock in source bin', {
      rule: 'sufficient_stock_required',
      suggestion: `Only ${sourceStock.quantity} units available in source bin`,
    });
  }

  // Decrease source bin quantity
  await repository.updateStockLevel(
    transfer.skuId,
    transfer.fromBinId,
    sourceStock.quantity - transfer.quantity,
  );

  // Increase destination bin quantity
  const destStock = await repository.getStockLevelBySkuAndBin(
    transfer.skuId,
    transfer.toBinId,
  );
  const destQuantity = destStock ? destStock.quantity : 0;
  await repository.updateStockLevel(
    transfer.skuId,
    transfer.toBinId,
    destQuantity + transfer.quantity,
  );

  // Create the transfer record
  const transferRecord: StockTransfer = {
    id: generateId(),
    skuId: transfer.skuId,
    fromBinId: transfer.fromBinId,
    toBinId: transfer.toBinId,
    quantity: transfer.quantity,
    transferredBy: transfer.transferredBy,
    transferredAt: new Date(),
    reason: transfer.reason,
    syncStatus: 'pending',
  };

  return repository.saveStockTransfer(transferRecord);
}

/**
 * createCycleCount - สร้างรายการนับสต็อกตามกลุ่ม
 *
 * Creates a cycle count with items based on groupBy (sku_category or bin_zone).
 * Items are fetched from the repository based on the grouping criteria.
 *
 * Requirements: 3.5
 */
export async function createCycleCount(
  params: CycleCountParams,
  repository: InventoryRepository,
): Promise<CycleCount> {
  if (!params.createdBy || params.createdBy.trim().length === 0) {
    throw createValidationError('CreatedBy cannot be empty', {
      field: 'createdBy',
      validationRule: 'required',
    });
  }

  if (!params.groupValue || params.groupValue.trim().length === 0) {
    throw createValidationError('Group value cannot be empty', {
      field: 'groupValue',
      validationRule: 'required',
    });
  }

  if (!params.scheduledDate) {
    throw createValidationError('Scheduled date is required', {
      field: 'scheduledDate',
      validationRule: 'required',
    });
  }

  // Fetch items based on groupBy criteria
  const items = await repository.getItemsByGroup(params.groupBy, params.groupValue);

  const cycleCountId = generateId();

  const cycleCount: CycleCount = {
    id: cycleCountId,
    scheduledDate: params.scheduledDate,
    status: 'pending',
    groupBy: params.groupBy,
    items: items.map((item) => ({
      ...item,
      cycleCountId,
    })),
    createdBy: params.createdBy,
    syncStatus: 'pending',
  };

  return repository.saveCycleCount(cycleCount);
}

/**
 * recordCountResult - บันทึกผลนับและคำนวณส่วนต่าง
 *
 * Updates each item's countedQuantity and calculates
 * discrepancy = countedQuantity - systemQuantity.
 *
 * Requirements: 3.6
 */
export async function recordCountResult(
  countId: string,
  results: CountResult[],
  repository: InventoryRepository,
): Promise<CycleCount> {
  if (!countId || countId.trim().length === 0) {
    throw createValidationError('Cycle count ID cannot be empty', {
      field: 'countId',
      validationRule: 'required',
    });
  }

  if (!results || results.length === 0) {
    throw createValidationError('Count results cannot be empty', {
      field: 'results',
      validationRule: 'minLength',
    });
  }

  const cycleCount = await repository.getCycleCount(countId);

  if (!cycleCount) {
    throw createBusinessRuleError('Cycle count not found', {
      rule: 'cycle_count_must_exist',
      suggestion: 'Verify the cycle count ID is correct',
    });
  }

  if (cycleCount.status === 'approved') {
    throw createBusinessRuleError('Cannot record results for an approved cycle count', {
      rule: 'cycle_count_not_approved',
      suggestion: 'Create a new cycle count if adjustments are needed',
    });
  }

  // Update items with counted quantities and calculate discrepancies
  const updatedItems = cycleCount.items.map((item) => {
    const result = results.find((r) => r.itemId === item.id);
    if (result) {
      return {
        ...item,
        countedQuantity: result.countedQuantity,
        discrepancy: result.countedQuantity - item.systemQuantity,
        countedBy: result.countedBy,
        countedAt: new Date(),
      };
    }
    return item;
  });

  const updatedCycleCount: CycleCount = {
    ...cycleCount,
    items: updatedItems,
    status: 'completed',
  };

  return repository.updateCycleCount(updatedCycleCount);
}

/**
 * approveAdjustment - อนุมัติการปรับปรุงสต็อก
 *
 * Sets CycleCount status to 'approved' and adjusts stock levels
 * based on counted quantities.
 *
 * Requirements: 3.6
 */
export async function approveAdjustment(
  countId: string,
  approvedBy: string,
  repository: InventoryRepository,
): Promise<CycleCount> {
  if (!countId || countId.trim().length === 0) {
    throw createValidationError('Cycle count ID cannot be empty', {
      field: 'countId',
      validationRule: 'required',
    });
  }

  if (!approvedBy || approvedBy.trim().length === 0) {
    throw createValidationError('ApprovedBy cannot be empty', {
      field: 'approvedBy',
      validationRule: 'required',
    });
  }

  const cycleCount = await repository.getCycleCount(countId);

  if (!cycleCount) {
    throw createBusinessRuleError('Cycle count not found', {
      rule: 'cycle_count_must_exist',
      suggestion: 'Verify the cycle count ID is correct',
    });
  }

  if (cycleCount.status !== 'completed') {
    throw createBusinessRuleError(
      'Cycle count must be completed before approval',
      {
        rule: 'cycle_count_must_be_completed',
        suggestion: 'Record count results before approving',
      },
    );
  }

  // Adjust stock levels based on counted quantities
  for (const item of cycleCount.items) {
    if (item.countedQuantity !== undefined && item.discrepancy !== undefined && item.discrepancy !== 0) {
      await repository.updateStockLevel(item.skuId, item.binId, item.countedQuantity);
    }
  }

  const approvedCycleCount: CycleCount = {
    ...cycleCount,
    status: 'approved',
  };

  return repository.updateCycleCount(approvedCycleCount);
}

/**
 * checkStockAlerts - ตรวจสอบ min/max threshold และสร้าง alert
 *
 * Uses stockAlertRules to check all stock levels and returns
 * any AlertResults where thresholds are breached.
 *
 * Requirements: 3.2, 3.3
 */
export async function checkStockAlerts(
  repository: InventoryRepository,
): Promise<AlertResult[]> {
  const allStocks = await repository.getAllStockLevelsUnpaginated();
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

  return alerts;
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
