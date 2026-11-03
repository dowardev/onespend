<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Controllers;

use App\Http\Requests\StoreAccountRequest;
use App\Http\Requests\StoreBudgetEntryRequest;
use App\Http\Requests\StoreBudgetProviderProductRequest;
use App\Http\Requests\StoreBudgetProviderRequest;
use App\Http\Requests\StoreRecurringRecordProductRequest;
use App\Http\Requests\StoreRecurringRecordRequest;
use App\Http\Requests\StoreSupplierProductRequest;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\Sync\SyncMergeRequest;
use App\Http\Requests\Sync\SyncResolveConflictRequest;
use App\Http\Requests\Sync\SyncResolveConflictsBatchRequest;
use App\Jobs\SyncMergeJob;
use App\Metrics\SyncMetrics;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\BudgetEntry;
use App\Models\BudgetEntryGroup;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\MergeJob;
use App\Models\RecurringRecord;
use App\Models\RecurringRecordProduct;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\SyncMetadata;
use App\Repositories\SyncMetadataRepository;
use App\Services\Sync\ForeignKeyResolver;
use App\Services\Sync\Processors\AbstractEntityProcessor;
use App\Services\Sync\SyncOrchestratorService;
use App\Services\SyncIdResolver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class SyncController extends Controller
{
    public const ENTITY_TYPES = [
        'account' => Account::class,
        'budget_provider' => BudgetProvider::class,
        'budget_provider_product' => BudgetProviderProduct::class,
        'budget_entry' => BudgetEntry::class,
        'supplier' => Supplier::class,
        'supplier_product' => SupplierProduct::class,
        'recurring_record' => RecurringRecord::class,
        'recurring_record_product' => RecurringRecordProduct::class,
        // LBDS-280: routes attachment deletes through the same queue as the
        // rest of the entities. The orchestrator already iterates an
        // explicit entityOrder; attachment is inserted BEFORE budget_entry
        // so an entry delete in the same drain cycle does not race the
        // attachment tombstone.
        'attachment' => Attachment::class,
    ];

    public const ENTITY_REQUEST_TYPES = [
        'account' => StoreAccountRequest::class,
        'budget_provider' => StoreBudgetProviderRequest::class,
        'budget_provider_product' => StoreBudgetProviderProductRequest::class,
        'budget_entry' => StoreBudgetEntryRequest::class,
        'supplier' => StoreSupplierRequest::class,
        'supplier_product' => StoreSupplierProductRequest::class,
        'recurring_record' => StoreRecurringRecordRequest::class,
        'recurring_record_product' => StoreRecurringRecordProductRequest::class,
        // LBDS-280: no FormRequest wired because attachments only travel
        // through the queue as deletes (sync_id only); create/update still
        // goes through AttachmentController for the binary upload. The
        // validator's fallback logs a warning otherwise.
    ];

    private SyncOrchestratorService $orchestrator;

    private SyncMetrics $metrics;

    public function __construct(SyncOrchestratorService $orchestrator, SyncMetrics $metrics)
    {
        $this->orchestrator = $orchestrator;
        $this->metrics = $metrics;
    }

    private function recordSyncMetrics(string $method, float $startTime, ?string $errorType = null): void
    {
        $duration = (microtime(true) - $startTime) * 1000;
        $this->metrics->increment("sync_{$method}_total");
        $this->metrics->recordHistogram("sync_{$method}_duration_ms", $duration);
        if ($errorType !== null) {
            $this->metrics->increment('sync_errors_total', ['method' => $method, 'error_type' => $errorType]);
        }
    }

    public function getChanges(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        $user = $request->user();
        $userId = $user->id;
        $lastSync = $request->input('last_sync', 0);
        $limit = min(max((int) $request->input('limit', 200), 1), 1000);
        $cursorParam = $request->input('cursor');
        $entityTypes = $request->input('types', array_keys(self::ENTITY_TYPES));

        $parseResult = $this->parseCursor($cursorParam);
        if ($parseResult === false) {
            $this->recordSyncMetrics('getChanges', $startTime, 'invalid_cursor');

            return response()->json(['error' => 'Invalid cursor format'], 400);
        }
        $cursor = $parseResult;
        $startType = $cursor !== null ? ($cursor[0] ?? 0) : 0;
        $startUpdatedAt = $cursor !== null ? ($cursor[1] ?? null) : null;
        $startSyncId = $cursor !== null ? ($cursor[2] ?? null) : null;

        $lastSyncDateTime = $lastSync > 0
            ? date('Y-m-d H:i:s', AbstractEntityProcessor::normalizeTimestamp($lastSync))
            : null; // null = trae todos los cambios sin filtro de fecha

        $requestedEntityTypes = array_intersect($entityTypes, array_keys(self::ENTITY_TYPES));
        $typeIndexMap = array_flip($requestedEntityTypes);

        $changes = [];
        $totalCount = 0;
        $nextTypeIdx = $startType;
        $nextUpdatedAt = $startUpdatedAt;
        $nextSyncId = $startSyncId;
        $hasMore = false;

        // Single UNION query for all entity types
        if ($startType < count($entityTypes)) {
            $unionResults = $this->fetchChangedSyncIdsUnion(
                $entityTypes,
                $userId,
                $lastSyncDateTime,
                $startType,
                $startUpdatedAt,
                $startSyncId,
                $limit
            );

            foreach ($unionResults as $row) {
                $entityType = $row->entity_type;
                $syncId = $row->sync_id;
                $updatedAt = $row->updated_at;

                if (! isset($changes[$entityType])) {
                    $changes[$entityType] = [];
                }
                $changes[$entityType][] = ['sync_id' => $row->sync_id, 'updated_at' => $updatedAt];
            }

            $lastRow = end($unionResults);
            if ($lastRow) {
                $nextUpdatedAt = $lastRow->updated_at;
                $nextSyncId = $lastRow->sync_id;
                $nextTypeIdx = $typeIndexMap[$lastRow->entity_type] ?? $startType;
            }

            $hasMore = count($unionResults) >= $limit;
        } else {
            $hasMore = false;
        }

        // Fetch full items for each entity type
        $finalChanges = [];
        foreach ($changes as $entityType => $syncIds) {
            $syncIdArray = array_column($changes[$entityType], 'sync_id');
            $items = $this->hydrateChangedItems($entityType, array_column($changes[$entityType], 'sync_id'));
            $finalChanges[$entityType] = $this->formatChangedItems($entityType, $items, $userId);
        }

        // Handle deleted records for exhausted entity types
        // When we've processed all entity types but still need more records to reach limit
        while ($totalCount < $limit && $nextTypeIdx < count($requestedEntityTypes) && ! $hasMore) {
            $entityType = $requestedEntityTypes[$nextTypeIdx];
            $syncIds = $this->fetchChangedSyncIds($entityType, $userId, $lastSyncDateTime, $nextTypeIdx, $startType, $startUpdatedAt, $startSyncId, $limit - $totalCount);

            if (empty($syncIds)) {
                $recordsExhausted = true;
            } else {
                $items = $this->hydrateChangedItems($entityType, $syncIds);
                $finalChanges[$entityType] = $this->formatChangedItems($entityType, $items, $userId);
                $totalCount += count($finalChanges[$entityType]);

                $lastItem = $items->last();
                $nextUpdatedAt = $lastItem->updated_at->toDateTimeString();
                $nextSyncId = $lastItem->sync_id;

                $recordsExhausted = count($items) < ($limit - $totalCount + count($items));
            }

            if ($recordsExhausted) {
                $deletedQuery = SyncMetadata::forUser($userId)
                    ->byEntityType($entityType)
                    ->where('sync_status', 'deleted');
                if ($lastSyncDateTime !== null) {
                    $deletedQuery->where('server_updated_at', '>', $lastSyncDateTime);
                }
                $deletedIds = $deletedQuery->pluck('entity_id');

                foreach ($deletedIds as $deletedId) {
                    if (! isset($finalChanges[$entityType])) {
                        $finalChanges[$entityType] = [];
                    }
                    $finalChanges[$entityType][] = ['id' => $deletedId, '_deleted' => true];
                    $totalCount++;
                }

                $nextTypeIdx++;
                $nextUpdatedAt = null;
                $nextSyncId = null;
            } else {
                $hasMore = true;
                break;
            }
        }

        $nextCursor = $this->buildCursor($hasMore ? [$nextTypeIdx, $nextUpdatedAt, $nextSyncId] : null);

        $this->recordSyncMetrics('getChanges', $startTime);

        return response()->json([
            'success' => true,
            'changes' => $finalChanges,
            'cursor' => $nextCursor,
            'has_more' => $hasMore,
            'serverTime' => now()->timestamp,
        ]);
    }

    private function parseCursor(?string $cursorParam): array|null|false
    {
        if ($cursorParam === null || $cursorParam === '') {
            return null;
        }

        $parts = explode('.', $cursorParam);
        if (count($parts) !== 2) {
            return false;
        }

        [$cursorData, $hmac] = $parts;
        $expectedHmac = hash_hmac('sha256', $cursorData, config('app.key'));
        if (! hash_equals($expectedHmac, $hmac)) {
            return false;
        }

        $decoded = base64_decode($cursorData, true);
        if ($decoded === false) {
            return false;
        }

        $parsed = json_decode($decoded, true);
        if (! is_array($parsed) || count($parsed) !== 3) {
            return false;
        }
        if (! is_int($parsed[0])) {
            return false;
        }
        if (! (is_null($parsed[1]) || is_string($parsed[1]))) {
            return false;
        }
        if (! (is_null($parsed[2]) || is_string($parsed[2]))) {
            return false;
        }

        return $parsed;
    }

    private function buildCursor(?array $cursorData): ?string
    {
        if ($cursorData === null) {
            return null;
        }

        $encoded = base64_encode(json_encode($cursorData));

        return $encoded.'.'.hash_hmac('sha256', $encoded, config('app.key'));
    }

    private function fetchChangedSyncIds(
        string $entityType,
        int $userId,
        ?string $lastSyncDateTime,
        int $currentTypeIdx,
        int $startType,
        ?string $startUpdatedAt,
        ?string $startSyncId,
        int $remaining,
    ): array {
        $modelClass = self::ENTITY_TYPES[$entityType];
        $query = $modelClass::forUser($userId)
            ->select(['sync_id', 'updated_at']);

        if ($currentTypeIdx === $startType && $startUpdatedAt !== null) {
            $query->where(function ($q) use ($startUpdatedAt, $startSyncId) {
                $q->where('updated_at', '>', $startUpdatedAt)
                    ->orWhere(function ($q2) use ($startUpdatedAt, $startSyncId) {
                        $q2->where('updated_at', '=', $startUpdatedAt)
                            ->where('sync_id', '>', $startSyncId);
                    });
            });
        } elseif ($lastSyncDateTime !== null) {
            $query->where('updated_at', '>=', $lastSyncDateTime);
        }
        // Si $lastSyncDateTime es null, no se aplica filtro de fecha (trae todos)

        return $query->orderBy('updated_at')->orderBy('sync_id')
            ->limit($remaining)
            ->pluck('sync_id')
            ->toArray();
    }

    private function fetchChangedSyncIdsUnion(array $entityTypes, int $userId, ?string $lastSyncDateTime, int $startType, ?string $startUpdatedAt, ?string $startSyncId, int $limit): array
    {
        $unionParts = [];
        $params = [];

        foreach ($entityTypes as $typeIdx => $entityType) {
            $modelClass = self::ENTITY_TYPES[$entityType];
            $table = (new $modelClass)->getTable();

            if ($lastSyncDateTime !== null) {
                $whereClause = '`user_id` = ? AND `updated_at` >= ?';
                $params[] = $userId;
                $params[] = $lastSyncDateTime;
            } else {
                $whereClause = '`user_id` = ?';
                $params[] = $userId;
            }

            if ($typeIdx === $startType && $startUpdatedAt !== null) {
                if ($lastSyncDateTime !== null) {
                    $whereClause = '('.$whereClause.') AND (`updated_at` > ? OR (`updated_at` = ? AND `sync_id` > ?))';
                    $params[] = $startUpdatedAt;
                    $params[] = $startUpdatedAt;
                    $params[] = $startSyncId;
                } else {
                    $whereClause = '('.$whereClause.') AND (`updated_at` > ? OR (`updated_at` = ? AND `sync_id` > ?))';
                    $params[] = $startUpdatedAt;
                    $params[] = $startUpdatedAt;
                    $params[] = $startSyncId;
                }
            }

            $unionParts[] = "SELECT `sync_id`, `updated_at`, '".$entityType."' as entity_type, ".$typeIdx." as type_idx FROM `{$table}` WHERE {$whereClause}";
        }

        $unionSql = implode(' UNION ALL ', $unionParts);
        $unionSql .= ' ORDER BY `type_idx`, `updated_at`, `sync_id` LIMIT '.$limit;

        return DB::select($unionSql, $params);
    }

    private function hydrateChangedItems(string $entityType, array $syncIds): Collection
    {
        $modelClass = self::ENTITY_TYPES[$entityType];
        $query = $modelClass::whereIn('sync_id', $syncIds);

        switch ($entityType) {
            case 'budget_entry':
                $query->with(['account:id,name', 'groups.account:id,name']);
                break;
            case 'budget_provider':
                $query->with(['account:id,name', 'supplier:id,name']);
                break;
            case 'budget_provider_product':
                $query->with(['budgetProvider:id,sync_id,name', 'supplierProduct:id,sync_id,name,price']);
                break;
            case 'recurring_record':
                $query->with('products');
                break;
        }

        return $query->get()->keyBy('sync_id');
    }

    private function formatChangedItems(string $entityType, Collection $items, int $userId): array
    {
        $supplierProductsCache = [];

        if ($entityType === 'supplier' && $items->isNotEmpty()) {
            $supplierSyncIds = $items->pluck('sync_id')->toArray();
            $products = SupplierProduct::whereIn('supplier_id', $supplierSyncIds)
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->get(['id', 'supplier_id', 'name', 'price', 'sync_id']);

            foreach ($products as $product) {
                $supplierProductsCache[$product->supplier_id][] = $product;
            }
        }

        return $items->map(fn ($item) => $this->formatItem($entityType, $item, $supplierProductsCache))->values()->toArray();
    }

    private function compressMergeResults(array $results): array
    {
        $compressed = [
            'created' => [],
            'updated' => [],
            'deleted' => [],
            'skipped' => [],
            'conflicts' => $results['conflicts'] ?? [],
            'errors' => $results['errors'] ?? [],
        ];

        foreach (['created', 'updated', 'deleted', 'skipped'] as $status) {
            if (empty($results[$status]) || ! is_array($results[$status])) {
                continue;
            }
            foreach ($results[$status] as $entityType => $items) {
                if (! is_array($items)) {
                    // Scalar buckets (e.g. a skipped count) carry no ackable ids.
                    Log::warning('Sync compress: dropping non-array result bucket', [
                        'status' => $status,
                        'entityType' => $entityType,
                    ]);

                    continue;
                }
                $compressed[$status][$entityType] = array_map(function ($item) {
                    if (! is_array($item)) {
                        // Scalar acks (e.g. a bare sync_id string) — LBDS-244.
                        return ['sync_id' => (string) $item, 'id' => null];
                    }

                    return [
                        'sync_id' => $item['sync_id'] ?? ($item['id'] ?? null),
                        'id' => $item['id'] ?? null,
                        // GitLab #15: the ack carries the row's version.
                        'version' => $item['version'] ?? null,
                    ];
                }, $items);
            }
        }

        return $compressed;
    }

    private function computeDedupHash(string $entityType, array $item): string
    {
        $fields = $item;
        unset($fields['sync_id'], $fields['_conflict'], $fields['_deleted'], $fields['_original'], $fields['id']);
        ksort($fields);

        return md5($entityType.($item['sync_id'] ?? '').json_encode($fields));
    }

    private function filterDuplicateChanges(array $data, int $userId): array
    {
        $hashes = [];
        foreach ($data as $entityType => $items) {
            foreach ($items as $item) {
                $hash = $this->computeDedupHash($entityType, $item);
                $hashes[] = $hash;
            }
        }

        if (empty($hashes)) {
            return ['data' => $data, 'skipped' => []];
        }

        $recent = SyncMetadata::where('user_id', $userId)
            ->whereIn('dedup_hash', $hashes)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->pluck('dedup_hash')
            ->flip();

        if ($recent->isEmpty()) {
            return ['data' => $data, 'skipped' => []];
        }

        $filtered = [];
        $skipped = 0;
        $skippedIds = [];
        foreach ($data as $entityType => $items) {
            foreach ($items as $item) {
                $hash = $this->computeDedupHash($entityType, $item);
                if ($recent->has($hash)) {
                    $skipped++;

                    // LBDS-244: remember dedup-dropped ids so the client can drain them.
                    $dupId = $item['id'] ?? ($item['sync_id'] ?? null);
                    if ($dupId !== null) {
                        $skippedIds[$entityType][] = ['sync_id' => $dupId];
                    }

                    continue;
                }
                $filtered[$entityType][] = $item;
            }
        }

        if ($skipped > 0) {
            Log::info('Sync dedup: skipped duplicate changes', [
                'user_id' => $userId,
                'skipped_count' => $skipped,
            ]);
        }

        return ['data' => $filtered, 'skipped' => $skippedIds];
    }

    public function merge(SyncMergeRequest $request): JsonResponse
    {
        $startTime = microtime(true);
        $user = $request->user();

        if ($request->header('X-Async-Merge') === 'true') {
            $data = $request->input('data');
            $mergeJob = MergeJob::create([
                'user_id' => $user->id,
                'status' => 'queued',
                'data' => $data,
            ]);

            SyncMergeJob::dispatch($mergeJob);

            $this->recordSyncMetrics('merge_async', $startTime);

            return response()->json([
                'success' => true,
                'async' => true,
                'job_id' => $mergeJob->id,
            ]);
        }

        $lock = Cache::lock("sync_merge_user_{$user->id}", 30);

        try {
            if (! $lock->get()) {
                $this->recordSyncMetrics('merge', $startTime, 'lock_contention');

                return response()->json([
                    'success' => false,
                    'error' => 'Sync already in progress for this user',
                ], 409);
            }

            $dedup = $this->filterDuplicateChanges($request->input('data'), $user->id);
            $data = $dedup['data'];
            $dedupSkipped = $dedup['skipped'];

            if (empty($data)) {
                $this->recordSyncMetrics('merge', $startTime);

                return response()->json([
                    'success' => true,
                    'results' => ['updated' => [], 'errors' => [], 'conflicts' => [], 'skipped' => $dedupSkipped],
                    'serverTime' => now()->timestamp,
                ]);
            }

            try {
                $results = $this->orchestrator->merge($data, $user->id);

                $results['skipped'] = array_merge($results['skipped'] ?? [], $dedupSkipped);
            } catch (\Exception $e) {
                $this->recordSyncMetrics('merge', $startTime, 'orchestrator_failure');

                return response()->json([
                    'success' => false,
                    'error' => 'Sync service temporarily unavailable',
                ], 503);
            }

            foreach ($results['updated'] ?? [] as $entityType => &$items) {
                foreach ($items as &$item) {
                    $syncId = $item['sync_id'] ?? null;
                    if ($syncId) {
                        $syncMeta = SyncMetadata::where('entity_type', $entityType)
                            ->where('entity_id', $syncId)
                            ->where('user_id', $user->id)
                            ->where('sync_status', 'synced')
                            ->latest()
                            ->first();
                        if ($syncMeta && ! $syncMeta->dedup_hash) {
                            app(SyncMetadataRepository::class)->updateDedupHash(
                                $entityType, $syncId, $user->id,
                                $this->computeDedupHash($entityType, $item),
                            );
                        }
                    }
                    unset($item['_original']);
                }
            }

            $compressedResults = $this->compressMergeResults($results);

            $this->recordSyncMetrics('merge', $startTime);

            return response()->json([
                'success' => true,
                'results' => $compressedResults,
                'serverTime' => now()->timestamp,
            ]);
        } finally {
            optional($lock)->release();
        }
    }

    public function mergeStatus(int $jobId, Request $request): JsonResponse
    {
        $user = $request->user();
        $mergeJob = MergeJob::where('id', $jobId)->where('user_id', $user->id)->first();

        if (! $mergeJob) {
            return response()->json(['error' => 'Merge job not found'], 404);
        }

        return response()->json([
            'job_id' => $mergeJob->id,
            'status' => $mergeJob->status,
            'results' => $mergeJob->results,
            'error_message' => $mergeJob->error_message,
            'completed_at' => $mergeJob->completed_at?->toIso8601String(),
        ]);
    }

    /**
     * Bulk create items for better performance
     */
    private function createBudgetEntryGroups(int $entryId, int $userId, array $groups): void
    {
        $resolver = app(SyncIdResolver::class);

        $incomingSyncIds = [];
        foreach ($groups as $group) {
            $groupSyncId = $group['sync_id'] ?? Str::uuid()->toString();
            $incomingSyncIds[] = $groupSyncId;
            $accountId = $group['account_id'] ?? $group['accountId'] ?? null;
            $accountId = $resolver->resolveAccountId($accountId, $userId);

            BudgetEntryGroup::updateOrCreate(
                ['sync_id' => $groupSyncId, 'user_id' => $userId],
                [
                    'budget_entry_id' => $entryId,
                    'account_id' => $accountId,
                    'amount' => $group['amount'] ?? 0,
                ]
            );
        }

        BudgetEntryGroup::where('budget_entry_id', $entryId)
            ->where('user_id', $userId)
            ->whereNotIn('sync_id', $incomingSyncIds)
            ->delete();
    }

    public function fullSync(Request $request): Response
    {
        $startTime = microtime(true);
        $user = $request->user();
        $userId = $user->id;

        $requestedTypes = $request->input('types', array_keys(self::ENTITY_TYPES));
        if (! is_array($requestedTypes)) {
            $requestedTypes = [$requestedTypes];
        }

        Log::debug('fullSync requestedTypes', ['requestedTypes' => $requestedTypes]);
        Log::debug('fullSync all input', $request->all());

        $since = $request->input('since');
        $sinceParam = $since !== null && $since !== '';

        $etag = null;
        if (! $sinceParam) {
            $etagParts = [];
            foreach ($requestedTypes as $type) {
                if (! isset(self::ENTITY_TYPES[$type])) {
                    continue;
                }
                $class = self::ENTITY_TYPES[$type];
                $query = $class::forUser($userId);
                if (method_exists($class, 'scopeActive')) {
                    $query->active();
                } elseif (in_array('status', (new $class)->getFillable())) {
                    $query->where('status', 'active');
                }
                $max = $query->max('updated_at');
                $etagParts[] = $max?->timestamp ?? '0';
            }
            $maxDeleted = SyncMetadata::forUser($userId)
                ->where('sync_status', 'deleted')
                ->max('server_updated_at');
            $etagParts[] = $maxDeleted?->timestamp ?? '0';
            $etag = '"'.md5(implode('|', $etagParts)).'"';

            $ifNoneMatch = $request->header('If-None-Match');
            if ($ifNoneMatch !== null && trim($ifNoneMatch) === $etag) {
                $this->recordSyncMetrics('fullSync', $startTime);

                return response()->json([
                    'success' => true,
                    'data' => [],
                    'serverTime' => now()->timestamp,
                ], 304, ['ETag' => $etag]);
            }
        }
        $sinceDateTime = null;
        if ($since !== null && $since !== '') {
            $sinceTimestamp = AbstractEntityProcessor::normalizeTimestamp($since);
            $sinceDateTime = date('Y-m-d H:i:s', $sinceTimestamp);
        }

        Log::debug('fullSync since', ['since' => $since, 'sinceDateTime' => $sinceDateTime]);

        $suppliers = in_array('supplier', $requestedTypes)
            ? Supplier::forUser($userId)
                ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                    $query->where('updated_at', '>', $sinceDateTime)
                        ->orWhere('deleted_at', '>', $sinceDateTime);
                }))
                ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                ->get(['id', 'sync_id', 'name', 'deleted_at'])
            : collect();
        $supplierSyncIds = $suppliers->pluck('sync_id')->toArray();

        $supplierProductsCache = [];
        if (in_array('supplier', $requestedTypes) && ! empty($supplierSyncIds)) {
            $products = SupplierProduct::whereIn('supplier_id', $supplierSyncIds)
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->get(['id', 'supplier_id', 'name', 'price', 'sync_id']);

            foreach ($products as $product) {
                $supplierProductsCache[$product->supplier_id][] = $product;
            }
        }

        $entityTypes = [
            'account' => [
                'query' => fn () => Account::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->select(['id', 'sync_id', 'user_id', 'name', 'initial_balance', 'status', 'updated_at', 'created_at', 'deleted_at']),
            ],
            'budget_provider' => [
                'query' => fn () => BudgetProvider::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->with(['account:id,name'])
                    ->select(['id', 'sync_id', 'user_id', 'account_id', '_supplier_id', '_supplier_name', 'name', 'status', 'updated_at', 'deleted_at']),
            ],
            'budget_provider_product' => [
                'query' => fn () => BudgetProviderProduct::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->with(['budgetProvider:id,sync_id,name', 'supplierProduct:id,sync_id,name,price'])
                    ->select(['id', 'sync_id', 'user_id', 'budget_provider_id', 'supplier_product_id', 'product_name', 'product_price', 'quantity', 'status', 'updated_at', 'deleted_at']),
            ],
            'budget_entry' => [
                'query' => fn () => BudgetEntry::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->with(['account:id,name', 'groups.account:id,name'])
                    ->select(['id', 'sync_id', 'user_id', 'account_id', 'date', 'amount', 'name', 'payment_type', 'entry_type', 'supplier_id', 'supplier_name', 'status', 'updated_at', 'deleted_at']),
            ],
            'supplier' => [
                'query' => fn () => collect($suppliers)->when($sinceDateTime !== null, fn ($collection) => $collection->filter(function ($supplier) use ($sinceDateTime) {
                    return $supplier->updated_at?->timestamp > $sinceDateTime ||
                         ($supplier->deleted_at && $supplier->deleted_at->timestamp > $sinceDateTime);
                })),
                'isCollection' => true,
            ],
            'supplier_product' => [
                'query' => fn () => SupplierProduct::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->select(['id', 'sync_id', 'user_id', 'supplier_id', 'name', 'price', 'status', 'updated_at', 'deleted_at']),
            ],
            'recurring_record' => [
                'query' => fn () => RecurringRecord::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->with('products')
                    ->select(['id', 'sync_id', 'user_id', 'type', 'entry_type', 'name', 'amount', 'account_id',
                        'repeat_frequency', 'repeat_interval', 'repeat_days', 'repeat_month_day',
                        'repeat_month_weekday_mode', 'repeat_month_weekday', 'repeat_month_weekday_ordinal',
                        'repeat_year_month', 'repeat_year_day', 'time', 'auto_insert', 'start_date',
                        'end_date', 'estimated', 'items', 'notes', 'status', 'updated_at', 'deleted_at']),
            ],
            'recurring_record_product' => [
                'query' => fn () => RecurringRecordProduct::forUser($userId)
                    ->when(! $sinceDateTime, fn ($q) => $q->active())
                    ->when($sinceDateTime, fn ($q) => $q->where(function ($query) use ($sinceDateTime) {
                        $query->where('updated_at', '>', $sinceDateTime)
                            ->orWhere('deleted_at', '>', $sinceDateTime);
                    }))
                    ->when($sinceDateTime, fn ($q) => $q->withTrashed())
                    ->select(['id', 'sync_id', 'user_id', 'recurring_record_id', 'supplier_product_id', 'product_name', 'quantity', 'status', 'updated_at', 'deleted_at']),
            ],
        ];

        $entityTypes = array_intersect_key($entityTypes, array_flip($requestedTypes));

        // Detectar entorno de test - en tests usar JSON normal, en producción streaming
        $isTesting = app()->environment('testing');

        if ($isTesting) {
            // En test: construir array completo (comportamiento original)
            $formatted = [];
            foreach ($entityTypes as $entityType => $config) {
                $formatted[$entityType] = [];

                if (! empty($config['isCollection'])) {
                    $items = $config['query']();
                    foreach ($items as $item) {
                        $formatted[$entityType][] = $this->formatItem($entityType, $item, $supplierProductsCache);
                    }
                } else {
                    $query = $config['query']();
                    $query->orderBy('id')->chunkById(500, function ($chunk) use ($entityType, $supplierProductsCache, &$formatted) {
                        foreach ($chunk as $item) {
                            $formatted[$entityType][] = $this->formatItem($entityType, $item, $supplierProductsCache);
                        }
                    });
                }
            }

            if ($sinceDateTime !== null) {
                $deleted = SyncMetadata::forUser($userId)
                    ->where('sync_status', 'deleted')
                    ->where('server_updated_at', '>', $sinceDateTime)
                    ->get(['entity_type', 'entity_id']);

                foreach ($deleted as $meta) {
                    $type = $meta->entity_type;
                    if (isset($formatted[$type])) {
                        $formatted[$type][] = ['id' => $meta->entity_id, '_deleted' => true];
                    }
                }
            }

            $headers = $etag ? ['ETag' => $etag] : [];

            $this->recordSyncMetrics('fullSync', $startTime);

            return response()->json([
                'success' => true,
                'data' => $formatted,
                'serverTime' => now()->timestamp,
            ], 200, $headers);
        }

        // Producción: streaming real
        $streamCallback = function () use ($entityTypes, $supplierProductsCache, $sinceDateTime, $userId) {
            $output = fopen('php://output', 'w');

            fwrite($output, '{"success":true,"data":{');
            $firstEntity = true;

            foreach ($entityTypes as $entityType => $config) {
                if (! $firstEntity) {
                    fwrite($output, ',');
                }
                $firstEntity = false;

                fwrite($output, '"'.$entityType.'":[');

                $firstItem = true;

                if (! empty($config['isCollection'])) {
                    $items = $config['query']();
                    foreach ($items as $item) {
                        if (! $firstItem) {
                            fwrite($output, ',');
                        }
                        $firstItem = false;
                        $formatted = $this->formatItem($entityType, $item, $supplierProductsCache);
                        fwrite($output, json_encode($formatted));
                    }
                } else {
                    $query = $config['query']();
                    $query->orderBy('id')->chunkById(500, function ($chunk) use ($entityType, $supplierProductsCache, $output, &$firstItem) {
                        foreach ($chunk as $item) {
                            if (! $firstItem) {
                                fwrite($output, ',');
                            }
                            $firstItem = false;
                            $formatted = $this->formatItem($entityType, $item, $supplierProductsCache);
                            fwrite($output, json_encode($formatted));
                        }
                    });
                }

                fwrite($output, ']');
            }

            if ($sinceDateTime !== null) {
                $deleted = SyncMetadata::forUser($userId)
                    ->where('sync_status', 'deleted')
                    ->where('server_updated_at', '>', $sinceDateTime)
                    ->get(['entity_type', 'entity_id']);

                foreach ($deleted as $meta) {
                    $type = $meta->entity_type;
                    if (isset($entityTypes[$type])) {
                        fwrite($output, ',"'.$type.'":[');
                        fwrite($output, json_encode(['id' => $meta->entity_id, '_deleted' => true]));
                        fwrite($output, ']');
                    }
                }
            }

            fwrite($output, '},"serverTime":'.now()->timestamp.'}');

            fclose($output);
        };

        $headers = ['Content-Type' => 'application/json'];
        if ($etag) {
            $headers['ETag'] = $etag;
        }

        $this->recordSyncMetrics('fullSync', $startTime);

        return Response::stream($streamCallback, 200, $headers);
    }

    public function getActiveConflicts(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        $user = $request->user();
        $entityType = $request->input('entity_type');

        $query = SyncMetadata::forUser($user->id)
            ->conflicted()
            ->orderBy('updated_at', 'desc');

        if ($entityType) {
            $query->byEntityType($entityType);
        }

        $conflicts = $query->limit(200)->get();

        $this->recordSyncMetrics('getActiveConflicts', $startTime);

        return response()->json([
            'success' => true,
            'conflicts' => $conflicts,
        ]);
    }

    public function getResolvedConflicts(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        $conflicts = SyncMetadata::forUser($request->user()->id)
            ->resolved()
            ->orderBy('updated_at', 'desc')
            ->limit(50)
            ->get();

        $this->recordSyncMetrics('getResolvedConflicts', $startTime);

        return response()->json(['conflicts' => $conflicts]);
    }

    public function resolveConflict(SyncResolveConflictRequest $request): JsonResponse
    {
        $startTime = microtime(true);
        $user = $request->user();
        $entityType = $request->input('entity_type');
        $entityId = $request->input('entity_id');
        $resolution = $request->input('resolution', 'server'); // 'server' or 'client'
        $clientData = $request->input('client_data');

        $syncMeta = SyncMetadata::forUser($user->id)
            ->byEntity($entityType, $entityId)
            ->first();

        if (! $syncMeta) {
            $this->recordSyncMetrics('resolveConflict', $startTime, 'not_found');

            return response()->json([
                'success' => false,
                'error' => 'Conflict not found',
            ], 404);
        }

        // Read conflict_data snapshot BEFORE CAS (CAS will overwrite it)
        $existingPayload = is_string($syncMeta->conflict_data)
            ? (json_decode($syncMeta->conflict_data, true) ?? [])
            : (array) $syncMeta->conflict_data;

        $resolutionPayload = array_merge($existingPayload, [
            'resolution' => $resolution,
            'resolved_at' => now()->toIso8601String(),
        ]);

        // CAS atómico: only succeeds if sync_status is still 'conflict'
        $affected = app(SyncMetadataRepository::class)->markResolved(
            [$entityId], $user->id, json_encode($resolutionPayload)
        );

        if ($affected === 0) {
            $this->recordSyncMetrics('resolveConflict', $startTime, 'not_conflict');

            return response()->json([
                'success' => false,
                'error' => 'No active conflict for this entity',
            ], 409);
        }

        if ($resolution === 'client' && $clientData) {
            $resolved = $this->resolveEntityFkFields($entityType, $clientData, $user->id);
            $this->validateEntityData($entityType, [$resolved]);
            $this->updateEntity($entityType, $entityId, $resolved, $user->id);
        }

        $supplierProductsCache = [];

        $modelClass = self::ENTITY_TYPES[$entityType];
        $entity = $modelClass::where('sync_id', $entityId)
            ->where('user_id', $user->id)
            ->first();

        if (! $entity) {
            $this->recordSyncMetrics('resolveConflict', $startTime, 'entity_not_found');

            return response()->json([
                'success' => false,
                'error' => 'Entity not found on server',
            ], 404);
        }

        $entity->touch();

        if ($entityType === 'budget_entry') {
            $entity->load('groups');
        } elseif ($entityType === 'recurring_record') {
            $entity->load('products');
        } elseif ($entityType === 'supplier') {
            $entity->load('supplierProducts');
            $supplierProductsCache[$entity->sync_id] = $entity->supplierProducts;
        }

        $this->recordSyncMetrics('resolveConflict', $startTime);

        $response = [
            'success' => true,
            'message' => 'Conflict resolved',
            'entity' => $this->formatItem($entityType, $entity, $supplierProductsCache),
        ];

        return response()->json($response);
    }

    public function resolveConflictsBatch(SyncResolveConflictsBatchRequest $request): JsonResponse
    {
        $startTime = microtime(true);
        $user = $request->user();
        $resolutions = $request->input('resolutions');
        $errors = [];
        $processed = 0;
        $entities = [];

        foreach ($resolutions as $index => $res) {
            try {
                $entityType = $res['entity_type'];
                $entityId = $res['entity_id'];
                $resolution = $res['resolution'] ?? 'server';
                $clientData = $res['client_data'] ?? null;

                $syncMeta = SyncMetadata::forUser($user->id)
                    ->byEntity($entityType, $entityId)
                    ->first();

                if (! $syncMeta) {
                    $errors[] = ['index' => $index, 'entity_type' => $entityType, 'entity_id' => $entityId, 'error' => 'Conflict not found'];

                    continue;
                }

                // Read conflict_data snapshot BEFORE CAS
                $existingPayload = is_string($syncMeta->conflict_data)
                    ? (json_decode($syncMeta->conflict_data, true) ?? [])
                    : (array) $syncMeta->conflict_data;

                $resolutionPayload = array_merge($existingPayload, [
                    'resolution' => $resolution,
                    'resolved_at' => now()->toIso8601String(),
                ]);

                // CAS atómico per item
                $affected = app(SyncMetadataRepository::class)->markResolved(
                    [$entityId], $user->id, json_encode($resolutionPayload)
                );

                if ($affected === 0) {
                    $errors[] = ['index' => $index, 'entity_type' => $entityType, 'entity_id' => $entityId, 'error' => 'No active conflict for this entity'];

                    continue;
                }

                $entity = null;
                $supplierProductsCache = [];

                if ($resolution === 'client' && $clientData) {
                    $resolved = $this->resolveEntityFkFields($entityType, $clientData, $user->id);
                    $this->validateEntityData($entityType, [$resolved]);
                    $this->updateEntity($entityType, $entityId, $resolved, $user->id);
                }

                $modelClass = self::ENTITY_TYPES[$entityType];
                $entity = $modelClass::where('sync_id', $entityId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($entity) {
                    $entity->touch();

                    if ($entityType === 'budget_entry') {
                        $entity->load('groups');
                    } elseif ($entityType === 'recurring_record') {
                        $entity->load('products');
                    } elseif ($entityType === 'supplier') {
                        $entity->load('supplierProducts');
                        $supplierProductsCache[$entity->sync_id] = $entity->supplierProducts;
                    }

                    $entities[] = $this->formatItem($entityType, $entity, $supplierProductsCache);
                }

                $processed++;
            } catch (\Exception $e) {
                $errors[] = ['index' => $index, 'entity_type' => $res['entity_type'] ?? 'unknown', 'entity_id' => $res['entity_id'] ?? 'unknown', 'error' => $e->getMessage()];
            }
        }

        $this->recordSyncMetrics('resolveConflictsBatch', $startTime);

        return response()->json([
            'success' => true,
            'processed' => $processed,
            'errors' => $errors,
            'entities' => $entities,
        ]);
    }

    private function formatItem(string $entityType, $item, array $supplierProductsCache = []): array
    {
        $data = $item->toArray();
        $data['id'] = $item->sync_id;
        $data['id_server'] = $item->id;

        // Check if the record is soft-deleted
        $isDeleted = ! is_null($item->deleted_at);
        unset($data['sync_id'], $data['user_id'], $data['deleted_at']);

        $data['updated_at'] = $item->updated_at?->timestamp;
        $data['created_at'] = $item->created_at?->timestamp;

        // Add _deleted flag for soft-deleted records
        if ($isDeleted) {
            $data['_deleted'] = true;
        }

        if ($entityType === 'budget_entry') {
            $data['groups'] = $item->groups->map(fn ($g) => [
                'sync_id' => $g->sync_id,
                'account_id' => $g->account_id,
                'amount' => (float) $g->amount,
            ])->toArray();
            unset($data['groups_relation']);
        }

        if ($entityType === 'supplier') {
            $supplierProducts = $supplierProductsCache[$item->sync_id] ?? [];

            $data['products'] = array_map(function ($product) {
                return [
                    'sync_id' => $product->sync_id ?? $product->id,
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'imageUrl' => $product->id ? url("/api/supplier-products/{$product->id}/image") : null,
                ];
            }, $supplierProducts);
        }

        if ($entityType === 'supplier_product') {
            unset($data['image_base64']);
            $data['imageUrl'] = $item->id ? url("/api/supplier-products/{$item->id}/image") : null;
        }

        if ($entityType === 'recurring_record') {
            $data['products'] = $item->products->map(fn ($p) => [
                'sync_id' => $p->sync_id,
                'supplier_product_id' => $p->supplier_product_id,
                'product_name' => $p->product_name,
                'product_price' => (float) $p->product_price,
                'quantity' => $p->quantity,
            ])->toArray();
        }

        return $data;
    }

    private function resolveEntityFkFields(string $entityType, array $data, int $userId): array
    {
        return app(ForeignKeyResolver::class)->resolveItem($data, $entityType, $userId);
    }

    private function filterToFillable(string $entityType, array $data, array $allowedFields = []): array
    {
        $modelClass = self::ENTITY_TYPES[$entityType] ?? null;

        if ($modelClass === null || ! is_subclass_of($modelClass, Model::class)) {
            return $data;
        }

        $model = new $modelClass;
        $fillable = $model->getFillable();

        if (! empty($allowedFields)) {
            $allowedFields = array_intersect($allowedFields, $fillable);

            return array_intersect_key($data, array_flip($allowedFields));
        }

        if (empty($fillable)) {
            return $data;
        }

        return array_intersect_key($data, array_flip($fillable));
    }

    private function updateEntity(string $entityType, string $syncId, array $data, int $userId, $existing = null): void
    {
        $modelClass = self::ENTITY_TYPES[$entityType];

        $updateData = $data;
        unset($updateData['id'], $updateData['sync_id'], $updateData['products']);

        foreach ($updateData as $key => $value) {
            if (in_array($key, ['updated_at']) && is_numeric($value)) {
                $updateData[$key] = date('Y-m-d H:i:s', AbstractEntityProcessor::normalizeTimestamp($value));
            }
        }

        if ($entityType === 'budget_entry') {
            $groups = $updateData['groups'] ?? null;
            unset($updateData['groups']);

            if ($groups !== null && ! empty($groups)) {
                if (! $existing) {
                    $existing = $modelClass::where('sync_id', $syncId)
                        ->where('user_id', $userId)
                        ->first();
                }
                if ($existing) {
                    $this->createBudgetEntryGroups($existing->id, $existing->user_id, $groups);
                }
            }
        }

        $updateData = $this->filterToFillable($entityType, $updateData);

        if ($entityType === 'recurring_record_product') {
            $modelClass::where('sync_id', $syncId)
                ->whereHas('recurringRecord', fn ($q) => $q->where('user_id', $userId))
                ->update($updateData + ['version' => DB::raw('version + 1')]);
        } else {
            $modelClass::where('sync_id', $syncId)
                ->where('user_id', $userId)
                ->update($updateData + ['version' => DB::raw('version + 1')]);
        }

        $normalized = $updateData;
        array_walk($normalized, function (&$v) {
            if (is_numeric($v)) {
                $v = (string) ((float) $v);
            } else {
                $v = (string) $v;
            }
        });
        ksort($normalized);
        $fieldHash = md5(json_encode($normalized));

        app(SyncMetadataRepository::class)->updateFieldHash(
            $entityType, $syncId, $fieldHash, $updateData, now()->toDateTimeString()
        );
    }

    private function validateEntityData(string $entityType, array $rows): void
    {
        $requestClass = self::ENTITY_REQUEST_TYPES[$entityType] ?? null;
        if (! $requestClass) {
            Log::warning("No FormRequest configured for entity type: {$entityType}");

            return;
        }

        $rules = (new $requestClass)->rules();
        $data = $rows[0] ?? [];

        $validator = app('validator')->make($data, $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }
    }
}
