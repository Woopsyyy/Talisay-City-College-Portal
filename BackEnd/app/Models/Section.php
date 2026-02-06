<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_name',
        'grade_level',
        'school_year',
        'course',
        'major',
    ];

    public function assignments()
    {
        return $this->hasMany(UserAssignment::class);
    }

    public function teacher_assignments()
    {
        return $this->hasMany(TeacherAssignment::class);
    }
}
