<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<ion-popover
  :is-open="popoverState.open"
  :event="popoverState.event"
  keep-contents-mounted
  style="--width: 350px; --max-width: calc(100vw - 32px)"
  @did-dismiss="$emit('didDismiss')"
>
    <ion-content class="ion-padding">
    <ion-datetime
      :model-value="tempPickerDateISO"
      :presentation="presentation"
      :locale="resolvedLocale"
      :hour-cycle="hourCycle"
      style="background: transparent; width: 100%"
      @update:model-value="$emit('update:temp-picker-date-iso', $event)"
    />
      <ion-item>
        <ion-button slot="start" fill="clear" size="small" @click="$emit('cancel')">
          {{ t('common.cancel') }}
        </ion-button>
        <ion-button
          slot="end"
          size="small"
          color="primary"
          :disabled="!canApply"
          @click="$emit('apply')"
        >
          {{ t('common.apply') }}
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>
</template>

<script lang="ts" setup>
// 1. Imports (ionic/vue/ionicons)
import { computed } from 'vue';
import { IonPopover, IonContent, IonDatetime, IonItem, IonButton } from '@ionic/vue';

// 2. Controllers / Composables
import { useLocale } from '@/composables/useLocale';

// 3. Components
// (none)

// 4. Interface and types imports
import type { AppLocale } from '@/i18n';

// 5. Main (props, emits, etc.)
const props = defineProps({
  popoverState: { type: Object, default: () => ({ open: false, event: null }) },
  tempPickerDateISO: { type: String, default: null },
  canApply: { type: Boolean, default: false },
  // LBDS-273 (GitLab #13): accept 'date' (default, pre-existing) or 'time'
  // so the same popover can host both the date and the time pickers in
  // EntryEditPage. The component is still named DatePickerPopover for
  // backwards compat (3 call sites in EntryEditPage), but the prop makes
  // it a date-or-time picker. Restricted to the two values we actually
  // use so Vue's runtime prop type matches ion-datetime's `presentation`
  // prop (which is a literal union, not free-form string).
  presentation: { type: String as () => 'date' | 'time', default: 'date' },
  // LBDS-273: the time picker uses a 24h cycle (es-AR convention) instead of
  // ion-datetime's default 12h with a.m./p.m. column. Only meaningful when
  // presentation="time"; the date picker ignores it.
  hourCycle: { type: String as () => 'h12' | 'h23' | 'h24', default: 'h12' },
  // GitLab #17 (P6): an explicit locale still wins, but the empty default
  // means "follow the active app language" instead of forcing 'en-US'.
  locale: { type: String, default: '' },
});

defineEmits<{
  didDismiss: [];
  cancel: [];
  apply: [];
  'update:temp-picker-date-iso': [value: string | null];
}>();

// 6. Vars and const
const { t, locale: appLocale } = useLocale();

// GitLab #17 (P6): the picker used to force `locale="en-US"`, so the month
// names showed in English inside the Spanish app. The app language is
// 'es' | 'en'; ion-datetime needs a full BCP 47 tag, so the app locale is
// mapped to the regional variant it stands for.
const DATETIME_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  es: 'es-ES',
  en: 'en-US',
};

// 7. Watch
// (none)

// 8. Computed
const resolvedLocale = computed<string>(() => {
  const explicit = props.locale.trim();

  if (explicit) {
    return explicit;
  }

  return DATETIME_LOCALE_BY_APP_LOCALE[appLocale.value] ?? 'en-US';
});

// 9. OnMounted
// (none)

// 10. Functions (named parameters pattern)
// (none)
</script>
