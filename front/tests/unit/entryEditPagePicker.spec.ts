// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// CategoryPickerModal (LBDS-210 §1): the entry form's category picker shows ALL
// global categories, alphabetical, grouped by first letter (ion-item-divider).
// No section filtering — sections are a Performance-page concept configured in
// the Performance config panel. Search is accent- and case-insensitive.

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import CategoryPickerModal from '@/components/CategoryPickerModal.vue'
import { entryCategoriesDb, INCOME_SECTION_MAP_KEY } from '@/db/controllers/entryCategoriesDb'
import { configDb } from '@/db/controllers/configDb'
import { db } from '@/db/OneSpendDB'
import type { EntryCategoryRow } from '@/db/types'

const stubs = {
  IonModal: {
    props: ['isOpen'],
    template: '<div v-if="isOpen === true || isOpen"><slot /></div>',
  },
  IonHeader: { template: '<div><slot /></div>' },
  IonToolbar: { template: '<div><slot /></div>' },
  IonTitle: { template: '<span><slot /></span>' },
  IonButtons: { template: '<div><slot /></div>' },
  IonButton: { template: '<button><slot /></button>' },
  IonIcon: { template: '<i><slot /></i>' },
  IonContent: { template: '<div><slot /></div>' },
  IonItem: { template: '<div><slot /></div>' },
  IonSearchbar: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', ($event.target).value)" />',
  },
  IonList: { template: '<div><slot /></div>' },
  IonItemDivider: { template: '<div><slot /></div>' },
  IonLabel: { template: '<span><slot /></span>' },
  IonCard: { template: '<div><slot /></div>' },
  IonAlert: { template: '<div />' },
  QuickCategoryAlert: { template: '<div />' },
}

describe('CategoryPickerModal', () => {
  beforeEach(async () => {
    await db.entryCategories.clear()
    await entryCategoriesDb.ensureSeeded()
    await configDb.delete({ key: INCOME_SECTION_MAP_KEY })
  })

  async function allCategories(): Promise<EntryCategoryRow[]> {
    return entryCategoriesDb.getAll()
  }

  it('shows ALL categories (alphabetical) regardless of entry type — no section filter', async () => {
    const cats = await allCategories()
    const wrapper = mount(CategoryPickerModal, {
      props: { isOpen: true, categories: cats, selectedId: null },
      global: { stubs },
    })

    const texts = wrapper.text()
    expect(texts).toContain('Salario')
    expect(texts).toContain('Alimentación')
    expect(texts).toContain('Entretenimiento')
    expect(texts).toContain('Intereses y comisiones')
  })

  it('groups categories by first letter with ion-item-divider (sticky)', async () => {
    const cats = await allCategories()
    const wrapper = mount(CategoryPickerModal, {
      props: { isOpen: true, categories: cats, selectedId: null },
      global: { stubs },
    })

    const texts = wrapper.text()
    expect(texts).toContain('Salario')
    expect(texts).toContain('Alimentación')
    expect(texts).toContain('Entretenimiento')
    // the divider letters exist
    expect(texts).toContain('S')
    expect(texts).toContain('A')
  })

  it('search is accent- and case-insensitive (normalize NFD)', async () => {
    const cats = await allCategories()
    const wrapper = mount(CategoryPickerModal, {
      props: { isOpen: true, categories: cats, selectedId: null },
      global: { stubs },
    })

    const input = wrapper.find('input')
    await input.setValue('alimentacion')
    await wrapper.vm.$nextTick()

    const texts = wrapper.text()
    expect(texts).toContain('Alimentación')
    expect(texts).not.toContain('Salario')

    // case-insensitive
    await input.setValue('SAL')
    await wrapper.vm.$nextTick()
    const texts2 = wrapper.text()
    expect(texts2).toContain('Salario')
    expect(texts2).not.toContain('Alimentación')
  })
})