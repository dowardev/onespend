import { defineStore } from 'pinia';
import { ref } from 'vue';

export type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
};

export const useTemplatesStore = defineStore('templates', () => {
  const templates = ref<TemplateSummary[]>([]);

  function setTemplates(newTemplates: TemplateSummary[]) {
    templates.value.length = 0;
    for (const t of newTemplates) {
      templates.value.push({ ...t });
    }
  }

  function removeTemplate(id: IDBValidKey) {
    const idx = templates.value.findIndex(t => String(t.id) === String(id));
    if (idx !== -1) templates.value.splice(idx, 1);
  }

  function addOrUpdateTemplate(template: TemplateSummary) {
    const idx = templates.value.findIndex(t => String(t.id) === String(template.id));
    if (idx !== -1) {
      templates.value[idx] = { ...template };
    } else {
      templates.value.push({ ...template });
    }
  }

  return { templates, setTemplates, removeTemplate, addOrUpdateTemplate };
});
