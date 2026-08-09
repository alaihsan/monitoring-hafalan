<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateApiKeyCommand extends Command
{
    protected $signature = 'hafalan:api-key';

    protected $description = 'Membuat API key acak untuk dashboard eksternal (X-Api-Key)';

    public function handle(): int
    {
        // 64 hex chars: far beyond guessable, and comfortably over the middleware's
        // minimum length so it cannot be mistaken for an unconfigured key.
        $key = Str::random(64);

        $this->newLine();
        $this->line('Tambahkan baris berikut ke file .env di server:');
        $this->newLine();
        $this->line("  HAFALAN_API_KEY={$key}");
        $this->newLine();
        $this->warn('Setelah itu jalankan: php artisan config:clear');
        $this->warn('Simpan kunci ini seperti password. Jangan commit ke git.');
        $this->newLine();

        return self::SUCCESS;
    }
}
