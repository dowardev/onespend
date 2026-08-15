<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Account;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncControllerGetChangesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function getChanges(string $lastSync = '0', ?string $cursor = null, int $limit = 200, ?array $types = null): array
    {
        $params = ['last_sync' => $lastSync, 'limit' => (string) $limit];
        if ($cursor !== null) {
            $params['cursor'] = $cursor;
        }
        if ($types !== null) {
            $params['types'] = $types;
        }

        $response = $this->actingAs($this->user, 'web')
            ->get('/api/sync/changes?'.http_build_query($params));

        $this->assertEquals(200, $response->getStatusCode());
        $content = $response->getContent();
        $this->assertNotEmpty($content);

        $data = json_decode($content, true);
        $this->assertIsArray($data);

        return $data;
    }

    public function test_returns_changes_since_last_sync(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-changed-1',
            'name' => 'Changed Account',
            'status' => 'active',
        ]);

        $data = $this->getChanges('0');

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('changes', $data);
        $this->assertArrayHasKey('account', $data['changes']);
        $this->assertCount(1, $data['changes']['account']);
        $this->assertEquals('acc-changed-1', $data['changes']['account'][0]['id']);
        $this->assertArrayHasKey('cursor', $data);
        $this->assertArrayHasKey('has_more', $data);
        $this->assertArrayHasKey('serverTime', $data);
    }

    public function test_returns_empty_changes_when_no_new_records(): void
    {
        $serverTime = $this->getChanges('0')['serverTime'];

        $data = $this->getChanges((string) $serverTime);

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('changes', $data);
        foreach ($data['changes'] as $type => $items) {
            $this->assertIsArray($items);
        }
    }

    public function test_cursor_pagination_across_entity_types(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-cursor-1',
            'name' => 'Cursor Account',
            'status' => 'active',
        ]);

        $data = $this->getChanges('0', null, 1);

        $this->assertTrue($data['success']);
        $this->assertCount(1, $data['changes']['account']);

        if ($data['has_more']) {
            $data2 = $this->getChanges('0', $data['cursor'], 1);
            $this->assertTrue($data2['success']);
            $this->assertIsArray($data2['changes']);
        }
    }

    public function test_invalid_cursor_returns_error(): void
    {
        $response = $this->actingAs($this->user, 'web')
            ->get('/api/sync/changes?last_sync=0&cursor=invalid');

        $this->assertEquals(400, $response->getStatusCode());
        $content = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $content);
    }

    public function test_returns_only_requested_entity_types(): void
    {
        Account::create([
            'user_id' => $this->user->id,
            'sync_id' => 'acc-filter-1',
            'name' => 'Filtered Account',
            'status' => 'active',
        ]);
        Supplier::create([
            'user_id' => $this->user->id,
            'sync_id' => 'sup-filter-1',
            'name' => 'Filtered Supplier',
            'status' => 'active',
        ]);

        $data = $this->getChanges('0', null, 200, ['account']);

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('account', $data['changes']);
        $this->assertCount(1, $data['changes']['account']);
        $this->assertArrayNotHasKey('supplier', $data['changes']);
    }
}
