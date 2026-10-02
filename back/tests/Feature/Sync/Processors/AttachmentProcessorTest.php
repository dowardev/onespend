<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace Tests\Feature\Sync\Processors;

use App\Models\Attachment;
use App\Models\User;
use App\Services\Sync\Processors\AttachmentProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentProcessorTest extends TestCase
{
    use RefreshDatabase;

    private AttachmentProcessor $processor;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->processor = app(AttachmentProcessor::class);
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

    public function test_delete_tombstones_the_attachment(): void
    {
        $a = $this->makeAttachment('att-1', 'attachments/'.$this->user->id.'/entries/att-1.bin');

        $result = $this->processor->delete(['att-1'], $this->user->id);

        $this->assertSame(['att-1'], $result);

        $row = Attachment::withTrashed()->where('sync_id', 'att-1')->first();
        $this->assertNotNull($row);
        $this->assertNotNull($row->deleted_at);
        // Attachment has no `status` column, so the parent impl skips that
        // half of the update; that is expected and matches the schema.
        $this->assertNull($row->status);
    }

    public function test_delete_removes_the_file_from_storage(): void
    {
        $path = 'attachments/'.$this->user->id.'/entries/att-2.bin';
        $a = $this->makeAttachment('att-2', $path);

        $this->assertTrue(Storage::disk('local')->exists($path));

        $this->processor->delete(['att-2'], $this->user->id);

        $this->assertFalse(
            Storage::disk('local')->exists($path),
            'postprocessDelete must drop the file from storage so the tombstone does not leak disk space.',
        );
    }

    public function test_delete_ignores_unknown_sync_ids(): void
    {
        // No attachment row for this id; the processor still calls
        // bulkUpdateSyncMetadata with the existing list, which is empty here.
        $result = $this->processor->delete(['does-not-exist'], $this->user->id);

        $this->assertSame([], $result);
    }

    public function test_delete_only_targets_callers_user(): void
    {
        $other = User::factory()->create();
        $pathOther = 'attachments/'.$other->id.'/entries/att-other.bin';
        Storage::disk('local')->put($pathOther, 'x');
        Attachment::create([
            'user_id' => $other->id,
            'sync_id' => 'att-other',
            'entity_type' => Attachment::ENTITY_TYPE_ENTRIES,
            'name' => 'att-other.bin',
            'path' => $pathOther,
            'mime_type' => 'application/octet-stream',
            'size' => 1,
            'budget_entry_sync_id' => null,
        ]);

        // First user asks to delete att-other — should be a no-op.
        $result = $this->processor->delete(['att-other'], $this->user->id);

        $this->assertSame([], $result);
        $this->assertTrue(Storage::disk('local')->exists($pathOther));
        $row = Attachment::where('sync_id', 'att-other')->first();
        $this->assertNull($row->deleted_at);
    }
}
