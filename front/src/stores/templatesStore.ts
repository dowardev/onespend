import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSync } from '@/composables/useSync';

export type TemplateSummary = {
  id: string | number | null;
  sync_id?: string;
  serverId?: number | null;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
  synced_at?: number;
  _synced?: boolean;
};

export const useTemplatesStore = defineStore('templates', () => {
  const templates = ref<TemplateSummary[]>([]);
  const { syncTemplate } = useSync();

  function setTemplates(newTemplates: TemplateSummary[]) {
    const copy = JSON.parse(JSON.stringify(newTemplates));
    templates.value = copy;
  }

  function removeTemplate(id: IDBValidKey) {
    const idx = templates.value.findIndex(t => String(t.id) === String(id));
    if (idx !== -1) {
      const template = templates.value[idx];
      templates.value.splice(idx, 1);
      syncTemplate(template, 'delete');
    }
  }

  function addOrUpdateTemplate(template: TemplateSummary) {
    const copy = JSON.parse(JSON.stringify(template));
    const idx = templates.value.findIndex(t => String(t.id) === String(copy.id));
    if (idx !== -1) {
      copy.updatedAt = Date.now();
      templates.value[idx] = copy;
      syncTemplate(copy, 'update');
    } else {
      copy.createdAt = Date.now();
      templates.value.push(copy);
      syncTemplate(copy, 'create');
    }
  }

  function upsertTemplate(template: TemplateSummary) {
    const idx = templates.value.findIndex(t => String(t.id) === String(template.id) || t.sync_id === template.sync_id);
    const copy = JSON.parse(JSON.stringify(template));
    if (idx !== -1) {
      templates.value[idx] = copy;
    } else {
      templates.value.push(copy);
    }
  }

  return { templates, setTemplates, removeTemplate, addOrUpdateTemplate, upsertTemplate };
});
