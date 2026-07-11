<?php

namespace App\Services\Sync;

use App\Services\SyncIdResolver;
use Illuminate\Support\Str;

class ForeignKeyResolver
{
    private const FK_FIELDS = [
        'budget_entry' => [
            ['field' => 'account_id', 'target' => 'account'],
            ['field' => 'groups.*.account_id', 'target' => 'account'],
        ],
        'budget_provider' => [
            ['field' => 'account_id', 'target' => 'account'],
            ['field' => '_supplier_id', 'target' => 'supplier'],
            ['field' => 'products.*.supplier_product_id', 'target' => 'supplier_product'],
        ],
        'budget_provider_product' => [
            ['field' => 'supplier_product_id', 'target' => 'supplier_product'],
        ],
        'recurring_record' => [
            ['field' => 'account_id', 'target' => 'account'],
            ['field' => 'products.*.supplier_product_id', 'target' => 'supplier_product'],
        ],
        'recurring_record_product' => [
            ['field' => 'recurring_record_id', 'target' => 'recurring_record'],
            ['field' => 'supplier_product_id', 'target' => 'supplier_product'],
        ],
    ];

    public function __construct(
        private SyncIdResolver $idResolver,
    ) {}

    public function resolveItem(array $item, string $entityType, int $userId): array
    {
        $fks = self::FK_FIELDS[$entityType] ?? [];

        foreach ($fks as $fk) {
            $field = $fk['field'];
            $target = $fk['target'];

            if (str_contains($field, '.*.')) {
                $item = $this->resolveNestedField($item, $field, $target, $userId);
            } else {
                $item = $this->resolveScalarField($item, $field, $target, $userId);
            }
        }

        return $item;
    }

    public function warmCache(string $entityType, array $allEntityData, int $userId): void
    {
        $items = $allEntityData[$entityType] ?? [];
        $fks = self::FK_FIELDS[$entityType] ?? [];

        $idsByTarget = [];

        foreach ($items as $item) {
            foreach ($fks as $fk) {
                $field = $fk['field'];
                $target = $fk['target'];
                $values = $this->extractValues($item, $field);

                foreach ($values as $value) {
                    if (is_string($value) && !is_numeric($value)) {
                        $idsByTarget[$target][] = $value;
                    }
                }
            }
        }

        foreach ($idsByTarget as $targetEntity => $ids) {
            $ids = array_values(array_unique(array_filter($ids)));
            if (!empty($ids)) {
                $this->idResolver->resolveBatch($targetEntity, $ids, $userId);
            }
        }
    }

    private function resolveScalarField(array $item, string $snakeField, string $targetEntity, int $userId): array
    {
        $camelField = Str::camel($snakeField);
        $value = $item[$snakeField] ?? $item[$camelField] ?? null;

        if ($value !== null) {
            $resolved = $this->idResolver->resolveToInt($value, $targetEntity, $userId);
            if ($resolved !== null) {
                $item[$snakeField] = $resolved;
            } elseif (is_string($value) && !is_numeric($value)) {
                $item[$snakeField] = null;
            }
            unset($item[$camelField]);
        }

        return $item;
    }

    private function resolveNestedField(array $item, string $fieldPattern, string $targetEntity, int $userId): array
    {
        $parts = explode('.*.', $fieldPattern, 2);
        $arrayField = $parts[0];
        $nestedField = $parts[1];

        $camelArrayField = Str::camel($arrayField);
        $arrayKey = isset($item[$arrayField]) ? $arrayField : (isset($item[$camelArrayField]) ? $camelArrayField : null);

        if ($arrayKey === null || !is_array($item[$arrayKey])) {
            return $item;
        }

        $nestedCamel = Str::camel($nestedField);

        foreach ($item[$arrayKey] as $k => $nested) {
            $value = $nested[$nestedField] ?? $nested[$nestedCamel] ?? null;
            if ($value !== null) {
                $resolved = $this->idResolver->resolveToInt($value, $targetEntity, $userId);
                if ($resolved !== null) {
                    $item[$arrayKey][$k][$nestedField] = $resolved;
                }
                unset($item[$arrayKey][$k][$nestedCamel]);
            }
        }

        return $item;
    }

    private function extractValues(array $item, string $fieldPattern): array
    {
        if (str_contains($fieldPattern, '.*.')) {
            $parts = explode('.*.', $fieldPattern, 2);
            $arrayField = $parts[0];
            $nestedField = $parts[1];

            $camelArrayField = Str::camel($arrayField);
            $arr = $item[$arrayField] ?? $item[$camelArrayField] ?? [];
            if (!is_array($arr)) {
                return [];
            }

            $nestedCamel = Str::camel($nestedField);
            $values = [];
            foreach ($arr as $nested) {
                $v = $nested[$nestedField] ?? $nested[$nestedCamel] ?? null;
                if ($v !== null) {
                    $values[] = $v;
                }
            }
            return $values;
        }

        $camelField = Str::camel($fieldPattern);
        $value = $item[$fieldPattern] ?? $item[$camelField] ?? null;
        return $value !== null ? [$value] : [];
    }
}
