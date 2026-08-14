<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# Gastos Recurrentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full recurring expenses feature with Cargo/Provedor types, repetition system (day/week/month/year), time-based auto-insert or pending, and budget integration.

**Architecture:** New `recurring_records` and `recurring_record_products` DB tables, synced via existing sync infrastructure. Frontend has a new page at `/recurring`, a controller, a recurrence calculation composable, and pending section in BudgetView.

**Tech Stack:** Laravel 12 (PHP 8.2+), Ionic 8 + Vue 3 (Composition API), Pinia, IndexedDB (DixieController)

---

### Task 1: Backend — Migration for recurring_records + recurring_record_products

**Files:**
- Create: `back/database/migrations/2026_05_26_000001_create_recurring_records_tables.php`
- Create: `back/database/migrations/2026_05_26_000002_add_from_recurring_id_to_budget_tables.php`

- [ ] **Step 1: Create the recurring records migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('sync_id', 100)->unique();
            $table->enum('type', ['cargo', 'provedor']);
            $table->enum('entry_type', ['ingreso', 'egreso']);
            $table->string('name', 255);
            $table->decimal('amount', 15, 2)->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->enum('repeat_frequency', ['day', 'week', 'month', 'year']);
            $table->integer('repeat_interval')->default(1);
            $table->json('repeat_days')->nullable();
            $table->tinyInteger('repeat_month_day')->nullable();
            $table->boolean('repeat_month_weekday_mode')->default(false);
            $table->tinyInteger('repeat_month_weekday')->nullable();
            $table->tinyInteger('repeat_month_weekday_ordinal')->nullable();
            $table->tinyInteger('repeat_year_month')->nullable();
            $table->tinyInteger('repeat_year_day')->nullable();
            $table->time('time')->nullable();
            $table->boolean('auto_insert')->default(false);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('estimated', 15, 2)->nullable();
            $table->json('items')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'paused', 'deleted'])->default('active');
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->index(['user_id', 'status']);
        });

        Schema::create('recurring_record_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('recurring_record_id');
            $table->string('sync_id', 100);
            $table->unsignedBigInteger('supplier_product_id')->nullable();
            $table->string('product_name', 255);
            $table->decimal('product_price', 15, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->timestamps();

            $table->foreign('recurring_record_id')->references('id')->on('recurring_records')->onDelete('cascade');
            $table->foreign('supplier_product_id')->references('id')->on('supplier_products')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_record_products');
        Schema::dropIfExists('recurring_records');
    }
};
```

- [ ] **Step 2: Create the migration for _from_recurring_id on budget tables**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->string('_from_recurring_id', 100)->nullable()->after('supplier_name');
            $table->index('_from_recurring_id');
        });

        Schema::table('budget_providers', function (Blueprint $table) {
            $table->string('_from_recurring_id', 100)->nullable()->after('_supplier_name');
            $table->index('_from_recurring_id');
        });
    }

    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropColumn('_from_recurring_id');
        });
        Schema::table('budget_providers', function (Blueprint $table) {
            $table->dropColumn('_from_recurring_id');
        });
    }
};
```

- [ ] **Step 3: Run the migration**

```bash
cd /home/dowardev/Documentos/programacion/oneSpend/back && php artisan migrate
```

- [ ] **Step 4: Commit**

```bash
git add back/database/migrations/
git commit -m "feat: add recurring_records tables and _from_recurring_id columns"
```

---

### Task 2: Backend — Models (RecurringRecord + RecurringRecordProduct)

**Files:**
- Create: `back/app/Models/RecurringRecord.php`
- Create: `back/app/Models/RecurringRecordProduct.php`
- Modify: `back/app/Models/BudgetEntry.php` (add `_from_recurring_id` to fillable)
- Modify: `back/app/Models/BudgetProvider.php` (add `_from_recurring_id` to fillable)

- [ ] **Step 1: Create RecurringRecord model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringRecord extends Model
{
    use SoftDeletes;

    protected $table = 'recurring_records';

    protected $fillable = [
        'user_id', 'sync_id', 'type', 'entry_type', 'name', 'amount',
        'account_id', 'repeat_frequency', 'repeat_interval', 'repeat_days',
        'repeat_month_day', 'repeat_month_weekday_mode', 'repeat_month_weekday',
        'repeat_month_weekday_ordinal', 'repeat_year_month', 'repeat_year_day',
        'time', 'auto_insert', 'start_date', 'end_date', 'estimated',
        'items', 'notes', 'active', 'status', 'deleted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'estimated' => 'decimal:2',
        'repeat_days' => 'array',
        'items' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'time' => 'string',
        'active' => 'boolean',
        'auto_insert' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    protected $hidden = ['deleted_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(RecurringRecordProduct::class, 'recurring_record_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
```

- [ ] **Step 2: Create RecurringRecordProduct model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringRecordProduct extends Model
{
    protected $table = 'recurring_record_products';

    protected $fillable = [
        'recurring_record_id', 'sync_id', 'supplier_product_id',
        'product_name', 'product_price', 'quantity',
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function recurringRecord(): BelongsTo
    {
        return $this->belongsTo(RecurringRecord::class, 'recurring_record_id');
    }

    public function supplierProduct(): BelongsTo
    {
        return $this->belongsTo(SupplierProduct::class, 'supplier_product_id');
    }
}
```

- [ ] **Step 3: Add `_from_recurring_id` to BudgetEntry fillable**

Edit `back/app/Models/BudgetEntry.php` — add `'_from_recurring_id'` to the `$fillable` array.

- [ ] **Step 4: Add `_from_recurring_id` to BudgetProvider fillable**

Edit `back/app/Models/BudgetProvider.php` — add `'_from_recurring_id'` to the `$fillable` array.

- [ ] **Step 5: Commit**

```bash
git add back/app/Models/RecurringRecord.php back/app/Models/RecurringRecordProduct.php back/app/Models/BudgetEntry.php back/app/Models/BudgetProvider.php
git commit -m "feat: add RecurringRecord and RecurringRecordProduct models"
```

---

### Task 3: Backend — SyncController Updates

**Files:**
- Modify: `back/app/Http/Controllers/SyncController.php`

- [ ] **Step 1: Add entity types to ENTITY_TYPES constant**

Find the `ENTITY_TYPES` constant and add:
```php
'recurring_record' => RecurringRecord::class,
'recurring_record_product' => RecurringRecordProduct::class,
```

Also add import at top:
```php
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
```

- [ ] **Step 2: Handle recurring_record in merge method**

In the `merge()` method, after the `account` processing block, add the recurring_record + product handling with nested products (same pattern as budget_provider):

```php
// Process recurring_record with nested products
if (isset($data['recurring_record'])) {
    foreach ($data['recurring_record'] as $item) {
        $item['user_id'] = $user->id;
        $products = $item['products'] ?? [];
        unset($item['products']);

        $result = $this->processItem('recurring_record', $item, $user->id);
        $records[$result['sync_id'] ?? $item['sync_id']] = $result;

        if (!empty($products)) {
            $recordId = $result['id'] ?? $result['sync_id'] ?? $item['sync_id'];
            foreach ($products as $product) {
                $product['user_id'] = $user->id;
                $product['recurring_record_id'] = $recordId;
                $this->processItem('recurring_record_product', $product, $user->id);
            }
        }
    }
}
```

- [ ] **Step 3: Handle recurring_record_product in merge method**

In the `processItem` loop for remaining types:
```php
// recurring_record_product items handled individually
if (isset($data['recurring_record_product'])) {
    foreach ($data['recurring_record_product'] as $item) {
        $item['user_id'] = $user->id;
        $this->processItem('recurring_record_product', $item, $user->id);
    }
}
```

- [ ] **Step 4: Add formatItem handling for recurring_record**

In `formatItem()`, add case for `recurring_record` to include nested products:

```php
if ($entityType === 'recurring_record') {
    $data['products'] = $item->products->map(fn($p) => [
        'sync_id' => $p->sync_id,
        'supplier_product_id' => $p->supplier_product_id,
        'product_name' => $p->product_name,
        'product_price' => (float)$p->product_price,
        'quantity' => $p->quantity,
    ])->toArray();
}
```

- [ ] **Step 5: Commit**

```bash
git add back/app/Http/Controllers/SyncController.php
git commit -m "feat: add recurring_record entity types to SyncController"
```

---

### Task 4: Frontend — Types + RecurringController + IndexedDB

**Files:**
- Create: `front/src/controllers/recurringController.ts`
- Modify: `front/src/controllers/dixie.ts`
- Modify: `front/src/stores/budgetStore.ts`

- [ ] **Step 1: Add `_fromRecurringId` to frontend types**

In `front/src/stores/budgetStore.ts`, add to `Income` interface:
```typescript
_fromRecurringId?: string;
```

Add to `Provider` interface:
```typescript
_fromRecurringId?: string;
```

- [ ] **Step 2: Add recurring_records to IndexedDB stores**

In `front/src/controllers/dixie.ts`, in the `openDB()` method, add `'recurring_records'` to the `allStores` array:
```typescript
const allStores = [
    'suppliers',
    'accounts',
    'templates',
    'budget',
    'backups',
    'config',
    'personalFinanceConfig',
    'recurring_records',
];
```

- [ ] **Step 3: Create recurringController.ts**

```typescript
import { DixieController } from '@/controllers/dixie';
import { v4 as uuidv4 } from 'uuid';

export type RecurringType = 'cargo' | 'provedor';
export type RepeatFrequency = 'day' | 'week' | 'month' | 'year';

export interface RecurringProduct {
  supplierProductId?: string | number | null;
  productName: string;
  productPrice: number;
  quantity: number;
}

export interface RecurringItem {
  amount: number;
  accountId: string | number | { id: string | number } | null;
}

export interface RecurringRecord {
  id?: string | number;
  sync_id?: string;
  serverId?: number | null;
  type: RecurringType;
  entryType: 'ingreso' | 'egreso';
  name: string;
  amount?: number;
  accountId?: string | number | null;
  repeatFrequency: RepeatFrequency;
  repeatInterval: number;
  repeatDays?: number[];
  repeatMonthDay?: number;
  repeatMonthWeekdayMode?: boolean;
  repeatMonthWeekday?: number;
  repeatMonthWeekdayOrdinal?: number;
  repeatYearMonth?: number;
  repeatYearDay?: number;
  time?: string;
  autoInsert: boolean;
  startDate: string;
  endDate?: string | null;
  estimated?: number;
  products?: RecurringProduct[];
  items?: RecurringItem[];
  notes?: string;
  active: boolean;
  status?: string;
  createdAt?: number;
  synced_at?: number;
  _synced?: boolean;
}

class RecurringController {
  private dixie: DixieController;

  constructor() {
    this.dixie = new DixieController({ storeName: 'recurring_records' });
  }

  async getAllRecords(): Promise<RecurringRecord[]> {
    const entries: RecurringRecord[] = [];
    const db = await this.dixie.openDB();
    const tx = db.transaction('recurring_records', 'readonly');
    const store = tx.objectStore('recurring_records');
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveRecords(): Promise<RecurringRecord[]> {
    const all = await this.getAllRecords();
    return all.filter((r) => r.status === 'active');
  }

  async addRecord(record: Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt'>): Promise<RecurringRecord> {
    const newRecord: RecurringRecord = {
      ...record,
      sync_id: uuidv4(),
      createdAt: Date.now(),
      status: 'active',
    };
    const id = await this.dixie.addEntry({ entry: newRecord });
    newRecord.id = id as number;

    const { default: budgetController } = await import('@/controllers/budgetController');
    const selectedDate = budgetController.getSelectedDate();
    if (selectedDate) {
      budgetController.saveData();
    }

    return newRecord;
  }

  async updateRecord(id: string | number, changes: Partial<RecurringRecord>): Promise<void> {
    const existing = await this.getRecordById(id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await this.dixie.putEntry({ entry: updated });
  }

  async removeRecord(id: string | number): Promise<void> {
    const existing = await this.getRecordById(id);
    if (!existing) return;
    existing.status = 'deleted';
    await this.dixie.putEntry({ entry: existing });
  }

  async getRecordById(id: string | number): Promise<RecurringRecord | null> {
    const all = await this.getAllRecords();
    return all.find((r) => String(r.id) === String(id)) || null;
  }

  async getRecordBySyncId(syncId: string): Promise<RecurringRecord | null> {
    const all = await this.getAllRecords();
    return all.find((r) => r.sync_id === syncId) || null;
  }

  async toggleActive(id: string | number): Promise<void> {
    const record = await this.getRecordById(id);
    if (!record) return;
    record.status = record.status === 'active' ? 'paused' : 'active';
    await this.dixie.putEntry({ entry: record });
  }
}

export const recurringController = new RecurringController();
export default recurringController;
```

- [ ] **Step 4: Commit**

```bash
git add front/src/controllers/recurringController.ts front/src/controllers/dixie.ts front/src/stores/budgetStore.ts
git commit -m "feat: add RecurringController, IndexedDB store, and types"
```

---

### Task 5: Frontend — useRecurrence composable

**Files:**
- Create: `front/src/composables/useRecurrence.ts`

- [ ] **Step 1: Create the recurrence calculation composable**

```typescript
import type { RecurringRecord } from '@/controllers/recurringController';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, getDate, getDay, getDaysInMonth, startOfMonth, setDate, setMonth } from 'date-fns';

function isDueOnDate(record: RecurringRecord, dateStr: string): boolean {
  const date = parseISO(dateStr);
  const start = parseISO(record.startDate);
  const interval = record.repeatInterval || 1;

  if (date < start) return false;
  if (record.endDate) {
    const end = parseISO(record.endDate);
    if (date > end) return false;
  }

  switch (record.repeatFrequency) {
    case 'day': {
      const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'week': {
      if (!record.repeatDays || record.repeatDays.length === 0) return false;
      const dayOfWeek = date.getDay();
      if (!record.repeatDays.includes(dayOfWeek)) return false;
      const weeksSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksSinceStart >= 0 && weeksSinceStart % interval === 0;
    }

    case 'month': {
      if (record.repeatMonthWeekdayMode) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== (record.repeatMonthWeekday ?? -1)) return false;
        const monthsSinceStart = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
        if (monthsSinceStart < 0 || monthsSinceStart % interval !== 0) return false;
        if (record.repeatMonthWeekdayOrdinal != null) {
          const ordinal = record.repeatMonthWeekdayOrdinal;
          const dayOfMonth = date.getDate();
          if (ordinal === -1) {
            const lastDay = getDaysInMonth(date);
            if (dayOfMonth < lastDay - 6) return false;
          } else {
            const expectedDay = ordinal * 7 - 6;
            if (dayOfMonth < expectedDay || dayOfMonth >= expectedDay + 7) return false;
          }
        }
        return true;
      }
      if (getDate(date) !== (record.repeatMonthDay ?? getDate(start))) return false;
      const monthsSinceStart = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
      return monthsSinceStart >= 0 && monthsSinceStart % interval === 0;
    }

    case 'year': {
      const targetMonth = record.repeatYearMonth ?? (start.getMonth() + 1);
      const targetDay = record.repeatYearDay ?? getDate(start);
      if (date.getMonth() + 1 !== targetMonth || getDate(date) !== targetDay) return false;
      const yearsSinceStart = date.getFullYear() - start.getFullYear();
      return yearsSinceStart >= 0 && yearsSinceStart % interval === 0;
    }

    default:
      return false;
  }
}

function getNextOccurrence(record: RecurringRecord, fromDate: Date = new Date()): string | null {
  const maxIterations = 730;
  let checkDate = fromDate;

  for (let i = 0; i < maxIterations; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (isDueOnDate(record, dateStr)) {
      return dateStr;
    }
    checkDate = addDays(checkDate, 1);
  }
  return null;
}

function getDueRecordsForDate(
  records: RecurringRecord[],
  dateStr: string,
): { autoInsert: RecurringRecord[]; pending: RecurringRecord[] } {
  const autoInsert: RecurringRecord[] = [];
  const pending: RecurringRecord[] = [];

  for (const record of records) {
    if (record.status !== 'active') continue;
    if (!isDueOnDate(record, dateStr)) continue;
    if (record.autoInsert && record.time) {
      autoInsert.push(record);
    } else {
      pending.push(record);
    }
  }

  return { autoInsert, pending };
}

export function useRecurrence() {
  return {
    isDueOnDate,
    getNextOccurrence,
    getDueRecordsForDate,
  };
}

export default useRecurrence;
```

- [ ] **Step 2: Commit**

```bash
git add front/src/composables/useRecurrence.ts
git commit -m "feat: add useRecurrence composable for date calculations"
```

---

### Task 6: Frontend — Sync Service Updates

**Files:**
- Modify: `front/src/services/syncService.ts`
- Modify: `front/src/composables/useSync.ts`

- [ ] **Step 1: Add recurring_record to SyncItem entityType union**

In `front/src/services/syncService.ts`, add `'recurring_record'` and `'recurring_record_product'` to the `entityType` union in `SyncItem`:
```typescript
export interface SyncItem {
  id: string;
  entityType:
    | 'account'
    | 'budget_provider'
    | 'budget_provider_product'
    | 'budget_entry'
    | 'supplier'
    | 'supplier_product'
    | 'template'
    | 'recurring_record'
    | 'recurring_record_product';
  operation: 'create' | 'update' | 'delete';
  data: SyncItemData;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}
```

- [ ] **Step 2: Add to entityTypeToStore mappings**

Find both `entityTypeToStore` mappings in syncService.ts and add:
```typescript
recurring_record: 'recurring_records',
recurring_record_product: 'recurring_records',
```

- [ ] **Step 3: Add to queue data structure**

Find the data initialization in `processQueue()` and add:
```typescript
const data: Record<string, SyncItemData[]> = {
    // ... existing ...
    recurring_record: [],
    recurring_record_product: [],
};
```

- [ ] **Step 4: Add recurring record sync params to useSync.ts**

In `front/src/composables/useSync.ts`, add:
```typescript
export interface SyncRecurringRecordParams {
  id?: string | number;
  sync_id?: string;
  type?: string;
  entryType?: string;
  name?: string | null;
  amount?: number | string | null;
  accountId?: number | string | null;
  repeatFrequency?: string;
  repeatInterval?: number;
  repeatDays?: number[];
  repeatMonthDay?: number;
  repeatMonthWeekdayMode?: boolean;
  repeatMonthWeekday?: number;
  repeatMonthWeekdayOrdinal?: number;
  repeatYearMonth?: number;
  repeatYearDay?: number;
  time?: string | null;
  autoInsert?: boolean;
  startDate?: string;
  endDate?: string | null;
  estimated?: number | string | null;
  products?: Array<{
    supplierProductId?: string | number | null;
    productName: string;
    productPrice: number;
    quantity: number;
  }>;
  items?: Array<{ amount: number; accountId: string | number | null }>;
  notes?: string | null;
  active?: boolean;
  [key: string]: unknown;
}
```

- [ ] **Step 5: Add syncRecurringRecord function**

```typescript
function syncRecurringRecord(params: {
    record: SyncRecurringRecordParams;
    operation?: 'create' | 'update' | 'delete';
    products?: SyncRecurringRecordParams['products'];
}) {
    const { record, operation = 'create', products } = params;
    const service = syncServiceRef.value;
    if (!service) return;

    const data: SyncItemData = { ...record } as SyncItemData;
    if (products && products.length > 0) {
        data.products = products.map((p) => ({
            sync_id: p.sync_id || `${record.sync_id || record.id}_prod_${Math.random().toString(36).slice(2)}`,
            supplier_product_id: p.supplierProductId,
            product_name: p.productName,
            product_price: p.productPrice,
            quantity: p.quantity,
        }));
    }

    service.queueOperation({
        id: String(record.sync_id || record.id),
        entityType: 'recurring_record',
        operation,
        data,
    });
}
```

- [ ] **Step 6: Update recurringController to call sync**

In `front/src/controllers/recurringController.ts`, add sync imports and calls to `addRecord`, `updateRecord`, and `removeRecord`:

```typescript
import { syncRecurringRecord } from '@/composables/useSync';
```

Update `addRecord` to call sync:
```typescript
async addRecord(record: Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt'>): Promise<RecurringRecord> {
    const newRecord: RecurringRecord = {
      ...record,
      sync_id: uuidv4(),
      createdAt: Date.now(),
      status: 'active',
    };
    const id = await this.dixie.addEntry({ entry: newRecord });
    newRecord.id = id as number;

    syncRecurringRecord({
        record: {
            ...newRecord,
            products: newRecord.products?.map((p) => ({
                ...p,
                sync_id: `${newRecord.sync_id}_prod_${Math.random().toString(36).slice(2, 8)}`,
            })),
        },
        operation: 'create',
        products: newRecord.products || [],
    });

    return newRecord;
}
```

Update `updateRecord` to call sync:
```typescript
async updateRecord(id: string | number, changes: Partial<RecurringRecord>): Promise<void> {
    const existing = await this.getRecordById(id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await this.dixie.putEntry({ entry: updated });

    syncRecurringRecord({
        record: { ...updated, sync_id: existing.sync_id },
        operation: 'update',
        products: updated.products || [],
    });
}
```

Update `removeRecord` to call sync:
```typescript
const record = await this.getRecordById(id);
if (!record) return;
await this.dixie.putEntry({ entry: { ...record, status: 'deleted', active: false } });

syncRecurringRecord({
    record: { sync_id: record.sync_id!, name: record.name },
    operation: 'delete',
});
```

- [ ] **Step 7: Commit**

```bash
git add front/src/services/syncService.ts front/src/composables/useSync.ts front/src/controllers/recurringController.ts
git commit -m "feat: add recurring_record sync support"
```

---

### Task 7: Frontend — RecurringEditPage (Create/Edit Form)

**Files:**
- Create: `front/src/views/recurring/RecurringEditPage.vue`

This is the most complex component. Follow the TemplateView.vue structure.

- [ ] **Step 1: Create the RecurringEditPage component**

```vue
<template>
  <ion-page>
    <EditPageHeader
      :title="isEditing ? 'Editar Recurrente' : 'Nuevo Recurrente'"
      :is-save-disabled="!isFormValid"
      show-options-button
      @back="handleBack"
      @save="handleSave"
      @options="openOptionsPopover"
    />

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4">
            <!-- Type selector -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item lines="full" class="transparent">
                  <ion-segment v-model="formData.type" @ion-change="onTypeChange">
                    <ion-segment-button value="cargo">
                      <ion-label>Cargo</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="provedor">
                      <ion-label>Provedor</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </ion-item>

                <ion-item lines="full" class="transparent">
                  <ion-segment v-model="formData.entryType">
                    <ion-segment-button value="ingreso">
                      <ion-label>Ingreso</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="egreso">
                      <ion-label>Gasto</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </ion-item>

                <ion-item class="transparent" lines="full">
                  <ion-input
                    v-model="formData.name"
                    label="Nombre"
                    label-placement="floating"
                    placeholder="Nombre del recurrente"
                  />
                </ion-item>

                <ion-item class="transparent" lines="full">
                  <ion-input
                    v-model="formData.amount"
                    type="number"
                    label="Monto"
                    label-placement="floating"
                    placeholder="0.00"
                  />
                </ion-item>

                <ion-item lines="full" class="transparent">
                  <ion-select
                    v-model="formData.accountId"
                    interface="popover"
                    label="Cuenta"
                    label-placement="stacked"
                  >
                    <ion-select-option
                      v-for="acc in accounts"
                      :key="acc.id"
                      :value="acc.id"
                    >
                      {{ acc.name }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Repetition section -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-list-header>
                <ion-label>Repetición</ion-label>
              </ion-list-header>

              <ion-card class="shadow1">
                <ion-item lines="full" class="transparent">
                  <ion-label>Cada</ion-label>
                  <ion-input
                    v-model="formData.repeatInterval"
                    type="number"
                    style="width: 60px; --padding-start: 0"
                    class="ion-text-end"
                  />
                  <ion-select
                    v-model="formData.repeatFrequency"
                    interface="popover"
                    style="min-width: 100px"
                    @ion-change="onFrequencyChange"
                  >
                    <ion-select-option value="day">Día(s)</ion-select-option>
                    <ion-select-option value="week">Semana(s)</ion-select-option>
                    <ion-select-option value="month">Mes(es)</ion-select-option>
                    <ion-select-option value="year">Año(s)</ion-select-option>
                  </ion-select>
                </ion-item>

                <!-- Weekly: day-of-week selector -->
                <template v-if="formData.repeatFrequency === 'week'">
                  <ion-item lines="full" class="transparent">
                    <ion-label>Días</ion-label>
                  </ion-item>
                  <ion-item lines="full" class="transparent">
                    <div style="display: flex; gap: 4px; width: 100%; flex-wrap: wrap">
                      <ion-chip
                        v-for="day in weekDays"
                        :key="day.value"
                        :color="formData.repeatDays?.includes(day.value) ? 'primary' : 'medium'"
                        outline
                        @click="toggleDay(day.value)"
                      >
                        <ion-label>{{ day.label }}</ion-label>
                      </ion-chip>
                    </div>
                  </ion-item>
                </template>

                <!-- Monthly: fixed day or weekday mode -->
                <template v-if="formData.repeatFrequency === 'month'">
                  <ion-item lines="none" class="transparent">
                    <ion-segment v-model="monthMode">
                      <ion-segment-button value="fixed">
                        <ion-label>Día fijo</ion-label>
                      </ion-segment-button>
                      <ion-segment-button value="weekday">
                        <ion-label>Día de semana</ion-label>
                      </ion-segment-button>
                    </ion-segment>
                  </ion-item>
                  <template v-if="monthMode === 'fixed'">
                    <ion-item lines="full" class="transparent">
                      <ion-label>Día del mes</ion-label>
                      <ion-input
                        v-model="formData.repeatMonthDay"
                        type="number"
                        style="width: 60px; --padding-start: 0"
                        class="ion-text-end"
                        placeholder="15"
                      />
                    </ion-item>
                  </template>
                  <template v-else>
                    <ion-item lines="full" class="transparent">
                      <ion-select
                        v-model="formData.repeatMonthWeekday"
                        interface="popover"
                        label="Día de la semana"
                        label-placement="stacked"
                      >
                        <ion-select-option
                          v-for="day in weekDays"
                          :key="day.value"
                          :value="day.value"
                        >
                          {{ day.label }}
                        </ion-select-option>
                      </ion-select>
                    </ion-item>
                  </template>
                </template>

                <!-- Yearly: month + day -->
                <template v-if="formData.repeatFrequency === 'year'">
                  <ion-item lines="full" class="transparent">
                    <ion-select
                      v-model="formData.repeatYearMonth"
                      interface="popover"
                      label="Mes"
                      label-placement="stacked"
                    >
                      <ion-select-option
                        v-for="(m, i) in months"
                        :key="i"
                        :value="i + 1"
                      >
                        {{ m }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>
                  <ion-item lines="full" class="transparent">
                    <ion-label>Día</ion-label>
                    <ion-input
                      v-model="formData.repeatYearDay"
                      type="number"
                      style="width: 60px; --padding-start: 0"
                      class="ion-text-end"
                      placeholder="15"
                    />
                  </ion-item>
                </template>
              </ion-card>
            </ion-list>

            <!-- Time section -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item class="transparent">
                  <ion-label>Hora (opcional)</ion-label>
                  <ion-input
                    v-model="formData.time"
                    type="time"
                    style="max-width: 140px"
                    class="ion-text-end"
                  />
                </ion-item>

                <ion-item v-if="formData.time" lines="full" class="transparent">
                  <ion-label>Insertar automáticamente</ion-label>
                  <ion-toggle v-model="formData.autoInsert" />
                </ion-item>

                <ion-item v-if="!formData.time" lines="full" class="transparent">
                  <ion-note color="medium">
                    Sin hora definida: aparecerá en pendientes al llegar la fecha
                  </ion-note>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Dates section -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item
                  lines="full"
                  class="transparent"
                  button
                  @click="openDatePicker('start')"
                >
                  <ion-label>Fecha de inicio</ion-label>
                  <ion-label slot="end">{{ formData.startDate }}</ion-label>
                </ion-item>

                <ion-item
                  lines="full"
                  class="transparent"
                  button
                  @click="openDatePicker('end')"
                >
                  <ion-label>Fecha de término</ion-label>
                  <ion-label slot="end">{{ formData.endDate || 'Indefinido' }}</ion-label>
                </ion-item>

                <ion-item v-if="formData.endDate" lines="full" class="transparent" button @click="clearEndDate">
                  <ion-label color="danger">Quitar fecha de término</ion-label>
                </ion-item>
              </ion-card>
            </ion-list>

            <!-- Provedor-specific: products section -->
            <template v-if="formData.type === 'provedor'">
              <ion-list class="ion-padding-start ion-padding-end">
                <ion-list-header>
                  <ion-label>Productos</ion-label>
                  <ion-button @click="addProduct">
                    <ion-icon slot="start" :icon="addOutline" />
                  </ion-button>
                </ion-list-header>

                <ion-card class="shadow1">
                  <ion-item
                    v-for="(product, index) in products"
                    :key="index"
                    lines="full"
                    class="transparent"
                  >
                    <ion-input
                      v-model="product.productName"
                      placeholder="Nombre"
                      style="flex: 1; --padding-start: 0"
                    />
                    <ion-input
                      v-model="product.productPrice"
                      type="number"
                      placeholder="Precio"
                      style="width: 80px; text-align: end"
                    />
                    <ion-input
                      v-model="product.quantity"
                      type="number"
                      placeholder="Cant"
                      style="width: 60px; text-align: end"
                    />
                    <ion-button fill="clear" color="danger" size="small" @click="removeProduct(index)">
                      <ion-icon :icon="trashOutline" />
                    </ion-button>
                  </ion-item>
                </ion-card>
              </ion-list>

              <!-- Account distribution -->
              <ion-list class="ion-padding-start ion-padding-end">
                <AccountDistributionSection
                  :items="items"
                  header-label="Distribución por Cuenta"
                  :can-add-more="true"
                  :is-day-closed="false"
                  reverse-order
                  @add-item="addItem"
                  @remove-item="removeItem"
                  @update-item-amount="updateItemAmount"
                >
                  <template #accountSelect="{ index }">
                    <ion-item lines="full" class="transparent" button @click="openAccountModal(index)">
                      <ion-label>
                        Cuenta
                        <p>{{ getAccountName(items[index].accountId) || 'Seleccionar' }}</p>
                      </ion-label>
                    </ion-item>
                  </template>
                </AccountDistributionSection>
              </ion-list>
            </template>

            <!-- Notes -->
            <ion-list class="ion-padding-start ion-padding-end">
              <ion-card class="shadow1">
                <ion-item class="transparent">
                  <ion-textarea
                    v-model="formData.notes"
                    label="Notas"
                    label-placement="floating"
                    placeholder="Opcional"
                    :rows="3"
                  />
                </ion-item>
              </ion-card>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <!-- Date picker popover -->
    <DatePickerPopover
      :popover-state="datePickerState"
      :show-picker="showDatePicker"
      :temp-picker-date-iso="tempDateISO"
      :can-apply="!!tempDateISO"
      @did-dismiss="closeDatePicker"
      @cancel="closeDatePicker"
      @apply="applyDatePicker"
      @update:temp-picker-date-iso="tempDateISO = $event"
    />

    <!-- Options popover -->
    <ion-popover
      :is-open="optionsPopover.open"
      :event="optionsPopover.event"
      @did-dismiss="optionsPopover.open = false"
    >
      <ion-content>
        <ion-item button @click="confirmDelete">
          <ion-icon slot="start" :icon="trashOutline" color="danger" />
          <ion-label color="danger">Eliminar</ion-label>
        </ion-item>
      </ion-content>
    </ion-popover>

    <QuickAccountAlert
      :is-open="quickAccount.showQuickAccountAlert.value"
      :inputs="quickAccount.quickAccountInputs"
      :buttons="quickAccount.quickAccountButtons"
      @did-dismiss="quickAccount.showQuickAccountAlert.value = false"
    />
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage, IonContent, IonGrid, IonRow, IonCol,
  IonList, IonListHeader, IonCard, IonItem, IonLabel,
  IonInput, IonSelect, IonSelectOption, IonSegment, IonSegmentButton,
  IonChip, IonToggle, IonTextarea, IonButton, IonIcon,
  IonPopover, IonNote,
} from '@ionic/vue';
import { addOutline, trashOutline } from 'ionicons/icons';
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { format } from 'date-fns';
import accountsController from '@/controllers/accountsController';
import recurringController, { type RecurringRecord, type RecurringProduct, type RecurringItem } from '@/controllers/recurringController';
import { useQuickAccount } from '@/composables/useQuickAccount';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import EditPageHeader from '@/views/budget/components/EditPageHeader.vue';
import AccountDistributionSection from '@/views/budget/components/AccountDistributionSection.vue';
import DatePickerPopover from '@/views/budget/components/DatePickerPopover.vue';
import QuickAccountAlert from '@/views/budget/components/QuickAccountAlert.vue';
import { useSync } from '@/composables/useSync';

interface FormData {
  id?: string | number;
  sync_id?: string;
  type: 'cargo' | 'provedor';
  entryType: 'ingreso' | 'egreso';
  name: string;
  amount: number | string;
  accountId: string | number | null;
  repeatFrequency: 'day' | 'week' | 'month' | 'year';
  repeatInterval: number | string;
  repeatDays: number[];
  repeatMonthDay: number | string;
  repeatMonthWeekdayMode: boolean;
  repeatMonthWeekday: number;
  repeatMonthWeekdayOrdinal: number | null;
  repeatYearMonth: number | string;
  repeatYearDay: number | string;
  time: string;
  autoInsert: boolean;
  startDate: string;
  endDate: string | null;
  estimated: number | string;
  notes: string;
  status: 'active' | 'paused' | 'deleted';
}

const router = useRouter();
const route = useRoute();

const isEditing = computed(() => !!route.query.id);
const weekDays = [
  { value: 0, label: 'D' },
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'M' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
];
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const monthMode = ref<'fixed' | 'weekday'>('fixed');

const formData = reactive<FormData>({
  type: 'cargo',
  entryType: 'egreso',
  name: '',
  amount: '',
  accountId: null,
  repeatFrequency: 'month',
  repeatInterval: 1,
  repeatDays: [new Date().getDay()],
  repeatMonthDay: new Date().getDate(),
  repeatMonthWeekdayMode: false,
  repeatMonthWeekday: new Date().getDay(),
  repeatMonthWeekdayOrdinal: null,
  repeatYearMonth: new Date().getMonth() + 1,
  repeatYearDay: new Date().getDate(),
  time: '',
  autoInsert: false,
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: null,
  estimated: '',
  notes: '',
  status: 'active',
});

const products = ref<RecurringProduct[]>([]);
const items = ref<RecurringItem[]>([{ amount: '', accountId: null }]);

const accounts = computed(() => {
  const list = accountsController.getAccounts();
  return list || [];
});

const datePickerTarget = ref<'start' | 'end' | null>(null);
const showDatePicker = ref(false);
const tempDateISO = ref('');
const datePickerState = ref(null);

const optionsPopover = reactive({ open: false, event: null as Event | null });

const quickAccount = useQuickAccount({
  onAccountCreated: ({ newAccount, targetIndex }) => {
    if (targetIndex != null && items.value[targetIndex]) {
      items.value[targetIndex].accountId = newAccount.id as string | number;
    } else if (targetIndex === undefined) {
      formData.accountId = newAccount.id as string | number;
    }
  },
});

const deleteConfirm = useDeleteConfirm({
  onConfirm: handleDelete,
});

const isFormValid = computed(() => {
  return formData.name.trim().length > 0;
});

function onTypeChange() {
  if (formData.type === 'provedor') {
    formData.amount = '';
  }
}

function onFrequencyChange() {
  if (formData.repeatFrequency === 'week' && formData.repeatDays.length === 0) {
    formData.repeatDays = [new Date().getDay()];
  }
}

function toggleDay(day: number) {
  const idx = formData.repeatDays.indexOf(day);
  if (idx >= 0) {
    formData.repeatDays.splice(idx, 1);
  } else {
    formData.repeatDays.push(day);
  }
}

function addProduct() {
  products.value.push({ productName: '', productPrice: 0, quantity: 1 });
}

function removeProduct(index: number) {
  products.value.splice(index, 1);
}

function addItem() {
  items.value.push({ amount: 0, accountId: null });
}

function removeItem(params: { index: number }) {
  if (items.value.length > 1) {
    items.value.splice(params.index, 1);
  }
}

function updateItemAmount(params: { index: number; amount: string }) {
  items.value[params.index].amount = params.amount;
}

function openAccountModal(index: number) {
  quickAccount.openQuickAccountAlert({ targetIndex: index });
}

function getAccountName(accountId: string | number | { id: string | number } | null): string {
  if (!accountId) return '';
  const id = typeof accountId === 'object' ? accountId.id : accountId;
  const acc = accounts.value.find((a: any) => String(a.id) === String(id));
  return acc?.name || '';
}

function openDatePicker(target: 'start' | 'end') {
  datePickerTarget.value = target;
  tempDateISO.value = target === 'start' ? formData.startDate : (formData.endDate || formData.startDate);
  showDatePicker.value = true;
}

function closeDatePicker() {
  showDatePicker.value = false;
  datePickerTarget.value = null;
}

function applyDatePicker() {
  if (datePickerTarget.value === 'start') {
    formData.startDate = tempDateISO.value.slice(0, 10);
  } else if (datePickerTarget.value === 'end') {
    formData.endDate = tempDateISO.value.slice(0, 10);
  }
  closeDatePicker();
}

function clearEndDate() {
  formData.endDate = null;
}

function openOptionsPopover(e: Event) {
  optionsPopover.event = e;
  optionsPopover.open = true;
}

function handleBack() {
  router.back();
}

async function handleSave() {
  const recordData: Omit<RecurringRecord, 'id' | 'sync_id' | 'createdAt'> = {
    type: formData.type,
    entryType: formData.entryType,
    name: formData.name.trim(),
    amount: formData.type === 'cargo' ? Number(formData.amount) || 0 : undefined,
    accountId: formData.accountId,
    repeatFrequency: formData.repeatFrequency,
    repeatInterval: Number(formData.repeatInterval) || 1,
    repeatDays: formData.repeatFrequency === 'week' ? formData.repeatDays : undefined,
    repeatMonthDay: formData.repeatFrequency === 'month' && monthMode.value === 'fixed' ? Number(formData.repeatMonthDay) || 1 : undefined,
    repeatMonthWeekdayMode: formData.repeatFrequency === 'month' && monthMode.value === 'weekday',
    repeatMonthWeekday: formData.repeatFrequency === 'month' && monthMode.value === 'weekday' ? formData.repeatMonthWeekday : undefined,
    repeatMonthWeekdayOrdinal: formData.repeatMonthWeekdayOrdinal,
    repeatYearMonth: formData.repeatFrequency === 'year' ? Number(formData.repeatYearMonth) || 1 : undefined,
    repeatYearDay: formData.repeatFrequency === 'year' ? Number(formData.repeatYearDay) || 1 : undefined,
    time: formData.time || undefined,
    autoInsert: formData.autoInsert,
    startDate: formData.startDate,
    endDate: formData.endDate || null,
    estimated: formData.type === 'provedor' ? Number(formData.estimated) || 0 : undefined,
    products: formData.type === 'provedor' ? products.value.filter(p => p.productName.trim()) : undefined,
    items: formData.type === 'provedor' ? items.value.map(i => ({
      amount: Number(i.amount) || 0,
      accountId: typeof i.accountId === 'object' ? (i.accountId as { id: string | number }).id : i.accountId,
    })) : undefined,
    notes: formData.notes || undefined,
    status: 'active',
  };

  if (isEditing.value && formData.id) {
    await recurringController.updateRecord(formData.id, recordData as any);
  } else {
    await recurringController.addRecord(recordData);
  }

  router.back();
}

async function handleDelete() {
  if (formData.id) {
    await recurringController.removeRecord(formData.id);
  }
  router.back();
}

async function confirmDelete() {
  optionsPopover.open = false;
  deleteConfirm.openDeleteAlert();
}

onMounted(async () => {
  const editId = route.query.id as string;
  if (isEditing.value && editId) {
    const record = await recurringController.getRecordById(editId);
    if (record) {
      formData.id = record.id;
      formData.sync_id = record.sync_id;
      formData.type = record.type;
      formData.entryType = record.entryType;
      formData.name = record.name;
      formData.amount = record.amount ?? '';
      formData.accountId = record.accountId ?? null;
      formData.repeatFrequency = record.repeatFrequency;
      formData.repeatInterval = record.repeatInterval;
      formData.repeatDays = record.repeatDays || [new Date().getDay()];
      formData.repeatMonthDay = record.repeatMonthDay ?? '';
      formData.repeatMonthWeekdayMode = record.repeatMonthWeekdayMode || false;
      formData.repeatMonthWeekday = record.repeatMonthWeekday ?? new Date().getDay();
      formData.repeatMonthWeekdayOrdinal = record.repeatMonthWeekdayOrdinal ?? null;
      formData.repeatYearMonth = record.repeatYearMonth ?? (new Date().getMonth() + 1);
      formData.repeatYearDay = record.repeatYearDay ?? '';
      formData.time = record.time || '';
      formData.autoInsert = record.autoInsert || false;
      formData.startDate = record.startDate || format(new Date(), 'yyyy-MM-dd');
      formData.endDate = record.endDate || null;
      formData.estimated = record.estimated ?? '';
      formData.notes = record.notes || '';
      formData.status = record.status || 'active';
      products.value = record.products || [];
      items.value = (record.items && record.items.length > 0)
        ? record.items.map(i => ({ amount: i.amount, accountId: i.accountId }))
        : [{ amount: '', accountId: null }];
      if (record.repeatMonthWeekdayMode) {
        monthMode.value = 'weekday';
      }
    }
  }
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/views/recurring/RecurringEditPage.vue
git commit -m "feat: add RecurringEditPage form component"
```

---

### Task 8: Frontend — RecurringPage (List View)

**Files:**
- Create: `front/src/views/recurring/RecurringPage.vue`

- [ ] **Step 1: Create the RecurringPage component**

```vue
<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Gastos Recurrentes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Filter tabs -->
      <ion-toolbar>
        <ion-segment v-model="filter" @ion-change="loadRecords">
          <ion-segment-button value="all">
            <ion-label>Todos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="cargo">
            <ion-label>Cargos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="provedor">
            <ion-label>Provedores</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <div class="ion-padding-start ion-padding-end">
        <!-- Pending section -->
        <div v-if="pendingToday.length > 0" style="background: #fff3cd; border-radius: 12px; padding: 12px; margin-bottom: 16px">
          <div style="font-size: 13px; font-weight: 600; color: #856404; margin-bottom: 8px">
            Pendientes para hoy ({{ formatDate(today) }})
          </div>
          <div
            v-for="item in pendingToday"
            :key="item.record.sync_id"
            style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0"
          >
            <div>
              <span style="font-weight: 500">{{ item.record.name }}</span>
              <span style="font-size: 12px; color: #666; margin-left: 8px">
                {{ item.record.type === 'cargo' ? item.record.amount : `~${item.record.estimated}` }}
              </span>
            </div>
            <ion-button size="small" color="warning" @click="applyPending(item)">Aplicar</ion-button>
          </div>
        </div>

        <!-- List of recurring records -->
        <ion-list>
          <ion-card
            v-for="record in filteredRecords"
            :key="record.sync_id"
            class="shadow1"
            :style="{ opacity: record.status === 'paused' ? 0.5 : 1 }"
          >
            <ion-item
              button
              lines="full"
              class="transparent"
              @click="editRecord(record)"
            >
              <ion-label>
                <div style="display: flex; align-items: center; gap: 8px">
                  <span style="font-weight: 500">{{ record.name }}</span>
                  <ion-badge :color="record.type === 'cargo' ? 'primary' : 'tertiary'" style="font-size: 10px">
                    {{ record.type === 'cargo' ? 'Cargo' : 'Prov.' }}
                  </ion-badge>
                  <ion-badge :color="record.entryType === 'ingreso' ? 'success' : 'danger'" style="font-size: 10px">
                    {{ record.entryType === 'ingreso' ? 'Ingreso' : 'Gasto' }}
                  </ion-badge>
                  <ion-badge v-if="record.status === 'paused'" color="medium" style="font-size: 10px">
                    Pausado
                  </ion-badge>
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 4px">
                  {{ getFrequencyDescription(record) }} · Próximo: {{ getNextDate(record) }}
                </p>
              </ion-label>
              <ion-toggle
                slot="end"
                :checked="record.status === 'active'"
                @ion-change="toggleRecord(record)"
                @click.stop
              />
            </ion-item>
          </ion-card>

          <div v-if="filteredRecords.length === 0" class="ion-text-center ion-padding">
            <ion-label color="medium">No hay registros recurrentes</ion-label>
          </div>
        </ion-list>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="createRecord">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonCard, IonItem, IonLabel, IonBadge,
  IonToggle, IonFab, IonFabButton, IonIcon,
  IonSegment, IonSegmentButton, IonButton,
} from '@ionic/vue';
import { addOutline, repeatOutline } from 'ionicons/icons';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import recurringController, { type RecurringRecord } from '@/controllers/recurringController';
import { useRecurrence } from '@/composables/useRecurrence';
import budgetController from '@/controllers/budgetController';

const router = useRouter();
const { getDueRecordsForDate, getNextOccurrence } = useRecurrence();

const filter = ref<'all' | 'cargo' | 'provedor'>('all');
const allRecords = ref<RecurringRecord[]>([]);
const pendingToday = ref<{ record: RecurringRecord }[]>([]);
const today = format(new Date(), 'yyyy-MM-dd');

const filteredRecords = computed(() => {
  if (filter.value === 'all') return allRecords.value;
  return allRecords.value.filter((r) => r.type === filter.value);
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

function getFrequencyDescription(record: RecurringRecord): string {
  const interval = record.repeatInterval || 1;
  switch (record.repeatFrequency) {
    case 'day': return `Cada ${interval} día${interval > 1 ? 's' : ''}`;
    case 'week': {
      const days = record.repeatDays?.map((d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ') || '';
      return `Cada ${interval} semana${interval > 1 ? 's' : ''} (${days})`;
    }
    case 'month': {
      if (record.repeatMonthWeekdayMode) {
        return `Cada ${interval} mes(es) (día de semana)`;
      }
      return `Cada ${interval} mes(es) el día ${record.repeatMonthDay}`;
    }
    case 'year': return `Cada ${interval} año${interval > 1 ? 's' : ''}`;
    default: return '';
  }
}

function getNextDate(record: RecurringRecord): string {
  const next = getNextOccurrence(record);
  if (!next) return '—';
  const d = new Date(next + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadRecords() {
  const records = await recurringController.getActiveRecords();
  allRecords.value = records;

  const { pending } = getDueRecordsForDate(records, today);
  pendingToday.value = pending.map((record) => ({ record }));
}

async function toggleRecord(record: RecurringRecord) {
  await recurringController.toggleActive(record.id!);
  await loadRecords();
}

function editRecord(record: RecurringRecord) {
  router.push({ name: 'RecurringEdit', query: { id: record.id } });
}

function createRecord() {
  router.push({ name: 'RecurringNew' });
}

function applyPending(params: { record: RecurringRecord }) {
  const { record } = params;
  if (record.type === 'cargo') {
    budgetController.addIngreso({
      name: record.name,
      amount: Number(record.amount) || 0,
      accountId: record.accountId ?? undefined,
      entryType: record.entryType,
      date: today,
      _fromRecurringId: record.sync_id,
    });
  } else {
    budgetController.addProvider({
      name: record.name,
      estimated: Number(record.estimated) || 0,
      accountId: record.accountId as number | undefined,
      _supplierName: record.name,
      products: record.products || [],
      items: record.items || [],
      date: today,
      _fromRecurringId: record.sync_id,
    });
  }
  budgetController.saveData();

  pendingToday.value = pendingToday.value.filter((p) => p.record.sync_id !== record.sync_id);
}

onMounted(() => {
  loadRecords();
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/views/recurring/RecurringPage.vue
git commit -m "feat: add RecurringPage list view with pending section"
```

---

### Task 9: Frontend — Router + Menu

**Files:**
- Modify: `front/src/router/index.ts`
- Modify: `front/src/components/MainMenu.vue`

- [ ] **Step 1: Add routes to router**

In `front/src/router/index.ts`, add the three new routes:

```typescript
import RecurringPage from '@/views/recurring/RecurringPage.vue';
import RecurringEditPage from '@/views/recurring/RecurringEditPage.vue';
```

Add to routes array:
```typescript
{
  path: '/recurring',
  name: 'RecurringPage',
  component: RecurringPage,
},
{
  path: '/recurring/new',
  name: 'RecurringNew',
  component: RecurringEditPage,
},
{
  path: '/recurring/edit',
  name: 'RecurringEdit',
  component: RecurringEditPage,
},
```

- [ ] **Step 2: Add menu item**

In `front/src/components/MainMenu.vue`, after the Provedores menu item, add:

```html
<ion-item
  button
  detail="false"
  @click="emit('navigate', { path: '/recurring', name: 'RecurringPage' })"
>
  <ion-icon slot="start" :icon="repeatOutline" />
  <ion-label>Recurrentes</ion-label>
</ion-item>
```

Add `repeatOutline` to the icon imports at the top of the script:
```typescript
import { repeatOutline } from 'ionicons/icons';
```

- [ ] **Step 3: Commit**

```bash
git add front/src/router/index.ts front/src/components/MainMenu.vue
git commit -m "feat: add recurring page routes and menu item"
```

---

### Task 10: Frontend — BudgetView Integration (Pending Section)

**Files:**
- Modify: `front/src/views/budget/BudgetView.vue`
- Modify: `front/src/controllers/budgetController.ts`

- [ ] **Step 1: Add getTodayEntries/getTodayProviders with _fromRecurringId check to budgetController**

In `front/src/controllers/budgetController.ts`, add a method to check if a recurring record was already applied:

```typescript
hasAppliedRecurring(recurringSyncId: string): boolean {
  const entries = this.store.entries || [];
  const providers = this.store.providers || [];
  const allItems = [...entries, ...providers];
  return allItems.some((item: any) => item._fromRecurringId === recurringSyncId);
}
```

- [ ] **Step 2: Add pending section to BudgetView**

In `front/src/views/budget/BudgetView.vue`, add a pending recurring banner that appears at the top of the content when there are pending items for the selected date. This should be added after the header toolbar and before the content area:

```vue
<!-- Pending recurring section -->
<template v-if="pendingRecurring.length > 0">
  <div class="ion-padding-start ion-padding-end ion-padding-top">
    <ion-card style="background: #fff3cd; border-radius: 12px; margin: 0">
      <ion-item lines="none" style="--background: transparent">
        <ion-icon slot="start" :icon="repeatOutline" color="warning" />
        <ion-label>
          <div style="font-weight: 600; font-size: 13px; color: #856404">
            {{ pendingRecurring.length }} recurrente(s) pendiente(s)
          </div>
        </ion-label>
        <ion-button slot="end" fill="clear" size="small" @click="showAllPending = !showAllPending">
          <ion-icon :icon="showAllPending ? chevronUpOutline : chevronDownOutline" />
        </ion-button>
      </ion-item>

      <template v-if="showAllPending">
        <ion-item
          v-for="item in pendingRecurring"
          :key="item.record.sync_id"
          lines="full"
          style="--background: transparent"
        >
          <ion-label style="font-size: 13px">
            {{ item.record.name }}
            <p style="font-size: 11px; color: #856404">
              {{ item.record.type === 'cargo' ? `$${item.record.amount}` : `~$${item.record.estimated}` }}
              · {{ item.record.type === 'cargo' ? 'Cargo' : 'Provedor' }}
            </p>
          </ion-label>
          <ion-button slot="end" size="small" color="warning" @click="applyPendingRecurring(item.record)">
            Aplicar
          </ion-button>
        </ion-item>
      </template>
    </ion-card>
  </div>
</template>
```

Add imports:
```typescript
import { repeatOutline, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
```

Add script variables:
```typescript
import { useRecurrence } from '@/composables/useRecurrence';
import recurringController from '@/controllers/recurringController';
// ...
const pendingRecurring = ref<{ record: any }[]>([]);
const showAllPending = ref(false);
```

Add to `onMounted` or a watcher on `selectedDate`:
```typescript
async function checkPendingRecurring() {
  const date = budgetController.getSelectedDate();
  if (!date) return;

  const records = await recurringController.getActiveRecords();
  const { autoInsert, pending } = getDueRecordsForDate(records, date);

  // Auto-insert records silently
  for (const record of autoInsert) {
    if (budgetController.hasAppliedRecurring(record.sync_id!)) continue;
    applyRecurringToBudget(record);
  }

  // Pending records shown in banner
  const notApplied = pending.filter((r) => !budgetController.hasAppliedRecurring(r.sync_id!));
  pendingRecurring.value = notApplied.map((record) => ({ record }));
}

function applyRecurringToBudget(record: any) {
  if (record.type === 'cargo') {
    budgetController.addIngreso({
      name: record.name,
      amount: Number(record.amount) || 0,
      accountId: record.accountId ?? undefined,
      entryType: record.entryType,
      date: budgetController.getSelectedDate(),
      _fromRecurringId: record.sync_id,
    });
  } else {
    budgetController.addProvider({
      name: record.name,
      estimated: Number(record.estimated) || 0,
      accountId: record.accountId as number | undefined,
      _supplierName: record.name,
      products: record.products || [],
      items: record.items || [],
      date: budgetController.getSelectedDate(),
      _fromRecurringId: record.sync_id,
    });
  }
  budgetController.saveData();
}
```

Update `applyPendingRecurring` to reuse `applyRecurringToBudget`:
```typescript
function applyPendingRecurring(record: any) {
  applyRecurringToBudget(record);
  pendingRecurring.value = pendingRecurring.value.filter((p) => p.record.sync_id !== record.sync_id);
}
```

Add apply function:
```typescript
function applyPendingRecurring(record: any) {
  if (record.type === 'cargo') {
    budgetController.addIngreso({
      name: record.name,
      amount: Number(record.amount) || 0,
      accountId: record.accountId ?? undefined,
      entryType: record.entryType,
      date: budgetController.getSelectedDate(),
      _fromRecurringId: record.sync_id,
    });
  } else {
    budgetController.addProvider({
      name: record.name,
      estimated: Number(record.estimated) || 0,
      accountId: record.accountId as number | undefined,
      _supplierName: record.name,
      products: record.products || [],
      items: record.items || [],
      date: budgetController.getSelectedDate(),
      _fromRecurringId: record.sync_id,
    });
  }
  budgetController.saveData();
  pendingRecurring.value = pendingRecurring.value.filter((p) => p.record.sync_id !== record.sync_id);
}
```

- [ ] **Step 3: Commit**

```bash
git add front/src/views/budget/BudgetView.vue front/src/controllers/budgetController.ts
git commit -m "feat: integrate recurring pending section into BudgetView"
```

---

### Task 11: Run Frontend Typecheck and Lint

**Files:** N/A (verification step)

- [ ] **Step 1: Run typecheck**

```bash
cd /home/dowardev/Documentos/programacion/oneSpend/front && pnpm run typecheck
```

Fix any type errors.

- [ ] **Step 2: Run lint**

```bash
cd /home/dowardev/Documentos/programacion/oneSpend/front && pnpm run lint
```

Fix any lint errors.

- [ ] **Step 3: Run backend tests**

```bash
cd /home/dowardev/Documentos/programacion/oneSpend/back && composer test
```
