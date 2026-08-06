<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The application tracks a school-local student number (NIS - Nomor Induk Siswa),
 * not the 10-digit national NISN. Rename the columns so the schema says what it holds.
 *
 * renameColumn preserves existing values, so no data migration is needed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->renameColumn('nisn', 'nis');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->renameColumn('student_nisn', 'student_nis');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->renameColumn('nis', 'nisn');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->renameColumn('student_nis', 'student_nisn');
        });
    }
};
