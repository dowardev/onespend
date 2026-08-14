<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Services\Sync\DTOs;

class SyncOperationResult
{
    public function __construct(
        public readonly string $entityType,
        public array $created = [],
        public array $updated = [],
        public array $deleted = [],
        public array $conflicts = [],
        public array $errors = [],
    ) {}

    public function toArray(): array
    {
        return [
            'created' => $this->created,
            'updated' => $this->updated,
            'deleted' => $this->deleted,
            'conflicts' => $this->conflicts,
            'errors' => $this->errors,
        ];
    }

    public function isSuccessful(): bool
    {
        return empty($this->errors) && empty($this->conflicts);
    }

    public function hasConflicts(): bool
    {
        return ! empty($this->conflicts);
    }
}
