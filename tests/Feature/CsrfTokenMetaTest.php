<?php

use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

/**
 * Every hafalan write is a raw fetch() that reads <meta name="csrf-token"> for its
 * X-CSRF-TOKEN header. The tag was missing from the root template, so the header went
 * out empty and Laravel rejected each of those requests with 419 — writes never
 * reached the database. These tests pin the tag in place.
 */
test('the root template exposes a csrf token meta tag', function () {
    $response = $this->get('/login');

    $response->assertOk();
    $response->assertSee('name="csrf-token"', false);
    expect($response->getContent())->toMatch('/<meta name="csrf-token" content="[^"]{10,}">/');
});

test('a write using only the csrf meta token is accepted', function () {
    $user = User::factory()->create();

    ClassModel::create([
        'id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A', 'wali_kelas' => 'Ustadz Test',
    ]);
    Student::forceCreate([
        'id' => 'std_7a_1', 'nis' => '1001', 'name' => 'Ahmad', 'gender' => 'L', 'class_id' => '7A',
    ]);

    // Read the token exactly the way the frontend does.
    $html = $this->actingAs($user)->get('/hafalan')->getContent();
    preg_match('/<meta name="csrf-token" content="([^"]+)">/', $html, $m);
    expect($m[1] ?? null)->not->toBeNull();

    // Post through the real CSRF middleware, which the test suite normally skips.
    $this->withMiddleware(VerifyCsrfToken::class);

    $this->actingAs($user)
        ->withHeader('X-CSRF-TOKEN', $m[1])
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1',
            'surahId' => 'al-mursalat',
            'verseNum' => 1,
        ])
        ->assertOk();
});
