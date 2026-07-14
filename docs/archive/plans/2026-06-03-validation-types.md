# Validation Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add proper type validation to all create/update/delete operations in both backend and frontend.

**Architecture:** Backend-first: FormRequests by entity for sync endpoints, plus fixes for $fillable bypass and bugs. Then frontend: Vuelidate for all forms + stricter TypeScript types.

**Tech Stack:** Laravel 12 (PHP 8.2+), Ionic Vue 8 (TypeScript), Vuelidate

---

### Task 1: Backend — Create SyncMergeRequest FormRequest

**Files:**
- Create: `back/app/Http/Requests/Sync/SyncMergeRequest.php`
- Modify: `back/app/Http/Controllers/SyncController.php:63`
- Test: Run `composer test`

- [ ] **Step 1: Create SyncMergeRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SyncMergeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data' => 'required|array',
            'data.account' => 'sometimes|array',
            'data.supplier' => 'sometimes|array',
            'data.supplier_product' => 'sometimes|array',
            'data.budget_entry' => 'sometimes|array',
            'data.budget_provider' => 'sometimes|array',
            'data.budget_provider_product' => 'sometimes|array',
            'data.recurring_record' => 'sometimes|array',
            'data.recurring_record_product' => 'sometimes|array',
        ];
    }

    public function messages(): array
    {
        return [
            'data.required' => 'El campo data es obligatorio.',
            'data.array' => 'El campo data debe ser un array.',
        ];
    }
}
```

- [ ] **Step 2: Inject SyncMergeRequest into SyncController@merge**

Read the current `merge()` method signature:

```php
public function merge(Request $request): JsonResponse
```

Change to:

```php
public function merge(SyncMergeRequest $request): JsonResponse
```

Remove the `$request->input('data', [])` default — the validation ensures `data` is present.

Run: `cd back && composer test`
Expected: All tests pass (or no tests exist yet, verify no breakage)

- [ ] **Step 3: Commit**

```
git add back/app/Http/Requests/Sync/SyncMergeRequest.php back/app/Http/Controllers/SyncController.php
git commit -m "feat(back): add SyncMergeRequest FormRequest for top-level validation"
```

---

### Task 2: Backend — Create SyncResolveConflictRequest

**Files:**
- Create: `back/app/Http/Requests/Sync/SyncResolveConflictRequest.php`
- Modify: `back/app/Http/Controllers/SyncController.php:resolveConflict`

- [ ] **Step 1: Create SyncResolveConflictRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use App\Http\Controllers\SyncController;
use Illuminate\Foundation\Http\FormRequest;

class SyncResolveConflictRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entity_type' => ['required', 'string', 'in:' . implode(',', array_keys(SyncController::ENTITY_TYPES))],
            'entity_id' => 'required|string|max:100',
            'resolution' => 'required|in:server,client',
            'client_data' => 'required_if:resolution,client|array|nullable',
        ];
    }
}
```

**Note:** ENTITY_TYPES is private const — will need to make it public or add a getter. Let's add a public static method.

- [ ] **Step 2: Add getEntityTypes() to SyncController**

Add to SyncController:

```php
public static function getEntityTypes(): array
{
    return self::ENTITY_TYPES;
}
```

Change ENTITY_TYPES from `private const` to `public const`.

- [ ] **Step 3: Inject into resolveConflict**

Read current signature:

```php
public function resolveConflict(Request $request): JsonResponse
```

Change to:

```php
public function resolveConflict(SyncResolveConflictRequest $request): JsonResponse
```

- [ ] **Step 4: Commit**

```
git add back/app/Http/Requests/Sync/SyncResolveConflictRequest.php back/app/Http/Controllers/SyncController.php
git commit -m "feat(back): add SyncResolveConflictRequest FormRequest"
```

---

### Task 3: Backend — Create per-entity FormRequests (Accounts, Suppliers, SupplierProducts)

**Files:**
- Create: `back/app/Http/Requests/Sync/AccountSyncRequest.php`
- Create: `back/app/Http/Requests/Sync/SupplierSyncRequest.php`
- Create: `back/app/Http/Requests/Sync/SupplierProductSyncRequest.php`

- [ ] **Step 1: Create AccountSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class AccountSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'initial_balance' => 'required|numeric|min:0',
            'status' => 'sometimes|in:active,archived,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 2: Create SupplierSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SupplierSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 3: Create SupplierProductSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class SupplierProductSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'supplier_id' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'image_base64' => 'nullable|string|max:5242880',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 4: Commit**

```
git add back/app/Http/Requests/Sync/AccountSyncRequest.php back/app/Http/Requests/Sync/SupplierSyncRequest.php back/app/Http/Requests/Sync/SupplierProductSyncRequest.php
git commit -m "feat(back): add Account, Supplier, SupplierProduct sync requests"
```

---

### Task 4: Backend — Create per-entity FormRequests (BudgetEntries, BudgetEntryGroups)

**Files:**
- Create: `back/app/Http/Requests/Sync/BudgetEntrySyncRequest.php`

- [ ] **Step 1: Create BudgetEntrySyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetEntrySyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric',
            'date' => 'required|date',
            'payment_type' => 'required|in:cash,digital',
            'entry_type' => 'required|in:ingreso,egreso',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'supplier_id' => 'nullable|string|max:100',
            'supplier_name' => 'nullable|string|max:255',
            '_from_recurring_id' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
            'groups' => 'nullable|array',
            'groups.*.account_id' => 'nullable|integer|exists:accounts,id',
            'groups.*.amount' => 'required_with:groups|numeric',
        ];
    }
}
```

- [ ] **Step 2: Commit**

```
git add back/app/Http/Requests/Sync/BudgetEntrySyncRequest.php
git commit -m "feat(back): add BudgetEntry sync request with group validation"
```

---

### Task 5: Backend — Create per-entity FormRequests (BudgetProviders, BudgetProviderProducts)

**Files:**
- Create: `back/app/Http/Requests/Sync/BudgetProviderSyncRequest.php`
- Create: `back/app/Http/Requests/Sync/BudgetProviderProductSyncRequest.php`

- [ ] **Step 1: Create BudgetProviderSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetProviderSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'estimated' => 'required|numeric',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'efectivo' => 'nullable|numeric|min:0',
            'tarjeta' => 'nullable|numeric|min:0',
            'credito' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:65535',
            'visited' => 'nullable|boolean',
            '_supplier_id' => 'nullable|string|max:100',
            '_supplier_name' => 'nullable|string|max:255',
            '_from_recurring_id' => 'nullable|string|max:100',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 2: Create BudgetProviderProductSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class BudgetProviderProductSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'budget_provider_id' => 'required|string|max:100',
            'supplier_product_id' => 'nullable|integer|exists:supplier_products,id',
            'product_name' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'status' => 'sometimes|in:active,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 3: Commit**

```
git add back/app/Http/Requests/Sync/BudgetProviderSyncRequest.php back/app/Http/Requests/Sync/BudgetProviderProductSyncRequest.php
git commit -m "feat(back): add BudgetProvider and BudgetProviderProduct sync requests"
```

---

### Task 6: Backend — Create per-entity FormRequests (RecurringRecords, RecurringRecordProducts)

**Files:**
- Create: `back/app/Http/Requests/Sync/RecurringRecordSyncRequest.php`
- Create: `back/app/Http/Requests/Sync/RecurringRecordProductSyncRequest.php`

- [ ] **Step 1: Create RecurringRecordSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class RecurringRecordSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => 'required|in:cargo,provedor',
            'entry_type' => 'required|in:ingreso,egreso',
            'name' => 'required|string|max:255',
            'amount' => 'nullable|numeric',
            'account_id' => 'nullable|integer|exists:accounts,id',
            'repeat_frequency' => 'required|in:day,week,month,year',
            'repeat_interval' => 'required|integer|min:1',
            'repeat_days' => 'nullable|array',
            'repeat_month_day' => 'nullable|integer|min:1|max:31',
            'repeat_month_weekday_mode' => 'nullable|boolean',
            'repeat_month_weekday' => 'nullable|integer|min:0|max:6',
            'repeat_month_weekday_ordinal' => 'nullable|integer|min:1|max:5',
            'repeat_year_month' => 'nullable|integer|min:1|max:12',
            'repeat_year_day' => 'nullable|integer|min:1|max:31',
            'time' => 'nullable|date_format:H:i',
            'auto_insert' => 'nullable|boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'estimated' => 'nullable|numeric',
            'items' => 'nullable|array',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:active,paused,deleted',
            'deleted_at' => 'nullable|date',
        ];
    }
}
```

- [ ] **Step 2: Create RecurringRecordProductSyncRequest**

```php
<?php

namespace App\Http\Requests\Sync;

use Illuminate\Foundation\Http\FormRequest;

class RecurringRecordProductSyncRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'recurring_record_id' => 'required|integer|exists:recurring_records,id',
            'supplier_product_id' => 'nullable|integer|exists:supplier_products,id',
            'product_name' => 'required|string|max:255',
            'product_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
        ];
    }
}
```

- [ ] **Step 3: Commit**

```
git add back/app/Http/Requests/Sync/RecurringRecordSyncRequest.php back/app/Http/Requests/Sync/RecurringRecordProductSyncRequest.php
git commit -m "feat(back): add RecurringRecord and RecurringRecordProduct sync requests"
```

---

### Task 7: Backend — Wire validation into SyncController

**Files:**
- Modify: `back/app/Http/Controllers/SyncController.php`
- Modify: `back/app/Requests/Sync/SyncMergeRequest.php` (may need to expose rules statically)

- [ ] **Step 1: Add entity validation helper to SyncController**

```php
use App\Http\Requests\Sync\AccountSyncRequest;
use App\Http\Requests\Sync\BudgetEntrySyncRequest;
use App\Http\Requests\Sync\BudgetProviderProductSyncRequest;
use App\Http\Requests\Sync\BudgetProviderSyncRequest;
use App\Http\Requests\Sync\RecurringRecordProductSyncRequest;
use App\Http\Requests\Sync\RecurringRecordSyncRequest;
use App\Http\Requests\Sync\SupplierProductSyncRequest;
use App\Http\Requests\Sync\SupplierSyncRequest;
use Illuminate\Support\Facades\Validator;

private function validateEntityData(string $entityType, array $items): void
{
    $requestClass = match($entityType) {
        'account' => AccountSyncRequest::class,
        'supplier' => SupplierSyncRequest::class,
        'supplier_product' => SupplierProductSyncRequest::class,
        'budget_entry' => BudgetEntrySyncRequest::class,
        'budget_provider' => BudgetProviderSyncRequest::class,
        'budget_provider_product' => BudgetProviderProductSyncRequest::class,
        'recurring_record' => RecurringRecordSyncRequest::class,
        'recurring_record_product' => RecurringRecordProductSyncRequest::class,
        default => null,
    };

    if ($requestClass === null) {
        return;
    }

    $rules = (new $requestClass())->rules();

    foreach ($items as $index => $item) {
        $validator = Validator::make($item, $rules);

        if ($validator->fails()) {
            throw new \Illuminate\Validation\ValidationException($validator);
        }
    }
}
```

- [ ] **Step 2: Call validation at start of merge()**

In `merge()`, after `$data = $request->input('data', []);`:

```php
foreach ($data as $entityType => $items) {
    if (!is_array($items)) {
        continue;
    }
    $this->validateEntityData($entityType, $items);
}
```

- [ ] **Step 3: Wire validation into resolveConflict**

In `resolveConflict()`, after SyncResolveConflictRequest passes, if `$request->resolution === 'client' && $request->client_data`:

```php
$this->validateEntityData($request->entity_type, [$request->client_data]);
```

- [ ] **Step 4: Commit**

```
git add back/app/Http/Controllers/SyncController.php
git commit -m "feat(back): wire entity validation into SyncController merge and resolveConflict"
```

---

### Task 8: Backend — Fix $fillable bypass in bulkCreateItems and updateEntity

**Files:**
- Modify: `back/app/Http/Controllers/SyncController.php`

- [ ] **Step 1: Create $fillable filter helper**

```php
use Illuminate\Database\Eloquent\Model;

private function filterToFillable(string $entityType, array $data): array
{
    $modelClass = self::ENTITY_TYPES[$entityType] ?? null;

    if ($modelClass === null || !is_subclass_of($modelClass, Model::class)) {
        return $data;
    }

    $model = new $modelClass();
    $fillable = $model->getFillable();

    if (empty($fillable)) {
        return $data;
    }

    return array_intersect_key($data, array_flip($fillable));
}
```

- [ ] **Step 2: Fix bulkCreateItems**

Find the loop that builds `$insertData`. After constructing each item's data array, filter it:

```php
$insertData[] = $this->filterToFillable($entityType, $itemData);
```

Or if `bulkCreateItems` is dead code (not called from merge), add a note but still fix it.

- [ ] **Step 3: Fix updateEntity**

In `updateEntity()`, before calling `$modelClass::where('sync_id', $syncId)->update($updateData)`:

```php
$updateData = $this->filterToFillable($entityType, $updateData);
```

- [ ] **Step 4: Fix bulkDeleteSuppliers — remove status**

Find in merge() the deletion block for suppliers:

```php
$existing->update(['status' => 'deleted', 'deleted_at' => now()]);
```

Change to:

```php
$existing->update(['deleted_at' => now()]);
```

- [ ] **Step 5: Fix $productOperation undefined variable**

Find line ~704 that references `$productOperation` in a Log::info call. Change to use a default or remove the reference.

Search for `$productOperation` in SyncController. If it's used in a log message like:

```php
Log::info('Processing product', ['operation' => $productOperation]);
```

Change to:

```php
Log::info('Processing product after provider merge');
```

Or remove the log line entirely.

- [ ] **Step 6: Commit**

```
git add back/app/Http/Controllers/SyncController.php
git commit -m "fix(back): fix $fillable bypass, supplier bulkDelete, and undefined variable"
```

---

### Task 9: Frontend — Add Vuelidate to LoginView

**Files:**
- Modify: `front/src/views/auth/LoginView.vue`

- [ ] **Step 1: Add Vuelidate imports and validation rules**

```vue
<script lang="ts" setup>
import { required, email, minLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const rules = {
  email: { required, email },
  password: { required, minLength: minLength(6) },
}

const v$ = useVuelidate(rules, { email, password })
</script>
```

Add submit handler guard:

```typescript
async function onSubmit(params: { email: string; password: string }) {
  const isValid = await v$.value.$validate()
  if (!isValid) return
  // ... existing login logic
}
```

- [ ] **Step 2: Run typecheck and lint**

```
cd front && pnpm run typecheck && pnpm run lint
```

- [ ] **Step 3: Commit**

```
git add front/src/views/auth/LoginView.vue
git commit -m "feat(front): add Vuelidate validation to LoginView"
```

---

### Task 10: Frontend — Add Vuelidate to EntryEditPage

**Files:**
- Modify: `front/src/views/budget/entries/EntryEditPage.vue`

- [ ] **Step 1: Read current file and add Vuelidate**

```
cd /home/dowardev/Documentos/programacion/oneSpend
```

Read the file and find where `isFormValid` is currently computed.

Add:

```vue
<script lang="ts" setup>
import { required, numeric, minValue } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const rules = {
  name: { required },
  amount: { required, numeric, minValue: minValue(0.01) },
  date: { required },
}

const v$ = useVuelidate(rules, { name: entryData.name, amount: entryData.amount, date: entryData.date })
</script>
```

Replace the existing `isFormValid` check with `await v$.value.$validate()` in the submit handler.

- [ ] **Step 2: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```
git add front/src/views/budget/entries/EntryEditPage.vue
git commit -m "feat(front): add Vuelidate validation to EntryEditPage"
```

---

### Task 11: Frontend — Add Vuelidate to ProviderEditPage

**Files:**
- Modify: `front/src/views/budget/suppliers/ProviderEditPage.vue`

- [ ] **Step 1: Read current file and add Vuelidate**

Replace the partial `amountValidation.ts` usage with Vuelidate:

```vue
<script lang="ts" setup>
import { required, numeric, minValue } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const rules = {
  name: { required },
  estimated: { required, numeric, minValue: minValue(0) },
  efectivo: { numeric, minValue: minValue(0) },
  tarjeta: { numeric, minValue: minValue(0) },
  credito: { numeric, minValue: minValue(0) },
}

const v$ = useVuelidate(rules, {
  name: providerData.name,
  estimated: providerData.estimated,
  efectivo: providerData.efectivo,
  tarjeta: providerData.tarjeta,
  credito: providerData.credito,
})
</script>
```

- [ ] **Step 2: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```
git add front/src/views/budget/suppliers/ProviderEditPage.vue
git commit -m "feat(front): add Vuelidate validation to ProviderEditPage"
```

---

### Task 12: Frontend — Add Vuelidate to SupplierFormComponent

**Files:**
- Modify: `front/src/views/suppliers/modals/SupplierFormComponent.vue`

- [ ] **Step 1: Read file and add Vuelidate**

Replace HTML5 `required` with Vuelidate:

```vue
<script lang="ts" setup>
import { required, maxLength } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const rules = {
  name: { required, maxLength: maxLength(255) },
}

const v$ = useVuelidate(rules, { name })
</script>
```

- [ ] **Step 2: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```
git add front/src/views/suppliers/modals/SupplierFormComponent.vue
git commit -m "feat(front): add Vuelidate validation to SupplierFormComponent"
```

---

### Task 13: Frontend — Add Vuelidate to RecurringEditPage

**Files:**
- Modify: `front/src/views/recurring/RecurringEditPage.vue`

- [ ] **Step 1: Read file and add Vuelidate**

Replace partial validation:

```vue
<script lang="ts" setup>
import { required, numeric, minValue } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const rules = {
  name: { required },
  amount: { numeric, minValue: minValue(0) },
  startDate: { required },
  repeatFrequency: { required },
}

const v$ = useVuelidate(rules, {
  name: formData.name,
  amount: formData.amount,
  startDate: formData.startDate,
  repeatFrequency: formData.repeatFrequency,
})
</script>
```

- [ ] **Step 2: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```
git add front/src/views/recurring/RecurringEditPage.vue
git commit -m "feat(front): add Vuelidate validation to RecurringEditPage"
```

---

### Task 14: Frontend — Fix useQuickAccount negative balance

**Files:**
- Modify: `front/src/composables/useQuickAccount.ts`

- [ ] **Step 1: Add validation to prevent negative initialBalance**

In `createQuickAccount`, add guard:

```typescript
if (params.initialBalance < 0) {
  params.initialBalance = 0
}
```

Or change the coercion:

```typescript
const balance = Math.max(0, Number(data.initialBalance) || 0)
```

- [ ] **Step 2: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```
git add front/src/composables/useQuickAccount.ts
git commit -m "fix(front): prevent negative initialBalance in useQuickAccount"
```

---

### Task 15: Frontend — Improve TypeScript types

**Files:**
- Modify: `front/src/stores/budgetStore.ts`
- Modify: `front/src/controllers/recurringController.ts`
- Modify: `front/src/services/syncService.ts`

- [ ] **Step 1: Fix Income.accountId type**

In `budgetStore.ts`:

```typescript
export interface Income {
  // ...
  accountId?: number | null;  // was: string | number | null, now stricter
  // ...
}
```

Actually, looking at the current types more carefully, the issue is `accountId` is typed as `number` in Provider but can be null. Change:

```typescript
// In Provider interface
accountId: number | null;  // was: number
```

- [ ] **Step 2: Fix RecurringItem.amount normalization**

In `recurringController.ts`, add normalization in `addRecord`:

```typescript
// Normalize items
if (record.items) {
  record.items = record.items.map(item => ({
    ...item,
    amount: Number(item.amount) || 0,
  }))
}
```

- [ ] **Step 3: Remove SyncItemData index signature**

In `syncService.ts`, replace `[key: string]: unknown` with explicit types. However, since this is used extensively and removing it might break code, add explicit fields instead:

```typescript
export interface SyncItemData {
  name?: string;
  date?: string;
  estimated?: number;
  account_id?: number | string;
  // ... existing fields (keep as-is)
  // Remove: [key: string]: unknown
  // Add explicit known fields:
  sync_id?: string;
  user_id?: number;
  status?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: number;
  // ... add all known fields from all entity types
}
```

Actually, this is risky — removing the index signature will cause TypeScript errors everywhere `SyncItemData` is used. Let's keep the index signature for now and just add explicit type fields where needed. This step is lower priority.

**Revised Step 3:** Add explicit fields to SyncItemData without removing index signature yet:

```typescript
export interface SyncItemData {
  // ... existing fields
  sync_id?: string;
  user_id?: number;
  status?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: number;
  supplier_id?: string;
  entry_type?: string;
  payment_type?: string;
  // keep: [key: string]: unknown;
}
```

- [ ] **Step 4: Constrain finishDayData.type**

In `budgetStore.ts` or `budgetController.ts`:

```typescript
// Before: type: '%' | 'fixed' | string
// After: type: '%' | 'fixed'
```

But since it's an interface and string literals widen, change the interface:

```typescript
interface FinishDayData {
  totalSalesEfectivo: number;
  totalSalesTarjeta: number;
  totalSalesCredito: number;
  type: '%' | 'fixed';
  margin: number;
}
```

And in `budgetController.ts`, normalize:

```typescript
if (!['%', 'fixed'].includes(finishDayData.type)) {
  finishDayData.type = '%'
}
```

- [ ] **Step 5: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 6: Commit**

```
git add front/src/stores/budgetStore.ts front/src/controllers/recurringController.ts front/src/controllers/budgetController.ts front/src/services/syncService.ts
git commit -m "fix(front): improve TypeScript types - nullable accountId, amount normalization, constrained unions"
```

---

### Task 16: Frontend — Add max-length to RegisterView and AddAccountComponent

**Files:**
- Modify: `front/src/views/auth/RegisterView.vue`
- Modify: `front/src/views/suppliers/accounts/modals/AddAccountComponent.vue`

- [ ] **Step 1: Add maxLength to RegisterView**

Add to existing Vuelidate rules:

```typescript
import { maxLength } from '@vuelidate/validators'

const rules = {
  name: { required, maxLength: maxLength(255) },
  email: { required, email, maxLength: maxLength(255) },
  user: { required, maxLength: maxLength(255) },
  password: { required, minLength: minLength(6) },
  password_confirmation: { required, sameAs: sameAs(password) },
}
```

- [ ] **Step 2: Add maxLength to AddAccountComponent**

Add to existing Vuelidate rules:

```typescript
import { maxLength } from '@vuelidate/validators'

const rules = {
  name: { required, maxLength: maxLength(255) },
  initialBalance: { required, minValue: minValue(0) },
}
```

- [ ] **Step 3: Run typecheck**

```
cd front && pnpm run typecheck
```

- [ ] **Step 4: Commit**

```
git add front/src/views/auth/RegisterView.vue front/src/views/suppliers/accounts/modals/AddAccountComponent.vue
git commit -m "feat(front): add maxLength validation to RegisterView and AddAccountComponent"
```

---

### Task 17: Run full verification

**Files:** N/A — verification only

- [ ] **Step 1: Run backend tests**

Run: `cd back && composer test`
Expected: All tests pass

- [ ] **Step 2: Run frontend typecheck**

Run: `cd front && pnpm run typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Run frontend lint**

Run: `cd front && pnpm run lint`
Expected: No linting errors

- [ ] **Step 4: Run frontend unit tests**

Run: `cd front && pnpm run test:unit`
Expected: All tests pass
