<?php

use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();

    foreach ([['7A', 7, 'A'], ['8B', 8, 'B']] as [$id, $grade, $section]) {
        ClassModel::create([
            'id' => $id, 'name' => "Kelas {$id}", 'grade' => $grade,
            'section' => $section, 'wali_kelas' => 'Ustadz Test',
        ]);
    }

    Student::forceCreate([
        'id' => 'std_7a_1', 'nis' => '1001', 'name' => 'Siswa 7A', 'gender' => 'L', 'class_id' => '7A',
    ]);
    Student::forceCreate([
        'id' => 'std_8b_1', 'nis' => '2001', 'name' => 'Siswa 8B', 'gender' => 'P', 'class_id' => '8B',
    ]);

    HafalanProgress::create(['student_id' => 'std_7a_1', 'surah_id' => 'al-mursalat', 'verse_num' => 1]);
    HafalanProgress::create(['student_id' => 'std_8b_1', 'surah_id' => 'al-qiyamah', 'verse_num' => 1]);
});

test('the monitoring page loads only the selected class', function () {
    $this->actingAs($this->user)
        ->get('/hafalan?class=7A')
        ->assertInertia(fn ($page) => $page
            ->component('hafalan/index')
            ->where('currentClassId', '7A')
            ->has('initialStudents', 1)
            ->where('initialStudents.0.id', 'std_7a_1')
            // Progress is scoped to that class's students only.
            ->has('initialProgress.std_7a_1')
            ->missing('initialProgress.std_8b_1')
        );
});

test('an unknown class falls back to the first class rather than erroring', function () {
    $this->actingAs($this->user)
        ->get('/hafalan?class=tidak-ada')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('currentClassId', '7A'));
});

test('the class list still carries every class with its own student count', function () {
    $this->actingAs($this->user)
        ->get('/hafalan?class=7A')
        ->assertInertia(fn ($page) => $page
            ->has('initialClasses', 2)
            ->where('initialClasses.0.studentCount', 1)
            ->where('initialClasses.1.studentCount', 1)
        );
});

test('toggling a verse returns only the delta, not the whole progress table', function () {
    $response = $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'al-mursalat', 'verseNum' => 5,
        ]);

    $response->assertOk()->assertJson([
        'success' => true,
        'studentId' => 'std_7a_1',
        'surahId' => 'al-mursalat',
        'verseNum' => 5,
        'checked' => true,
    ]);

    // The heavyweight payloads are gone.
    $response->assertJsonMissingPath('progress');
    $response->assertJsonMissingPath('history');
});

test('untoggling reports checked=false', function () {
    $payload = ['studentId' => 'std_7a_1', 'surahId' => 'al-mursalat', 'verseNum' => 1];

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', $payload)
        ->assertJson(['checked' => false]);

    $this->assertDatabaseMissing('hafalan_progress', [
        'student_id' => 'std_7a_1', 'surah_id' => 'al-mursalat', 'verse_num' => 1,
    ]);
});

test('column toggle returns the affected students rather than every record', function () {
    $response = $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-column-verse', [
            'classId' => '7A', 'surahId' => 'al-mursalat', 'verseNum' => 2,
        ]);

    $response->assertOk()->assertJson([
        'success' => true,
        'classId' => '7A',
        'checked' => true,
        'studentIds' => ['std_7a_1'],
    ]);
    $response->assertJsonMissingPath('progress');
});

test('the backup export is built from the database, not the browser cache', function () {
    $response = $this->actingAs($this->user)->getJson('/api/hafalan/export');

    $response->assertOk();
    expect($response->json('students'))->toHaveCount(2);
    // Progress for both classes is present, which a browser-cache export could miss.
    expect($response->json('progress.std_7a_1.al-mursalat'))->toBe([1]);
    expect($response->json('progress.std_8b_1.al-qiyamah'))->toBe([1]);
    expect($response->json('exportedAt'))->not->toBeNull();
});

test('the backup export requires authentication', function () {
    $this->getJson('/api/hafalan/export')->assertUnauthorized();
});
