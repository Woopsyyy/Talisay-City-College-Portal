<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudyLoad extends Model
{
    use HasFactory;

    protected $table = 'study_load';

    protected $fillable = [
        'course',
        'major',
        'year_level',
        'section',
        'subject_code',
        'subject_title',
        'units',
        'semester',
        'teacher',
        'student_id',
        'subject_id',
        'section_id',
        'school_year',
        'enrollment_status',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject_ref()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }
}
