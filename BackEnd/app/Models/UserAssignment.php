<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'section_id',
        'assignment_type',
        'status',
        'year_level',
        'section',
        'department',
        'major',
        'payment',
        'amount_lacking',
        'sanctions',
        'sanction_reason',
        'semester',
        'student_status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function section_ref()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }
}
