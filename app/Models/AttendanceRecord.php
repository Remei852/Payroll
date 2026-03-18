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
        // total_late_minutes is a generated column (late_minutes_am + late_minutes_pm)
        // It's automatically calculated by the database, so it's not fillable
        'overtime_minutes',
        'undertime_minutes',
        'rendered',
        'missed_logs_count',
        'status',
        'remarks',
        'notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'rendered' => 'float',
        'missed_logs_count' => 'integer',
        'late_minutes_am' => 'integer',
        'late_minutes_pm' => 'integer',
        'overtime_minutes' => 'integer',
        'undertime_minutes' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function schedule()
    {
        return $this->belongsTo(WorkSchedule::class, 'schedule_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function changes()
    {
        return $this->hasMany(AttendanceRecordChange::class);
    }
}
