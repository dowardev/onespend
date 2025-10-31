import { putBackup, listBackups, deleteBackup } from "./dixie";

export type TemplateRecord = {
  id?: number | string;
  name: string;
  description?: string;
  createdAt: number;
};

export default class TemplateController {
  static async saveTemplate(params: { t: Omit<TemplateRecord, "createdAt" | "id"> }) {
      const { t } = params;
    const entry: TemplateRecord = {
      ...t,
      createdAt: Date.now(),
    };

    try {
      const key = await putBackup({ type: "template", payload: entry });
      return key;
    } catch (e) {
      console.error("TemplateController.saveTemplate error", e);
      throw e;
    }
  }

  static async listTemplates() {
    try {
      const all = (await listBackups()) as any[];
      const templates = (all || [])
        .filter((x) => x && x.type === "template")
        .map((x) => ({ ...(x.payload || {}), id: x.id }));
      return templates as TemplateRecord[];
    } catch (e) {
      console.error("TemplateController.listTemplates error", e);
      return [] as TemplateRecord[];
    }
  }

  static async deleteTemplate(params: { id: number | string }) {
      const { id } = params;
    try {
      console.log("TemplateController.deleteTemplate: deleting id", id, "(type:", typeof id, ")");
      await deleteBackup(id as any);
      return true;
    } catch (e) {
      console.error("TemplateController.deleteTemplate error", e);
      throw e;
    }
  }
}
