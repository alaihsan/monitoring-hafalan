<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('school_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. '7A'
            $table->string('name');
            $table->integer('grade');
            $table->string('section');
            $table->string('wali_kelas');
            $table->string('share_token')->nullable();
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('nisn');
            $table->string('name');
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->string('class_id');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('hafalan_progress', function (Blueprint $table) {
            $table->id();
            $table->string('student_id');
            $table->string('surah_id');
            $table->integer('verse_num');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['student_id', 'surah_id', 'verse_num']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('timestamp_str');
            $table->string('student_name');
            $table->string('student_nisn')->default('-');
            $table->string('class_name');
            $table->string('surah_name')->nullable();
            $table->integer('verse_num')->nullable();
            $table->string('action');
            $table->string('action_label')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('hafalan_progress');
        Schema::dropIfExists('students');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('school_settings');
    }
};
