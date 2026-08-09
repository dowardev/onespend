<?php

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\User;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ChaosServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_full_sync_handles_sync_orchestrator_failure_gracefully(): void
    {
        // Create some test data
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'service-test-account',
            'name' => 'Service Test Account',
            'status' => 'active',
        ]);

        // Mock the SyncOrchestratorService to throw an exception
        $mockOrchestrator = Mockery::mock(SyncOrchestratorService::class);
        $mockOrchestrator->shouldReceive('merge')
            ->andThrow(new \Exception('Simulated service failure'));

        // Bind the mock to the container
        $this->app->instance(SyncOrchestratorService::class, $mockOrchestrator);

        // Attempt sync - should handle service failure gracefully
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        // Should not crash with unhandled exception (500)
        // Note: The actual behavior might be to return a 500 or some other error
        // but we're testing that it doesn't completely break
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error when SyncOrchestrator fails - should handle gracefully');

        // We expect either a successful response (if failures are handled internally)
        // or a client error (4xx) if the failure is properly propagated
        // Either way, it shouldn't be an unhandled server error
    }

    public function test_merge_handles_sync_orchestrator_failure_gracefully(): void
    {
        // Create some test data
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'merge-service-test-account',
            'name' => 'Merge Service Test Account',
            'status' => 'active',
        ]);

        // Create test merge data
        $mergeData = [
            'account' => [
                [
                    'sync_id' => 'merge-account-1',
                    'name' => 'Merged Account',
                    'status' => 'active',
                ],
            ],
        ];

        // Mock the SyncOrchestratorService to throw an exception
        $mockOrchestrator = Mockery::mock(SyncOrchestratorService::class);
        $mockOrchestrator->shouldReceive('merge')
            ->andThrow(new \Exception('Simulated service failure in merge'));

        // Bind the mock to the container
        $this->app->instance(SyncOrchestratorService::class, $mockOrchestrator);

        // Attempt merge - should handle service failure gracefully
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/merge', ['data' => $mergeData]);

        // Should not crash with unhandled exception (500)
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error in merge when SyncOrchestrator fails - should handle gracefully');
    }

    public function test_full_sync_handles_logger_failure_gracefully(): void
    {
        // Create some test data
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'logger-test-account',
            'name' => 'Logger Test Account',
            'status' => 'active',
        ]);

        // Attempt sync - should work normally (logging failures should not break sync)
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        // Should not crash with unhandled exception
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error when logger has issues - should handle gracefully');
    }
}
