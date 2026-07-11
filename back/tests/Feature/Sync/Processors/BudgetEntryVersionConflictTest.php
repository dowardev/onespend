<?php

namespace Tests\Feature\Sync\Processors;

use App\Models\User;
use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\SyncMetadata;
use App\Services\Sync\Processors\BudgetEntryProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BudgetEntryVersionConflictTest extends TestCase
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
            'sync_id' => 'test-account-vc-1',
            'name' => 'VC Account',
            'status' => 'active',
        ]);
    }

    /**
     * Test that server is authority for version: client's stale version does not block update.
     * With version_mismatch eliminated, the server accepts the client payload regardless of version.
     */
    public function test_update_succeeds_with_stale_client_version(): void
    {
        $syncId = 'sync-entry-vm-1';

        BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Original Name',
            'amount' => 100.00,
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);
        
        DB::table('budget_entries')->where('sync_id', $syncId)->update(['version' => 1]);

        DB::table('budget_entries')->where('sync_id', $syncId)->update([
            'version' => 2,
            'name' => 'Server Updated Name',
            'updated_at' => now(),
        ]);

        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Client Edited Name',
                'amount' => 150.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string)$this->account->sync_id,
                'version' => 1, // Client's stale version — ignored (server authority)
                'status' => 'active',
            ],
        ];

        $existingEntities = collect([
            $syncId => BudgetEntry::where('sync_id', $syncId)->first(),
        ]);

        // Act — server is authority, update proceeds regardless of client version
        $this->processor->update($clientPayload, $this->user->id, $existingEntities);

        // Assert: entity updated with client data and version bumped server-side
        $updated = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertEquals('Client Edited Name', $updated->name);
        $this->assertEquals(150.00, (float) $updated->amount);
        $this->assertEquals(3, $updated->version); // started at 2, bumped by update
    }

    /**
     * Test that update succeeds when versions match (no conflict).
     */
    public function test_update_succeeds_when_versions_match(): void
    {
        $syncId = 'sync-entry-happy-1';

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Original Name',
            'amount' => 100.00,
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);
        DB::table('budget_entries')->where('sync_id', $syncId)->update(['version' => 1]);

        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Client Updated Name',
                'amount' => 150.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string)$this->account->sync_id,
                'version' => 1,
                'status' => 'active',
            ],
        ];

        $existingEntities = collect([
            $syncId => BudgetEntry::where('sync_id', $syncId)->first(),
        ]);

        $this->processor->update($clientPayload, $this->user->id, $existingEntities);

        // Entity should be updated and version incremented
        $updatedEntry = BudgetEntry::where('sync_id', $syncId)->first();
        $this->assertEquals('Client Updated Name', $updatedEntry->name);
        $this->assertEquals(2, $updatedEntry->version);

        $metadata = SyncMetadata::where('entity_id', $syncId)->first();
        $this->assertEquals('synced', $metadata->sync_status);
    }

    /**
     * Test that a semantic conflict is detected when timestamps overlap.
     */
    public function test_update_detects_semantic_conflict_on_timestamp_overlap(): void
    {
        $syncId = 'sync-entry-sem-1';

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'account_id' => $this->account->id,
            'sync_id' => $syncId,
            'name' => 'Original Name',
            'amount' => 100.00,
            'date' => '2026-06-01',
            'entry_type' => 'egreso',
            'payment_type' => 'cash',
            'status' => 'active',
        ]);
        DB::table('budget_entries')->where('sync_id', $syncId)->update(['version' => 1]);

        // Create initial SyncMetadata with base_data so detectConflicts can compute 
        // which fields changed by client vs server vs the original (base) state.
        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => $syncId,
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'last_synced_at' => now(),
            'server_updated_at' => now(),
            'base_data' => [
                'name' => 'Original Name',
                'amount' => 100.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => $this->account->id,
                'status' => 'active',
            ],
        ]);

        $serverUpdateTime = now();
        DB::table('budget_entries')->where('sync_id', $syncId)->update([
            'name' => 'Server Name',
            'amount' => 200.00,
            'updated_at' => $serverUpdateTime,
            'version' => 2,
        ]);

        $clientUpdateTime = (clone $serverUpdateTime)->subHour()->timestamp;
        $clientPayload = [
            [
                'id' => $syncId,
                'name' => 'Client Name',
                'amount' => 150.00,
                'date' => '2026-06-01',
                'entry_type' => 'egreso',
                'payment_type' => 'cash',
                'account_id' => (string)$this->account->sync_id,
                'version' => 2, // Match server version to bypass version_mismatch and trigger semantic check
                'updated_at' => $clientUpdateTime,
                'status' => 'active',
            ],
        ];

        $existingEntities = collect([
            $syncId => BudgetEntry::where('sync_id', $syncId)->first(),
        ]);

        // Semantic conflict detection is performed by detectConflicts() in the processor,
        // not by update(). To test the semantic conflict path we call it explicitly.
        $result = $this->processor->detectConflicts($clientPayload, $this->user->id);

        $versionConflicts = $result['conflicts'];
        $this->assertNotEmpty($versionConflicts);

        $semanticConflict = null;
        foreach ($versionConflicts as $conflict) {
            if (($conflict['conflict_type'] ?? null) === 'semantic') {
                $semanticConflict = $conflict;
                break;
            }
        }

        $this->assertNotNull($semanticConflict, 'Expected a semantic conflict');
        $this->assertContains('name', $semanticConflict['overlapping_fields']);
        $this->assertContains('amount', $semanticConflict['overlapping_fields']);

        $this->assertEquals('Server Name', BudgetEntry::where('sync_id', $syncId)->first()->name);
        $this->assertEquals(2, BudgetEntry::where('sync_id', $syncId)->first()->version);
    }
}
