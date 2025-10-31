import dixieController, { DixieController } from "./dixie";

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

  async saveTemplate(params: { t: Omit<TemplateRecord, "createdAt" | "id"> }) {
    const { t } = params;
    const entry: TemplateRecord = {
      ...t,
      createdAt: Date.now(),
    };

    try {
      const key = await this.dixie.putBackup({
        type: "template",
        payload: entry,
      });
      return key;
    } catch (e) {
      console.error("TemplateController.saveTemplate error", e);
      throw e;
    }
  }

  async listTemplates() {
    try {
      const all = (await this.dixie.listBackups()) as any[];
      const templates = (all || [])
        .filter((x) => x && x.type === "template")
        .map((x) => ({ ...(x.payload || {}), id: x.id }));
      return templates as TemplateRecord[];
    } catch (e) {
      console.error("TemplateController.listTemplates error", e);
      return [] as TemplateRecord[];
    }
  }

  async deleteTemplate(params: { id: number | string }) {
    const { id } = params;
    try {
      console.log(
        "TemplateController.deleteTemplate: deleting id",
        id,
        "(type:",
        typeof id,
        ")",
      );
      await this.dixie.deleteBackup(id as any);
      return true;
    } catch (e) {
      console.error("TemplateController.deleteTemplate error", e);
      throw e;
    }
  }
}

const templateController = new TemplateController();
export default templateController;
export { TemplateController };
