<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'attendance_date',
        'schedule_id',
        'time_in_am',
        'time_out_lunch',
        'time_in_pm',
        'time_out_pm',
        'late_minutes_am',
        'late_minutes_pm',
        'total_late_minutes',
        'overtime_minutes',
        'workday_rendered',
        'missed_logs_count',
        'status',
        'remarks',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'workday_rendered' => 'decimal:2',
        'missed_logs_count' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function schedule()
    {
        return $this->belongsTo(WorkSchedule::class, 'schedule_id');
    }
}
