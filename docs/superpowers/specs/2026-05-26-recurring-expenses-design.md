# Gastos Recurrentes — Design Spec

## Overview

Nueva funcionalidad para crear y gestionar gastos/ingresos recurrentes. Los registros se definen con un patrón de repetición y pueden aplicarse automática o manualmente al presupuesto diario.

---

## 1. Data Model

### Backend — `recurring_records` table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | Auto-increment |
| user_id | FK → users(id) | Owner |
| sync_id | string(100) | Client-generated UUID |
| type | enum('cargo','provedor') | Tipo de registro |
| entry_type | enum('ingreso','egreso') | Ingreso o gasto |
| name | string(255) | Nombre |
| amount | decimal(15,2) nullable | Monto (cargo) |
| account_id | FK → accounts(id) nullable | Cuenta por defecto |
| repeat_frequency | enum('day','week','month','year') | Tipo de repetición |
| repeat_interval | int default 1 | Cada N días/semanas/meses/años |
| repeat_days | json nullable | Días de semana activos para weekly [0-6] |
| repeat_month_day | tinyint(2) nullable | Día fijo del mes (1-31) |
| repeat_month_weekday_mode | boolean default false | Usar día de semana en vez de día fijo |
| repeat_month_weekday | tinyint(1) nullable | Día de semana para monthly weekday (0-6) |
| repeat_month_weekday_ordinal | tinyint(1) nullable | Ordinal: 1=first, 2=second, 3=third, 4=fourth, -1=last; null=every occurrence |
| repeat_year_month | tinyint(2) nullable | Mes del año (1-12) |
| repeat_year_day | tinyint(2) nullable | Día del año (1-31) |
| time | time nullable | Hora opcional del evento |
| auto_insert | boolean default false | Insertar auto al llegar la fecha (solo si time está set) |
| start_date | date | Fecha de inicio |
| end_date | date nullable | Fecha de término (indefinido si null) |
| estimated | decimal(15,2) nullable | Presupuesto estimado (provedor) |
| items | json nullable | Distribución por cuentas: [{accountId, amount}] |
| notes | text nullable | Notas opcionales |
| active | boolean default true | Activo/inactivo |
| status | enum('active','deleted') default 'active' | Estado soft-delete |
| deleted_at | timestamp nullable | Soft delete |
| created_at, updated_at | timestamps | |

### Backend — `recurring_record_products` table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| recurring_record_id | bigint FK → recurring_records(id) ON DELETE CASCADE | |
| sync_id | string(100) | |
| supplier_product_id | bigint FK → supplier_products(id) nullable | |
| product_name | string(255) | |
| product_price | decimal(15,2) | |
| quantity | int default 1 | |
| created_at, updated_at | timestamps | |

### Frontend — `RecurringRecord`

```typescript
type RecurringType = 'cargo' | 'provedor'
type RepeatFrequency = 'day' | 'week' | 'month' | 'year'

interface RecurringItem {
  amount: number
  accountId: string | number | { id: string | number } | null
}

interface RecurringProduct {
  id?: string | number
  sync_id?: string
  supplierProductId?: string | number | null
  productName: string
  productPrice: number
  quantity: number
}

interface RecurringRecord {
  id: string | number
  sync_id?: string
  serverId?: number | null
  type: RecurringType
  entryType: 'ingreso' | 'egreso'
  name: string
  amount?: number
  accountId?: string | number | null
  // Repetition
  repeatFrequency: RepeatFrequency
  repeatInterval: number
  repeatDays?: number[]
  repeatMonthDay?: number
  repeatMonthWeekdayMode?: boolean
  repeatMonthWeekday?: number
  repeatMonthWeekdayOrdinal?: number
  repeatYearMonth?: number
  repeatYearDay?: number
  // Time
  time?: string
  autoInsert: boolean
  // Dates
  startDate: string
  endDate?: string | null
  // Provedor-specific
  estimated?: number
  products?: RecurringProduct[]
  items?: RecurringItem[]
  notes?: string
  // Status
  active: boolean
  status?: string
  createdAt: number
  synced_at?: number
  _synced?: boolean
}
```

---

## 2. Backend Changes

### New Migration
- Create `recurring_records` table with all columns listed above
- Create `recurring_record_products` table
- Indexes: `[user_id, status]`, `[user_id, active]`, `sync_id`

### New Model
- `app/Models/RecurringRecord.php` — SoftDeletes, relationships: user, account, products
- `app/Models/RecurringRecordProduct.php` — SoftDeletes, relationships: recurringRecord, supplierProduct

### SyncController Updates
- Add `'recurring_record'` and `'recurring_record_product'` to `ENTITY_TYPES`
- Include `products` relationship in response formatting
- Handle nested products in merge (like budget_provider handles products)

### Routes
- No new API routes needed — reuses existing `/api/sync/changes`, `/api/sync/merge`, `/api/sync/full`

---

## 3. Frontend Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/views/recurring/RecurringPage.vue` | List page with pending section + recurring records list |
| `src/views/recurring/RecurringEditPage.vue` | Create/edit form |
| `src/controllers/recurringController.ts` | CRUD + occurrence calculation |
| `src/composables/useRecurrence.ts` | Recurrence date calculation utils |

### Router (additions to `src/router/index.ts`)

| Path | Name | Component |
|------|------|-----------|
| `/recurring` | `RecurringPage` | `RecurringPage.vue` |
| `/recurring/new` | `RecurringNew` | `RecurringEditPage.vue` |
| `/recurring/edit` | `RecurringEdit` | `RecurringEditPage.vue` |

### Menu (add to `src/components/MainMenu.vue`)
- New item in "Main Navigation" section after "Provedores":
  - **Recurrentes** — `/recurring` — icon: `repeatOutline`

### IndexedDB Store
- New store `recurring_records` in `DixieController` (`src/controllers/dixie.ts`)
- Data key pattern: `recurring:record:<sync_id>`

### Sync Service Updates
- Add `recurring_record` entity type to `syncService.ts`
- Add `recurring_record_product` as nested entity (similar to budget_provider_product)
- Add sync params to `useSync.ts` composable

### Recurrence Calculation (`useRecurrence` composable)

```
function isDueOnDate(record: RecurringRecord, date: Date): boolean
function getNextOccurrence(record: RecurringRecord, fromDate: Date): Date | null
function getDueRecordsForDate(records: RecurringRecord[], date: Date): RecurringRecord[]
```

Logic per frequency:
- **Day:** `daysFromStart % repeatInterval === 0`
- **Week:** weekOffset % repeatInterval === 0 AND date.getDay() in repeatDays
- **Month (fixed):** monthOffset % repeatInterval === 0 AND date.getDate() === repeatMonthDay
- **Month (weekday):** monthOffset % repeatInterval === 0 AND date.getDay() === repeatMonthWeekday AND ordinal matches
- **Year:** yearOffset % repeatInterval === 0 AND month matches AND day matches

---

## 4. Budget Integration

### Pending Section in BudgetView
When a date is selected in BudgetView:
1. Query active recurring records
2. Calculate which ones are due for the selected date using `useRecurrence`
3. Show a banner/section at the top: "Tienes N pendientes para este día"
4. Each pending item has a button "Aplicar" or "Ignorar"

### Apply Action
When user clicks "Aplicar" on a pending item:
- **Cargo:** Creates a BudgetEntry with the recurring record's data (name, amount, entryType, accountId, date)
- **Provedor:** Creates a BudgetProvider with the recurring record's data (name, estimated, products, items, date)
- Updates IndexedDB and triggers sync

### Avoid Duplicates
Before showing pending items or auto-inserting, check if a BudgetEntry or BudgetProvider already exists for this date that was created from this recurring record. Use a `_fromRecurringId` field (string, nullable) added to both BudgetEntry and BudgetProvider models. This field stores the sync_id of the RecurringRecord that created it. Also add the corresponding column to the backend migrations:
- `budget_entries._from_recurring_id` — string(100) nullable, index
- `budget_providers._from_recurring_id` — string(100) nullable, index

### Editing Recurring Records
Editing a recurring record affects future occurrences only. Already-created BudgetEntries/BudgetProviders (identified by `_fromRecurringId`) are NOT modified or deleted. This prevents data loss from changing a recurring record's amount after some occurrences have already been created.

---

## 5. Sync

### Entity Types
- `recurring_record` → `RecurringRecord` model
- `recurring_record_product` → `RecurringRecordProduct` model

### Merge Order
Must respect dependency order: `recurring_record` before `recurring_record_product` (nested relationship, similar to how budget_provider/products are handled).

---

## 6. UI Components

### RecurringPage.vue
- Ion-page with header "Gastos Recurrentes"
- Filter tabs: Todos | Cargos | Provedores
- Pending section (collapsible): shows items due today or upcoming
- List of recurring records with:
  - Name, amount/frequency badge, next occurrence date
  - Active/inactive toggle
  - Swipe actions: edit, toggle active, delete
- FAB button to add new (+)

### RecurringEditPage.vue
- Ion-page with EditPageHeader (reuse existing component)
- Form sections:
  1. **Type selector:** Cargo / Provedor (toggle buttons)
  2. **Entry type:** Ingreso / Gasto (toggle buttons)
  3. **Name** (ion-input)
  4. **Amount** (ion-input, number) — for cargo
  5. **Account** (ion-select)
  6. **Repetition section:**
     - Interval inputs: "Cada [N] [día/semana/mes/año]"
     - Conditional sub-options per frequency
     - Week: day-of-week chips (L M X J V S D)
     - Month fixed: day input
     - Month weekday: weekday select + ordinal select
     - Year: month select + day input
  7. **Time** (optional, ion-input type="time")
  8. **Auto-insert checkbox** (visible only if time is set)
  9. **Start date** (date picker)
  10. **End date** (optional, date picker)
  11. **Notes** (ion-textarea)
  12. **Provedor-only:** Products section (reuse patterns from ProviderEditPage)
  13. **Provedor-only:** Account distribution section (reuse AccountDistributionSection)

---

## 7. Recurrence UI Detail

### Weekly: Day-of-week selector
Chips/buttons for each day: L M M J V S D
- Multiple selection allowed
- Default: current day pre-selected
- Stored as array of numbers (0=Sunday, 1=Monday, ... 6=Saturday)
- Visible only when `repeatFrequency === 'week'`

### Monthly: Mode toggle
Toggle between:
- "Día fijo" → show day input (1-31)
- "Día de semana" → show weekday select + ordinal select (first/second/third/fourth/last)
- Visible only when `repeatFrequency === 'month'`

### Yearly: Month + Day
- Month dropdown (Enero-Diciembre)
- Day input (1-31)
- Visible only when `repeatFrequency === 'year'`

---

## 8. Implementation Order

1. Backend: migration + models + sync controller updates
2. Frontend: types + controller + IndexedDB store
3. Frontend: `useRecurrence` composable
4. Frontend: `RecurringEditPage.vue`
5. Frontend: `RecurringPage.vue`
6. Frontend: router + menu
7. Frontend: sync service updates
8. Frontend: BudgetView integration (pending section)
9. Tests
