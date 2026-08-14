// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { isPlatform } from '@ionic/vue';

export type SystemMode = 'ios' | 'md';

export const useSystemConfig = defineStore('systemConfig', () => {
  // storea el modo de diseño actual: 'ios' o 'md'
  const designMode = ref<SystemMode>(isPlatform('ios') ? 'ios' : 'md');

  function init() {
    // inicializa/actualiza el modo según la plataforma
    designMode.value = isPlatform('ios') ? 'ios' : 'md';
  }

  function setDesignMode(params: { mode: SystemMode }) {
    const { mode } = params;
    designMode.value = mode;
  }

  function getDesignMode() {
    return designMode.value;
  }

  // Migración: preferencia para ocultar el aviso de migración
  const migrationNoticeDismissed = ref(false);
  function setMigrationNoticeDismissed(val: boolean) {
    migrationNoticeDismissed.value = !!val;
  }
  function getMigrationNoticeDismissed() {
    return migrationNoticeDismissed.value;
  }

  return {
    designMode,
    init,
    setDesignMode,
    getDesignMode,
    migrationNoticeDismissed,
    setMigrationNoticeDismissed,
    getMigrationNoticeDismissed,
  };
});
