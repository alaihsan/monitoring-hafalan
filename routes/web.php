<?php

use App\Http\Controllers\HafalanController;
use Illuminate\Support\Facades\Route;

// Public share route with rate limiting (30 requests/min per IP)
Route::get('/share/hafalan', [HafalanController::class, 'share'])
    ->middleware(['throttle:30,1'])
    ->name('hafalan.share');

// Public API for single student details & hafalan progress
Route::get('/api/hafalan/students/{idOrNisn}', [HafalanController::class, 'getStudentDetail'])
    ->middleware(['throttle:60,1'])
    ->name('api.hafalan.students.detail');

// Protected admin routes requiring login & rate-limited (60 requests/min)
Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::get('/', [HafalanController::class, 'index'])->name('home');
    Route::get('/hafalan', [HafalanController::class, 'index'])->name('hafalan');
    Route::get('/dashboard', [HafalanController::class, 'index'])->name('dashboard');
    Route::get('/hafalan/settings', [HafalanController::class, 'settings'])->name('hafalan.settings');
    Route::get('/hafalan/history', [HafalanController::class, 'history'])->name('hafalan.history');

    // API endpoints for DB sync
    Route::post('/api/hafalan/toggle-verse', [HafalanController::class, 'toggleVerse'])->name('api.hafalan.toggle-verse');
    Route::post('/api/hafalan/toggle-column-verse', [HafalanController::class, 'toggleColumnVerse'])->name('api.hafalan.toggle-column-verse');
    Route::post('/api/hafalan/students', [HafalanController::class, 'saveStudent'])->name('api.hafalan.students.save');
    Route::delete('/api/hafalan/students/{id}', [HafalanController::class, 'deleteStudent'])->name('api.hafalan.students.delete');
    Route::post('/api/hafalan/students/import', [HafalanController::class, 'importStudents'])->name('api.hafalan.students.import');
    Route::post('/api/hafalan/classes/clear', [HafalanController::class, 'clearClassData'])->name('api.hafalan.classes.clear');
    Route::post('/api/hafalan/reset-all', [HafalanController::class, 'clearAllData'])->name('api.hafalan.reset-all');
    Route::post('/api/hafalan/history/clear', [HafalanController::class, 'clearHistory'])->name('api.hafalan.history.clear');
    Route::post('/api/hafalan/settings', [HafalanController::class, 'updateSettings'])->name('api.hafalan.settings.update');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
