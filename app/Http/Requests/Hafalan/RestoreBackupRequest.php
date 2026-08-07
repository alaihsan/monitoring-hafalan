<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;

class RestoreBackupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Restoring replaces every student, setoran and log, so it is gated the
            // same way as the other destructive endpoints.
            'password' => ['required', 'current_password'],
            // The payload's interior is validated by BackupService, which can report
            // per-row problems far more usefully than array rules over ~100k entries.
            'backup' => ['required', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.current_password' => 'Password salah.',
            'backup.required' => 'File backup tidak terbaca.',
        ];
    }
}
