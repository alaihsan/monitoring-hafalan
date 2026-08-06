<?php

use App\Models\User;

test('public registration screen is not reachable', function () {
    $this->get('/register')->assertNotFound();
});

test('public registration cannot create an account', function () {
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});

test('administrator can provision an account from the console', function () {
    $this->artisan('hafalan:create-user', [
        '--name' => 'Ustadz Fulan',
        '--email' => 'ustadz@sekolah.sch.id',
    ])
        ->expectsQuestion('Password', 'rahasia-sekali-2026')
        ->expectsQuestion('Ulangi password', 'rahasia-sekali-2026')
        ->assertSuccessful();

    expect(User::where('email', 'ustadz@sekolah.sch.id')->exists())->toBeTrue();
});
