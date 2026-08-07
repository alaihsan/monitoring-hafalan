import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClearClassModalProps {
    isOpen: boolean;
    classId: string;
    classNameStr: string;
    studentCount: number;
    onClose: () => void;
    onConfirmClear: (classId: string, password: string) => void;
}

export const ClearClassModal: React.FC<ClearClassModalProps> = ({
    isOpen,
    classId,
    classNameStr,
    studentCount,
    onClose,
    onConfirmClear,
}) => {
    const [typedConfirm, setTypedConfirm] = React.useState('');
    const [password, setPassword] = React.useState('');

    React.useEffect(() => {
        setTypedConfirm('');
        setPassword('');
    }, [classId, isOpen]);

    if (!isOpen) return null;

    const expectedText = `HAPUS ${classId}`;
    const isMatch = typedConfirm.trim().toUpperCase() === expectedText && password.length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMatch) {
            // Left open deliberately: the parent closes it once the server confirms,
            // so a rejected password does not discard what was already typed in.
            onConfirmClear(classId, password);
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
                                Hapus / Kosongkan Data {classNameStr}
                            </h2>
                            <p className="text-xs text-rose-500 font-bold">Tindakan ini permanen dan tidak dapat dibatalkan!</p>
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
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-bold text-foreground text-sm">
                        Anda akan menghapus seluruh data untuk <span className="text-rose-600 dark:text-rose-400">{classNameStr}</span>:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs font-medium">
                        <li>Semua data murid ({studentCount} siswa) di {classNameStr}</li>
                        <li>Seluruh riwayat & centang hafalan siswa di {classNameStr}</li>
                        <li>Log riwayat aktivitas untuk {classNameStr}</li>
                    </ul>
                </div>

                {/* Confirmation Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Ketik kata kunci di bawah untuk konfirmasi penghapusan:
                        </Label>
                        <div className="bg-muted/60 p-2.5 rounded-lg text-xs font-mono font-bold text-rose-600 dark:text-rose-400 select-all border border-rose-500/20 text-center">
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
                        <Label className="text-xs font-bold text-foreground">
                            Konfirmasi password akun Anda:
                        </Label>
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
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                        >
                            <Trash2 className="size-4 mr-1.5" /> Kosongkan Kelas
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
