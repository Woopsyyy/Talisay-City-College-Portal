<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SectionAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'building_id',
        'floor_number',
        'room_number',
        'school_year',
        'status',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function building()
    {
        return $this->belongsTo(Building::class);
    }
}
