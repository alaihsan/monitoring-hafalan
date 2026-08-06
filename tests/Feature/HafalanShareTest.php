<?php

use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\URL;

beforeEach(function () {
    ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    ClassModel::create([
        'id' => '8B',
        'name' => 'Kelas 8B',
        'grade' => 8,
        'section' => 'B',
        'wali_kelas' => 'Ustadz Lain',
    ]);

    Student::create([
        'id' => 'std_7a_1',
        'nisn' => '0081234',
        'name' => 'Ahmad Fulan',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    Student::create([
        'id' => 'std_8b_1',
        'nisn' => '0089999',
        'name' => 'Siswa Kelas Lain',
        'gender' => 'P',
        'class_id' => '8B',
    ]);
});

test('an unsigned share url is rejected', function () {
    $this->get('/share/hafalan/7A')->assertForbidden();
});

test('a share url with a tampered class is rejected', function () {
    $signed = URL::temporarySignedRoute('hafalan.share', now()->addDays(7), ['class' => '7A']);

    // Swap the class out while keeping the signature that was issued for 7A.
    $this->get(str_replace('/share/hafalan/7A', '/share/hafalan/8B', $signed))
        ->assertForbidden();
});

test('an expired share url is rejected and renders the expired page', function () {
    $signed = URL::temporarySignedRoute('hafalan.share', now()->addMinute(), ['class' => '7A']);

    $this->travel(2)->minutes();

    $response = $this->get($signed);

    $response->assertForbidden();
    $response->assertInertia(fn ($page) => $page->component('hafalan/share-expired'));
});

test('a valid signed share url exposes only the shared class', function () {
    $signed = URL::temporarySignedRoute('hafalan.share', now()->addDays(7), ['class' => '7A']);

    $response = $this->get($signed);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('hafalan/share')
        ->where('shareClass.id', '7A')
        ->has('initialStudents', 1)
        ->where('initialStudents.0.id', 'std_7a_1')
        ->has('initialProgress')
        ->has('initialSettings')
    );

    // The other class and its students must not leak into the public payload.
    $response->assertDontSee('Siswa Kelas Lain');
    $response->assertDontSee('0089999');
});

test('the public share payload never carries a class share token', function () {
    $signed = URL::temporarySignedRoute('hafalan.share', now()->addDays(7), ['class' => '7A']);

    $this->get($signed)
        ->assertInertia(fn ($page) => $page->missing('initialClasses'))
        ->assertDontSee('shareToken');
});

test('only an authenticated admin can mint a share link', function () {
    $this->postJson('/api/hafalan/classes/7A/share-link', ['duration' => '7d'])
        ->assertUnauthorized();

    $response = $this->actingAs(User::factory()->create())
        ->postJson('/api/hafalan/classes/7A/share-link', ['duration' => '7d']);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    // The minted link must actually work.
    $this->get($response->json('url'))->assertOk();
});

test('minting a share link rejects an unknown duration', function () {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/hafalan/classes/7A/share-link', ['duration' => 'forever-and-ever'])
        ->assertStatus(422);
});

test('admin can toggle student verse memorization progress in database', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1',
            'surahId' => 'al-mursalat',
            'verseNum' => 1,
            'surahName' => 'Al-Mursalat',
        ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('hafalan_progress', [
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 1,
    ]);

    // Uncheck verse
    $this->actingAs($user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1',
            'surahId' => 'al-mursalat',
            'verseNum' => 1,
            'surahName' => 'Al-Mursalat',
        ])
        ->assertOk();

    $this->assertDatabaseMissing('hafalan_progress', [
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 1,
    ]);
});
