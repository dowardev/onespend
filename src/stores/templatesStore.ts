// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import TemplateController from '../controllers/TempalteController';

export type TemplateSummary = {
  id: string | number | null;
  name: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: { id: IDBValidKey; name?: string }[];
};

export const useTemplatesStore = defineStore('templates', {
  state: () => ({
    templates: [] as TemplateSummary[],
  }),
  actions: {
    async loadTemplates() {
      try {
        const list = (await TemplateController.listTemplates()) as any[];
        // Clear current templates and push items individually to avoid deep instantiation
        this.templates.length = 0;
        for (const t of list) {
          (this.templates as any).push({
            id: t.id || '',
            name: t.name,
            description: t.description,
            suppliers: (t as any).suppliers || [],
            suppliersSnapshot: (t as any).suppliersSnapshot || [],
          });
        }
      } catch (e) {
        console.error('templatesStore.loadTemplates error', e);
        this.templates.splice(0, this.templates.length);
      }
    },

    async saveTemplate(params: {
      template: Partial<TemplateSummary> & { id?: IDBValidKey };
    }) {
      try {
        await TemplateController.saveTemplate({
          template: params.template as any,
        });
        await this.loadTemplates();
      } catch (e) {
        console.error('templatesStore.saveTemplate error', e);
        throw e;
      }
    },

    async deleteTemplate(id: IDBValidKey) {
      try {
        await TemplateController.deleteTemplate({ id });
        await this.loadTemplates();
      } catch (e) {
        console.error('templatesStore.deleteTemplate error', e);
        throw e;
      }
    },
  },
});
