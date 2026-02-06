<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    use HasFactory;

    protected $fillable = [
        'building_name',
        'num_floors',
        'rooms_per_floor',
        'description',
    ];

    public function assignments()
    {
        return $this->hasMany(SectionAssignment::class);
    }
}
