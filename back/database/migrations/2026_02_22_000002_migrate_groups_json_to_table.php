<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $entries = DB::table('budget_entries')
            ->whereNotNull('groups')
            ->where('groups', '!=', '[]')
            ->where('groups', '!=', 'null')
            ->get(['id', 'groups']);

        foreach ($entries as $entry) {
            $groups = json_decode($entry->groups, true);
            if (is_array($groups) && ! empty($groups)) {
                foreach ($groups as $group) {
                    $accountId = null;
                    if (isset($group['accountId'])) {
                        $accountId = is_numeric($group['accountId'])
                            ? (int) $group['accountId']
                            : null;
                    }

                    DB::table('budget_entry_groups')->insert([
                        'budget_entry_id' => $entry->id,
                        'account_id' => $accountId,
                        'amount' => $group['amount'] ?? 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        DB::table('budget_entry_groups')->truncate();
    }
};
