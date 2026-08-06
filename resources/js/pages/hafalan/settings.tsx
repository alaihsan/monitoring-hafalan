import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    CLASSES,
    ClassInfo,
    Student,
    SchoolSettings,
    parseStudentsFromImportText,
    ParsedStudentRow,
} from '@/data/hafalan-data';

import { DeleteStudentModal } from '@/components/hafalan/DeleteStudentModal';
import { ClearClassModal } from '@/components/hafalan/ClearClassModal';
import { ClearAllDataModal } from '@/components/hafalan/ClearAllDataModal';
import { ClearHistoryModal } from '@/components/hafalan/ClearHistoryModal';
import { Building2, UserCheck, Download, Upload, Save, CheckCircle2, UserPlus, ClipboardList, FileSpreadsheet, Plus, Edit2, Trash2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Monitoring Hafalan',
        href: '/hafalan',
    },
    {
        title: 'Pengaturan',
        href: '/hafalan/settings',
    },
];

interface SettingsPageProps {
    initialSettings?: SchoolSettings;
    initialClasses?: ClassInfo[];
    initialStudents?: Student[];
}

export default function HafalanSettingsPage({
    initialSettings,
    initialClasses,
    initialStudents,
}: SettingsPageProps) {
    const [schoolSettings, setSchoolSettingsState] = React.useState<SchoolSettings>(
        initialSettings || { schoolName: '', quranTeacherName: '' }
    );

    const [classes, setClasses] = React.useState<ClassInfo[]>(initialClasses || CLASSES);
    const [allStudents, setAllStudents] = React.useState<Student[]>(initialStudents || []);
    const [savedNotification, setSavedNotification] = React.useState<string | null>(null);

    // Selected Class for CRUD & Import
    const [selectedCrudClassId, setSelectedCrudClassId] = React.useState<string>('7A');

    // CRUD New Student Form state
    const [newNis, setNewNis] = React.useState<string>('');
    const [newName, setNewName] = React.useState<string>('');
    const [newGender, setNewGender] = React.useState<'L' | 'P'>('L');
    const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
    const [editNis, setEditNis] = React.useState<string>('');
    const [editName, setEditName] = React.useState<string>('');
    const [editGender, setEditGender] = React.useState<'L' | 'P'>('L');

    // Delete Modal state
    const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isClearClassModalOpen, setIsClearClassModalOpen] = React.useState(false);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = React.useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = React.useState(false);

    // Importer text state
    const [importText, setImportText] = React.useState<string>('');
    const [parsedPreview, setParsedPreview] = React.useState<ParsedStudentRow[]>([]);
    const importIssueCount = parsedPreview.filter((r) => r.issues.length > 0).length;

    const jsonFileInputRef = React.useRef<HTMLInputElement>(null);
    const excelFileInputRef = React.useRef<HTMLInputElement>(null);

    // Server props only. The old localStorage fallback made the page show stale
    // students after a real deletion, hiding data loss instead of surfacing it.
    React.useEffect(() => {
        setSchoolSettingsState(initialSettings ?? { schoolName: '', quranTeacherName: '' });
        setClasses(initialClasses ?? []);
        setAllStudents(initialStudents ?? []);
    }, [initialSettings, initialClasses, initialStudents]);

    const showToast = (msg: string) => {
        setSavedNotification(msg);
        setTimeout(() => setSavedNotification(null), 4000);
    };

    // Surfaces the server's validation message instead of silently swallowing a 422.
    const reportApiError = async (res: Response, fallback: string) => {
        const problem = await res.json().catch(() => null);
        const firstError = problem?.errors ? Object.values(problem.errors)[0] : null;
        showToast(Array.isArray(firstError) && firstError[0] ? String(firstError[0]) : fallback);
    };

    const currentCrudClass = classes.find(c => c.id === selectedCrudClassId);
    const currentClassName = currentCrudClass ? currentCrudClass.name : selectedCrudClassId;

    const handleSaveSchoolInfo = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify(schoolSettings),
            });
            const data = await res.json();
            if (data.success && data.settings) {
                setSchoolSettingsState(data.settings);
                router.reload();
            }
        } catch (err) {
            console.error('Failed to sync school settings to MySQL', err);
        }

        showToast('Pengaturan Sekolah & Guru Mapel berhasil disimpan!');
    };

    // Local edit state; persisted when the form is submitted.
    const handleUpdateWaliKelas = (classId: string, name: string) => {
        setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, waliKelas: name } : c)));
    };

    const handleSaveAllWaliKelas = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/classes/wali-kelas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ classes }),
            });
            const data = await res.json();
            if (data.success && data.classes) {
                setClasses(data.classes);
                router.reload();
            }
        } catch (err) {
            console.error('Failed to sync wali kelas to MySQL', err);
        }

        showToast('Daftar Nama Wali Kelas 12 Rombel berhasil disimpan!');
    };

    // Filter students for active CRUD class
    const crudClassStudents = React.useMemo(() => {
        return allStudents.filter((s) => s.classId === selectedCrudClassId);
    }, [allStudents, selectedCrudClassId]);

    // Student CRUD Handlers
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        // No fabricated values: a blank NIS used to be filled with a made-up number
        // and gender was always hard-coded to 'L'.
        if (!newName.trim() || !newNis.trim()) {
            showToast('NIS dan nama murid wajib diisi.');
            return;
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                // No client-generated id: the server mints the primary key.
                body: JSON.stringify({
                    nis: newNis.trim(),
                    name: newName.trim(),
                    gender: newGender,
                    classId: selectedCrudClassId,
                }),
            });

            if (!res.ok) {
                await reportApiError(res, `Gagal menambah murid (HTTP ${res.status}).`);
                return;
            }

            const data = await res.json();
            setAllStudents(data.students);
            setNewNis('');
            setNewName('');
            setNewGender('L');
            router.reload();
            showToast('Murid baru berhasil ditambahkan!');
        } catch (err) {
            console.error('Failed to add student', err);
            showToast('Gagal menghubungi server. Murid tidak ditambahkan.');
        }
    };

    const handleStartEditStudent = (st: Student) => {
        setEditingStudentId(st.id);
        setEditNis(st.nis);
        setEditName(st.name);
        setEditGender(st.gender);
    };

    const handleSaveEditStudent = async (studentId: string) => {
        if (!editName.trim() || !editNis.trim()) {
            showToast('NIS dan nama murid wajib diisi.');
            return;
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    id: studentId,
                    nis: editNis.trim(),
                    name: editName.trim(),
                    gender: editGender,
                    classId: selectedCrudClassId,
                }),
            });

            if (!res.ok) {
                await reportApiError(res, `Gagal memperbarui murid (HTTP ${res.status}).`);
                return;
            }

            const data = await res.json();
            setAllStudents(data.students);
            setEditingStudentId(null);
            router.reload();
            showToast('Data murid berhasil diperbarui!');
        } catch (err) {
            console.error('Failed to update student', err);
            showToast('Gagal menghubungi server. Data tidak diperbarui.');
        }
    };

    const handleConfirmDeleteStudent = async (studentId: string) => {
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(`/api/hafalan/students/${studentId}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken || '' },
            });

            if (!res.ok) {
                await reportApiError(res, `Gagal menghapus murid (HTTP ${res.status}).`);
                return;
            }

            const data = await res.json();
            setAllStudents(data.students);
            router.reload();
            showToast('Data murid berhasil dihapus!');
        } catch (err) {
            console.error('Failed to delete student', err);
            showToast('Gagal menghubungi server. Murid tidak dihapus.');
        }
    };

    const handleConfirmClearClass = async (classId: string, password: string) => {
        // Local state is only updated after the server confirms the delete, so a
        // rejected password can never make the UI look like data was removed.
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/classes/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ classId, password }),
            });

            if (!res.ok) {
                showToast(
                    res.status === 422
                        ? 'Password salah. Data tidak dihapus.'
                        : `Gagal menghapus data (HTTP ${res.status}).`
                );
                return;
            }

            const data = await res.json();
            if (!data.success) {
                showToast('Gagal menghapus data kelas.');
                return;
            }

            if (data.students) {
                setAllStudents(data.students);
            }
            router.reload();
            showToast(`Seluruh data siswa & riwayat hafalan ${currentClassName} berhasil dihapus!`);
        } catch (err) {
            console.error('Failed to clear class data', err);
            showToast('Gagal menghubungi server. Data tidak dihapus.');
        }
    };

    const handleConfirmResetAll = async (password: string) => {
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/reset-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                showToast(
                    res.status === 422
                        ? 'Password salah. Data tidak direset.'
                        : `Gagal mereset data (HTTP ${res.status}).`
                );
                return;
            }

            const data = await res.json();
            if (!data.success) {
                showToast('Gagal mereset data aplikasi.');
                return;
            }

            setAllStudents([]);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('hafalan_monitoring_students_v1');
                localStorage.removeItem('hafalan_monitoring_progress_v1');
                localStorage.removeItem('hafalan_monitoring_history_v1');
            }
            router.reload();
            showToast('Seluruh data aplikasi (murid & riwayat hafalan) berhasil direset bersih!');
        } catch (err) {
            console.error('Failed to reset all data', err);
            showToast('Gagal menghubungi server. Data tidak direset.');
        }
    };

    const handleConfirmClearHistory = async (password: string) => {
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/history/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                showToast(
                    res.status === 422
                        ? 'Password salah. Riwayat tidak dihapus.'
                        : `Gagal membersihkan riwayat (HTTP ${res.status}).`
                );
                return;
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('hafalan_monitoring_history_v1');
            }
            router.reload();
            showToast('Seluruh riwayat aktivitas log berhasil dibersihkan!');
        } catch (err) {
            console.error('Failed to clear activity history log', err);
            showToast('Gagal menghubungi server. Riwayat tidak dihapus.');
        }
    };

    // Importer text handler
    const handleParseText = (text: string) => {
        setImportText(text);
        if (!text.trim()) {
            setParsedPreview([]);
            return;
        }
        const parsed = parseStudentsFromImportText(text, selectedCrudClassId);
        setParsedPreview(parsed);
    };

    const handleFileUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            handleParseText(content);
        };
        reader.readAsText(file);
    };

    const handleApplyImportedStudents = async () => {
        const invalidRows = parsedPreview.filter((r) => r.issues.length > 0);

        if (parsedPreview.length === 0) {
            showToast('Tidak ada data murid yang siap diimpor.');
            return;
        }

        // Rows are never imported partially-guessed: every row must carry a real NIS,
        // name and gender before anything is sent.
        if (invalidRows.length > 0) {
            showToast(`${invalidRows.length} baris belum lengkap. Perbaiki dulu sebelum impor.`);
            return;
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/students/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    students: parsedPreview.map((r) => ({
                        nis: r.nis,
                        name: r.name,
                        gender: r.gender,
                        classId: r.classId,
                    })),
                }),
            });

            if (!res.ok) {
                const problem = await res.json().catch(() => null);
                const firstError = problem?.errors ? Object.values(problem.errors)[0] : null;
                showToast(
                    Array.isArray(firstError) && firstError[0]
                        ? String(firstError[0])
                        : `Gagal mengimpor data (HTTP ${res.status}).`
                );
                return;
            }

            const data = await res.json();
            if (!data.success) {
                showToast('Gagal mengimpor data murid.');
                return;
            }

            setAllStudents(data.students);
            setImportText('');
            setParsedPreview([]);
            router.reload();
            showToast(`Berhasil mengimpor ${parsedPreview.length} murid ke ${currentClassName}!`);
        } catch (err) {
            console.error('Failed to import students', err);
            showToast('Gagal menghubungi server. Data tidak diimpor.');
        }
    };

    // Backup is built server-side so it always contains the real progress data,
    // not whatever the browser happened to have cached.
    const handleExportJSON = async () => {
        try {
            const res = await fetch('/api/hafalan/export', { headers: { Accept: 'application/json' } });
            if (!res.ok) {
                showToast(`Gagal membuat backup (HTTP ${res.status}).`);
                return;
            }

            const exportData = await res.json();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_hafalan_quran_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export data', err);
            showToast('Gagal menghubungi server. Backup tidak dibuat.');
        }
    };

    // Restores the student roster from a backup file. This previously only updated
    // React state and reported success, so nothing was ever actually saved.
    // Note: hafalan progress is not restored by this path.
    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            let students: Array<{ nis?: string; name?: string; gender?: string; classId?: string }>;

            try {
                const parsed = JSON.parse(event.target?.result as string);
                students = Array.isArray(parsed?.students) ? parsed.students : [];
            } catch {
                showToast('Gagal membaca file JSON. Format tidak valid.');
                return;
            }

            if (students.length === 0) {
                showToast('File backup tidak memuat data murid.');
                return;
            }

            try {
                const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
                const res = await fetch('/api/hafalan/students/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken || '',
                    },
                    body: JSON.stringify({
                        students: students.map((st) => ({
                            nis: st.nis,
                            name: st.name,
                            gender: st.gender,
                            classId: st.classId,
                        })),
                    }),
                });

                if (!res.ok) {
                    await reportApiError(res, `Gagal memulihkan backup (HTTP ${res.status}).`);
                    return;
                }

                const data = await res.json();
                setAllStudents(data.students);
                router.reload();
                showToast(`${students.length} murid berhasil dipulihkan dari backup.`);
            } catch (err) {
                console.error('Failed to restore backup', err);
                showToast('Gagal menghubungi server. Backup tidak dipulihkan.');
            }
        };

        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan - Monitoring Hafalan" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1200px] mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Pengaturan Aplikasi</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola data sekolah, Guru Mapel Al-Qur'an, Wali Kelas 12 Rombel, Kelola Murid (CRUD), dan Impor Data.
                        </p>
                    </div>
                </div>

                {savedNotification && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                        <CheckCircle2 className="size-5 text-emerald-600" />
                        {savedNotification}
                    </div>
                )}

                {/* Section 1: School & Teacher Configuration */}
                <form onSubmit={handleSaveSchoolInfo} className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                            <Building2 className="size-5" />
                        </div>
                        <h2 className="text-base font-extrabold text-foreground">Identitas Sekolah & Guru Mapel</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Nama Sekolah / Instansi:</Label>
                            <Input
                                type="text"
                                value={schoolSettings.schoolName}
                                onChange={(e) => setSchoolSettingsState({ ...schoolSettings, schoolName: e.target.value })}
                                placeholder="Masukkan nama sekolah..."
                                className="bg-background text-sm font-semibold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Nama Guru Mapel Al-Qur'an:</Label>
                            <Input
                                type="text"
                                value={schoolSettings.quranTeacherName}
                                onChange={(e) => setSchoolSettingsState({ ...schoolSettings, quranTeacherName: e.target.value })}
                                placeholder="Masukkan nama Guru Pengampu..."
                                className="bg-background text-sm font-semibold"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                            <Save className="size-4 mr-1.5" /> Simpan Pengaturan Sekolah
                        </Button>
                    </div>
                </form>

                {/* Section 2: Student CRUD & Importer Panel */}
                <div className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                                <Users className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-foreground">Kelola Data Murid Per Rombel (CRUD & Impor)</h2>
                                <p className="text-xs text-muted-foreground">Tambah, edit, hapus, atau impor daftar nama murid per kelas.</p>
                            </div>
                        </div>

                        {/* Class Selector Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">Pilih Rombel:</span>
                            <select
                                value={selectedCrudClassId}
                                onChange={(e) => {
                                    setSelectedCrudClassId(e.target.value);
                                    setImportText('');
                                    setParsedPreview([]);
                                }}
                                className="bg-background border-border text-foreground h-9 rounded-xl border px-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                            >
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} ({allStudents.filter(s => s.classId === cls.id).length} Murid)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Form Tambah Murid Baru */}
                    <form onSubmit={handleAddStudent} className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                            <Plus className="size-4 text-emerald-600" /> Tambah Murid Baru ke {currentClassName}:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <Label className="text-[11px] text-muted-foreground">NIS / Nomor Induk:</Label>
                                <Input
                                    type="text"
                                    value={newNis}
                                    onChange={(e) => setNewNis(e.target.value)}
                                    placeholder="Contoh: 8021021"
                                    className="bg-background text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] text-muted-foreground">Jenis Kelamin:</Label>
                                <select
                                    value={newGender}
                                    onChange={(e) => setNewGender(e.target.value as 'L' | 'P')}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                                >
                                    <option value="L">L - Laki-laki</option>
                                    <option value="P">P - Perempuan</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-[11px] text-muted-foreground">Nama Lengkap Murid:</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Contoh: Muhamad Ichsan"
                                        className="bg-background text-xs font-semibold flex-1"
                                    />
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shrink-0">
                                        <Plus className="size-4 mr-1" /> Tambah Murid
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Interactive CRUD Table for Active Class */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-foreground">
                            <span>Daftar Murid {currentClassName} ({crudClassStudents.length} Siswa):</span>
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-muted text-foreground font-bold border-b border-border">
                                    <tr>
                                        <th className="p-2.5 w-10 text-center">No</th>
                                        <th className="p-2.5 w-32">NIS</th>
                                        <th className="p-2.5">Nama Murid</th>
                                        <th className="p-2.5 w-24 text-center">Aksi CRUD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {crudClassStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-6 text-muted-foreground">
                                                Belum ada data murid di {currentClassName}. Gunakan form di atas atau modul impor di bawah.
                                            </td>
                                        </tr>
                                    ) : (
                                        crudClassStudents.map((st, idx) => {
                                            const isEditing = editingStudentId === st.id;
                                            return (
                                                <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                                                    <td className="p-2 text-center font-medium text-muted-foreground">{idx + 1}</td>
                                                    <td className="p-2 font-mono text-[11px]">
                                                        {isEditing ? (
                                                            <Input
                                                                type="text"
                                                                value={editNis}
                                                                onChange={(e) => setEditNis(e.target.value)}
                                                                className="h-7 text-xs font-mono"
                                                            />
                                                        ) : (
                                                            st.nis
                                                        )}
                                                    </td>
                                                    <td className="p-2 font-bold">
                                                        {isEditing ? (
                                                            <div className="flex gap-1.5">
                                                                <Input
                                                                    type="text"
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    className="h-7 text-xs font-bold flex-1"
                                                                />
                                                                <select
                                                                    value={editGender}
                                                                    onChange={(e) => setEditGender(e.target.value as 'L' | 'P')}
                                                                    className="h-7 rounded-md border border-input bg-background px-1.5 text-xs font-semibold"
                                                                    aria-label="Jenis kelamin"
                                                                >
                                                                    <option value="L">L</option>
                                                                    <option value="P">P</option>
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <span>
                                                                {st.name}
                                                                <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">({st.gender})</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditing ? (
                                                            <div className="flex justify-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-2 text-[10px] bg-emerald-600"
                                                                    onClick={() => handleSaveEditStudent(st.id)}
                                                                >
                                                                    Simpan
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2 text-[10px]"
                                                                    onClick={() => setEditingStudentId(null)}
                                                                >
                                                                    Batal
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-center items-center gap-1">
                                                                <button
                                                                    onClick={() => handleStartEditStudent(st)}
                                                                    title="Edit Murid"
                                                                    className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                                                >
                                                                    <Edit2 className="size-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setStudentToDelete(st);
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                    title="Hapus Murid"
                                                                    className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Impor Masal Textarea / File Excel */}
                    <div className="border-t border-border/80 pt-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <ClipboardList className="size-4 text-blue-600" /> Copy-Paste Masal dari Excel / Word / Text Ke {currentClassName}:
                            </Label>
                            <Button
                                type="button"
                                onClick={() => excelFileInputRef.current?.click()}
                                variant="outline"
                                className="bg-background border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 text-xs h-8 font-bold"
                            >
                                <FileSpreadsheet className="size-3.5 mr-1.5" /> Upload File Excel / CSV
                            </Button>
                            <input
                                type="file"
                                ref={excelFileInputRef}
                                onChange={handleFileUploadExcel}
                                accept=".csv,.txt,.xlsx,.xls"
                                className="hidden"
                            />
                        </div>

                        <textarea
                            rows={4}
                            value={importText}
                            onChange={(e) => handleParseText(e.target.value)}
                            placeholder="Tempelkan data di sini (contoh:\n8021021 muhamad ichsan\n8021022 aisyah putri)..."
                            className="w-full bg-background border-border text-foreground rounded-xl p-3 text-xs font-mono border focus:ring-2 focus:ring-emerald-500"
                        />

                        {/* Parsed Preview Table */}
                        {parsedPreview.length > 0 && (
                            <div className="space-y-3 bg-muted/30 border border-border/80 rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <div>
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            Pratinjau Impor: {parsedPreview.length} Murid Siap Diimpor ke {currentClassName}
                                        </span>
                                    </div>

                                    {/* Safe Append vs Overwrite Option */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">
                                            Baris dicocokkan berdasarkan NIS: siswa yang NIS-nya sudah ada akan
                                            diperbarui, bukan diduplikasi. Untuk mengosongkan kelas lebih dulu,
                                            gunakan &quot;Kosongkan Data Kelas&quot;.
                                        </span>

                                        <Button
                                            onClick={handleApplyImportedStudents}
                                            disabled={importIssueCount > 0}
                                            className={`font-bold text-xs h-9 ${
                                                importIssueCount > 0
                                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            }`}
                                        >
                                            Simpan {parsedPreview.length} Murid ke {currentClassName}
                                        </Button>
                                    </div>
                                </div>

                                {importIssueCount > 0 && (
                                    <div className="flex items-center gap-2 text-[11px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>
                                            {importIssueCount} baris belum lengkap. Setiap baris wajib memuat NIS,
                                            nama, dan jenis kelamin (L/P). Lengkapi teks lalu tempel ulang.
                                        </span>
                                    </div>
                                )}

                                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground font-bold">
                                                <th className="p-1.5 w-10 text-center">No</th>
                                                <th className="p-1.5 w-32">NIS</th>
                                                <th className="p-1.5">Nama Murid</th>
                                                <th className="p-1.5 w-12 text-center">JK</th>
                                                <th className="p-1.5 w-56">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedPreview.map((st, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`border-b border-border/40 ${
                                                        st.issues.length > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <td className="p-1.5 text-center font-medium">{idx + 1}</td>
                                                    <td className="p-1.5 font-mono text-[11px]">{st.nis || '—'}</td>
                                                    <td className="p-1.5 font-bold">{st.name || '—'}</td>
                                                    <td className="p-1.5 text-center font-mono">{st.gender ?? '—'}</td>
                                                    <td className="p-1.5 text-[11px]">
                                                        {st.issues.length === 0 ? (
                                                            <span className="text-emerald-600 font-semibold">Siap</span>
                                                        ) : (
                                                            <span className="text-rose-600 font-semibold">{st.issues.join(', ')}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Wali Kelas per 12 Rombel */}
                <form onSubmit={handleSaveAllWaliKelas} className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                <UserCheck className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-foreground">Daftar Wali Kelas Per Rombel (12 Kelas)</h2>
                                <p className="text-xs text-muted-foreground">Sesuaikan nama Wali Kelas untuk setiap rombongan belajar.</p>
                            </div>
                        </div>

                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm self-start sm:self-auto">
                            <Save className="size-4 mr-1.5" /> Simpan Wali Kelas
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map((cls) => (
                            <div key={cls.id} className="bg-muted/30 border border-border/80 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-sm text-foreground">{cls.name}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                                        Kelas {cls.grade}
                                    </span>
                                </div>
                                <Input
                                    type="text"
                                    value={cls.waliKelas}
                                    onChange={(e) => handleUpdateWaliKelas(cls.id, e.target.value)}
                                    placeholder="Masukkan nama Wali Kelas..."
                                    className="bg-background text-xs font-semibold"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-sm">
                            <Save className="size-4 mr-2" /> Simpan Nama Wali Kelas (12 Rombel)
                        </Button>
                    </div>
                </form>

                {/* Section 4: Backup Data (Ekspor - Impor JSON) */}
                <div className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border/80 pb-3">
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">Cadangkan & Pemulihan Data (JSON)</h2>
                            <p className="text-xs text-muted-foreground">Unduh atau pulihkan seluruh data monitoring hafalan ke file JSON.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleExportJSON} variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 text-xs h-10 font-bold">
                            <Download className="size-4 mr-2" /> Ekspor Data JSON
                        </Button>

                        <Button onClick={() => jsonFileInputRef.current?.click()} variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 text-xs h-10 font-bold">
                            <Upload className="size-4 mr-2" /> Impor Data JSON
                        </Button>

                        <Button onClick={() => setIsClearHistoryModalOpen(true)} variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 text-xs h-10 font-bold">
                            <Trash2 className="size-4 mr-2" /> Hapus / Bersihkan Riwayat Log
                        </Button>
                        <input
                            type="file"
                            ref={jsonFileInputRef}
                            onChange={handleImportJSON}
                            accept=".json"
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Case-Sensitive Delete Modal */}
            <DeleteStudentModal
                isOpen={isDeleteModalOpen}
                student={studentToDelete}
                className={currentClassName}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirmDelete={handleConfirmDeleteStudent}
            />

            {/* Clear Class Confirmation Modal */}
            <ClearClassModal
                isOpen={isClearClassModalOpen}
                classId={selectedCrudClassId}
                classNameStr={currentClassName}
                studentCount={crudClassStudents.length}
                onClose={() => setIsClearClassModalOpen(false)}
                onConfirmClear={handleConfirmClearClass}
            />

            {/* Clear All Data Confirmation Modal */}
            <ClearAllDataModal
                isOpen={isClearAllModalOpen}
                totalStudentCount={allStudents.length}
                onClose={() => setIsClearAllModalOpen(false)}
                onConfirmResetAll={handleConfirmResetAll}
            />

            {/* Clear History Log Confirmation Modal */}
            <ClearHistoryModal
                isOpen={isClearHistoryModalOpen}
                onClose={() => setIsClearHistoryModalOpen(false)}
                onConfirmClearHistory={handleConfirmClearHistory}
            />
        </AppLayout>
    );
}
