import React from 'react';
import { Student } from '@/data/hafalan-data';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteStudentModalProps {
    isOpen: boolean;
    student: Student | null;
    className?: string;
    onClose: () => void;
    onConfirmDelete: (studentId: string) => void;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
    isOpen,
    student,
    className = '',
    onClose,
    onConfirmDelete,
}) => {
    const [typedName, setTypedName] = React.useState('');

    React.useEffect(() => {
        setTypedName('');
    }, [student, isOpen]);

    if (!isOpen || !student) return null;

    const isMatch = typedName === student.name;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMatch) {
            onConfirmDelete(student.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">
                                Konfirmasi Hapus Murid
                            </h2>
                            <p className="text-xs text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Details Box */}
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3.5 space-y-1 text-xs">
                    <div>
                        <span className="text-muted-foreground font-semibold">Nama Murid:</span>{' '}
                        <strong className="text-foreground font-bold text-sm">{student.name}</strong>
                    </div>
                    <div>
                        <span className="text-muted-foreground font-semibold">NIS:</span>{' '}
                        <span className="font-mono text-foreground font-bold">{student.nis}</span>
                    </div>
                    {className && (
                        <div>
                            <span className="text-muted-foreground font-semibold">Rombel:</span>{' '}
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{className}</span>
                        </div>
                    )}
                </div>

                {/* Confirmation Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Ketik nama murid di bawah ini sesuai huruf besar/kecilnya untuk konfirmasi:
                        </Label>
                        <div className="bg-muted/40 p-2 rounded-lg text-xs font-mono font-bold text-foreground select-all">
                            "{student.name}"
                        </div>
                        <Input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder="Ketik nama murid secara persis..."
                            className="bg-background text-xs font-bold"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 text-xs h-9 font-semibold"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isMatch}
                            className={`flex-1 font-bold text-xs h-9 text-white transition-all ${
                                isMatch
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                        >
                            <Trash2 className="size-4 mr-1.5" /> Ya, Hapus Murid
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
