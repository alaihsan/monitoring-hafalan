import React from 'react';
import { Student, Surah, ProgressData } from '@/data/hafalan-data';
import { ChevronDown, ChevronUp, Check, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MobileStudentViewProps {
    students: Student[];
    surah: Surah;
    progress: ProgressData;
    isViewOnly: boolean;
    onToggleVerse: (studentId: string, surahId: string, verseNum: number) => void;
}

export const MobileStudentView: React.FC<MobileStudentViewProps> = ({
    students,
    surah,
    progress,
    isViewOnly,
    onToggleVerse,
}) => {
    const [expandedStudentId, setExpandedStudentId] = React.useState<string | null>(students[0]?.id || null);

    const totalVerses = surah.totalVerses;
    const verseArray = Array.from({ length: totalVerses }, (_, i) => i + 1);

    return (
        <div className="space-y-3 md:hidden">
            <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between px-1">
                <span>Tampilan Responsif Murid ({students.length} Murid)</span>
                <span>{isViewOnly ? 'Mode View-Only' : 'Klik Murid untuk Detail Ayat'}</span>
            </div>

            {students.map((student, idx) => {
                const isExpanded = expandedStudentId === student.id;
                const completedVerses = progress[student.id]?.[surah.id] || [];
                const count = completedVerses.length;
                const percent = Math.round((count / totalVerses) * 100);
                const isCompleted = count === totalVerses;

                return (
                    <div
                        key={student.id}
                        className={`bg-card text-card-foreground border-border rounded-xl border shadow-sm transition-all overflow-hidden ${
                            isCompleted ? 'border-emerald-500/50 bg-emerald-500/5' : ''
                        }`}
                    >
                        {/* Student Card Header */}
                        <div
                            onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 select-none"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex size-8 items-center justify-center rounded-lg font-bold text-xs ${
                                    isCompleted ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">{student.name}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                            student.gender === 'L' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600'
                                        }`}>
                                            {student.gender}
                                        </span>
                                    </div>
                                    {!isViewOnly && <div className="text-xs text-muted-foreground font-mono">NIS: {student.nis}</div>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className={`text-xs font-extrabold ${isCompleted ? 'text-emerald-600' : 'text-foreground'}`}>
                                        {count}/{totalVerses} <span className="font-normal text-muted-foreground">({percent}%)</span>
                                    </div>
                                    {isCompleted ? (
                                        <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">Tuntas</Badge>
                                    ) : (
                                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden mt-1">
                                            <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                                        </div>
                                    )}
                                </div>
                                {isExpanded ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
                            </div>
                        </div>

                        {/* Expanded Verse Checklist Grid */}
                        {isExpanded && (
                            <div className="border-t border-border/60 bg-muted/20 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Detail Ayat Surat {surah.name}:</span>
                                </div>

                                <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                                    {verseArray.map((vNum) => {
                                        const isChecked = completedVerses.includes(vNum);
                                        return (
                                            <button
                                                key={vNum}
                                                disabled={isViewOnly}
                                                onClick={() => !isViewOnly && onToggleVerse(student.id, surah.id, vNum)}
                                                className={`flex flex-col items-center justify-center h-10 rounded-lg font-bold text-xs transition-all ${
                                                    isChecked
                                                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                                        : 'bg-background border border-border text-muted-foreground hover:border-emerald-500'
                                                }`}
                                            >
                                                {isChecked ? <Check className="size-4 stroke-[3]" /> : <span>{vNum}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
