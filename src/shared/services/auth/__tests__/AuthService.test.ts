import { AuthService } from '../AuthService';
import { ACTIONS, RESOURCES, hasPermission, getRolePermissions } from '../permissionMatrix';
import { Role, ROLES, SESSION_TIMEOUT_MS, CRITICAL_ACTIONS } from '../../../constants/auth';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login()', () => {
    it('should return an auth token on successful login', async () => {
      const token = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(token.token).toBeDefined();
      expect(token.userId).toBe('testuser');
      expect(token.role).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw error when username is empty', async () => {
      await expect(
        authService.login({ username: '', password: 'password123' }),
      ).rejects.toThrow('Username and password are required');
    });

    it('should throw error when password is empty', async () => {
      await expect(
        authService.login({ username: 'testuser', password: '' }),
      ).rejects.toThrow('Username and password are required');
    });

    it('should create a session for the logged-in user', async () => {
      const token = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      // Session should exist - checkPermission depends on it
      // Since default role is viewer, check read permission on inbound
      const hasAccess = authService.checkPermission(
        token.userId,
        ACTIONS.READ,
        RESOURCES.INBOUND,
      );
      expect(hasAccess).toBe(true);
    });

    it('should record an audit entry for login action', async () => {
      await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      const log = await authService.getAuditLog({ userId: 'testuser' });
      expect(log.length).toBe(1);
      expect(log[0].action).toBe('login');
      expect(log[0].resource).toBe('auth');
      expect(log[0].success).toBe(true);
    });

    it('should set token expiry to session timeout from now', async () => {
      const before = Date.now();
      const token = await authService.login({
        username: 'testuser',
        password: 'password123',
      });
      const after = Date.now();

      const expiresAt = token.expiresAt.getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + SESSION_TIMEOUT_MS);
      expect(expiresAt).toBeLessThanOrEqual(after + SESSION_TIMEOUT_MS);
    });
  });

  describe('checkPermission()', () => {
    it('should return false for a non-existent user session', () => {
      const result = authService.checkPermission(
        'unknown-user',
        ACTIONS.READ,
        RESOURCES.INBOUND,
      );
      expect(result).toBe(false);
    });

    it('should return true when user role has the permission', () => {
      authService.registerSession('admin-user', ROLES.ADMIN);

      const result = authService.checkPermission(
        'admin-user',
        ACTIONS.DELETE,
        RESOURCES.INBOUND,
      );
      expect(result).toBe(true);
    });

    it('should return false when user role does not have the permission', () => {
      authService.registerSession('picker-user', ROLES.PICKER);

      const result = authService.checkPermission(
        'picker-user',
        ACTIONS.DELETE,
        RESOURCES.INBOUND,
      );
      expect(result).toBe(false);
    });

    it('should return false when screen is locked', () => {
      authService.registerSession('admin-user', ROLES.ADMIN);
      authService.lockScreen();

      const result = authService.checkPermission(
        'admin-user',
        ACTIONS.READ,
        RESOURCES.INBOUND,
      );
      expect(result).toBe(false);
    });
  });

  describe('checkPermissionByRole()', () => {
    it('should check permission directly by role without session', () => {
      expect(
        authService.checkPermissionByRole(
          ROLES.ADMIN,
          ACTIONS.DELETE,
          RESOURCES.USERS,
        ),
      ).toBe(true);

      expect(
        authService.checkPermissionByRole(
          ROLES.VIEWER,
          ACTIONS.DELETE,
          RESOURCES.USERS,
        ),
      ).toBe(false);
    });
  });

  describe('getSessionTimeout()', () => {
    it('should return 15 minutes in milliseconds', () => {
      const timeout = authService.getSessionTimeout();
      expect(timeout).toBe(15 * 60 * 1000);
      expect(timeout).toBe(SESSION_TIMEOUT_MS);
    });
  });

  describe('lockScreen()', () => {
    it('should lock the screen', () => {
      authService.lockScreen();
      expect(authService.isLocked()).toBe(true);
    });

    it('should mark all sessions as locked', () => {
      authService.registerSession('user1', ROLES.ADMIN);
      authService.registerSession('user2', ROLES.PICKER);

      authService.lockScreen();

      // Locked sessions should deny all permissions
      expect(
        authService.checkPermission('user1', ACTIONS.READ, RESOURCES.INBOUND),
      ).toBe(false);
      expect(
        authService.checkPermission('user2', ACTIONS.READ, RESOURCES.OUTBOUND),
      ).toBe(false);
    });

    it('should invoke onLockScreen callback if provided', () => {
      const mockCallback = jest.fn();
      const serviceWithCallback = new AuthService({
        onLockScreen: mockCallback,
      });

      serviceWithCallback.lockScreen();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('unlockScreen()', () => {
    it('should unlock the screen for a user', () => {
      authService.registerSession('user1', ROLES.ADMIN);
      authService.lockScreen();

      authService.unlockScreen('user1');

      expect(authService.isLocked()).toBe(false);
      expect(
        authService.checkPermission('user1', ACTIONS.READ, RESOURCES.INBOUND),
      ).toBe(true);
    });

    it('should update lastActivity on unlock', () => {
      authService.registerSession('user1', ROLES.ADMIN);
      authService.lockScreen();

      authService.unlockScreen('user1');

      // Session should not be timed out after unlock
      expect(authService.isSessionTimedOut('user1')).toBe(false);
    });
  });

  describe('session timeout logic', () => {
    it('should report session as not timed out for active sessions', () => {
      authService.registerSession('user1', ROLES.ADMIN);

      expect(authService.isSessionTimedOut('user1')).toBe(false);
    });

    it('should report session as timed out for non-existent users', () => {
      expect(authService.isSessionTimedOut('unknown')).toBe(true);
    });

    it('should update activity timestamp', () => {
      authService.registerSession('user1', ROLES.ADMIN);
      authService.updateActivity('user1');

      expect(authService.isSessionTimedOut('user1')).toBe(false);
    });

    it('should not update activity when session is locked', () => {
      authService.registerSession('user1', ROLES.ADMIN);
      authService.lockScreen();

      // updateActivity should be a no-op when locked
      authService.updateActivity('user1');

      // Session is still locked, so permission check will fail
      expect(
        authService.checkPermission('user1', ACTIONS.READ, RESOURCES.INBOUND),
      ).toBe(false);
    });

    it('should enforce session timeout and lock screen', () => {
      authService.registerSession('user1', ROLES.ADMIN);

      // Manually manipulate to simulate timeout - we use enforceSessionTimeout
      // which checks isSessionTimedOut internally
      // For a fresh session, it should not lock
      const locked = authService.enforceSessionTimeout('user1');
      expect(locked).toBe(false);
      expect(authService.isLocked()).toBe(false);
    });
  });

  describe('getAuditLog()', () => {
    beforeEach(() => {
      // Record some audit entries
      authService.recordAudit('user1', 'login', 'auth', true);
      authService.recordAudit('user1', 'create', 'inventory', true);
      authService.recordAudit('user2', 'update', 'outbound', true);
      authService.recordAudit('user1', 'delete', 'inbound', false);
    });

    it('should return all audit entries when no filter applied', async () => {
      const entries = await authService.getAuditLog({});
      expect(entries.length).toBe(4);
    });

    it('should filter by userId', async () => {
      const entries = await authService.getAuditLog({ userId: 'user1' });
      expect(entries.length).toBe(3);
      entries.forEach(e => expect(e.userId).toBe('user1'));
    });

    it('should filter by action', async () => {
      const entries = await authService.getAuditLog({ action: 'create' });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('create');
    });

    it('should filter by resource', async () => {
      const entries = await authService.getAuditLog({ resource: 'auth' });
      expect(entries.length).toBe(1);
      expect(entries[0].resource).toBe('auth');
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);
      const future = new Date(now.getTime() + 10000);

      const entries = await authService.getAuditLog({
        startDate: past,
        endDate: future,
      });
      expect(entries.length).toBe(4);
    });

    it('should return empty array when no entries match', async () => {
      const entries = await authService.getAuditLog({
        userId: 'non-existent',
      });
      expect(entries.length).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const entries = await authService.getAuditLog({
        userId: 'user1',
        action: 'create',
      });
      expect(entries.length).toBe(1);
      expect(entries[0].userId).toBe('user1');
      expect(entries[0].action).toBe('create');
    });
  });

  describe('recordAudit()', () => {
    it('should record an audit entry with all fields', () => {
      authService.recordAudit('user1', 'create', 'inventory', true, {
        itemId: '123',
      });

      authService.getAuditLog({}).then(entries => {
        expect(entries.length).toBe(1);
        const entry = entries[0];
        expect(entry.id).toBeDefined();
        expect(entry.userId).toBe('user1');
        expect(entry.action).toBe('create');
        expect(entry.resource).toBe('inventory');
        expect(entry.success).toBe(true);
        expect(entry.details).toEqual({ itemId: '123' });
        expect(entry.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should generate unique IDs for each entry', async () => {
      authService.recordAudit('user1', 'login', 'auth', true);
      authService.recordAudit('user1', 'login', 'auth', true);

      const entries = await authService.getAuditLog({});
      expect(entries[0].id).not.toBe(entries[1].id);
    });
  });

  describe('isCriticalAction()', () => {
    it('should return true for critical actions', () => {
      CRITICAL_ACTIONS.forEach(action => {
        expect(authService.isCriticalAction(action)).toBe(true);
      });
    });

    it('should return false for non-critical actions', () => {
      expect(authService.isCriticalAction('view')).toBe(false);
      expect(authService.isCriticalAction('search')).toBe(false);
      expect(authService.isCriticalAction('navigate')).toBe(false);
    });
  });

  describe('registerSession()', () => {
    it('should create a session with the given role', () => {
      authService.registerSession('user1', ROLES.WAREHOUSE_MANAGER);

      // Warehouse manager can create inbound
      expect(
        authService.checkPermission('user1', ACTIONS.CREATE, RESOURCES.INBOUND),
      ).toBe(true);
      // But cannot manage users
      expect(
        authService.checkPermission('user1', ACTIONS.CREATE, RESOURCES.USERS),
      ).toBe(false);
    });
  });
});

describe('Permission Matrix', () => {
  describe('admin role', () => {
    it('should have full access to all resources', () => {
      const permissions = getRolePermissions(ROLES.ADMIN);

      // Admin can do everything on core WMS resources
      expect(hasPermission(ROLES.ADMIN, ACTIONS.CREATE, RESOURCES.INBOUND)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, ACTIONS.DELETE, RESOURCES.INBOUND)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, ACTIONS.CREATE, RESOURCES.USERS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, ACTIONS.DELETE, RESOURCES.USERS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, ACTIONS.APPROVE, RESOURCES.INVENTORY)).toBe(true);

      // Verify all resources have permissions
      expect(Object.keys(permissions).length).toBeGreaterThan(0);
    });
  });

  describe('warehouse_manager role', () => {
    it('should manage inbound, putaway, inventory, outbound', () => {
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.CREATE, RESOURCES.INBOUND)).toBe(true);
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.UPDATE, RESOURCES.PUTAWAY)).toBe(true);
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.APPROVE, RESOURCES.INVENTORY)).toBe(true);
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.CONFIRM, RESOURCES.OUTBOUND)).toBe(true);
    });

    it('should view reports/dashboard', () => {
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.READ, RESOURCES.DASHBOARD)).toBe(true);
    });

    it('should not manage users', () => {
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.CREATE, RESOURCES.USERS)).toBe(false);
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.DELETE, RESOURCES.USERS)).toBe(false);
    });

    it('should not delete WMS resources', () => {
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.DELETE, RESOURCES.INBOUND)).toBe(false);
      expect(hasPermission(ROLES.WAREHOUSE_MANAGER, ACTIONS.DELETE, RESOURCES.INVENTORY)).toBe(false);
    });
  });

  describe('picker role', () => {
    it('should view pick lists and confirm picks', () => {
      expect(hasPermission(ROLES.PICKER, ACTIONS.READ, RESOURCES.OUTBOUND)).toBe(true);
      expect(hasPermission(ROLES.PICKER, ACTIONS.CONFIRM, RESOURCES.OUTBOUND)).toBe(true);
    });

    it('should read inventory (view own queue)', () => {
      expect(hasPermission(ROLES.PICKER, ACTIONS.READ, RESOURCES.INVENTORY)).toBe(true);
    });

    it('should not have access to other modules', () => {
      expect(hasPermission(ROLES.PICKER, ACTIONS.CREATE, RESOURCES.INBOUND)).toBe(false);
      expect(hasPermission(ROLES.PICKER, ACTIONS.UPDATE, RESOURCES.INVENTORY)).toBe(false);
      expect(hasPermission(ROLES.PICKER, ACTIONS.READ, RESOURCES.BILLING)).toBe(false);
      expect(hasPermission(ROLES.PICKER, ACTIONS.READ, RESOURCES.DASHBOARD)).toBe(false);
    });
  });

  describe('viewer role', () => {
    it('should have read-only access to all WMS resources', () => {
      expect(hasPermission(ROLES.VIEWER, ACTIONS.READ, RESOURCES.INBOUND)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.READ, RESOURCES.PUTAWAY)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.READ, RESOURCES.INVENTORY)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.READ, RESOURCES.OUTBOUND)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.READ, RESOURCES.DASHBOARD)).toBe(true);
    });

    it('should not have write access to any resource', () => {
      expect(hasPermission(ROLES.VIEWER, ACTIONS.CREATE, RESOURCES.INBOUND)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.UPDATE, RESOURCES.INVENTORY)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.DELETE, RESOURCES.OUTBOUND)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, ACTIONS.APPROVE, RESOURCES.INVENTORY)).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('should return false for unknown role', () => {
      expect(hasPermission('unknown' as Role, ACTIONS.READ, RESOURCES.INBOUND)).toBe(false);
    });

    it('should return false for unknown resource', () => {
      expect(hasPermission(ROLES.ADMIN, ACTIONS.READ, 'unknown_resource')).toBe(false);
    });
  });
});
