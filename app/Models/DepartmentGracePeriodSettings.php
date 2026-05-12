<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentGracePeriodSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'cumulative_tracking_enabled',
        'daily_grace_minutes',
        'grace_period_limit_minutes',
        'tracking_period',
        'pay_period_start_day',
        'pay_period_frequency',
    ];

    protected $casts = [
        'cumulative_tracking_enabled' => 'boolean',
        'daily_grace_minutes' => 'integer',
        'grace_period_limit_minutes' => 'integer',
        'pay_period_start_day' => 'integer',
    ];

    // Default values
    public const DEFAULT_DAILY_GRACE_MINUTES = 15;
    public const DEFAULT_GRACE_PERIOD_MINUTES = 60;
    public const DEFAULT_TRACKING_PERIOD = 'monthly';
    public const DEFAULT_CUMULATIVE_ENABLED = false;

    /**
     * Get the department that owns the grace period settings.
     */
    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
