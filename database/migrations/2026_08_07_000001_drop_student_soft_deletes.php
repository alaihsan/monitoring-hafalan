<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Student deletion is now always permanent.
 *
 * Any student still sitting in the soft-deleted state is purged here along with
 * their progress, so the table is left holding only live records.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('students', 'deleted_at')) {
            return;
        }

        $trashedIds = DB::table('students')->whereNotNull('deleted_at')->pluck('id');

        if ($trashedIds->isNotEmpty()) {
            DB::table('hafalan_progress')->whereIn('student_id', $trashedIds)->delete();
            DB::table('students')->whereIn('id', $trashedIds)->delete();
        }

        Schema::table('students', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->softDeletes();
        });
    }
};
