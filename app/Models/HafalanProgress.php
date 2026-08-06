<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HafalanProgress extends Model
{
    protected $table = 'hafalan_progress';

    protected $fillable = [
        'student_id',
        'surah_id',
        'verse_num',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id', 'id');
    }
}
