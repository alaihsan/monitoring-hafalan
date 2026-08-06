<?php

use App\Models\ClassModel;
use App\Models\User;

test('admin can update wali kelas names for 12 rombel', function () {
    $user = User::factory()->create();

    ClassModel::create([
        'id' => '7A',
        'name' => 'Kelas 7A',
        'grade' => 7,
        'section' => 'A',
        'wali_kelas' => '',
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/hafalan/classes/wali-kelas', [
            'classes' => [
                ['id' => '7A', 'waliKelas' => 'Wali Kelas Test 7A'],
            ],
        ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('classes', [
        'id' => '7A',
        'wali_kelas' => 'Wali Kelas Test 7A',
    ]);
});
