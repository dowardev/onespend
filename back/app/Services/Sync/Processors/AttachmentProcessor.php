<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Processors;

use App\Models\Attachment;
use Illuminate\Support\Facades\Log;

class AttachmentProcessor extends AbstractEntityProcessor
{
    protected function getModel(): string
    {
        return Attachment::class;
    }

    protected function getEntityName(): string
    {
        return 'attachment';
    }

    /**
     * LBDS-280: when the queue reaches an attachment delete, the file should
     * come off disk (otherwise we leak storage on every drain). The base
     * AbstractEntityProcessor only soft-deletes the row and updates the
     * sync metadata; postprocessDelete runs after the soft-delete commit so
     * the path can still be read for storage ops.
     */
    protected function postprocessDelete(array $deleted, int $userId): void
    {
        if (empty($deleted)) {
            return;
        }

        $syncIds = array_map(fn ($row) => $row['sync_id'] ?? null, $deleted);
        $syncIds = array_filter($syncIds);

        if (empty($syncIds)) {
            return;
        }

        $attachments = Attachment::forUser($userId)
            ->whereIn('sync_id', $syncIds)
            ->withTrashed()
            ->get();

        foreach ($attachments as $attachment) {
            try {
                $attachment->deleteFile();
            } catch (\Exception $e) {
                // Storage cleanup is best-effort. The row is already
                // tombstoned by the parent processor; leaving an orphan
                // file on disk does not break subsequent sync cycles.
                Log::warning('AttachmentProcessor: deleteFile failed', [
                    'sync_id' => $attachment->sync_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function preprocessData(array $item, int $userId): array
    {
        // Attachment payloads can carry either budget_entry_sync_id or
        // budget_provider_sync_id depending on the parent. Foreign keys
        // (numeric DB ids) are not used by the sync queue: the client
        // sends the parent's sync_id directly. We only normalise the
        // camelCase variants when they show up in pull responses.
        if (isset($item['entitySyncId'])) {
            $entityType = $item['entityType'] ?? null;
            if ($entityType === Attachment::ENTITY_TYPE_PROVIDERS && ! isset($item['budget_provider_sync_id'])) {
                $item['budget_provider_sync_id'] = $item['entitySyncId'];
            } elseif ($entityType === Attachment::ENTITY_TYPE_ENTRIES && ! isset($item['budget_entry_sync_id'])) {
                $item['budget_entry_sync_id'] = $item['entitySyncId'];
            }
            unset($item['entitySyncId'], $item['entityType']);
        }

        return $item;
    }
}
