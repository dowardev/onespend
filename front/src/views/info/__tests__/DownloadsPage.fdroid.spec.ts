// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only
//
// The F-Droid entry on the Downloads page points to the F-Droid package page:
// the app is live in the index, so the entry must be enabled (badge +
// download button) and must not point to a versioned APK URL that breaks
// while the buildserver compiles the next version.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import DownloadsPage from '@/views/info/DownloadsPage.vue';

const FDROID_PACKAGE_URL = 'https://f-droid.org/packages/com.dowardev.onespend/';

function mountPage(locale: 'es' | 'en' = 'es') {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: 'en',
    messages: { es, en },
  });

  return mount(DownloadsPage, { global: { plugins: [i18n] } });
}

/**
 * The Ionic accordion renders its `value` as a prop, not as a DOM attribute,
 * so the F-Droid block is located by the brand name in its header.
 */
function findFdroidBlock(wrapper: ReturnType<typeof mountPage>) {
  const block = wrapper
    .findAll('ion-accordion')
    .find((accordion) => accordion.text().includes('F-Droid'));

  expect(block, 'the F-Droid accordion must exist').toBeTruthy();

  return block!;
}

describe('DownloadsPage · F-Droid entry', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('marks F-Droid as available instead of coming soon', () => {
    const wrapper = mountPage();

    const badge = findFdroidBlock(wrapper).find('ion-badge');

    expect(badge.text()).toBe('Disponible');
    expect(badge.text()).not.toBe('Próximamente');
  });

  it('enables the F-Droid download button and opens the package page', async () => {
    const wrapper = mountPage();

    const button = findFdroidBlock(wrapper).find('ion-button');

    expect(button.exists()).toBe(true);
    expect(button.attributes('disabled')).toBeUndefined();

    await button.trigger('click');

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(FDROID_PACKAGE_URL, '_blank', 'noopener');
  });

  it('renders the requirements and store rows in the active language', () => {
    const english = mountPage('en').text();

    expect(english).toContain('Android 7.0 (Nougat) or higher');
    expect(english).toContain('Universal — works on any distribution');
    expect(english).toContain('Windows 10 and 11');
    expect(english).toContain('Terminal install');

    // No hardcoded Spanish left in the page
    for (const spanish of [
      'Nougat) o superior',
      'sin instalar',
      'paquete -bin',
      'Instalación por terminal',
      'Descarga directa · sin cuenta',
      'Windows 10 y 11',
      'Repositorio · openSUSE',
    ]) {
      expect(english, `the English page must not contain "${spanish}"`).not.toContain(spanish);
    }

    const spanish = mountPage('es').text();

    expect(spanish).toContain('Android 7.0 (Nougat) o superior');
    expect(spanish).toContain('Universal — funciona en cualquier distribución');
    expect(spanish).toContain('Windows 10 y 11');
    expect(spanish).toContain('Instalación por terminal');
  });
});
