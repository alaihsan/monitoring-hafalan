import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ClassInfo,
    Surah,
    Student,
    ProgressData,
    SchoolSettings,
    getSurahForGradeAndSemester,
} from '@/data/hafalan-data';

import { HafalanHeader } from '@/components/hafalan/HafalanHeader';
import { ClassSemesterSelector } from '@/components/hafalan/ClassSemesterSelector';
import { HafalanMatrixTable } from '@/components/hafalan/HafalanMatrixTable';
import { MobileStudentView } from '@/components/hafalan/MobileStudentView';
import { PrintReportModal } from '@/components/hafalan/PrintReportModal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Monitoring Hafalan',
        href: '/hafalan',
    },
];

interface IndexPageProps {
    initialClasses: ClassInfo[];
    currentClassId: string | null;
    initialStudents: Student[];
    initialProgress: ProgressData;
    initialSettings: SchoolSettings;
}

export default function HafalanMonitoringPage({
    initialClasses,
    currentClassId,
    initialStudents,
    initialProgress,
    initialSettings,
}: IndexPageProps) {
    // The server is the only source of truth. Students and progress arrive already
    // scoped to the selected class, so there is nothing to hydrate from a local cache.
    const classes = React.useMemo(() => initialClasses ?? [], [initialClasses]);
    const students = React.useMemo(() => initialStudents ?? [], [initialStudents]);
    const schoolSettings = initialSettings ?? { schoolName: '', quranTeacherName: '' };

    // Progress is the one piece kept in state, so a toggle can update optimistically.
    const [progress, setProgress] = React.useState<ProgressData>(initialProgress ?? {});

    React.useEffect(() => {
        setProgress(initialProgress ?? {});
    }, [initialProgress]);

    const [selectedSemester, setSelectedSemester] = React.useState<number>(1);
    const [customSurah, setCustomSurah] = React.useState<Surah | null>(null);

    // Default View in Admin Menu is VIEW-ONLY (isViewOnly = true)
    const [isViewOnly, setIsViewOnly] = React.useState<boolean>(true);

    // Modals
    const [isPrintModalOpen, setIsPrintModalOpen] = React.useState<boolean>(false);

    // Switching class reloads that class's data from the server rather than
    // filtering a full in-memory copy of every class.
    const handleSelectClass = (classId: string) => {
        router.get('/hafalan', { class: classId }, { preserveScroll: true, preserveState: false });
    };

    // Derived Selected Class & Surah
    const currentClass = React.useMemo(() => {
        return classes.find((c) => c.id === currentClassId) || classes[0];
    }, [classes, currentClassId]);

    const currentSurah = React.useMemo(() => {
        if (customSurah && customSurah.grade === currentClass.grade) {
            return customSurah;
        }
        return getSurahForGradeAndSemester(currentClass.grade, selectedSemester);
    }, [currentClass, selectedSemester, customSurah]);

    // Current Class Students
    // Already scoped server-side; filtered defensively in case props lag a reload.
    const currentClassStudents = React.useMemo(() => {
        return students.filter((s) => s.classId === currentClass?.id);
    }, [students, currentClass]);

    // Calculate Class Progress Metrics
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

    const handleEditWaliKelas = async (classId: string, newWaliKelas: string) => {
        // Previously this only ever updated the local cache, so the change vanished
        // on the next load and never reached the database.
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/classes/wali-kelas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ classes: [{ id: classId, waliKelas: newWaliKelas }] }),
            });

            if (res.ok) {
                router.reload({ only: ['initialClasses'] });
            }
        } catch (e) {
            console.error('Failed to update wali kelas', e);
        }
    };

    // Handlers: optimistic UI, reconciled against the server's delta response.
    // Client-side history logging was removed — the server writes the audit trail,
    // and duplicating it locally produced entries nobody could attribute.
    const applyVerse = (
        current: ProgressData,
        studentId: string,
        surahId: string,
        verseNum: number,
        checked: boolean
    ): ProgressData => {
        const studentProg = current[studentId] || {};
        const surahProg = studentProg[surahId] || [];

        const nextVerses = checked
            ? (surahProg.includes(verseNum) ? surahProg : [...surahProg, verseNum].sort((a, b) => a - b))
            : surahProg.filter((v) => v !== verseNum);

        return { ...current, [studentId]: { ...studentProg, [surahId]: nextVerses } };
    };

    const handleToggleVerse = async (studentId: string, surahId: string, verseNum: number) => {
        if (isViewOnly) return;

        const before = progress;
        const willCheck = !(progress[studentId]?.[surahId] || []).includes(verseNum);

        setProgress((prev) => applyVerse(prev, studentId, surahId, verseNum, willCheck));

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/toggle-verse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ studentId, surahId, verseNum, surahName: currentSurah.name }),
            });

            if (!res.ok) {
                setProgress(before);
                return;
            }

            const data = await res.json();
            // Trust the server's answer over the optimistic guess.
            setProgress((prev) => applyVerse(prev, studentId, surahId, verseNum, data.checked));
        } catch (e) {
            console.error('Failed to sync toggleVerse', e);
            setProgress(before);
        }
    };

    const handleToggleColumnVerse = async (surahId: string, verseNum: number, check: boolean) => {
        if (isViewOnly) return;

        const before = progress;

        setProgress((prev) => {
            let next = prev;
            currentClassStudents.forEach((s) => {
                next = applyVerse(next, s.id, surahId, verseNum, check);
            });
            return next;
        });

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/toggle-column-verse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    classId: currentClass.id,
                    surahId,
                    verseNum,
                    surahName: currentSurah.name,
                }),
            });

            if (!res.ok) {
                setProgress(before);
                return;
            }

            const data = await res.json();
            setProgress((prev) => {
                let next = prev;
                (data.studentIds ?? []).forEach((sid: string) => {
                    next = applyVerse(next, sid, surahId, verseNum, data.checked);
                });
                return next;
            });
        } catch (e) {
            console.error('Failed to sync toggleColumnVerse', e);
            setProgress(before);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Monitoring Hafalan - ${currentClass.name}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto w-full relative z-0">
                {/* 1. Header & Summary Stats */}
                <HafalanHeader
                    currentClass={currentClass}
                    currentSurah={currentSurah}
                    totalStudents={currentClassStudents.length}
                    completedStudentsCount={completedCount}
                    averageProgressPercent={avgProgress}
                    isViewOnly={isViewOnly}
                    onToggleViewOnly={() => setIsViewOnly(!isViewOnly)}
                    onOpenPrintModal={() => setIsPrintModalOpen(true)}
                />

                {/* 2. Class, Grade, Semester & Surah Controls */}
                <ClassSemesterSelector
                    classes={classes}
                    selectedClass={currentClass}
                    students={students}
                    onSelectClass={(cls) => {
                        setCustomSurah(null);
                        handleSelectClass(cls.id);
                    }}
                    selectedSemester={selectedSemester}
                    onSelectSemester={(sem) => {
                        setSelectedSemester(sem);
                        setCustomSurah(null);
                    }}
                    selectedSurah={currentSurah}
                    onSelectSurah={setCustomSurah}
                    onEditWaliKelas={handleEditWaliKelas}
                />

                {/* 3. Desktop / Tablet Matrix Table */}
                <div className="hidden md:block">
                    <HafalanMatrixTable
                        students={currentClassStudents}
                        surah={currentSurah}
                        progress={progress}
                        isViewOnly={isViewOnly}
                        onToggleVerse={handleToggleVerse}
                        onToggleColumnVerse={handleToggleColumnVerse}
                    />
                </div>

                {/* 4. Mobile Optimized View */}
                <MobileStudentView
                    students={currentClassStudents}
                    surah={currentSurah}
                    progress={progress}
                    isViewOnly={isViewOnly}
                    onToggleVerse={handleToggleVerse}
                />

                {/* 5. Print Modal */}
                <PrintReportModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    currentClass={currentClass}
                    currentSurah={currentSurah}
                    students={currentClassStudents}
                    progress={progress}
                    schoolSettings={schoolSettings}
                />
            </div>
        </AppLayout>
    );
}
