import React from 'react';
import { AlertTriangle, DatabaseBackup, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BackupSummary {
    fileName: string;
    exportedAt: string | null;
    students: number;
    progress: number;
    history: number;
    classes: number;
}

interface RestoreBackupModalProps {
    isOpen: boolean;
    summary: BackupSummary | null;
    currentStudentCount: number;
    onClose: () => void;
    onConfirmRestore: (password: string) => void;
}

/**
 * Restoring replaces every student, setoran and log currently stored, so it asks for
 * the same typed phrase + password confirmation as the other destructive actions —
 * and shows what the file actually contains before anything is overwritten.
 */
export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
    isOpen,
    summary,
    currentStudentCount,
    onClose,
    onConfirmRestore,
}) => {
    const [typedConfirm, setTypedConfirm] = React.useState('');
    const [password, setPassword] = React.useState('');

    React.useEffect(() => {
        setTypedConfirm('');
        setPassword('');
    }, [isOpen]);

    if (!isOpen || !summary) return null;

    const expectedText = 'PULIHKAN DATA';
    const isMatch = typedConfirm.trim().toUpperCase() === expectedText && password.length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMatch) {
            onConfirmRestore(password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground border-border w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <DatabaseBackup className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">Pulihkan Data dari Backup</h2>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[22rem]">{summary.fileName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-bold text-foreground text-sm">Isi file backup:</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground font-medium">
                        <span>Data murid</span>
                        <span className="font-bold text-foreground text-right">{summary.students} murid</span>
                        <span>Setoran ayat</span>
                        <span className="font-bold text-foreground text-right">{summary.progress} ayat</span>
                        <span>Riwayat aktivitas</span>
                        <span className="font-bold text-foreground text-right">{summary.history} baris</span>
                        <span>Rombel</span>
                        <span className="font-bold text-foreground text-right">{summary.classes} kelas</span>
                        {summary.exportedAt && (
                            <>
                                <span>Dibuat pada</span>
                                <span className="font-bold text-foreground text-right">{summary.exportedAt}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-2 text-[11px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-900">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                        Seluruh data saat ini ({currentStudentCount} murid) beserta setoran ayat dan riwayatnya
                        akan DIGANTI oleh isi file ini. Tindakan ini tidak bisa dibatalkan.
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Ketik kata kunci untuk konfirmasi:</Label>
                        <div className="bg-muted/60 p-2.5 rounded-lg text-xs font-mono font-bold text-blue-600 dark:text-blue-400 select-all border border-blue-500/30 text-center tracking-wider">
                            {expectedText}
                        </div>
                        <Input
                            type="text"
                            value={typedConfirm}
                            onChange={(e) => setTypedConfirm(e.target.value)}
                            placeholder={`Ketik ${expectedText}...`}
                            className="bg-background text-xs font-bold font-mono text-center uppercase"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Konfirmasi password akun Anda:</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password login Anda"
                            autoComplete="current-password"
                            className="bg-background text-xs"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs h-9 font-semibold">
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isMatch}
                            className={`flex-1 font-bold text-xs h-9 text-white transition-all ${
                                isMatch
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/30'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                        >
                            <DatabaseBackup className="size-4 mr-1.5" /> Pulihkan Sekarang
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
