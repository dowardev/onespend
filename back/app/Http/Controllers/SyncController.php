<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Budget;
use App\Models\Entry;
use App\Models\Supplier;
use App\Models\Template;
use App\Models\SyncMetadata;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncController extends Controller
{
    private const ENTITY_TYPES = [
        'account' => Account::class,
        'budget' => Budget::class,
        'entry' => Entry::class,
        'supplier' => Supplier::class,
        'template' => Template::class,
    ];

    public function getChanges(Request $request): JsonResponse
    {
        $user = $request->user();
        $lastSync = $request->input('last_sync', 0);
        $entityTypes = $request->input('types', array_keys(self::ENTITY_TYPES));

        $changes = [];

        foreach ($entityTypes as $entityType) {
            if (!isset(self::ENTITY_TYPES[$entityType])) {
                continue;
            }

            $modelClass = self::ENTITY_TYPES[$entityType];

            $items = $modelClass::forUser($user->id)
                ->where('updated_at', '>', date('Y-m-d H:i:s', $lastSync))
                ->get();

            foreach ($items as $item) {
                $changes[$entityType][] = $this->formatItem($entityType, $item);
            }

            $deletedIds = SyncMetadata::forUser($user->id)
                ->byEntity($entityType, '')
                ->where('sync_status', 'deleted')
                ->where('server_updated_at', '>', date('Y-m-d H:i:s', $lastSync))
                ->pluck('entity_id');

            if ($deletedIds->isNotEmpty()) {
                $changes[$entityType]['_deleted'] = $deletedIds->toArray();
            }
        }

        return response()->json([
            'success' => true,
            'changes' => $changes,
            'server_time' => now()->timestamp,
        ]);
    }

    public function merge(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->input('data', []);

        $results = [
            'created' => [],
            'updated' => [],
            'deleted' => [],
            'conflicts' => [],
        ];

        DB::beginTransaction();

        try {
            foreach ($data as $entityType => $items) {
                if (!isset(self::ENTITY_TYPES[$entityType])) {
                    continue;
                }

                foreach ($items as $item) {
                    $result = $this->processItem($entityType, $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created'][$entityType][] = $result['sync_id'];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated'][$entityType][] = $result['sync_id'];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted'][$entityType][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts'][$entityType][] = $result;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'results' => $results,
                'server_time' => now()->timestamp,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sync merge failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Sync failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function fullSync(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = [
            'accounts' => Account::forUser($user->id)->active()->get(),
            'budgets' => Budget::forUser($user->id)->active()->get(),
            'entries' => Entry::forUser($user->id)->active()->get(),
            'suppliers' => Supplier::forUser($user->id)->active()->get(),
            'templates' => Template::forUser($user->id)->active()->get(),
        ];

        $formatted = [];

        foreach ($data as $entityType => $items) {
            $formatted[$entityType] = $items->map(fn($item) => $this->formatItem($entityType, $item))->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => $formatted,
            'server_time' => now()->timestamp,
        ]);
    }

    public function resolveConflict(Request $request): JsonResponse
    {
        $user = $request->user();
        $entityType = $request->input('entity_type');
        $entityId = $request->input('entity_id');
        $resolution = $request->input('resolution', 'server'); // 'server' or 'client'
        $clientData = $request->input('client_data');

        $syncMeta = SyncMetadata::forUser($user->id)
            ->byEntity($entityType, $entityId)
            ->first();

        if (!$syncMeta) {
            return response()->json([
                'success' => false,
                'error' => 'Conflict not found',
            ], 404);
        }

        if ($resolution === 'client' && $clientData) {
            $this->updateEntity($entityType, $entityId, $clientData, $user->id);
        }

        $syncMeta->update(['sync_status' => 'synced']);
        $syncMeta->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conflict resolved',
        ]);
    }

    private function formatItem(string $entityType, $item): array
    {
        $data = $item->toArray();
        $data['id'] = $item->sync_id;
        unset($data['sync_id'], $data['user_id'], $data['deleted_at']);

        return $data;
    }

    private function processItem(string $entityType, array $item, int $userId): array
    {
        $syncId = $item['id'] ?? null;
        
        if (!$syncId) {
            return ['status' => 'error', 'message' => 'No sync_id provided'];
        }

        $modelClass = self::ENTITY_TYPES[$entityType];
        $existing = $modelClass::where('sync_id', $syncId)->first();

        if (isset($item['_deleted']) && $item['_deleted'] === true) {
            if ($existing) {
                $existing->update(['status' => 'deleted', 'deleted_at' => now()]);
                $this->updateSyncMetadata($entityType, $syncId, 'deleted', $userId);
            }
            return ['status' => 'deleted', 'sync_id' => $syncId];
        }

        if (!$existing) {
            $item['user_id'] = $userId;
            $item['sync_id'] = $syncId;
            
            // Convert timestamp fields to datetime format (timestamps come in milliseconds)
            if (isset($item['updated_at']) && is_numeric($item['updated_at'])) {
                $timestamp = $item['updated_at'];
                if ($timestamp > 10000000000) {
                    $timestamp = $timestamp / 1000;
                }
                $item['updated_at'] = date('Y-m-d H:i:s', $timestamp);
            }
            
            // Exclude 'id' from create - it's auto-generated
            $createData = $item;
            unset($createData['id']);
            
            $modelClass::create($createData);
            $this->updateSyncMetadata($entityType, $syncId, 'synced', $userId);
            return ['status' => 'created', 'sync_id' => $syncId];
        }

        $localUpdatedAt = $existing->updated_at->timestamp;
        $clientUpdatedAt = $item['updated_at'] ?? 0;

        if ($clientUpdatedAt > $localUpdatedAt) {
            $this->updateEntity($entityType, $syncId, $item, $userId);
            $this->updateSyncMetadata($entityType, $syncId, 'synced', $userId);
            return ['status' => 'updated', 'sync_id' => $syncId];
        }

        if ($clientUpdatedAt < $localUpdatedAt) {
            $this->createConflict($entityType, $syncId, $item, $userId);
            return [
                'status' => 'conflict',
                'sync_id' => $syncId,
                'server_data' => $this->formatItem($entityType, $existing),
            ];
        }

        return ['status' => 'skipped', 'sync_id' => $syncId];
    }

    private function updateEntity(string $entityType, string $syncId, array $data, int $userId): void
    {
        $modelClass = self::ENTITY_TYPES[$entityType];
        
        // Exclude 'id' and 'sync_id' from update - we only update the actual fields
        $updateData = $data;
        unset($updateData['id'], $updateData['sync_id']);
        
        // Convert timestamp fields to datetime format (timestamps come in milliseconds)
        foreach ($updateData as $key => $value) {
            if (in_array($key, ['updated_at']) && is_numeric($value)) {
                $timestamp = $value;
                // Check if timestamp is in milliseconds (greater than 10 billion)
                if ($timestamp > 10000000000) {
                    $timestamp = $timestamp / 1000;
                }
                $updateData[$key] = date('Y-m-d H:i:s', $timestamp);
            }
        }
        
        $modelClass::where('sync_id', $syncId)->update($updateData);
    }

    private function updateSyncMetadata(string $entityType, string $syncId, string $status, int $userId): void
    {
        SyncMetadata::updateOrCreate(
            ['entity_type' => $entityType, 'entity_id' => $syncId, 'user_id' => $userId],
            [
                'sync_status' => $status,
                'last_synced_at' => now(),
                'server_updated_at' => now(),
            ]
        );
    }

    private function createConflict(string $entityType, string $syncId, array $clientData, int $userId): void
    {
        SyncMetadata::updateOrCreate(
            ['entity_type' => $entityType, 'entity_id' => $syncId, 'user_id' => $userId],
            [
                'sync_status' => 'conflict',
                'conflict_data' => $clientData,
                'server_updated_at' => now(),
            ]
        );
    }
}
