<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_code',
        'log_datetime',
        'log_type',
        'location',
        'source_file',
    ];

    protected $casts = [
        'log_datetime' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_code', 'employee_code');
    }
}
