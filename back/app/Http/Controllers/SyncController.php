<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\BudgetProvider;
use App\Models\BudgetProviderProduct;
use App\Models\BudgetEntry;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use App\Models\Template;
use App\Models\SyncMetadata;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class SyncController extends Controller
{
    private const ENTITY_TYPES = [
        'account' => Account::class,
        'budget_provider' => BudgetProvider::class,
        'budget_provider_product' => BudgetProviderProduct::class,
        'budget_entry' => BudgetEntry::class,
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
        $lastSyncDateTime = date('Y-m-d H:i:s', $lastSync);

        // Preload supplier sync IDs to cache supplier products and avoid N+1 queries
        $supplierSyncIds = [];
        foreach ($entityTypes as $entityType) {
            if ($entityType === 'supplier') {
                $modelClass = self::ENTITY_TYPES[$entityType];
                $supplierSyncIds = $modelClass::forUser($user->id)
                    ->where('updated_at', '>', $lastSyncDateTime)
                    ->pluck('sync_id')
                    ->toArray();
            }
        }

        // Cache supplier products for all suppliers that changed
        $supplierProductsCache = [];
        if (!empty($supplierSyncIds)) {
            $products = SupplierProduct::whereIn('supplier_id', $supplierSyncIds)
                ->where('status', 'active')
                ->get(['id', 'supplier_id', 'name', 'price', 'image_base64', 'sync_id']);
            
            foreach ($products as $product) {
                $supplierProductsCache[$product->supplier_id][] = $product;
            }
        }

        foreach ($entityTypes as $entityType) {
            if (!isset(self::ENTITY_TYPES[$entityType])) {
                continue;
            }

            $modelClass = self::ENTITY_TYPES[$entityType];

            // Add eager loading based on entity type
            $query = $modelClass::forUser($user->id)
                ->where('updated_at', '>', $lastSyncDateTime);

            // Optimize based on entity type relationships
            switch ($entityType) {
                case 'budget_entry':
                    $query->with(['account:id,name']);
                    break;
                case 'budget_provider':
                    $query->with(['account:id,name', 'supplier:id,name']);
                    break;
                case 'budget_provider_product':
                    $query->with(['budgetProvider:id,name', 'supplierProduct:id,name,price']);
                    break;
            }

            $items = $query->get();

            foreach ($items as $item) {
                $changes[$entityType][] = $this->formatItem($entityType, $item, $supplierProductsCache);
            }

            $deletedIds = SyncMetadata::forUser($user->id)
                ->byEntity($entityType, '')
                ->where('sync_status', 'deleted')
                ->where('server_updated_at', '>', $lastSyncDateTime)
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

    /**
     * Bulk create suppliers for better performance
     */
    private function bulkCreateSuppliers(array $items, int $userId): array
    {
        $results = [];
        if (empty($items)) {
            return $results;
        }
        
        $insertData = [];
        $productsToCreate = []; // Store products to create after suppliers
        $now = now();
        
        $validFields = ['name', 'user_id', 'sync_id', 'created_at', 'updated_at', 'deleted_at'];
        
        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (!$syncId) continue;
            
            // Extract products before filtering
            $products = $item['products'] ?? [];
            
            // Filter only valid fields
            $data = array_intersect_key($item, array_flip($validFields));
            
            $data['user_id'] = $userId;
            $data['sync_id'] = $syncId;
            $data['created_at'] = $now;
            $data['updated_at'] = $now;
            
            // Convert timestamp fields
            if (isset($data['updated_at']) && is_numeric($data['updated_at'])) {
                $timestamp = $data['updated_at'];
                if ($timestamp > 10000000000) {
                    $timestamp = $timestamp / 1000;
                }
                $data['updated_at'] = date('Y-m-d H:i:s', $timestamp);
            }
            
            $insertData[] = $data;
            
            // Store products for later creation
            if (!empty($products)) {
                $productsToCreate[$syncId] = $products;
            }
        }
        
        if (!empty($insertData)) {
            Supplier::insert($insertData);
            
            // Get inserted records to return their IDs
            $syncIds = array_column($insertData, 'sync_id');
            $createdRecords = Supplier::whereIn('sync_id', $syncIds)->get(['id', 'sync_id']);
            
            foreach ($createdRecords as $record) {
                $results[] = ['sync_id' => $record->sync_id, 'id' => $record->id];
                $this->updateSyncMetadata('supplier', $record->sync_id, 'synced', $userId);
                
                // Create supplier_products for this supplier
                if (isset($productsToCreate[$record->sync_id])) {
                    $this->createSupplierProducts($record->sync_id, $record->id, $productsToCreate[$record->sync_id], $userId);
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Create supplier products for a supplier
     */
    private function createSupplierProducts(string $supplierSyncId, int $supplierId, array $products, int $userId): void
    {
        $now = now();
        $insertData = [];
        
        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? $product['id'] ?? uniqid('sp_', true);
            
            $insertData[] = [
                'user_id' => $userId,
                'supplier_id' => $supplierSyncId,
                'sync_id' => $productSyncId,
                'name' => $product['name'] ?? '',
                'price' => $product['price'] ?? 0,
                'image_base64' => $product['imageBase64'] ?? null,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        
        if (!empty($insertData)) {
            SupplierProduct::insert($insertData);
        }
    }
    
    /**
     * Bulk update suppliers for better performance
     */
    private function bulkUpdateSuppliers(array $items, int $userId): array
    {
        $results = [];
        if (empty($items)) {
            return $results;
        }
        
        $validFields = ['name', 'updated_at', 'deleted_at'];
        
        foreach ($items as $itemData) {
            $item = $itemData['item'];
            $syncId = $itemData['sync_id'];
            $existing = $itemData['existing'];
            
            // Extract products before filtering
            $products = $item['products'] ?? [];
            
            // Filter only valid fields
            $updateFields = array_intersect_key($item, array_flip($validFields));
            
            // Convert timestamp fields
            foreach ($updateFields as $key => $value) {
                if (in_array($key, ['updated_at']) && is_numeric($value)) {
                    $timestamp = $value;
                    if ($timestamp > 10000000000) {
                        $timestamp = $timestamp / 1000;
                    }
                    $updateFields[$key] = date('Y-m-d H:i:s', $timestamp);
                }
            }
            
            Supplier::where('sync_id', $syncId)->update($updateFields);
            $this->updateSyncMetadata('supplier', $syncId, 'synced', $userId);
            $results[] = ['sync_id' => $syncId];
            
            // Update supplier products if provided
            if (!empty($products)) {
                $this->updateSupplierProducts($syncId, $existing->id, $products, $userId);
            }
        }
        
        return $results;
    }
    
    /**
     * Update supplier products for a supplier
     */
    private function updateSupplierProducts(string $supplierSyncId, int $supplierId, array $products, int $userId): void
    {
        $now = now();
        
        foreach ($products as $product) {
            $productSyncId = $product['sync_id'] ?? $product['id'] ?? null;
            if (!$productSyncId) continue;
            
            $productData = [
                'name' => $product['name'] ?? '',
                'price' => $product['price'] ?? 0,
                'image_base64' => $product['imageBase64'] ?? null,
                'updated_at' => $now,
            ];
            
            // Check if product exists
            $existing = SupplierProduct::where('sync_id', $productSyncId)
                ->where('supplier_id', $supplierSyncId)
                ->first();
            
            if ($existing) {
                $existing->update($productData);
            } else {
                // Create new product
                SupplierProduct::create([
                    'user_id' => $userId,
                    'supplier_id' => $supplierSyncId,
                    'sync_id' => $productSyncId,
                    'name' => $productData['name'],
                    'price' => $productData['price'],
                    'image_base64' => $productData['image_base64'],
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
    
    /**
     * Bulk delete suppliers for better performance
     */
    private function bulkDeleteSuppliers(array $syncIds, int $userId): array
    {
        $results = [];
        if (empty($syncIds)) {
            return $results;
        }
        
        foreach ($syncIds as $syncId) {
            $existing = Supplier::where('sync_id', $syncId)->first();
            if ($existing) {
                $existing->update(['status' => 'deleted', 'deleted_at' => now()]);
                $this->updateSyncMetadata('supplier', $syncId, 'deleted', $userId);
                $results[] = $syncId;
            }
        }
        
        return $results;
    }

    /**
     * Bulk create items for better performance
     */
    private function bulkCreateItems(string $entityType, array $items, int $userId): array
    {
        $modelClass = self::ENTITY_TYPES[$entityType];
        $results = [];
        
        if (empty($items)) {
            return $results;
        }
        
        // Prepare data for bulk insert
        $insertData = [];
        $now = now();
        
        foreach ($items as $item) {
            $syncId = $item['id'] ?? null;
            if (!$syncId) {
                continue;
            }
            
            $data = $item;
            $data['user_id'] = $userId;
            $data['sync_id'] = $syncId;
            $data['created_at'] = $now;
            $data['updated_at'] = $now;
            
            // Convert timestamp fields
            if (isset($data['updated_at']) && is_numeric($data['updated_at'])) {
                $timestamp = $data['updated_at'];
                if ($timestamp > 10000000000) {
                    $timestamp = $timestamp / 1000;
                }
                $data['updated_at'] = date('Y-m-d H:i:s', $timestamp);
            }
            
            // Handle special cases
            if ($entityType === 'budget_provider_product' && isset($data['supplier_product_id'])) {
                $spId = $data['supplier_product_id'];
                if (!is_numeric($spId)) {
                    $sp = SupplierProduct::where('sync_id', $spId)->first();
                    $data['supplier_product_id'] = $sp ? $sp->id : null;
                } else {
                    $data['supplier_product_id'] = (int)$spId;
                }
            }
            
            if ($entityType === 'budget_provider' && isset($data['_supplier_id'])) {
                $supplierId = $data['_supplier_id'];
                if (!is_numeric($supplierId)) {
                    $supplier = Supplier::where('sync_id', $supplierId)->first();
                    $data['_supplier_id'] = $supplier ? $supplier->id : null;
                } else {
                    $data['_supplier_id'] = (int)$supplierId;
                }
            }
            
            // Handle JSON fields (casts don't work with insert)
            if ($entityType === 'budget_entry' && isset($data['groups']) && is_array($data['groups'])) {
                $data['groups'] = json_encode($data['groups']);
            }
            
            unset($data['id']);
            $insertData[] = $data;
        }
        
        // Perform bulk insert
        if (!empty($insertData)) {
            $inserted = $modelClass::insert($insertData);
            
            // Get inserted records to return their IDs
            $syncIds = array_column($insertData, 'sync_id');
            $createdRecords = $modelClass::whereIn('sync_id', $syncIds)->get(['id', 'sync_id']);
            
            foreach ($createdRecords as $record) {
                $results[] = ['sync_id' => $record->sync_id, 'id' => $record->id];
                $this->updateSyncMetadata($entityType, $record->sync_id, 'synced', $userId);
            }
        }
        
        return $results;
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
            // Process accounts FIRST (before any dependent entities)
            if (isset($data['account'])) {
                $items = $data['account'];
                Log::info("SyncController::merge - Processing entityType: account", ['items_count' => count($items)]);

                foreach ($items as $item) {
                    $result = $this->processItem('account', $item, $user->id);

                    if ($result['status'] === 'created') {
                        $results['created']['account'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id']];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['account'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id'] ?? null];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['account'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['account'][] = $result;
                    }
                }
            }

            // Process suppliers (for dependency) - using bulk operations
            if (isset($data['supplier'])) {
                $items = $data['supplier'];
                Log::info("SyncController::merge - Bulk processing entityType: supplier", ['items_count' => count($items)]);
                
                // Separate creates, updates, deletes for bulk operations
                $toCreate = [];
                $toUpdate = [];
                $toDelete = [];
                $conflicts = [];
                
                foreach ($items as $item) {
                    $syncId = $item['id'] ?? null;
                    if (!$syncId) continue;
                    
                    if (isset($item['_deleted']) && $item['_deleted'] === true) {
                        $toDelete[] = $syncId;
                    } else {
                        $existing = Supplier::where('sync_id', $syncId)->first();
                        if ($existing) {
                            $localUpdatedAt = $existing->updated_at->timestamp;
                            $clientUpdatedAt = $item['updated_at'] ?? 0;
                            
                            if ($clientUpdatedAt > $localUpdatedAt) {
                                $toUpdate[] = ['sync_id' => $syncId, 'item' => $item, 'existing' => $existing];
                            } elseif ($clientUpdatedAt < $localUpdatedAt) {
                                $conflicts[] = ['sync_id' => $syncId, 'server_data' => $existing];
                            }
                        } else {
                            $toCreate[] = $item;
                        }
                    }
                }
                
                // Process bulk operations
                $created = $this->bulkCreateSuppliers($toCreate, $user->id);
                $updated = $this->bulkUpdateSuppliers($toUpdate, $user->id);
                $deleted = $this->bulkDeleteSuppliers($toDelete, $user->id);
                
                $results['created']['supplier'] = $created;
                $results['updated']['supplier'] = $updated;
                $results['deleted']['supplier'] = $deleted;
                $results['conflicts']['supplier'] = $conflicts;
            }

            // Process supplier_products second (depends on suppliers) - using individual for now due to complexity
            if (isset($data['supplier_product'])) {
                $items = $data['supplier_product'];
                Log::info("SyncController::merge - Processing entityType: supplier_product", ['items_count' => count($items)]);
                
                foreach ($items as $item) {
                    $result = $this->processItem('supplier_product', $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created']['supplier_product'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id']];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['supplier_product'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id'] ?? null];
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
                    // Validate account_id exists before processing
                    $accountId = $item['account_id'] ?? null;
                    if ($accountId && !isset($item['_deleted'])) {
                        $accountExists = Account::where('id', $accountId)->exists();
                        if (!$accountExists) {
                            Log::warning("SyncController::merge - Skipping budget_provider: account_id {$accountId} does not exist", ['sync_id' => $item['id'] ?? 'unknown']);
                            $results['conflicts']['budget_provider'][] = [
                                'sync_id' => $item['id'] ?? 'unknown',
                                'message' => "Account with ID {$accountId} does not exist. Please sync accounts first.",
                                'client_data' => $item,
                            ];
                            continue;
                        }
                    }

                    $result = $this->processItem('budget_provider', $item, $user->id);
                    $syncId = $result['sync_id'];
                    
                    // Get the real MySQL ID after creating/updating - prefer ID from result
                    $providerId = $result['id'] ?? null;
                    if (!$providerId) {
                        // Fallback: query for existing budget_provider
                        $budgetProvider = BudgetProvider::where('sync_id', $syncId)->first();
                        if ($budgetProvider) {
                            $providerId = $budgetProvider->id;
                        }
                    }
                    
                    if ($result['status'] === 'created') {
                        $results['created']['budget_provider'][] = ['sync_id' => $syncId, 'id' => $providerId];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['budget_provider'][] = ['sync_id' => $syncId, 'id' => $providerId];
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
                            Log::info("SyncController::merge - Processing product", [
                                'product_keys' => array_keys($product),
                                'supplier_product_id' => $product['supplier_product_id'] ?? $product['supplierProductId'] ?? 'NOT SET',
                                'sync_id' => $product['sync_id'] ?? 'NOT SET',
                                'product_name' => $product['product_name'] ?? $product['productName'] ?? 'NOT SET',
                            ]);
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
                                $results['created']['budget_provider_product'][] = ['sync_id' => $productResult['sync_id'], 'id' => $productResult['id']];
                            } elseif ($productResult['status'] === 'updated') {
                                $results['updated']['budget_provider_product'][] = ['sync_id' => $productResult['sync_id'], 'id' => $productResult['id'] ?? null];
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
                    // Ignorar productos sin budget_provider_id (no deberían existir, los productos van dentro de budget_provider)
                    if (empty($item['budget_provider_id'])) {
                        Log::debug("Skipping orphan budget_provider_product without budget_provider_id", ['item' => $item]);
                        continue;
                    }
                    
                    $result = $this->processItem('budget_provider_product', $item, $user->id);
                    
                    if ($result['status'] === 'created') {
                        $results['created']['budget_provider_product'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id']];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated']['budget_provider_product'][] = ['sync_id' => $result['sync_id'], 'id' => $result['id'] ?? null];
                    } elseif ($result['status'] === 'deleted') {
                        $results['deleted']['budget_provider_product'][] = $result['sync_id'];
                    } elseif ($result['status'] === 'conflict') {
                        $results['conflicts']['budget_provider_product'][] = $result;
                    }
                }
            }

            // Process remaining entity types
            foreach ($data as $entityType => $items) {
                if ($entityType === 'account' || $entityType === 'supplier' || $entityType === 'supplier_product' || 
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
                        $results['created'][$entityType][] = ['sync_id' => $result['sync_id'], 'id' => $result['id']];
                    } elseif ($result['status'] === 'updated') {
                        $results['updated'][$entityType][] = ['sync_id' => $result['sync_id'], 'id' => $result['id'] ?? null];
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
        $userId = $user->id;

        // Use cache for full sync data (30 minutes cache)
        $cacheKey = "full_sync_user_{$userId}";
        
        $formatted = Cache::remember($cacheKey, 1800, function() use ($userId) {
            // Preload suppliers to cache their products and avoid N+1 queries
            $suppliers = Supplier::forUser($userId)->active()->get(['id', 'sync_id', 'name']);
            $supplierSyncIds = $suppliers->pluck('sync_id')->toArray();
            
            // Cache supplier products grouped by supplier_id
            $supplierProductsCache = [];
            if (!empty($supplierSyncIds)) {
                $products = SupplierProduct::whereIn('supplier_id', $supplierSyncIds)
                    ->where('status', 'active')
                    ->get(['id', 'supplier_id', 'name', 'price', 'image_base64', 'sync_id']);
                
                foreach ($products as $product) {
                    $supplierProductsCache[$product->supplier_id][] = $product;
                }
            }

            // Load data with eager loading for relationships and field selectivity
            $data = [
                'accounts' => Account::forUser($userId)->active()
                    ->get(['id', 'sync_id', 'user_id', 'name', 'status', 'updated_at']),
                'budget_providers' => BudgetProvider::forUser($userId)->active()
                    ->with(['account:id,name'])
                    ->get(['id', 'sync_id', 'user_id', 'account_id', '_supplier_id', '_supplier_name', 'name', 'status', 'updated_at']),
                'budget_provider_products' => BudgetProviderProduct::forUser($userId)->active()
                    ->with(['budgetProvider:id,name', 'supplierProduct:id,name,price'])
                    ->get(['id', 'sync_id', 'user_id', 'budget_provider_id', 'supplier_product_id', 'product_name', 'product_price', 'quantity', 'status', 'updated_at']),
                'budget_entries' => BudgetEntry::forUser($userId)->active()
                    ->with(['account:id,name'])
                    ->get(['id', 'sync_id', 'user_id', 'account_id', 'date', 'amount', 'name', 'payment_type', 'entry_type', 'supplier_id', 'supplier_name', 'status', 'updated_at']),
                'suppliers' => $suppliers,
                'supplier_products' => SupplierProduct::forUser($userId)->active()
                    ->get(['id', 'sync_id', 'user_id', 'supplier_id', 'name', 'price', 'status', 'updated_at']),
                'templates' => Template::forUser($userId)->active()
                    ->get(['id', 'sync_id', 'user_id', 'name', 'status', 'updated_at']),
            ];

            $formatted = [];
            foreach ($data as $entityType => $items) {
                $formatted[$entityType] = $items->map(fn($item) => $this->formatItem($entityType, $item, $supplierProductsCache))->toArray();
            }
            
            return $formatted;
        });

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

    private function formatItem(string $entityType, $item, array $supplierProductsCache = []): array
    {
        Log::info("formatItem - entityType: " . $entityType);
        $data = $item->toArray();
        $data['id'] = $item->sync_id;
        $data['id_server'] = $item->id; // Include server's primary key ID
        unset($data['sync_id'], $data['user_id'], $data['deleted_at']);

        // Include supplier products with their IDs for supplier entity
        if ($entityType === 'suppliers') {
            // Use cached supplier products to avoid N+1 query
            Log::info("formatItem - supplier sync_id: " . $item->sync_id);
            $supplierProducts = $supplierProductsCache[$item->sync_id] ?? [];

            Log::info("formatItem - supplier products count: " . count($supplierProducts));

            // Map products to include 'sync_id' field (use supplier_product's id if no sync_id)
            $data['products'] = array_map(function($product) {
                return [
                    'sync_id' => $product->sync_id ?? $product->id,
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'imageBase64' => $product->image_base64,
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

            // If creating a budget_provider_product, ensure supplier_product_id is the
            // real MySQL PK from supplier_products table. The client may send a
            // sync_id (string) or the real id; normalize to the real id here.
            if ($entityType === 'budget_provider_product' && isset($createData['supplier_product_id'])) {
                $spId = $createData['supplier_product_id'];
                // If it's not numeric, try to resolve by sync_id
                if (!is_numeric($spId)) {
                    $sp = SupplierProduct::where('sync_id', $spId)->first();
                    if ($sp) {
                        $createData['supplier_product_id'] = $sp->id;
                    } else {
                        // As a fallback, try by id (in case client sent stringified numeric)
                        $createData['supplier_product_id'] = is_numeric($spId) ? (int)$spId : null;
                    }
                } else {
                    $createData['supplier_product_id'] = (int)$spId;
                }
            }

            $created = $modelClass::create($createData);
            $this->updateSyncMetadata($entityType, $syncId, 'synced', $userId);
            return ['status' => 'created', 'sync_id' => $syncId, 'id' => $created->id];
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
