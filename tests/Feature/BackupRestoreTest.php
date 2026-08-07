<?php

use App\Models\ActivityLog;
use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Ustadz Penguji']);

    foreach ([['7A', 7, 'A', 'Wali 7A'], ['8B', 8, 'B', 'Wali 8B']] as [$id, $grade, $section, $wali]) {
        ClassModel::create([
            'id' => $id, 'name' => "Kelas {$id}", 'grade' => $grade,
            'section' => $section, 'wali_kelas' => $wali,
        ]);
    }

    Student::forceCreate([
        'id' => 'std_a', 'nis' => '1001', 'name' => 'Ahmad Fulan', 'gender' => 'L', 'class_id' => '7A',
    ]);
    Student::forceCreate([
        'id' => 'std_b', 'nis' => '2002', 'name' => 'Siti Aisyah', 'gender' => 'P', 'class_id' => '8B',
    ]);

    foreach ([1, 2, 5] as $v) {
        HafalanProgress::create(['student_id' => 'std_a', 'surah_id' => 'al-mursalat', 'verse_num' => $v]);
    }
    HafalanProgress::create(['student_id' => 'std_b', 'surah_id' => 'al-qiyamah', 'verse_num' => 7]);

    SchoolSetting::updateOrCreate(['key' => 'school_name'], ['value' => 'MTs Al-Ihsan']);
    SchoolSetting::updateOrCreate(['key' => 'quran_teacher_name'], ['value' => 'Ustadz Qori']);

    // A real log entry, written through the app so it carries actor attribution.
    $this->actingAs($this->user)->postJson('/api/hafalan/toggle-verse', [
        'studentId' => 'std_a', 'surahId' => 'al-insan', 'verseNum' => 3,
    ])->assertOk();
});

function backupOf($test): array
{
    return $test->actingAs($test->user)->getJson('/api/hafalan/export')->json();
}

// --- Export completeness ------------------------------------------------------------

test('the export carries settings, classes, students, setoran ayat and history', function () {
    $b = backupOf($this);

    expect($b['formatVersion'])->toBe(1);
    expect($b['schoolSettings'])->toBe(['schoolName' => 'MTs Al-Ihsan', 'quranTeacherName' => 'Ustadz Qori']);

    expect($b['classes'])->toHaveCount(2);
    expect(collect($b['classes'])->firstWhere('id', '7A')['waliKelas'])->toBe('Wali 7A');

    expect($b['students'])->toHaveCount(2);
    $ahmad = collect($b['students'])->firstWhere('nis', '1001');
    expect($ahmad['id'])->toBe('std_a');
    expect($ahmad['name'])->toBe('Ahmad Fulan');
    expect($ahmad['gender'])->toBe('L');
    expect($ahmad['classId'])->toBe('7A');

    // Setoran ayat, sorted and grouped per student per surah.
    expect($b['progress']['std_a']['al-mursalat'])->toBe([1, 2, 5]);
    expect($b['progress']['std_a']['al-insan'])->toBe([3]);
    expect($b['progress']['std_b']['al-qiyamah'])->toBe([7]);

    expect($b['history'])->not->toBeEmpty();
    $log = collect($b['history'])->firstWhere('action', 'CHECKED');
    expect($log['studentName'])->toBe('Ahmad Fulan');
    expect($log['studentNis'])->toBe('1001');
    expect($log['actorName'])->toBe('Ustadz Penguji');
    expect($log['loggedAt'])->not->toBeNull();
});

// --- Round trip ---------------------------------------------------------------------

test('a backup restores every part of the data after a full wipe', function () {
    $backup = backupOf($this);

    // Destroy everything the backup is supposed to bring back.
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/reset-all', ['password' => 'password'])
        ->assertOk();
    SchoolSetting::query()->delete();
    ClassModel::where('id', '8B')->update(['wali_kelas' => 'dihapus']);

    expect(Student::count())->toBe(0);
    expect(HafalanProgress::count())->toBe(0);

    $response = $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup]);

    $response->assertOk()->assertJson(['success' => true]);
    expect($response->json('restored.students'))->toBe(2);
    expect($response->json('restored.progress'))->toBe(5);

    // Students, with their original ids preserved.
    expect(Student::count())->toBe(2);
    expect(Student::find('std_a')->name)->toBe('Ahmad Fulan');
    expect(Student::find('std_a')->nis)->toBe('1001');
    expect(Student::find('std_b')->gender)->toBe('P');

    // Setoran ayat maps back onto the right students.
    expect(
        HafalanProgress::where('student_id', 'std_a')->where('surah_id', 'al-mursalat')
            ->orderBy('verse_num')->pluck('verse_num')->all()
    )->toBe([1, 2, 5]);
    expect(HafalanProgress::where('student_id', 'std_b')->where('surah_id', 'al-qiyamah')->count())->toBe(1);

    // Settings and wali kelas.
    expect(SchoolSetting::find('school_name')->value)->toBe('MTs Al-Ihsan');
    expect(ClassModel::find('8B')->wali_kelas)->toBe('Wali 8B');

    // History, including who performed the original action.
    $log = ActivityLog::where('action', 'CHECKED')->first();
    expect($log)->not->toBeNull();
    expect($log->student_name)->toBe('Ahmad Fulan');
    expect($log->actor_name)->toBe('Ustadz Penguji');
});

test('exporting a restored backup reproduces the same payload', function () {
    $first = backupOf($this);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $first])
        ->assertOk();

    $second = backupOf($this);

    // The restore itself adds one audit entry, so compare everything else.
    expect($second['students'])->toEqual($first['students']);
    expect($second['progress'])->toEqual($first['progress']);
    expect($second['classes'])->toEqual($first['classes']);
    expect($second['schoolSettings'])->toEqual($first['schoolSettings']);
});

test('restoring replaces existing data rather than merging into it', function () {
    $backup = backupOf($this);

    Student::forceCreate([
        'id' => 'std_extra', 'nis' => '9999', 'name' => 'Murid Sisa', 'gender' => 'L', 'class_id' => '7A',
    ]);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertOk();

    expect(Student::count())->toBe(2);
    expect(Student::where('nis', '9999')->exists())->toBeFalse();
});

// --- Authorisation ------------------------------------------------------------------

test('restoring requires the current password', function () {
    $backup = backupOf($this);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'salah', 'backup' => $backup])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');

    expect(Student::count())->toBe(2);
});

test('guests cannot restore a backup', function () {
    // beforeEach authenticates via actingAs, which persists for the whole test,
    // so the session has to be cleared for this to actually exercise the guard.
    auth()->logout();

    $this->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => ['students' => []]])
        ->assertUnauthorized();

    expect(Student::count())->toBe(2);
});

test('guests cannot export a backup', function () {
    auth()->logout();

    $this->getJson('/api/hafalan/export')->assertUnauthorized();
});

// --- Rejection of bad files ----------------------------------------------------------

test('an invalid backup leaves the existing data untouched', function (array $backup, string $field) {
    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);

    // The transaction rolled back: nothing was wiped.
    expect(Student::count())->toBe(2);
    expect(HafalanProgress::count())->toBe(5);
})->with([
    'no students key' => [['classes' => []], 'file'],
    'future format' => [['formatVersion' => 99, 'students' => []], 'file'],
    'student without NIS' => [[
        'students' => [['id' => 'x', 'name' => 'Tanpa NIS', 'gender' => 'L', 'classId' => '7A']],
    ], 'students.0.nis'],
    'bad gender' => [[
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'X', 'classId' => '7A']],
    ], 'students.0.gender'],
    'unknown class' => [[
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '9Z']],
    ], 'students.0.classId'],
    'duplicate NIS' => [[
        'students' => [
            ['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A'],
            ['id' => 'y', 'nis' => '1', 'name' => 'B', 'gender' => 'P', 'classId' => '7A'],
        ],
    ], 'students.1.nis'],
    'progress for an unknown student' => [[
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A']],
        'progress' => ['hantu' => ['al-mursalat' => [1]]],
    ], 'progress'],
    'unknown surah' => [[
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A']],
        'progress' => ['x' => ['surat-palsu' => [1]]],
    ], 'progress'],
    'verse out of range' => [[
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A']],
        // Al-Muzzammil has 20 verses.
        'progress' => ['x' => ['al-muzzammil' => [21]]],
    ], 'progress'],
]);

// --- Tolerances ----------------------------------------------------------------------

test('duplicate verses in a backup are collapsed instead of failing', function () {
    $backup = [
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A']],
        'progress' => ['x' => ['al-mursalat' => [3, 3, 3, 4]]],
    ];

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertOk();

    expect(HafalanProgress::where('student_id', 'x')->count())->toBe(2);
});

test('a backup without student ids still restores, minting new ones', function () {
    $backup = [
        'students' => [['nis' => '5005', 'name' => 'Tanpa ID', 'gender' => 'P', 'classId' => '7A']],
    ];

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertOk();

    $student = Student::where('nis', '5005')->first();
    expect($student)->not->toBeNull();
    expect(strlen($student->id))->toBe(26); // ULID
});

test('a backup with no history or settings restores the rest', function () {
    $backup = [
        'students' => [['id' => 'x', 'nis' => '1', 'name' => 'A', 'gender' => 'L', 'classId' => '7A']],
        'progress' => ['x' => ['al-mursalat' => [1]]],
    ];

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertOk();

    expect(Student::count())->toBe(1);
    expect(HafalanProgress::count())->toBe(1);
});

test('the restore itself is recorded in the audit trail', function () {
    $backup = backupOf($this);

    $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup])
        ->assertOk();

    $log = ActivityLog::where('action', 'RESTORE_BACKUP')->first();
    expect($log)->not->toBeNull();
    expect($log->actor_name)->toBe('Ustadz Penguji');
});

// --- Export/restore limits must not contradict each other ---------------------------

test('a backup whose history exceeds the old 20k ceiling still restores', function () {
    // One log row is written per verse toggle, so a real installation crosses this
    // quickly. Export applies no cap, so the restore ceiling has to stay above
    // anything export can emit — otherwise the app produces backups it rejects.
    $rows = [];
    $now = now();
    for ($i = 0; $i < 21000; $i++) {
        $rows[] = [
            'user_id' => null, 'actor_name' => 'Ustadz Penguji', 'logged_at' => $now,
            'student_name' => 'Ahmad Fulan', 'student_nis' => '1001', 'class_name' => 'Kelas 7A',
            'class_id' => '7A', 'surah_name' => 'Al-Mursalat', 'verse_num' => 1,
            'action' => 'CHECKED', 'action_label' => 'Mencentang Hafalan',
            'created_at' => $now, 'updated_at' => $now,
        ];
    }
    foreach (array_chunk($rows, 1000) as $chunk) {
        DB::table('activity_logs')->insert($chunk);
    }

    $backup = backupOf($this);
    expect(count($backup['history']))->toBeGreaterThan(20000);

    $response = $this->actingAs($this->user)
        ->postJson('/api/hafalan/backup/restore', ['password' => 'password', 'backup' => $backup]);

    $response->assertOk();
    expect($response->json('restored.history'))->toBeGreaterThan(20000);
    expect(ActivityLog::count())->toBeGreaterThan(20000);
});
