import React from 'react';
import { Student, Surah, ClassInfo } from '@/data/hafalan-data';
import { CheckCheck, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BatchActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentClass: ClassInfo;
    currentSurah: Surah;
    students: Student[];
    targetStudent: Student | null; // If specified, actions apply only to this student
    onApplyRange: (startVerse: number, endVerse: number, studentId?: string, check?: boolean) => void;
    onToggleClassAllVerses: (check: boolean) => void;
}

export const BatchActionModal: React.FC<BatchActionModalProps> = ({
    isOpen,
    onClose,
    currentClass,
    currentSurah,
    students,
    targetStudent,
    onApplyRange,
    onToggleClassAllVerses,
}) => {
    const [startVerse, setStartVerse] = React.useState<number>(1);
    const [endVerse, setEndVerse] = React.useState<number>(Math.min(10, currentSurah.totalVerses));
    const [selectedStudentId, setSelectedStudentId] = React.useState<string>(targetStudent ? targetStudent.id : 'ALL');

    React.useEffect(() => {
        if (targetStudent) {
            setSelectedStudentId(targetStudent.id);
        } else {
            setSelectedStudentId('ALL');
        }
        setStartVerse(1);
        setEndVerse(Math.min(10, currentSurah.totalVerses));
    }, [targetStudent, currentSurah, isOpen]);

    if (!isOpen) return null;

    const handleApplyRangeCheck = (check: boolean) => {
        if (startVerse < 1 || endVerse > currentSurah.totalVerses || startVerse > endVerse) {
            alert(`Rentang ayat harus antara 1 dan ${currentSurah.totalVerses}`);
            return;
        }

        onApplyRange(startVerse, endVerse, selectedStudentId === 'ALL' ? undefined : selectedStudentId, check);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground border-border w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-foreground">
                                Operasi Centang Masal
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {currentClass.name} • Surat {currentSurah.name} ({currentSurah.totalVerses} Ayat)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Scope Selection */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Target Penerapan Operasi:</Label>
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full bg-background border-border text-foreground h-10 rounded-xl border px-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="ALL">🌟 Seluruh Murid {currentClass.name} ({students.length} Siswa)</option>
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                👤 {s.name} (NIS: {s.nis})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Section 1: Range Checklist */}
                <div className="bg-muted/30 border-border/80 rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <CheckCheck className="size-4 text-emerald-600" /> Centang Rentang Ayat (Range):
                        </span>
                        <span className="text-[11px] text-muted-foreground">Total: {currentSurah.totalVerses} Ayat</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Dari Ayat:</Label>
                            <Input
                                type="number"
                                min={1}
                                max={currentSurah.totalVerses}
                                value={startVerse}
                                onChange={(e) => setStartVerse(parseInt(e.target.value) || 1)}
                                className="bg-background text-xs font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Sampai Ayat:</Label>
                            <Input
                                type="number"
                                min={1}
                                max={currentSurah.totalVerses}
                                value={endVerse}
                                onChange={(e) => setEndVerse(parseInt(e.target.value) || 1)}
                                className="bg-background text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <Button
                            onClick={() => handleApplyRangeCheck(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
                        >
                            Tandai Hafal Ayat {startVerse} - {endVerse}
                        </Button>
                        <Button
                            onClick={() => handleApplyRangeCheck(false)}
                            variant="outline"
                            className="text-xs h-9 text-rose-600 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                            Hapus Centang
                        </Button>
                    </div>
                </div>

                {/* Section 2: Global Class Actions */}
                {selectedStudentId === 'ALL' && (
                    <div className="border-t border-border/80 pt-4 space-y-3">
                        <Label className="text-xs font-bold text-foreground">Aksi Masal Seluruh Kelas (36 Murid):</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => {
                                    onToggleClassAllVerses(true);
                                    onClose();
                                }}
                                variant="outline"
                                className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 text-xs h-9"
                            >
                                <CheckCheck className="size-4 mr-1.5" /> Centang Full Surat
                            </Button>
                            <Button
                                onClick={() => {
                                    if (confirm('Apakah Anda yakin ingin mengosongkan hafalan kelas ini?')) {
                                        onToggleClassAllVerses(false);
                                        onClose();
                                    }
                                }}
                                variant="outline"
                                className="border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 text-xs h-9"
                            >
                                <RefreshCw className="size-4 mr-1.5" /> Kosongkan Kelas
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
