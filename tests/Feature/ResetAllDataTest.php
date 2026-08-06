<?php

use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;

test('admin can reset all application data truncating students and progress', function () {
    $user = User::factory()->create();

    $class = ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    $student = Student::forceCreate([
        'id' => 'std_7a_1',
        'nis' => '0081234',
        'name' => 'Siswa 1',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    HafalanProgress::create([
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 1,
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/hafalan/reset-all', ['password' => 'password']);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseMissing('students', ['id' => 'std_7a_1']);
    $this->assertDatabaseMissing('hafalan_progress', ['student_id' => 'std_7a_1']);
});

test('resetting all data is rejected without the correct password', function () {
    $user = User::factory()->create();

    ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    Student::forceCreate([
        'id' => 'std_7a_1',
        'nis' => '0081234',
        'name' => 'Siswa 1',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    $this->actingAs($user)
        ->postJson('/api/hafalan/reset-all', ['password' => 'salah-password'])
        ->assertStatus(422);

    $this->actingAs($user)
        ->postJson('/api/hafalan/reset-all')
        ->assertStatus(422);

    $this->assertDatabaseHas('students', ['id' => 'std_7a_1']);
});

test('guests cannot reset application data', function () {
    $this->postJson('/api/hafalan/reset-all', ['password' => 'password'])
        ->assertUnauthorized();
});
