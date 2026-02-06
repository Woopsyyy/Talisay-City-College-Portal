<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'full_name',
        'email',
        'password',
        'role',
        'roles',
        'sub_role',
        'school_id',
        'image_path',
        'gender',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'roles' => 'array',
        ];
    }

    public function assignments()
    {
        return $this->hasMany(UserAssignment::class);
    }

    public function teacher_assignments()
    {
        return $this->hasMany(TeacherAssignment::class, 'teacher_id');
    }

    public function grades()
    {
        return $this->hasMany(Grade::class, 'student_id');
    }

    public function attendance_logs()
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function evaluations()
    {
        return $this->hasMany(TeacherEvaluation::class, 'teacher_id');
    }

    public function given_evaluations()
    {
        return $this->hasMany(TeacherEvaluation::class, 'student_id');
    }

    public function announcements()
    {
        return $this->hasMany(Announcement::class, 'author_id');
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'teacher_id');
    }
}
