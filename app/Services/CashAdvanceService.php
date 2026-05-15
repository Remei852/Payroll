<?php

namespace App\Services;

use App\Models\CashAdvance;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Exception;

class CashAdvanceService
{
    /**
     * Create a new cash advance for an employee
     *
     * @param Employee $employee
     * @param array $data
     * @param User $admin
     * @return CashAdvance
     * @throws Exception
     */
    public function createAdvance(Employee $employee, array $data, User $admin): CashAdvance
    {
        if (!isset($data['amount']) || $data['amount'] <= 0) {
            throw new Exception('Amount must be a positive number');
        }

        $advance = $employee->cashAdvances()->create([
            'amount' => $data['amount'],
            'release_date' => $data['release_date'] ?? now()->toDateString(),
            'reason' => $data['reason'] ?? null,
            'deduct_on' => $data['deduct_on'] ?? null,
            'status' => 'Active',
            'created_by' => $admin->id,
        ]);

        return $advance;
    }

    /**
     * Delete a cash advance (only if not yet deducted)
     *
     * @param CashAdvance $advance
     * @return void
     * @throws Exception
     */
    public function deleteAdvance(CashAdvance $advance): void
    {
        if ($advance->status !== 'Active') {
            throw new Exception('Cannot delete an advance that has been deducted');
        }

        $advance->delete();
    }

    /**
     * Apply deduction to payroll
     *
     * @param CashAdvance $advance
     * @param Payroll $payroll
     * @return PayrollItem
     * @throws Exception
     */
    public function applyDeduction(CashAdvance $advance, Payroll $payroll): PayrollItem
    {
        if ($advance->status !== 'Active') {
            throw new Exception('Only active advances can be deducted');
        }

        // Create deduction item
        $item = PayrollItem::create([
            'payroll_id' => $payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => $advance->amount,
            'reference_id' => $advance->id,
        ]);

        // Update advance status
        $advance->update([
            'status' => 'Deducted',
            'deducted_at' => now(),
            'payroll_period_id' => $payroll->payroll_period_id,
        ]);

        // Recalculate payroll totals
        $this->recalculatePayrollTotals($payroll);

        return $item;
    }

    /**
     * Get active deductible advances for employee
     *
     * @param Employee $employee
     * @return Collection
     */
    public function getDeductibleAdvances(Employee $employee): Collection
    {
        return $employee->cashAdvances()
            ->active()
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Get remaining unpaid advances for employee
     *
     * @param Employee $employee
     * @return Collection
     */
    public function getRemainingAdvances(Employee $employee): Collection
    {
        return $employee->cashAdvances()
            ->with('payrollPeriod')
            ->whereIn('status', ['Active', 'Deducted'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Calculate total remaining balance for employee (only Active advances)
     *
     * @param Employee $employee
     * @return float
     */
    public function getTotalRemainingBalance(Employee $employee): float
    {
        return (float) $employee->cashAdvances()
            ->active()
            ->sum('amount');
    }

    /**
     * Recalculate payroll totals after deduction
     *
     * @param Payroll $payroll
     * @return void
     */
    private function recalculatePayrollTotals(Payroll $payroll): void
    {
        $earnings = $payroll->earnings()->sum('amount');
        $deductions = $payroll->deductions()->sum('amount');

        $payroll->update([
            'gross_pay' => $earnings,
            'total_earnings' => $earnings,
            'total_deductions' => $deductions,
            'net_pay' => $earnings - $deductions,
        ]);
    }
}
