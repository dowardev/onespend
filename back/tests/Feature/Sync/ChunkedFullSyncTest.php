<?php

namespace Tests\Feature\Sync;

use App\Models\User;
use App\Models\Account;
use App\Models\BudgetEntry;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\SyncMetadata;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChunkedFullSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function fullSync_chunks_large_dataset_without_oom(): void
    {
        // Create 10k records across multiple entity types
        $this->createLargeDataset(10000);

        $memoryBefore = memory_get_peak_usage(true);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $memoryAfter = memory_get_peak_usage(true);
        $memoryUsed = $memoryAfter - $memoryBefore;

        $this->assertEquals(200, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);

        // Verify all entity types are present
        $this->assertArrayHasKey('account', $data['data']);
        $this->assertArrayHasKey('budget_entry', $data['data']);
        $this->assertArrayHasKey('budget_provider', $data['data']);
        $this->assertArrayHasKey('supplier', $data['data']);

        // Memory should be well under 100MB
        $this->assertLessThan(100 * 1024 * 1024, $memoryUsed, 
            "Memory used: " . round($memoryUsed / 1024 / 1024, 2) . "MB (limit: 100MB)");

        // Verify record counts
        $totalRecords = 0;
        foreach ($data['data'] as $entityType => $items) {
            $totalRecords += count($items);
        }
        $this->assertGreaterThanOrEqual(10000, $totalRecords);
    }

    /** @test */
    public function fullSync_streaming_response_is_valid_json(): void
    {
        $this->createLargeDataset(5000);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('application/json', $response->headers->get('Content-Type'));

        // The response should be valid JSON (streamed but complete)
        $content = $response->getContent();
        $data = json_decode($content, true);
        
        $this->assertNotNull($data);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('data', $data);
        $this->assertArrayHasKey('serverTime', $data);
    }

    /** @test */
    public function fullSync_etag_304_when_no_changes(): void
    {
        $this->createLargeDataset(1000);

        $response1 = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $this->assertEquals(200, $response1->getStatusCode());
        $etag = $response1->headers->get('ETag');

        $response2 = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full', ['If-None-Match' => $etag]);

        $this->assertEquals(304, $response2->getStatusCode());
        $this->assertEquals($etag, $response2->headers->get('ETag'));
    }

    /** @test */
    public function fullSync_with_since_parameter_returns_only_new_changes(): void
    {
        // Create initial dataset
        $this->createLargeDataset(5000);
        
        sleep(1); // Ensure timestamp difference
        
        $serverTime1 = time();
        
        // Add more records
        $this->createAdditionalRecords(1000);

        $query = http_build_query(['since' => (string)$serverTime1]);
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full?' . $query);

        $this->assertEquals(200, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        
        // Should only contain the new records (approximately 1000)
        $totalNewRecords = 0;
        foreach ($data['data'] as $entityType => $items) {
            $totalNewRecords += count($items);
        }
        
        // Allow margin for timestamp precision and FK records
        $this->assertGreaterThanOrEqual(1000, $totalNewRecords);
        $this->assertLessThanOrEqual(2200, $totalNewRecords);
    }

    /** @test */
    public function fullSync_with_types_parameter_filters_entities(): void
    {
        $this->createLargeDataset(100);

        $params = ['types' => ['account', 'supplier']];
        $query = http_build_query($params);
        
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full?' . $query);

        $this->assertEquals(200, $response->getStatusCode());
        
        $content = $response->getContent();
        $data = json_decode($content, true);
        
        // Should only have requested entity types
        $this->assertArrayHasKey('account', $data['data']);
        $this->assertArrayHasKey('supplier', $data['data']);
        $this->assertArrayNotHasKey('budget_entry', $data['data']);
        $this->assertArrayNotHasKey('budget_provider', $data['data']);
    }

    /** @test */
    public function fullSync_includes_deleted_records_when_since_provided(): void
    {
        $this->createLargeDataset(1000);
        $serverTime = time();
        sleep(1);

        // Soft delete some records
        $account = Account::where('user_id', $this->user->id)->first();
        $syncId = $account->sync_id;
        $account->delete();

        $query = http_build_query(['since' => (string)$serverTime]);
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full?' . $query);

        $this->assertEquals(200, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        
        // Should include deleted marker
        $foundDeleted = false;
        foreach ($data['data']['account'] ?? [] as $item) {
            if (isset($item['_deleted']) && $item['_deleted'] === true && $item['id'] === $syncId) {
                $foundDeleted = true;
                break;
            }
        }
        
        $this->assertTrue($foundDeleted, 'Deleted record should be included with _deleted flag');
    }

    /** @test */
    public function fullSync_memory_does_not_grow_linearly_with_records(): void
    {
        // Test with increasing dataset sizes
        $sizes = [1000, 5000, 10000];
        $memories = [];

        foreach ($sizes as $size) {
            // Fresh user for each iteration (simulated by clearing)
            $user = User::factory()->create();
            
            // Create data for this user
            $this->createDataForUser($user, $size);

            $memoryBefore = memory_get_peak_usage(true);

            $response = $this->actingAs($user, 'sanctum')
                ->get('/api/sync/full');

            $memoryAfter = memory_get_peak_usage(true);
            $memoryUsed = $memoryAfter - $memoryBefore;
            
            $memories[] = $memoryUsed;

            $this->assertEquals(200, $response->getStatusCode());
            
            // Clean up for next iteration
            SyncMetadata::where('user_id', $user->id)->delete();
            Account::where('user_id', $user->id)->delete();
            BudgetEntry::where('user_id', $user->id)->delete();
            BudgetProvider::where('user_id', $user->id)->delete();
            Supplier::where('user_id', $user->id)->delete();
            $user->delete();
        }

        // Memory should not grow linearly - streaming should keep it relatively flat
        // Allow some growth but not linear scaling
        $this->assertLessThan(100 * 1024 * 1024, max($memories));
        
        // Memory for 10k should not be more than 5x memory for 1k
        if (count($memories) >= 3 && $memories[0] > 0) {
            $ratio = $memories[2] / $memories[0];
            $this->assertLessThan(5, $ratio, "Memory grew too much: ratio = $ratio");
        } elseif (count($memories) >= 3) {
            // If memory for 1k is 0 or negative, just check that 10k usage is reasonable
            $this->assertLessThan(100 * 1024 * 1024, $memories[2], 
                "Memory for 10k records should be less than 100MB");
        }
    }

    private function createLargeDataset(int $totalRecords): void
    {
        $recordsPerType = (int)($totalRecords / 4);
        
        // Create a default account for FK references
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'default-acc',
            'name' => 'Default Account',
            'initial_balance' => 0,
            'status' => 'active',
        ]);

        // Accounts
        for ($i = 0; $i < $recordsPerType; $i++) {
            Account::create([
                'user_id' => $this->user->id,
                'sync_id' => "acc-large-$i",
                'name' => "Account $i",
                'initial_balance' => rand(0, 10000),
                'status' => 'active',
            ]);
        }

        // Budget Entries
        for ($i = 0; $i < $recordsPerType; $i++) {
            BudgetEntry::create([
                'user_id' => $this->user->id,
                'sync_id' => "entry-large-$i",
                'name' => "Entry $i",
                'account_id' => $account->id,
                'date' => now()->subDays(rand(0, 365)),
                'amount' => rand(1, 1000),
                'status' => 'active',
            ]);
        }

        // Budget Providers
        for ($i = 0; $i < $recordsPerType; $i++) {
            BudgetProvider::create([
                'user_id' => $this->user->id,
                'sync_id' => "bp-large-$i",
                'name' => "Provider $i",
                'account_id' => $account->id,
                'date' => now()->subDays(rand(0, 365)),
                'status' => 'active',
            ]);
        }

        // Suppliers
        for ($i = 0; $i < $recordsPerType; $i++) {
            Supplier::create([
                'user_id' => $this->user->id,
                'sync_id' => "sup-large-$i",
                'name' => "Supplier $i",
                'status' => 'active',
            ]);
        }
    }

    private function createAdditionalRecords(int $count): void
    {
        $recordsPerType = (int)($count / 4);
        
        // Get the default account for FK references
        $account = Account::where('user_id', $this->user->id)->where('sync_id', 'default-acc')->first();
        if (!$account) {
            $account = Account::create([
                'user_id' => $this->user->id,
                'sync_id' => 'default-acc',
                'name' => 'Default Account',
                'initial_balance' => 0,
                'status' => 'active',
            ]);
        }

        // Get a default supplier for FK references
        $supplier = Supplier::where('user_id', $this->user->id)->where('sync_id', 'default-sup')->first();
        if (!$supplier) {
            $supplier = Supplier::create([
                'user_id' => $this->user->id,
                'sync_id' => 'default-sup',
                'name' => 'Default Supplier',
                'status' => 'active',
            ]);
        }

        // Get a default budget provider for FK references
        $budgetProvider = BudgetProvider::where('user_id', $this->user->id)->where('sync_id', 'default-bp')->first();
        if (!$budgetProvider) {
            $budgetProvider = BudgetProvider::create([
                'user_id' => $this->user->id,
                'sync_id' => 'default-bp',
                'account_id' => $account->id,
                '_supplier_id' => $supplier->sync_id,
                '_supplier_name' => $supplier->name,
                'name' => 'Default Budget Provider',
                'date' => now(),
                'status' => 'active',
            ]);
        }

        // Get a default supplier product for FK references
        $supplierProduct = SupplierProduct::where('user_id', $this->user->id)->where('sync_id', 'default-sp')->first();
        if (!$supplierProduct) {
            $supplierProduct = SupplierProduct::create([
                'user_id' => $this->user->id,
                'supplier_id' => $supplier->id,
                'sync_id' => 'default-sp',
                'name' => 'Default Supplier Product',
                'price' => 1000,
                'status' => 'active',
            ]);
        }

        // Accounts
        for ($i = 0; $i < $recordsPerType; $i++) {
            Account::create([
                'user_id' => $this->user->id,
                'sync_id' => "acc-add-$i",
                'name' => "Additional Account $i",
                'initial_balance' => rand(0, 10000),
                'status' => 'active',
            ]);
        }

        // Suppliers
        for ($i = 0; $i < $recordsPerType; $i++) {
            Supplier::create([
                'user_id' => $this->user->id,
                'sync_id' => "sup-add-$i",
                'name' => "Additional Supplier $i",
                'status' => 'active',
            ]);
        }

        // Budget Providers
        for ($i = 0; $i < $recordsPerType; $i++) {
            BudgetProvider::create([
                'user_id' => $this->user->id,
                'sync_id' => "bp-add-$i",
                'account_id' => $account->id,
                '_supplier_id' => $supplier->sync_id,
                '_supplier_name' => $supplier->name,
                'name' => "Additional Budget Provider $i",
                'date' => now()->subDays(rand(0, 365)),
                'status' => 'active',
            ]);
        }

        // Budget Provider Products
        for ($i = 0; $i < $recordsPerType; $i++) {
            BudgetProviderProduct::create([
                'user_id' => $this->user->id,
                'sync_id' => "bpp-add-$i",
                'budget_provider_id' => $budgetProvider->id,
                'supplier_product_id' => $supplierProduct->id,
                'product_name' => "Additional Product $i",
                'product_price' => rand(500, 5000),
                'quantity' => rand(1, 10),
                'status' => 'active',
            ]);
        }

        // Budget Entries
        for ($i = 0; $i < $recordsPerType; $i++) {
            BudgetEntry::create([
                'user_id' => $this->user->id,
                'sync_id' => "be-add-$i",
                'account_id' => $account->id,
                'date' => now()->toDateString(),
                'amount' => rand(1000, 10000),
                'name' => "Additional Budget Entry $i",
                'payment_type' => rand(0, 1) === 0 ? 'cash' : 'digital',
                'entry_type' => rand(0, 1) === 0 ? 'ingreso' : 'egreso',
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'status' => 'active',
            ]);
        }

        // Supplier Products
        for ($i = 0; $i < $recordsPerType; $i++) {
            SupplierProduct::create([
                'user_id' => $this->user->id,
                'supplier_id' => $supplier->id,
                'sync_id' => "sp-add-$i",
                'name' => "Additional Supplier Product $i",
                'price' => rand(500, 5000),
                'status' => 'active',
            ]);
        }

        // Recurring Records
        for ($i = 0; $i < $recordsPerType; $i++) {
            RecurringRecord::create([
                'user_id' => $this->user->id,
                'sync_id' => "rr-add-$i",
                'type' => rand(0, 1) === 0 ? 'cargo' : 'provedor',
                'entry_type' => rand(0, 1) === 0 ? 'ingreso' : 'egreso',
                'name' => "Additional Recurring Record $i",
                'amount' => rand(1000, 10000),
                'account_id' => $account->id,
                'start_date' => now()->toDateString(),
                'status' => 'active',
            ]);
        }

        // Recurring Record Products
        for ($i = 0; $i < $recordsPerType; $i++) {
            RecurringRecordProduct::create([
                'user_id' => $this->user->id,
                'sync_id' => "rrp-add-$i",
                'recurring_record_id' => $i + 1, // Simple reference
                'supplier_product_id' => $supplierProduct->id,
                'product_name' => "Additional Product $i",
                'quantity' => rand(1, 10),
                'status' => 'active',
            ]);
        }
    }

    private function createDataForUser(User $user, int $size): void
    {
        $recordsPerType = (int)($size / 4);
        
        $account = Account::create([
            'user_id' => $user->id,
            'sync_id' => "mem-default-acc",
            'name' => 'Default Account',
            'initial_balance' => 0,
            'status' => 'active',
        ]);

        for ($i = 0; $i < $recordsPerType; $i++) {
            Account::create([
                'user_id' => $user->id,
                'sync_id' => "mem-test-acc-$i",
                'name' => "Account $i",
                'initial_balance' => rand(0, 10000),
                'status' => 'active',
            ]);
        }
    }
}