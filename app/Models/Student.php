<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $table = 'students';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nisn',
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
