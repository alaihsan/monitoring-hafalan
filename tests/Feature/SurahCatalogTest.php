<?php

use App\Support\SurahCatalog;

/**
 * config/hafalan.php drives server-side validation while resources/js/data/hafalan-data.ts
 * drives what the UI renders. If the two drift, the UI can offer a verse the server
 * rejects (or vice versa), so this test pins them together.
 */
test('the frontend surah list matches the server catalogue', function () {
    $ts = file_get_contents(resource_path('js/data/hafalan-data.ts'));

    preg_match('/export const SURAHS: Surah\[\] = \[(.*?)\];/s', $ts, $block);
    expect($block)->not->toBeEmpty('Could not locate SURAHS in hafalan-data.ts');

    preg_match_all(
        "/\{\s*id:\s*'([^']+)'.*?number:\s*(\d+).*?totalVerses:\s*(\d+),\s*grade:\s*(\d+),\s*semester:\s*(\d+)\s*\}/s",
        $block[1],
        $matches,
        PREG_SET_ORDER
    );

    $frontend = collect($matches)->mapWithKeys(fn ($m) => [$m[1] => [
        'number' => (int) $m[2],
        'total_verses' => (int) $m[3],
        'grade' => (int) $m[4],
        'semester' => (int) $m[5],
    ]])->all();

    $backend = collect(SurahCatalog::all())->map(fn ($s) => [
        'number' => $s['number'],
        'total_verses' => $s['total_verses'],
        'grade' => $s['grade'],
        'semester' => $s['semester'],
    ])->all();

    expect($frontend)->not->toBeEmpty();
    expect($frontend)->toEqual($backend);
});

test('every grade and semester pair maps to exactly one surah', function () {
    $pairs = collect(SurahCatalog::all())->map(fn ($s) => $s['grade'].'-'.$s['semester']);

    expect($pairs->duplicates())->toBeEmpty();
    expect($pairs)->toHaveCount(6);
});

test('every surah declares a positive verse count', function () {
    foreach (SurahCatalog::all() as $id => $surah) {
        expect($surah['total_verses'])->toBeGreaterThan(0, "{$id} has no verses");
    }
});
