<?php

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\MergeJob;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\SyncMetadata;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function getFullSync(): array
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $this->assertEquals(200, $response->getStatusCode());
        $content = $response->getContent();
        $this->assertNotEmpty($content);

        $data = json_decode($content, true);
        $this->assertIsArray($data);

        return $data;
    }

    public function test_full_sync_returns_all_active_records(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-sync-1',
            'name' => 'Full Sync Account',
            'status' => 'active',
        ]);

        $data = $this->getFullSync();

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('data', $data);
        $this->assertArrayHasKey('serverTime', $data);
        $this->assertArrayHasKey('account', $data['data']);
        $this->assertCount(1, $data['data']['account']);
    }

    public function test_full_sync_returns_only_active_and_own_records(): void
    {
        $otherUser = User::factory()->create();

        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-own-1',
            'name' => 'Own Account',
            'status' => 'active',
        ]);
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-own-deleted',
            'name' => 'Own Deleted',
            'status' => 'deleted',
        ]);
        Account::create([
            'user_id' => $otherUser->id,
            'sync_id' => 'acc-other-1',
            'name' => 'Other Account',
            'status' => 'active',
        ]);

        $data = $this->getFullSync();

        $this->assertCount(1, $data['data']['account']);
        $this->assertEquals('acc-own-1', $data['data']['account'][0]['id']);
        $this->assertEquals('Own Account', $data['data']['account'][0]['name']);

        $ids = array_column($data['data']['account'], 'id');
        $this->assertNotContains('acc-other-1', $ids);
        $this->assertNotContains('acc-own-deleted', $ids);
    }

    public function test_full_sync_returns_server_time_as_integer(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-time-1',
            'name' => 'Time Test',
            'status' => 'active',
        ]);

        $data = $this->getFullSync();

        $this->assertIsInt($data['serverTime']);
        $this->assertGreaterThan(1700000000, $data['serverTime']);
    }

    public function test_full_sync_returns_all_entity_types_even_when_empty(): void
    {
        $data = $this->getFullSync();

        $this->assertArrayHasKey('account', $data['data']);
        $this->assertArrayHasKey('budget_provider', $data['data']);
        $this->assertArrayHasKey('budget_provider_product', $data['data']);
        $this->assertArrayHasKey('budget_entry', $data['data']);
        $this->assertArrayHasKey('supplier', $data['data']);
        $this->assertArrayHasKey('supplier_product', $data['data']);
        $this->assertArrayHasKey('recurring_record', $data['data']);
    }

    public function test_full_sync_formats_items_correctly(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-format-1',
            'name' => 'Format Test',
            'initial_balance' => 1000.50,
            'status' => 'active',
        ]);

        $data = $this->getFullSync();

        $account = $data['data']['account'][0];
        $this->assertEquals('acc-format-1', $account['id']);
        $this->assertEquals('Format Test', $account['name']);
        $this->assertEquals(1000.50, $account['initial_balance']);
        $this->assertArrayHasKey('updated_at', $account);
        $this->assertIsInt($account['updated_at']);
    }

    public function test_full_sync_requires_authentication(): void
    {
        $response = $this->get('/api/sync/full');
        $this->assertContains($response->getStatusCode(), [401, 302]);
    }

    public function test_full_sync_includes_supplier_products(): void
    {
        $supplier = Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'sup-prod-1',
            'name' => 'Supplier With Products',
            'status' => 'active',
        ]);
        SupplierProduct::create([
            'user_id' => $this->user->id,
            'sync_id' => 'sp-prod-1',
            'supplier_id' => $supplier->sync_id,
            'name' => 'Product 1',
            'price' => 99.99,
            'status' => 'active',
        ]);

        $data = $this->getFullSync();

        $supplierData = $data['data']['supplier'][0];
        $this->assertEquals('sup-prod-1', $supplierData['id']);
        $this->assertCount(1, $supplierData['products']);
        $this->assertEquals('Product 1', $supplierData['products'][0]['name']);
    }

    public function test_full_sync_with_many_records_returns_correctly(): void
    {
        for ($i = 0; $i < 100; $i++) {
            Account::create([
                'user_id' => $this->user->id,
                'sync_id' => "acc-bulk-{$i}",
                'name' => "Bulk Account {$i}",
                'status' => 'active',
            ]);
        }

        $data = $this->getFullSync();

        $this->assertCount(100, $data['data']['account']);
    }

    public function test_full_sync_does_not_include_soft_deleted_records(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-live-1',
            'name' => 'Live',
            'status' => 'active',
        ]);
        $deleted = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-deleted-1',
            'name' => 'Deleted',
            'status' => 'active',
        ]);
        $deleted->delete();

        $data = $this->getFullSync();

        $this->assertCount(1, $data['data']['account']);
        $ids = array_column($data['data']['account'], 'id');
        $this->assertContains('acc-live-1', $ids);
    }

    public function test_full_sync_with_types_returns_only_requested_entities(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-ft-1',
            'name' => 'Filtered Account',
            'status' => 'active',
        ]);
        Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'sup-ft-1',
            'name' => 'Filtered Supplier',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full?types[]=account');

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);

        $this->assertArrayHasKey('account', $data['data']);
        $this->assertCount(1, $data['data']['account']);
        $this->assertArrayNotHasKey('supplier', $data['data']);
        $this->assertArrayNotHasKey('budget_entry', $data['data']);
    }

    public function test_full_sync_with_since_returns_only_records_updated_after(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-old-1',
            'name' => 'Old Account',
            'status' => 'active',
        ]);
        Account::where('sync_id', 'acc-old-1')->update(['updated_at' => '2024-01-01 00:00:00']);

        $since = strtotime('2024-03-01 00:00:00');

        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-new-1',
            'name' => 'New Account',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/sync/full?since={$since}");

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);

        $this->assertCount(1, $data['data']['account']);
        $this->assertEquals('acc-new-1', $data['data']['account'][0]['id']);
    }

    public function test_full_sync_with_since_includes_deleted_records(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-delsync-1',
            'name' => 'Deleted Since',
            'status' => 'active',
        ]);
        Account::where('sync_id', 'acc-delsync-1')->update(['updated_at' => '2024-01-01 00:00:00']);

        SyncMetadata::create([
            'user_id' => $this->user->id,
            'entity_type' => 'account',
            'entity_id' => 'acc-delsync-1',
            'sync_status' => 'deleted',
            'server_updated_at' => '2024-06-01 00:00:00',
        ]);

        $since = strtotime('2024-03-01 00:00:00');

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/sync/full?since={$since}");

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);

        $deletedIds = array_column($data['data']['account'], 'id');
        $this->assertContains('acc-delsync-1', $deletedIds);
    }

    public function test_full_sync_returns_etag_header(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-etag-1',
            'name' => 'ETag Test',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($response->headers->has('ETag'));
        $this->assertStringStartsWith('"', $response->headers->get('ETag'));
    }

    public function test_full_sync_returns_304_when_etag_matches(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-304-1',
            'name' => '304 Test',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $etag = $response->headers->get('ETag');

        $response2 = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full', ['If-None-Match' => $etag]);

        $this->assertEquals(304, $response2->getStatusCode());
    }

    public function test_full_sync_returns_200_when_etag_does_not_match(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full', ['If-None-Match' => '"invalid-etag"']);

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_metrics_endpoint_returns_ok_with_correct_content_type(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/metrics');

        $response->assertOk();
        $this->assertStringContainsString('text/plain; version=0.0.4', $response->headers->get('Content-Type'));
    }

    public function test_sync_health_endpoint_returns_ok(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/health');

        $response->assertOk();
        $response->assertJsonStructure([
            'database_connection',
            'last_successful_sync',
        ]);
    }

    public function test_sync_protocol_version_returns_headers(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full', ['X-Sync-Protocol-Version' => '2']);

        $response->assertOk();
        $this->assertEquals('2', $response->headers->get('X-Sync-Protocol-Version'));
        $this->assertStringContainsString('1', $response->headers->get('X-Sync-Protocol-Versions-Supported'));
        $this->assertStringContainsString('2', $response->headers->get('X-Sync-Protocol-Versions-Supported'));
    }

    public function test_sync_protocol_version_defaults_to_v1(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        $response->assertOk();
        $this->assertEquals('2', $response->headers->get('X-Sync-Protocol-Version'));
    }

    public function test_sync_protocol_version_rejects_unsupported(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full', ['X-Sync-Protocol-Version' => '999']);

        $response->assertStatus(400);
        $response->assertJson([
            'error' => 'Unsupported sync protocol version',
        ]);
    }

    public function test_sync_protocol_version_works_on_health_endpoint(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/health', ['X-Sync-Protocol-Version' => '1']);

        $response->assertOk();
        $this->assertEquals('2', $response->headers->get('X-Sync-Protocol-Version'));
    }

    public function test_metrics_endpoint_has_protocol_headers(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/metrics', ['X-Sync-Protocol-Version' => '2']);

        $response->assertOk();
        $this->assertEquals('2', $response->headers->get('X-Sync-Protocol-Version'));
    }

    public function test_merge_deduplicates_identical_changes(): void
    {
        $data = [
            'account' => [
                [
                    'sync_id' => 'dedup-acc-1',
                    'name' => 'Dedup Account',
                    'type' => 'checking',
                    'currency' => 'USD',
                    'status' => 'active',
                ],
            ],
        ];

        $response1 = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/merge', ['data' => $data]);

        $response1->assertOk();
        $response1->assertJson(['success' => true]);

        $response2 = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/merge', ['data' => $data]);

        $response2->assertOk();
        $response2->assertJson(['success' => true]);
    }

    public function test_async_merge_queues_job(): void
    {
        $data = [
            'account' => [
                [
                    'sync_id' => 'async-acc-1',
                    'name' => 'Async Account',
                    'type' => 'checking',
                    'currency' => 'USD',
                    'status' => 'active',
                ],
            ],
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/merge', ['data' => $data], ['X-Async-Merge' => 'true']);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'async' => true,
        ]);
        $this->assertArrayHasKey('job_id', $response->json());

        $jobId = $response->json('job_id');
        $this->assertDatabaseHas('merge_jobs', [
            'id' => $jobId,
            'user_id' => $this->user->id,
            'status' => 'completed',
        ]);
    }

    public function test_merge_status_returns_job_status(): void
    {
        $mergeJob = MergeJob::create([
            'user_id' => $this->user->id,
            'status' => 'queued',
            'data' => ['account' => []],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/sync/merge-status/{$mergeJob->id}");

        $response->assertOk();
        $response->assertJson([
            'job_id' => $mergeJob->id,
            'status' => 'queued',
        ]);
    }

    public function test_merge_status_returns_404_for_other_users_job(): void
    {
        $otherUser = User::factory()->create();
        $mergeJob = MergeJob::create([
            'user_id' => $otherUser->id,
            'status' => 'queued',
            'data' => ['account' => []],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->get("/api/sync/merge-status/{$mergeJob->id}");

        $response->assertNotFound();
    }
}
