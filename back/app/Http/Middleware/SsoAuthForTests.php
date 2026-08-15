<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SsoAuthForTests
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('web')->check()) {
            $request->merge([
                'sso_user_id' => Auth::guard('web')->id(),
            ]);

            return $next($request);
        }

        return response()->json(['message' => 'No autenticado'], 401);
    }
}
