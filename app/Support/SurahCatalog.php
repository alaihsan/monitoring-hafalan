<?php

namespace App\Support;

/**
 * Read-only accessor over config/hafalan.php's surah curriculum.
 *
 * Everything that needs to know which surahs exist, or how many verses one has,
 * goes through here so the list is defined in exactly one place.
 */
class SurahCatalog
{
    /**
     * @return array<string, array<string, mixed>> Keyed by surah id.
     */
    public static function all(): array
    {
        return config('hafalan.surahs', []);
    }

    /**
     * @return array<int, string>
     */
    public static function ids(): array
    {
        return array_keys(self::all());
    }

    public static function exists(string $surahId): bool
    {
        return array_key_exists($surahId, self::all());
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(string $surahId): ?array
    {
        return self::all()[$surahId] ?? null;
    }

    /**
     * Total verses for a surah, or null when the id is unknown.
     */
    public static function totalVerses(string $surahId): ?int
    {
        return self::find($surahId)['total_verses'] ?? null;
    }

    public static function name(string $surahId): ?string
    {
        return self::find($surahId)['name'] ?? null;
    }

    /**
     * The surah list shaped for API responses, in curriculum order.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forResponse(): array
    {
        return array_map(
            fn (string $id, array $s) => [
                'id' => $id,
                'number' => $s['number'],
                'name' => $s['name'],
                'arabicName' => $s['arabic_name'],
                'totalVerses' => $s['total_verses'],
                'grade' => $s['grade'],
                'semester' => $s['semester'],
            ],
            array_keys(self::all()),
            array_values(self::all()),
        );
    }
}
