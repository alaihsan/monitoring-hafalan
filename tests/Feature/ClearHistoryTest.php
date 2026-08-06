<?php

use App\Models\ActivityLog;
use App\Models\User;

test('admin can clear activity history log table in database', function () {
    $user = User::factory()->create();

    ActivityLog::create([
        'timestamp_str' => '06 Aug 2026 10:00:00',
        'student_name' => 'Ahmad Fulan',
        'student_nisn' => '0081234',
        'class_name' => 'Kelas 7A',
        'surah_name' => 'Al-Mursalat',
        'verse_num' => 1,
        'action' => 'CHECKED',
        'action_label' => 'Mencentang Hafalan',
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/hafalan/history/clear');

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseMissing('activity_logs', [
        'student_name' => 'Ahmad Fulan',
    ]);
});
