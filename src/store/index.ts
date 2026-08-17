/**
 * Store - Zustand state management barrel exports
 *
 * All Zustand stores for the WMS application.
 * Stores hold UI state and trigger use case functions.
 */

export { useAuthStore } from './authStore';
export type { AuthUser, AuthState, AuthActions, AuthStore } from './authStore';

export { useInboundStore } from './inboundStore';
export type { InboundState, InboundActions, InboundStore } from './inboundStore';

export { usePutawayStore } from './putawayStore';
export type { PutawayState, PutawayActions, PutawayStore } from './putawayStore';

export { useInventoryStore } from './inventoryStore';
export type { InventoryState, InventoryActions, InventoryStore } from './inventoryStore';
