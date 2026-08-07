<?php

namespace App\Http\Requests\Hafalan;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function rules(): array
    {
        $limits = config('hafalan.limits');

        return [
            'schoolName' => ['sometimes', 'nullable', 'string', 'max:'.$limits['school_name']],
            'quranTeacherName' => ['sometimes', 'nullable', 'string', 'max:'.$limits['teacher_name']],
        ];
    }

    /**
     * Only the settings actually present in the request, mapped to their storage keys.
     *
     * Using `sometimes` plus this filter means a partial update leaves the other
     * setting untouched, rather than blanking it.
     *
     * @return array<string, string>
     */
    public function settingsToPersist(): array
    {
        $map = [
            'schoolName' => 'school_name',
            'quranTeacherName' => 'quran_teacher_name',
        ];

        $settings = [];

        foreach ($map as $input => $storageKey) {
            if ($this->has($input)) {
                $settings[$storageKey] = (string) ($this->input($input) ?? '');
            }
        }

        return $settings;
    }
}
