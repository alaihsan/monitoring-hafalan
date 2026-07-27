import React from 'react';
import { Head } from '@inertiajs/react';
import {
    CLASSES,
    ClassInfo,
    Surah,
    Student,
    ProgressData,
    SchoolSettings,
    loadSavedStudents,
    loadSavedProgress,
    loadSavedClasses,
    loadSchoolSettings,
    validateShareTokenExpiration,
    getSurahForGradeAndSemester,
} from '@/data/hafalan-data';

import { HafalanMatrixTable } from '@/components/hafalan/HafalanMatrixTable';
import { MobileStudentView } from '@/components/hafalan/MobileStudentView';
import { PrintReportModal } from '@/components/hafalan/PrintReportModal';
import { BookOpenCheck, Printer, Users, Award, Percent, AlertOctagon, Lock, ArrowLeft, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HafalanSharePage() {
    const [classes, setClasses] = React.useState<ClassInfo[]>(CLASSES);
    const [students, setStudents] = React.useState<Student[]>([]);
    const [progress, setProgress] = React.useState<ProgressData>({});
    const [schoolSettings, setSchoolSettings] = React.useState<SchoolSettings>({ schoolName: '', quranTeacherName: '' });

    const [selectedClassId, setSelectedClassId] = React.useState<string>('7A');
    const [selectedSemester, setSelectedSemester] = React.useState<number>(1);
    const [isPrintModalOpen, setIsPrintModalOpen] = React.useState<boolean>(false);

    // Expiration state
    const [isLinkExpired, setIsLinkExpired] = React.useState<boolean>(false);
    const [expiredDateText, setExpiredDateText] = React.useState<string>('');

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const classParam = urlParams.get('class');
            const expiresParam = urlParams.get('expires');

            // Validate Expiration
            const validation = validateShareTokenExpiration(expiresParam);
            if (validation.isExpired) {
                setIsLinkExpired(true);
                setExpiredDateText(validation.expiredDateText || '');
                return;
            }

            // Strictly lock class to the share link parameter
            if (classParam && CLASSES.some(c => c.id === classParam)) {
                setSelectedClassId(classParam);
            }
        }

        const loadedStds = loadSavedStudents();
        const savedClasses = loadSavedClasses();
        const savedProg = loadSavedProgress(loadedStds);
        const settings = loadSchoolSettings();

        setStudents(loadedStds);
        setClasses(savedClasses);
        setProgress(savedProg);
        setSchoolSettings(settings);
    }, []);

    const currentClass = React.useMemo(() => {
        return classes.find((c) => c.id === selectedClassId) || classes[0];
    }, [classes, selectedClassId]);

    const currentSurah = React.useMemo(() => {
        return getSurahForGradeAndSemester(currentClass.grade, selectedSemester);
    }, [currentClass, selectedSemester]);

    const currentClassStudents = React.useMemo(() => {
        return students.filter((s) => s.classId === currentClass.id);
    }, [students, currentClass]);

    const { completedCount, avgProgress } = React.useMemo(() => {
        if (currentClassStudents.length === 0) return { completedCount: 0, avgProgress: 0 };

        let completed = 0;
        let totalPercentSum = 0;

        currentClassStudents.forEach((s) => {
            const verses = progress[s.id]?.[currentSurah.id] || [];
            if (verses.length === currentSurah.totalVerses) {
                completed++;
            }
            totalPercentSum += (verses.length / currentSurah.totalVerses) * 100;
        });

        return {
            completedCount: completed,
            avgProgress: Math.round(totalPercentSum / currentClassStudents.length),
        };
    }, [currentClassStudents, progress, currentSurah]);

    // If Link is Expired -> Render Friendly Error Screen
    if (isLinkExpired) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                <Head title="Link Kadaluarsa - Monitoring Hafalan" />
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                    <div className="size-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
                        <AlertOctagon className="size-10" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-white">Link Share Sudah Kadaluarsa</h1>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Link publik monitoring hafalan ini telah melewati batas waktu berlaku{' '}
                            <span className="font-mono text-rose-400 font-bold">({expiredDateText})</span> yang ditentukan oleh Admin Sekolah.
                        </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2 text-left">
                        <div className="flex items-center gap-2 font-bold text-amber-400">
                            <Lock className="size-4" /> Apa yang harus dilakukan?
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Silakan hubungi Wali Kelas atau Guru Pengampu untuk meminta link publik terbaru dengan durasi berlaku yang disesuaikan.
                        </p>
                    </div>

                    <div className="pt-2">
                        <a
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors"
                        >
                            <ArrowLeft className="size-4" /> Masuk Ke Halaman Login Admin
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <Head title={`Laporan Public Hafalan - ${currentClass.name}`} />

            {/* Top Public Navigation Header */}
            <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
                <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <BookOpenCheck className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                                {schoolSettings.schoolName}
                            </div>
                            <div className="text-sm font-black text-white">
                                Laporan Public Monitoring Hafalan Al-Qur'an
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-md"
                        >
                            <Printer className="size-4 mr-1.5" /> Cetak Laporan (A4/F4)
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full space-y-6">
                {/* Banner Info - Strictly Single Class */}
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-xl space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-amber-400 text-slate-950 text-xs px-3 py-0.5 rounded-full font-black">
                                    {currentClass.name}
                                </span>
                                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs px-3 py-0.5 rounded-full font-bold">
                                    Semester {currentSurah.semester}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    <ShieldCheck className="size-3 text-blue-300" /> Share Terkunci {currentClass.name}
                                </span>
                            </div>
                            <h1 className="text-2xl font-black sm:text-3xl text-white">
                                Progress Hafalan Surat {currentSurah.name} ({currentSurah.arabicName})
                            </h1>
                            <p className="text-xs text-emerald-100">
                                Wali Kelas: <strong className="text-white">{currentClass.waliKelas}</strong> • Target: {currentSurah.totalVerses} Ayat
                            </p>
                        </div>

                        {/* Semester Switcher for this specific class only (NO class dropdown!) */}
                        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 space-y-1.5 min-w-[200px]">
                            <label className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                                <Calendar className="size-3.5 text-amber-300" /> Pilih Semester:
                            </label>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setSelectedSemester(1)}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                                        selectedSemester === 1
                                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-500/30 hover:text-white'
                                    }`}
                                >
                                    Sem 1
                                </button>
                                <button
                                    onClick={() => setSelectedSemester(2)}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                                        selectedSemester === 2
                                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                                            : 'bg-emerald-900/60 text-emerald-200 border-emerald-500/30 hover:text-white'
                                    }`}
                                >
                                    Sem 2
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Users className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Total Murid {currentClass.name}</div>
                            <div className="text-xl font-extrabold text-foreground">{currentClassStudents.length} Siswa</div>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Award className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Tuntas Hafalan</div>
                            <div className="text-xl font-extrabold text-emerald-600">
                                {completedCount} <span className="text-xs text-muted-foreground font-normal">/ {currentClassStudents.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                            <Percent className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Rata-rata Progres</div>
                            <div className="text-xl font-extrabold text-foreground">{avgProgress}%</div>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                            <BookOpenCheck className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Target Verses</div>
                            <div className="text-xl font-extrabold text-foreground">{currentSurah.totalVerses} Ayat</div>
                        </div>
                    </div>
                </div>

                {/* Matrix Table (View Only) */}
                <div className="hidden md:block">
                    <HafalanMatrixTable
                        students={currentClassStudents}
                        surah={currentSurah}
                        progress={progress}
                        isViewOnly={true}
                        onToggleVerse={() => {}}
                        onToggleColumnVerse={() => {}}
                    />
                </div>

                {/* Mobile View */}
                <MobileStudentView
                    students={currentClassStudents}
                    surah={currentSurah}
                    progress={progress}
                    isViewOnly={true}
                    onToggleVerse={() => {}}
                />

                {/* Print Report Modal */}
                <PrintReportModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    currentClass={currentClass}
                    currentSurah={currentSurah}
                    students={currentClassStudents}
                    progress={progress}
                    schoolSettings={schoolSettings}
                />
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground bg-card mt-6">
                © {new Date().getFullYear()} {schoolSettings.schoolName} • Laporan Monitoring Public {currentClass.name}
            </footer>
        </div>
    );
}
