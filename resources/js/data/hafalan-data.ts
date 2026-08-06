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
}

export interface Student {
    id: string;
    nisn: string;
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
    studentNisn: string;
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

export function generateSampleStudents(): Student[] {
    return [];
}

export function generateInitialProgress(students: Student[]): ProgressData {
    return {};
}

// LocalStorage Keys
const STORAGE_KEY_PROGRESS = 'hafalan_monitoring_progress_v1';
const STORAGE_KEY_CLASSES = 'hafalan_monitoring_classes_v1';
const STORAGE_KEY_SETTINGS = 'hafalan_monitoring_settings_v1';
const STORAGE_KEY_STUDENTS = 'hafalan_monitoring_students_v1';
const STORAGE_KEY_HISTORY = 'hafalan_monitoring_history_v1';

export function loadSavedStudents(): Student[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        if (saved !== null) {
            const parsed: Student[] = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to load students from localStorage', e);
    }
    return [];
}

export function saveStudentsToStorage(students: Student[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    } catch (e) {
        console.error('Failed to save students to localStorage', e);
    }
}

export function loadSavedProgress(allStudents: Student[]): ProgressData {
    if (typeof window === 'undefined') return {};
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (saved !== null) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load progress from localStorage', e);
    }
    return {};
}

export function saveProgressToStorage(progress: ProgressData): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
    } catch (e) {
        console.error('Failed to save progress to localStorage', e);
    }
}

export function loadSavedClasses(): ClassInfo[] {
    if (typeof window === 'undefined') return CLASSES;
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CLASSES);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load classes from localStorage', e);
    }
    return CLASSES;
}

export function saveClassesToStorage(classes: ClassInfo[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
    } catch (e) {
        console.error('Failed to save classes to localStorage', e);
    }
}

export function loadSchoolSettings(): SchoolSettings {
    if (typeof window === 'undefined') return DEFAULT_SCHOOL_SETTINGS;
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load school settings from localStorage', e);
    }
    return DEFAULT_SCHOOL_SETTINGS;
}

export function saveSchoolSettings(settings: SchoolSettings): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save school settings to localStorage', e);
    }
}

// Activity History Log Helpers
export function loadHistoryLogs(): HistoryLogItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load history logs from localStorage', e);
    }
    return [];
}

export function addHistoryLog(log: Omit<HistoryLogItem, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    try {
        const currentLogs = loadHistoryLogs();
        const newLogItem: HistoryLogItem = {
            ...log,
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
        };
        const updatedLogs = [newLogItem, ...currentLogs].slice(0, 500); // Keep max 500 logs
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedLogs));
    } catch (e) {
        console.error('Failed to add history log to localStorage', e);
    }
}

// Smart Expirable Share Link Helpers
export type ShareDurationKey = '1d' | '7d' | '30d' | 'never';

export interface ExpirableShareResult {
    url: string;
    token: string;
    expiresTimestamp: number;
    expirationText: string;
}

export function generateSmartShareUrl(classId: string, durationKey: ShareDurationKey): ExpirableShareResult {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const nowSec = Math.floor(Date.now() / 1000);

    let expiresTimestamp = 0;
    let expirationText = 'Selamanya (Tidak Ada Batas Waktu)';

    if (durationKey === '1d') {
        expiresTimestamp = nowSec + 86400; // 24 hours
        expirationText = 'Berlaku 1 Hari';
    } else if (durationKey === '7d') {
        expiresTimestamp = nowSec + 604800; // 7 days
        expirationText = 'Berlaku 7 Hari';
    } else if (durationKey === '30d') {
        expiresTimestamp = nowSec + 2592000; // 30 days
        expirationText = 'Berlaku 30 Hari';
    }

    // Generate secure hashed token
    const token = `tok_${classId.toLowerCase()}_${Math.abs(hashCode(`${classId}_salt_2026_${expiresTimestamp}`)).toString(36)}`;
    const url = `${origin}/share/hafalan?token=${token}&class=${classId}&expires=${expiresTimestamp}`;

    return {
        url,
        token,
        expiresTimestamp,
        expirationText,
    };
}

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash;
}

export function validateShareTokenExpiration(expiresParam: string | null): { isExpired: boolean; expiredDateText?: string } {
    if (!expiresParam || expiresParam === '0') {
        return { isExpired: false };
    }

    const expiresSec = parseInt(expiresParam, 10);
    if (isNaN(expiresSec) || expiresSec <= 0) {
        return { isExpired: false };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > expiresSec) {
        const dateStr = new Date(expiresSec * 1000).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return { isExpired: true, expiredDateText: dateStr };
    }

    return { isExpired: false };
}

// Parser for copy-pasted text (from Excel/Word/CSV)
export function parseStudentsFromImportText(rawText: string, targetClassId: string): Student[] {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedStudents: Student[] = [];

    lines.forEach((line, index) => {
        const tokens = line.split(/[\t,;]+|\s+/).map(p => p.trim()).filter(Boolean);
        let nisn = '';
        let name = '';

        if (tokens.length >= 2) {
            if (/^\d+$/.test(tokens[0])) {
                nisn = tokens[0];
                name = tokens.slice(1).join(' ');
            } else if (/^\d+[\.\)]?$/.test(tokens[0]) && tokens.length >= 3 && /^\d+$/.test(tokens[1])) {
                nisn = tokens[1];
                name = tokens.slice(2).join(' ');
            } else if (/^\d+[\.\)]?$/.test(tokens[0])) {
                name = tokens.slice(1).join(' ');
            } else {
                name = tokens.join(' ');
            }
        } else if (tokens.length === 1) {
            name = tokens[0].replace(/^\d+[\.\)]\s*/, '');
        }

        name = name.replace(/^\d+[\.\)]\s*/, '').trim();

        if (!nisn) {
            nisn = `0089${targetClassId}${index + 101}`;
        }

        if (name) {
            parsedStudents.push({
                id: `std_${targetClassId}_imported_${Date.now()}_${index}`,
                nisn,
                name,
                gender: index % 2 === 0 ? 'L' : 'P',
                classId: targetClassId,
            });
        }
    });

    return parsedStudents;
}

export function resetAllDataToDefault(): { students: Student[]; progress: ProgressData; classes: ClassInfo[]; settings: SchoolSettings } {
    const students = generateSampleStudents();
    const progress = generateInitialProgress(students);
    const classes = CLASSES;
    const settings = DEFAULT_SCHOOL_SETTINGS;
    saveStudentsToStorage(students);
    saveProgressToStorage(progress);
    saveClassesToStorage(classes);
    saveSchoolSettings(settings);
    return { students, progress, classes, settings };
}
