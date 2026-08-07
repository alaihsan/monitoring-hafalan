<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by the destructive endpoints that take no other input
 * (reset-all, history/clear).
 */
class ConfirmPasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'password' => ['required', 'current_password'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.current_password' => 'Password salah.',
        ];
    }
}
