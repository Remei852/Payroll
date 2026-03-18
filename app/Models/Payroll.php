<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'gross_pay',
        'total_earnings',
        'total_deductions',
        'net_pay',
        'status',
        'generated_at',
    ];

    protected $casts = [
        'gross_pay' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_pay' => 'decimal:2',
        'generated_at' => 'datetime',
    ];

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    /**
     * Get earnings items
     */
    public function earnings()
    {
        return $this->items()->where('type', 'EARNING');
    }

    /**
     * Get deduction items
     */
    public function deductions()
    {
        return $this->items()->where('type', 'DEDUCTION');
    }
}
