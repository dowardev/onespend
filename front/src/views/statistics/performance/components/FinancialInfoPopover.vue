<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <span class="info-wrapper" :class="{ 'info-wrapper--inline': inline }">
    <span
      :id="triggerId"
      class="trigger-slot"
      tabindex="0"
      role="button"
      @keydown.enter="handleKeyboard($event)"
      @keydown.space.prevent="handleKeyboard($event)"
    >
      <slot name="trigger" />
    </span>

    <ion-popover
      :trigger="triggerId"
      trigger-action="click"
      side="top"
      alignment="end"
      class="info-popover"
    >
      <div class="popover-content">
        <strong class="popover-title">{{ entry.term }}</strong>
        <p class="popover-desc">{{ entry.definition }}</p>
        <div v-if="entry.formula" class="popover-formula">
          <strong>{{ t('statistics.performance.financialInfo.calculation') }}</strong>
          <code>{{ entry.formula }}</code>
        </div>
      </div>
    </ion-popover>
  </span>
</template>

<script lang="ts">
let idCounter = 0
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { IonPopover } from '@ionic/vue'
import { useGlossary, type GlossaryEntry, type GlossaryKey } from '@/composables/useFinancialGlossary'
import { useLocale } from '@/composables/useLocale'

const props = defineProps<{
  term: string
  inline?: boolean
}>()

const { t } = useLocale()

const triggerId = `info-trigger-${++idCounter}`

const entry = computed<GlossaryEntry>(() => {
  const found = useGlossary(props.term as GlossaryKey)
  if (found) return found
  return {
    term: props.term,
    definition: t('statistics.performance.financialInfo.noDescription'),
  }
})

function handleKeyboard(event: Event) {
  ;(event.currentTarget as HTMLElement)?.click()
}
</script>

<style scoped>
.info-wrapper {
  display: inline-flex;
  vertical-align: middle;
}

.info-wrapper--inline {
  margin-left: 4px;
}

.trigger-slot {
  display: inline-flex;
  cursor: pointer;
}

.trigger-slot:focus-visible {
  outline: 2px solid var(--ion-color-primary, #3880ff);
  outline-offset: 2px;
  border-radius: 2px;
}

.info-popover {
  --width: auto;
  --max-width: 300px;
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
}

.popover-content {
  padding: 12px 16px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.popover-title {
  display: block;
  margin-bottom: 6px;
  font-size: 0.95rem;
}

.popover-desc {
  margin: 0 0 8px;
  color: var(--ion-color-medium);
}

.popover-formula {
  padding: 6px 8px;
  background: var(--ion-color-light);
  border-radius: 6px;
  font-size: 0.8rem;
}

.popover-formula code {
  display: block;
  margin-top: 2px;
  font-weight: 600;
  color: var(--ion-color-primary, #3880ff);
}
</style>
