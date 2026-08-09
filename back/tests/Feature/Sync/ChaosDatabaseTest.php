<?php

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ChaosDatabaseTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_full_sync_handles_database_exceptions_gracefully(): void
    {
        // Create some test data first
        for ($i = 0; $i < 3; $i++) {
            Account::create([
                'user_id' => $this->user->id,
                'sync_id' => 'db-test-'.$i,
                'name' => 'DB Test Account '.$i,
                'status' => 'active',
            ]);
        }

        // Simulate database exception by throwing exceptions on DB operations
        $this->mockDatabaseConnectionFailure();

        // Attempt sync - should handle exceptions gracefully (not crash with 500)
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/full');

        // Should not crash with unhandled exception
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error when database throws exceptions - should handle gracefully');

        // Restore normal database behavior
        $this->restoreDatabaseConnection();
    }

    public function test_get_changes_handles_database_exceptions_gracefully(): void
    {
        // Create some test data first
        for ($i = 0; $i < 3; $i++) {
            Account::create([
                'user_id' => $this->user->id,
                'sync_id' => 'changes-db-test-'.$i,
                'name' => 'Changes DB Test Account '.$i,
                'status' => 'active',
            ]);
        }

        // Simulate database exception
        $this->mockDatabaseConnectionFailure();

        // Attempt getChanges - should handle exceptions gracefully
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/sync/changes?last_sync=0');

        // Should not crash with unhandled exception
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error in getChanges when database throws exceptions - should handle gracefully');

        // Restore normal database behavior
        $this->restoreDatabaseConnection();
    }

    public function test_merge_handles_database_exceptions_gracefully(): void
    {
        // Create some test data first
        $account = Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'merge-test-account',
            'name' => 'Merge Test Account',
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

        // Simulate database exception
        $this->mockDatabaseConnectionFailure();

        // Attempt merge - should handle exceptions gracefully
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/sync/merge', ['data' => $mergeData]);

        // Should not crash with unhandled exception
        $this->assertNotEquals(500, $response->getStatusCode(),
            'Server error in merge when database throws exceptions - should handle gracefully');

        // Restore normal database behavior
        $this->restoreDatabaseConnection();
    }

    protected function mockDatabaseConnectionFailure(): void
    {
        // Disconnect database to simulate connection failure
        // This will cause subsequent DB operations to throw exceptions
        DB::disconnect();
    }

    protected function restoreDatabaseConnection(): void
    {
        // Note: In actual usage, Laravel would reconnect automatically
        // But in the context of a single test with RefreshDatabase,
        // the test will end soon anyway and get a fresh database state
        // This method exists for interface completeness
    }
}
