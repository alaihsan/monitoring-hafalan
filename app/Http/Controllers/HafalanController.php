<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ClassModel;
use App\Models\HafalanProgress;
use App\Models\SchoolSetting;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\URL;
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

    public function index(): Response
    {
        return Inertia::render('hafalan/index', [
            'initialClasses' => $this->getClassesData(),
            'initialStudents' => $this->getStudentsData(),
            'initialProgress' => $this->getProgressData(),
            'initialSettings' => $this->getSettingsData(),
            'initialHistory' => $this->getLogsData(),
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

    public function toggleVerse(Request $request)
    {
        $validated = $request->validate([
            'studentId' => 'required|string',
            'surahId' => 'required|string',
            'verseNum' => 'required|integer',
            'surahName' => 'nullable|string',
        ]);

        $student = Student::with('schoolClass')->find($validated['studentId']);

        $existing = HafalanProgress::where('student_id', $validated['studentId'])
            ->where('surah_id', $validated['surahId'])
            ->where('verse_num', $validated['verseNum'])
            ->first();

        $action = 'CHECKED';
        $actionLabel = 'Mencentang Hafalan';

        if ($existing) {
            $existing->delete();
            $action = 'UNCHECKED';
            $actionLabel = 'Membatalkan Centang';
        } else {
            HafalanProgress::create([
                'student_id' => $validated['studentId'],
                'surah_id' => $validated['surahId'],
                'verse_num' => $validated['verseNum'],
            ]);
        }

        if ($student) {
            ActivityLog::create([
                'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
                'student_name' => $student->name,
                'student_nisn' => $student->nisn,
                'class_name' => $student->schoolClass->name ?? $student->class_id,
                'surah_name' => $validated['surahName'] ?? $validated['surahId'],
                'verse_num' => $validated['verseNum'],
                'action' => $action,
                'action_label' => $actionLabel,
            ]);
        }

        return response()->json([
            'success' => true,
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function toggleColumnVerse(Request $request)
    {
        $validated = $request->validate([
            'classId' => 'required|string',
            'surahId' => 'required|string',
            'verseNum' => 'required|integer',
            'surahName' => 'nullable|string',
        ]);

        $class = ClassModel::find($validated['classId']);
        $students = Student::where('class_id', $validated['classId'])->get();
        if ($students->isEmpty()) {
            return response()->json(['success' => true, 'progress' => $this->getProgressData()]);
        }

        $studentIds = $students->pluck('id')->toArray();

        $existingCount = HafalanProgress::whereIn('student_id', $studentIds)
            ->where('surah_id', $validated['surahId'])
            ->where('verse_num', $validated['verseNum'])
            ->count();

        $allChecked = ($existingCount === count($studentIds));

        if ($allChecked) {
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

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => 'Semua Siswa',
            'student_nisn' => '-',
            'class_name' => $class->name ?? $validated['classId'],
            'surah_name' => $validated['surahName'] ?? $validated['surahId'],
            'verse_num' => $validated['verseNum'],
            'action' => $action,
            'action_label' => $actionLabel,
        ]);

        return response()->json([
            'success' => true,
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function saveStudent(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|string',
            'nisn' => 'required|string',
            'name' => 'required|string',
            'gender' => 'required|in:L,P',
            'classId' => 'required|string',
        ]);

        $studentId = $validated['id'] ?? 'std_'.$validated['classId'].'_'.time().'_'.rand(100, 999);

        $student = Student::updateOrCreate(
            ['id' => $studentId],
            [
                'nisn' => $validated['nisn'],
                'name' => $validated['name'],
                'gender' => $validated['gender'],
                'class_id' => $validated['classId'],
            ]
        );

        $class = ClassModel::find($validated['classId']);

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => $student->name,
            'student_nisn' => $student->nisn,
            'class_name' => $class->name ?? $validated['classId'],
            'action' => isset($validated['id']) ? 'EDIT_STUDENT' : 'ADD_STUDENT',
            'action_label' => isset($validated['id']) ? 'Mengedit Data Siswa' : 'Menambah Siswa Baru',
        ]);

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function deleteStudent(string $id)
    {
        $student = Student::with('schoolClass')->find($id);

        if ($student) {
            ActivityLog::create([
                'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
                'student_name' => $student->name,
                'student_nisn' => $student->nisn,
                'class_name' => $student->schoolClass->name ?? $student->class_id,
                'action' => 'DELETE_STUDENT',
                'action_label' => 'Menghapus Siswa',
            ]);

            $student->delete();
        }

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearClassData(Request $request)
    {
        $validated = $request->validate([
            'classId' => 'required|string',
            'password' => ['required', 'current_password'],
        ]);

        $class = ClassModel::find($validated['classId']);
        $className = $class->name ?? $validated['classId'];

        $studentIds = Student::where('class_id', $validated['classId'])->pluck('id')->toArray();
        $studentCount = count($studentIds);

        // Delete progress
        HafalanProgress::whereIn('student_id', $studentIds)->delete();

        // Delete students
        Student::where('class_id', $validated['classId'])->delete();

        // Delete activity logs for this class
        ActivityLog::where('class_name', $className)
            ->orWhere('class_name', $validated['classId'])
            ->delete();

        // Log the clear action
        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => "Seluruh Data ({$studentCount} Siswa)",
            'student_nisn' => '-',
            'class_name' => $className,
            'action' => 'CLEAR_CLASS',
            'action_label' => "Kosongkan Data Siswa & Hafalan {$className}",
        ]);

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'progress' => $this->getProgressData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearAllData(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $studentCount = Student::count();

        // Delete all progress, students, and logs
        HafalanProgress::query()->delete();
        Student::query()->delete();
        ActivityLog::query()->delete();

        // Create initial log for clear all action
        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => "Seluruh Data Aplikasi ({$studentCount} Siswa)",
            'student_nisn' => '-',
            'class_name' => 'Semua Kelas',
            'action' => 'RESET_ALL',
            'action_label' => 'Mereset & Mengosongkan Seluruh Data Murid & Riwayat',
        ]);

        return response()->json([
            'success' => true,
            'students' => [],
            'progress' => [],
            'history' => $this->getLogsData(),
        ]);
    }

    public function clearHistory(Request $request)
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $logCount = ActivityLog::count();

        ActivityLog::query()->delete();

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => "Log Riwayat ({$logCount} Item)",
            'student_nisn' => '-',
            'class_name' => 'Sistem',
            'action' => 'CLEAR_HISTORY',
            'action_label' => 'Membersihkan Seluruh Riwayat Aktivitas Log',
        ]);

        return response()->json([
            'success' => true,
            'history' => $this->getLogsData(),
        ]);
    }

    public function getStudentDetail(string $idOrNisn)
    {
        $student = Student::with('schoolClass')
            ->where('id', $idOrNisn)
            ->orWhere('nisn', $idOrNisn)
            ->first();

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'Siswa tidak ditemukan dengan ID/NISN: '.$idOrNisn,
            ], 404);
        }

        $progressRecords = HafalanProgress::where('student_id', $student->id)->get();

        $progressMap = [];
        foreach ($progressRecords as $rec) {
            $progressMap[$rec->surah_id][] = (int) $rec->verse_num;
        }

        foreach ($progressMap as $sId => $verses) {
            sort($progressMap[$sId]);
        }

        $surahs = [
            ['id' => 'al-mursalat', 'number' => 77, 'name' => 'Al-Mursalat', 'arabicName' => 'المرسلات', 'totalVerses' => 50, 'grade' => 7, 'semester' => 1],
            ['id' => 'al-insan', 'number' => 76, 'name' => 'Al-Insan', 'arabicName' => 'الإنسان', 'totalVerses' => 31, 'grade' => 7, 'semester' => 2],
            ['id' => 'al-qiyamah', 'number' => 75, 'name' => 'Al-Qiyamah', 'arabicName' => 'القيامة', 'totalVerses' => 40, 'grade' => 8, 'semester' => 1],
            ['id' => 'al-muddtastsir', 'number' => 74, 'name' => 'Al-Muddaththir', 'arabicName' => 'المدثر', 'totalVerses' => 56, 'grade' => 8, 'semester' => 2],
            ['id' => 'al-muzzammil', 'number' => 73, 'name' => 'Al-Muzzammil', 'arabicName' => 'المزمل', 'totalVerses' => 20, 'grade' => 9, 'semester' => 1],
            ['id' => 'al-jin', 'number' => 72, 'name' => 'Al-Jinn', 'arabicName' => 'الجن', 'totalVerses' => 28, 'grade' => 9, 'semester' => 2],
        ];

        $totalVersesCompleted = 0;
        $totalCompletedSurahs = 0;
        $surahStats = [];

        foreach ($surahs as $surah) {
            $completedVerses = count($progressMap[$surah['id']] ?? []);
            $isCompleted = ($completedVerses >= $surah['totalVerses']);
            $percentage = round(($completedVerses / $surah['totalVerses']) * 100);

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
                'completedVerseList' => $progressMap[$surah['id']] ?? [],
                'percentage' => $percentage,
                'isCompleted' => $isCompleted,
            ];
        }

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $student->id,
                'nisn' => $student->nisn,
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

    public function importStudents(Request $request)
    {
        $validated = $request->validate([
            'students' => 'required|array',
            'students.*.id' => 'required|string',
            'students.*.nisn' => 'required|string',
            'students.*.name' => 'required|string',
            'students.*.gender' => 'required|in:L,P',
            'students.*.classId' => 'required|string',
        ]);

        foreach ($validated['students'] as $s) {
            Student::updateOrCreate(
                ['id' => $s['id']],
                [
                    'nisn' => $s['nisn'],
                    'name' => $s['name'],
                    'gender' => $s['gender'],
                    'class_id' => $s['classId'],
                ]
            );
        }

        $classId = $validated['students'][0]['classId'] ?? 'Import';
        $class = ClassModel::find($classId);

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => count($validated['students']).' Siswa',
            'student_nisn' => '-',
            'class_name' => $class->name ?? $classId,
            'action' => 'IMPORT_STUDENTS',
            'action_label' => 'Import Data Siswa Massal',
        ]);

        return response()->json([
            'success' => true,
            'students' => $this->getStudentsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'schoolName' => 'nullable|string',
            'quranTeacherName' => 'nullable|string',
        ]);

        SchoolSetting::updateOrCreate(
            ['key' => 'school_name'],
            ['value' => $validated['schoolName'] ?? '']
        );

        SchoolSetting::updateOrCreate(
            ['key' => 'quran_teacher_name'],
            ['value' => $validated['quranTeacherName'] ?? '']
        );

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => 'Pengaturan Sekolah',
            'student_nisn' => '-',
            'class_name' => 'Sistem',
            'action' => 'UPDATE_SETTINGS',
            'action_label' => 'Mengubah Pengaturan Sekolah',
        ]);

        return response()->json([
            'success' => true,
            'settings' => $this->getSettingsData(),
            'history' => $this->getLogsData(),
        ]);
    }

    public function updateWaliKelas(Request $request)
    {
        $validated = $request->validate([
            'classes' => 'required|array',
            'classes.*.id' => 'required|string',
            'classes.*.waliKelas' => 'nullable|string',
        ]);

        foreach ($validated['classes'] as $cls) {
            ClassModel::where('id', $cls['id'])->update([
                'wali_kelas' => $cls['waliKelas'] ?? '',
            ]);
        }

        ActivityLog::create([
            'timestamp_str' => now()->setTimezone('Asia/Jakarta')->translatedFormat('d M Y H:i:s'),
            'student_name' => 'Wali Kelas 12 Rombel',
            'student_nisn' => '-',
            'class_name' => 'Sistem',
            'action' => 'UPDATE_SETTINGS',
            'action_label' => 'Mengubah Nama Wali Kelas 12 Rombel',
        ]);

        return response()->json([
            'success' => true,
            'classes' => $this->getClassesData(),
        ]);
    }

    // --- HELPER DATA BUILDERS ---

    private function getClassesData(): array
    {
        return ClassModel::all()->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'grade' => (int) $c->grade,
                'section' => $c->section,
                'waliKelas' => $c->wali_kelas,
            ];
        })->toArray();
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
                'nisn' => $s->nisn,
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
        return ActivityLog::orderBy('id', 'desc')->take(200)->get()->map(function ($l) {
            return [
                'id' => (string) $l->id,
                'timestamp' => $l->timestamp_str,
                'studentName' => $l->student_name,
                'studentNisn' => $l->student_nisn,
                'className' => $l->class_name,
                'surahName' => $l->surah_name,
                'verseNum' => $l->verse_num ? (int) $l->verse_num : null,
                'action' => $l->action,
                'actionLabel' => $l->action_label,
            ];
        })->toArray();
    }
}
