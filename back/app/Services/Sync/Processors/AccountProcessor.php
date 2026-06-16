<?php

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

    protected function preprocessData(array $item, int $userId): array
    {
        if (isset($item['initialBalance'])) {
            $item['initial_balance'] = $item['initialBalance'];
        }

        unset($item['initialBalance'], $item['accountId']);

        return $item;
    }
}
