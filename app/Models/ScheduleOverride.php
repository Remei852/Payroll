<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'override_date',
        'department_id',
        'employee_id',
        'schedule_id',
        'override_type',
        'reason',
        'opening_time',
        'closing_time',
        'is_paid',
        'is_recurring',
    ];

    protected $casts = [
        'override_date' => 'date',
        'is_paid' => 'boolean',
        'is_recurring' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'schedule_override_employees');
    }

    public function schedule()
    {
        return $this->belongsTo(WorkSchedule::class);
    }

    // Scopes
    public function scopeUpcoming($query)
    {
        return $query->where('override_date', '>=', now()->toDateString())
            ->orderBy('override_date', 'asc');
    }

    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('override_type', $type);
    }

    public function scopeHolidays($query)
    {
        return $query->whereIn('override_type', ['regular_holiday', 'special_holiday', 'company_holiday']);
    }

    public function scopeScheduleChanges($query)
    {
        return $query->whereIn('override_type', ['no_work', 'special_schedule', 'sunday_work', 'half_day']);
    }

    public function isHoliday()
    {
        return in_array($this->override_type, ['regular_holiday', 'special_holiday', 'company_holiday']);
    }
}
