<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\SchoolSetting;
use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Builds and reinstates a complete snapshot of the application's data:
 * school settings, classes (incl. wali kelas), students (NIS + name + gender),
 * hafalan progress (setoran ayat), and the activity history.
 *
 * A restore replaces the current contents entirely and runs inside a single
 * transaction, so a backup that fails validation leaves the database untouched.
 */
class BackupService
{
    /** Bumped when the payload shape changes in a way older files cannot satisfy. */
    public const FORMAT_VERSION = 1;

    private const MAX_STUDENTS = 5000;

    // Must stay comfortably above anything export() can produce: one log row is
    // written per verse toggle, so a school running for years accumulates far more
    // than a few thousand. A cap lower than that would emit backups the application
    // then refuses to accept back.
    private const MAX_HISTORY = 200000;

    // Guards against a file large enough to exhaust memory during restore.
    private const MAX_PROGRESS_ENTRIES = 400000;

    /**
     * @return array<string, mixed>
     */
    public function export(): array
    {
        return [
            'formatVersion' => self::FORMAT_VERSION,
            'exportedAt' => now()->toIso8601String(),
            'schoolSettings' => [
                'schoolName' => SchoolSetting::find('school_name')?->value ?? '',
                'quranTeacherName' => SchoolSetting::find('quran_teacher_name')?->value ?? '',
            ],
            'classes' => ClassModel::orderBy('id')->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'grade' => (int) $c->grade,
                'section' => $c->section,
                'waliKelas' => $c->wali_kelas,
            ])->all(),
            'students' => Student::orderBy('class_id')->orderBy('name')->get()->map(fn ($s) => [
                'id' => $s->id,
                'nis' => $s->nis,
                'name' => $s->name,
                'gender' => $s->gender,
                'classId' => $s->class_id,
            ])->all(),
            'progress' => $this->exportProgress(),
            'history' => $this->exportHistory(),
        ];
    }

    /**
     * Chunked so a long-running installation's log table does not have to be held
     * in memory as Eloquent models all at once.
     *
     * @return array<int, array<string, mixed>>
     */
    private function exportHistory(): array
    {
        $history = [];

        ActivityLog::orderBy('id')->chunk(2000, function ($rows) use (&$history) {
            foreach ($rows as $l) {
                $history[] = [
                    'loggedAt' => $l->logged_at?->toIso8601String(),
                    'actorName' => $l->actor_name,
                    'studentName' => $l->student_name,
                    'studentNis' => $l->student_nis,
                    'className' => $l->class_name,
                    'classId' => $l->class_id,
                    'surahName' => $l->surah_name,
                    'verseNum' => $l->verse_num !== null ? (int) $l->verse_num : null,
                    'action' => $l->action,
                    'actionLabel' => $l->action_label,
                ];
            }
        });

        return $history;
    }

    /**
     * Progress keyed by student id then surah id, matching the shape the frontend
     * already uses: {"studentId": {"surahId": [1, 2, 3]}}.
     *
     * @return array<string, array<string, array<int, int>>>
     */
    private function exportProgress(): array
    {
        $progress = [];

        HafalanProgress::orderBy('student_id')
            ->orderBy('surah_id')
            ->orderBy('verse_num')
            ->chunk(2000, function ($rows) use (&$progress) {
                foreach ($rows as $r) {
                    $progress[$r->student_id][$r->surah_id][] = (int) $r->verse_num;
                }
            });

        return $progress;
    }

    /**
     * Validate and reinstate a backup, replacing everything currently stored.
     *
     * @param  mixed  $backup  Decoded JSON from the uploaded file.
     * @return array<string, int> Counts of what was restored.
     *
     * @throws ValidationException
     */
    public function restore($backup): array
    {
        $backup = $this->assertShape($backup);

        $classes = $this->validateClasses($backup['classes'] ?? []);
        $students = $this->validateStudents($backup['students'] ?? [], $classes);
        $progress = $this->validateProgress($backup['progress'] ?? [], $students);
        $history = $this->validateHistory($backup['history'] ?? []);
        $settings = $this->validateSettings($backup['schoolSettings'] ?? []);

        $this->guardAgainstEmptyOverwrite($students);

        DB::transaction(function () use ($classes, $students, $progress, $history, $settings) {
            // Order matters: progress and students reference classes by foreign key.
            HafalanProgress::query()->delete();
            Student::query()->delete();
            ActivityLog::query()->delete();

            foreach ($classes as $c) {
                ClassModel::updateOrCreate(
                    ['id' => $c['id']],
                    [
                        'name' => $c['name'],
                        'grade' => $c['grade'],
                        'section' => $c['section'],
                        'wali_kelas' => $c['waliKelas'],
                    ]
                );
            }

            foreach (array_chunk($students, 500) as $chunk) {
                DB::table('students')->insert($chunk);
            }

            foreach (array_chunk($progress, 1000) as $chunk) {
                DB::table('hafalan_progress')->insert($chunk);
            }

            foreach (array_chunk($history, 500) as $chunk) {
                DB::table('activity_logs')->insert($chunk);
            }

            foreach ($settings as $key => $value) {
                SchoolSetting::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        return [
            'classes' => count($classes),
            'students' => count($students),
            'progress' => count($progress),
            'history' => count($history),
        ];
    }

    /**
     * A truncated or mistakenly chosen backup can still be valid JSON while carrying
     * no students at all. Restoring it would wipe the roster and leave nothing to
     * recover from, since the file itself is empty. Emptying the data on purpose has
     * its own dedicated action, so refuse this case rather than take it literally.
     *
     * @param  array<int, array<string, mixed>>  $students
     */
    private function guardAgainstEmptyOverwrite(array $students): void
    {
        if ($students !== []) {
            return;
        }

        $existing = Student::count();

        if ($existing === 0) {
            return;
        }

        $this->fail('students', sprintf(
            'File cadangan ini tidak memuat satu pun murid, sedangkan database berisi %d murid. '.
            'Kemungkinan file rusak atau tidak lengkap. Bila memang ingin mengosongkan data, '.
            'gunakan menu "Reset & Kosongkan Seluruh Data".',
            $existing
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function assertShape($backup): array
    {
        if (! is_array($backup)) {
            $this->fail('file', 'File backup tidak berisi objek JSON yang valid.');
        }

        $version = $backup['formatVersion'] ?? 1;
        if (! is_int($version) || $version > self::FORMAT_VERSION) {
            $this->fail('file', 'Versi format backup ('.json_encode($version).') tidak dikenali oleh versi aplikasi ini.');
        }

        if (! isset($backup['students']) || ! is_array($backup['students'])) {
            $this->fail('file', 'File backup tidak memuat daftar siswa.');
        }

        return $backup;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function validateClasses($classes): array
    {
        if (! is_array($classes)) {
            $this->fail('classes', 'Daftar kelas pada backup tidak valid.');
        }

        $out = [];
        $seen = [];

        foreach ($classes as $i => $c) {
            $id = $this->requireString($c['id'] ?? null, "classes.{$i}.id", 'ID kelas');

            if (isset($seen[$id])) {
                $this->fail("classes.{$i}.id", "Kelas {$id} muncul lebih dari sekali di backup.");
            }
            $seen[$id] = true;

            $out[] = [
                'id' => $id,
                'name' => $this->requireString($c['name'] ?? null, "classes.{$i}.name", 'Nama kelas', 100),
                'grade' => (int) ($c['grade'] ?? 0),
                'section' => (string) ($c['section'] ?? ''),
                'waliKelas' => Str::limit((string) ($c['waliKelas'] ?? ''), 150, ''),
            ];
        }

        return $out;
    }

    /**
     * Returns rows ready for a raw insert, keyed by nothing; also used to validate
     * that progress refers to a student the backup actually contains.
     *
     * @return array<int, array<string, mixed>>
     */
    private function validateStudents($students, array $classes): array
    {
        if (count($students) > self::MAX_STUDENTS) {
            $this->fail('students', 'Backup memuat lebih dari '.self::MAX_STUDENTS.' siswa.');
        }

        $classIds = array_column($classes, 'id');
        // A backup with no class list is still restorable against the classes already
        // present in the database (the fixed 12 rombel).
        if ($classIds === []) {
            $classIds = ClassModel::pluck('id')->all();
        }
        $classIds = array_flip($classIds);

        $limits = config('hafalan.limits');
        $now = now();
        $out = [];
        $seenIds = [];
        $seenNis = [];

        foreach ($students as $i => $s) {
            $nis = $this->requireString($s['nis'] ?? null, "students.{$i}.nis", 'NIS', $limits['nis']);
            $name = $this->requireString($s['name'] ?? null, "students.{$i}.name", 'Nama siswa', $limits['student_name']);
            $gender = (string) ($s['gender'] ?? '');
            $classId = (string) ($s['classId'] ?? '');

            if (! in_array($gender, ['L', 'P'], true)) {
                $this->fail("students.{$i}.gender", "Jenis kelamin siswa {$name} harus L atau P.");
            }

            if (! isset($classIds[$classId])) {
                $this->fail("students.{$i}.classId", "Kelas {$classId} untuk siswa {$name} tidak ada di backup maupun di database.");
            }

            if (isset($seenNis[$nis])) {
                $this->fail("students.{$i}.nis", "NIS {$nis} muncul lebih dari sekali di backup.");
            }
            $seenNis[$nis] = true;

            // Ids are preserved so the progress map still points at the right student.
            // A backup without ids still restores; new ones are minted.
            $id = isset($s['id']) && is_string($s['id']) && $s['id'] !== ''
                ? $s['id']
                : (string) Str::ulid();

            if (isset($seenIds[$id])) {
                $this->fail("students.{$i}.id", "ID siswa {$id} muncul lebih dari sekali di backup.");
            }
            $seenIds[$id] = true;

            $out[] = [
                'id' => $id,
                'nis' => $nis,
                'name' => $name,
                'gender' => $gender,
                'class_id' => $classId,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, array<string, mixed>>  $students
     * @return array<int, array<string, mixed>>
     */
    private function validateProgress($progress, array $students): array
    {
        if (! is_array($progress)) {
            $this->fail('progress', 'Data setoran ayat pada backup tidak valid.');
        }

        $studentIds = array_flip(array_column($students, 'id'));
        $now = now();
        $out = [];
        $total = 0;

        foreach ($progress as $studentId => $surahs) {
            if (! isset($studentIds[$studentId])) {
                // Progress for a student the backup does not carry cannot be restored
                // without violating the foreign key.
                $this->fail('progress', "Setoran ayat merujuk siswa {$studentId} yang tidak ada di daftar siswa backup.");
            }

            if (! is_array($surahs)) {
                $this->fail('progress', "Setoran ayat untuk siswa {$studentId} tidak valid.");
            }

            foreach ($surahs as $surahId => $verses) {
                $totalVerses = SurahCatalog::totalVerses((string) $surahId);

                if ($totalVerses === null) {
                    $this->fail('progress', "Surat '{$surahId}' pada backup tidak dikenali.");
                }

                if (! is_array($verses)) {
                    $this->fail('progress', "Daftar ayat surat {$surahId} tidak valid.");
                }

                $unique = [];

                foreach ($verses as $verse) {
                    if (! is_int($verse) && ! ctype_digit((string) $verse)) {
                        $this->fail('progress', "Nomor ayat '{$verse}' pada surat {$surahId} tidak valid.");
                    }

                    $verse = (int) $verse;

                    if ($verse < 1 || $verse > $totalVerses) {
                        $this->fail('progress', "Ayat {$verse} di luar jangkauan surat {$surahId} (1-{$totalVerses}).");
                    }

                    // Silently collapse duplicates rather than trip the unique index.
                    if (isset($unique[$verse])) {
                        continue;
                    }
                    $unique[$verse] = true;

                    if (++$total > self::MAX_PROGRESS_ENTRIES) {
                        $this->fail('progress', 'Backup memuat terlalu banyak data setoran ayat.');
                    }

                    $out[] = [
                        'student_id' => $studentId,
                        'surah_id' => (string) $surahId,
                        'verse_num' => $verse,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function validateHistory($history): array
    {
        if (! is_array($history)) {
            $this->fail('history', 'Riwayat pada backup tidak valid.');
        }

        if (count($history) > self::MAX_HISTORY) {
            $this->fail('history', 'Backup memuat lebih dari '.self::MAX_HISTORY.' baris riwayat.');
        }

        $now = now();
        $out = [];

        foreach ($history as $i => $h) {
            if (! is_array($h)) {
                $this->fail("history.{$i}", 'Baris riwayat tidak valid.');
            }

            $loggedAt = null;
            if (! empty($h['loggedAt'])) {
                try {
                    $loggedAt = Carbon::parse((string) $h['loggedAt']);
                } catch (\Throwable) {
                    $this->fail("history.{$i}.loggedAt", "Waktu riwayat '{$h['loggedAt']}' tidak dapat dibaca.");
                }
            }

            $out[] = [
                // user_id is deliberately dropped: account ids are meaningless in
                // another database. actor_name carries the attribution instead.
                'user_id' => null,
                'actor_name' => $this->optionalString($h['actorName'] ?? null, 255),
                'logged_at' => $loggedAt ?? $now,
                'student_name' => $this->optionalString($h['studentName'] ?? null, 255) ?? '-',
                'student_nis' => $this->optionalString($h['studentNis'] ?? null, 255) ?? '-',
                'class_name' => $this->optionalString($h['className'] ?? null, 255) ?? '-',
                'class_id' => $this->optionalString($h['classId'] ?? null, 255),
                'surah_name' => $this->optionalString($h['surahName'] ?? null, 255),
                'verse_num' => isset($h['verseNum']) && $h['verseNum'] !== null ? (int) $h['verseNum'] : null,
                'action' => $this->optionalString($h['action'] ?? null, 255) ?? 'UNKNOWN',
                'action_label' => $this->optionalString($h['actionLabel'] ?? null, 255),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $out;
    }

    /**
     * @return array<string, string>
     */
    private function validateSettings($settings): array
    {
        if (! is_array($settings)) {
            return [];
        }

        $limits = config('hafalan.limits');
        $out = [];

        if (isset($settings['schoolName'])) {
            $out['school_name'] = Str::limit((string) $settings['schoolName'], $limits['school_name'], '');
        }

        if (isset($settings['quranTeacherName'])) {
            $out['quran_teacher_name'] = Str::limit((string) $settings['quranTeacherName'], $limits['teacher_name'], '');
        }

        return $out;
    }

    private function requireString($value, string $field, string $label, ?int $max = null): string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            $this->fail($field, "{$label} wajib diisi pada backup.");
        }

        $value = trim((string) $value);

        if ($value === '') {
            $this->fail($field, "{$label} tidak boleh kosong pada backup.");
        }

        if ($max !== null && mb_strlen($value) > $max) {
            $this->fail($field, "{$label} melebihi {$max} karakter pada backup.");
        }

        return $value;
    }

    private function optionalString($value, int $max): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Str::limit((string) $value, $max, '');
    }

    /**
     * @throws ValidationException
     */
    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
