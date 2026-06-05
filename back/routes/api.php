<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\BudgetEntryController;
use App\Http\Controllers\BudgetEntryGroupController;
use App\Http\Controllers\BudgetProviderController;
use App\Http\Controllers\BudgetProviderProductController;
use App\Http\Controllers\RecurringRecordController;
use App\Http\Controllers\RecurringRecordProductController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierProductController;
use App\Http\Controllers\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Rutas públicas
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::post('/register', [RegisteredUserController::class, 'store']);

// Rutas protegidas
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
    
    // Sync API
    Route::get('/sync/changes', [SyncController::class, 'getChanges']);
    Route::post('/sync/merge', [SyncController::class, 'merge']);
    Route::get('/sync/full', [SyncController::class, 'fullSync']);
    Route::post('/sync/resolve-conflict', [SyncController::class, 'resolveConflict']);

    // Attachments API
    Route::get('/budget-entries/{entryId}/attachments', [AttachmentController::class, 'index']);
    Route::post('/budget-entries/{entryId}/attachments', [AttachmentController::class, 'store']);
    Route::get('/budget-providers/{providerId}/attachments', [AttachmentController::class, 'providerIndex']);
    Route::post('/budget-providers/{providerId}/attachments', [AttachmentController::class, 'providerStore']);
    Route::get('/attachments/{attachmentId}/download', [AttachmentController::class, 'download']);
    Route::delete('/attachments/{attachmentId}', [AttachmentController::class, 'destroy']);
    Route::post('/attachments/batch-delete', [AttachmentController::class, 'batchDestroy']);

    // REST API
    Route::apiResource('accounts', AccountController::class);
    Route::apiResource('budget-entries', BudgetEntryController::class);
    Route::apiResource('budget-entry-groups', BudgetEntryGroupController::class);
    Route::apiResource('budget-providers', BudgetProviderController::class);
    Route::apiResource('budget-provider-products', BudgetProviderProductController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('supplier-products', SupplierProductController::class);
    Route::apiResource('recurring-records', RecurringRecordController::class);
    Route::apiResource('recurring-record-products', RecurringRecordProductController::class);
});
