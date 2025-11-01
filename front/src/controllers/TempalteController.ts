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

  async saveTemplate(params: { template: Omit<TemplateRecord, "createdAt" | "id"> }) {
    const { template } = params;
    const entry: TemplateRecord = {
      ...template,
      createdAt: Date.now(),
    };

    try {
      const key = await this.dixie.addEntry({
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
      const all = (await this.dixie.listBackups()) as Array<
        Record<string, unknown> & { id?: IDBValidKey; type?: string; payload?: unknown }
      >;
      const templates = (all || [])
        .filter((x) => x && x.type === "template")
        .map((x) => {
          const payload = x.payload && typeof x.payload === "object" ? (x.payload as Record<string, unknown>) : {};
          return { ...(payload as Record<string, unknown>), id: String(x.id) };
        });
      return templates as TemplateRecord[];
    } catch (e) {
      console.error("TemplateController.listTemplates error", e);
      return [] as TemplateRecord[];
    }
  }

  async deleteTemplate(params: { id: IDBValidKey }) {
    const { id } = params;
    try {
      console.log(
        "TemplateController.deleteTemplate: deleting id",
        id,
        "(type:",
        typeof id,
        ")",
      );
      await this.dixie.deleteBackup(id);
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
