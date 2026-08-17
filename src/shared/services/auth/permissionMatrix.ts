/**
 * Permission matrix defining what each role can access.
 *
 * Format: { [role]: { [resource]: actions[] } }
 *
 * Permission matrix guidelines:
 * - admin: full access to everything
 * - warehouse_manager: WMS modules (inbound, putaway, inventory, outbound) + master data + dashboard
 * - picker: pick operations only (outbound read/confirm)
 * - driver: fleet read, dispatch read/confirm, tracking update, POD create
 * - finance: billing + dashboard + read-only access to other modules
 * - viewer: read-only access to all modules
 */

import { Role } from '../../constants/auth';

/** All possible actions in the system */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  CONFIRM: 'confirm',
  DISPATCH: 'dispatch',
  ADJUST_STOCK: 'adjust_stock',
} as const;

/** All resources/modules in the system */
export const RESOURCES = {
  INBOUND: 'inbound',
  PUTAWAY: 'putaway',
  INVENTORY: 'inventory',
  OUTBOUND: 'outbound',
  FLEET: 'fleet',
  ROUTE: 'route',
  DISPATCH: 'dispatch',
  TRACKING: 'tracking',
  POD: 'pod',
  BILLING: 'billing',
  DASHBOARD: 'dashboard',
  MASTER_DATA: 'master_data',
  INTEGRATION: 'integration',
  USERS: 'users',
  AUDIT_LOG: 'audit_log',
} as const;

type Action = string;
type Resource = string;

/** Permission matrix: role -> resource -> allowed actions */
const permissionMatrix: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    [RESOURCES.INBOUND]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.CONFIRM],
    [RESOURCES.PUTAWAY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.CONFIRM],
    [RESOURCES.INVENTORY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE, ACTIONS.ADJUST_STOCK],
    [RESOURCES.OUTBOUND]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.CONFIRM],
    [RESOURCES.FLEET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.ROUTE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.DISPATCH]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.CONFIRM, ACTIONS.DISPATCH],
    [RESOURCES.TRACKING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.POD]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.BILLING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.APPROVE],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.MASTER_DATA]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.INTEGRATION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ],
  },

  warehouse_manager: {
    [RESOURCES.INBOUND]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIRM],
    [RESOURCES.PUTAWAY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIRM],
    [RESOURCES.INVENTORY]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE, ACTIONS.ADJUST_STOCK],
    [RESOURCES.OUTBOUND]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIRM],
    [RESOURCES.FLEET]: [ACTIONS.READ],
    [RESOURCES.ROUTE]: [ACTIONS.READ],
    [RESOURCES.DISPATCH]: [ACTIONS.READ],
    [RESOURCES.TRACKING]: [ACTIONS.READ],
    [RESOURCES.POD]: [ACTIONS.READ],
    [RESOURCES.BILLING]: [ACTIONS.READ],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.MASTER_DATA]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.INTEGRATION]: [ACTIONS.READ],
    [RESOURCES.USERS]: [],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ],
  },

  picker: {
    [RESOURCES.INBOUND]: [],
    [RESOURCES.PUTAWAY]: [],
    [RESOURCES.INVENTORY]: [ACTIONS.READ],
    [RESOURCES.OUTBOUND]: [ACTIONS.READ, ACTIONS.CONFIRM],
    [RESOURCES.FLEET]: [],
    [RESOURCES.ROUTE]: [],
    [RESOURCES.DISPATCH]: [],
    [RESOURCES.TRACKING]: [],
    [RESOURCES.POD]: [],
    [RESOURCES.BILLING]: [],
    [RESOURCES.DASHBOARD]: [],
    [RESOURCES.MASTER_DATA]: [],
    [RESOURCES.INTEGRATION]: [],
    [RESOURCES.USERS]: [],
    [RESOURCES.AUDIT_LOG]: [],
  },

  driver: {
    [RESOURCES.INBOUND]: [],
    [RESOURCES.PUTAWAY]: [],
    [RESOURCES.INVENTORY]: [],
    [RESOURCES.OUTBOUND]: [],
    [RESOURCES.FLEET]: [ACTIONS.READ],
    [RESOURCES.ROUTE]: [ACTIONS.READ],
    [RESOURCES.DISPATCH]: [ACTIONS.READ, ACTIONS.CONFIRM],
    [RESOURCES.TRACKING]: [ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.POD]: [ACTIONS.CREATE, ACTIONS.READ],
    [RESOURCES.BILLING]: [],
    [RESOURCES.DASHBOARD]: [],
    [RESOURCES.MASTER_DATA]: [],
    [RESOURCES.INTEGRATION]: [],
    [RESOURCES.USERS]: [],
    [RESOURCES.AUDIT_LOG]: [],
  },

  finance: {
    [RESOURCES.INBOUND]: [ACTIONS.READ],
    [RESOURCES.PUTAWAY]: [ACTIONS.READ],
    [RESOURCES.INVENTORY]: [ACTIONS.READ],
    [RESOURCES.OUTBOUND]: [ACTIONS.READ],
    [RESOURCES.FLEET]: [ACTIONS.READ],
    [RESOURCES.ROUTE]: [ACTIONS.READ],
    [RESOURCES.DISPATCH]: [ACTIONS.READ],
    [RESOURCES.TRACKING]: [ACTIONS.READ],
    [RESOURCES.POD]: [ACTIONS.READ],
    [RESOURCES.BILLING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.MASTER_DATA]: [ACTIONS.READ],
    [RESOURCES.INTEGRATION]: [ACTIONS.READ],
    [RESOURCES.USERS]: [],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ],
  },

  viewer: {
    [RESOURCES.INBOUND]: [ACTIONS.READ],
    [RESOURCES.PUTAWAY]: [ACTIONS.READ],
    [RESOURCES.INVENTORY]: [ACTIONS.READ],
    [RESOURCES.OUTBOUND]: [ACTIONS.READ],
    [RESOURCES.FLEET]: [ACTIONS.READ],
    [RESOURCES.ROUTE]: [ACTIONS.READ],
    [RESOURCES.DISPATCH]: [ACTIONS.READ],
    [RESOURCES.TRACKING]: [ACTIONS.READ],
    [RESOURCES.POD]: [ACTIONS.READ],
    [RESOURCES.BILLING]: [ACTIONS.READ],
    [RESOURCES.DASHBOARD]: [ACTIONS.READ],
    [RESOURCES.MASTER_DATA]: [ACTIONS.READ],
    [RESOURCES.INTEGRATION]: [ACTIONS.READ],
    [RESOURCES.USERS]: [],
    [RESOURCES.AUDIT_LOG]: [],
  },
};

/**
 * Check if a role has permission to perform an action on a resource
 */
export function hasPermission(role: Role, action: string, resource: string): boolean {
  const rolePermissions = permissionMatrix[role];
  if (!rolePermissions) {
    return false;
  }

  const resourceActions = rolePermissions[resource];
  if (!resourceActions) {
    return false;
  }

  return resourceActions.includes(action);
}

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: Role): Record<Resource, Action[]> {
  return permissionMatrix[role] || {};
}
