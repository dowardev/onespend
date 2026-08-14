// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { mount } from '@vue/test-utils';
import HomePage from '@/views/HomePage.vue';
import { describe, expect, test } from 'vitest';

describe('HomePage.vue', () => {
  test('renders home vue', () => {
    const wrapper = mount(HomePage);
    expect(wrapper.text()).toMatch('Ready to create an app?');
  });
});
