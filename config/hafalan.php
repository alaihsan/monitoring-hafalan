<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Surah Curriculum
    |--------------------------------------------------------------------------
    |
    | The single server-side source of truth for which surah belongs to which
    | grade/semester and how many verses each one has. Validation uses this to
    | reject unknown surah ids and out-of-range verse numbers, so a verse can
    | never be stored that the progress calculation cannot account for.
    |
    | The frontend keeps a mirror of this list in resources/js/data/hafalan-data.ts
    | (SURAHS). tests/Feature/SurahCatalogTest.php asserts the two stay in sync.
    |
    */

    'surahs' => [
        'al-mursalat' => [
            'number' => 77,
            'name' => 'Al-Mursalat',
            'arabic_name' => 'المرسلات',
            'total_verses' => 50,
            'grade' => 7,
            'semester' => 1,
        ],
        'al-insan' => [
            'number' => 76,
            'name' => 'Al-Insan',
            'arabic_name' => 'الإنسان',
            'total_verses' => 31,
            'grade' => 7,
            'semester' => 2,
        ],
        'al-qiyamah' => [
            'number' => 75,
            'name' => 'Al-Qiyamah',
            'arabic_name' => 'القيامة',
            'total_verses' => 40,
            'grade' => 8,
            'semester' => 1,
        ],
        'al-muddtastsir' => [
            'number' => 74,
            'name' => 'Al-Muddaththir',
            'arabic_name' => 'المدثر',
            'total_verses' => 56,
            'grade' => 8,
            'semester' => 2,
        ],
        'al-muzzammil' => [
            'number' => 73,
            'name' => 'Al-Muzzammil',
            'arabic_name' => 'المزمل',
            'total_verses' => 20,
            'grade' => 9,
            'semester' => 1,
        ],
        'al-jin' => [
            'number' => 72,
            'name' => 'Al-Jinn',
            'arabic_name' => 'الجن',
            'total_verses' => 28,
            'grade' => 9,
            'semester' => 2,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Input Limits
    |--------------------------------------------------------------------------
    |
    | The students/activity_logs tables use varchar(255) columns. SQLite ignores
    | varchar length while MySQL rejects it, so without explicit max: rules an
    | oversized value passes in development and throws a database error in
    | production. These caps keep validation and schema in agreement.
    |
    */

    'limits' => [
        'nis' => 30,
        'student_name' => 150,
        'class_name' => 100,
        'wali_kelas' => 150,
        'school_name' => 150,
        'teacher_name' => 150,
        'import_batch' => 500,
    ],

];
