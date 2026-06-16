<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SyncProtocolVersion
{
    private const SUPPORTED_VERSIONS = ['1', '2'];

    private const CURRENT_VERSION = '2';

    public function handle(Request $request, Closure $next): Response
    {
        $clientVersion = $request->header('X-Sync-Protocol-Version', '1');

        if (!in_array($clientVersion, self::SUPPORTED_VERSIONS, true)) {
            return response()->json([
                'error' => 'Unsupported sync protocol version',
                'supported_versions' => self::SUPPORTED_VERSIONS,
                'current_version' => self::CURRENT_VERSION,
            ], 400);
        }

        $response = $next($request);

        $response->headers->set('X-Sync-Protocol-Version', self::CURRENT_VERSION);
        $response->headers->set('X-Sync-Protocol-Versions-Supported', implode(', ', self::SUPPORTED_VERSIONS));

        return $response;
    }
}
