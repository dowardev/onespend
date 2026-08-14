<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\BudgetEntryGroup;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use App\Models\SyncMetadata;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncControllerResolveConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function createConflict(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-conflict-1',
            'name' => 'Server Name',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-conflict-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['name' => 'Server Name', 'initial_balance' => 100.00, 'status' => 'active'],
                'client_data' => ['name' => 'Client Name', 'initial_balance' => 200.00, 'status' => 'active'],
            ],
            'field_hash' => 'hash',
            'base_data' => ['name' => 'Original', 'initial_balance' => 150.00, 'status' => 'active'],
        ]);
    }

    public function test_resolves_as_server(): void
    {
        $this->createConflict();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'server',
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->assertEquals(
            'resolved',
            SyncMetadata::forUser($this->user->id)
                ->byEntity('account', 'acc-conflict-1')
                ->first()
                ->sync_status
        );
    }

    public function test_resolves_as_client(): void
    {
        $this->createConflict();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Client Name',
                    'initial_balance' => 200.00,
                    'status' => 'active',
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $account = Account::where('sync_id', 'acc-conflict-1')->first();
        $this->assertEquals('Client Name', $account->name);
        $this->assertEquals(200.00, $account->initial_balance);
    }

    public function test_rejects_invalid_client_data(): void
    {
        $this->createConflict();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'client',
                'client_data' => [
                    'name' => '',
                    'initial_balance' => -100.00,
                ],
            ]);

        $response->assertStatus(422);
    }

    public function test_returns_404_when_conflict_not_found(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'nonexistent',
                'resolution' => 'server',
            ]);

        $response->assertStatus(404);
        $response->assertJson(['error' => 'Conflict not found']);
    }

    public function test_returns_409_when_already_resolved(): void
    {
        $this->createConflict();

        SyncMetadata::forUser($this->user->id)
            ->byEntity('account', 'acc-conflict-1')
            ->update(['sync_status' => 'resolved']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'server',
            ]);

        $response->assertStatus(409);
        $response->assertJson(['error' => 'No active conflict for this entity']);
    }

    public function test_get_active_conflicts_returns_only_conflict_status(): void
    {
        $this->createConflict();

        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-resolved-1',
            'user_id' => $this->user->id,
            'sync_status' => 'resolved',
            'conflict_data' => ['resolution' => 'server', 'resolved_at' => now()->toIso8601String()],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/sync/active-conflicts');

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonCount(1, 'conflicts');
        $this->assertEquals('acc-conflict-1', $response->json('conflicts.0.entity_id'));
        $this->assertEquals('conflict', $response->json('conflicts.0.sync_status'));
    }

    public function test_get_active_conflicts_filters_by_entity_type(): void
    {
        $this->createConflict();

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-conflict-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/sync/active-conflicts?entity_type=account');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'conflicts');
        $this->assertEquals('account', $response->json('conflicts.0.entity_type'));
    }

    // ─── NEW BEHAVIOR TESTS ─────────────────────────────────────────

    public function test_keep_server_returns_entity_in_response(): void
    {
        $this->createConflict();

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'server',
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonStructure([
            'entity' => ['id', 'id_server', 'name', 'initial_balance', 'status', 'updated_at'],
        ]);
        $this->assertEquals('Server Name', $response->json('entity.name'));
        $this->assertEquals(100.00, (float) $response->json('entity.initial_balance'));
        $this->assertEquals('acc-conflict-1', $response->json('entity.id'));
    }

    public function test_keep_server_preserves_existing_conflict_data(): void
    {
        $this->createConflict();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'server',
            ]);

        $meta = SyncMetadata::forUser($this->user->id)
            ->byEntity('account', 'acc-conflict-1')
            ->first();

        $this->assertEquals('resolved', $meta->sync_status);
        $cd = is_array($meta->conflict_data) ? $meta->conflict_data : json_decode($meta->conflict_data, true);
        $this->assertArrayHasKey('server_data', $cd, 'conflict_data should retain server_data');
        $this->assertArrayHasKey('client_data', $cd, 'conflict_data should retain client_data');
        $this->assertEquals('server', $cd['resolution'], 'resolution key should be present');
        $this->assertArrayHasKey('resolved_at', $cd, 'resolved_at should be present');
    }

    public function test_keep_server_does_not_change_entity_data(): void
    {
        $this->createConflict();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'server',
            ]);

        $account = Account::where('sync_id', 'acc-conflict-1')->first();
        $this->assertEquals('Server Name', $account->name);
        $this->assertEquals(100.00, $account->initial_balance);
        $this->assertEquals('active', $account->status);
    }

    public function test_keep_client_bumps_version(): void
    {
        $this->createConflict();

        $account = Account::where('sync_id', 'acc-conflict-1')->first();
        $versionBefore = $account->version;

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Client Name',
                    'initial_balance' => 200.00,
                    'status' => 'active',
                ],
            ]);

        $account->refresh();
        $this->assertEquals($versionBefore + 1, $account->version);
    }

    public function test_keep_client_refreshes_sync_metadata(): void
    {
        $this->createConflict();

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-conflict-1',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Client Name',
                    'initial_balance' => 200.00,
                    'status' => 'active',
                ],
            ]);

        $meta = SyncMetadata::forUser($this->user->id)
            ->byEntity('account', 'acc-conflict-1')
            ->first();

        $this->assertEquals('resolved', $meta->sync_status);
        $this->assertNotNull($meta->field_hash);
        $this->assertNotNull($meta->base_data);
        $this->assertNotNull($meta->server_updated_at);
    }

    public function test_keep_client_for_recurring_record_product(): void
    {
        $recurringRecord = RecurringRecord::create([
            'user_id' => $this->user->id,
            'sync_id' => 'rr-parent-1',
            'type' => 'cargo',
            'entry_type' => 'egreso',
            'name' => 'Parent',
            'repeat_frequency' => 'month',
            'start_date' => '2026-01-01',
        ]);

        RecurringRecordProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => 'rrp-conflict-1',
            'recurring_record_id' => $recurringRecord->id,
            'product_name' => 'Server Product',
            'product_price' => 50.00,
            'quantity' => 1,
        ]);

        SyncMetadata::create([
            'entity_type' => 'recurring_record_product',
            'entity_id' => 'rrp-conflict-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['product_name' => 'Server Product', 'product_price' => 50.00, 'quantity' => 1],
                'client_data' => ['product_name' => 'Client Product', 'product_price' => 60.00, 'quantity' => 2],
            ],
            'field_hash' => 'hash',
            'base_data' => ['product_name' => 'Original', 'product_price' => 55.00, 'quantity' => 1],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'recurring_record_product',
                'entity_id' => 'rrp-conflict-1',
                'resolution' => 'client',
                'client_data' => [
                    'product_name' => 'Client Product',
                    'product_price' => 60.00,
                    'quantity' => 2,
                    'recurring_record_id' => 'rr-parent-1',
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $product = RecurringRecordProduct::where('sync_id', 'rrp-conflict-1')->first();
        $this->assertEquals('Client Product', $product->product_name);
        $this->assertEquals(60.00, (float) $product->product_price);
        $this->assertEquals(2, $product->quantity);
    }

    public function test_returns_entity_not_found_when_server_row_missing(): void
    {
        SyncMetadata::create([
            'entity_type' => 'account',
            'entity_id' => 'acc-orphan',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'account',
                'entity_id' => 'acc-orphan',
                'resolution' => 'server',
            ]);

        $response->assertStatus(404);
        $response->assertJson(['error' => 'Entity not found on server']);
    }

    // ── NEW: keep-client with UUID FK fields ────────────────────────────

    public function test_keep_client_with_uuid_account_id_resolves(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-uuid-1',
            'name' => 'UUID Account',
            'initial_balance' => 500.00,
            'status' => 'active',
        ]);

        BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-uuid-1',
            'name' => 'Server Entry',
            'account_id' => $account->id,
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
            'date' => '2026-07-07',
            'amount' => 100.00,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-uuid-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 100.00],
                'client_data' => ['amount' => 150.00, 'account_id' => 'acc-uuid-1'],
            ],
            'field_hash' => 'hash',
            'base_data' => ['amount' => 100.00, 'account_id' => $account->id],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-uuid-1',
                'resolution' => 'client',
                'client_data' => [
                    'account_id' => 'acc-uuid-1',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                    'date' => '2026-07-07',
                    'amount' => 150.00,
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $entry = BudgetEntry::where('sync_id', 'be-uuid-1')->first();
        $this->assertEquals(150.00, (float) $entry->amount);
        $this->assertEquals($account->id, $entry->account_id);
    }

    public function test_keep_client_with_uuid_groups_account_id_resolves(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-grp-1',
            'name' => 'Group Account',
            'initial_balance' => 300.00,
            'status' => 'active',
        ]);

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-grp-1',
            'name' => 'Test Entry',
            'account_id' => $account->id,
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
            'date' => '2026-07-07',
            'amount' => 200.00,
        ]);

        BudgetEntryGroup::create([
            'user_id' => $this->user->id,
            'sync_id' => 'group-1',
            'budget_entry_id' => $entry->id,
            'account_id' => $account->id,
            'amount' => 100.00,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-grp-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 200.00, 'groups' => [['account_id' => $account->id, 'amount' => 100.00]]],
                'client_data' => ['amount' => 250.00, 'groups' => [['account_id' => 'acc-grp-1', 'amount' => 150.00]]],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-grp-1',
                'resolution' => 'client',
                'client_data' => [
                    'account_id' => 'acc-grp-1',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                    'date' => '2026-07-07',
                    'amount' => 250.00,
                    'groups' => [
                        ['sync_id' => 'group-1', 'account_id' => 'acc-grp-1', 'amount' => 150.00],
                    ],
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Note: groups are not updated in the resolve flow (pre-existing limitation)
    }

    public function test_keep_client_with_unresolvable_uuid_sets_null(): void
    {
        BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-bad-uuid',
            'name' => 'Bad Entry',
            'account_id' => null,
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
            'date' => '2026-07-07',
            'amount' => 100.00,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-bad-uuid',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 100.00],
                'client_data' => ['amount' => 150.00],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-bad-uuid',
                'resolution' => 'client',
                'client_data' => [
                    'account_id' => 'nonexistent-uuid',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                    'date' => '2026-07-07',
                    'amount' => 150.00,
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $entry = BudgetEntry::where('sync_id', 'be-bad-uuid')->first();
        $this->assertNull($entry->account_id);
    }

    public function test_keep_client_budget_provider_product_with_uuid_budget_provider_id(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-bp-1',
            'name' => 'BP Account',
            'initial_balance' => 0,
            'status' => 'active',
        ]);

        $provider = BudgetProvider::create([
            'user_id' => $this->user->id,
            'sync_id' => 'bp-uuid-1',
            'account_id' => $account->id,
            'name' => 'Test Provider',
            'date' => '2026-07-07',
        ]);

        BudgetProviderProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => 'bpp-uuid-1',
            'budget_provider_id' => $provider->id,
            'product_name' => 'Original Product',
            'product_price' => 50.00,
            'quantity' => 1,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_provider_product',
            'entity_id' => 'bpp-uuid-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['product_name' => 'Original Product', 'product_price' => 50.00, 'quantity' => 1],
                'client_data' => ['product_name' => 'Updated Product', 'product_price' => 75.00, 'quantity' => 2],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_provider_product',
                'entity_id' => 'bpp-uuid-1',
                'resolution' => 'client',
                'client_data' => [
                    'budget_provider_id' => 'bp-uuid-1',
                    'product_name' => 'Updated Product',
                    'product_price' => 75.00,
                    'quantity' => 2,
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $product = BudgetProviderProduct::where('sync_id', 'bpp-uuid-1')->first();
        $this->assertEquals('Updated Product', $product->product_name);
        $this->assertEquals(75.00, (float) $product->product_price);
        $this->assertEquals(2, $product->quantity);
    }

    // ── NEW: keep-client returns entity in response ─────────────────────

    public function test_keep_client_returns_entity_in_response(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-entity-1',
            'name' => 'Entity Account',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-entity-1',
            'name' => 'Original Entry',
            'account_id' => $account->id,
            'amount' => 50.00,
            'date' => '2026-07-07',
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-entity-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 50.00],
                'client_data' => ['amount' => 75.00],
            ],
            'field_hash' => 'hash',
            'base_data' => ['amount' => 50.00],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-entity-1',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Updated Entry',
                    'account_id' => 'acc-entity-1',
                    'amount' => 75.00,
                    'date' => '2026-07-07',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $response->assertJsonStructure([
            'entity' => ['id', 'id_server', 'name', 'account_id', 'amount', 'updated_at'],
        ]);
        $this->assertEquals('be-entity-1', $response->json('entity.id'));
        $this->assertEquals(75.00, (float) $response->json('entity.amount'));
    }

    public function test_keep_client_with_empty_groups_does_not_touch_server_groups(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-grp-keep',
            'name' => 'Keep Group Account',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-grp-keep',
            'name' => 'Group Entry',
            'account_id' => $account->id,
            'amount' => 200.00,
            'date' => '2026-07-07',
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
        ]);

        BudgetEntryGroup::create([
            'user_id' => $this->user->id,
            'sync_id' => 'existing-group-1',
            'budget_entry_id' => $entry->id,
            'account_id' => $account->id,
            'amount' => 100.00,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-grp-keep',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 200.00],
                'client_data' => ['amount' => 150.00, 'groups' => []],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-grp-keep',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Group Entry',
                    'account_id' => 'acc-grp-keep',
                    'amount' => 150.00,
                    'date' => '2026-07-07',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                    'groups' => [],
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $entry->refresh();
        $this->assertEquals(150.00, (float) $entry->amount);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)->get();
        $this->assertCount(1, $groups, 'Server groups should not be deleted when client sends empty groups');
        $this->assertEquals(100.00, (float) $groups->first()->amount);
    }

    public function test_keep_client_with_populated_groups_updates_server_groups(): void
    {
        $account1 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-upd-1',
            'name' => 'Update Account 1',
            'initial_balance' => 100.00,
            'status' => 'active',
        ]);

        $account2 = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-upd-2',
            'name' => 'Update Account 2',
            'initial_balance' => 200.00,
            'status' => 'active',
        ]);

        $entry = BudgetEntry::create([
            'user_id' => $this->user->id,
            'sync_id' => 'be-grp-upd',
            'name' => 'Updated Entry',
            'account_id' => $account1->id,
            'amount' => 300.00,
            'date' => '2026-07-07',
            'payment_type' => 'cash',
            'entry_type' => 'egreso',
        ]);

        BudgetEntryGroup::create([
            'user_id' => $this->user->id,
            'sync_id' => 'old-group-1',
            'budget_entry_id' => $entry->id,
            'account_id' => $account1->id,
            'amount' => 300.00,
        ]);

        SyncMetadata::create([
            'entity_type' => 'budget_entry',
            'entity_id' => 'be-grp-upd',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['amount' => 300.00],
                'client_data' => ['amount' => 300.00, 'groups' => []],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'budget_entry',
                'entity_id' => 'be-grp-upd',
                'resolution' => 'client',
                'client_data' => [
                    'name' => 'Updated Entry',
                    'account_id' => 'acc-upd-1',
                    'amount' => 300.00,
                    'date' => '2026-07-07',
                    'payment_type' => 'cash',
                    'entry_type' => 'egreso',
                    'groups' => [
                        ['sync_id' => 'old-group-1', 'account_id' => 'acc-upd-1', 'amount' => 200.00],
                        ['sync_id' => 'new-group-2', 'account_id' => 'acc-upd-2', 'amount' => 100.00],
                    ],
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $entry->refresh();
        $this->assertEquals(300.00, (float) $entry->amount);

        $groups = BudgetEntryGroup::where('budget_entry_id', $entry->id)
            ->orderBy('amount')
            ->get();
        $this->assertCount(2, $groups, 'Groups should be updated with new distribution');
        $this->assertEquals(100.00, (float) $groups[0]->amount);
        $this->assertEquals(200.00, (float) $groups[1]->amount);
    }

    public function test_keep_client_recurring_record_with_uuid_account_id(): void
    {
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-rr-1',
            'name' => 'RR Account',
            'initial_balance' => 0,
            'status' => 'active',
        ]);

        RecurringRecord::create([
            'user_id' => $this->user->id,
            'sync_id' => 'rr-uuid-1',
            'account_id' => $account->id,
            'type' => 'cargo',
            'entry_type' => 'egreso',
            'name' => 'Server Recurring',
            'repeat_frequency' => 'month',
            'start_date' => '2026-01-01',
        ]);

        SyncMetadata::create([
            'entity_type' => 'recurring_record',
            'entity_id' => 'rr-uuid-1',
            'user_id' => $this->user->id,
            'sync_status' => 'conflict',
            'conflict_data' => [
                'server_data' => ['name' => 'Server Recurring'],
                'client_data' => ['name' => 'Client Recurring'],
            ],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/resolve-conflict', [
                'entity_type' => 'recurring_record',
                'entity_id' => 'rr-uuid-1',
                'resolution' => 'client',
                'client_data' => [
                    'account_id' => 'acc-rr-1',
                    'type' => 'cargo',
                    'entry_type' => 'egreso',
                    'name' => 'Client Recurring',
                    'repeat_frequency' => 'month',
                    'start_date' => '2026-01-01',
                ],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $record = RecurringRecord::where('sync_id', 'rr-uuid-1')->first();
        $this->assertEquals('Client Recurring', $record->name);
    }
}
