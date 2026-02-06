<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampusProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'status',
        'budget',
        'start_date',
        'description',
    ];
}
