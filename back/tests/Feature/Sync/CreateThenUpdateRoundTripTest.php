<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\User;
use App\Services\Sync\Processors\AccountProcessor;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * GitLab #15: round-trip create -> update from the SAME client.
 *
 * A client that creates a row and then edits it (the most common flow in
 * the app) must not get a `concurrent_edit` back from the server: the
 * server is the only writer, so the second push is a plain update.
 */
class CreateThenUpdateRoundTripTest extends TestCase
{
    use RefreshDatabase;

    private SyncOrchestratorService $orchestrator;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->orchestrator = app(SyncOrchestratorService::class);
        $this->user = User::factory()->create();
    }

    public function test_budget_entry_update_after_create_is_not_a_conflict(): void
    {
        $accountSyncId = 'sync-acc-rt-1';
        $entrySyncId = 'sync-entry-rt-1';

        $account = $this->orchestrator->merge([
            'account' => [
                ['id' => $accountSyncId, 'name' => 'RT Account', 'initialBalance' => 100, 'status' => 'active'],
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('account', $account['created']);
        $this->assertEmpty($account['conflicts']);

        $created = $this->orchestrator->merge([
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'z',
                    'notes' => 'z',
                    'amount' => 100,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'payment_type' => 'cash',
                    'account_id' => $accountSyncId,
                    'status' => 'active',
                    'version' => 0,
                    'updated_at' => now()->timestamp,
                ],
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('budget_entry', $created['created']);
        $this->assertEmpty($created['conflicts']);

        // The client edits the row it just created, without bumping the
        // version it holds locally (the pre-#15 client behaviour).
        $updated = $this->orchestrator->merge([
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'z',
                    'notes' => 'z12',
                    'amount' => 100,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'payment_type' => 'cash',
                    'account_id' => $accountSyncId,
                    'status' => 'active',
                    'version' => 0,
                    'updated_at' => now()->timestamp + 5,
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty(
            $updated['conflicts'],
            'Editing a row created by the same client must not raise a conflict: '.json_encode($updated['conflicts'])
        );

        $entry = BudgetEntry::where('sync_id', $entrySyncId)->first();
        $this->assertNotNull($entry);
        $this->assertEquals('z12', $entry->notes);
    }

    public function test_account_update_after_create_is_not_a_conflict(): void
    {
        $accountSyncId = 'sync-acc-rt-2';

        $created = $this->orchestrator->merge([
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Original', 'initialBalance' => 100, 'status' => 'active'],
            ],
        ], $this->user->id);

        $this->assertArrayHasKey('account', $created['created']);
        $this->assertEmpty($created['conflicts']);

        $updated = $this->orchestrator->merge([
            'account' => [
                [
                    'id' => $accountSyncId,
                    'name' => 'Renamed',
                    'initialBalance' => 100,
                    'status' => 'active',
                    'updated_at' => now()->timestamp + 5,
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty(
            $updated['conflicts'],
            'Editing a row created by the same client must not raise a conflict: '.json_encode($updated['conflicts'])
        );

        $account = Account::where('sync_id', $accountSyncId)->first();
        $this->assertNotNull($account);
        $this->assertEquals('Renamed', $account->name);
    }

    /**
     * The server changed a field the client does not push: the client's
     * update must not revert it, and it must not be reported as a
     * conflict either (the fields do not overlap).
     */
    public function test_update_keeps_a_server_side_change_the_client_does_not_push(): void
    {
        $accountSyncId = 'sync-acc-rt-3';
        $entrySyncId = 'sync-entry-rt-3';

        $this->orchestrator->merge([
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Original', 'initialBalance' => 100, 'status' => 'active'],
            ],
        ], $this->user->id);

        $this->orchestrator->merge([
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'Entry',
                    'notes' => 'note',
                    'amount' => 100,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'payment_type' => 'cash',
                    'account_id' => $accountSyncId,
                    'status' => 'active',
                ],
            ],
        ], $this->user->id);

        // Another device categorized the entry on the server. The client
        // does not push `category` for an entry without a category, so the
        // field is not part of the write set: the server value must
        // survive the update.
        BudgetEntry::where('sync_id', $entrySyncId)->update([
            'category' => '42',
            'updated_at' => now(),
        ]);

        $updated = $this->orchestrator->merge([
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'Entry',
                    'notes' => 'edited note',
                    'amount' => 100,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'payment_type' => 'cash',
                    'account_id' => $accountSyncId,
                    'updated_at' => now()->timestamp + 5,
                ],
            ],
        ], $this->user->id);

        $this->assertEmpty($updated['conflicts']);

        $entry = BudgetEntry::where('sync_id', $entrySyncId)->first();
        $this->assertEquals('edited note', $entry->notes);
        $this->assertEquals('42', $entry->category);
    }

    /**
     * The server changed a field the client still carries the base value
     * for: applying the push would revert the server's change, so it is
     * reported as a conflict.
     */
    public function test_stale_client_update_does_not_revert_a_server_side_change(): void
    {
        $accountSyncId = 'sync-acc-rt-4';

        $this->orchestrator->merge([
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Original', 'initialBalance' => 100, 'status' => 'active'],
            ],
        ], $this->user->id);

        // Another device renamed the account on the server.
        Account::where('sync_id', $accountSyncId)->update([
            'name' => 'Renamed by another device',
            'updated_at' => now(),
        ]);

        // The client pushes the base value for `name` (it never saw the
        // rename) and changes the balance.
        $updated = $this->orchestrator->merge([
            'account' => [
                [
                    'id' => $accountSyncId,
                    'name' => 'Original',
                    'initialBalance' => 250,
                    'status' => 'active',
                    'updated_at' => now()->timestamp + 5,
                ],
            ],
        ], $this->user->id);

        $this->assertNotEmpty($updated['conflicts']);
        $this->assertEquals('concurrent_edit', $updated['conflicts']['account'][0]['conflict_type']);

        $account = Account::where('sync_id', $accountSyncId)->first();
        $this->assertEquals('Renamed by another device', $account->name);
        $this->assertEquals(100.00, (float) $account->initial_balance);
    }

    /**
     * GitLab #15 (review R1-001): the conflict detection locks the row it
     * reads and the orchestrator holds that lock until the write commits, so
     * a concurrent merge cannot slip a write in between and have its edit
     * silently reverted.
     */
    public function test_conflict_detection_locks_the_row_against_a_concurrent_write(): void
    {
        $second = $this->secondConnection();
        $accountSyncId = 'sync-acc-lock-1';

        // The user and the row are committed by the second connection: the
        // test transaction hides its own writes from every other connection.
        $userId = $second->table('users')->insertGetId([
            'name' => 'Lock Test', 'user' => 'lock@test', 'email' => 'lock@test', 'password' => 'secret',
        ]);
        $second->table('accounts')->insert([
            'user_id' => $userId, 'sync_id' => $accountSyncId, 'name' => 'Original',
            'initial_balance' => 100, 'status' => 'active', 'version' => 1,
        ]);

        app(AccountProcessor::class)->detectConflicts([
            ['id' => $accountSyncId, 'name' => 'Client Version', 'updated_at' => now()->timestamp],
        ], $userId);

        // The concurrent write has to wait for the lock. With a one second
        // lock wait timeout it fails instead of overwriting the row.
        $this->expectException(QueryException::class);
        $second->table('accounts')->where('sync_id', $accountSyncId)->update(['name' => 'Concurrent']);
    }

    /**
     * The detection and the write must run in the same transaction: that is
     * what keeps the row lock alive until the write is applied.
     */
    public function test_merge_detects_and_writes_inside_one_transaction(): void
    {
        $accountSyncId = 'sync-acc-tx-1';
        $this->orchestrator->merge([
            'account' => [['id' => $accountSyncId, 'name' => 'Original', 'initialBalance' => 100, 'status' => 'active']],
        ], $this->user->id);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = ['sql' => strtolower($query->sql), 'level' => DB::transactionLevel()];
        });

        $this->orchestrator->merge([
            'account' => [[
                'id' => $accountSyncId, 'name' => 'Updated', 'initialBalance' => 100,
                'status' => 'active', 'updated_at' => now()->timestamp + 5,
            ]],
        ], $this->user->id);

        $lock = null;
        $write = null;
        foreach ($queries as $index => $query) {
            if ($lock === null && str_contains($query['sql'], 'for update')) {
                $lock = $query + ['index' => $index];
            }
            if ($write === null && str_starts_with($query['sql'], 'update')) {
                $write = $query + ['index' => $index];
            }
        }

        $this->assertNotNull($lock, 'The conflict detection must lock the rows it reads.');
        $this->assertNotNull($write, 'The merge must write the row.');
        $this->assertGreaterThan(1, $lock['level'], 'The detection must run inside the merge transaction.');
        $this->assertGreaterThanOrEqual($lock['level'], $write['level'], 'The write must run inside the transaction that took the lock.');
        $this->assertLessThan($write['index'], $lock['index'], 'The lock must be taken before the write.');
    }

    /**
     * GitLab #15: the ack carries the version the row has on the server, and
     * a field the merge base does not carry is protected once the server
     * wrote the row after the base was taken.
     */
    public function test_ack_carries_the_version_and_protects_a_field_the_base_lacks(): void
    {
        $accountSyncId = 'sync-acc-ver-1';
        $entrySyncId = 'sync-entry-ver-1';

        $created = $this->orchestrator->merge([
            'account' => [['id' => $accountSyncId, 'name' => 'Original', 'initialBalance' => 100, 'status' => 'active']],
            'budget_entry' => [[
                'id' => $entrySyncId, 'name' => 'Entry', 'amount' => 100, 'date' => '2026-06-01',
                'entry_type' => 'egreso', 'payment_type' => 'cash', 'account_id' => $accountSyncId,
            ]],
        ], $this->user->id);

        $this->assertEquals(1, $created['created']['account'][0]['version']);

        $updated = $this->orchestrator->merge([
            'account' => [[
                'id' => $accountSyncId, 'name' => 'Renamed', 'initialBalance' => 100,
                'status' => 'active', 'updated_at' => now()->timestamp + 5,
            ]],
        ], $this->user->id);

        $this->assertEquals(2, $updated['updated']['account'][0]['version']);

        // The server wrote the entry after the merge base was taken, so the
        // server side value of a field the base does not carry is unknown:
        // the client's note must not overwrite it silently.
        BudgetEntry::where('sync_id', $entrySyncId)->update(['version' => 2]);

        $conflicted = $this->orchestrator->merge([
            'budget_entry' => [[
                'id' => $entrySyncId, 'name' => 'Entry', 'notes' => 'z12', 'amount' => 100,
                'date' => '2026-06-01', 'entry_type' => 'egreso', 'payment_type' => 'cash',
                'account_id' => $accountSyncId, 'updated_at' => now()->timestamp + 5,
            ]],
        ], $this->user->id);

        $this->assertNotEmpty($conflicted['conflicts']);
    }

    private function secondConnection(): \Illuminate\Database\Connection
    {
        config(['database.connections.sync_lock_test' => array_merge(
            config('database.connections.'.config('database.default')),
            ['name' => 'sync_lock_test'],
        )]);

        $connection = DB::connection('sync_lock_test');
        $connection->statement('SET SESSION innodb_lock_wait_timeout = 1');

        return $connection;
    }
}
