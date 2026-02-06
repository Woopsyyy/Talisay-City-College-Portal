<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_assignment_id',
        'day_of_week',
        'start_time',
        'end_time',
        'room_id',
    ];

    public function teacher_assignment()
    {
        return $this->belongsTo(TeacherAssignment::class);
    }

    public function attendance_logs()
    {
        return $this->hasMany(AttendanceLog::class);
    }
}
