<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckinApiKey
{
    /**
     * Let a scanning device authenticate with a shared X-Api-Key instead
     * of a logged-in Sanctum session (spec §6). A valid key is flagged on
     * the request; otherwise the request falls through to normal
     * Sanctum authentication.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $configured = config('services.checkin.api_key');
        $provided = $request->header('X-Api-Key');

        if ($provided !== null) {
            if (! $configured || ! hash_equals($configured, $provided)) {
                return response()->json(['message' => 'Invalid API key.'], 401);
            }

            $request->attributes->set('api_key_authenticated', true);

            return $next($request);
        }

        if (! auth('sanctum')->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        auth()->shouldUse('sanctum');

        return $next($request);
    }
}
