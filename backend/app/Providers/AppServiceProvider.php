<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Every API request counts against the signed-in person, or the address for a visitor. Generous enough for screens that
        // refresh every few seconds, tight enough to stop a script hammering the API.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute((int) config('sentrypass.api_rate_limit'))
            ->by($request->user()?->id ? 'user:'.$request->user()->id : 'ip:'.$request->ip()));
    }
}
