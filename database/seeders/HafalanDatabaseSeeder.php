<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HafalanDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. School Settings
        DB::table('school_settings')->updateOrInsert(
            ['key' => 'school_name'],
            ['value' => 'SMP / MADRASAH TSANAWIYAH ISLAMIC SCHOOL', 'updated_at' => now()]
        );
        DB::table('school_settings')->updateOrInsert(
            ['key' => 'quran_teacher_name'],
            ['value' => 'Ustadz Pembimbing Tahfidz, S.Pd.I', 'updated_at' => now()]
        );

        // 2. Classes
        $classes = [
            ['id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A', 'wali_kelas' => 'Ustadz H. Ahmad Fauzi, S.Pd.I'],
            ['id' => '7B', 'name' => 'Kelas 7B', 'grade' => 7, 'section' => 'B', 'wali_kelas' => 'Ustadzah Hj. Nurul Hidayah, M.Pd'],
            ['id' => '7C', 'name' => 'Kelas 7C', 'grade' => 7, 'section' => 'C', 'wali_kelas' => 'Ustadz Muhammad Rizqi, S.Th.I'],
            ['id' => '7D', 'name' => 'Kelas 7D', 'grade' => 7, 'section' => 'D', 'wali_kelas' => 'Ustadzah Khadijah Azzahra, S.Pd'],
            ['id' => '8A', 'name' => 'Kelas 8A', 'grade' => 8, 'section' => 'A', 'wali_kelas' => 'Ustadz Abdurrahman, M.Ag'],
            ['id' => '8B', 'name' => 'Kelas 8B', 'grade' => 8, 'section' => 'B', 'wali_kelas' => 'Ustadzah Fatimah Azzahra, S.Pd.I'],
            ['id' => '8C', 'name' => 'Kelas 8C', 'grade' => 8, 'section' => 'C', 'wali_kelas' => 'Ustadz Ali Zainal Abidin, S.Pd'],
            ['id' => '8D', 'name' => 'Kelas 8D', 'grade' => 8, 'section' => 'D', 'wali_kelas' => 'Ustadzah Siti Aisha, M.Pd'],
            ['id' => '9A', 'name' => 'Kelas 9A', 'grade' => 9, 'section' => 'A', 'wali_kelas' => 'Ustadz H. Umar Faruq, S.Ag'],
            ['id' => '9B', 'name' => 'Kelas 9B', 'grade' => 9, 'section' => 'B', 'wali_kelas' => 'Ustadzah Maryam Jameelah, S.Pd.I'],
            ['id' => '9C', 'name' => 'Kelas 9C', 'grade' => 9, 'section' => 'C', 'wali_kelas' => 'Ustadz Usman Harun, M.Pd'],
            ['id' => '9D', 'name' => 'Kelas 9D', 'grade' => 9, 'section' => 'D', 'wali_kelas' => 'Ustadzah Asma\' Binti Abu Bakar, S.Pd'],
        ];

        foreach ($classes as $cls) {
            $token = Str::slug($cls['id']) . '_' . substr(md5('hafalan_key_' . $cls['id']), 0, 10);
            DB::table('classes')->updateOrInsert(
                ['id' => $cls['id']],
                [
                    'name' => $cls['name'],
                    'grade' => $cls['grade'],
                    'section' => $cls['section'],
                    'wali_kelas' => $cls['wali_kelas'],
                    'share_token' => $token,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 3. Students Generation
        $maleFirst = ['Ahmad', 'Muhammad', 'Abdullah', 'Faris', 'Fikri', 'Ibrahim', 'Yusuf', 'Hamzah', 'Raihan', 'Zaid', 'Bilal', 'Umar', 'Ali', 'Hasan', 'Husain', 'Salman', 'Tariq', 'Malik', 'Luqman', 'Amir', 'Nabil', 'Zidan', 'Hanif', 'Naufal'];
        $femaleFirst = ['Aisyah', 'Fatimah', 'Khadijah', 'Zahra', 'Nabila', 'Salma', 'Syifa', 'Annisa', 'Maryam', 'Hanum', 'Yasmin', 'Rania', 'Alya', 'Fitri', 'Hilya', 'Laila', 'Safiya', 'Siti', 'Hasna', 'Nadia', 'Zulfa', 'Azizah', 'Latifah', 'Husna'];
        $lastNames = ['Pratama', 'Hidayat', 'Ramadhan', 'Saputra', 'Kurniawan', 'Nurrizky', 'Mahendra', 'Santoso', 'Firmansyah', 'Wijaya', 'Ardiansyah', 'Putra', 'Maulana', 'Setiawan', 'Rahman', 'Suryana', 'Laksana', 'Subagja', 'Wibowo', 'Nugraha', 'Al-Ghifari', 'Al-Fatih', 'Al-Mansur', 'Al-Farisi'];

        foreach ($classes as $cls) {
            $nisnCounter = 81200000 + ($cls['grade'] * 1000) + (ord($cls['section']) * 100);

            for ($i = 1; $i <= 36; $i++) {
                $isMale = ($i % 2 !== 0);
                $firstList = $isMale ? $maleFirst : $femaleFirst;
                $firstName = $firstList[($i * 3 + ord($cls['section'])) % count($firstList)];
                $lastName = $lastNames[($i * 7 + $cls['grade']) % count($lastNames)];
                $name = "{$firstName} {$lastName}";
                $studentId = "std_{$cls['id']}_{$i}";
                $nisn = "00" . ($nisnCounter + $i);

                DB::table('students')->updateOrInsert(
                    ['id' => $studentId],
                    [
                        'nisn' => $nisn,
                        'name' => $name,
                        'gender' => $isMale ? 'L' : 'P',
                        'class_id' => $cls['id'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
