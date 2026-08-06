<?php

use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;

test('public share page can be rendered without authentication', function () {
    $class = ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
        'share_token' => 'tok_7a_test',
    ]);

    Student::create([
        'id' => 'std_7a_1',
        'nisn' => '0081234',
        'name' => 'Ahmad Fulan',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    $response = $this->get('/share/hafalan?class=7A');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('hafalan/share')
        ->has('initialClasses')
        ->has('initialStudents')
        ->has('initialProgress')
        ->has('initialSettings')
    );
});

test('admin can toggle student verse memorization progress in database', function () {
    $user = User::factory()->create();

    $class = ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    $student = Student::create([
        'id' => 'std_7a_1',
        'nisn' => '0081234',
        'name' => 'Ahmad Fulan',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

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
    $response = $this->actingAs($user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1',
            'surahId' => 'al-mursalat',
            'verseNum' => 1,
            'surahName' => 'Al-Mursalat',
        ]);

    $response->assertOk();
    $this->assertDatabaseMissing('hafalan_progress', [
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 1,
    ]);
});
