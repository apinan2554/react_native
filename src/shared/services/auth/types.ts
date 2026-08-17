/**
 * Auth Service types for RBAC and audit logging
 */

import { Role } from '../../constants/auth';

/** User credentials for login */
export interface Credentials {
  username: string;
  password: string;
}

/** Authentication token returned after successful login */
export interface AuthToken {
  token: string;
  userId: string;
  role: Role;
  expiresAt: Date;
}

/** Audit log entry for recording system actions */
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  success: boolean;
}

/** Filters for querying audit log entries */
export interface AuditFilter {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}

/** Permission definition for a role */
export interface Permission {
  action: string;
  resource: string;
}

/** Auth Service interface */
export interface IAuthService {
  login(credentials: Credentials): Promise<AuthToken>;
  checkPermission(userId: string, action: string, resource: string): boolean;
  getSessionTimeout(): number;
  lockScreen(): void;
  getAuditLog(filters: AuditFilter): Promise<AuditEntry[]>;
}
