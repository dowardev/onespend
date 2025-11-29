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
}

const suppliersController = new SystemConfigController();
export default suppliersController;
export { SystemConfigController };
