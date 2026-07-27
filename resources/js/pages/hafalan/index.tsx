import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
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
    saveProgressToStorage,
    loadSavedClasses,
    saveClassesToStorage,
    loadSchoolSettings,
    addHistoryLog,
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

export default function HafalanMonitoringPage() {
    // 1. Core State
    const [classes, setClasses] = React.useState<ClassInfo[]>(CLASSES);
    const [students, setStudents] = React.useState<Student[]>([]);
    const [progress, setProgress] = React.useState<ProgressData>({});
    const [schoolSettings, setSchoolSettings] = React.useState<SchoolSettings>({ schoolName: '', quranTeacherName: '' });

    const [selectedClassId, setSelectedClassId] = React.useState<string>('7A');
    const [selectedSemester, setSelectedSemester] = React.useState<number>(1);
    const [customSurah, setCustomSurah] = React.useState<Surah | null>(null);

    // Default View in Admin Menu is VIEW-ONLY (isViewOnly = true)
    const [isViewOnly, setIsViewOnly] = React.useState<boolean>(true);

    // Modals
    const [isPrintModalOpen, setIsPrintModalOpen] = React.useState<boolean>(false);

    // Initial Load & LocalStorage Hydration
    React.useEffect(() => {
        const loadedStds = loadSavedStudents();
        const savedClasses = loadSavedClasses();
        const savedProg = loadSavedProgress(loadedStds);
        const settings = loadSchoolSettings();

        setStudents(loadedStds);
        setClasses(savedClasses);
        setProgress(savedProg);
        setSchoolSettings(settings);
    }, []);

    // Derived Selected Class & Surah
    const currentClass = React.useMemo(() => {
        return classes.find((c) => c.id === selectedClassId) || classes[0];
    }, [classes, selectedClassId]);

    const currentSurah = React.useMemo(() => {
        if (customSurah && customSurah.grade === currentClass.grade) {
            return customSurah;
        }
        return getSurahForGradeAndSemester(currentClass.grade, selectedSemester);
    }, [currentClass, selectedSemester, customSurah]);

    // Current Class Students
    const currentClassStudents = React.useMemo(() => {
        return students.filter((s) => s.classId === currentClass.id);
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

    // Handlers with Activity Logging
    const handleToggleVerse = (studentId: string, surahId: string, verseNum: number) => {
        if (isViewOnly) return;
        const studentObj = students.find((s) => s.id === studentId);

        setProgress((prev) => {
            const studentProg = prev[studentId] || {};
            const surahProg = studentProg[surahId] || [];

            const isCurrentlyChecked = surahProg.includes(verseNum);
            let updatedSurahProg: number[];

            if (isCurrentlyChecked) {
                updatedSurahProg = surahProg.filter((v) => v !== verseNum);
                if (studentObj) {
                    addHistoryLog({
                        studentName: studentObj.name,
                        studentNisn: studentObj.nisn,
                        className: currentClass.name,
                        surahName: currentSurah.name,
                        verseNum: verseNum,
                        action: 'UNCHECKED',
                    });
                }
            } else {
                updatedSurahProg = [...surahProg, verseNum].sort((a, b) => a - b);
                if (studentObj) {
                    addHistoryLog({
                        studentName: studentObj.name,
                        studentNisn: studentObj.nisn,
                        className: currentClass.name,
                        surahName: currentSurah.name,
                        verseNum: verseNum,
                        action: 'CHECKED',
                    });
                }
            }

            const next = {
                ...prev,
                [studentId]: {
                    ...studentProg,
                    [surahId]: updatedSurahProg,
                },
            };
            saveProgressToStorage(next);
            return next;
        });
    };

    const handleToggleColumnVerse = (surahId: string, verseNum: number, check: boolean) => {
        if (isViewOnly) return;

        setProgress((prev) => {
            const next = { ...prev };

            currentClassStudents.forEach((s) => {
                const studentProg = next[s.id] || {};
                const surahProg = studentProg[surahId] || [];

                let updatedSurahProg: number[];
                if (check) {
                    if (!surahProg.includes(verseNum)) {
                        updatedSurahProg = [...surahProg, verseNum].sort((a, b) => a - b);
                        addHistoryLog({
                            studentName: s.name,
                            studentNisn: s.nisn,
                            className: currentClass.name,
                            surahName: currentSurah.name,
                            verseNum: verseNum,
                            action: 'CHECKED',
                        });
                    } else {
                        updatedSurahProg = surahProg;
                    }
                } else {
                    if (surahProg.includes(verseNum)) {
                        updatedSurahProg = surahProg.filter((v) => v !== verseNum);
                        addHistoryLog({
                            studentName: s.name,
                            studentNisn: s.nisn,
                            className: currentClass.name,
                            surahName: currentSurah.name,
                            verseNum: verseNum,
                            action: 'UNCHECKED',
                        });
                    } else {
                        updatedSurahProg = surahProg;
                    }
                }

                next[s.id] = {
                    ...studentProg,
                    [surahId]: updatedSurahProg,
                };
            });

            saveProgressToStorage(next);
            return next;
        });
    };

    const handleEditWaliKelas = (classId: string, newWaliKelas: string) => {
        setClasses((prev) => {
            const next = prev.map((c) => (c.id === classId ? { ...c, waliKelas: newWaliKelas } : c));
            saveClassesToStorage(next);
            return next;
        });
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
                        setSelectedClassId(cls.id);
                        setCustomSurah(null);
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
