<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\BudgetEntryController;
use App\Http\Controllers\BudgetEntryGroupController;
use App\Http\Controllers\BudgetProviderController;
use App\Http\Controllers\BudgetProviderProductController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\RecurringRecordController;
use App\Http\Controllers\RecurringRecordProductController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierProductController;
use App\Http\Controllers\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Rutas protegidas (autenticación via SSO OAuth2 + JWT)
Route::middleware(['sso.auth', 'sso.user'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::middleware(['throttle:30,1', 'sync.version'])->group(function () {
        Route::get('/sync/changes', [SyncController::class, 'getChanges']);
        Route::post('/sync/merge', [SyncController::class, 'merge']);
        Route::get('/sync/full', [SyncController::class, 'fullSync']);
        Route::post('/sync/resolve-conflict', [SyncController::class, 'resolveConflict']);
        Route::post('/sync/resolve-conflicts-batch', [SyncController::class, 'resolveConflictsBatch']);
        Route::get('/sync/conflicts', [SyncController::class, 'getResolvedConflicts']);
        Route::get('/sync/active-conflicts', [SyncController::class, 'getActiveConflicts']);
        Route::get('/sync/merge-status/{jobId}', [SyncController::class, 'mergeStatus']);
    });

    Route::middleware(['sync.version'])->group(function () {
        Route::get('/metrics', MetricsController::class);
        Route::get('/sync/health', HealthController::class);
    });

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
    Route::get('/supplier-products/{id}/image', [SupplierProductController::class, 'image']);
    Route::apiResource('supplier-products', SupplierProductController::class);
    Route::apiResource('recurring-records', RecurringRecordController::class);
    Route::apiResource('recurring-record-products', RecurringRecordProductController::class);
});
