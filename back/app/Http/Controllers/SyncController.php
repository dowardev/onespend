<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Budget;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\Entry;
use App\Models\Supplier;
use App\Models\SupplierProduct;
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
        'budget_provider' => BudgetProvider::class,
        'budget_provider_product' => BudgetProviderProduct::class,
        'entry' => Entry::class,
        'supplier' => Supplier::class,
        'supplier_product' => SupplierProduct::class,
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

        Log::info('SyncController::merge - Received data', ['data' => $data]);

        $results = [
            'created' => [],
            'updated' => [],
            'deleted' => [],
            'conflicts' => [],
        ];

        DB::beginTransaction();

        try {
            // Process suppliers first (for dependency)
            if (isset($data['supplier'])) {
                $items = $data['supplier'];
                Log::info("SyncController::merge - Processing entityType: supplier", ['items_count' => count($items)]);
                
                foreach ($items as $item) {
                    $result = $this->processItem('supplier', $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created']['supplier'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['supplier'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['supplier'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['supplier'][] = $result;
                    }
                }
            }

            // Process supplier_products second (depends on suppliers)
            if (isset($data['supplier_product'])) {
                $items = $data['supplier_product'];
                Log::info("SyncController::merge - Processing entityType: supplier_product", ['items_count' => count($items)]);
                
                foreach ($items as $item) {
                    $result = $this->processItem('supplier_product', $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created']['supplier_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['supplier_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['supplier_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['supplier_product'][] = $result;
                    }
                }
            }

            // Process budget_providers (for budget_provider_products dependency)
            if (isset($data['budget_provider'])) {
                $items = $data['budget_provider'];
                Log::info("SyncController::merge - Processing entityType: budget_provider", ['items_count' => count($items)]);
                
                foreach ($items as $item) {
                    $result = $this->processItem('budget_provider', $item, $user->id);
                    $syncId = $result['sync_id'];
                    $providerId = null;
                    
                    // Get the real MySQL ID after creating/updating
                    $budgetProvider = BudgetProvider::where('sync_id', $syncId)->first();
                    if ($budgetProvider) {
                        $providerId = $budgetProvider->id;
                    }
                    
                    if ($result['status'] === 'created') {
                        $results['created']['budget_provider'][] = $syncId;
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['budget_provider'][] = $syncId;
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['budget_provider'][] = $syncId;
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['budget_provider'][] = $result;
                    }
                    
                    // Process products if included - use real MySQL ID
                    // Products come directly in $item (not $item['data']) because syncService flattens the structure
                    if (isset($item['products']) && is_array($item['products'])) {
                        $products = $item['products'];
                        Log::info("SyncController::merge - Processing products for budget_provider {$syncId} (real ID: {$providerId})", ['products_count' => count($products)]);
                        
                        foreach ($products as $product) {
                            $productSyncId = $product['sync_id'] ?? uniqid('bpp_', true);
                            
                            // Determine operation: check if item was marked for deletion or if product already exists
                            $isDeleted = isset($item['_deleted']) && $item['_deleted'] === true;
                            $existingProduct = BudgetProviderProduct::where('sync_id', $productSyncId)->first();
                            $productOperation = $isDeleted ? 'delete' : ($existingProduct ? 'update' : 'create');
                            
                            // Build product data directly (processItem expects flat structure with 'id' as sync_id)
                            $productData = [
                                'id' => $productSyncId,
                                'user_id' => $user->id,
                                'budget_provider_id' => $providerId,
                                'supplier_product_id' => $product['supplier_product_id'] ?? $product['supplierProductId'] ?? null,
                                'product_name' => $product['product_name'] ?? $product['productName'] ?? null,
                                'product_price' => $product['product_price'] ?? $product['productPrice'] ?? null,
                                'quantity' => $product['quantity'] ?? 0,
                                'updated_at' => $product['updated_at'] ?? now()->getTimestampMs(),
                            ];
                            
                            if ($isDeleted) {
                                $productData['_deleted'] = true;
                            }
                            
                            Log::info("SyncController::merge - Product item data", ['productData' => $productData, 'operation' => $productOperation]);
                            
                            $productResult = $this->processItem('budget_provider_product', $productData, $user->id);
                            
                            if ($productResult['status'] === 'created') {
                                $results['created']['budget_provider_product'][] = $productResult['sync_id'];
                            } elseif ($productResult['status'] === 'updated') {
                                $results['updated']['budget_provider_product'][] = $productResult['sync_id'];
                            } elseif ($productResult['status'] === 'deleted') {
                                $results['deleted']['budget_provider_product'][] = $productResult['sync_id'];
                            } elseif ($productResult['status'] === 'conflict') {
                                $results['conflicts']['budget_provider_product'][] = $productResult;
                            }
                        }
                    }
                }
            }

            // Process budget_provider_products (depends on budget_providers)
            if (isset($data['budget_provider_product'])) {
                $items = $data['budget_provider_product'];
                Log::info("SyncController::merge - Processing entityType: budget_provider_product", ['items_count' => count($items)]);
                
                foreach ($items as $item) {
                    $result = $this->processItem('budget_provider_product', $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created']['budget_provider_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['budget_provider_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['budget_provider_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['budget_provider_product'][] = $result;
                    }
                }
            }

            // Process remaining entity types
            foreach ($data as $entityType => $items) {
                if ($entityType === 'supplier' || $entityType === 'supplier_product' || 
                    $entityType === 'budget_provider' || $entityType === 'budget_provider_product') {
                    continue;
                }
                
                if (!isset(self::ENTITY_TYPES[$entityType])) {
                    Log::warning("SyncController::merge - Unknown entityType: {$entityType}");
                    continue;
                }

                Log::info("SyncController::merge - Processing entityType: {$entityType}", ['items_count' => count($items)]);

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
            'budget_providers' => BudgetProvider::forUser($user->id)->active()->get(),
            'budget_provider_products' => BudgetProviderProduct::forUser($user->id)->active()->get(),
            'entries' => Entry::forUser($user->id)->active()->get(),
            'suppliers' => Supplier::forUser($user->id)->active()->get(),
            'supplier_products' => SupplierProduct::forUser($user->id)->active()->get(),
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
        Log::info("formatItem - entityType: " . $entityType);
        $data = $item->toArray();
        $data['id'] = $item->sync_id;
        unset($data['sync_id'], $data['user_id'], $data['deleted_at']);

        // Include supplier products with their IDs for supplier entity
        if ($entityType === 'suppliers') {
            // Use sync_id to match supplier_id in supplier_products table
            Log::info("formatItem - supplier sync_id: " . $item->sync_id);
            $supplierProducts = SupplierProduct::where('supplier_id', $item->sync_id)
                ->where('status', 'active')
                ->get(['id', 'name', 'price', 'image_base64'])
                ->toArray();

            Log::info("formatItem - supplier products count: " . count($supplierProducts), ['products' => $supplierProducts]);

            // Map products to include 'id' field (not 'sync_id')
            $data['products'] = array_map(function($product) {
                return [
                    'id' => $product['id'],
                    'name' => $product['name'],
                    'price' => $product['price'],
                    'imageBase64' => $product['image_base64'],
                ];
            }, $supplierProducts);

            Log::info("formatItem - formatted products: " . count($data['products']));
        }

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
