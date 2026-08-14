// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useSystemConfig } from '../stores/useSystemConfig';

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
}

const suppliersController = new SystemConfigController();
export default suppliersController;
export { SystemConfigController };
