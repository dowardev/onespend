import dixieController, { DixieController } from './dixie';
import { useTemplatesStore } from '../stores/templatesStore';

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

  get templates() {
    const store = useTemplatesStore();
    return store.templates;
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

      const store = useTemplatesStore();
      const mapped = templates.map(t => ({
        id: t.id || '',
        name: t.name,
        description: t.description,
        suppliers: (t as any).suppliers || [],
        suppliersSnapshot: (t as any).suppliersSnapshot || [],
      }));

      store.setTemplates(mapped);

      return mapped;
    } catch (e) {
      console.error('TemplateController.listTemplates error', e);
      return [];
    }
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
        const numericId =
          typeof template.id === 'string' && !Number.isNaN(Number(template.id))
            ? Number(template.id)
            : template.id;

        key = await this.dixie.putEntry({
          entry: {
            id: numericId,
            type: 'template',
            payload: entry,
          },
        });
      } else {
        key = await this.dixie.addEntry({
          entry: { type: 'template', payload: entry },
        });
      }

      const store = useTemplatesStore();
      store.addOrUpdateTemplate({
        id: key as string | number | null,
        name: entry.name,
        description: entry.description,
        suppliers: (entry as any).suppliers || [],
        suppliersSnapshot: (entry as any).suppliersSnapshot || [],
      });

      return key;
    } catch (e) {
      console.error('TemplateController.saveTemplate error', e);
      throw e;
    }
  }

  async deleteTemplate(params: { id: IDBValidKey }) {
    const { id } = params;
    try {
      const numericId =
        typeof id === 'string' && !Number.isNaN(Number(id)) ? Number(id) : id;

      await this.dixie.deleteBackup(numericId as IDBValidKey);

      const store = useTemplatesStore();
      store.removeTemplate(id);

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
