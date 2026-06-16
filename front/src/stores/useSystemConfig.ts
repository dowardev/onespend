import { defineStore } from 'pinia';
import { ref } from 'vue';
import { isPlatform } from '@ionic/vue';
import { configDb } from '@/db/controllers/configDb';

export type SystemMode = 'ios' | 'md';
export type ThemeMode =
  | 'light'
  | 'dark'
  | 'auto'
  | 'catppuccin-latte-maroon'
  | 'catppuccin-macchiato-maroon';

export const useSystemConfig = defineStore('systemConfig', () => {
  const designMode = ref<SystemMode>(isPlatform('ios') ? 'ios' : 'md');
  const theme = ref<ThemeMode>('auto');
  const autoLightTheme = ref<ThemeMode>('light');
  const autoDarkTheme = ref<ThemeMode>('dark');

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
    const saved = await configDb.get({ key: 'theme' });
    if (
      ['light', 'dark', 'auto', 'catppuccin-latte-maroon', 'catppuccin-macchiato-maroon'].includes(
        saved as ThemeMode,
      )
    ) {
      return saved as ThemeMode;
    }
    return 'auto';
  }

  async function setTheme(val: ThemeMode) {
    theme.value = val;
    await configDb.set({ key: 'theme', value: val });
  }

  async function getAutoLightTheme(): Promise<ThemeMode> {
    const saved = await configDb.get({ key: 'autoLightTheme' });
    if (
      ['light', 'dark', 'catppuccin-latte-maroon', 'catppuccin-macchiato-maroon'].includes(
        saved as ThemeMode,
      )
    ) {
      return saved as ThemeMode;
    }
    return 'light';
  }

  async function setAutoLightTheme(val: ThemeMode) {
    autoLightTheme.value = val;
    await configDb.set({ key: 'autoLightTheme', value: val });
  }

  async function getAutoDarkTheme(): Promise<ThemeMode> {
    const saved = await configDb.get({ key: 'autoDarkTheme' });
    if (
      ['light', 'dark', 'catppuccin-latte-maroon', 'catppuccin-macchiato-maroon'].includes(
        saved as ThemeMode,
      )
    ) {
      return saved as ThemeMode;
    }
    return 'dark';
  }

  async function setAutoDarkTheme(val: ThemeMode) {
    autoDarkTheme.value = val;
    await configDb.set({ key: 'autoDarkTheme', value: val });
  }

  return {
    designMode,
    theme,
    autoLightTheme,
    autoDarkTheme,
    init,
    setDesignMode,
    getDesignMode,
    migrationNoticeDismissed,
    setMigrationNoticeDismissed,
    getMigrationNoticeDismissed,
    getTheme,
    setTheme,
    getAutoLightTheme,
    setAutoLightTheme,
    getAutoDarkTheme,
    setAutoDarkTheme,
  };
});
