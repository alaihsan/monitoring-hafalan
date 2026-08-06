<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust proxies for SSL/HTTPS termination on Laravel Cloud & Load Balancers.
        // Trusting '*' means client-supplied X-Forwarded-For headers are taken at face
        // value, which lets an attacker rotate the apparent client IP and walk straight
        // through the per-IP throttles guarding the public share route. Set
        // TRUSTED_PROXIES to the load balancer's CIDR range in production.
        $middleware->trustProxies(at: match ($proxies = env('TRUSTED_PROXIES', '*')) {
            '*' => '*',
            default => explode(',', $proxies),
        });

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // A tampered or expired share link should land on a friendly explanation
        // rather than a bare 403 — but still without any student data attached.
        $exceptions->render(function (InvalidSignatureException $e, Request $request) {
            if ($request->routeIs('hafalan.share')) {
                return Inertia::render('hafalan/share-expired')
                    ->toResponse($request)
                    ->setStatusCode(403);
            }
        });
    })->create();
