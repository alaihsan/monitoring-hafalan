<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates machine-to-machine calls with a shared secret sent as X-Api-Key.
 *
 * The admin web app keeps using session auth; this exists so an external dashboard
 * can read data without a browser session.
 */
class VerifyApiKey
{
    /**
     * A key shorter than this is treated as "not configured" rather than accepted,
     * so a weak placeholder cannot quietly become the only thing guarding student data.
     */
    private const MIN_KEY_LENGTH = 32;

    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('hafalan.api_key', '');

        // Fail closed. If the key is unset on the server, the endpoint must refuse
        // everyone — never fall back to being publicly readable, which is exactly the
        // hole this API replaced.
        if (strlen($expected) < self::MIN_KEY_LENGTH) {
            return response()->json([
                'success' => false,
                'message' => 'API key belum dikonfigurasi di server (HAFALAN_API_KEY).',
            ], 503);
        }

        $provided = (string) ($request->header('X-Api-Key') ?? $request->query('api_key') ?? $request->query('key') ?? '');

        // hash_equals compares in constant time so the key cannot be recovered by
        // measuring how long a wrong guess takes.
        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'success' => false,
                'message' => 'API key tidak valid.',
            ], 401);
        }

        return $next($request);
    }
}
