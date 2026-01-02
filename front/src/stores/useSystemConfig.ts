import { defineStore } from 'pinia';
import { ref } from 'vue';
import { isPlatform } from '@ionic/vue';
import { configController } from '@/controllers/dixie';

export type SystemMode = 'ios' | 'md';
export type ThemeMode = 'light' | 'dark' | 'auto';

export const useSystemConfig = defineStore('systemConfig', () => {
  const designMode = ref<SystemMode>(isPlatform('ios') ? 'ios' : 'md');
  const theme = ref<ThemeMode>('auto');

  function init() {
    designMode.value = isPlatform('ios') ? 'ios' : 'md';
  }

  function setDesignMode(params: { mode: SystemMode }) {
    const { mode } = params;
    designMode.value = mode;
  }

  function getDesignMode() {
    return designMode.value;
  }

  const migrationNoticeDismissed = ref(false);
  function setMigrationNoticeDismissed(val: boolean) {
    migrationNoticeDismissed.value = !!val;
  }
  function getMigrationNoticeDismissed() {
    return migrationNoticeDismissed.value;
  }

  async function getTheme(): Promise<ThemeMode> {
    if (theme.value !== 'auto') return theme.value;
    const saved = await configController.getConfig('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
    return 'auto';
  }

  async function setTheme(val: ThemeMode) {
    theme.value = val;
    await configController.setConfig({ key: 'theme', value: val });
  }

  return {
    designMode,
    theme,
    init,
    setDesignMode,
    getDesignMode,
    migrationNoticeDismissed,
    setMigrationNoticeDismissed,
    getMigrationNoticeDismissed,
    getTheme,
    setTheme,
  };
});
