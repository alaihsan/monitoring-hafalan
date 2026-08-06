<?php

namespace App\Http\Requests\Hafalan;

use App\Support\SurahCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ToggleVerseRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'studentId' => ['required', 'string', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'surahId' => ['required', 'string', Rule::in(SurahCatalog::ids())],
            'verseNum' => ['required', 'integer', 'min:1'],
            'surahName' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * The upper bound for verseNum depends on which surah was submitted, so it is
     * checked after the individual field rules have run.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['surahId', 'verseNum'])) {
                    return;
                }

                $total = SurahCatalog::totalVerses($this->input('surahId'));

                if ($total !== null && (int) $this->input('verseNum') > $total) {
                    $validator->errors()->add(
                        'verseNum',
                        "Surat ini hanya memiliki {$total} ayat."
                    );
                }
            },
        ];
    }
}
