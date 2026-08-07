<?php

use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\URL;

test('api returns detailed student info and hafalan progress by id or nis', function () {
    $this->actingAs(User::factory()->create());

    $class = ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => 'Ustadz Test',
    ]);

    $student = Student::forceCreate([
        'id' => 'std_7a_1',
        'nis' => '008123456',
        'name' => 'Ahmad Fulan',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    HafalanProgress::create([
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 1,
    ]);

    HafalanProgress::create([
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 2,
    ]);

    // Test lookup by student ID
    $response = $this->getJson('/api/hafalan/students/std_7a_1');
    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'student' => [
            'id' => 'std_7a_1',
            'nis' => '008123456',
            'name' => 'Ahmad Fulan',
            'className' => 'Kelas 7A',
        ],
        'progress' => [
            'al-mursalat' => [1, 2],
        ],
        'summary' => [
            'totalVersesCompleted' => 2,
        ],
    ]);

    // Test lookup by NIS
    $responseNis = $this->getJson('/api/hafalan/students/008123456');
    $responseNis->assertOk();
    $responseNis->assertJson(['success' => true]);

    // Test 404 for non-existent student
    $responseNotFound = $this->getJson('/api/hafalan/students/invalid_id');
    $responseNotFound->assertNotFound();
});

test('student detail api is not reachable by guests', function () {
    // Auth is enforced before any lookup happens, so no fixtures are needed here.
    $this->getJson('/api/hafalan/students/008123456')->assertUnauthorized();
    $this->getJson('/api/hafalan/students/std_7a_1')->assertUnauthorized();
});

test('signed share api returns student progress only for the shared class', function () {
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
        'wali_kelas' => 'Ustadzah Test',
    ]);

    Student::forceCreate([
        'id' => 'std_7a_1',
        'nis' => '008123456',
        'name' => 'Ahmad Fulan',
        'gender' => 'L',
        'class_id' => '7A',
    ]);

    Student::forceCreate([
        'id' => 'std_8b_1',
        'nis' => '008654321',
        'name' => 'Fatimah',
        'gender' => 'P',
        'class_id' => '8B',
    ]);

    HafalanProgress::create([
        'student_id' => 'std_7a_1',
        'surah_id' => 'al-mursalat',
        'verse_num' => 3,
    ]);

    $url = URL::temporarySignedRoute(
        'hafalan.share.students.detail',
        now()->addDay(),
        ['class' => '7A', 'idOrNis' => '008123456']
    );

    $this->getJson($url)
        ->assertOk()
        ->assertJson([
            'success' => true,
            'student' => [
                'id' => 'std_7a_1',
                'nis' => '008123456',
                'name' => 'Ahmad Fulan',
                'className' => 'Kelas 7A',
            ],
            'progress' => [
                'al-mursalat' => [3],
            ],
        ]);

    $wrongClassUrl = URL::temporarySignedRoute(
        'hafalan.share.students.detail',
        now()->addDay(),
        ['class' => '7A', 'idOrNis' => '008654321']
    );

    $this->getJson($wrongClassUrl)->assertNotFound();
    $this->getJson('/share/hafalan/7A/students/008123456')->assertForbidden();
});
