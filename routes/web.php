<?php

use App\Http\Controllers\HafalanController;
use Illuminate\Support\Facades\Route;

// Public read-only report for ONE class. The `signed` middleware verifies the URL
// signature and its expiry before the controller runs, so an unsigned, tampered or
// expired link never reaches the data. Links are issued by api.hafalan.classes.share-link.
Route::get('/share/hafalan/{class}', [HafalanController::class, 'share'])
    ->middleware(['signed', 'throttle:30,1'])
    ->name('hafalan.share');

// Protected admin routes requiring login & rate-limited (60 requests/min)
Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::get('/', [HafalanController::class, 'index'])->name('home');
    Route::get('/hafalan', [HafalanController::class, 'index'])->name('hafalan');
    Route::get('/dashboard', [HafalanController::class, 'index'])->name('dashboard');
    Route::get('/hafalan/settings', [HafalanController::class, 'settings'])->name('hafalan.settings');
    Route::get('/hafalan/history', [HafalanController::class, 'history'])->name('hafalan.history');

    // API endpoints for DB sync
    Route::get('/api/hafalan/students/{idOrNisn}', [HafalanController::class, 'getStudentDetail'])->name('api.hafalan.students.detail');
    Route::post('/api/hafalan/toggle-verse', [HafalanController::class, 'toggleVerse'])->name('api.hafalan.toggle-verse');
    Route::post('/api/hafalan/toggle-column-verse', [HafalanController::class, 'toggleColumnVerse'])->name('api.hafalan.toggle-column-verse');
    Route::post('/api/hafalan/students', [HafalanController::class, 'saveStudent'])->name('api.hafalan.students.save');
    Route::delete('/api/hafalan/students/{id}', [HafalanController::class, 'deleteStudent'])->name('api.hafalan.students.delete');
    Route::post('/api/hafalan/students/import', [HafalanController::class, 'importStudents'])->name('api.hafalan.students.import');
    Route::post('/api/hafalan/classes/{class}/share-link', [HafalanController::class, 'createShareLink'])->name('api.hafalan.classes.share-link');
    Route::post('/api/hafalan/settings', [HafalanController::class, 'updateSettings'])->name('api.hafalan.settings.update');
    Route::post('/api/hafalan/classes/wali-kelas', [HafalanController::class, 'updateWaliKelas'])->name('api.hafalan.classes.wali-kelas');

    // Destructive endpoints. Each additionally re-verifies the current user's password
    // in the controller (see ProfileController::destroy for the same pattern).
    Route::post('/api/hafalan/classes/clear', [HafalanController::class, 'clearClassData'])->name('api.hafalan.classes.clear');
    Route::post('/api/hafalan/reset-all', [HafalanController::class, 'clearAllData'])->name('api.hafalan.reset-all');
    Route::post('/api/hafalan/history/clear', [HafalanController::class, 'clearHistory'])->name('api.hafalan.history.clear');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
