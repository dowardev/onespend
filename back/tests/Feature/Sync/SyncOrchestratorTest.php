<?php

namespace Tests\Feature\Sync;

use App\Models\User;
use App\Models\Account;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\BudgetEntry;
use App\Models\BudgetProvider;
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncOrchestratorTest extends TestCase
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

    public function test_merge_creates_multiple_entity_types(): void
    {
        $accountSyncId = 'sync-account-1';
        $supplierSyncId = 'sync-supplier-1';
        $productSyncId = 'sync-sp-1';

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Test Account', 'initialBalance' => 500, 'status' => 'active'],
            ],
            'supplier' => [
                [
                    'id' => $supplierSyncId,
                    'name' => 'Test Supplier',
                    'products' => [
                        ['sync_id' => $productSyncId, 'name' => 'Product A', 'price' => 100],
                    ],
                ],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $this->assertArrayHasKey('updated', $results);
        $this->assertArrayHasKey('deleted', $results);
        $this->assertArrayHasKey('conflicts', $results);
        $this->assertArrayHasKey('errors', $results);
        $this->assertArrayHasKey('skipped', $results);

        $this->assertArrayHasKey('account', $results['created']);
        $this->assertCount(1, $results['created']['account']);
        $this->assertEquals($accountSyncId, $results['created']['account'][0]['sync_id']);

        $this->assertArrayHasKey('supplier', $results['created']);
        $this->assertCount(1, $results['created']['supplier']);
        $this->assertEquals($supplierSyncId, $results['created']['supplier'][0]['sync_id']);

        $this->assertTrue(Account::where('sync_id', $accountSyncId)->exists());
        $this->assertTrue(Supplier::where('sync_id', $supplierSyncId)->exists());
        $this->assertTrue(SupplierProduct::where('sync_id', $productSyncId)->exists());
    }

    public function test_merge_updates_existing_entities(): void
    {
        $accountSyncId = 'sync-account-upd-1';
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $accountSyncId,
            'name' => 'Old Name',
            'status' => 'active',
        ]);
        Account::where('sync_id', $accountSyncId)
            ->update(['updated_at' => '2001-01-01 00:00:00']);

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'New Name', 'updated_at' => 2000000000],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('updated', $results);
        $this->assertArrayHasKey('account', $results['updated']);
        $this->assertDatabaseHas('accounts', [
            'sync_id' => $accountSyncId,
            'name' => 'New Name',
        ]);
    }

    public function test_merge_deletes_entities(): void
    {
        $accountSyncId = 'sync-account-del-1';
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $accountSyncId,
            'name' => 'To Delete',
            'status' => 'active',
        ]);

        $data = [
            'account' => [
                ['id' => $accountSyncId, '_deleted' => true, 'updated_at' => 2000000000],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('deleted', $results);
        $this->assertArrayHasKey('account', $results['deleted']);
        $this->assertContains($accountSyncId, $results['deleted']['account']);

        $account = Account::withTrashed()->where('sync_id', $accountSyncId)->first();
        $this->assertNotNull($account->deleted_at);
    }

    public function test_merge_follows_entity_dependency_order(): void
    {
        $accountSyncId = 'sync-account-order-1';
        $entrySyncId = 'sync-be-order-1';

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Order Account', 'initialBalance' => 1000, 'status' => 'active'],
            ],
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'Entry After Account',
                    'amount' => 100,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'account_id' => $accountSyncId,
                    'status' => 'active',
                ],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $this->assertArrayHasKey('account', $results['created']);
        $this->assertArrayHasKey('budget_entry', $results['created']);

        $entry = BudgetEntry::where('sync_id', $entrySyncId)->first();
        $this->assertNotNull($entry);
        $this->assertNotNull($entry->account_id);

        $account = Account::where('sync_id', $accountSyncId)->first();
        $this->assertNotNull($account);

        $this->assertEquals($account->id, $entry->account_id);
    }

    public function test_merge_detects_conflicts(): void
    {
        $accountSyncId = 'sync-account-conf-1';
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $accountSyncId,
            'name' => 'Server Account',
            'status' => 'active',
        ]);
        Account::where('sync_id', $accountSyncId)
            ->update(['updated_at' => '2026-12-01 00:00:00']);

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Client Account', 'updated_at' => 1000000000],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('conflicts', $results);
        $this->assertNotEmpty($results['conflicts']);
        $this->assertArrayHasKey('account', $results['conflicts']);
        $this->assertEquals($accountSyncId, $results['conflicts']['account'][0]['sync_id']);
        $this->assertArrayHasKey('conflict_type', $results['conflicts']['account'][0]);
        $this->assertArrayHasKey('server_hash', $results['conflicts']['account'][0]);
        $this->assertArrayHasKey('client_hash', $results['conflicts']['account'][0]);
    }

    public function test_merge_no_conflict_when_field_hash_matches(): void
    {
        $accountSyncId = 'sync-account-nc-1';
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => $accountSyncId,
            'name' => 'Test Account',
            'initial_balance' => 500,
            'status' => 'active',
        ]);
        Account::where('sync_id', $accountSyncId)
            ->update(['updated_at' => '2026-12-01 00:00:00']);

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Test Account', 'initialBalance' => 500, 'status' => 'active', 'updated_at' => 1000000000],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('conflicts', $results);
        $this->assertEmpty($results['conflicts']);
    }

    public function test_merge_handles_budget_entry_with_groups(): void
    {
        $account1SyncId = 'sync-account-group-1';
        $account2SyncId = 'sync-account-group-2';
        $entrySyncId = 'sync-be-group-1';

        $data = [
            'account' => [
                ['id' => $account1SyncId, 'name' => 'Account 1', 'initialBalance' => 100, 'status' => 'active'],
                ['id' => $account2SyncId, 'name' => 'Account 2', 'initialBalance' => 200, 'status' => 'active'],
            ],
            'budget_entry' => [
                [
                    'id' => $entrySyncId,
                    'name' => 'Group Entry',
                    'amount' => 300,
                    'date' => '2026-06-15',
                    'entry_type' => 'egreso',
                    'account_id' => $account1SyncId,
                    'status' => 'active',
                    'groups' => [
                        ['account_id' => $account1SyncId, 'amount' => 100],
                        ['account_id' => $account2SyncId, 'amount' => 200],
                    ],
                ],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $this->assertArrayHasKey('account', $results['created']);
        $this->assertArrayHasKey('budget_entry', $results['created']);

        $entry = BudgetEntry::where('sync_id', $entrySyncId)->first();
        $this->assertNotNull($entry);
        $this->assertCount(2, $entry->groups);
    }

    public function test_merge_handles_full_flow(): void
    {
        $accountSyncId = 'sync-full-account-1';
        $supplierSyncId = 'sync-full-supplier-1';
        $spSyncId = 'sync-full-sp-1';
        $bpSyncId = 'sync-full-bp-1';
        $rrSyncId = 'sync-full-rr-1';
        $beSyncId = 'sync-full-be-1';

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'Full Account', 'initialBalance' => 1000, 'status' => 'active'],
            ],
            'recurring_record' => [
                [
                    'id' => $rrSyncId,
                    'name' => 'Full RR',
                    'type' => 'cargo',
                    'entry_type' => 'egreso',
                    'amount' => 200,
                    'account_id' => $accountSyncId,
                    'repeat_frequency' => 'month',
                    'repeat_interval' => 1,
                    'start_date' => '2026-01-01',
                    'status' => 'active',
                ],
            ],
            'supplier' => [
                [
                    'id' => $supplierSyncId,
                    'name' => 'Full Supplier',
                    'products' => [
                        ['sync_id' => $spSyncId, 'name' => 'Full SP', 'price' => 50],
                    ],
                ],
            ],
            'budget_provider' => [
                [
                    'id' => $bpSyncId,
                    'name' => 'Full BP',
                    'date' => '2026-06-01',
                    'account_id' => $accountSyncId,
                    'estimated' => 500,
                    'status' => 'active',
                ],
            ],
            'budget_entry' => [
                [
                    'id' => $beSyncId,
                    'name' => 'Full BE',
                    'amount' => 150,
                    'date' => '2026-06-01',
                    'entry_type' => 'egreso',
                    'account_id' => $accountSyncId,
                    'status' => 'active',
                ],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $expectedTypes = ['account', 'recurring_record', 'supplier', 'budget_provider', 'budget_entry'];
        foreach ($expectedTypes as $type) {
            $this->assertArrayHasKey($type, $results['created'], "Missing created {$type}");
        }

        $this->assertTrue(Account::where('sync_id', $accountSyncId)->exists());
        $this->assertTrue(Supplier::where('sync_id', $supplierSyncId)->exists());
        $this->assertTrue(BudgetProvider::where('sync_id', $bpSyncId)->exists());
        $this->assertTrue(RecurringRecord::where('sync_id', $rrSyncId)->exists());
        $this->assertTrue(BudgetEntry::where('sync_id', $beSyncId)->exists());
    }

    public function test_merge_returns_correct_json_structure(): void
    {
        $accountSyncId = 'sync-json-account-1';

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'JSON Test', 'status' => 'active'],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $this->assertArrayHasKey('updated', $results);
        $this->assertArrayHasKey('deleted', $results);
        $this->assertArrayHasKey('conflicts', $results);
        $this->assertArrayHasKey('errors', $results);
        $this->assertArrayHasKey('skipped', $results);

        $this->assertIsArray($results['created']);
        $this->assertIsArray($results['updated']);
        $this->assertIsArray($results['deleted']);
        $this->assertIsArray($results['conflicts']);
        $this->assertIsArray($results['errors']);
        $this->assertIsArray($results['skipped']);

        $this->assertCount(1, $results['created']['account']);
        $this->assertEquals($accountSyncId, $results['created']['account'][0]['sync_id']);
        $this->assertIsInt($results['created']['account'][0]['id']);
    }

    public function test_merge_handles_recurring_record_with_products(): void
    {
        $accountSyncId = 'sync-rrprod-account-1';
        $supplierSyncId = 'sync-rrprod-supplier-1';
        $spSyncId = 'sync-rrprod-sp-1';
        $rrSyncId = 'sync-rrprod-1';
        $rrpSyncId = 'sync-rrp-1';

        Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => $supplierSyncId,
            'name' => 'RR Prod Supplier',
        ]);
        SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => $spSyncId,
            'supplier_id' => $supplierSyncId,
            'name' => 'RR Supplier Product',
            'price' => 25,
            'status' => 'active',
        ]);

        $data = [
            'account' => [
                ['id' => $accountSyncId, 'name' => 'RR Prod Account', 'initialBalance' => 500, 'status' => 'active'],
            ],
            'recurring_record' => [
                [
                    'id' => $rrSyncId,
                    'name' => 'RR With Products',
                    'type' => 'cargo',
                    'entry_type' => 'egreso',
                    'amount' => 300,
                    'account_id' => $accountSyncId,
                    'repeat_frequency' => 'month',
                    'repeat_interval' => 1,
                    'start_date' => '2026-01-01',
                    'status' => 'active',
                    'products' => [
                        [
                            'sync_id' => $rrpSyncId,
                            'supplier_product_id' => $spSyncId,
                            'product_name' => 'Linked Product',
                            'product_price' => 25,
                            'quantity' => 2,
                        ],
                    ],
                ],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('created', $results);
        $this->assertArrayHasKey('recurring_record', $results['created']);

        $rr = RecurringRecord::where('sync_id', $rrSyncId)->first();
        $this->assertNotNull($rr);
        $this->assertCount(1, $rr->products);
        $this->assertEquals($rrpSyncId, $rr->products->first()->sync_id);
    }

    public function test_merge_handles_unknown_entity_type(): void
    {
        $data = [
            'unknown_type' => [
                ['id' => 'test-1', 'name' => 'Unknown'],
            ],
        ];

        $results = $this->orchestrator->merge($data, $this->user->id);

        $this->assertArrayHasKey('skipped', $results);
    }
}
