<?php

use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;

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

test('the meta tag carries the session\'s real csrf token, not an arbitrary string', function () {
    // NOTE: Laravel's VerifyCsrfToken middleware short-circuits whenever
    // runningUnitTests() is true, so a feature test cannot prove that a request is
    // rejected without a token — a deliberately wrong token still returns 200.
    // What is testable, and what actually regressed, is that the tag exists and
    // holds the session token the frontend needs. End-to-end rejection was verified
    // against a running server instead.
    $user = User::factory()->create();

    ClassModel::create([
        'id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A', 'wali_kelas' => 'Ustadz Test',
    ]);
    Student::forceCreate([
        'id' => 'std_7a_1', 'nis' => '1001', 'name' => 'Ahmad', 'gender' => 'L', 'class_id' => '7A',
    ]);

    $html = $this->actingAs($user)->get('/hafalan')->getContent();
    preg_match('/<meta name="csrf-token" content="([^"]+)">/', $html, $m);

    expect($m[1] ?? null)->not->toBeNull();
    expect($m[1])->toBe(csrf_token());
    expect(strlen($m[1]))->toBe(40);
});
