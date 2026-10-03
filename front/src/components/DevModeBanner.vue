<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div
    v-if="show"
    class="dev-footer"
    role="status"
    aria-live="polite"
    data-testid="dev-mode-banner"
  >
    <span class="dev-footer__text">{{ label }}</span>

    <button
      type="button"
      class="dev-footer__close"
      aria-label="Cerrar banner"
      data-testid="dev-banner-close"
      @click="dismiss"
    >
      <IonIcon
        :icon="closeOutline"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
// Version is read from the CHANGELOG.md (canonical release artifact),
// skipping the `[Unreleased]` heading and taking the first released
// version header (`## [vX.Y.Z] - YYYY-MM-DD`).
import changelogRaw from '../../CHANGELOG.md?raw';

const DISMISS_KEY = 'onespend:dev-banner-dismissed-for';

// The footer only dismisses for the version the user closed it on. Any
// new release (even a patch) re-shows it, so the user sees when the app
// crossed to "estable" (major >= 1).
const show = ref(true);
const currentVersion = ref<string | null>(null);

function readCurrentVersion(): string | null {
  const match = changelogRaw.match(/^##\s+\[v(\d+\.\d+\.\d+)\]/m);
  return match ? match[1] : null;
}

function isMajorAtLeast(version: string, target: number): boolean {
  const major = Number(version.split('.')[0]);
  return Number.isFinite(major) && major >= target;
}

function syncShow(): void {
  const v = currentVersion.value;
  if (!v) {
    // Could not parse a version; show the banner so the user is not misled.
    show.value = true;
    return;
  }
  try {
    const dismissedFor = localStorage.getItem(DISMISS_KEY);
    show.value = dismissedFor !== v;
  } catch (_e) {
    // localStorage unavailable; default to showing.
    show.value = true;
  }
}

const label = computed(() => {
  const v = currentVersion.value;
  if (!v) return 'OneSpend en desarrollo activo';
  if (isMajorAtLeast(v, 1)) return `OneSpend v${v} estable`;
  return `OneSpend en desarrollo activo · v${v}`;
});

function dismiss(): void {
  if (currentVersion.value) {
    try {
      localStorage.setItem(DISMISS_KEY, currentVersion.value);
    } catch (_e) {
      // ignore
    }
  }
  show.value = false;
}

onMounted(() => {
  currentVersion.value = readCurrentVersion();
  syncShow();
});

// Watch for runtime updates (e.g. HMR in dev) — re-evaluate when the
// computed label changes so the banner reappears on version bumps.
watch(currentVersion, () => {
  syncShow();
});
</script>

<style scoped>
.dev-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 26px;
  padding: 4px 16px;
  background: var(--ion-color-warning-tint, rgba(255, 193, 7, 0.18));
  color: var(--ion-color-warning-shade, #5e4500);
  font-size: 12px;
  font-weight: 500;
  border-top: 1px solid var(--ion-color-warning, #ffc107);
  backdrop-filter: saturate(180%) blur(4px);
  -webkit-backdrop-filter: saturate(180%) blur(4px);
}

@media (prefers-color-scheme: dark) {
  .dev-footer {
    color: var(--ion-color-warning-contrast, #ffe082);
  }
}

.dev-footer__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.dev-footer__close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 14px;
  border-radius: 4px;
  transition: background 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dev-footer__close:hover,
.dev-footer__close:focus-visible {
  background: rgba(0, 0, 0, 0.08);
}
</style>