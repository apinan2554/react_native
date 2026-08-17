/**
 * Cross-Module Flow Orchestrators
 *
 * Barrel export for all WMS cross-module flows.
 * These coordinate between Inbound → Putaway → Inventory modules.
 */

export {
  executeInboundToPutawayFlow,
  mapGRNItemToReceivedItem,
} from './inboundToPutawayFlow';
export type {
  SKUInfo,
  SKUInfoRepository,
  InboundToPutawayResult,
  InboundToPutawayFlowResult,
} from './inboundToPutawayFlow';

export { executePutawayToInventoryFlow } from './putawayToInventoryFlow';
export type {
  PutawayConfirmation,
  PutawayToInventoryFlowResult,
} from './putawayToInventoryFlow';

export { executeStockAlertFlow } from './stockAlertFlow';
export type { StockAlertFlowResult } from './stockAlertFlow';
