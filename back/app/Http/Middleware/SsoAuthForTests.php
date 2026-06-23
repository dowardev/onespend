<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SsoAuthForTests
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('sanctum')->check()) {
            $request->merge([
                'sso_user_id' => Auth::guard('sanctum')->id(),
            ]);
            return $next($request);
        }

        if (Auth::guard('web')->check()) {
            $request->merge([
                'sso_user_id' => Auth::guard('web')->id(),
            ]);
            return $next($request);
        }

        return response()->json(['message' => 'No autenticado'], 401);
    }
}
