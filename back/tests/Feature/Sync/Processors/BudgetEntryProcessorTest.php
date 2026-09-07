<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\BudgetEntryGroup;
use App\Models\User;
use App\Services\Sync\Processors\BudgetEntryProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetEntryProcessorTest extends TestCase
{
    use RefreshDatabase;

    private BudgetEntryProcessor $processor;

    private User $user;

    private Account $account;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(BudgetEntryProcessor::class);
        $this->user = User::factory()->create();
        $this->account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-1',
            'name' => 'Test Account',
            'status' => 'active',
        ]);
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-budget-entry-create-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Test Entry',
                'amount' => 150.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Test Entry',
            'amount' => 150.00,
            'entry_type' => 'egreso',
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_creates_entity_with_groups(): void
    {
        $syncId = 'test-be-groups-1';
        $account2 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-g-2',
            'name' => 'Account 2',
            'status' => 'active',
        ]);

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry With Groups',
                'amount' => 300,
                'date' => '2026-06-15',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
                'groups' => [
                    ['account_id' => (string) $this->account->sync_id, 'amount' => 100],
                    ['account_id' => (string) $account2->sync_id, 'amount' => 200],
                ],
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)->get();
        $this->assertCount(2, $groups);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-be-update-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Original',
                'amount' => 100,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Updated Entry',
                'amount' => 200,
                'account_id' => (string) $this->account->sync_id,
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Updated Entry',
            'amount' => 200,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-be-delete-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'To Delete',
                'amount' => 50,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $entry = BudgetEntry::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($entry->deleted_at);
        $this->assertEquals('deleted', $entry->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-be-skip-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Skip Test',
                'amount' => 75,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip Test'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'name' => 'Skip Test',
        ]);
    }

    public function test_process_creates_entity_with_category(): void
    {
        $syncId = 'test-be-category-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Salary Entry',
                'amount' => 1000.00,
                'date' => '2026-09-01',
                'entry_type' => 'ingreso',
                'payment_type' => 'cash',
                'category' => 'salary',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('budget_entries', [
            'sync_id' => $syncId,
            'category' => 'salary',
        ]);
    }

    public function test_process_creates_entity_without_category(): void
    {
        $syncId = 'test-be-no-category-1';

        $result = $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Uncategorized Entry',
                'amount' => 50.00,
                'date' => '2026-09-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
            ],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertNull($entry->category);
    }

    public function test_process_handles_conflict(): void
    {
        $syncId = 'test-be-conflict-1';

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Server Version',
                'amount' => 100,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'status' => 'active',
            ],
        ], $this->user->id);

        BudgetEntry::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client Version', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
    }
    public function test_process_updates_entity_with_groups(): void
    {
        $syncId = 'test-be-update-groups-1';
        $account2 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'test-account-be-ug-2',
            'name' => 'Account 2',
            'status' => 'active',
        ]);

        $this->processor->create([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'amount' => 300,
                'date' => '2026-06-15',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'status' => 'active',
                'groups' => [
                    ['sync_id' => 'g-seed-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 300],
                ],
            ],
        ], $this->user->id);

        $entry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertNotNull($entry);
        $this->assertCount(1, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Update with stable client sync_ids: replaces groups idempotently.
        $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'groups' => [
                    ['sync_id' => 'g-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 150],
                    ['sync_id' => 'g-2', 'account_id' => (string) $account2->sync_id, 'amount' => 250],
                ],
            ],
        ], $this->user->id);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)->orderBy('amount')->get();
        $this->assertCount(2, $groups);
        $this->assertEquals(['g-1', 'g-2'], $groups->pluck('sync_id')->all());
        $this->assertEquals($this->account->id, $groups[0]->account_id);
        $this->assertEquals($account2->id, $groups[1]->account_id);
        $this->assertEquals([150, 250], $groups->pluck('amount')->map(fn ($v) => (int) $v)->all());

        // Re-applying the same payload is idempotent (no churn, no duplicates).
        $this->processor->update([
            [
                'id' => $syncId,
                'name' => 'Entry To Update Groups',
                'groups' => [
                    ['sync_id' => 'g-1', 'account_id' => (string) $this->account->sync_id, 'amount' => 150],
                    ['sync_id' => 'g-2', 'account_id' => (string) $account2->sync_id, 'amount' => 250],
                ],
            ],
        ], $this->user->id);
        $this->assertCount(2, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Update without the groups key leaves existing groups untouched.
        $this->processor->update([
            ['id' => $syncId, 'name' => 'Entry To Update Groups'],
        ], $this->user->id);
        $this->assertCount(2, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());

        // Explicit empty groups clears all groups for the entry.
        $this->processor->update([
            ['id' => $syncId, 'name' => 'Entry To Update Groups', 'groups' => []],
        ], $this->user->id);
        $this->assertCount(0, BudgetEntryGroup::where('budget_entry_id', $entry->id)->get());
    }
}