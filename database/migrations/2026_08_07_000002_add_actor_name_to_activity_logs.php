<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the acting account's name alongside its id.
 *
 * user_id alone loses the actor in two situations: when the account is later
 * deleted (the FK nulls out), and when the log is carried into another database
 * by a backup restore, where that id means nothing. The name is a snapshot, so
 * the trail stays readable in both cases.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->string('actor_name')->nullable()->after('user_id');
        });

        DB::table('activity_logs')
            ->whereNull('actor_name')
            ->whereNotNull('user_id')
            ->update([
                'actor_name' => DB::raw('(select name from users where users.id = activity_logs.user_id)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropColumn('actor_name');
        });
    }
};
