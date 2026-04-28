<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceValidationLog extends Model
{
    protected $fillable = [
        'attendance_record_id',
        'validation_result',
        'issues',
        'passed',
        'validated_at',
        'validated_by',
    ];

    protected $casts = [
        'validation_result' => 'array',
        'issues' => 'array',
        'passed' => 'boolean',
        'validated_at' => 'datetime',
    ];

    /**
     * Get the attendance record this log belongs to.
     */
    public function attendanceRecord(): BelongsTo
    {
        return $this->belongsTo(AttendanceRecord::class);
    }

    /**
     * Get the user who validated this record.
     */
    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
