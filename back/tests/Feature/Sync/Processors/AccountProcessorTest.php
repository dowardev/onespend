<?php

namespace Tests\Feature\Sync\Processors;

use App\Models\User;
use App\Models\Account;
use App\Models\SyncMetadata;
use App\Services\Sync\Processors\AccountProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountProcessorTest extends TestCase
{
    use RefreshDatabase;

    private AccountProcessor $processor;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = app(AccountProcessor::class);
        $this->user = User::factory()->create();
    }

    public function test_process_creates_entity(): void
    {
        $syncId = 'test-account-create-1';

        $result = $this->processor->create([
            ['id' => $syncId, 'name' => 'Test Account', 'initialBalance' => 100.50, 'status' => 'active'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('accounts', [
            'sync_id' => $syncId,
            'name' => 'Test Account',
            'initial_balance' => 100.50,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_process_updates_entity(): void
    {
        $syncId = 'test-account-update-1';

        $this->processor->create([
            ['id' => $syncId, 'name' => 'Original', 'status' => 'active'],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Updated', 'initialBalance' => 200],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertEquals($syncId, $result[0]['sync_id']);
        $this->assertDatabaseHas('accounts', [
            'sync_id' => $syncId,
            'name' => 'Updated',
            'initial_balance' => 200,
        ]);
    }

    public function test_process_deletes_entity(): void
    {
        $syncId = 'test-account-delete-1';

        $this->processor->create([
            ['id' => $syncId, 'name' => 'To Delete', 'status' => 'active'],
        ], $this->user->id);

        $result = $this->processor->delete([$syncId], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertContains($syncId, $result);

        $account = Account::withTrashed()->where('sync_id', $syncId)->first();
        $this->assertNotNull($account->deleted_at);
        $this->assertEquals('deleted', $account->status);
    }

    public function test_process_skips_unchanged_entity(): void
    {
        $syncId = 'test-account-skip-1';

        $this->processor->create([
            ['id' => $syncId, 'name' => 'Skip Test', 'status' => 'active'],
        ], $this->user->id);

        $result = $this->processor->update([
            ['id' => $syncId, 'name' => 'Skip Test'],
        ], $this->user->id);

        $this->assertCount(1, $result);
        $this->assertDatabaseHas('accounts', [
            'sync_id' => $syncId,
            'name' => 'Skip Test',
        ]);
    }

    public function test_process_auto_merges_when_only_client_changed(): void
    {
        $syncId = 'test-account-auto-1';

        $this->processor->create([
            ['id' => $syncId, 'name' => 'Original', 'status' => 'active'],
        ], $this->user->id);

        Account::where('sync_id', $syncId)->update(['updated_at' => now()->addDay()]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client Version', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertEquals('Client Version', $result['conflicts'][0]['client_data']['name']);
        $this->assertDatabaseHas('accounts', [
            'sync_id' => $syncId,
            'name' => 'Original',
        ]);
    }

    public function test_process_conflicts_when_both_change_same_field(): void
    {
        $syncId = 'test-account-semantic-1';

        $this->processor->create([
            ['id' => $syncId, 'name' => 'Original', 'status' => 'active'],
        ], $this->user->id);

        Account::where('sync_id', $syncId)->update([
            'name' => 'Server Version',
            'updated_at' => now()->addDay(),
        ]);

        $oldTimestamp = now()->subDay()->timestamp;

        $result = $this->processor->detectConflicts([
            ['id' => $syncId, 'name' => 'Client Version', 'updated_at' => $oldTimestamp],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals($syncId, $result['conflicts'][0]['sync_id']);
        $this->assertEquals('semantic', $result['conflicts'][0]['conflict_type']);
    }
}
