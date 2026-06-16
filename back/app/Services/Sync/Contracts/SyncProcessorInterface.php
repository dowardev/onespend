<?php

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
    /** @return array{conflicts: array, existingMap: \Illuminate\Support\Collection} */
    public function detectConflicts(array $items, int $userId): array;
    public function getModelClass(): string;
}
