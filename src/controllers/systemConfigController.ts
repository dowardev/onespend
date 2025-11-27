import { useSystemConfig } from '../stores/useSystemConfig';

class SystemConfigController {
  init(params: Record<string, unknown> = {}) {
    // Destructure named params (none currently used)
    const {} = params;

    const store = useSystemConfig();
    store.init();
  }

  getDesignMode(params: Record<string, unknown> = {}) {
    const {} = params;

    const store = useSystemConfig();
    return store.getDesignMode();
  }

  setDesignMode(params: { mode: 'ios' | 'md' }) {
    const { mode } = params;

    const store = useSystemConfig();
    store.setDesignMode(mode);
  }
}

const suppliersController = new SystemConfigController();
export default suppliersController;
export { SystemConfigController };
