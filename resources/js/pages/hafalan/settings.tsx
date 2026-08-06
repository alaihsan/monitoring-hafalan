import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    CLASSES,
    ClassInfo,
    Student,
    SchoolSettings,
    loadSavedClasses,
    saveClassesToStorage,
    loadSchoolSettings,
    saveSchoolSettings,
    loadSavedProgress,
    saveProgressToStorage,
    loadSavedStudents,
    saveStudentsToStorage,
    parseStudentsFromImportText,
    addHistoryLog,
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
    const [newNisn, setNewNisn] = React.useState<string>('');
    const [newName, setNewName] = React.useState<string>('');
    const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
    const [editNisn, setEditNisn] = React.useState<string>('');
    const [editName, setEditName] = React.useState<string>('');

    // Delete Modal state
    const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isClearClassModalOpen, setIsClearClassModalOpen] = React.useState(false);
    const [isClearAllModalOpen, setIsClearAllModalOpen] = React.useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = React.useState(false);

    // Importer text state
    const [importText, setImportText] = React.useState<string>('');
    const [parsedPreview, setParsedPreview] = React.useState<Student[]>([]);
    const [shouldOverwriteImport, setShouldOverwriteImport] = React.useState<boolean>(false);

    const jsonFileInputRef = React.useRef<HTMLInputElement>(null);
    const excelFileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setSchoolSettingsState((initialSettings && initialSettings.schoolName) ? initialSettings : loadSchoolSettings());
        setClasses((initialClasses && initialClasses.length > 0) ? initialClasses : loadSavedClasses());
        setAllStudents((initialStudents && initialStudents.length > 0) ? initialStudents : loadSavedStudents());
    }, [initialSettings, initialClasses, initialStudents]);

    const showToast = (msg: string) => {
        setSavedNotification(msg);
        setTimeout(() => setSavedNotification(null), 4000);
    };

    const currentCrudClass = classes.find(c => c.id === selectedCrudClassId);
    const currentClassName = currentCrudClass ? currentCrudClass.name : selectedCrudClassId;

    const handleSaveSchoolInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        saveSchoolSettings(schoolSettings);
        addHistoryLog({
            studentName: 'Pengaturan Sekolah',
            studentNisn: '-',
            className: '-',
            action: 'UPDATE_SETTINGS',
            actionLabel: 'Ubah Pengaturan Identitas Sekolah & Guru Mapel',
        });

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            await fetch('/api/hafalan/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify(schoolSettings),
            });
        } catch (err) {
            console.error('Failed to sync school settings to MySQL', err);
        }

        showToast('Pengaturan Sekolah & Guru Mapel berhasil disimpan!');
    };

    const handleUpdateWaliKelas = (classId: string, name: string) => {
        setClasses((prev) => {
            const next = prev.map((c) => (c.id === classId ? { ...c, waliKelas: name } : c));
            saveClassesToStorage(next);
            return next;
        });
    };

    // Filter students for active CRUD class
    const crudClassStudents = React.useMemo(() => {
        return allStudents.filter((s) => s.classId === selectedCrudClassId);
    }, [allStudents, selectedCrudClassId]);

    // Student CRUD Handlers
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            alert('Nama murid tidak boleh kosong.');
            return;
        }

        const currentDataset = loadSavedStudents();
        const baseStudents = currentDataset.length >= allStudents.length ? currentDataset : allStudents;

        const newStudentObj: Student = {
            id: `std_${selectedCrudClassId}_${Date.now()}`,
            nisn: newNisn.trim() || `0089${selectedCrudClassId}${Date.now().toString().slice(-4)}`,
            name: newName.trim(),
            gender: 'L',
            classId: selectedCrudClassId,
        };

        const updated = [...baseStudents, newStudentObj];
        setAllStudents(updated);
        saveStudentsToStorage(updated);

        addHistoryLog({
            studentName: newStudentObj.name,
            studentNisn: newStudentObj.nisn,
            className: currentClassName,
            action: 'ADD_STUDENT',
            actionLabel: 'Tambah Murid Baru',
        });

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    id: newStudentObj.id,
                    nisn: newStudentObj.nisn,
                    name: newStudentObj.name,
                    gender: newStudentObj.gender,
                    classId: newStudentObj.classId,
                }),
            });
            const data = await res.json();
            if (data.success && data.students) {
                setAllStudents(data.students);
                saveStudentsToStorage(data.students);
            }
        } catch (err) {
            console.error('Failed to sync new student to MySQL', err);
        }

        setNewNisn('');
        setNewName('');
        showToast(`Berhasil menambah murid ${newStudentObj.name} ke ${currentClassName}!`);
    };

    const handleStartEditStudent = (st: Student) => {
        setEditingStudentId(st.id);
        setEditNisn(st.nisn);
        setEditName(st.name);
    };

    const handleSaveEditStudent = async (studentId: string) => {
        if (!editName.trim()) {
            alert('Nama murid tidak boleh kosong.');
            return;
        }

        const currentDataset = loadSavedStudents();
        const baseStudents = currentDataset.length >= allStudents.length ? currentDataset : allStudents;

        const updated = baseStudents.map((s) => {
            if (s.id === studentId) {
                return { ...s, nisn: editNisn.trim(), name: editName.trim() };
            }
            return s;
        });

        setAllStudents(updated);
        saveStudentsToStorage(updated);
        setEditingStudentId(null);

        const targetStudent = updated.find(s => s.id === studentId);

        addHistoryLog({
            studentName: editName.trim(),
            studentNisn: editNisn.trim(),
            className: currentClassName,
            action: 'EDIT_STUDENT',
            actionLabel: 'Edit Data Murid',
        });

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            if (targetStudent) {
                const res = await fetch('/api/hafalan/students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || '',
                    },
                    body: JSON.stringify({
                        id: targetStudent.id,
                        nisn: targetStudent.nisn,
                        name: targetStudent.name,
                        gender: targetStudent.gender,
                        classId: targetStudent.classId,
                    }),
                });
                const data = await res.json();
                if (data.success && data.students) {
                    setAllStudents(data.students);
                    saveStudentsToStorage(data.students);
                }
            }
        } catch (err) {
            console.error('Failed to sync edited student to MySQL', err);
        }

        showToast('Data murid berhasil diperbarui!');
    };

    const handleConfirmDeleteStudent = async (studentId: string) => {
        const currentDataset = loadSavedStudents();
        const baseStudents = currentDataset.length >= allStudents.length ? currentDataset : allStudents;
        const deletedStudent = baseStudents.find(s => s.id === studentId);

        const updated = baseStudents.filter((s) => s.id !== studentId);
        setAllStudents(updated);
        saveStudentsToStorage(updated);

        if (deletedStudent) {
            addHistoryLog({
                studentName: deletedStudent.name,
                studentNisn: deletedStudent.nisn,
                className: currentClassName,
                action: 'DELETE_STUDENT',
                actionLabel: 'Hapus Murid',
            });
        }

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(`/api/hafalan/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                },
            });
            const data = await res.json();
            if (data.success && data.students) {
                setAllStudents(data.students);
                saveStudentsToStorage(data.students);
            }
        } catch (err) {
            console.error('Failed to sync student deletion to MySQL', err);
        }

        showToast('Data murid berhasil dihapus!');
    };

    const handleConfirmClearClass = async (classId: string) => {
        const updated = allStudents.filter((s) => s.classId !== classId);
        setAllStudents(updated);
        saveStudentsToStorage(updated);

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/classes/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({ classId }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.students) {
                    setAllStudents(data.students);
                    saveStudentsToStorage(data.students);
                }
                if (data.progress) {
                    saveProgressToStorage(data.progress);
                }
                router.reload();
            }
        } catch (err) {
            console.error('Failed to clear class data in MySQL', err);
        }

        showToast(`Seluruh data siswa & riwayat hafalan ${currentClassName} berhasil dihapus!`);
    };

    const handleConfirmResetAll = async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('hafalan_monitoring_students_v1');
            localStorage.removeItem('hafalan_monitoring_progress_v1');
            localStorage.removeItem('hafalan_monitoring_history_v1');
        }
        setAllStudents([]);

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/reset-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
            });
            const data = await res.json();
            if (data.success) {
                setAllStudents([]);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('hafalan_monitoring_students_v1');
                    localStorage.removeItem('hafalan_monitoring_progress_v1');
                    localStorage.removeItem('hafalan_monitoring_history_v1');
                }
                router.reload();
            }
        } catch (err) {
            console.error('Failed to reset all data in MySQL', err);
        }

        showToast('Seluruh data aplikasi (murid & riwayat hafalan) berhasil direset bersih!');
    };

    const handleConfirmClearHistory = async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('hafalan_monitoring_history_v1');
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            await fetch('/api/hafalan/history/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
            });
            if (typeof window !== 'undefined') {
                localStorage.removeItem('hafalan_monitoring_history_v1');
            }
            router.reload();
        } catch (err) {
            console.error('Failed to clear activity history log in MySQL', err);
        }

        showToast('Seluruh riwayat aktivitas log berhasil dibersihkan!');
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
        if (parsedPreview.length === 0) {
            alert('Tidak ada data murid yang siap diimpor.');
            return;
        }

        const currentDataset = loadSavedStudents();
        const baseStudents = currentDataset.length >= allStudents.length ? currentDataset : allStudents;

        let updatedStudents: Student[];
        if (shouldOverwriteImport) {
            // Overwrite mode: replace class students
            const otherClassesStudents = baseStudents.filter(s => s.classId !== selectedCrudClassId);
            updatedStudents = [...otherClassesStudents, ...parsedPreview];
        } else {
            // Append mode (DEFAULT): merge parsed students into current class
            updatedStudents = [...baseStudents, ...parsedPreview];
        }

        setAllStudents(updatedStudents);
        saveStudentsToStorage(updatedStudents);

        addHistoryLog({
            studentName: `${parsedPreview.length} Murid`,
            studentNisn: '-',
            className: currentClassName,
            action: 'IMPORT_STUDENTS',
            actionLabel: shouldOverwriteImport ? `Impor & Timpa Data (${parsedPreview.length} Siswa)` : `Impor & Gabung Data (${parsedPreview.length} Siswa)`,
        });

        // API Sync to MySQL
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/hafalan/students/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    students: parsedPreview,
                }),
            });
            const data = await res.json();
            if (data.success && data.students) {
                setAllStudents(data.students);
                saveStudentsToStorage(data.students);
            }
        } catch (err) {
            console.error('Failed to sync imported students to MySQL', err);
        }

        setImportText('');
        setParsedPreview([]);
        setShouldOverwriteImport(false);
        showToast(`Berhasil mengimpor ${parsedPreview.length} murid ke ${currentClassName}!`);
    };

    const handleExportJSON = () => {
        const progress = loadSavedProgress(allStudents);

        const exportData = {
            schoolSettings,
            classes,
            students: allStudents,
            progress,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_hafalan_quran_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                if (parsed.schoolSettings) {
                    setSchoolSettingsState(parsed.schoolSettings);
                    saveSchoolSettings(parsed.schoolSettings);
                }
                if (parsed.classes) {
                    setClasses(parsed.classes);
                    saveClassesToStorage(parsed.classes);
                }
                if (parsed.students) {
                    setAllStudents(parsed.students);
                    saveStudentsToStorage(parsed.students);
                }
                if (parsed.progress) {
                    saveProgressToStorage(parsed.progress);
                }
                showToast('Data hafalan JSON berhasil diimpor!');
            } catch (err) {
                alert('Gagal membaca file JSON. Format tidak valid.');
            }
        };
        reader.readAsText(file);
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <Label className="text-[11px] text-muted-foreground">NISN / Nomor Induk:</Label>
                                <Input
                                    type="text"
                                    value={newNisn}
                                    onChange={(e) => setNewNisn(e.target.value)}
                                    placeholder="Contoh: 8021021"
                                    className="bg-background text-xs font-mono"
                                />
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsClearClassModalOpen(true)}
                                className="border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs h-8 self-start sm:self-auto"
                            >
                                <Trash2 className="size-3.5 mr-1.5" /> Kosongkan Data {currentClassName}
                            </Button>
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-muted text-foreground font-bold border-b border-border">
                                    <tr>
                                        <th className="p-2.5 w-10 text-center">No</th>
                                        <th className="p-2.5 w-32">NISN</th>
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
                                                                value={editNisn}
                                                                onChange={(e) => setEditNisn(e.target.value)}
                                                                className="h-7 text-xs font-mono"
                                                            />
                                                        ) : (
                                                            st.nisn
                                                        )}
                                                    </td>
                                                    <td className="p-2 font-bold">
                                                        {isEditing ? (
                                                            <Input
                                                                type="text"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                className="h-7 text-xs font-bold"
                                                            />
                                                        ) : (
                                                            st.name
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
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-foreground font-semibold">
                                            <input
                                                type="checkbox"
                                                checked={shouldOverwriteImport}
                                                onChange={(e) => setShouldOverwriteImport(e.target.checked)}
                                                className="rounded border-border text-rose-600 focus:ring-rose-500 size-3.5"
                                            />
                                            <span className={shouldOverwriteImport ? 'text-rose-600 font-extrabold' : 'text-muted-foreground'}>
                                                Timpa / Hapus murid lama di {currentClassName}
                                            </span>
                                        </label>

                                        <Button
                                            onClick={handleApplyImportedStudents}
                                            className={`font-bold text-xs h-9 ${
                                                shouldOverwriteImport
                                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            }`}
                                        >
                                            {shouldOverwriteImport ? 'Timpa & Simpan ke ' + currentClassName : 'Gabungkan & Simpan ke ' + currentClassName}
                                        </Button>
                                    </div>
                                </div>

                                {shouldOverwriteImport && (
                                    <div className="flex items-center gap-2 text-[11px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>PERINGATAN: Mode timpa aktif. Seluruh murid lama di {currentClassName} akan digantikan oleh {parsedPreview.length} murid baru ini.</span>
                                    </div>
                                )}

                                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground font-bold">
                                                <th className="p-1.5 w-10 text-center">No</th>
                                                <th className="p-1.5 w-32">NISN</th>
                                                <th className="p-1.5">Nama Murid (Hanya Nama)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedPreview.map((st, idx) => (
                                                <tr key={idx} className="border-b border-border/40 hover:bg-muted/40">
                                                    <td className="p-1.5 text-center font-medium">{idx + 1}</td>
                                                    <td className="p-1.5 font-mono text-[11px]">{st.nisn}</td>
                                                    <td className="p-1.5 font-bold">{st.name}</td>
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
                <div className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                            <UserCheck className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">Daftar Wali Kelas Per Rombel (12 Kelas)</h2>
                            <p className="text-xs text-muted-foreground">Sesuaikan nama Wali Kelas untuk setiap rombongan belajar.</p>
                        </div>
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
                                    placeholder="Nama Wali Kelas..."
                                    className="bg-background text-xs font-semibold"
                                />
                            </div>
                        ))}
                    </div>
                </div>

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

                {/* Section 5: Zona Bahaya - Reset Total Data Aplikasi */}
                <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-rose-500/20 pb-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                            <AlertCircle className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-foreground">Zona Bahaya - Reset Total Data Aplikasi</h2>
                            <p className="text-xs text-muted-foreground">Hapus bersih seluruh daftar murid, centang hafalan, dan riwayat di semua kelas sekaligus.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground font-medium">
                            Gunakan tombol ini saat pergantian tahun ajaran baru jika ingin mengosongkan seluruh database aplikasi.
                        </div>
                        <Button
                            type="button"
                            onClick={() => setIsClearAllModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 shrink-0 shadow-md shadow-rose-600/20"
                        >
                            <Trash2 className="size-4 mr-2" /> Reset / Kosongkan Seluruh Data Aplikasi
                        </Button>
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
