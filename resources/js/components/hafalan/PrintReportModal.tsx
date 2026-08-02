import React from 'react';
import { Student, Surah, ClassInfo, ProgressData, SchoolSettings } from '@/data/hafalan-data';
import { Printer, X, FileText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentClass: ClassInfo;
    currentSurah: Surah;
    students: Student[];
    progress: ProgressData;
    schoolSettings: SchoolSettings;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
    isOpen,
    onClose,
    currentClass,
    currentSurah,
    students,
    progress,
    schoolSettings,
}) => {
    const [paperSize, setPaperSize] = React.useState<'A4' | 'F4'>('A4');
    const [orientation, setOrientation] = React.useState<'landscape' | 'portrait'>('landscape');
    const [academicYear, setAcademicYear] = React.useState('2025/2026');
    const [printDate, setPrintDate] = React.useState(new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }));

    if (!isOpen) return null;

    const totalVerses = currentSurah.totalVerses;
    const verseArray = Array.from({ length: totalVerses }, (_, i) => i + 1);

    const handlePrint = () => {
        window.print();
    };

    const isLargeVerseCount = totalVerses >= 35;
    const isLargeStudentCount = students.length >= 20;

    const tableFontSize = (isLargeVerseCount || isLargeStudentCount) ? 'text-[8px]' : 'text-[9.5px]';
    const headerFontSize = (isLargeVerseCount || isLargeStudentCount) ? 'text-[7px]' : 'text-[8.5px]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            {/* Modal Box */}
            <div className="bg-card text-card-foreground border-border w-full max-w-6xl rounded-2xl border shadow-2xl space-y-6 my-auto max-h-[95vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-border p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Printer className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground">
                                Cetak Laporan Hafalan Surat Al-Qur'an
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Rombel: {currentClass.name} • Wali Kelas: {currentClass.waliKelas}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Print Settings Toolbar */}
                <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border border-border/80 mx-6">
                    {/* Paper Size Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1">
                            <FileText className="size-3.5 text-amber-600" /> Ukuran Kertas:
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaperSize('A4')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    paperSize === 'A4'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                A4 (210 x 297 mm)
                            </button>
                            <button
                                onClick={() => setPaperSize('F4')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    paperSize === 'F4'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                F4 / Folio (215 x 330 mm)
                            </button>
                        </div>
                    </div>

                    {/* Orientation Selector (Default Landscape) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1">
                            <Settings2 className="size-3.5 text-amber-600" /> Orientasi Halaman:
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOrientation('landscape')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    orientation === 'landscape'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                Landscape (Melebar) ★
                            </button>
                            <button
                                onClick={() => setOrientation('portrait')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                    orientation === 'portrait'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                                }`}
                            >
                                Portrait (Tegak)
                            </button>
                        </div>
                    </div>

                    {/* Print Trigger Button */}
                    <div className="flex items-end">
                        <Button
                            onClick={handlePrint}
                            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs"
                        >
                            <Printer className="size-4 mr-2" /> Cetak / Download PDF Sekarang
                        </Button>
                    </div>
                </div>

                {/* Printable Document Preview Area */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Pratinjau Dokumen Cetak:</div>
                    
                    {/* Printable Area */}
                    <div id="printable-area" className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-inner font-sans text-xs space-y-3 w-full">
                        {/* Kop Laporan Header */}
                        <div className="print-kop border-b-2 border-slate-900 pb-2 text-center space-y-0.5">
                            <h1 className="text-base font-black uppercase tracking-wider text-slate-900">
                                {schoolSettings.schoolName}
                            </h1>
                            <h2 className="text-sm font-bold text-emerald-800">
                                LAPORAN MONITORING HAFALAN AL-QUR'AN
                            </h2>
                            <p className="text-[11px] font-medium text-slate-700">
                                TAHUN PELAJARAN {academicYear}
                            </p>
                        </div>

                        {/* Metadata Information */}
                        <div className="print-meta grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                            <div className="space-y-0.5">
                                <div><span className="font-semibold text-slate-600">Rombongan Belajar:</span> <strong className="text-slate-900">{currentClass.name}</strong></div>
                                <div><span className="font-semibold text-slate-600">Wali Kelas:</span> <strong className="text-slate-900">{currentClass.waliKelas}</strong></div>
                                <div><span className="font-semibold text-slate-600">Total Murid:</span> <strong className="text-slate-900">{students.length} Siswa</strong></div>
                            </div>
                            <div className="space-y-0.5">
                                <div><span className="font-semibold text-slate-600">Target Surat:</span> <strong className="text-slate-900">{currentSurah.name} ({currentSurah.arabicName})</strong></div>
                                <div><span className="font-semibold text-slate-600">Semester & Target Ayat:</span> <strong className="text-slate-900">Semester {currentSurah.semester} • {currentSurah.totalVerses} Ayat</strong></div>
                                <div><span className="font-semibold text-slate-600">Tanggal Cetak:</span> <strong className="text-slate-900">{printDate}</strong></div>
                            </div>
                        </div>

                        {/* Matrix Table for Print */}
                        <div className="w-full overflow-x-auto print:overflow-visible">
                            <table className={`w-full border-collapse border border-slate-900 ${tableFontSize}`}>
                                <thead>
                                    <tr className="bg-slate-200 text-slate-900">
                                        <th className="border border-slate-900 p-1 text-center w-6 font-bold">No</th>
                                        <th className="border border-slate-900 px-2 py-1 text-left font-bold whitespace-nowrap">Nama Murid</th>
                                        {verseArray.map((v) => (
                                            <th key={v} className={`border border-slate-900 p-0 text-center font-bold ${headerFontSize}`}>
                                                {v}
                                            </th>
                                        ))}
                                        <th className="border border-slate-900 p-1 text-center font-bold min-w-[32px]">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const completedVerses = progress[student.id]?.[currentSurah.id] || [];
                                        const count = completedVerses.length;
                                        const percent = Math.round((count / totalVerses) * 100);

                                        return (
                                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="border border-slate-900 p-1 text-center font-medium">{idx + 1}</td>
                                                <td className="border border-slate-900 px-2 py-1 font-bold whitespace-nowrap text-left text-slate-900">{student.name}</td>
                                                {verseArray.map((v) => {
                                                    const isChecked = completedVerses.includes(v);
                                                    return (
                                                        <td key={v} className={`border border-slate-900 p-0 text-center font-bold ${isChecked ? 'bg-emerald-200 text-emerald-950' : 'text-slate-300'}`}>
                                                            {isChecked ? '✓' : ''}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border border-slate-900 p-1 text-center font-bold">{percent}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures Section: 2 Columns Only */}
                        <div className="print-signatures pt-3 grid grid-cols-2 gap-8 text-center text-xs">
                            <div className="flex flex-col justify-between h-20">
                                <p className="font-semibold">Mengetahui,<br/>Wali Kelas {currentClass.name}</p>
                                <p className="font-bold underline">{currentClass.waliKelas}</p>
                            </div>
                            <div className="flex flex-col justify-between h-20">
                                <p className="font-semibold"><br/>Guru Mapel Al-Qur'an,</p>
                                <p className="font-bold underline">{schoolSettings.quranTeacherName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Dynamic CSS Injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    html, body {
                        height: 100% !important;
                        max-height: 100vh !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible !important;
                    }
                    #printable-area {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: hidden !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .print-kop {
                        padding-bottom: 4px !important;
                        margin-bottom: 4px !important;
                    }
                    .print-meta {
                        padding: 4px 8px !important;
                        margin-bottom: 4px !important;
                        font-size: 10px !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        padding: 1.5px 2px !important;
                        line-height: 1.15 !important;
                    }
                    .print-signatures {
                        padding-top: 6px !important;
                        margin-top: 4px !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    @page {
                        size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'} ${orientation};
                        margin: 4mm 6mm;
                    }
                }
            `}} />
        </div>
    );
};
