<?php

namespace App\Http\Controllers;

use App\Models\SystemTestDatum;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class SystemTestController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'app_env' => config('app.env'),
            'app_debug' => config('app.debug'),
            'app_url' => config('app.url'),
            'laravel' => app()->version(),
            'php' => PHP_VERSION,
            'db' => 'fail',
            'seed_data' => null,
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            DB::connection()->getPdo();
            $checks['db'] = 'ok';

            $seed = SystemTestDatum::where('key', 'healthcheck')->first();
            $checks['seed_data'] = $seed ? $seed->only(['key', 'value', 'updated_at']) : null;
        } catch (Throwable $e) {
            $checks['db'] = 'fail';
            $checks['db_error'] = $e->getMessage();
        }

        $healthy = $checks['db'] === 'ok' && $checks['seed_data'] !== null;

        return response()->json($checks, $healthy ? 200 : 503);
    }
}
