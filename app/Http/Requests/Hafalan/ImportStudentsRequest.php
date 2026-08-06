<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportStudentsRequest extends FormRequest
{
    public function rules(): array
    {
        $limits = config('hafalan.limits');

        return [
            // Capped so a single request cannot drive an unbounded number of writes.
            'students' => ['required', 'array', 'min:1', 'max:'.$limits['import_batch']],

            // No client-supplied id: rows are matched on NIS, the school's own business
            // key, so re-importing the same sheet updates those students instead of
            // duplicating them or overwriting unrelated records.
            'students.*.nis' => ['required', 'string', 'max:'.$limits['nis'], 'distinct'],
            'students.*.name' => ['required', 'string', 'max:'.$limits['student_name']],
            'students.*.gender' => ['required', Rule::in(['L', 'P'])],
            'students.*.classId' => ['required', 'string', Rule::exists('classes', 'id')],
        ];
    }

    public function messages(): array
    {
        return [
            'students.max' => 'Sekali import maksimal :max siswa. Bagi menjadi beberapa batch.',
            'students.*.nis.distinct' => 'Terdapat NIS ganda di dalam data yang diimport.',
            'students.*.gender.required' => 'Jenis kelamin wajib diisi untuk setiap siswa (L atau P).',
            'students.*.classId.exists' => 'Kelas tujuan tidak ditemukan.',
        ];
    }
}
