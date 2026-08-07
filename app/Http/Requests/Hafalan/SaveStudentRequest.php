<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveStudentRequest extends FormRequest
{
    public function rules(): array
    {
        $limits = config('hafalan.limits');

        return [
            // Present only when editing. It must already exist, so a request can no
            // longer mint a record under an id of the caller's choosing — new students
            // always get a server-generated ULID.
            'id' => ['nullable', 'string', Rule::exists('students', 'id')],

            // NIS is the school's own student number (not the 10-digit national NISN),
            // so its format is school-defined; only length and uniqueness are enforced.
            'nis' => [
                'required',
                'string',
                'max:'.$limits['nis'],
                Rule::unique('students', 'nis')->ignore($this->input('id'), 'id'),
            ],
            'name' => ['required', 'string', 'max:'.$limits['student_name']],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'classId' => ['required', 'string', Rule::exists('classes', 'id')],
        ];
    }

    public function messages(): array
    {
        return [
            'nis.unique' => 'NIS ini sudah dipakai siswa lain.',
            'id.exists' => 'Siswa yang hendak diubah tidak ditemukan.',
            'classId.exists' => 'Kelas tujuan tidak ditemukan.',
        ];
    }

    public function isEditing(): bool
    {
        return filled($this->input('id'));
    }
}
