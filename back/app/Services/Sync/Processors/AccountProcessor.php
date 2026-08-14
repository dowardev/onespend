<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Models\Account;

class AccountProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return Account::class;
    }

    protected function getEntityName(): string
    {
        return 'account';
    }

    public function preprocessData(array $item, int $userId): array
    {
        if (isset($item['initialBalance'])) {
            $item['initial_balance'] = $item['initialBalance'];
        }

        unset($item['initialBalance'], $item['accountId']);

        return $item;
    }
}
