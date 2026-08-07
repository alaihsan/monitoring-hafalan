<?php

use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;

test('admin can clear class data deleting students and progress history', function () {
    $user = User::factory()->create();

    $class7A = ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    $student1 = Student::forceCreate([
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
        ->postJson('/api/hafalan/classes/clear', [
            'classId' => '7A',
            'password' => 'password',
        ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseMissing('students', ['id' => 'std_7a_1']);
    $this->assertDatabaseMissing('hafalan_progress', ['student_id' => 'std_7a_1']);
});
