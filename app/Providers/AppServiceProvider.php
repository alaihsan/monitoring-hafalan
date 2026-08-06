<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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
        // Every account here can read and modify the whole student body, so passwords
        // get stricter defaults than Laravel's baseline 8 characters.
        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(12)->letters()->numbers()->uncompromised()
            : Password::min(8));

        // Auto-create SQLite database file if specified and missing on Cloud Servers
        if (config('database.default') === 'sqlite') {
            $dbPath = config('database.connections.sqlite.database');
            if ($dbPath && $dbPath !== ':memory:' && ! file_exists($dbPath)) {
                @mkdir(dirname($dbPath), 0755, true);
                @touch($dbPath);
            }
        }
    }
}
