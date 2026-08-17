/**
 * Inbound → Putaway Flow Orchestrator
 *
 * Orchestrates the transition from a confirmed GRN (Inbound) to
 * Putaway bin suggestions. After a GRN is confirmed, this flow:
 * 1. Extracts GRN items
 * 2. Maps each GRNItem → ReceivedItem (with SKU info for movementRate/temperature)
 * 3. For each received item, triggers bin suggestion
 *
 * Requirements: 1.1-3.6, 2.1
 */

import { GRN, GRNItem } from '../../modules/inbound/types';
import { ReceivedItem, BinSuggestion, Bin } from '../../modules/putaway/types';
import { suggestBin } from '../../modules/putaway/useCases/putawayUseCases';

/** SKU info needed for mapping GRNItem → ReceivedItem */
export interface SKUInfo {
  id: string;
  movementRate: 'fast' | 'medium' | 'slow';
  temperatureRequirement?: { min: number; max: number };
}

/** Repository to look up SKU info for the flow */
export interface SKUInfoRepository {
  getSKUInfo(skuId: string): Promise<SKUInfo | null>;
}

/** Result of the Inbound → Putaway flow for a single item */
export interface InboundToPutawayResult {
  receivedItem: ReceivedItem;
  suggestions: BinSuggestion[];
}

/** Result of the entire Inbound → Putaway flow */
export interface InboundToPutawayFlowResult {
  grnId: string;
  results: InboundToPutawayResult[];
  errors: Array<{ skuId: string; error: string }>;
}

/**
 * Maps a GRNItem to a ReceivedItem using SKU info.
 */
export function mapGRNItemToReceivedItem(
  grnItem: GRNItem,
  skuInfo: SKUInfo,
): ReceivedItem {
  return {
    id: grnItem.id,
    skuId: grnItem.skuId,
    quantity: grnItem.receivedQuantity,
    movementRate: skuInfo.movementRate,
    temperatureRequirement: skuInfo.temperatureRequirement,
  };
}

/**
 * executeInboundToPutawayFlow - Orchestrates the Inbound → Putaway transition.
 *
 * After a GRN is confirmed (status = 'confirmed'), creates ReceivedItems from
 * GRN items and triggers Putaway bin suggestions for each.
 *
 * @param grn - The confirmed GRN
 * @param availableBins - Active bins in the warehouse
 * @param skuInfoRepository - Repository for looking up SKU movement/temperature info
 * @returns Flow results with suggestions per item and any errors
 */
export async function executeInboundToPutawayFlow(
  grn: GRN,
  availableBins: Bin[],
  skuInfoRepository: SKUInfoRepository,
): Promise<InboundToPutawayFlowResult> {
  if (grn.status !== 'confirmed') {
    return {
      grnId: grn.id,
      results: [],
      errors: [{ skuId: '', error: 'GRN must be confirmed before putaway' }],
    };
  }

  const results: InboundToPutawayResult[] = [];
  const errors: Array<{ skuId: string; error: string }> = [];

  for (const grnItem of grn.items) {
    const skuInfo = await skuInfoRepository.getSKUInfo(grnItem.skuId);

    if (!skuInfo) {
      errors.push({
        skuId: grnItem.skuId,
        error: `SKU info not found for ${grnItem.skuId}`,
      });
      continue;
    }

    const receivedItem = mapGRNItemToReceivedItem(grnItem, skuInfo);
    const suggestions = suggestBin(receivedItem, availableBins);

    results.push({ receivedItem, suggestions });
  }

  return { grnId: grn.id, results, errors };
}
