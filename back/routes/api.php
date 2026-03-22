<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\AttachmentController;
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
    Route::get('/attachments/{attachmentId}/download', [AttachmentController::class, 'download']);
    Route::delete('/attachments/{attachmentId}', [AttachmentController::class, 'destroy']);
});
