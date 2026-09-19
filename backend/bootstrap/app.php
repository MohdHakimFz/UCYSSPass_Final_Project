<?php

use App\Http\Middleware\CheckinApiKey;
use App\Http\Middleware\LogApiRequests;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API-only app: never redirect unauthenticated requests to a "login" route.
        $middleware->redirectGuestsTo(fn () => null);

        // A general ceiling for the whole API (the 'api' limiter in AppServiceProvider); a few routes have tighter limits of their own.
        $middleware->throttleApi();

        $middleware->api(append: [LogApiRequests::class]);

        $middleware->alias(['checkin.auth' => CheckinApiKey::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        // Consistent error shape for every API failure: {"message": "..."} (+ "errors" on 422).
        $exceptions->render(fn (AuthenticationException $e) => response()->json(['message' => $e->getMessage() ?: 'Unauthenticated.'], 401));

        $exceptions->render(fn (AuthorizationException|AccessDeniedHttpException $e) => response()->json(['message' => 'This action is unauthorized.'], 403));

        $exceptions->render(fn (ModelNotFoundException|NotFoundHttpException $e) => response()->json(['message' => 'Resource not found.'], 404));

        $exceptions->render(fn (TooManyRequestsHttpException $e) => response()->json(
            ['message' => 'Too many requests. Please slow down.'],
            429,
            $e->getHeaders()
        ));

        // Anything else unexpected: never leak traces/paths to API clients (details stay in the log).
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            if ($e instanceof ValidationException || $e instanceof HttpExceptionInterface || method_exists($e, 'render')) {
                return null;
            }

            return response()->json(['message' => 'Server error.'], 500);
        });
    })->create();
