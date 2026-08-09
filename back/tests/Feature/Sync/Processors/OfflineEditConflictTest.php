<?php

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\SyncMetadata;
use App\Models\User;
use App\Services\Sync\Processors\BudgetEntryProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OfflineEditConflictTest extends TestCase
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
            'sync_id' => 'test-account-offline-1',
            'name' => 'Offline Test Account',
            'status' => 'active',
        ]);
    }

    /**
     * Scenario: Client A edits offline while Client B edits online.
     * B's edit reaches server first (serverTimestamp = T_B).
     * A's push has clientTimestamp >= T_B but different data.
     * Expected: concurrent_edit conflict (not silent overwrite).
     */
    public function test_detects_conflict_when_client_timestamp_ge_server_with_divergent_data(): void
    {
        $syncId = 'sync-entry-offline-1';

        BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Base Cafe',
            'amount' => 500.00,
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);

        // Client B edits online — server has updated_at = T_B_edit
        $serverUpdateTime = now();
        DB::table('budget_entries')->where('sync_id', $syncId)->update([
            'name' => 'Cafe from B',
            'amount' => 550.00,
            'updated_at' => $serverUpdateTime,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => $syncId,
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'last_synced_at' => now(),
            'server_updated_at' => $serverUpdateTime,
            'base_data' => [
                'name' => 'Original Cafe',
                'amount' => 500.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => $this->account->id,
                'status' => 'active',
            ],
        ]);

        // Client A was offline. Now reconnects and pushes at T_A_push >= T_B_edit
        $clientTimestamp = $serverUpdateTime->timestamp + 1; // >= server timestamp
        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Cafe from A (offline edit)',
                'amount' => 500.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'updated_at' => $clientTimestamp,
                'status' => 'active',
            ],
        ];

        $result = $this->processor->detectConflicts($clientPayload, $this->user->id);

        $this->assertNotEmpty($result['conflicts'], 'A conflict should have been detected');

        $conflict = $result['conflicts'][0];
        $this->assertEquals('semantic', $conflict['conflict_type']);
        $this->assertEquals($syncId, $conflict['sync_id']);

        // Server data must be preserved (no silent overwrite)
        $unchanged = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertEquals('Cafe from B', $unchanged->name);
        $this->assertEquals(550.00, (float) $unchanged->amount);
    }

    /**
     * Scenario: Same as above but client data matches server (no conflict).
     * This tests the hash-equality short-circuit still works.
     */
    public function test_skips_conflict_when_data_matches_despite_timestamp_after(): void
    {
        $syncId = 'sync-entry-offline-2';

        BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Base Entry',
            'amount' => 300.00,
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);

        $serverUpdateTime = now();
        DB::table('budget_entries')->where('sync_id', $syncId)->update([
            'name' => 'Base Entry', // same data
            'amount' => 300.00,
            'updated_at' => $serverUpdateTime,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => $syncId,
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'last_synced_at' => now(),
            'server_updated_at' => $serverUpdateTime,
            'base_data' => [
                'name' => 'Base Entry',
                'amount' => 300.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => $this->account->id,
                'status' => 'active',
            ],
        ]);

        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Base Entry', // same as server
                'amount' => 300.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->sync_id,
                'updated_at' => $serverUpdateTime->timestamp + 5,
                'status' => 'active',
            ],
        ];

        $result = $this->processor->detectConflicts($clientPayload, $this->user->id);

        $this->assertEmpty($result['conflicts'], 'No conflict should be detected when data matches');
    }

    /**
     * Scenario: Client edits only fields that B did not change (non-overlapping).
     * Expected: concurrent_edit (not semantic).
     */
    public function test_concurrent_edit_when_non_overlapping_fields(): void
    {
        $syncId = 'sync-entry-offline-3';

        BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Original',
            'amount' => 100.00,
            'notes' => 'original notes',
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);

        $serverUpdateTime = now();
        DB::table('budget_entries')->where('sync_id', $syncId)->update([
            'name' => 'B Edited Name',  // B changed name
            'amount' => 100.00,
            'updated_at' => $serverUpdateTime,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => $syncId,
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'last_synced_at' => now(),
            'server_updated_at' => $serverUpdateTime,
            'base_data' => [
                'name' => 'Original',
                'amount' => 100.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => $this->account->id,
                'status' => 'active',
            ],
        ]);

        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Original', // A did not touch name
                'amount' => 200.00,  // A changed amount (different from base)
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string) $this->account->syncId,
                'updated_at' => $serverUpdateTime->timestamp + 1,
                'status' => 'active',
            ],
        ];

        $result = $this->processor->detectConflicts($clientPayload, $this->user->id);

        $this->assertNotEmpty($result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type'],
            'Non-overlapping changes should be concurrent_edit, not semantic');
    }
}
