<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HafalanDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. School Settings (Empty default values)
        DB::table('school_settings')->updateOrInsert(
            ['key' => 'school_name'],
            ['value' => '', 'updated_at' => now()]
        );
        DB::table('school_settings')->updateOrInsert(
            ['key' => 'quran_teacher_name'],
            ['value' => '', 'updated_at' => now()]
        );

        // 2. Classes
        $classes = [
            ['id' => '7A', 'name' => 'Kelas 7A', 'grade' => 7, 'section' => 'A'],
            ['id' => '7B', 'name' => 'Kelas 7B', 'grade' => 7, 'section' => 'B'],
            ['id' => '7C', 'name' => 'Kelas 7C', 'grade' => 7, 'section' => 'C'],
            ['id' => '7D', 'name' => 'Kelas 7D', 'grade' => 7, 'section' => 'D'],
            ['id' => '8A', 'name' => 'Kelas 8A', 'grade' => 8, 'section' => 'A'],
            ['id' => '8B', 'name' => 'Kelas 8B', 'grade' => 8, 'section' => 'B'],
            ['id' => '8C', 'name' => 'Kelas 8C', 'grade' => 8, 'section' => 'C'],
            ['id' => '8D', 'name' => 'Kelas 8D', 'grade' => 8, 'section' => 'D'],
            ['id' => '9A', 'name' => 'Kelas 9A', 'grade' => 9, 'section' => 'A'],
            ['id' => '9B', 'name' => 'Kelas 9B', 'grade' => 9, 'section' => 'B'],
            ['id' => '9C', 'name' => 'Kelas 9C', 'grade' => 9, 'section' => 'C'],
            ['id' => '9D', 'name' => 'Kelas 9D', 'grade' => 9, 'section' => 'D'],
        ];

        foreach ($classes as $cls) {
            $token = Str::slug($cls['id']).'_'.substr(md5('hafalan_key_'.$cls['id']), 0, 10);
            DB::table('classes')->updateOrInsert(
                ['id' => $cls['id']],
                [
                    'name' => $cls['name'],
                    'grade' => $cls['grade'],
                    'section' => $cls['section'],
                    'wali_kelas' => '',
                    'share_token' => $token,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
