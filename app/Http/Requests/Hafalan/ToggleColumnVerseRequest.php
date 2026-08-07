<?php

namespace App\Http\Requests\Hafalan;

use App\Support\SurahCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ToggleColumnVerseRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'classId' => ['required', 'string', Rule::exists('classes', 'id')],
            'surahId' => ['required', 'string', Rule::in(SurahCatalog::ids())],
            'verseNum' => ['required', 'integer', 'min:1'],
            'surahName' => ['nullable', 'string', 'max:100'],
        ];
    }

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
