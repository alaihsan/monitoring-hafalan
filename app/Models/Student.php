<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use SoftDeletes;

    protected $table = 'students';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * 'id' is deliberately absent: primary keys are server-generated ULIDs, and
     * leaving it mass-assignable let a request overwrite an unrelated student.
     */
    protected $fillable = [
        'nis',
        'name',
        'gender',
        'class_id',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(ClassModel::class, 'class_id', 'id');
    }

    public function progress()
    {
        return $this->hasMany(HafalanProgress::class, 'student_id', 'id');
    }
}
