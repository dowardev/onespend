import dixieController, { DixieController } from './dixie';
import { useTemplatesStore } from '../stores/templatesStore';
import { useSync } from '@/composables/useSync';

function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export type TemplateRecord = {
  id?: number | string;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
  createdAt?: number;
  updatedAt?: number;
  synced_at?: number;
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

      for (const template of templates) {
        if (!template.sync_id) {
          template.sync_id = generateSyncId();
          await this.dixie.putEntry({
            entry: {
              id: template.id,
              type: 'template',
              payload: template,
            },
          });
        }
      }

      const store = useTemplatesStore();
      const mapped = templates.map(t => ({
        id: t.id || '',
        sync_id: t.sync_id,
        name: t.name,
        description: t.description,
        suppliers: t.suppliers || [],
        suppliersSnapshot: t.suppliersSnapshot || [],
      }));

      store.setTemplates(mapped);

      return mapped;
    } catch (e) {
      console.error('TemplateController.listTemplates error', e);
      return [];
    }
  }

  async saveTemplate(params: { template: TemplateRecord }) {
    const { template } = params;

    if (!template.sync_id) {
      template.sync_id = generateSyncId();
    }

    const createdAt = template.createdAt || Date.now();
    const entry: TemplateRecord = {
      id: template.id,
      name: template.name,
      sync_id: template.sync_id,
      createdAt,
      updatedAt: Date.now(),
      description: template.description,
      suppliers: template.suppliers,
      suppliersSnapshot: template.suppliersSnapshot,
      serverId: template.serverId,
      synced_at: template.synced_at,
    };

    const { syncTemplate } = useSync();
    syncTemplate(entry, template.id ? 'update' : 'create');

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
        sync_id: entry.sync_id,
        name: entry.name,
        description: entry.description,
        suppliers: entry.suppliers || [],
        suppliersSnapshot: entry.suppliersSnapshot || [],
      });

      return key;
    } catch (e) {
      console.error('TemplateController.saveTemplate error', e);
      throw e;
    }
  }

  async deleteTemplate(params: { id: IDBValidKey }) {
    const { id } = params;
    
    const store = useTemplatesStore();
    const templates = JSON.parse(JSON.stringify(store.templates)) as Array<TemplateRecord>;
    const template = templates.find(t => String(t.id) === String(id));

    try {
      const numericId =
        typeof id === 'string' && !Number.isNaN(Number(id)) ? Number(id) : id;

      await this.dixie.deleteBackup({ id: numericId as IDBValidKey });

      store.removeTemplate(id);

      if (template) {
        const { syncTemplate } = useSync();
        syncTemplate(template, 'delete');
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
