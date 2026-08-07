<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClearClassRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'classId' => ['required', 'string', Rule::exists('classes', 'id')],
            'password' => ['required', 'current_password'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.current_password' => 'Password salah.',
            'classId.exists' => 'Kelas tidak ditemukan.',
        ];
    }
}
