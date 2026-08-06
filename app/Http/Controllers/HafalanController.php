<?php

namespace App\Http\Controllers;

use App\Http\Requests\Hafalan\ClearClassRequest;
use App\Http\Requests\Hafalan\ConfirmPasswordRequest;
use App\Http\Requests\Hafalan\ImportStudentsRequest;
use App\Http\Requests\Hafalan\SaveStudentRequest;
use App\Http\Requests\Hafalan\ToggleColumnVerseRequest;
use App\Http\Requests\Hafalan\ToggleVerseRequest;
use App\Http\Requests\Hafalan\UpdateSettingsRequest;
use App\Http\Requests\Hafalan\UpdateWaliKelasRequest;
use App\Models\ActivityLog;
use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Support\SurahCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class HafalanController extends Controller
{
    /**
     * Share link durations, in minutes. A null value means the link never expires.
     */
    private const SHARE_DURATIONS = [
        '1d' => 1440,
        '7d' => 10080,
        '30d' => 43200,
        'never' => null,
    ];

    private const SHARE_DURATION_LABELS = [
        '1d' => 'Berlaku 1 Hari',
        '7d' => 'Berlaku 7 Hari',
        '30d' => 'Berlaku 30 Hari',
        'never' => 'Selamanya (Tidak Ada Batas Waktu)',
    ];

    /**
     * The monitoring matrix shows one class at a time, so only that class is loaded.
     * Previously every request shipped the entire progress table — at full roll
     * (12 classes x ~30 students x 225 verses) that is ~80k rows per page view.
     */
    public function index(Request $request): Response
    {
        // withCount keeps the class picker's per-class totals accurate now that only
        // the selected class's students are sent.
        $classes = ClassModel::withCount('students')->orderBy('id')->get();
        $currentClass = $classes->firstWhere('id', $request->query('class')) ?? $classes->first();

        $students = $currentClass
            ? Student::where('class_id', $currentClass->id)->get()
            : new Collection;

        return Inertia::render('hafalan/index', [
            'initialClasses' => $this->mapClasses($classes),
            'currentClassId' => $currentClass?->id,
            'initialStudents' => $this->mapStudents($students),
            'initialProgress' => $this->getProgressData($students->pluck('id')->all()),
            'initialSettings' => $this->getSettingsData(),
        ]);
    }

    public function history(): Response
    {
        return Inertia::render('hafalan/history', [
            'initialHistory' => $this->getLogsData(),
        ]);
    }

    public function settings(): Response
    {
        return Inertia::render('hafalan/settings', [
            'initialSettings' => $this->getSettingsData(),
            'initialClasses' => $this->getClassesData(),
            'initialStudents' => $this->getStudentsData(),
        ]);
    }

    /**
     * Public, read-only report for a single class.
     *
     * Reachable only through a signed URL (see createShareLink), so the signature
     * and its expiry are verified by the `signed` middleware before we get here.
     * Only the shared class is exposed — never the whole student body.
     */
    public function share(ClassModel $class): Response
    {
        $students = Student::where('class_id', $class->id)->get();

        return Inertia::render('hafalan/share', [
            'shareClass' => [
                'id' => $class->id,
                'name' => $class->name,
                'grade' => (int) $class->grade,
                'section' => $class->section,
                'waliKelas' => $class->wali_kelas,
            ],
            'initialStudents' => $this->mapStudents($students),
            'initialProgress' => $this->getProgressData($students->pluck('id')->all()),
            'initialSettings' => $this->getSettingsData(),
        ]);
    }

    /**
     * Issue a signed, optionally expiring public link for one class.
     */
    public function createShareLink(Request $request, ClassModel $class)
    {
        $validated = $request->validate([
            'duration' => ['required', Rule::in(array_keys(self::SHARE_DURATIONS))],
        ]);

        $minutes = self::SHARE_DURATIONS[$validated['duration']];

        $url = $minutes === null
            ? URL::signedRoute('hafalan.share', ['class' => $class->id])
            : URL::temporarySignedRoute('hafalan.share', now()->addMinutes($minutes), ['class' => $class->id]);

        return response()->json([
            'success' => true,
            'url' => $url,
            'expirationText' => self::SHARE_DURATION_LABELS[$validated['duration']],
        ]);
    }

    // --- API ENDPOINTS FOR REAL-TIME DB SYNC ---

    public function toggleVerse(ToggleVerseRequest $request)
    {
        $validated = $request->validated();

        $checked = DB::transaction(function () use ($validated) {
            // firstOrCreate is atomic against the unique index on
            // (student_id, surah_id, verse_num); the previous read-then-write pair
            // let two concurrent toggles both decide to insert and trip the
            // constraint with a 500.
            $progress = HafalanProgress::firstOrCreate([
                'student_id' => $validated['studentId'],
                'surah_id' => $validated['surahId'],
                'verse_num' => $validated['verseNum'],
            ]);

            if ($progress->wasRecentlyCreated) {
                $action = 'CHECKED';
                $actionLabel = 'Mencentang Hafalan';
            } else {
                $progress->delete();
                $action = 'UNCHECKED';
                $actionLabel = 'Membatalkan Centang';
            }

            // The student is guaranteed to exist (validated with exists:), so unlike
            // before, progress can no longer be written without a matching log entry.
            $student = Student::with('schoolClass')->find($validated['studentId']);

            $this->logActivity([
                'student_name' => $student->name,
                'student_nis' => $student->nis,
                'class_name' => $student->schoolClass->name ?? $student->class_id,
                'class_id' => $student->class_id,
                'surah_name' => $validated['surahName'] ?? SurahCatalog::name($validated['surahId']),
                'verse_num' => $validated['verseNum'],
                'action' => $action,
                'action_label' => $actionLabel,
            ]);

            return $action === 'CHECKED';
        });

        // Only the delta the client needs to reconcile its optimistic update.
        return response()->json([
            'success' => true,
            'studentId' => $validated['studentId'],
            'surahId' => $validated['surahId'],
            'verseNum' => $validated['verseNum'],
            'checked' => $checked,
        ]);
    }

    public function toggleColumnVerse(ToggleColumnVerseRequest $request)
    {
        $validated = $request->validated();

        $result = DB::transaction(function () use ($validated) {
            $class = ClassModel::find($validated['classId']);
            $studentIds = Student::where('class_id', $validated['classId'])->pluck('id')->all();

            if ($studentIds === []) {
                return ['checked' => false, 'studentIds' => []];
            }

            $existingCount = HafalanProgress::whereIn('student_id', $studentIds)
                ->where('surah_id', $validated['surahId'])
                ->where('verse_num', $validated['verseNum'])
                ->count();

            if ($existingCount === count($studentIds)) {
                HafalanProgress::whereIn('student_id', $studentIds)
                    ->where('surah_id', $validated['surahId'])
                    ->where('verse_num', $validated['verseNum'])
                    ->delete();
                $action = 'UNCHECKED';
                $actionLabel = 'Membatalkan Massal 1 Kolom';
            } else {
                foreach ($studentIds as $sid) {
                    HafalanProgress::firstOrCreate([
                        'student_id' => $sid,
                        'surah_id' => $validated['surahId'],
                        'verse_num' => $validated['verseNum'],
                    ]);
                }
                $action = 'CHECKED';
                $actionLabel = 'Mencentang Massal 1 Kolom';
            }

            $this->logActivity([
                'student_name' => 'Semua Siswa',
                'student_nis' => '-',
                'class_name' => $class->name,
                'class_id' => $class->id,
                'surah_name' => $validated['surahName'] ?? SurahCatalog::name($validated['surahId']),
                'verse_num' => $validated['verseNum'],
                'action' => $action,
                'action_label' => $actionLabel,
            ]);

            return ['checked' => $action === 'CHECKED', 'studentIds' => $studentIds];
        });

        return response()->json([
            'success' => true,
            'classId' => $validated['classId'],
            'surahId' => $validated['surahId'],
            'verseNum' => $validated['verseNum'],
            'checked' => $result['checked'] ?? false,
            'studentIds' => $result['studentIds'] ?? [],
        ]);
    }

    public function saveStudent(SaveStudentRequest $request)
    {
        $validated = $request->validated();
        $isEditing = $request->isEditing();

        DB::transaction(function () use ($validated, $isEditing) {
            $student = Student::find($validated['id'] ?? null)
                // Re-adding a student whose NIS belongs to a soft-deleted record
                // restores that record, keeping their hafalan history, instead of
                // failing on the unique index.
                ?? Student::onlyTrashed()->where('nis', $validated['nis'])->first()
                ?? new Student;

            if (! $student->exists) {
                $student->id = (string) Str::ulid();
            } elseif ($student->trashed()) {
                $student->restore();
            }

            // A collision-prone time()+rand() id used to let a second student created
            // in the same second silently overwrite the first via updateOrCreate.
            $student->fill([
                'nis' => $validated['nis'],
                'name' => $validated['name'],
                'gender' => $validated['gender'],
                'class_id' => $validated['classId'],
            ])->save();

            $class = ClassModel::find($validated['classId']);

            $this->logActivity([
                'student_name' => $student->name,
                'student_nis' => $student->nis,
                'class_name' => $class->name,
                'class_id' => $class->id,
                'action' => $isEditing ? 'EDIT_STUDENT' : 'ADD_STUDENT',
                'action_label' => $isEditing ? 'Mengedit Data Siswa' : 'Menambah Siswa Baru',
            ]);
        });

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function deleteStudent(string $id)
    {
        $student = Student::with('schoolClass')->find($id);

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'Siswa tidak ditemukan.',
            ], 404);
        }

        DB::transaction(function () use ($student) {
            $this->logActivity([
                'student_name' => $student->name,
                'student_nis' => $student->nis,
                'class_name' => $student->schoolClass->name ?? $student->class_id,
                'class_id' => $student->class_id,
                'action' => 'DELETE_STUDENT',
                'action_label' => 'Menghapus Siswa',
            ]);

            $student->delete();
        });

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearClassData(ClearClassRequest $request)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            $class = ClassModel::find($validated['classId']);

            $studentIds = Student::where('class_id', $class->id)->pluck('id')->all();
            $studentCount = count($studentIds);

            // forceDelete, not soft delete: this is an explicit password-confirmed
            // purge. Soft-deleted rows would keep reserving their NIS and block a
            // re-import of the same class.
            HafalanProgress::whereIn('student_id', $studentIds)->delete();
            Student::where('class_id', $class->id)->forceDelete();

            // Scoped by class_id: matching on the display name used to orphan logs
            // when a class was renamed, and could delete another class's entries whose
            // name happened to equal this class's id.
            ActivityLog::where('class_id', $class->id)->delete();

            $this->logActivity([
                'student_name' => "Seluruh Data ({$studentCount} Siswa)",
                'student_nis' => '-',
                'class_name' => $class->name,
                'class_id' => $class->id,
                'action' => 'CLEAR_CLASS',
                'action_label' => "Kosongkan Data Siswa & Hafalan {$class->name}",
            ]);
        });

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearAllData(ConfirmPasswordRequest $request)
    {
        DB::transaction(function () {
            $studentCount = Student::count();

            HafalanProgress::query()->delete();
            Student::query()->forceDelete();
            ActivityLog::query()->delete();

            $this->logActivity([
                'student_name' => "Seluruh Data Aplikasi ({$studentCount} Siswa)",
                'student_nis' => '-',
                'class_name' => 'Semua Kelas',
                'action' => 'RESET_ALL',
                'action_label' => 'Mereset & Mengosongkan Seluruh Data Murid & Riwayat',
            ]);
        });

        return response()->json([
            'success' => true,
            'students' => [],
            'progress' => [],
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearHistory(ConfirmPasswordRequest $request)
    {
        DB::transaction(function () {
            $logCount = ActivityLog::count();

            ActivityLog::query()->delete();

            $this->logActivity([
                'student_name' => "Log Riwayat ({$logCount} Item)",
                'student_nis' => '-',
                'class_name' => 'Sistem',
                'action' => 'CLEAR_HISTORY',
                'action_label' => 'Membersihkan Seluruh Riwayat Aktivitas Log',
            ]);
        });

        return response()->json([
            'success' => true,
            'history' => $this->getLogsData(),
        ]);
    }

    public function importStudents(ImportStudentsRequest $request)
    {
        $rows = $request->validated()['students'];

        DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                // Matched on NIS, the school's business key, so re-importing the same
                // sheet updates those students instead of creating duplicates.
                $student = Student::firstOrNew(['nis' => $row['nis']]);

                if (! $student->exists) {
                    $student->id = (string) Str::ulid();
                }

                $student->fill([
                    'name' => $row['name'],
                    'gender' => $row['gender'],
                    'class_id' => $row['classId'],
                ])->save();
            }

            $class = ClassModel::find($rows[0]['classId']);

            $this->logActivity([
                'student_name' => count($rows).' Siswa',
                'student_nis' => '-',
                'class_name' => $class->name,
                'class_id' => $class->id,
                'action' => 'IMPORT_STUDENTS',
                'action_label' => 'Import Data Siswa Massal',
            ]);
        });

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function updateSettings(UpdateSettingsRequest $request)
    {
        $settings = $request->settingsToPersist();

        if ($settings === []) {
            return response()->json([
                'success' => true,
                'settings' => $this->getSettingsData(),
                'history' => $this->getLogsData(),
            ]);
        }

        DB::transaction(function () use ($settings) {
            foreach ($settings as $key => $value) {
                SchoolSetting::updateOrCreate(['key' => $key], ['value' => $value]);
            }

            $this->logActivity([
                'student_name' => 'Pengaturan Sekolah',
                'student_nis' => '-',
                'class_name' => 'Sistem',
                'action' => 'UPDATE_SETTINGS',
                'action_label' => 'Mengubah Pengaturan Sekolah',
            ]);
        });

        return response()->json([
            'success' => true,
            'settings' => $this->getSettingsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function updateWaliKelas(UpdateWaliKelasRequest $request)
    {
        $classes = $request->validated()['classes'];

        DB::transaction(function () use ($classes) {
            foreach ($classes as $cls) {
                ClassModel::where('id', $cls['id'])->update([
                    'wali_kelas' => $cls['waliKelas'] ?? '',
                ]);
            }

            $this->logActivity([
                'student_name' => count($classes).' Rombel',
                'student_nis' => '-',
                'class_name' => 'Sistem',
                'action' => 'UPDATE_SETTINGS',
                'action_label' => 'Mengubah Nama Wali Kelas',
            ]);
        });

        return response()->json([
            'success' => true,
            'classes' => $this->getClassesData(),
        ]);
    }

    public function getStudentDetail(string $idOrNis)
    {
        // Resolved id-first rather than with a single orWhere, so a value that happens
        // to match one student's id and another's NIS returns a deterministic result.
        $student = Student::with('schoolClass')->find($idOrNis)
            ?? Student::with('schoolClass')->where('nis', $idOrNis)->first();

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'Siswa tidak ditemukan dengan ID/NIS: '.$idOrNis,
            ], 404);
        }

        $progressMap = [];
        foreach (HafalanProgress::where('student_id', $student->id)->get() as $rec) {
            $progressMap[$rec->surah_id][] = (int) $rec->verse_num;
        }

        foreach ($progressMap as $sId => $verses) {
            sort($progressMap[$sId]);
        }

        $totalVersesCompleted = 0;
        $totalCompletedSurahs = 0;
        $surahStats = [];

        foreach (SurahCatalog::forResponse() as $surah) {
            $verseList = $progressMap[$surah['id']] ?? [];

            // Clamped because rows stored before verse-range validation existed could
            // still exceed the surah length and push the percentage past 100.
            $completedVerses = min(count($verseList), $surah['totalVerses']);
            $isCompleted = $completedVerses >= $surah['totalVerses'];

            $totalVersesCompleted += $completedVerses;
            if ($isCompleted) {
                $totalCompletedSurahs++;
            }

            $surahStats[] = [
                'surahId' => $surah['id'],
                'surahName' => $surah['name'],
                'arabicName' => $surah['arabicName'],
                'number' => $surah['number'],
                'grade' => $surah['grade'],
                'semester' => $surah['semester'],
                'totalVerses' => $surah['totalVerses'],
                'completedVerses' => $completedVerses,
                'completedVerseList' => $verseList,
                'percentage' => (int) round(($completedVerses / $surah['totalVerses']) * 100),
                'isCompleted' => $isCompleted,
            ];
        }

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $student->id,
                'nis' => $student->nis,
                'name' => $student->name,
                'gender' => $student->gender,
                'classId' => $student->class_id,
                'className' => $student->schoolClass->name ?? $student->class_id,
                'grade' => (int) ($student->schoolClass->grade ?? 0),
                'waliKelas' => $student->schoolClass->wali_kelas ?? '-',
            ],
            'progress' => $progressMap,
            'summary' => [
                'totalVersesCompleted' => $totalVersesCompleted,
                'totalCompletedSurahs' => $totalCompletedSurahs,
                'surahStats' => $surahStats,
            ],
        ]);
    }

    /**
     * Full dataset for the backup/export button. Built from the database so a backup
     * cannot silently omit progress the browser happened not to have cached.
     */
    public function exportData()
    {
        return response()->json([
            'schoolSettings' => $this->getSettingsData(),
            'classes' => $this->getClassesData(),
            'students' => $this->getStudentsData(),
            'progress' => $this->getProgressData(),
            'exportedAt' => now()->toIso8601String(),
        ]);
    }

    // --- HELPER DATA BUILDERS ---

    /**
     * Write one audit entry. Every log goes through here so the shared fields are
     * recorded in exactly one place.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function logActivity(array $attributes): void
    {
        ActivityLog::create($attributes + [
            // Records who acted; previously the trail could not attribute a data wipe
            // to anyone. Nullable so console-driven changes still log.
            'user_id' => auth()->id(),
            'logged_at' => now(),
        ]);
    }

    private function getClassesData(): array
    {
        return $this->mapClasses(ClassModel::withCount('students')->orderBy('id')->get());
    }

    /**
     * @param  Collection<int, ClassModel>  $classes
     */
    private function mapClasses($classes): array
    {
        return $classes->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'grade' => (int) $c->grade,
                'section' => $c->section,
                'waliKelas' => $c->wali_kelas,
                'studentCount' => (int) ($c->students_count ?? 0),
            ];
        })->values()->toArray();
    }

    private function getStudentsData(): array
    {
        return $this->mapStudents(Student::all());
    }

    /**
     * @param  Collection<int, Student>  $students
     */
    private function mapStudents($students): array
    {
        return $students->map(function ($s) {
            return [
                'id' => $s->id,
                'nis' => $s->nis,
                'name' => $s->name,
                'gender' => $s->gender,
                'classId' => $s->class_id,
            ];
        })->values()->toArray();
    }

    /**
     * @param  array<int, string>|null  $studentIds  Limit to these students, or all when null.
     */
    private function getProgressData(?array $studentIds = null): array
    {
        $records = HafalanProgress::when(
            $studentIds !== null,
            fn ($q) => $q->whereIn('student_id', $studentIds)
        )->get();
        $progress = [];

        foreach ($records as $r) {
            if (! isset($progress[$r->student_id])) {
                $progress[$r->student_id] = [];
            }
            if (! isset($progress[$r->student_id][$r->surah_id])) {
                $progress[$r->student_id][$r->surah_id] = [];
            }
            $progress[$r->student_id][$r->surah_id][] = (int) $r->verse_num;
        }

        return $progress;
    }

    private function getSettingsData(): array
    {
        $settings = SchoolSetting::all()->pluck('value', 'key')->toArray();

        return [
            'schoolName' => $settings['school_name'] ?? '',
            'quranTeacherName' => $settings['quran_teacher_name'] ?? '',
        ];
    }

    private function getLogsData(): array
    {
        return ActivityLog::with('user:id,name')
            ->orderByDesc('logged_at')
            ->orderByDesc('id')
            ->take(200)
            ->get()
            ->map(function ($l) {
                return [
                    'id' => (string) $l->id,
                    // Formatted for display here; the column itself is a real timestamp
                    // so it can still be sorted and range-queried.
                    'timestamp' => $l->logged_at
                        ?->setTimezone('Asia/Jakarta')
                        ->translatedFormat('d M Y H:i:s'),
                    'actorName' => $l->user?->name,
                    'studentName' => $l->student_name,
                    'studentNis' => $l->student_nis,
                    'className' => $l->class_name,
                    'surahName' => $l->surah_name,
                    'verseNum' => $l->verse_num ? (int) $l->verse_num : null,
                    'action' => $l->action,
                    'actionLabel' => $l->action_label,
                ];
            })->toArray();
    }
}
