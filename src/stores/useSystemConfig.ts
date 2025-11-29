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

  return {
    designMode,
    init,
    setDesignMode,
    getDesignMode,
  };
});
