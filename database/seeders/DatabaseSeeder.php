<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Main Admin User for Login
        User::updateOrCreate(
            ['email' => 'admin@hafalan.com'],
            [
                'name' => 'Admin Monitoring Hafalan',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Backup default test user
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Seed Hafalan Classes & Students Data
        $this->call(HafalanDatabaseSeeder::class);
    }
}
