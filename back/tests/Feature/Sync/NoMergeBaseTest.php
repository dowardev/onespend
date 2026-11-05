<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\User;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GitLab #19: a row without a merge base.
 *
 * The merge base (SyncMetadata.base_data) is what lets the server tell which
 * side changed what. A row that never went through the sync (created before
 * it existed, or whose metadata was purged) has no base, so the server cannot
 * attribute a divergence: it must report a conflict instead of applying the
 * push over the stored row.
 */
class NoMergeBaseTest extends TestCase
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

    public function test_a_push_without_a_merge_base_is_reported_as_a_conflict(): void
    {
        $syncId = 'sync-account-nobase-1';

        // The row exists on the server but never went through the sync, so it
        // has no merge base.
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $syncId,
            'name' => 'Server Version',
            'status' => 'active',
        ]);

        $results = $this->orchestrator->merge([
            'account' => [
                [
                    'id' => $syncId,
                    'name' => 'Client Version',
                    'initialBalance' => 100,
                    'status' => 'active',
                    'updated_at' => now()->timestamp + 5,
                ],
            ],
        ], $this->user->id);

        $this->assertNotEmpty($results['conflicts'], 'A push without a merge base must not be applied over the stored row.');
        $this->assertEquals('concurrent_edit', $results['conflicts']['account'][0]['conflict_type']);

        // The server's value survives the rejected push.
        $this->assertEquals('Server Version', Account::where('sync_id', $syncId)->first()->name);
    }

    /**
     * A delete that is OLDER than the stored row would remove a newer
     * revision, so it is reported as a conflict even without a merge base.
     */
    public function test_a_stale_delete_without_a_merge_base_is_reported_as_a_conflict(): void
    {
        $syncId = 'sync-account-nobase-stale-del-1';

        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $syncId,
            'name' => 'To Delete',
            'status' => 'active',
        ]);

        // Another device wrote the row after the client's copy was taken.
        Account::where('sync_id', $syncId)->update([
            'name' => 'Server Version',
            'updated_at' => now(),
        ]);

        $results = $this->orchestrator->merge([
            'account' => [
                [
                    'id' => $syncId,
                    'name' => 'To Delete',
                    'initialBalance' => 100,
                    'status' => 'active',
                    'updated_at' => now()->subDay()->timestamp,
                    '_deleted' => true,
                ],
            ],
        ], $this->user->id);

        $this->assertNotEmpty($results['conflicts'], 'A stale delete must not remove a newer revision.');
        $this->assertNull(Account::withTrashed()->where('sync_id', $syncId)->first()->deleted_at);
    }

    public function test_a_delete_without_a_merge_base_is_applied(): void
    {
        $syncId = 'sync-account-nobase-del-1';

        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $syncId,
            'name' => 'To Delete',
            'status' => 'active',
        ]);

        $results = $this->orchestrator->merge([
            'account' => [
                [
                    'id' => $syncId,
                    'name' => 'To Delete',
                    'initialBalance' => 100,
                    'status' => 'active',
                    'updated_at' => now()->timestamp + 5,
                    '_deleted' => true,
                ],
            ],
        ], $this->user->id);

        // A delete does not write any field value, so a stale client copy of
        // the row cannot revert a server side change: it is not blocked.
        $this->assertEmpty($results['conflicts']);
        $this->assertNotNull(Account::withTrashed()->where('sync_id', $syncId)->first()->deleted_at);
    }
}
