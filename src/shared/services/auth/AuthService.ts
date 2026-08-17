/**
 * Auth Service implementation with RBAC, session timeout, and audit logging
 *
 * Requirements: 13.4, 13.5, 13.6
 * - RBAC for access control by role
 * - Session timeout after 15 minutes of inactivity
 * - Audit log for all critical actions
 */

import { Role } from '../../constants/auth';
import { SESSION_TIMEOUT_MS, CRITICAL_ACTIONS } from '../../constants/auth';
import { hasPermission } from './permissionMatrix';
import {
  AuditEntry,
  AuditFilter,
  AuthToken,
  Credentials,
  IAuthService,
} from './types';

/** Represents a logged-in user session */
interface UserSession {
  userId: string;
  role: Role;
  lastActivity: Date;
  isLocked: boolean;
}

/**
 * AuthService provides authentication, authorization, session management,
 * and audit logging capabilities.
 */
export class AuthService implements IAuthService {
  private sessions: Map<string, UserSession> = new Map();
  private auditLog: AuditEntry[] = [];
  private locked = false;
  private onLockScreen?: () => void;

  constructor(options?: { onLockScreen?: () => void }) {
    this.onLockScreen = options?.onLockScreen;
  }

  /**
   * Authenticate a user with credentials.
   * In production, this would call the backend API.
   */
  async login(credentials: Credentials): Promise<AuthToken> {
    // Validate credentials are provided
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }

    // In production, this would call backend auth API
    // For the service layer, we return a token structure
    const token: AuthToken = {
      token: this.generateToken(),
      userId: credentials.username,
      role: 'viewer' as Role, // Default role, would come from backend
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS),
    };

    // Create session
    this.sessions.set(token.userId, {
      userId: token.userId,
      role: token.role,
      lastActivity: new Date(),
      isLocked: false,
    });

    // Record audit entry for login
    this.recordAudit(token.userId, 'login', 'auth', true);

    return token;
  }

  /**
   * Check if a user has permission to perform an action on a resource.
   * Uses the role-based permission matrix.
   */
  checkPermission(userId: string, action: string, resource: string): boolean {
    const session = this.sessions.get(userId);
    if (!session) {
      return false;
    }

    if (session.isLocked) {
      return false;
    }

    return hasPermission(session.role, action, resource);
  }

  /**
   * Check permission directly by role (useful for testing and stateless checks)
   */
  checkPermissionByRole(role: Role, action: string, resource: string): boolean {
    return hasPermission(role, action, resource);
  }

  /**
   * Get the session timeout duration in milliseconds.
   * Returns 15 minutes (900000ms) as per requirement 13.5.
   */
  getSessionTimeout(): number {
    return SESSION_TIMEOUT_MS;
  }

  /**
   * Lock the screen due to inactivity or explicit request.
   * Requires re-authentication to unlock.
   */
  lockScreen(): void {
    this.locked = true;

    // Mark all sessions as locked
    for (const [, session] of this.sessions) {
      session.isLocked = true;
    }

    // Invoke callback if provided
    if (this.onLockScreen) {
      this.onLockScreen();
    }
  }

  /**
   * Check if a session has timed out based on last activity.
   * Returns true if the session should be locked.
   */
  isSessionTimedOut(userId: string): boolean {
    const session = this.sessions.get(userId);
    if (!session) {
      return true;
    }

    const now = new Date();
    const elapsed = now.getTime() - session.lastActivity.getTime();
    return elapsed >= SESSION_TIMEOUT_MS;
  }

  /**
   * Update the last activity timestamp for a user session.
   * Should be called on user interactions to prevent timeout.
   */
  updateActivity(userId: string): void {
    const session = this.sessions.get(userId);
    if (session && !session.isLocked) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Check and enforce session timeout for a user.
   * Locks the screen if the session has timed out.
   * Returns true if the session was locked.
   */
  enforceSessionTimeout(userId: string): boolean {
    if (this.isSessionTimedOut(userId)) {
      this.lockScreen();
      this.recordAudit(userId, 'session_timeout', 'auth', true);
      return true;
    }
    return false;
  }

  /**
   * Get audit log entries, optionally filtered.
   */
  async getAuditLog(filters: AuditFilter): Promise<AuditEntry[]> {
    let entries = [...this.auditLog];

    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }
    if (filters.action) {
      entries = entries.filter(e => e.action === filters.action);
    }
    if (filters.resource) {
      entries = entries.filter(e => e.resource === filters.resource);
    }
    if (filters.startDate) {
      entries = entries.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      entries = entries.filter(e => e.timestamp <= filters.endDate!);
    }

    return entries;
  }

  /**
   * Record an action in the audit log.
   * Critical actions (login, create, update, delete, approve, etc.) are always recorded.
   */
  recordAudit(
    userId: string,
    action: string,
    resource: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    const entry: AuditEntry = {
      id: this.generateId(),
      userId,
      action,
      resource,
      timestamp: new Date(),
      success,
      details,
    };

    this.auditLog.push(entry);
  }

  /**
   * Check if an action is a critical action that must always be audited.
   */
  isCriticalAction(action: string): boolean {
    return (CRITICAL_ACTIONS as readonly string[]).includes(action);
  }

  /**
   * Register a user session with a specific role (for testing/internal use)
   */
  registerSession(userId: string, role: Role): void {
    this.sessions.set(userId, {
      userId,
      role,
      lastActivity: new Date(),
      isLocked: false,
    });
  }

  /**
   * Get locked state
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Unlock the screen (after re-authentication)
   */
  unlockScreen(userId: string): void {
    this.locked = false;
    const session = this.sessions.get(userId);
    if (session) {
      session.isLocked = false;
      session.lastActivity = new Date();
    }
  }

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
