import db from '../OneSpendDB'
import type { SupplierProductRow } from '../types'

export const supplierProductsDb = {
  async add(params: { entry: SupplierProductRow }) {
    const { entry } = params
    return db.supplierProducts.add(entry)
  },

  async put(params: { entry: SupplierProductRow }) {
    const { entry } = params
    return db.supplierProducts.put(entry)
  },

  async bulkGet(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.supplierProducts.bulkGet(syncIds)
  },

  async bulkPut(params: { entries: SupplierProductRow[] }) {
    const { entries } = params
    return db.supplierProducts.bulkPut(entries)
  },

  async getBySyncId(params: { syncId: string }) {
    const { syncId } = params
    return db.supplierProducts.get(syncId) ?? null
  },

  async getBySupplierId(params: { supplierId: string }) {
    const { supplierId } = params
    return db.supplierProducts.where('supplierId').equals(supplierId).toArray()
  },

  async getAll() {
    return db.supplierProducts.toArray()
  },

  async delete(params: { syncId: string }) {
    const { syncId } = params
    return db.supplierProducts.delete(syncId)
  },

  async bulkDeleteBySyncIds(params: { syncIds: string[] }) {
    const { syncIds } = params
    return db.supplierProducts.where('sync_id').anyOf(syncIds).delete()
  },

  async deleteBySupplierId(params: { supplierSyncId: string }) {
    const { supplierSyncId } = params
    return db.supplierProducts.where('supplierId').equals(supplierSyncId).delete()
  },
}
