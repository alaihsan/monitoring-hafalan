<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWaliKelasRequest extends FormRequest
{
    public function rules(): array
    {
        $limits = config('hafalan.limits');

        return [
            'classes' => ['required', 'array', 'min:1'],
            // Previously an unknown id silently matched zero rows and still reported
            // success; exists: turns that into a validation error the user can see.
            'classes.*.id' => ['required', 'string', 'distinct', Rule::exists('classes', 'id')],
            'classes.*.waliKelas' => ['nullable', 'string', 'max:'.$limits['wali_kelas']],
        ];
    }

    public function messages(): array
    {
        return [
            'classes.*.id.exists' => 'Kelas :input tidak ditemukan.',
            'classes.*.id.distinct' => 'Terdapat kelas ganda dalam permintaan.',
        ];
    }
}
