<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\Contracts;

use Illuminate\Support\Collection;

interface SyncProcessorInterface
{
    public function canProcess(string $entityType): bool;

    public function getEntityType(): string;

    public function create(array $items, int $userId): array;

    public function update(array $items, int $userId, array|Collection $existingMap = []): array;

    public function delete(array $syncIds, int $userId): array;

    public function validate(array $item, bool $isUpdate = false): array;

    /** @return array{conflicts: array, existingMap: Collection} */
    public function detectConflicts(array $items, int $userId): array;

    public function getModelClass(): string;

    public function getCachedFillable(): array;

    public function preprocessData(array $item, int $userId): array;

    public function filterToFillableFromCache(array $data, array $fillable): array;
}
