<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'work_start_time',
        'work_end_time',
        'break_start_time',
        'break_end_time',
        'grace_period_minutes',
        'grace_period_enabled',
        'undertime_allowance_minutes',
        'undertime_enabled',
        'monthly_late_allowance_minutes',
        'is_working_day',
        'half_day_hours',
        'department_id',
    ];

    protected $casts = [
        'is_working_day'                  => 'boolean',
        'grace_period_enabled'            => 'boolean',
        'undertime_enabled'               => 'boolean',
        'grace_period_minutes'            => 'integer',
        'undertime_allowance_minutes'     => 'integer',
        'monthly_late_allowance_minutes'  => 'integer',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
