<?php

use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;

const TEST_API_KEY = 'kunci-uji-yang-cukup-panjang-untuk-lolos-minimum-32';

beforeEach(function () {
    config(['hafalan.api_key' => TEST_API_KEY]);

    ClassModel::create([
        'id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A', 'wali_kelas' => 'Ustadz Wali',
    ]);

    Student::forceCreate([
        'id' => 'std_a', 'nis' => '1001', 'name' => 'Ahmad Fulan', 'gender' => 'L', 'class_id' => '7A',
    ]);

    foreach ([1, 2, 3] as $v) {
        HafalanProgress::create(['student_id' => 'std_a', 'surah_id' => 'al-mursalat', 'verse_num' => $v]);
    }
});

// --- The problem this endpoint solves ------------------------------------------------

test('a valid api key returns the full hafalan progress, not just the name', function () {
    $response = $this->withHeader('X-Api-Key', TEST_API_KEY)
        ->getJson('/api/v1/students/1001');

    $response->assertOk();

    // Identity...
    expect($response->json('student.name'))->toBe('Ahmad Fulan');
    expect($response->json('student.nis'))->toBe('1001');
    expect($response->json('student.className'))->toBe('Kelas 7A');

    // ...and, crucially, the setoran ayat that was previously missing.
    expect($response->json('progress.al-mursalat'))->toBe([1, 2, 3]);

    $mursalat = collect($response->json('summary.surahStats'))->firstWhere('surahId', 'al-mursalat');
    expect($mursalat['completedVerses'])->toBe(3);
    expect($mursalat['totalVerses'])->toBe(50);
    expect($response->json('summary.totalVersesCompleted'))->toBe(3);
});

test('the student can also be fetched by internal id', function () {
    $this->withHeader('X-Api-Key', TEST_API_KEY)
        ->getJson('/api/v1/students/std_a')
        ->assertOk()
        ->assertJsonPath('student.nis', '1001');
});

test('an unknown student returns 404 rather than an empty success', function () {
    $this->withHeader('X-Api-Key', TEST_API_KEY)
        ->getJson('/api/v1/students/9999')
        ->assertNotFound()
        ->assertJsonPath('success', false);
});

// --- Key enforcement ------------------------------------------------------------------

test('a request without an api key is rejected', function () {
    $this->getJson('/api/v1/students/1001')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'API key tidak valid.');
});

test('a wrong api key is rejected', function () {
    $this->withHeader('X-Api-Key', 'kunci-salah-tapi-panjangnya-sama-persis-supaya-adil')
        ->getJson('/api/v1/students/1001')
        ->assertUnauthorized();
});

test('a session cookie alone does not open the machine api', function () {
    // The key is the only accepted credential here, so an admin's browser session
    // must not be a second way in.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/students/1001')
        ->assertUnauthorized();
});

// --- Fail closed ----------------------------------------------------------------------

test('an unset key refuses everyone instead of making the data public', function (?string $key) {
    config(['hafalan.api_key' => $key]);

    // Even a caller sending nothing must not get data through.
    $this->getJson('/api/v1/students/1001')->assertStatus(503);

    // And neither can a caller who somehow guesses the placeholder.
    $this->withHeader('X-Api-Key', (string) $key)
        ->getJson('/api/v1/students/1001')
        ->assertStatus(503);
})->with([
    'null' => null,
    'empty' => '',
    'too short to be a real secret' => 'rahasia',
]);

// --- Read-only surface -----------------------------------------------------------------

test('the machine api exposes no write endpoints', function (string $method, string $uri) {
    $response = $this->withHeader('X-Api-Key', TEST_API_KEY)->json($method, $uri, []);

    // 404 where no route exists, 405 where the URI exists but only for GET. Either
    // way the call is refused; what matters is that nothing was written.
    expect($response->status())->toBeIn([404, 405]);

    expect(Student::count())->toBe(1);
    expect(HafalanProgress::count())->toBe(3);
})->with([
    ['POST', '/api/v1/students'],
    ['DELETE', '/api/v1/students/std_a'],
    ['POST', '/api/v1/toggle-verse'],
    ['POST', '/api/v1/reset-all'],
    ['GET', '/api/v1/export'],
]);

test('the session-based admin api still rejects an api key', function () {
    // The web endpoints are unchanged: a key is not a substitute for logging in.
    $this->withHeader('X-Api-Key', TEST_API_KEY)
        ->getJson('/api/hafalan/students/1001')
        ->assertUnauthorized();
});
