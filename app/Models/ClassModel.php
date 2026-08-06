<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassModel extends Model
{
    protected $table = 'classes';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'grade',
        'section',
        'wali_kelas',
        'share_token',
    ];

    public function students()
    {
        return $this->hasMany(Student::class, 'class_id', 'id');
    }
}
