<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class CashAdvance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'amount',
        'reason',
        'status',
        'created_by',
        'deducted_at',
        'payroll_period_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'deducted_at' => 'datetime',
    ];

    /**
     * Get the employee that received the cash advance
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who created the cash advance
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the payroll period when the deduction was applied
     */
    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    /**
     * Scope: Get only active cash advances
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'Active');
    }

    /**
     * Scope: Get only deducted cash advances
     */
    public function scopeDeducted(Builder $query): Builder
    {
        return $query->where('status', 'Deducted');
    }

    /**
     * Scope: Get only completed cash advances
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'Completed');
    }

    /**
     * Scope: Filter by employee ID
     */
    public function scopeByEmployee(Builder $query, $employeeId): Builder
    {
        return $query->where('employee_id', $employeeId);
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus(Builder $query, $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Check if the cash advance can be deducted
     */
    public function isDeductible(): bool
    {
        return $this->status === 'Active';
    }

    /**
     * Get the remaining balance of the cash advance
     */
    public function getRemainingBalance(): float
    {
        return (float) $this->amount;
    }
}
