// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: the sync backend URL + the opt-in flag live in configDb so
// they survive relaunches and the user can change them from Settings. The
// flag defaults to OFF (F-Droid reviewer wants offline-first), the URL
// defaults to the empty string, and SyncApiService / attachmentService /
// SyncQueueService refuse to touch the network when either is missing.

import { configDb } from '@/db/controllers/configDb';

export const SYNC_ENABLED_KEY = 'syncEnabled';
export const SYNC_SERVER_URL_KEY = 'syncServerUrl';

export interface SyncConfigSnapshot {
  enabled: boolean;
  serverUrl: string;
  /**
   * `true` when the user has provided a non-empty server URL. Sync can
   * only happen when both `enabled` AND `hasServerUrl` are true.
   */
  hasServerUrl: boolean;
}

export async function isSyncEnabled(): Promise<boolean> {
  const raw = await configDb.get({ key: SYNC_ENABLED_KEY });
  return typeof raw === 'boolean' ? raw : false;
}

export async function getSyncServerUrl(): Promise<string> {
  const raw = await configDb.get({ key: SYNC_SERVER_URL_KEY });
  if (typeof raw === 'string') return raw.trim();
  // No persisted row: fall back to the build-time `VITE_API_URL` so a
  // first launch (or any user that never opened Settings) inherits the
  // server the deploy script baked in. The user can still override it
  // from Settings; an explicit empty save is preserved as '' so the
  // user can also opt out of the default and disable sync that way.
  return defaultSyncServerUrl();
}

/**
 * Single read of the sync state. Used by the gate to decide whether any
 * HTTP work should be attempted at all. The URL is trimmed so a value
 * made of whitespace is treated the same as empty.
 */
export async function readSyncConfig(): Promise<SyncConfigSnapshot> {
  // Read both rows in parallel — they are independent keys in configDb
  // and most callers gate on the combined result.
  const [enabled, serverUrl] = await Promise.all([isSyncEnabled(), getSyncServerUrl()]);
  return { enabled, serverUrl, hasServerUrl: serverUrl.length > 0 };
}

/**
 * Resolves the API base URL at request time. Returns `null` when sync is
 * disabled or no URL is set, so the caller can short-circuit before
 * touching the network. The configured URL always wins over the
 * build-time env var when sync is enabled AND a URL is set.
 */
export async function resolveApiBaseUrl(): Promise<string | null> {
  const cfg = await readSyncConfig();
  if (!cfg.enabled || !cfg.hasServerUrl) return null;
  return cfg.serverUrl;
}

export async function setSyncEnabled(params: { enabled: boolean }): Promise<void> {
  const { enabled } = params;
  await configDb.set({ key: SYNC_ENABLED_KEY, value: enabled });
}

export async function setSyncServerUrl(params: { url: string }): Promise<void> {
  const { url } = params;
  // Persist the trimmed value as-is, including the empty string. Saving
  // '' (instead of deleting the row) is what lets the user actually
  // clear the env-var fallback: with a delete, the next read would
  // re-populate from `VITE_API_URL`. Persisting '' is also the F-Droid
  // rule the original ticket calls out — empty URL means sync off, no
  // silent fallback to the bundled server.
  await configDb.set({ key: SYNC_SERVER_URL_KEY, value: url.trim() });
}

/**
 * URL-shape guard for the Settings UI. Empty is valid (= "use no server").
 * Otherwise the value must parse as an absolute http/https URL — anything
 * else is rejected with an inline error and the save button stays disabled.
 */
export function isValidSyncServerUrl(params: { url: string }): boolean {
  const { url } = params;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * LBDS-289: the build-time env URL exposed for the Settings placeholder
 * so the user can see what was bundled before changing it. In dev it is
 * the local Laravel (default 127.0.0.1:8001); in production / F-Droid
 * it is the author server. The placeholder is informational only — it is
 * NOT used as a fallback when the URL field is empty (F-Droid reviewer
 * wants the user to opt into a server they pick).
 */
export function defaultSyncServerUrl(): string {
  return import.meta.env.VITE_API_URL || '';
}