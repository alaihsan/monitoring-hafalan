<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public share route with rate limiting (30 requests/min per IP)
Route::get('/share/hafalan', function () {
    return Inertia::render('hafalan/share');
})->middleware(['throttle:30,1'])->name('hafalan.share');

// Protected admin routes requiring login & rate-limited (60 requests/min)
Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::get('/', function () {
        return Inertia::render('hafalan/index');
    })->name('home');

    Route::get('/hafalan', function () {
        return Inertia::render('hafalan/index');
    })->name('hafalan');

    Route::get('/dashboard', function () {
        return Inertia::render('hafalan/index');
    })->name('dashboard');

    Route::get('/hafalan/settings', function () {
        return Inertia::render('hafalan/settings');
    })->name('hafalan.settings');

    Route::get('/hafalan/history', function () {
        return Inertia::render('hafalan/history');
    })->name('hafalan.history');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
