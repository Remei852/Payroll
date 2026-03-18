<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AttendanceViolation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'violation_date',
        'violation_type',
        'details',
        'severity',
        'status',
        'metadata',
        'notes',
        'dismissed_at',
        'dismissed_by',
    ];

    protected $casts = [
        'violation_date' => 'date',
        'metadata' => 'array',
        'dismissed_at' => 'datetime',
    ];

    /**
     * Get the employee that owns the violation.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who dismissed the violation.
     */
    public function dismissedBy()
    {
        return $this->belongsTo(User::class, 'dismissed_by');
    }

    /**
     * Scope a query to filter by violation type.
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('violation_type', $type);
    }

    /**
     * Scope a query to filter by severity level.
     */
    public function scopeBySeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope a query to filter by status.
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to filter by date range.
     */
    public function scopeDateRange(Builder $query, Carbon $start, Carbon $end): Builder
    {
        return $query->whereBetween('violation_date', [$start, $end]);
    }

    /**
     * Scope a query to search by employee name or violation details.
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->whereHas('employee', function ($employeeQuery) use ($search) {
                $employeeQuery->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            })->orWhere('details', 'like', "%{$search}%");
        });
    }

    /**
     * Scope a query to exclude dismissed violations.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('dismissed_at');
    }

    /**
     * Scope a query to include only dismissed violations.
     */
    public function scopeDismissed(Builder $query): Builder
    {
        return $query->whereNotNull('dismissed_at');
    }

    /**
     * Dismiss the violation by setting dismissed_at and dismissed_by.
     */
    public function dismiss(int $userId): bool
    {
        $this->dismissed_at = now();
        $this->dismissed_by = $userId;
        return $this->save();
    }
}
