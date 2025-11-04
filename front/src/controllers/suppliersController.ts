import dixieController, { DixieController } from './dixie';

export type Supplier = {
  id?: IDBValidKey;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
};

class SuppliersController {
  private dixie: DixieController;

  constructor(dixie: DixieController = dixieController) {
    this.dixie = dixie;
    // Ensure dixie uses a suppliers store
  }

  async ensureStoreExists() {
    // The underlying DixieController constructor chooses the store name by default.
    // We create a new DixieController instance pointing to a "suppliers" store.
    // However, dixieController is a singleton configured for 'backups'. So for
    // suppliers we'll create a dedicated instance when needed.
  }

  private getController(): DixieController {
    // Create a new controller instance configured for suppliers object store
    return new DixieController({ name: 'ABOgazDB', storeName: 'suppliers' });
  }

  async addSupplier(s: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) {
    const ctrl = this.getController();
    const now = Date.now();
    const entry: Supplier = {
      ...s,
      createdAt: now,
      updatedAt: now,
    };
    const id = await ctrl.addEntry(entry);
    return { ...(entry as any), id } as Supplier;
  }

  async updateSupplier(s: Supplier) {
    if (s.id == null) throw new Error('Supplier must have id to be updated');
    const ctrl = this.getController();
    const entry: Supplier = {
      ...s,
      updatedAt: Date.now(),
    };
    await ctrl.putEntry(entry);
    return entry;
  }

  async deleteSupplier(id: IDBValidKey) {
    const ctrl = this.getController();
    await ctrl.deleteBackup(id);
  }

  async listSuppliers() {
    const ctrl = this.getController();
    const all = (await ctrl.listBackups()) as Supplier[];
    // sort by createdAt descending
    return (all || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}

const suppliersController = new SuppliersController();
export default suppliersController;
export { SuppliersController };

