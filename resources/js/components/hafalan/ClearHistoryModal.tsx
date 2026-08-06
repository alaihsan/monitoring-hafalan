import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClearHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmClearHistory: () => void;
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
    isOpen,
    onClose,
    onConfirmClearHistory,
}) => {
    const [typedConfirm, setTypedConfirm] = React.useState('');

    React.useEffect(() => {
        setTypedConfirm('');
    }, [isOpen]);

    if (!isOpen) return null;

    const expectedText = 'HAPUS RIWAYAT';
    const isMatch = typedConfirm.trim().toUpperCase() === expectedText;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isMatch) {
            onConfirmClearHistory();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">
                                Hapus / Bersihkan Riwayat Log
                            </h2>
                            <p className="text-xs text-amber-500 font-bold">Data murid & hafalan tetap aman</p>
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
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-bold text-foreground text-sm">
                        Penjelasan Pembersihan Riwayat:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs font-medium">
                        <li>Semua log riwayat aktivitas centang hafalan & pencatatan akan dihapus</li>
                        <li><strong className="text-emerald-600 dark:text-emerald-400">Daftar siswa & centang hafalan Al-Qur'an TIDAK terhapus</strong></li>
                    </ul>
                </div>

                {/* Confirmation Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Ketik kata kunci di bawah untuk konfirmasi:
                        </Label>
                        <div className="bg-muted/60 p-2.5 rounded-lg text-xs font-mono font-bold text-amber-600 dark:text-amber-400 select-all border border-amber-500/30 text-center tracking-wider">
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
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                        >
                            <Trash2 className="size-4 mr-1.5" /> Hapus Riwayat Log
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
