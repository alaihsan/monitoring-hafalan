import React from 'react';
import { ClassInfo, Surah, Student, SURAHS } from '@/data/hafalan-data';
import { BookOpen, UserCheck, Calendar, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ClassSemesterSelectorProps {
    classes: ClassInfo[];
    selectedClass: ClassInfo;
    students: Student[];
    onSelectClass: (cls: ClassInfo) => void;
    selectedSemester: number;
    onSelectSemester: (semester: number) => void;
    selectedSurah: Surah;
    onSelectSurah: (surah: Surah) => void;
    onEditWaliKelas: (clsId: string, newWaliKelas: string) => void;
}

export const ClassSemesterSelector: React.FC<ClassSemesterSelectorProps> = ({
    classes,
    selectedClass,
    students,
    onSelectClass,
    selectedSemester,
    onSelectSemester,
    selectedSurah,
    onSelectSurah,
    onEditWaliKelas,
}) => {
    const [selectedGrade, setSelectedGrade] = React.useState<number>(selectedClass.grade);
    const [isEditingWali, setIsEditingWali] = React.useState(false);
    const [waliInput, setWaliInput] = React.useState(selectedClass.waliKelas);

    // Keep state updated when class changes
    React.useEffect(() => {
        setSelectedGrade(selectedClass.grade);
        setWaliInput(selectedClass.waliKelas);
        setIsEditingWali(false);
    }, [selectedClass]);

    const filteredClasses = classes.filter((c) => c.grade === selectedGrade);
    const availableSurahs = SURAHS.filter((s) => s.grade === selectedClass.grade);

    const handleSaveWali = () => {
        onEditWaliKelas(selectedClass.id, waliInput);
        setIsEditingWali(false);
    };

    return (
        <div className="bg-card text-card-foreground border-border space-y-4 rounded-xl border p-4 shadow-sm md:p-6">
            {/* Upper row: Grade selector & Semester toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                {/* Grade selector buttons */}
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                        <Layers className="size-4" /> Tingkat:
                    </span>
                    <div className="flex rounded-lg bg-muted/60 p-1">
                        {[7, 8, 9].map((grade) => (
                            <button
                                key={grade}
                                onClick={() => {
                                    setSelectedGrade(grade);
                                    const firstClassOfGrade = classes.find((c) => c.grade === grade);
                                    if (firstClassOfGrade) onSelectClass(firstClassOfGrade);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                                    selectedGrade === grade
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Kelas {grade}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Semester selection */}
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                        <Calendar className="size-4" /> Semester:
                    </span>
                    <div className="flex rounded-lg bg-muted/60 p-1">
                        {[1, 2].map((sem) => (
                            <button
                                key={sem}
                                onClick={() => onSelectSemester(sem)}
                                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                    selectedSemester === sem
                                        ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Semester {sem}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Row: Class Pill Badges & Wali Kelas Info */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Class buttons with dynamic student count badge */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs font-medium">Pilih Rombongan Belajar (Rombel):</label>
                    <div className="flex flex-wrap gap-2">
                        {filteredClasses.map((cls) => {
                            const isSelected = cls.id === selectedClass.id;
                            const classStudentCount = cls.studentCount ?? (students ? students.filter((s) => s.classId === cls.id).length : 0);

                            return (
                                <button
                                    key={cls.id}
                                    onClick={() => onSelectClass(cls)}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
                                            : 'bg-muted/40 hover:bg-muted text-foreground border border-border/80'
                                    }`}
                                >
                                    <span>{cls.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {classStudentCount} Murid
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Wali Kelas Badge & Editor */}
                <div className="bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 md:min-w-[280px]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                            <UserCheck className="size-5" />
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider dark:text-emerald-300">
                                Wali Kelas {selectedClass.name}
                            </div>
                            {isEditingWali ? (
                                <div className="mt-1 flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={waliInput}
                                        onChange={(e) => setWaliInput(e.target.value)}
                                        className="bg-background border-input text-foreground h-7 rounded px-2 text-xs focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <Button size="sm" className="h-7 bg-emerald-600 px-2 text-[11px]" onClick={handleSaveWali}>
                                        Simpan
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {selectedClass.waliKelas}
                                </div>
                            )}
                        </div>
                    </div>
                    {!isEditingWali && (
                        <button
                            onClick={() => setIsEditingWali(true)}
                            className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                        >
                            Ubah
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Row: Active Target Surah Card */}
            <div className="bg-muted/40 border-border/80 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <BookOpen className="size-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Target Hafalan Surat:
                            </span>
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                                Sem {selectedSurah.semester}
                            </Badge>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-foreground">{selectedSurah.name}</span>
                            <span className="font-serif text-xl font-bold text-amber-600 dark:text-amber-400">
                                ({selectedSurah.arabicName})
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                • Surat ke-{selectedSurah.number} ({selectedSurah.totalVerses} Ayat)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Optional Surah Selector if available in grade */}
                {availableSurahs.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Pilih Surat:</span>
                        <select
                            value={selectedSurah.id}
                            onChange={(e) => {
                                const found = SURAHS.find((s) => s.id === e.target.value);
                                if (found) onSelectSurah(found);
                            }}
                            className="bg-background border-border text-foreground h-9 rounded-lg border px-3 text-xs font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            {availableSurahs.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.totalVerses} Ayat) - Sem {s.semester}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};
