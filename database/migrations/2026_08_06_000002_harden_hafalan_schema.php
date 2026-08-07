<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Schema hardening for the audit trail and student records:
 *
 *  - activity_logs gains user_id (who did it) and logged_at (a real timestamp,
 *    replacing the pre-formatted timestamp_str that could not be range-queried).
 *  - activity_logs gains class_id so class-scoped deletes stop matching on a
 *    display name that can be renamed or collide with another class's id.
 *  - students gains a unique NIS, soft deletes, and the indexes the hot queries need.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->guardAgainstDuplicateNis();

        Schema::table('students', function (Blueprint $table) {
            $table->softDeletes();
            $table->index('class_id');
            // Unique across soft-deleted rows too: a NIS stays reserved by the student
            // it was issued to until that record is restored or force-deleted.
            $table->unique('nis');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')
                ->constrained('users')->nullOnDelete();
            $table->string('class_id')->nullable()->after('class_name');
            $table->timestamp('logged_at')->nullable()->after('class_id');

            $table->index('class_id');
            $table->index('logged_at');
        });

        // created_at is the trustworthy record of when the entry was written;
        // timestamp_str was a localised display string.
        DB::table('activity_logs')->whereNull('logged_at')->update([
            'logged_at' => DB::raw('created_at'),
        ]);

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('timestamp_str');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->string('timestamp_str')->default('');
        });

        DB::table('activity_logs')->update([
            'timestamp_str' => DB::raw("COALESCE(strftime('%d %m %Y %H:%M:%S', logged_at), '')"),
        ]);

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropIndex(['class_id']);
            $table->dropIndex(['logged_at']);
            $table->dropColumn(['class_id', 'logged_at']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique(['nis']);
            $table->dropIndex(['class_id']);
            $table->dropSoftDeletes();
        });
    }

    /**
     * NIS was never unique, so a deployed database may already contain duplicates.
     * Creating the unique index would fail mid-migration with an opaque driver error,
     * and silently renumbering someone's student number is worse. Stop with an
     * actionable message instead and let a human decide which record is correct.
     */
    private function guardAgainstDuplicateNis(): void
    {
        $duplicates = DB::table('students')
            ->select('nis', DB::raw('COUNT(*) as total'))
            ->groupBy('nis')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('total', 'nis');

        if ($duplicates->isEmpty()) {
            return;
        }

        $detail = $duplicates
            ->map(fn ($total, $nis) => "{$nis} ({$total} siswa)")
            ->implode(', ');

        throw new RuntimeException(
            'Tidak bisa membuat NIS unik karena masih ada NIS ganda: '.$detail.'. '.
            'Perbaiki data siswa tersebut lebih dulu, lalu jalankan ulang migrasi ini.'
        );
    }
};
