// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useSystemConfig } from '../stores/useSystemConfig';
import type { ThemeMode } from '../stores/useSystemConfig';

class SystemConfigController {
  init(_params: Record<string, unknown> = {}) {
    const store = useSystemConfig();
    store.init();
  }

  getDesignMode(_params: Record<string, unknown> = {}) {
    const store = useSystemConfig();
    return store.getDesignMode();
  }

  setDesignMode(params: { mode: 'ios' | 'md' }) {
    const { mode } = params;

    const store = useSystemConfig();
    store.setDesignMode({ mode });
  }

  getMigrationNoticeDismissed() {
    const store = useSystemConfig();
    return store.getMigrationNoticeDismissed();
  }

  setMigrationNoticeDismissed(params: { value: boolean }) {
    const { value } = params;
    const store = useSystemConfig();
    store.setMigrationNoticeDismissed(!!value);
  }

  async getTheme(): Promise<ThemeMode> {
    const store = useSystemConfig();
    return store.getTheme();
  }

  async setTheme(params: { value: ThemeMode }) {
    const { value } = params;
    const store = useSystemConfig();
    await store.setTheme(value);
  }

  async getAutoLightTheme(): Promise<ThemeMode> {
    const store = useSystemConfig();
    return store.getAutoLightTheme();
  }

  async setAutoLightTheme(params: { value: ThemeMode }) {
    const { value } = params;
    const store = useSystemConfig();
    await store.setAutoLightTheme(value);
  }

  async getAutoDarkTheme(): Promise<ThemeMode> {
    const store = useSystemConfig();
    return store.getAutoDarkTheme();
  }

  async setAutoDarkTheme(params: { value: ThemeMode }) {
    const { value } = params;
    const store = useSystemConfig();
    await store.setAutoDarkTheme(value);
  }

  async getWeekStartDay(): Promise<number> {
    const store = useSystemConfig();
    return store.getWeekStartDay();
  }

  async setWeekStartDay(params: { value: number }) {
    const { value } = params;
    const store = useSystemConfig();
    await store.setWeekStartDay(value);
  }
}

const suppliersController = new SystemConfigController();
export default suppliersController;
export { SystemConfigController };
