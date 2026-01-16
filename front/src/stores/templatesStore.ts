import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSync } from '@/composables/useSync';

export type TemplateSummary = {
  id: string | number | null;
  sync_id?: string;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
  _synced?: boolean;
};

export const useTemplatesStore = defineStore('templates', () => {
  const templates = ref<TemplateSummary[]>([]);
  const { syncTemplate } = useSync();

  function setTemplates(newTemplates: TemplateSummary[]) {
    templates.value.length = 0;
    for (const t of newTemplates) {
      templates.value.push({ ...t });
    }
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
    const idx = templates.value.findIndex(t => String(t.id) === String(template.id));
    if (idx !== -1) {
      const updated = { ...template, updatedAt: Date.now() };
      templates.value[idx] = { ...updated };
      syncTemplate(updated, 'update');
    } else {
      const newTemplate = { ...template, createdAt: Date.now() };
      templates.value.push({ ...newTemplate });
      syncTemplate(newTemplate, 'create');
    }
  }

  function upsertTemplate(template: TemplateSummary) {
    const idx = templates.value.findIndex(t => String(t.id) === String(template.id) || t.sync_id === template.sync_id);
    if (idx !== -1) {
      templates.value[idx] = { ...template };
    } else {
      templates.value.push({ ...template });
    }
  }

  return { templates, setTemplates, removeTemplate, addOrUpdateTemplate, upsertTemplate };
});
