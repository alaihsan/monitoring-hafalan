export interface Surah {
    id: string;
    number: number;
    name: string;
    arabicName: string;
    totalVerses: number;
    grade: number;
    semester: number;
}

export interface ClassInfo {
    id: string;
    name: string;
    grade: number;
    section: string;
    waliKelas: string;
    /** Server-provided; the client no longer holds every class's students. */
    studentCount?: number;
}

export interface Student {
    id: string;
    nis: string;
    name: string;
    gender: 'L' | 'P';
    classId: string;
}

export interface SchoolSettings {
    schoolName: string;
    quranTeacherName: string;
}

export type HistoryActionType =
    | 'CHECKED'
    | 'UNCHECKED'
    | 'ADD_STUDENT'
    | 'EDIT_STUDENT'
    | 'DELETE_STUDENT'
    | 'IMPORT_STUDENTS'
    | 'UPDATE_SETTINGS';

export interface HistoryLogItem {
    id: string;
    timestamp: string;
    studentName: string;
    studentNis: string;
    className: string;
    surahName?: string;
    verseNum?: number;
    action: HistoryActionType;
    actionLabel?: string;
}

export type ProgressData = Record<string, Record<string, number[]>>;

export const SURAHS: Surah[] = [
    { id: 'al-mursalat', number: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', totalVerses: 50, grade: 7, semester: 1 },
    { id: 'al-insan', number: 76, name: 'Al-Insan', arabicName: 'الإنسان', totalVerses: 31, grade: 7, semester: 2 },
    { id: 'al-qiyamah', number: 75, name: 'Al-Qiyamah', arabicName: 'القيامة', totalVerses: 40, grade: 8, semester: 1 },
    { id: 'al-muddtastsir', number: 74, name: 'Al-Muddaththir', arabicName: 'المدثر', totalVerses: 56, grade: 8, semester: 2 },
    { id: 'al-muzzammil', number: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', totalVerses: 20, grade: 9, semester: 1 },
    { id: 'al-jin', number: 72, name: 'Al-Jinn', arabicName: 'الجن', totalVerses: 28, grade: 9, semester: 2 },
];

export const CLASSES: ClassInfo[] = [
    { id: '7A', name: 'Kelas 7A', grade: 7, section: 'A', waliKelas: '' },
    { id: '7B', name: 'Kelas 7B', grade: 7, section: 'B', waliKelas: '' },
    { id: '7C', name: 'Kelas 7C', grade: 7, section: 'C', waliKelas: '' },
    { id: '7D', name: 'Kelas 7D', grade: 7, section: 'D', waliKelas: '' },
    { id: '8A', name: 'Kelas 8A', grade: 8, section: 'A', waliKelas: '' },
    { id: '8B', name: 'Kelas 8B', grade: 8, section: 'B', waliKelas: '' },
    { id: '8C', name: 'Kelas 8C', grade: 8, section: 'C', waliKelas: '' },
    { id: '8D', name: 'Kelas 8D', grade: 8, section: 'D', waliKelas: '' },
    { id: '9A', name: 'Kelas 9A', grade: 9, section: 'A', waliKelas: '' },
    { id: '9B', name: 'Kelas 9B', grade: 9, section: 'B', waliKelas: '' },
    { id: '9C', name: 'Kelas 9C', grade: 9, section: 'C', waliKelas: '' },
    { id: '9D', name: 'Kelas 9D', grade: 9, section: 'D', waliKelas: '' },
];

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
    schoolName: '',
    quranTeacherName: '',
};

// Helper to get surah by grade and semester
export function getSurahForGradeAndSemester(grade: number, semester: number): Surah {
    const found = SURAHS.find(s => s.grade === grade && s.semester === semester);
    return found || SURAHS[0];
}

// NOTE: student names, NIS and progress used to be mirrored into localStorage.
// That left personal data sitting on shared school computers indefinitely (readable
// after logout), and made the cache a second source of truth that could mask real
// data loss when the server returned an empty set. The database is now the only
// source; only non-personal UI preferences (sidebar, appearance) still use
// localStorage, and those live in their own hooks.

// Smart Expirable Share Link Helpers
//
// The share URL is minted by the server (POST api.hafalan.classes.share-link) as a
// cryptographically signed, optionally expiring Laravel URL. Signature and expiry are
// verified server-side by the `signed` middleware, so there is deliberately no
// client-side token generation or expiry check here — those could only ever hide data
// that had already been sent to the browser.
export type ShareDurationKey = '1d' | '7d' | '30d' | 'never';

export interface ExpirableShareResult {
    url: string;
    expirationText: string;
}

export async function requestShareUrl(
    classId: string,
    durationKey: ShareDurationKey
): Promise<ExpirableShareResult> {
    const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

    const res = await fetch(`/api/hafalan/classes/${encodeURIComponent(classId)}/share-link`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({ duration: durationKey }),
    });

    if (!res.ok) {
        throw new Error(`Gagal membuat link share (HTTP ${res.status})`);
    }

    const data = await res.json();

    return { url: data.url, expirationText: data.expirationText };
}

// Parser for copy-pasted text (from Excel/Word/CSV)
//
// This parser reports what it found and never invents values. The previous version
// fabricated a NIS when none could be parsed and assigned gender by alternating on
// row index, so importing a list silently produced wrong data for half the students.
export interface ParsedStudentRow {
    nis: string;
    name: string;
    gender: 'L' | 'P' | null;
    classId: string;
    /** Human-readable reasons this row cannot be imported yet. Empty means valid. */
    issues: string[];
}

const GENDER_TOKENS: Record<string, 'L' | 'P'> = {
    L: 'L',
    LK: 'L',
    'LAKI-LAKI': 'L',
    LAKI: 'L',
    P: 'P',
    PR: 'P',
    PEREMPUAN: 'P',
    WANITA: 'P',
};

export function parseStudentsFromImportText(rawText: string, targetClassId: string): ParsedStudentRow[] {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    return lines.map((line) => {
        let tokens = line.split(/[\t,;]+|\s+/).map((p) => p.trim()).filter(Boolean);

        // Drop a leading row number like "1." or "12)" — it is ordering, not data.
        if (tokens.length > 1 && /^\d{1,3}[.)]$/.test(tokens[0])) {
            tokens = tokens.slice(1);
        }

        // Gender: a standalone L/P style token anywhere in the row.
        let gender: 'L' | 'P' | null = null;
        const genderIndex = tokens.findIndex((t) => GENDER_TOKENS[t.toUpperCase()] !== undefined);
        if (genderIndex !== -1) {
            gender = GENDER_TOKENS[tokens[genderIndex].toUpperCase()];
            tokens = [...tokens.slice(0, genderIndex), ...tokens.slice(genderIndex + 1)];
        }

        // NIS: a numeric token of at least 3 digits, so a stray ordering number is
        // not mistaken for a student number.
        let nis = '';
        const nisIndex = tokens.findIndex((t) => /^\d{3,}$/.test(t));
        if (nisIndex !== -1) {
            nis = tokens[nisIndex];
            tokens = [...tokens.slice(0, nisIndex), ...tokens.slice(nisIndex + 1)];
        }

        const name = tokens.join(' ').replace(/^\d+[.)]\s*/, '').trim();

        const issues: string[] = [];
        if (!name) issues.push('Nama tidak terbaca');
        if (!nis) issues.push('NIS tidak terbaca');
        if (!gender) issues.push('Jenis kelamin (L/P) tidak terbaca');

        return { nis, name, gender, classId: targetClassId, issues };
    });
}
