<?php

use App\Models\ActivityLog;
use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\Student;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();

    ClassModel::create([
        'id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A', 'wali_kelas' => 'Ustadz Test',
    ]);

    $this->student = Student::forceCreate([
        'id' => 'std_7a_1', 'nis' => '1001', 'name' => 'Ahmad Fulan', 'gender' => 'L', 'class_id' => '7A',
    ]);
});

// --- D-1: referential integrity -------------------------------------------------

test('toggling a verse for a non-existent student is rejected, not a 500', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'tidak-ada',
            'surahId' => 'al-mursalat',
            'verseNum' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('studentId');

    expect(HafalanProgress::count())->toBe(0);
});

test('saving a student into a non-existent class is rejected', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '2002', 'name' => 'Siswa Baru', 'gender' => 'L', 'classId' => '9Z',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('classId');
});

// --- D-2: verse and surah must be real ------------------------------------------

test('an unknown surah id is rejected', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'surat-karangan', 'verseNum' => 1,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('surahId');
});

test('verse numbers outside the surah are rejected', function (int $verse) {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'al-muzzammil', 'verseNum' => $verse,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('verseNum');

    expect(HafalanProgress::count())->toBe(0);
})->with([
    'zero' => 0,
    'negative' => -5,
    // Al-Muzzammil has 20 verses.
    'past the end' => 21,
    'absurd' => 99999,
]);

test('a verse at the exact surah length is accepted', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'al-muzzammil', 'verseNum' => 20,
        ])
        ->assertOk();

    $this->assertDatabaseHas('hafalan_progress', ['surah_id' => 'al-muzzammil', 'verse_num' => 20]);
});

test('progress percentage can never exceed 100', function () {
    foreach (range(1, 20) as $verse) {
        HafalanProgress::create([
            'student_id' => 'std_7a_1', 'surah_id' => 'al-muzzammil', 'verse_num' => $verse,
        ]);
    }

    $response = $this->actingAs($this->user)->getJson('/api/hafalan/students/std_7a_1');

    $stats = collect($response->json('summary.surahStats'));
    expect($stats->pluck('percentage')->max())->toBeLessThanOrEqual(100);
    expect($stats->firstWhere('surahId', 'al-muzzammil')['percentage'])->toBe(100);
});

// --- D-3: NIS uniqueness ---------------------------------------------------------

test('a duplicate NIS is rejected', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '1001', 'name' => 'Siswa Kembar', 'gender' => 'P', 'classId' => '7A',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('nis');

    expect(Student::count())->toBe(1);
});

test('editing a student keeps its own NIS valid', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'id' => 'std_7a_1', 'nis' => '1001', 'name' => 'Ahmad Fulan Revisi', 'gender' => 'L', 'classId' => '7A',
        ])
        ->assertOk();

    expect($this->student->fresh()->name)->toBe('Ahmad Fulan Revisi');
});

// --- D-4/D-5: server-owned primary keys ------------------------------------------

test('a new student cannot be created under a caller-chosen id', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'id' => 'id-karangan', 'nis' => '3003', 'name' => 'Penyusup', 'gender' => 'L', 'classId' => '7A',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('id');

    expect(Student::count())->toBe(1);
});

test('creating a student mints a server-side id and never overwrites another student', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '4004', 'name' => 'Siswa Kedua', 'gender' => 'P', 'classId' => '7A',
        ])
        ->assertOk();

    expect(Student::count())->toBe(2);
    expect($this->student->fresh()->name)->toBe('Ahmad Fulan');

    $new = Student::where('nis', '4004')->first();
    expect($new->id)->not->toBe('std_7a_1')->and(strlen($new->id))->toBe(26); // ULID
});

// --- D-8: partial settings update -------------------------------------------------

test('updating one setting leaves the other intact', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/settings', [
            'schoolName' => 'MTs Al-Ihsan', 'quranTeacherName' => 'Ustadz Qori',
        ])
        ->assertOk();

    $response = $this->actingAs($this->user)
        ->postJson('/api/hafalan/settings', ['quranTeacherName' => 'Ustadz Baru'])
        ->assertOk();

    expect($response->json('settings.schoolName'))->toBe('MTs Al-Ihsan');
    expect($response->json('settings.quranTeacherName'))->toBe('Ustadz Baru');
});

// --- D-9: unknown class in wali kelas update --------------------------------------

test('updating wali kelas for an unknown class reports an error instead of silently succeeding', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/classes/wali-kelas', [
            'classes' => [['id' => '9Z', 'waliKelas' => 'Ustadz Hantu']],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('classes.0.id');
});

// --- D-12/D-15: length and batch caps ---------------------------------------------

test('an over-long student name is rejected by validation rather than the database', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '5005', 'name' => str_repeat('a', 500), 'gender' => 'L', 'classId' => '7A',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');
});

test('an oversized import batch is rejected', function () {
    $rows = collect(range(1, 501))->map(fn ($i) => [
        'nis' => (string) (90000 + $i), 'name' => "Siswa {$i}", 'gender' => 'L', 'classId' => '7A',
    ])->all();

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students/import', ['students' => $rows])
        ->assertStatus(422)
        ->assertJsonValidationErrors('students');
});

test('an import containing duplicate NIS rows is rejected', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students/import', ['students' => [
            ['nis' => '7007', 'name' => 'Satu', 'gender' => 'L', 'classId' => '7A'],
            ['nis' => '7007', 'name' => 'Dua', 'gender' => 'P', 'classId' => '7A'],
        ]])
        ->assertStatus(422);

    expect(Student::where('nis', '7007')->count())->toBe(0);
});

test('import requires an explicit gender rather than inventing one', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students/import', ['students' => [
            ['nis' => '8008', 'name' => 'Tanpa Gender', 'classId' => '7A'],
        ]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('students.0.gender');
});

test('re-importing the same NIS updates that student instead of duplicating', function () {
    $payload = ['students' => [
        ['nis' => '1001', 'name' => 'Ahmad Fulan Terbaru', 'gender' => 'L', 'classId' => '7A'],
    ]];

    $this->actingAs($this->user)->postJson('/api/hafalan/students/import', $payload)->assertOk();
    $this->actingAs($this->user)->postJson('/api/hafalan/students/import', $payload)->assertOk();

    expect(Student::where('nis', '1001')->count())->toBe(1);
    expect($this->student->fresh()->name)->toBe('Ahmad Fulan Terbaru');
});

// --- D-7: atomicity ----------------------------------------------------------------

test('a failed import leaves no partially written students', function () {
    $rows = [
        ['nis' => '6001', 'name' => 'Valid Satu', 'gender' => 'L', 'classId' => '7A'],
        ['nis' => '6002', 'name' => 'Kelas Salah', 'gender' => 'L', 'classId' => '9Z'],
    ];

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students/import', ['students' => $rows])
        ->assertStatus(422);

    expect(Student::where('nis', '6001')->exists())->toBeFalse();
});

// --- K-7: audit trail attribution ---------------------------------------------------

test('every action records which account performed it', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'al-mursalat', 'verseNum' => 3,
        ])
        ->assertOk();

    $log = ActivityLog::latest('id')->first();
    expect($log->user_id)->toBe($this->user->id);
    expect($log->logged_at)->not->toBeNull();
    expect($log->class_id)->toBe('7A');
});

test('progress is never written without a matching audit entry', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/toggle-verse', [
            'studentId' => 'std_7a_1', 'surahId' => 'al-mursalat', 'verseNum' => 1,
        ])
        ->assertOk();

    expect(HafalanProgress::count())->toBe(1);
    expect(ActivityLog::where('action', 'CHECKED')->count())->toBe(1);
});

// --- D-11: class-scoped log deletion by id, not display name -------------------------

test('clearing a class removes only that class\'s logs even after a rename', function () {
    ClassModel::create([
        'id' => '8B', 'name' => 'Kelas 8B', 'grade' => 8, 'section' => 'B', 'wali_kelas' => 'Ustadz Lain',
    ]);
    Student::forceCreate([
        'id' => 'std_8b_1', 'nis' => '9001', 'name' => 'Siswa 8B', 'gender' => 'L', 'class_id' => '8B',
    ]);

    foreach ([['std_7a_1', '7A'], ['std_8b_1', '8B']] as [$sid, $cid]) {
        $this->actingAs($this->user)->postJson('/api/hafalan/toggle-verse', [
            'studentId' => $sid, 'surahId' => 'al-mursalat', 'verseNum' => 1,
        ])->assertOk();
    }

    // Rename 7A after its logs were written; the old logs still carry class_id '7A'.
    ClassModel::where('id', '7A')->update(['name' => 'Kelas 7A Unggulan']);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/classes/clear', ['classId' => '7A', 'password' => 'password'])
        ->assertOk();

    expect(ActivityLog::where('class_id', '7A')->where('action', 'CHECKED')->count())->toBe(0);
    expect(ActivityLog::where('class_id', '8B')->where('action', 'CHECKED')->count())->toBe(1);
});

// --- D-17: recoverable individual deletion ------------------------------------------

test('deleting a student is recoverable and keeps their progress', function () {
    HafalanProgress::create([
        'student_id' => 'std_7a_1', 'surah_id' => 'al-mursalat', 'verse_num' => 1,
    ]);

    $this->actingAs($this->user)->deleteJson('/api/hafalan/students/std_7a_1')->assertOk();

    expect(Student::count())->toBe(0);
    expect(Student::withTrashed()->count())->toBe(1);
    expect(HafalanProgress::count())->toBe(1);
});

test('re-adding a deleted student by NIS restores them with their history', function () {
    HafalanProgress::create([
        'student_id' => 'std_7a_1', 'surah_id' => 'al-mursalat', 'verse_num' => 1,
    ]);

    $this->actingAs($this->user)->deleteJson('/api/hafalan/students/std_7a_1')->assertOk();

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '1001', 'name' => 'Ahmad Fulan', 'gender' => 'L', 'classId' => '7A',
        ])
        ->assertOk();

    expect(Student::count())->toBe(1);
    expect(Student::first()->id)->toBe('std_7a_1');
    expect(HafalanProgress::where('student_id', 'std_7a_1')->count())->toBe(1);
});

test('clearing a class purges students outright so their NIS can be reused', function () {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/classes/clear', ['classId' => '7A', 'password' => 'password'])
        ->assertOk();

    expect(Student::withTrashed()->count())->toBe(0);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/students', [
            'nis' => '1001', 'name' => 'Siswa Baru', 'gender' => 'L', 'classId' => '7A',
        ])
        ->assertOk();
});
