// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useMediaQuery(query: string) {
  const matches = ref(false);
  let mql: MediaQueryList | null = null;

  function update(event?: MediaQueryListEvent) {
    if (mql) matches.value = event ? event.matches : mql.matches;
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    mql = window.matchMedia(query);
    matches.value = mql.matches;
    mql.addEventListener('change', update);
  });

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', update);
  });

  return matches;
}
