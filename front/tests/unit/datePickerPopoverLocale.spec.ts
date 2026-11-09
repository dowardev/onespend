// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// GitLab #17 (P6): the date picker used to force `locale="en-US"`, so the
// month names showed in English inside the Spanish app. The picker now
// follows the active app language ('es' → 'es-ES', 'en' → 'en-US'), and an
// explicit `locale` prop still wins.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue'

const stubs = {
  IonPopover: { template: '<div><slot /></div>' },
  IonContent: { template: '<div><slot /></div>' },
  IonItem: { template: '<div><slot /></div>' },
  IonButton: { template: '<button><slot /></button>' },
  IonDatetime: {
    props: ['modelValue', 'presentation', 'locale', 'hourCycle'],
    template: '<div class="fake-datetime"></div>',
  },
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(DatePickerPopover, {
    props,
    global: { stubs },
  })
}

function datetimeLocale(wrapper: ReturnType<typeof mountPicker>): string | undefined {
  return wrapper.findComponent(stubs.IonDatetime).props('locale')
}

describe('DatePickerPopover — locale follows the app language (GitLab #17, P6)', () => {
  const i18n = (globalThis as unknown as {
    __i18n?: { global: { locale: { value: string } } }
  }).__i18n

  let previousLocale = 'es'

  beforeEach(() => {
    previousLocale = i18n?.global.locale.value ?? 'es'
  })

  afterEach(() => {
    if (i18n) {
      i18n.global.locale.value = previousLocale
    }
  })

  it('renders the Spanish regional tag when the app is in Spanish', () => {
    if (i18n) {
      i18n.global.locale.value = 'es'
    }

    const wrapper = mountPicker()

    expect(datetimeLocale(wrapper)).toBe('es-ES')
  })

  it('renders the English regional tag when the app is in English', () => {
    if (i18n) {
      i18n.global.locale.value = 'en'
    }

    const wrapper = mountPicker()

    expect(datetimeLocale(wrapper)).toBe('en-US')
  })

  it('keeps an explicit locale prop over the app language', () => {
    if (i18n) {
      i18n.global.locale.value = 'es'
    }

    const wrapper = mountPicker({ locale: 'de-DE' })

    expect(datetimeLocale(wrapper)).toBe('de-DE')
  })
})
