// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

export async function fetchWithTimeout(params: {
  url: string;
  options: RequestInit;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const { url, options, timeoutMs, signal } = params;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
