import dixieController, { DixieController } from './dixie';
// import store lazily to avoid calling useTemplatesStore before Pinia is initialized

export type TemplateRecord = {
  id?: number | string;
  name: string;
  description?: string;
  createdAt: number;
};

class TemplateController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
  }

  async saveTemplate(params: {
    template: Partial<Omit<TemplateRecord, 'createdAt'>> & { id?: IDBValidKey };
  }) {
    const { template } = params;

    const entry: TemplateRecord = {
      ...(template as Omit<TemplateRecord, 'createdAt'>),
      createdAt: Date.now(),
    };

    try {
      let key: IDBValidKey;
      if (template && template.id) {
        // existing template -> update
        // keep id as numeric when possible
        const numericId =
          typeof template.id === 'string' && !Number.isNaN(Number(template.id))
            ? Number(template.id)
            : template.id;

        key = await this.dixie.putEntry({
          id: numericId,
          type: 'template',
          payload: entry,
        });
      } else {
        key = await this.dixie.addEntry({
          type: 'template',
          payload: entry,
        });
      }

      // After saving to DB, refresh the Pinia store (controller is the center)
      try {
        // Lazy-import the store so we don't call useTemplatesStore before Pinia is ready
        const mod = await import('../stores/templatesStore');
        const store = mod.useTemplatesStore();
        // trigger a reload from the DB to ensure store is in sync
        await this.listTemplates();
      } catch (e) {
        // If the store can't be used (e.g. before app init), ignore
        // The DB still has the saved template.
      }

      return key;
    } catch (e) {
      console.error('TemplateController.saveTemplate error', e);
      throw e;
    }
  }

  async listTemplates() {
    try {
      const all = (await this.dixie.listBackups()) as Array<
        Record<string, unknown> & {
          id?: IDBValidKey;
          type?: string;
          payload?: unknown;
        }
      >;
      const templates = (all || [])
        .filter(x => x && x.type === 'template')
        .map(x => {
          const payload =
            x.payload && typeof x.payload === 'object'
              ? (x.payload as Record<string, unknown>)
              : {};
          return { ...(payload as Record<string, unknown>), id: String(x.id) };
        }) as TemplateRecord[];

      // Update Pinia store if available (lazy import to avoid using Pinia before init)
      try {
        const mod = await import('../stores/templatesStore');
        const store = mod.useTemplatesStore();
        // Clear existing templates and push items individually to avoid deep type instantiation
        store.templates.length = 0;
        for (const t of templates) {
          (store.templates as any).push({
            id: t.id || '',
            name: t.name,
            description: t.description,
            suppliers: (t as any).suppliers || [],
            suppliersSnapshot: (t as any).suppliersSnapshot || [],
          });
        }
      } catch (e) {
        // ignore pinia errors (e.g. store not initialized yet)
      }

      return templates;
    } catch (e) {
      console.error('TemplateController.listTemplates error', e);
      return [] as TemplateRecord[];
    }
  }

  async deleteTemplate(params: { id: IDBValidKey }) {
    const { id } = params;
    try {
      console.log(
        'TemplateController.deleteTemplate: deleting id',
        id,
        '(type:',
        typeof id,
        ')'
      );
      await this.dixie.deleteBackup(id);

      // Refresh Pinia store
      try {
        await this.listTemplates();
      } catch (e) {
        /* noop */
      }

      return true;
    } catch (e) {
      console.error('TemplateController.deleteTemplate error', e);
      throw e;
    }
  }
}

const templateController = new TemplateController();
export default templateController;
export { TemplateController };
