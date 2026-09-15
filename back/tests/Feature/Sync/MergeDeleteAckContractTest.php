<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\SyncMetadata;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MergeDeleteAckContractTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_merge_delete_ack_returns_sync_id_and_server_time_is_int(): void
    {
        $syncId = 'lbds-244-delete-ack-1';

        $createResponse = $this->actingAs($this->user, 'web')
            ->postJson('/api/sync/merge', [
                'data' => [
                    'account' => [
                        ['id' => $syncId, 'name' => 'Delete Ack Account'],
                    ],
                ],
            ]);

        $createResponse->assertOk();
        $createResponse->assertJson(['success' => true]);
        $this->assertIsInt($createResponse->json('serverTime'));

        $deleteResponse = $this->actingAs($this->user, 'web')
            ->postJson('/api/sync/merge', [
                'data' => [
                    'account' => [
                        ['id' => $syncId, 'name' => 'Delete Ack Account', 'updated_at' => now()->timestamp, '_deleted' => true],
                    ],
                ],
            ]);

        $deleteResponse->assertOk();
        $deleteResponse->assertJson(['success' => true]);

        // Bug B: merge must return serverTime as unix int, like getChanges/fullSync
        $this->assertIsInt($deleteResponse->json('serverTime'));
        $this->assertGreaterThan(1700000000, $deleteResponse->json('serverTime'));

        // Bug A: the delete ACK must carry back the sent sync_id
        $deleted = $deleteResponse->json('results.deleted.account');
        $this->assertIsArray($deleted);
        $this->assertNotEmpty($deleted);
        $this->assertSame($syncId, $deleted[0]['sync_id']);

        $this->assertNotNull(
            Account::withTrashed()->where('sync_id', $syncId)->first()?->deleted_at
        );
    }

    public function test_merge_fully_deduplicated_returns_server_time_as_int(): void
    {
        // Pre-seed a recent dedup_hash so filterDuplicateChanges() drops the
        // payload and merge() takes its empty-data early return (SyncController:518).
        $fields = ['name' => 'Dedup Account'];
        ksort($fields);
        $hash = md5('account'.json_encode($fields));

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'lbds-244-dedup-1',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'dedup_hash' => $hash,
        ]);

        $response = $this->actingAs($this->user, 'web')
            ->postJson('/api/sync/merge', [
                'data' => [
                    'account' => [
                        ['id' => 'lbds-244-dedup-1', 'name' => 'Dedup Account'],
                    ],
                ],
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
        $this->assertIsInt($response->json('serverTime'));
        $this->assertGreaterThan(1700000000, $response->json('serverTime'));
        // LBDS-244: dedup-dropped ids are acked as skipped so the queue drains.
        $skipped = $response->json('results.skipped.account');
        $this->assertIsArray($skipped);
        $this->assertSame('lbds-244-dedup-1', $skipped[0]['sync_id']);
    }

    public function test_merge_poison_batch_syncs_valid_siblings(): void
    {
        // LBDS-244 Bug C: one row with an FK to a local-only id must not
        // nuke the whole batch (all-or-nothing insert + sync_id 'batch').
        $ms = (int) (microtime(true) * 1000);

        $acc = $this->actingAs($this->user, 'web')->postJson('/api/sync/merge', [
            'data' => ['account' => [['id' => 'lbds-244-poison-acc', 'name' => 'Poison Acc', 'updated_at' => $ms]]],
        ]);
        $acc->assertOk();
        $serverAccountId = $acc->json('results.created.account.0.id');
        $this->assertIsInt($serverAccountId);

        $entry = function (string $id, mixed $accountId, bool $withGroups) use ($ms): array {
            $row = [
                'id' => $id,
                'name' => 'Entry '.$id,
                'amount' => 100,
                'date' => '2026-09-12',
                'payment_type' => 'cash',
                'entry_type' => 'egreso',
                'account_id' => $accountId,
                'version' => 0,
                'updated_at' => $ms,
            ];
            if ($withGroups) {
                $row['groups'] = [['sync_id' => $id.'-grp', 'amount' => 100, 'accountId' => $accountId]];
            }

            return $row;
        };

        $response = $this->actingAs($this->user, 'web')->postJson('/api/sync/merge', [
            'data' => ['budget_entry' => [
                $entry('lbds-244-poison-good', (string) $serverAccountId, false),
                $entry('lbds-244-poison-badfk', '999999999', true),
                $entry('lbds-244-poison-badgroup', (string) $serverAccountId, true),
            ]],
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
        $created = $response->json('results.created.budget_entry');
        $this->assertIsArray($created);
        $createdIds = array_column($created, 'sync_id');
        $this->assertContains('lbds-244-poison-good', $createdIds);
        $this->assertNotContains('lbds-244-poison-badfk', $createdIds);
        // Per-item errors carry real sync_ids (never the opaque 'batch').
        $errors = $response->json('results.errors.budget_entry') ?? [];
        $errorIds = array_column($errors, 'sync_id');
        $this->assertContains('lbds-244-poison-badfk', $errorIds);
        $this->assertNotContains('batch', $errorIds);
    }
}
