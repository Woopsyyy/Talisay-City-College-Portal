<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'year',
        'department',
        'major',
        'author_id',
        'target_role',
        'priority',
        'is_published',
        'published_at',
        'expires_at',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
