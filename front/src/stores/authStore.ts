// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { configDb } from '@/db/controllers/configDb';

export interface User {
  id: number;
  name: string;
  user: string;
  email: string;
  isAdmin: boolean;
}

const CACHED_USER_KEY = 'authUser';

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const u = value as Record<string, unknown>;
  // LBDS-289 (F10): reject values that would not survive a round-trip
  // through the SSO backend or that would obviously break the UI.
  // localStorage can be tampered with by any script on the same origin
  // (XSS), so an attacker who already owns the page can plant values
  // that pass these checks. The guard is not security: it is a
  // robustness filter against accidental corruption (truncated JSON,
  // version skew across deploys) so the menu does not render
  // unbounded strings or `undefined`.
  const fieldsValid =
    typeof u.id === 'number' &&
    Number.isFinite(u.id) &&
    typeof u.name === 'string' &&
    typeof u.user === 'string' &&
    typeof u.email === 'string' &&
    typeof u.isAdmin === 'boolean';
  if (!fieldsValid) return false;
  const name = u.name as string;
  const user = u.user as string;
  const email = u.email as string;
  if (name.length > 200 || user.length > 100 || email.length > 320) return false;
  // Cheap email shape check: must contain an @, no whitespace, at
  // least one dot after the @. Not RFC-compliant; that's the SSO
  // server's job.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return true;
}

export const useAuthStore = defineStore('auth', () => {
  // LBDS-289: read the cached user from IndexedDB synchronously enough
  // that the first paint of MainMenu after a reload already shows the
  // user section. The store's `user` ref is hydrated from disk before
  // any component reads `isAuthenticated`. The HTTP-backed
  // ssoClient.getUser() in main.ts still runs in parallel and
  // overwrites this if the backend returns fresh data.
  //
  // Security note: this cache is plain JSON in localStorage. It is
  // exposed to any script running on the same origin (XSS). The
  // accepted risk is that the user object only contains display
  // fields (id, name, username, email, isAdmin) — no tokens, no
  // session secret, no PII beyond what the user already types into a
  // login form on this origin. The SSO token itself lives in the
  // ssoClient's own storage. An XSS attacker who can read localStorage
  // can also call the SSO APIs directly with the live session, so the
  // cache is not a new escalation surface.
  const cached = (() => {
    try {
      // configDb.get is async; we cannot use it during store init. Read
      // from localStorage (sync) as a best-effort fast path so the menu
      // has SOMETHING to render on the first frame, then async hydrate
      // from IndexedDB and overwrite if it differs.
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(CACHED_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  })();

  const user = ref<User | null>(cached);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  // LBDS-289: latch set to true once the user logs out in this
  // session. The async IndexedDB hydration must not restore a stale
  // user after a logout even if the delete failed or is in flight.
  const loggedOut = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const userName = computed(() => user.value?.name || '');
  const userEmail = computed(() => user.value?.email || '');
  const userUsername = computed(() => user.value?.user || '');
  const userIsAdmin = computed(() => user.value?.isAdmin ?? false);

  // Async hydrate from IndexedDB. The localStorage fast-path above
  // covers the first paint; this fixes any drift if localStorage and
  // IndexedDB disagree (e.g. user was updated on another device).
  void (async () => {
    try {
      const stored = await configDb.get({ key: CACHED_USER_KEY });
      // LBDS-289: do not restore a user that was logged out in this
      // session, even if the IndexedDB delete is still in flight or
      // failed silently. The logout() function owns the truth once it
      // runs.
      if (loggedOut.value) return;
      if (isUser(stored) && JSON.stringify(stored) !== JSON.stringify(user.value)) {
        user.value = stored;
      }
    } catch {
      // ignore — store keeps whatever the localStorage fast-path gave us
    }
  })();

  function setUser(u: User | null) {
    user.value = u;
    // Persist so the user survives a reload even if the SSO backend is
    // slow or unreachable on the next cold start. The actual SSO token
    // still lives in its own storage; the user object is just a cached
    // projection of the current session.
    try {
      if (typeof localStorage !== 'undefined') {
        if (u) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
        else localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch {
      // localStorage may be unavailable (private mode, quota). The in-
      // memory value still drives the UI for this session.
    }
    if (u) {
      // A new user object means a fresh login. Clear the logout latch
      // so the next hydration can adopt the latest snapshot.
      loggedOut.value = false;
      void configDb
        .set({ key: CACHED_USER_KEY, value: u })
        .catch(() => {
          // IndexedDB write failure should not break the auth flow.
        });
    } else {
      // setUser(null) is a programmatic logout path. Route through
      // logout() so the latch and IndexedDB delete stay consistent.
      logout();
    }
  }

  function setIsLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(e: string | null) {
    error.value = e;
  }

  function clearError() {
    error.value = null;
  }

  async function logout() {
    // LBDS-289: latch FIRST so the async hydration (which may still
    // be in flight on this same session) cannot restore the user we
    // are about to drop. Then clear both stores in parallel and
    // await the IndexedDB delete so any subsequent hydration sees an
    // empty record.
    loggedOut.value = true;
    user.value = null;
    error.value = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch {
      // ignore
    }
    try {
      await configDb.delete({ key: CACHED_USER_KEY });
    } catch {
      // IndexedDB delete failure is non-fatal: the latch above
      // prevents the in-memory state from being re-hydrated on the
      // next cold start.
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    userName,
    userEmail,
    userUsername,
    userIsAdmin,
    setUser,
    setIsLoading,
    setError,
    clearError,
    logout,
  };
});
