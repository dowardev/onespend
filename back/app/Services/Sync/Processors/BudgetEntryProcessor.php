<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\BudgetEntryGroup;
use Illuminate\Support\Str;

class BudgetEntryProcessor extends AbstractEntityProcessor
{
    private array $pendingCreateItems = [];

    protected function getModel(): string
    {
        return BudgetEntry::class;
    }

    protected function getEntityName(): string
    {
        return 'budget_entry';
    }

    public function preprocessData(array $item, int $userId): array
    {
        $item = $this->resolveForeignKeys($item, $userId);

        if (isset($item['paymentType'])) {
            $item['payment_type'] = $item['paymentType'];
        }
        if (isset($item['entryType'])) {
            $item['entry_type'] = $item['entryType'];
        }
        if (isset($item['supplierName'])) {
            $item['supplier_name'] = $item['supplierName'];
        }
        if (isset($item['supplierId'])) {
            $item['supplier_id'] = $item['supplierId'];
        }

        unset($item['paymentType'], $item['entryType'], $item['supplierName'],
            $item['supplierId'], $item['accountId']);

        return $item;
    }

    protected function postprocessCreate(array $created, int $userId): void
    {
        $resultWithOriginals = [];
        foreach ($created as $entry) {
            $original = collect($this->pendingCreateItems)
                ->first(fn ($item) => ($item['id'] ?? null) === $entry['sync_id']);
            $entry['_original'] = $original;
            $resultWithOriginals[] = $entry;
        }
        $this->syncEntryGroups($resultWithOriginals, $userId);
    }

    protected function postprocessUpdate(array $updated, int $userId): void
    {
        $this->syncEntryGroups($updated, $userId);
    }

    public function create(array $items, int $userId): array
    {
        $this->pendingCreateItems = $items;
        $result = parent::create($items, $userId);
        $this->pendingCreateItems = [];

        return $result;
    }

    private function syncEntryGroups(array $entries, int $userId): void
    {
        foreach ($entries as $entry) {
            $syncId = $entry['sync_id'] ?? null;
            if (! $syncId) {
                continue;
            }

            $item = $entry['_original'] ?? null;
            $groups = $item['groups'] ?? null;

            if (empty($groups)) {
                continue;
            }

            $entryModel = BudgetEntry::where('sync_id', $syncId)
                ->where('user_id', $userId)
                ->first();

            if (! $entryModel) {
                continue;
            }

            $incomingSyncIds = [];

            foreach ($groups as $group) {
                $groupSyncId = $group['sync_id'] ?? Str::uuid()->toString();
                $incomingSyncIds[] = $groupSyncId;

                $accountSyncId = $group['account_id'] ?? $group['accountId'] ?? null;
                $accountId = $accountSyncId
                    ? Account::where('sync_id', $accountSyncId)->where('user_id', $userId)->value('id')
                    : null;

                BudgetEntryGroup::updateOrCreate(
                    ['sync_id' => $groupSyncId, 'user_id' => $userId],
                    [
                        'budget_entry_id' => $entryModel->id,
                        'account_id' => $accountId,
                        'amount' => $group['amount'] ?? 0,
                    ]
                );
            }

            BudgetEntryGroup::where('budget_entry_id', $entryModel->id)
                ->where('user_id', $userId)
                ->whereNotIn('sync_id', $incomingSyncIds)
                ->delete();
        }
    }
}
