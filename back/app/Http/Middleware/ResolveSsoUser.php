<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use TuOrg\SsoServer\Client\SsoServerClient;

class ResolveSsoUser
{
    public function __construct(
        private readonly SsoServerClient $ssoClient,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $ssoUserId = $request->get('sso_user_id');

        if (!$ssoUserId) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $user = User::find($ssoUserId);

        if (!$user) {
            $ssoUser = $this->ssoClient->getUser();

            if ($ssoUser) {
                $user = User::firstOrCreate(
                    ['id' => $ssoUser->id],
                    [
                        'name' => $ssoUser->name ?? '',
                        'user' => $ssoUser->userName ?? '',
                        'email' => $ssoUser->email ?? '',
                        'password' => '',
                    ],
                );
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        return $next($request);
    }
}
