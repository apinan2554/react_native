/**
 * Auth Store - Zustand state management for authentication
 *
 * Manages user session state including login/logout,
 * screen lock, and activity tracking.
 *
 * Requirements: 13.1, 13.2
 */

import { create } from 'zustand';
import { Role } from '../shared/constants/auth';

export interface AuthUser {
  userId: string;
  role: Role;
  token: string;
}

export interface AuthState {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  lastActivity: number; // timestamp
}

export interface AuthActions {
  login: (user: AuthUser) => void;
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: () => void;
  updateActivity: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  // State
  currentUser: null,
  isAuthenticated: false,
  isLocked: false,
  lastActivity: 0,

  // Actions
  login: (user: AuthUser) =>
    set({
      currentUser: user,
      isAuthenticated: true,
      isLocked: false,
      lastActivity: Date.now(),
    }),

  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
      isLocked: false,
      lastActivity: 0,
    }),

  lockScreen: () =>
    set({
      isLocked: true,
    }),

  unlockScreen: () =>
    set({
      isLocked: false,
      lastActivity: Date.now(),
    }),

  updateActivity: () =>
    set({
      lastActivity: Date.now(),
    }),
}));
