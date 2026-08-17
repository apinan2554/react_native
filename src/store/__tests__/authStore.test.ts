/**
 * Unit tests for authStore
 */

import { useAuthStore, AuthUser } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: false,
      isLocked: false,
      lastActivity: 0,
    });
  });

  const mockUser: AuthUser = {
    userId: 'user-1',
    role: 'warehouse_manager',
    token: 'test-token-123',
  };

  describe('initial state', () => {
    it('should have default state', () => {
      const state = useAuthStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLocked).toBe(false);
      expect(state.lastActivity).toBe(0);
    });
  });

  describe('login', () => {
    it('should set user and authenticate', () => {
      useAuthStore.getState().login(mockUser);

      const state = useAuthStore.getState();
      expect(state.currentUser).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLocked).toBe(false);
      expect(state.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('logout', () => {
    it('should clear user and authentication', () => {
      useAuthStore.getState().login(mockUser);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLocked).toBe(false);
      expect(state.lastActivity).toBe(0);
    });
  });

  describe('lockScreen', () => {
    it('should lock the screen', () => {
      useAuthStore.getState().login(mockUser);
      useAuthStore.getState().lockScreen();

      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('unlockScreen', () => {
    it('should unlock the screen and update activity', () => {
      useAuthStore.getState().login(mockUser);
      useAuthStore.getState().lockScreen();
      useAuthStore.getState().unlockScreen();

      const state = useAuthStore.getState();
      expect(state.isLocked).toBe(false);
      expect(state.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity timestamp', () => {
      const before = Date.now();
      useAuthStore.getState().updateActivity();
      const after = Date.now();

      const { lastActivity } = useAuthStore.getState();
      expect(lastActivity).toBeGreaterThanOrEqual(before);
      expect(lastActivity).toBeLessThanOrEqual(after);
    });
  });
});
