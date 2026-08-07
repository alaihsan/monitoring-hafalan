<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'actor_name',
        'logged_at',
        'student_name',
        'student_nis',
        'class_name',
        'class_id',
        'surah_name',
        'verse_num',
        'action',
        'action_label',
    ];

    protected function casts(): array
    {
        return [
            'logged_at' => 'datetime',
        ];
    }

    /**
     * The account that performed the action. Nullable so an entry survives the
     * deletion of the user who made it.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
