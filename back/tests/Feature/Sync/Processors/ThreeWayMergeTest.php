<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Account;
use App\Models\Supplier;
use App\Models\SyncMetadata;
use App\Models\User;
use App\Services\Sync\Processors\AccountProcessor;
use App\Services\Sync\Processors\SupplierProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThreeWayMergeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private AccountProcessor $accountProcessor;

    private SupplierProcessor $supplierProcessor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->accountProcessor = app(AccountProcessor::class);
        $this->supplierProcessor = app(SupplierProcessor::class);
    }

    /** @test */
    public function compute_field_hash_produces_same_hash_for_identical_data(): void
    {
        $data1 = ['name' => 'Test Account', 'type' => 'checking', 'currency' => 'USD', 'status' => 'active'];
        $data2 = ['name' => 'Test Account', 'type' => 'checking', 'currency' => 'USD', 'status' => 'active'];

        $hash1 = $this->accountProcessor->computeFieldHash($data1);
        $hash2 = $this->accountProcessor->computeFieldHash($data2);

        $this->assertSame($hash1, $hash2);
    }

    /** @test */
    public function compute_field_hash_differs_for_different_data(): void
    {
        $hash1 = $this->accountProcessor->computeFieldHash(['name' => 'Account A']);
        $hash2 = $this->accountProcessor->computeFieldHash(['name' => 'Account B']);

        $this->assertNotSame($hash1, $hash2);
    }

    /** @test */
    public function compute_field_hash_normalizes_numeric_values(): void
    {
        $hash1 = $this->accountProcessor->computeFieldHash(['initial_balance' => '100.50']);
        $hash2 = $this->accountProcessor->computeFieldHash(['initial_balance' => 100.50]);
        $hash3 = $this->accountProcessor->computeFieldHash(['initial_balance' => 100.5]);

        $this->assertSame($hash1, $hash2);
        $this->assertSame($hash2, $hash3);
    }

    /** @test */
    public function compute_field_hash_ignores_non_fillable_fields(): void
    {
        $hash1 = $this->accountProcessor->computeFieldHash(['name' => 'Test', 'id' => 1, 'sync_id' => 'abc', 'user_id' => 5, 'version' => 2]);
        $hash2 = $this->accountProcessor->computeFieldHash(['name' => 'Test']);

        $this->assertSame($hash1, $hash2);
    }

    /** @test */
    public function detect_conflicts_returns_empty_when_client_hash_matches_server(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-1',
            'name' => 'Original',
            'type' => 'checking',
            'currency' => 'USD',
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-1',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->accountProcessor->computeFieldHash([
                'name' => 'Original',
                'type' => 'checking',
                'currency' => 'USD',
                'status' => 'active',
            ]),
            'base_data' => [
                'name' => 'Original',
                'type' => 'checking',
                'currency' => 'USD',
                'status' => 'active',
            ],
        ]);

        $result = $this->accountProcessor->detectConflicts([
            ['id' => 'acc-1', 'name' => 'Original', 'type' => 'checking', 'currency' => 'USD', 'status' => 'active'],
        ], $this->user->id);

        $this->assertEmpty($result['conflicts']);
    }

    /** @test */
    public function detect_conflicts_auto_merges_non_overlapping_fields(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-2',
            'name' => 'Original Name',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-2',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->accountProcessor->computeFieldHash([
                'name' => 'Original Name',
                'initial_balance' => 100.00,
                'status' => 'active',
            ]),
            'base_data' => [
                'name' => 'Original Name',
                'initial_balance' => 100.00,
                'status' => 'active',
            ],
        ]);

        $result = $this->accountProcessor->detectConflicts([
            ['id' => 'acc-2', 'name' => 'Original Name', 'initial_balance' => 200.00, 'status' => 'active'],
        ], $this->user->id);

        // GitLab #15: the server row still holds the base values, so the
        // client's change is merged, not reported as a conflict.
        $this->assertCount(0, $result['conflicts']);

        $this->accountProcessor->update([
            ['id' => 'acc-2', 'name' => 'Original Name', 'initial_balance' => 200.00, 'status' => 'active'],
        ], $this->user->id);

        $updated = Account::where('sync_id', 'acc-2')->first();
        $this->assertEquals(200.00, (float) $updated->initial_balance);
        $this->assertEquals('Original Name', $updated->name);
    }

    /** @test */
    public function detect_conflicts_creates_semantic_conflict_when_both_changed_same_field(): void
    {
        // Server has a DIFFERENT value than base (server changed the name)
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-3',
            'name' => 'Server Name',  // Server changed this
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-3',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->accountProcessor->computeFieldHash([
                'name' => 'Server Name',
                'initial_balance' => 100.00,
                'status' => 'active',
            ]),
            'base_data' => [
                'name' => 'Original Name',  // Base has original
                'initial_balance' => 100.00,
                'status' => 'active',
            ],
        ]);

        // Client also changed the name (to something different from both base and server)
        $result = $this->accountProcessor->detectConflicts([
            ['id' => 'acc-3', 'name' => 'Client Name', 'initial_balance' => 100.00, 'status' => 'active'],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $conflict = $result['conflicts'][0];
        $this->assertEquals('semantic', $conflict['conflict_type']);
        $this->assertContains('name', $conflict['overlapping_fields']);
        $this->assertEquals('Client Name', $conflict['client_data']['name']);
    }

    /** @test */
    public function detect_conflicts_preserves_server_change_when_client_is_stale(): void
    {
        // Server has updated the name (different from base)
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-4',
            'name' => 'Server Updated',
            'initial_balance' => 200.00,
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-4',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->accountProcessor->computeFieldHash([
                'name' => 'Server Updated',
                'initial_balance' => 200.00,
                'status' => 'active',
            ]),
            'base_data' => [
                'name' => 'Original Name',
                'initial_balance' => 100.00,
                'status' => 'active',
            ],
        ]);

        // Client is stale - it still carries the base value for the field
        // the server changed. Applying the push would revert the server's
        // change, so it is reported as a conflict.
        $result = $this->accountProcessor->detectConflicts([
            ['id' => 'acc-4', 'name' => 'Original Name', 'initial_balance' => 100.00, 'status' => 'active'],
        ], $this->user->id);

        $this->assertCount(1, $result['conflicts']);
        $this->assertEquals('concurrent_edit', $result['conflicts'][0]['conflict_type']);
        $this->assertContains('name', $result['conflicts'][0]['changed_fields']);
    }

    /** @test */
    public function detect_conflicts_with_supplier_auto_merges_products(): void
    {
        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'sup-1',
            'name' => 'Original Supplier',
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'supplier',
            'entity_id' => 'sup-1',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->supplierProcessor->computeFieldHash([
                'name' => 'Original Supplier',
                'status' => 'active',
            ]),
            'base_data' => [
                'name' => 'Original Supplier',
                'status' => 'active',
            ],
        ]);

        $result = $this->supplierProcessor->detectConflicts([
            ['id' => 'sup-1', 'name' => 'Original Supplier', 'status' => 'inactive'],
        ], $this->user->id);

        // GitLab #15: the server row still holds the base values, so the
        // client's change is merged, not reported as a conflict.
        $this->assertCount(0, $result['conflicts']);
    }

    /** @test */
    public function detect_conflicts_handles_deleted_base_data_gracefully(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-5',
            'name' => 'Test',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-5',
            'user_id' => $this->user->id,
            'sync_status' => 'synced',
            'field_hash' => $this->accountProcessor->computeFieldHash([
                'name' => 'Test',
                'initial_balance' => 100.00,
                'status' => 'active',
            ]),
            'base_data' => null,
        ]);

        $result = $this->accountProcessor->detectConflicts([
            ['id' => 'acc-5', 'name' => 'Test', 'initial_balance' => 100.00, 'status' => 'active'],
        ], $this->user->id);

        $this->assertEmpty($result['conflicts']);
    }
}
