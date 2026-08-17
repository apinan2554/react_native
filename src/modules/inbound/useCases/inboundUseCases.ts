/**
 * Inbound Use Cases
 *
 * Business logic for the Inbound module covering:
 * - Barcode scanning and SKU lookup
 * - PO comparison and discrepancy detection
 * - GRN confirmation
 * - Damage reporting
 * - Label generation
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import {
  GRN,
  GRNItem,
  DamageReport,
  ScannedItemResult,
  POComparisonResult,
  DiscrepancyItem,
} from '../types';
import {
  InboundRepository,
  LabelData,
  PurchaseOrder,
} from '../repositories/InboundRepository';
import {
  createValidationError,
  createBusinessRuleError,
} from '../../../shared/types/errors';

/**
 * scanBarcode - ค้นหาข้อมูลสินค้าจากบาร์โค้ดและเปรียบเทียบกับ PO
 *
 * Takes a barcode string, looks up SKU data from the repository,
 * and checks if there's an open PO containing that SKU.
 *
 * Requirements: 1.1
 */
export async function scanBarcode(
  code: string,
  repository: InboundRepository,
): Promise<ScannedItemResult> {
  if (!code || code.trim().length === 0) {
    throw createValidationError('Barcode cannot be empty', {
      field: 'barcode',
      validationRule: 'required',
    });
  }

  const sku = await repository.findSKUByBarcode(code.trim());

  if (!sku) {
    return {
      skuId: '',
      name: '',
      barcode: code.trim(),
      matchedPO: false,
    };
  }

  // Look for open POs containing this SKU
  const openPOs = await repository.findOpenPOsForSKU(sku.id);

  if (openPOs.length === 0) {
    return {
      skuId: sku.id,
      name: sku.name,
      barcode: sku.barcode,
      matchedPO: false,
      category: sku.category,
    };
  }

  // Match with the first open PO
  const matchedPO = openPOs[0];
  const poItem = matchedPO.items.find((item) => item.skuId === sku.id);

  return {
    skuId: sku.id,
    name: sku.name,
    barcode: sku.barcode,
    matchedPO: true,
    poId: matchedPO.id,
    expectedQuantity: poItem?.expectedQuantity,
    category: sku.category,
  };
}

/**
 * compareWithPO - ตรวจสอบจำนวนสินค้ากับ PO และตรวจจับ discrepancy
 *
 * Compares scanned/received items against PO line items.
 * Calculates discrepancies where difference = receivedQuantity - expectedQuantity.
 *
 * Requirements: 1.6
 */
export function compareWithPO(
  items: GRNItem[],
  po: PurchaseOrder,
): POComparisonResult {
  const discrepancies: DiscrepancyItem[] = [];
  const matchedItems: GRNItem[] = [];

  let totalExpected = 0;
  let totalReceived = 0;

  // Build a map of PO items for quick lookup
  const poItemMap = new Map<string, number>();
  for (const poItem of po.items) {
    poItemMap.set(poItem.skuId, poItem.expectedQuantity);
  }

  // Check each received item against PO
  for (const item of items) {
    const expectedQty = poItemMap.get(item.skuId) ?? 0;
    totalExpected += expectedQty;
    totalReceived += item.receivedQuantity;

    const difference = item.receivedQuantity - expectedQty;

    if (difference !== 0) {
      discrepancies.push({
        skuId: item.skuId,
        expectedQuantity: expectedQty,
        receivedQuantity: item.receivedQuantity,
        difference,
      });
    }

    matchedItems.push(item);

    // Remove from map to track items in PO but not received
    poItemMap.delete(item.skuId);
  }

  // Items in PO but not received at all
  for (const [skuId, expectedQty] of poItemMap) {
    totalExpected += expectedQty;
    discrepancies.push({
      skuId,
      expectedQuantity: expectedQty,
      receivedQuantity: 0,
      difference: -expectedQty,
    });
  }

  return {
    poId: po.id,
    isMatch: discrepancies.length === 0,
    totalExpected,
    totalReceived,
    matchedItems,
    discrepancies,
  };
}

/**
 * confirmReceiving - สร้าง GRN พร้อมวันที่ เวลา และเปลี่ยนสถานะเป็น confirmed
 *
 * Validates all items, sets status to 'confirmed', calculates totals,
 * and assigns the receivedAt date.
 *
 * Requirements: 1.2
 */
export function confirmReceiving(grn: GRN): GRN {
  if (!grn.items || grn.items.length === 0) {
    throw createValidationError('GRN must have at least one item', {
      field: 'items',
      validationRule: 'minLength',
    });
  }

  if (!grn.poId || grn.poId.trim().length === 0) {
    throw createValidationError('GRN must have a PO reference', {
      field: 'poId',
      validationRule: 'required',
    });
  }

  if (!grn.receivedBy || grn.receivedBy.trim().length === 0) {
    throw createValidationError('GRN must have receivedBy', {
      field: 'receivedBy',
      validationRule: 'required',
    });
  }

  const totalQuantityReceived = grn.items.reduce(
    (sum, item) => sum + item.receivedQuantity,
    0,
  );
  const totalQuantityExpected = grn.items.reduce(
    (sum, item) => sum + item.expectedQuantity,
    0,
  );

  return {
    ...grn,
    status: 'confirmed',
    receivedAt: new Date(),
    totalQuantityReceived,
    totalQuantityExpected,
    syncStatus: 'pending',
  };
}

/**
 * recordDamage - บันทึกสินค้าเสียหายพร้อมรูปถ่ายและเหตุผล
 *
 * Creates a DamageReport with validation:
 * - Must have at least 1 photo
 * - Reason must be non-empty
 * - Quantity must be > 0
 *
 * Requirements: 1.3
 */
export function recordDamage(
  grnItemId: string,
  photos: string[],
  reason: string,
  quantity: number,
): DamageReport {
  if (!photos || photos.length === 0) {
    throw createValidationError('Damage report must have at least 1 photo', {
      field: 'photos',
      validationRule: 'minLength',
    });
  }

  if (!reason || reason.trim().length === 0) {
    throw createValidationError('Damage report must have a reason', {
      field: 'reason',
      validationRule: 'required',
    });
  }

  if (quantity <= 0) {
    throw createValidationError('Damage quantity must be greater than 0', {
      field: 'quantity',
      validationRule: 'min',
    });
  }

  if (!grnItemId || grnItemId.trim().length === 0) {
    throw createValidationError('Damage report must reference a GRN item', {
      field: 'grnItemId',
      validationRule: 'required',
    });
  }

  return {
    id: generateId(),
    grnItemId,
    photos,
    reason: reason.trim(),
    quantity,
    reportedAt: new Date(),
  };
}

/**
 * generateLabel - สร้างบาร์โค้ด/QR Code สำหรับพิมพ์ฉลาก
 *
 * Generates a label data object from a confirmed GRN.
 * The barcode data encodes GRN ID and SKU info so it can be decoded back.
 *
 * Requirements: 1.5
 */
export function generateLabel(grn: GRN): LabelData[] {
  if (grn.status !== 'confirmed') {
    throw createBusinessRuleError(
      'Labels can only be generated for confirmed GRNs',
      {
        rule: 'grn_must_be_confirmed',
        suggestion: 'Confirm the GRN before generating labels',
      },
    );
  }

  return grn.items.map((item) => ({
    grnId: grn.id,
    skuId: item.skuId,
    skuName: '', // Will be populated by repository lookup
    quantity: item.receivedQuantity,
    barcodeData: encodeLabelData(grn.id, item.skuId, item.receivedQuantity),
    generatedAt: new Date(),
  }));
}

/**
 * Encode label data into a barcode-compatible string.
 * Format: GRN:{grnId}|SKU:{skuId}|QTY:{quantity}
 */
export function encodeLabelData(
  grnId: string,
  skuId: string,
  quantity: number,
): string {
  return `GRN:${grnId}|SKU:${skuId}|QTY:${quantity}`;
}

/**
 * Decode barcode data back into its component parts.
 * Returns null if the format is invalid.
 */
export function decodeLabelData(
  barcodeData: string,
): { grnId: string; skuId: string; quantity: number } | null {
  const parts = barcodeData.split('|');
  if (parts.length !== 3) return null;

  const grnPart = parts[0].split(':');
  const skuPart = parts[1].split(':');
  const qtyPart = parts[2].split(':');

  if (
    grnPart[0] !== 'GRN' ||
    skuPart[0] !== 'SKU' ||
    qtyPart[0] !== 'QTY'
  ) {
    return null;
  }

  const quantity = parseInt(qtyPart[1], 10);
  if (isNaN(quantity)) return null;

  return {
    grnId: grnPart[1],
    skuId: skuPart[1],
    quantity,
  };
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
