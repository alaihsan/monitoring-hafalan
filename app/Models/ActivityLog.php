<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $fillable = [
        'timestamp_str',
        'student_name',
        'student_nisn',
        'class_name',
        'surah_name',
        'verse_num',
        'action',
        'action_label',
    ];
}
