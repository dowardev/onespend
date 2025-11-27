import { defineStore } from 'pinia';
import { ref } from 'vue';
import { isPlatform } from '@ionic/vue';

export type SystemMode = 'ios' | 'md';

export const useSystemConfig = defineStore('systemConfig', () => {
  // storea el modo de diseño actual: 'ios' o 'md'
  const deisgnMode = ref<SystemMode>(isPlatform('ios') ? 'ios' : 'md');

  function init() {
    // inicializa/actualiza el modo según la plataforma
    deisgnMode.value = isPlatform('ios') ? 'ios' : 'md';
  }

  function setDesignMode(m: SystemMode) {
    deisgnMode.value = m;
  }

  function getDesignMode() {
    return deisgnMode.value;
  }

  return {
    deisgnMode,
    init,
    setDesignMode,
    getDesignMode,
  };
});
