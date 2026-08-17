/**
 * Authentication and RBAC configuration constants
 */

/** Session timeout in milliseconds (15 minutes) */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1_000;

/** Session timeout in minutes */
export const SESSION_TIMEOUT_MINUTES = 15;

/** User roles in the system */
export const ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  PICKER: 'picker',
  DRIVER: 'driver',
  FINANCE: 'finance',
  VIEWER: 'viewer',
} as const;

/** Role type derived from ROLES constant */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All available roles as an array */
export const ALL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.WAREHOUSE_MANAGER,
  ROLES.PICKER,
  ROLES.DRIVER,
  ROLES.FINANCE,
  ROLES.VIEWER,
];

/** Actions that are always logged in audit trail */
export const CRITICAL_ACTIONS = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'dispatch',
  'confirm_delivery',
  'adjust_stock',
] as const;

export type CriticalAction = (typeof CRITICAL_ACTIONS)[number];
