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

        // LBDS-273: the sync payload may carry an empty string for `time`
        // (a client that clears the field without dropping the key). The
        // `nullable` rule only accepts null, so an empty string would fail
        // validation with a 422 and take the whole batch down. Laravel's
        // ConvertEmptyStringsToNull middleware is not active on this
        // stack, so normalize it here.
        //
        // The value is also canonicalized to the zero-padded "HH:MM" the
        // model's accessor produces, so the value the server hashes over
        // (and the value it hands back on a pull) is byte-identical to
        // the one the client sends. A value that is not a usable time of
        // day is dropped rather than stored, so a malformed payload cannot
        // poison the row.
        if (array_key_exists('time', $item)) {
            $item['time'] = $this->normalizeTime($item['time']);
        }

        unset($item['paymentType'], $item['entryType'], $item['supplierName'],
            $item['supplierId'], $item['accountId']);

        return $item;
    }

    /**
     * LBDS-273: canonical "HH:MM" for the stored time, or null when the
     * value is not a usable time of day (empty string, garbage, an
     * out-of-range hour or minute).
     *
     * The rule has to match the client's `front/src/utils/timeFormat.ts`
     * `normalizeTime` and the model's `BudgetEntry::getTimeAttribute`
     * character for character: the client and the server have to agree on
     * the exact string they hash, or the field hash differs and the row
     * raises a phantom conflict on every push.
     */
    private function normalizeTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $parts = explode(':', trim((string) $value));
        if (count($parts) < 2) {
            return null;
        }

        $hours = trim($parts[0]);
        $minutes = trim($parts[1]);
        if (! preg_match('/^\d{1,2}$/', $hours) || ! preg_match('/^\d{1,2}$/', $minutes)) {
            return null;
        }

        $hourValue = (int) $hours;
        $minuteValue = (int) $minutes;
        if ($hourValue > 23 || $minuteValue > 59) {
            return null;
        }

        return sprintf('%02d:%02d', $hourValue, $minuteValue);
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
            if (! is_array($item) || ! array_key_exists('groups', $item)) {
                continue;
            }
            $groups = $item['groups'] ?? [];

            $entryModel = BudgetEntry::where('sync_id', $syncId)
                ->where('user_id', $userId)
                ->first();

            if (! $entryModel) {
                continue;
            }

            if (empty($groups)) {
                // Explicit empty groups: clear all existing groups for the entry.
                BudgetEntryGroup::where('budget_entry_id', $entryModel->id)
                    ->where('user_id', $userId)
                    ->delete();

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
