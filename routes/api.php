<?php

use App\Http\Controllers\HafalanController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Machine-to-machine API
|--------------------------------------------------------------------------
|
| Stateless, read-only, and authenticated with the X-Api-Key header rather than
| a browser session (see App\Http\Middleware\VerifyApiKey). The session-based
| endpoints in routes/web.php stay as they are — this group exists so an external
| dashboard can read progress without holding a login cookie.
|
| Deliberately read-only: a shared static key is fine for reading, but not
| something that should be able to modify or delete student records.
|
*/
Route::middleware(['apikey', 'throttle:60,1'])->prefix('v1')->group(function () {
    Route::get('/surahs', [HafalanController::class, 'getSurahsCatalog'])
        ->name('api.v1.surahs');

    Route::get('/classes', [HafalanController::class, 'getClasses'])
        ->name('api.v1.classes');

    Route::get('/classes/{class}/progress', [HafalanController::class, 'getClassProgress'])
        ->name('api.v1.classes.progress');

    Route::get('/students/{idOrNis}', [HafalanController::class, 'getStudentDetail'])
        ->name('api.v1.students.detail');
});
