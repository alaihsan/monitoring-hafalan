import React from 'react';
import { ClassInfo, Surah, ShareDurationKey, requestShareUrl } from '@/data/hafalan-data';
import { BookOpenCheck, Printer, Users, Award, Percent, Eye, Edit3, Check, Link2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HafalanHeaderProps {
    currentClass: ClassInfo;
    currentSurah: Surah;
    totalStudents: number;
    completedStudentsCount: number;
    averageProgressPercent: number;
    isViewOnly: boolean;
    onToggleViewOnly: () => void;
    onOpenPrintModal: () => void;
}

export const HafalanHeader: React.FC<HafalanHeaderProps> = ({
    currentClass,
    currentSurah,
    totalStudents,
    completedStudentsCount,
    averageProgressPercent,
    isViewOnly,
    onToggleViewOnly,
    onOpenPrintModal,
}) => {
    const [copiedShare, setCopiedShare] = React.useState(false);
    const [durationKey, setDurationKey] = React.useState<ShareDurationKey>('7d');
    const [shareResult, setShareResult] = React.useState({ url: '', expirationText: '' });

    React.useEffect(() => {
        let cancelled = false;

        setShareResult({ url: 'Membuat link…', expirationText: '' });

        requestShareUrl(currentClass.id, durationKey)
            .then((res) => {
                if (!cancelled) {
                    setShareResult({ url: res.url, expirationText: res.expirationText });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setShareResult({ url: 'Gagal membuat link share', expirationText: '' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentClass.id, durationKey]);

    const handleCopyShareLink = () => {
        if (shareResult.url && shareResult.expirationText) {
            navigator.clipboard.writeText(shareResult.url);
            setCopiedShare(true);
            setTimeout(() => setCopiedShare(false), 3500);
        }
    };

    return (
        <header className="space-y-4">
            {/* High-visibility Edit Mode Warning Banner */}
            {!isViewOnly && (
                <div className="bg-amber-500 text-amber-950 border-2 border-amber-400 font-extrabold rounded-xl p-3.5 shadow-lg flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                        <Edit3 className="size-5 shrink-0" />
                        <span className="text-sm tracking-wide">
                            MODE EDIT AKTIF: Anda sedang dalam mode pengubahan checklist. Klik sel nomor ayat pada tabel untuk mencentang/membatalkan hafalan murid.
                        </span>
                    </div>
                    <Button
                        size="sm"
                        onClick={onToggleViewOnly}
                        className="bg-slate-950 text-white hover:bg-slate-900 font-bold text-xs h-8 shrink-0"
                    >
                        Selesai Edit (Kunci View-Only)
                    </Button>
                </div>
            )}

            {/* Top Navigation & App Branding */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-xl shadow-emerald-900/10 space-y-4">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Title & Badge */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-md border border-emerald-400/30">
                                <BookOpenCheck className="size-3.5" /> Sistem Monitoring Hafalan Al-Qur'an
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200 backdrop-blur-md border border-amber-400/30">
                                {currentClass.name} • Sem {currentSurah.semester}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md border ${
                                isViewOnly
                                    ? 'bg-blue-400/20 text-blue-200 border-blue-400/30'
                                    : 'bg-amber-400 text-slate-950 border-amber-300'
                            }`}>
                                {isViewOnly ? <Eye className="size-3.5" /> : <Edit3 className="size-3.5" />}
                                {isViewOnly ? 'Mode View-Only' : 'Mode Edit Active'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white">
                            Monitoring Hafalan Surat {currentSurah.name}
                        </h1>
                        <p className="text-sm text-emerald-100/90 max-w-2xl">
                            Wali Kelas: <span className="font-semibold text-white">{currentClass.waliKelas}</span> • Target: {currentSurah.totalVerses} Ayat
                        </p>
                    </div>

                    {/* Mode Toggle & Print Action */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button
                            onClick={onToggleViewOnly}
                            variant="secondary"
                            className={`font-semibold text-xs h-10 transition-all border ${
                                isViewOnly
                                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-300 font-bold'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400'
                            }`}
                        >
                            {isViewOnly ? (
                                <>
                                    <Edit3 className="size-4 mr-1.5" /> Aktifkan Mode Edit
                                </>
                            ) : (
                                <>
                                    <Eye className="size-4 mr-1.5" /> Penguncian View Only
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={onOpenPrintModal}
                            className="bg-white text-emerald-950 hover:bg-slate-100 font-bold shadow-lg border-0 h-10 text-xs"
                        >
                            <Printer className="size-4 mr-1.5" /> Cetak Laporan (A4/F4)
                        </Button>
                    </div>
                </div>

                {/* Smart Expirable Share Link Input Box */}
                <div className="pt-3 border-t border-emerald-600/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100 shrink-0">
                        <Link2 className="size-4 text-amber-300 shrink-0" />
                        <span>Link Share Rombel ({currentClass.name}):</span>
                    </div>

                    {/* Duration Selector & Link Box */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
                        {/* Duration Selector */}
                        <div className="flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/40 rounded-xl px-2 py-0.5 text-xs text-emerald-200">
                            <Clock className="size-3.5 text-amber-300 shrink-0" />
                            <span className="text-[11px] font-bold text-emerald-300 shrink-0 hidden sm:inline">Masa Berlaku:</span>
                            <select
                                value={durationKey}
                                onChange={(e) => setDurationKey(e.target.value as ShareDurationKey)}
                                className="bg-transparent text-emerald-100 font-bold text-xs border-0 focus:ring-0 cursor-pointer pr-5 py-1"
                            >
                                <option value="1d" className="bg-emerald-900 text-white">1 Hari</option>
                                <option value="7d" className="bg-emerald-900 text-white">7 Hari (Default)</option>
                                <option value="30d" className="bg-emerald-900 text-white">30 Hari</option>
                                <option value="never" className="bg-emerald-900 text-white">Selamanya</option>
                            </select>
                        </div>

                        {/* Readonly Click-to-Copy Input Box */}
                        <div
                            onClick={handleCopyShareLink}
                            className="flex-1 min-w-[200px] flex items-center justify-between bg-emerald-950/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-emerald-900/90 transition-colors group"
                            title="Klik untuk menyalin link share publik"
                        >
                            <span className="font-mono text-xs text-emerald-200 truncate select-all">
                                {shareResult.url}
                            </span>
                            <span className="ml-2 shrink-0 text-[11px] font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1">
                                {copiedShare ? <Check className="size-3.5 text-emerald-400" /> : <Link2 className="size-3.5" />}
                                {copiedShare ? 'Tersalin!' : 'Klik Untuk Salin'}
                            </span>
                        </div>
                    </div>

                    {copiedShare && (
                        <div className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-lg shadow-md animate-bounce shrink-0">
                            ✓ Link Copied! ({shareResult.expirationText})
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics Overview Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Users className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Total Murid</div>
                        <div className="text-xl font-extrabold text-foreground">{totalStudents} Siswa</div>
                    </div>
                </div>

                <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Award className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Tuntas Hafalan</div>
                        <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {completedStudentsCount} <span className="text-xs font-normal text-muted-foreground">/ {totalStudents}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Percent className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Rata-rata Progres</div>
                        <div className="text-xl font-extrabold text-foreground">{averageProgressPercent}%</div>
                    </div>
                </div>

                <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <BookOpenCheck className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Target Verses</div>
                        <div className="text-xl font-extrabold text-foreground">{currentSurah.totalVerses} Ayat</div>
                    </div>
                </div>
            </div>
        </header>
    );
};
