<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'holiday_date',
        'type',
        'rate_multiplier',
        'is_paid',
        'department_id',
        'is_recurring',
    ];

    protected $casts = [
        'holiday_date' => 'date',
        'rate_multiplier' => 'decimal:2',
        'is_paid' => 'boolean',
        'is_recurring' => 'boolean',
    ];

    // Scopes
    public function scopeUpcoming($query)
    {
        return $query->where('holiday_date', '>=', now()->toDateString())
            ->orderBy('holiday_date', 'asc');
    }

    public function scopeByYear($query, $year)
    {
        return $query->whereYear('holiday_date', $year);
    }

    public function scopeRegular($query)
    {
        return $query->where('type', 'Regular');
    }

    public function scopeSpecial($query)
    {
        return $query->where('type', 'Special');
    }

    // Relationships
    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
