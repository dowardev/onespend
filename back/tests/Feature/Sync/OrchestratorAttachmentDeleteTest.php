<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync;

use App\Models\Attachment;
use App\Models\SyncMetadata;
use App\Models\User;
use App\Services\Sync\SyncOrchestratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * LBDS-280 integration test: end-to-end of the merge controller path.
 *
 * AttachmentProcessorTest covers the processor in isolation; this test
 * wires the same payload through SyncOrchestratorService::merge so we
 * catch any regression in the entityOrder, the registry, or the merge
 * dispatcher that the unit-level test cannot reach.
 */
class OrchestratorAttachmentDeleteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->user = User::factory()->create();
    }

    private function makeAttachment(string $syncId, string $path): Attachment
    {
        Storage::disk('local')->put($path, 'fake-binary-content');

        return Attachment::create([
            'user_id' => $this->user->id,
            'sync_id' => $syncId,
            'entity_type' => Attachment::ENTITY_TYPE_ENTRIES,
            'name' => $syncId.'.bin',
            'path' => $path,
            'mime_type' => 'application/octet-stream',
            'size' => 19,
            'budget_entry_sync_id' => null,
        ]);
    }

    public function test_orchestrator_routes_attachment_delete_through_processor(): void
    {
        $path = 'attachments/'.$this->user->id.'/entries/att-1.bin';
        $this->makeAttachment('att-1', $path);

        $orch = app(SyncOrchestratorService::class);
        $result = $orch->merge([
            'attachment' => [
                ['id' => 'att-1', '_deleted' => true, 'updated_at' => time() * 1000],
            ],
        ], $this->user->id);

        // Orchestrator returns the tombstoned sync_id under the entity bucket.
        $this->assertSame(['attachment' => ['att-1']], $result['deleted']);
        $this->assertSame([], $result['errors']);

        // File is gone from storage (postprocessDelete ran).
        $this->assertFalse(
            Storage::disk('local')->exists($path),
            'AttachmentProcessor::postprocessDelete must drop the file from storage',
        );

        // Row is soft-deleted.
        $row = Attachment::withTrashed()->where('sync_id', 'att-1')->first();
        $this->assertNotNull($row);
        $this->assertNotNull($row->deleted_at);

        // SyncMetadata marks it deleted.
        $meta = SyncMetadata::where('entity_type', 'attachment')
            ->where('entity_id', 'att-1')
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($meta, 'SyncMetadata row should exist for the tombstoned attachment');
        $this->assertSame('deleted', $meta->sync_status);
    }

    public function test_orchestrator_handles_unknown_attachment_sync_id_silently(): void
    {
        // No row for this sync_id; the orchestrator should not error out and
        // should report zero deletes (no rows were matched).
        $orch = app(SyncOrchestratorService::class);
        $result = $orch->merge([
            'attachment' => [
                ['id' => 'does-not-exist', '_deleted' => true, 'updated_at' => time() * 1000],
            ],
        ], $this->user->id);

        $this->assertSame([], $result['deleted']);
        $this->assertSame([], $result['errors']);
    }

    public function test_orchestrator_handles_attachment_alongside_other_entities_in_same_drain(): void
    {
        // The entityOrder is set so attachment is processed BEFORE budget_entry
        // (so an entry delete in the same drain never races an attachment delete).
        // We do not reach into the private entityOrder; instead, we exercise
        // the realistic payload shape (attachment + budget_entry in the same
        // merge) and assert both buckets are honoured.
        $attPath = 'attachments/'.$this->user->id.'/entries/att-multi.bin';
        $this->makeAttachment('att-multi', $attPath);

        $orch = app(SyncOrchestratorService::class);
        $result = $orch->merge([
            'attachment' => [
                ['id' => 'att-multi', '_deleted' => true, 'updated_at' => time() * 1000],
            ],
            'budget_entry' => [
                ['id' => 'be-does-not-exist', '_deleted' => true, 'updated_at' => time() * 1000],
            ],
        ], $this->user->id);

        $this->assertSame(['attachment' => ['att-multi']], $result['deleted']);
        $this->assertSame([], $result['errors']);
        $this->assertFalse(Storage::disk('local')->exists($attPath));
    }
}