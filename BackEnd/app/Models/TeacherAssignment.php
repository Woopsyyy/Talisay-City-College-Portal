<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'subject_id',
        'section_id',
        'section',
        'school_year',
        'semester',
        'status',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function section_ref()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
