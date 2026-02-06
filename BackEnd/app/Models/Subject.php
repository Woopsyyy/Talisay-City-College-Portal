<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject_code',
        'subject_name',
        'description',
        'units',
        'title',
        'course',
        'major',
        'year_level',
        'semester',
    ];

    public function teacher_assignments()
    {
        return $this->hasMany(TeacherAssignment::class);
    }
}
