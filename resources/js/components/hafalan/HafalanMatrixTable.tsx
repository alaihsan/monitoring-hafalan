import React from 'react';
import { Student, Surah, ProgressData } from '@/data/hafalan-data';
import { Check, Search, Filter, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface HafalanMatrixTableProps {
    students: Student[];
    surah: Surah;
    progress: ProgressData;
    isViewOnly: boolean;
    onToggleVerse: (studentId: string, surahId: string, verseNum: number) => void;
    onToggleColumnVerse: (surahId: string, verseNum: number, check: boolean) => void;
}

export const HafalanMatrixTable: React.FC<HafalanMatrixTableProps> = ({
    students,
    surah,
    progress,
    isViewOnly,
    onToggleVerse,
    onToggleColumnVerse,
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');

    const totalVerses = surah.totalVerses;
    const verseArray = Array.from({ length: totalVerses }, (_, i) => i + 1);

    // Filter students
    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.nisn.includes(searchQuery);

        const studentVerses = progress[student.id]?.[surah.id] || [];
        const isCompleted = studentVerses.length === totalVerses;

        const matchesStatus =
            statusFilter === 'ALL' ||
            (statusFilter === 'COMPLETED' && isCompleted) ||
            (statusFilter === 'IN_PROGRESS' && !isCompleted);

        return matchesSearch && matchesStatus;
    });

    const getVerseStats = (verseNum: number) => {
        let count = 0;
        students.forEach((s) => {
            if (progress[s.id]?.[surah.id]?.includes(verseNum)) {
                count++;
            }
        });
        return {
            count,
            percent: Math.round((count / (students.length || 1)) * 100),
        };
    };

    return (
        <div className="bg-card text-card-foreground border-border space-y-4 rounded-xl border shadow-sm relative z-0">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border/80 bg-muted/20">
                {/* Search Box */}
                <div className="relative min-w-[240px] flex-1">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                    <Input
                        type="text"
                        placeholder="Cari nama murid..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background pl-9 text-xs"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 text-xs">
                        <Filter className="size-3 text-muted-foreground ml-1" />
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-2.5 py-1 rounded font-medium ${statusFilter === 'ALL' ? 'bg-muted-foreground/20 text-foreground' : 'text-muted-foreground'}`}
                        >
                            Semua ({students.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('COMPLETED')}
                            className={`px-2.5 py-1 rounded font-medium ${statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'}`}
                        >
                            Tuntas
                        </button>
                        <button
                            onClick={() => setStatusFilter('IN_PROGRESS')}
                            className={`px-2.5 py-1 rounded font-medium ${statusFilter === 'IN_PROGRESS' ? 'bg-amber-600 text-white' : 'text-muted-foreground'}`}
                        >
                            Proses
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix Table container: isolated overflow so horizontal scroll passes cleanly under sticky student column and page sidebar */}
            <div className="relative overflow-x-auto overflow-y-auto max-h-[70vh] rounded-b-xl border-t border-border bg-card">
                <table className="w-full text-left border-collapse text-xs">
                    {/* Header Row */}
                    <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md text-foreground shadow-sm">
                        <tr className="border-b border-border">
                            {/* Sticky Column 1: No */}
                            <th className="sticky left-0 z-30 bg-muted/95 px-3 py-3 font-bold text-center w-10 border-r border-border">
                                No
                            </th>

                            {/* Sticky Column 2: NISN (Only shown when not in View-Only mode) */}
                            {!isViewOnly && (
                                <th className="sticky left-10 z-30 bg-muted/95 px-3 py-3 font-bold min-w-[90px] border-r border-border">
                                    NISN
                                </th>
                            )}

                            {/* Sticky Column 3: Nama Murid (Dynamic Width, No Truncation) */}
                            <th className={`sticky ${isViewOnly ? 'left-[40px]' : 'left-[130px]'} z-30 bg-muted/95 px-4 py-3 font-bold whitespace-nowrap border-r border-border shadow-[4px_0_12px_-2px_rgba(0,0,0,0.15)]`}>
                                Nama Murid ({students.length})
                            </th>

                            {/* Verse Columns Header */}
                            {verseArray.map((vNum) => {
                                const stats = getVerseStats(vNum);
                                const isAllCheck = stats.count === students.length;

                                return (
                                    <th
                                        key={vNum}
                                        className={`px-1 py-2 text-center min-w-[36px] max-w-[40px] border-r border-border/60 ${
                                            isViewOnly ? '' : 'hover:bg-muted/80 cursor-pointer group'
                                        }`}
                                        title={`Ayat ${vNum} (${stats.count}/${students.length} Siswa Hafal)`}
                                        onClick={() => !isViewOnly && onToggleColumnVerse(surah.id, vNum, !isAllCheck)}
                                    >
                                        <div className="flex flex-col items-center justify-between h-10 gap-0.5">
                                            <span className="font-extrabold text-[11px] text-emerald-800 dark:text-emerald-300">
                                                {vNum}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1 rounded ${
                                                isAllCheck ? 'bg-emerald-600 text-white' : 'text-muted-foreground'
                                            }`}>
                                                {stats.count}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}

                            {/* Progress % Header */}
                            <th className="px-4 py-3 font-bold min-w-[110px] text-center">
                                Progres Hafalan
                            </th>
                        </tr>
                    </thead>

                    {/* Table Body: 36 Students */}
                    <tbody className="divide-y divide-border/60 bg-card">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={totalVerses + 5} className="text-center py-12 text-muted-foreground font-medium">
                                    Tidak ada data murid yang sesuai dengan pencarian filter.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student, idx) => {
                                const completedVerses = progress[student.id]?.[surah.id] || [];
                                const count = completedVerses.length;
                                const percent = Math.round((count / totalVerses) * 100);
                                const isCompleted = count === totalVerses;

                                return (
                                    <tr
                                        key={student.id}
                                        className={`hover:bg-muted/40 transition-colors ${
                                            isCompleted ? 'bg-emerald-500/5' : ''
                                        }`}
                                    >
                                        {/* Sticky Col 1: Index */}
                                        <td className="sticky left-0 z-10 bg-card px-3 py-2.5 text-center font-medium text-muted-foreground border-r border-border">
                                            {idx + 1}
                                        </td>

                                        {/* Sticky Col 2: NISN (Hidden in View-Only) */}
                                        {!isViewOnly && (
                                            <td className="sticky left-10 z-10 bg-card px-3 py-2.5 font-mono text-[11px] text-muted-foreground border-r border-border">
                                                {student.nisn}
                                            </td>
                                        )}

                                        {/* Sticky Col 3: Nama Murid (Dynamic Width, whitespace-nowrap, never truncated) */}
                                        <td className={`sticky ${isViewOnly ? 'left-[40px]' : 'left-[130px]'} z-10 bg-card px-4 py-2.5 font-semibold text-foreground border-r border-border shadow-[4px_0_12px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap flex items-center justify-between gap-3 min-w-[200px]`}>
                                            <span>{student.name}</span>
                                            {isCompleted && (
                                                <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 shrink-0">
                                                    <Award className="size-2.5 mr-0.5" /> Tuntas
                                                </Badge>
                                            )}
                                        </td>

                                        {/* Verse Checklist Columns */}
                                        {verseArray.map((vNum) => {
                                            const isChecked = completedVerses.includes(vNum);

                                            return (
                                                <td
                                                    key={vNum}
                                                    onClick={() => !isViewOnly && onToggleVerse(student.id, surah.id, vNum)}
                                                    className={`px-1 py-1.5 text-center border-r border-border/40 select-none transition-all ${
                                                        isViewOnly ? '' : 'cursor-pointer'
                                                    } ${
                                                        isChecked
                                                            ? 'bg-emerald-600/90 text-white hover:bg-emerald-700'
                                                            : 'hover:bg-amber-500/20 text-muted-foreground'
                                                    }`}
                                                    title={`${student.name} - Ayat ${vNum}: ${isChecked ? 'Hafal' : 'Belum'}`}
                                                >
                                                    <div className="flex items-center justify-center size-7 mx-auto rounded-md transition-all">
                                                        {isChecked ? (
                                                            <Check className="size-4 stroke-[3]" />
                                                        ) : (
                                                            <span className="text-[10px] opacity-40 font-mono">
                                                                {vNum}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Progress Bar (% Only) */}
                                        <td className="px-3 py-2 border-r border-border min-w-[110px]">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className={`font-extrabold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                        {percent}%
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={`h-full transition-all duration-300 ${
                                                            isCompleted
                                                                ? 'bg-emerald-600'
                                                                : percent > 50
                                                                ? 'bg-emerald-500'
                                                                : percent > 20
                                                                ? 'bg-amber-500'
                                                                : 'bg-slate-400'
                                                        }`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Matrix Table Footer Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs text-muted-foreground bg-muted/20 border-t border-border">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="size-3.5 rounded bg-emerald-600 inline-block"></span> Hafal (Checklist)
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="size-3.5 rounded border border-border bg-card inline-block"></span> Belum Hafal
                    </span>
                </div>
                <div className="font-semibold text-foreground">
                    Menampilkan {filteredStudents.length} dari {students.length} Murid
                </div>
            </div>
        </div>
    );
};
