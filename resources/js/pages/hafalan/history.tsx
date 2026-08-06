import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    HistoryLogItem,
    HistoryActionType,
    loadHistoryLogs,
} from '@/data/hafalan-data';

import { History, CheckCircle2, XCircle, Search, Filter, Calendar, UserPlus, Edit3, Trash2, FileSpreadsheet, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Monitoring Hafalan',
        href: '/hafalan',
    },
    {
        title: 'Riwayat Aktivitas',
        href: '/hafalan/history',
    },
];

interface HistoryPageProps {
    initialHistory?: HistoryLogItem[];
}

export default function HafalanHistoryPage({ initialHistory }: HistoryPageProps) {
    const [logs, setLogs] = React.useState<HistoryLogItem[]>(initialHistory || []);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [actionFilter, setActionFilter] = React.useState<string>('ALL');
    const [classFilter, setClassFilter] = React.useState<string>('ALL');

    React.useEffect(() => {
        setLogs((initialHistory && initialHistory.length > 0) ? initialHistory : loadHistoryLogs());
    }, [initialHistory]);

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.studentNisn && log.studentNisn.includes(searchQuery)) ||
            (log.surahName && log.surahName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.actionLabel && log.actionLabel.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
        const matchesClass = classFilter === 'ALL' || log.className === classFilter;

        return matchesSearch && matchesAction && matchesClass;
    });

    const checkedCount = logs.filter((l) => l.action === 'CHECKED').length;
    const uncheckedCount = logs.filter((l) => l.action === 'UNCHECKED').length;
    const otherActionCount = logs.filter((l) => l.action !== 'CHECKED' && l.action !== 'UNCHECKED').length;

    const classOptions = Array.from(new Set(logs.map((l) => l.className))).filter((c) => c && c !== '-');

    const renderActionBadge = (action: HistoryActionType, label?: string) => {
        switch (action) {
            case 'CHECKED':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <CheckCircle2 className="size-3 mr-1 text-emerald-600 shrink-0" /> Centang Hafal
                    </Badge>
                );
            case 'UNCHECKED':
                return (
                    <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <XCircle className="size-3 mr-1 text-rose-600 shrink-0" /> Batal Centang
                    </Badge>
                );
            case 'ADD_STUDENT':
                return (
                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <UserPlus className="size-3 mr-1 text-blue-600 shrink-0" /> {label || 'Tambah Murid Baru'}
                    </Badge>
                );
            case 'EDIT_STUDENT':
                return (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <Edit3 className="size-3 mr-1 text-amber-600 shrink-0" /> {label || 'Edit Data Murid'}
                    </Badge>
                );
            case 'DELETE_STUDENT':
                return (
                    <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <Trash2 className="size-3 mr-1 text-red-600 shrink-0" /> {label || 'Hapus Murid'}
                    </Badge>
                );
            case 'IMPORT_STUDENTS':
                return (
                    <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <FileSpreadsheet className="size-3 mr-1 text-purple-600 shrink-0" /> {label || 'Impor Data Murid'}
                    </Badge>
                );
            case 'UPDATE_SETTINGS':
                return (
                    <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.5 font-bold">
                        <Settings className="size-3 mr-1 text-indigo-600 shrink-0" /> {label || 'Pengaturan Sekolah'}
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 font-bold">
                        {label || action}
                    </Badge>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riwayat Aktivitas - Monitoring Hafalan" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <History className="size-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-foreground tracking-tight">Riwayat Aktivitas Monitoring</h1>
                            <p className="text-sm text-muted-foreground">
                                Log pencatatan centang hafalan, CRUD murid, dan pengaturan secara real-time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Calendar className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Total Aktivitas Logged</div>
                            <div className="text-xl font-extrabold text-foreground">{logs.length} Aktivitas</div>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Centang Hafal</div>
                            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{checkedCount} Ceklist</div>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border-border rounded-xl border p-4 shadow-sm flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                            <History className="size-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Aksi CRUD & Pengaturan</div>
                            <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{otherActionCount + uncheckedCount} Aksi</div>
                        </div>
                    </div>
                </div>

                {/* Main Log Table Box */}
                <div className="bg-card text-card-foreground border-border rounded-xl border shadow-sm space-y-4">
                    {/* Toolbar & Filters */}
                    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border/80 bg-muted/20">
                        {/* Search Input */}
                        <div className="relative min-w-[240px] flex-1">
                            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Cari nama murid, NISN, atau tindakan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-background pl-9 text-xs"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Class Filter */}
                            {classOptions.length > 0 && (
                                <select
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                    className="bg-background border-border text-foreground h-9 rounded-lg border px-3 text-xs font-semibold"
                                >
                                    <option value="ALL">Semua Kelas ({logs.length})</option>
                                    {classOptions.map((cls) => (
                                        <option key={cls} value={cls}>
                                            {cls}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Action Filter */}
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="bg-background border-border text-foreground h-9 rounded-lg border px-3 text-xs font-semibold"
                            >
                                <option value="ALL">Semua Jenis Aksi</option>
                                <option value="CHECKED">Centang Hafal</option>
                                <option value="UNCHECKED">Batal Centang</option>
                                <option value="ADD_STUDENT">Tambah Murid</option>
                                <option value="EDIT_STUDENT">Edit Murid</option>
                                <option value="DELETE_STUDENT">Hapus Murid</option>
                                <option value="IMPORT_STUDENTS">Impor Data</option>
                                <option value="UPDATE_SETTINGS">Pengaturan Sekolah</option>
                            </select>
                        </div>
                    </div>

                    {/* Desktop Log Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-muted text-foreground font-bold border-b border-border">
                                <tr>
                                    <th className="p-3 w-12 text-center">No</th>
                                    <th className="p-3 w-40">Waktu & Tanggal</th>
                                    <th className="p-3 w-44">Tindakan Admin</th>
                                    <th className="p-3">Nama / Objek Data</th>
                                    <th className="p-3 w-28">Rombel</th>
                                    <th className="p-3 text-center w-48">Target Surat & Ayat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 bg-card">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                                            Belum ada data riwayat aktivitas yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, idx) => {
                                        const isCheckAction = log.action === 'CHECKED' || log.action === 'UNCHECKED';

                                        return (
                                            <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="p-3 text-center font-medium text-muted-foreground">{idx + 1}</td>
                                                <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {log.timestamp}
                                                </td>
                                                <td className="p-3">
                                                    {renderActionBadge(log.action, log.actionLabel)}
                                                </td>
                                                <td className="p-3 font-bold text-foreground whitespace-nowrap">
                                                    {log.studentName}
                                                </td>
                                                <td className="p-3 font-semibold text-muted-foreground">
                                                    {log.className}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-foreground">
                                                    {isCheckAction && log.surahName && log.verseNum ? (
                                                        <span>
                                                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{log.surahName}</span> • <span className="font-mono font-bold">Ayat {log.verseNum}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Log View Cards */}
                    <div className="space-y-3 p-4 md:hidden">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground font-medium">
                                Belum ada data riwayat aktivitas.
                            </div>
                        ) : (
                            filteredLogs.map((log, idx) => {
                                const isCheckAction = log.action === 'CHECKED' || log.action === 'UNCHECKED';

                                return (
                                    <div
                                        key={log.id}
                                        className="bg-card text-card-foreground border-border rounded-xl border p-3.5 space-y-2 shadow-sm text-xs"
                                    >
                                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                            <span className="font-mono text-[10px] text-muted-foreground">{log.timestamp}</span>
                                            {renderActionBadge(log.action, log.actionLabel)}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-sm text-foreground">{log.studentName}</div>
                                                <div className="text-[11px] font-semibold text-muted-foreground">{log.className}</div>
                                            </div>
                                            <div className="text-right">
                                                {isCheckAction && log.surahName && log.verseNum ? (
                                                    <>
                                                        <div className="font-bold text-emerald-700 dark:text-emerald-400">{log.surahName}</div>
                                                        <div className="font-mono font-extrabold text-foreground">Ayat {log.verseNum}</div>
                                                    </>
                                                ) : (
                                                    <div className="font-bold text-muted-foreground">-</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
