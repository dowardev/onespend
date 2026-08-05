<?php

namespace App\Http\Controllers;

use App\Models\SyncMetadata;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $databaseConnection = 'connected';
        $lastSuccessfulSync = null;

        try {
            DB::connection()->getPdo();

            $lastSync = SyncMetadata::forUser($request->user()->id)
                ->whereNotNull('server_updated_at')
                ->max('server_updated_at');
            $lastSuccessfulSync = $lastSync ? $lastSync : null;
        } catch (\Exception $e) {
            $databaseConnection = 'disconnected: '.$e->getMessage();
        }

        return response()->json([
            'database_connection' => $databaseConnection,
            'last_successful_sync' => $lastSuccessfulSync,
        ]);
    }
}
