// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-295: the SSO base URL + the SSO frontend URL live in configDb so
// self-hosters can point login at their own SSO without rebuilding the
// APK. Mirrors the syncConfig pattern (LBDS-289): missing/empty rows
// fall back to the build-time `VITE_SSO_*` constants so a fresh install
// keeps the same behavior as today, and the runtime never reads
// `import.meta.env` directly — the resolver always goes through
// configDb first, then the env fallback. SSO has no opt-out (login is
// always required to be reachable), so unlike syncConfig there is no
// "empty = disabled" branch: every read returns a usable URL.

import { configDb } from '@/db/controllers/configDb';

export const SSO_SERVER_URL_KEY = 'ssoServerUrl';
export const SSO_FRONTEND_URL_KEY = 'ssoFrontendUrl';

/**
 * Reads the saved SSO base URL. Returns the build-time env default
 * (`defaultSsoBaseUrl()`) when the row is missing, empty, or holds a
 * value that does not parse as an absolute http(s) URL — the latter
 * is a defense-in-depth check against a corrupted configDb row and
 * the F-Droid test the LBDS-295 ticket calls out.
 */
export async function getSsoBaseUrl(): Promise<string> {
  const raw = await configDb.get({ key: SSO_SERVER_URL_KEY });
  return resolveOrFallback({
    raw,
    fallback: defaultSsoBaseUrl,
  });
}

/**
 * Reads the saved SSO frontend URL. Same fallback / malformed
 * handling as `getSsoBaseUrl()`.
 */
export async function getSsoFrontendUrl(): Promise<string> {
  const raw = await configDb.get({ key: SSO_FRONTEND_URL_KEY });
  return resolveOrFallback({
    raw,
    fallback: defaultSsoFrontendUrl,
  });
}

export async function setSsoServerUrl(params: { url: string }): Promise<void> {
  const { url } = params;
  // Persist the trimmed value as-is, including empty. Saving '' keeps
  // the row present so the next read still falls back to the env
  // default cleanly (instead of looking like a missing row that would
  // also fall back to the env default, but with no record that the
  // user ever touched the field). Mirrors `setSyncServerUrl`.
  await configDb.set({ key: SSO_SERVER_URL_KEY, value: url.trim() });
}

export async function setSsoFrontendUrl(params: { url: string }): Promise<void> {
  const { url } = params;
  await configDb.set({ key: SSO_FRONTEND_URL_KEY, value: url.trim() });
}

/**
 * URL-shape guard for the Settings UI. Empty is valid (= "use the
 * env-var default"). Otherwise the value must parse as an absolute
 * http/https URL — anything else is rejected with an inline error.
 */
export function isValidSsoServerUrl(params: { url: string }): boolean {
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
 * LBDS-295: build-time env URL exposed for the Settings placeholder
 * so the user can see what was bundled before changing it. It is also
 * the runtime fallback when the persisted row is missing, empty, or
 * malformed.
 */
export function defaultSsoBaseUrl(): string {
  return import.meta.env.VITE_SSO_URL || '';
}

export function defaultSsoFrontendUrl(): string {
  return import.meta.env.VITE_SSO_FRONTEND_URL || '';
}

/**
 * Shared read path for `getSsoBaseUrl` / `getSsoFrontendUrl`. Returns
 * the trimmed persisted value when it parses as an http(s) URL,
 * otherwise calls `fallback()` and logs a warning so a corrupted row
 * is visible in the dev tools without silently taking the user offline.
 */
function resolveOrFallback(params: {
  raw: unknown;
  fallback: () => string;
}): string {
  const { raw, fallback } = params;
  if (typeof raw !== 'string') return fallback();
  const trimmed = raw.trim();
  if (trimmed === '') return fallback();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    // Parses as a URL but not http(s) (e.g. ftp:, ws:, file:) — reject
    // so we never hand a non-http URL to the SSO client.
    // T-02 (pre-merge review): never echo the raw persisted value back
    // into the warning — a self-hoster could have saved a URL with
    // embedded credentials (https://user:pass@auth.example.com) and
    // the devtools console is not a safe place for that.
    console.warn(
      '[sso-config] Persisted SSO URL uses a non-http(s) scheme; falling back to the env-var default',
    );
    return fallback();
  } catch {
    // T-02 (pre-merge review): generic message — the raw value is not
    // echoed (see non-http(s) branch above for the rationale).
    console.warn(
      '[sso-config] Persisted SSO URL did not parse; falling back to the env-var default',
    );
    return fallback();
  }
}