# Validation Types en Create/Update/Delete

## Objetivo

Verificar y corregir que todas las operaciones de envío de datos (create/update/delete) validen correctamente los tipos tanto en el frontend como en el backend.

## Enfoque

Backend primero, luego frontend. Se usará el patrón de FormRequest por entidad en el backend y Vuelidate + mejoras de tipos en el frontend.

---

## Backend

### FormRequests por entidad

Se crearán FormRequests individuales para cada entidad sync:

| FormRequest | Entidad |
|---|---|
| `AccountSyncRequest` | Account |
| `SupplierSyncRequest` | Supplier |
| `SupplierProductSyncRequest` | SupplierProduct |
| `BudgetEntrySyncRequest` | BudgetEntry |
| `BudgetProviderSyncRequest` | BudgetProvider |
| `BudgetProviderProductSyncRequest` | BudgetProviderProduct |
| `RecurringRecordSyncRequest` | RecurringRecord |
| `RecurringRecordProductSyncRequest` | RecurringRecordProduct |

### FormRequests orquestadores

- `SyncMergeRequest`: valida estructura de nivel superior del endpoint merge
- `SyncResolveConflictRequest`: valida entrada del endpoint resolve-conflict

### Integración en SyncController

- `merge()`: SyncMergeRequest valida estructura, luego se itera cada entity type con Validator::make() usando el FormRequest específico
- `resolveConflict()`: SyncResolveConflictRequest valida estructura; si resolution=client, validar client_data con FormRequest específico

### Fixes adicionales al SyncController

- `bulkCreateItems()`: filtrar datos contra $fillable antes de Model::insert()
- `updateEntity()`: filtrar datos contra $fillable antes de Model::where()->update()
- `bulkDeleteSuppliers()`: remover 'status' => 'deleted' (columna dropeada)
- `$productOperation` variable indefinida en línea 704

---

## Frontend

### Vuelidate en formularios

Unificar validación con Vuelidate en todos los formularios de envío de datos:

| Formulario | Campos a validar |
|---|---|
| LoginView | email: required+email, password: required+minLength(6) |
| RegisterView | Agregar max:255 a name/email/user |
| EntryEditPage | name: required, amount: required+numeric+minValue(0.01), date: required |
| ProviderEditPage | name: required, estimated: required+numeric, amounts: numeric+minValue(0) |
| SupplierFormComponent | name: required+max:255 |
| AddAccountComponent | Agregar max:255 a name |
| useQuickAccount | initialBalance: minValue(0) |
| RecurringEditPage | name: required, amount: numeric+minValue(0), startDate: required, repeatFrequency: required |

### Mejoras de tipos TypeScript

- `Income.accountId`: `number` → `number | null`
- `Provider.accountId`: `number` → `number | null`
- `RecurringItem.amount`: normalizar a `number`
- `SyncItemData`: remover `[key: string]: unknown`, tipos explícitos
- `Income.entryType`: `string` → `EntryType`
- `finishDayData.type`: limitar a `'%' | 'fixed'`

---

## Orden de implementación

1. Backend: SyncMergeRequest y estructura de nivel superior
2. Backend: FormRequests por entidad
3. Backend: SyncResolveConflictRequest
4. Backend: Fixes $fillable bypass y bugs
5. Frontend: Vuelidate en formularios
6. Frontend: Mejoras de tipos TypeScript
