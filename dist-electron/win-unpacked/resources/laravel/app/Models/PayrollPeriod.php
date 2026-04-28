<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'start_date',
        'end_date',
        'payroll_date',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'payroll_date' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }

    public function cashAdvances()
    {
        return $this->hasMany(CashAdvance::class);
    }

    /**
     * Scope for open periods
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'OPEN');
    }

    /**
     * Scope for closed periods
     */
    public function scopeClosed($query)
    {
        return $query->where('status', 'CLOSED');
    }
}
