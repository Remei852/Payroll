<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\CashAdvance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollPeriod;
use App\Services\CashAdvanceService;
use App\Services\PayrollService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    protected PayrollService $payrollService;
    protected CashAdvanceService $cashAdvanceService;

    public function __construct(PayrollService $payrollService, CashAdvanceService $cashAdvanceService)
    {
        $this->payrollService = $payrollService;
        $this->cashAdvanceService = $cashAdvanceService;
    }

    /**
     * Display payroll dashboard
     */
    public function index(): Response
    {
        $periods = PayrollPeriod::with('department')
            ->withCount('payrolls')
            ->withSum('payrolls', 'net_pay')
            ->orderBy('start_date', 'desc')
            ->paginate(15);

        return Inertia::render('Payroll/Index', [
            'periods' => $periods,
        ]);
    }

    /**
     * Process payroll generation
     */
    public function processGeneration(Request $request): RedirectResponse|JsonResponse
    {
        $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'payroll_date' => ['required', 'date'],
        ]);

        // Check for overlapping payroll period for the same department
        $overlap = PayrollPeriod::where('department_id', $request->department_id)
            ->where(function ($q) use ($request) {
                $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                  ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                  ->orWhere(function ($q2) use ($request) {
                      $q2->where('start_date', '<=', $request->start_date)
                         ->where('end_date', '>=', $request->end_date);
                  });
            })->first();

        if ($overlap) {
            $msg = "A payroll period already exists for this department covering {$overlap->start_date->format('M d')}–{$overlap->end_date->format('M d, Y')}.";
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return redirect()->back()->withErrors(['overlap' => $msg]);
        }

        try {
            \Log::info('Payroll Generation Started', [
                'department_id' => $request->department_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'payroll_date' => $request->payroll_date,
            ]);

            $period = PayrollPeriod::create([
                'department_id' => $request->department_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'payroll_date' => $request->payroll_date,
                'status' => 'PROCESSING',
            ]);

            $results = $this->payrollService->generatePayroll($period);
            $period->update(['status' => 'OPEN']);

            \Log::info('Payroll Generation Completed', [
                'period_id' => $period->id,
                'success' => $results['success'],
                'failed' => $results['failed'],
            ]);

            $message = "Payroll generated successfully. {$results['success']} employees processed";
            if ($results['failed'] > 0) $message .= ", {$results['failed']} failed.";

            // If request wants JSON (from the attendance wizard), return period ID
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'success' => true,
                    'period_id' => $period->id,
                    'message' => $message,
                    'results' => $results,
                ]);
            }

            return redirect()->route('admin.payroll.period', $period->id)
                ->with('success', $message);
        } catch (\Exception $e) {
            \Log::error('Payroll Generation Failed', ['error' => $e->getMessage()]);

            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }

            return redirect()->back()->with('error', 'Failed to generate payroll: ' . $e->getMessage());
        }
    }

    /**
     * Bulk print payslips for a period (all or selected employees)
     */
    public function printPeriod(Request $request, int $id): Response
    {
        $period = PayrollPeriod::with(['department'])->findOrFail($id);

        // Optional: filter to specific payroll IDs
        $payrollIds = $request->filled('ids')
            ? explode(',', $request->get('ids'))
            : null;

        $query = Payroll::with(['employee.department', 'payrollPeriod', 'items'])
            ->where('payroll_period_id', $id);

        if ($payrollIds) {
            $query->whereIn('id', $payrollIds);
        }

        $payrolls = $query->get();

        // Attach attendance summary to each payroll
        $payrolls->each(function ($payroll) use ($period) {
            $records = AttendanceRecord::where('employee_id', $payroll->employee_id)
                ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
                ->get();

            $payroll->summary = [
                'days_worked'       => round($records->sum('rendered'), 2),
                'hours_worked'      => round($records->sum('rendered') * 8, 2),
                'overtime_hours'    => round($records->sum('overtime_minutes') / 60, 2),
                'late_minutes'      => $records->sum(fn($r) => $r->total_late_minutes ?? ($r->late_minutes_am + $r->late_minutes_pm)),
                'late_hours'        => round($records->sum(fn($r) => $r->total_late_minutes ?? ($r->late_minutes_am + $r->late_minutes_pm)) / 60, 2),
                'undertime_minutes' => $records->sum('undertime_minutes'),
                'undertime_hours'   => round($records->sum('undertime_minutes') / 60, 2),
                'daily_rate'        => $payroll->employee->daily_rate,
                'hourly_rate'       => round($payroll->employee->daily_rate / 8, 2),
            ];
        });

        return Inertia::render('Payroll/PrintPeriod', [
            'period'   => $period,
            'payrolls' => $payrolls,
        ]);
    }

    /**
     * Show payroll period details
     */
    public function showPeriod(int $id): Response
    {
        $period = PayrollPeriod::with([
            'department',
            'payrolls.employee.contributions.contributionType',
            'payrolls.employee.cashAdvances' => fn($q) => $q->where(function($q2) use ($id) {
                    $q2->where('status', 'Active')
                       ->whereNull('payroll_period_id');
                })->orWhere('payroll_period_id', $id)
                ->orderBy('created_at'),
            'payrolls.items',
        ])->findOrFail($id);

        // Attach attendance summary per employee
        $period->payrolls->each(function ($payroll) use ($period) {
            $records = \App\Models\AttendanceRecord::where('employee_id', $payroll->employee_id)
                ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
                ->get();

            $payroll->attendance_summary = [
                'days_worked'        => round($records->sum('rendered'), 2),
                'late_minutes'       => max(0, $records->sum(fn($r) => $r->total_late_minutes ?? ($r->late_minutes_am + $r->late_minutes_pm))),
                'undertime_minutes'  => max(0, $records->sum('undertime_minutes')),
                'overtime_minutes'   => max(0, $records->sum('overtime_minutes')),
            ];
        });

        return Inertia::render('Payroll/Period', [
            'period' => $period,
        ]);
    }

    /**
     * Show employee payslip
     */
    public function showPayslip(int $id): Response
    {
        $payroll = Payroll::with([
            'employee.department',
            'payrollPeriod',
            'items',
        ])->findOrFail($id);

        // Get attendance records to calculate summary
        $attendanceRecords = AttendanceRecord::where('employee_id', $payroll->employee_id)
            ->whereBetween('attendance_date', [$payroll->payrollPeriod->start_date, $payroll->payrollPeriod->end_date])
            ->get();

        // Calculate summary from attendance records
        $daysWorked = $attendanceRecords->sum('rendered');
        $totalLateMinutes = $attendanceRecords->sum(function($record) {
            return ($record->total_late_minutes ?? ($record->late_minutes_am + $record->late_minutes_pm));
        });
        $totalOvertimeMinutes = $attendanceRecords->sum('overtime_minutes');
        $totalUndertimeMinutes = $attendanceRecords->sum('undertime_minutes');

        // Calculate remaining cash advances balance
        $remainingBalance = $this->cashAdvanceService->getTotalRemainingBalance($payroll->employee);

        $summary = [
            'days_worked' => $daysWorked,
            'hours_worked' => round($daysWorked * 8, 2),
            'overtime_hours' => round($totalOvertimeMinutes / 60, 2),
            'late_minutes' => $totalLateMinutes,
            'late_hours' => round($totalLateMinutes / 60, 2),
            'undertime_minutes' => $totalUndertimeMinutes,
            'undertime_hours' => round($totalUndertimeMinutes / 60, 2),
            'daily_rate' => $payroll->employee->daily_rate,
            'hourly_rate' => round($payroll->employee->daily_rate / 8, 2),
        ];

        // Add cash advances remaining balance to employee data
        $payroll->employee->cash_advances_remaining_balance = $remainingBalance;

        return Inertia::render('Payroll/Payslip', [
            'payroll' => $payroll,
            'summary' => $summary,
        ]);
    }

    /**
     * Delete a payroll period (only OPEN periods can be deleted)
     */
    public function deletePeriod(int $id): RedirectResponse
    {
        $period = PayrollPeriod::findOrFail($id);

        if ($period->status === 'CLOSED') {
            return redirect()->back()->with('error', 'Finalized payroll periods cannot be deleted.');
        }

        // Manually delete children to avoid FK violations on PostgreSQL
        $payrollIds = $period->payrolls()->pluck('id');
        \App\Models\PayrollItem::whereIn('payroll_id', $payrollIds)->delete();
        $period->payrolls()->delete();
        // Detach cash advances from this period (don't delete them — they belong to the employee)
        \App\Models\CashAdvance::where('payroll_period_id', $id)->update([
            'payroll_period_id' => null,
            'status' => 'Active',
            'deducted_at' => null,
        ]);
        $period->delete();

        if (request()->expectsJson()) {
            return response()->json(['success' => true]);
        }

        return redirect()->route('admin.payroll.index')
            ->with('success', 'Payroll period deleted.');
    }

    /**
     * Finalize payroll period
     */
    public function finalizePeriod(int $id): RedirectResponse
    {
        try {
            $period = PayrollPeriod::findOrFail($id);
            $this->payrollService->finalizePeriod($period);

            return redirect()->back()
                ->with('success', 'Payroll period finalized successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to finalize period: ' . $e->getMessage());
        }
    }

    /**
     * Regenerate payroll for a specific employee
     */
    public function regenerateEmployee(Request $request, int $periodId, int $employeeId): RedirectResponse
    {
        try {
            $period = PayrollPeriod::findOrFail($periodId);
            $employee = Employee::findOrFail($employeeId);

            // Reset any advances that were deducted in this period so they get re-included
            \App\Models\CashAdvance::where('employee_id', $employeeId)
                ->where('payroll_period_id', $periodId)
                ->update([
                    'status' => 'Active',
                    'deducted_at' => null,
                    'payroll_period_id' => null,
                ]);

            $this->payrollService->generateEmployeePayroll($period, $employee);

            return redirect()->back()
                ->with('success', 'Payroll regenerated successfully for ' . $employee->first_name . ' ' . $employee->last_name);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to regenerate payroll: ' . $e->getMessage());
        }
    }

    /**
     * Get cash advances for selected employee
     */
    public function getEmployeeCashAdvances(Employee $employee): JsonResponse
    {
        $deductible = $this->cashAdvanceService->getDeductibleAdvances($employee);
        $remaining = $this->cashAdvanceService->getRemainingAdvances($employee);
        $totalRemaining = $this->cashAdvanceService->getTotalRemainingBalance($employee);

        return response()->json([
            'deductible' => $deductible,
            'remaining' => $remaining,
            'totalRemaining' => $totalRemaining,
        ]);
    }

    /**
     * Add cash advance to employee
     */
    public function addCashAdvance(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'release_date' => ['nullable', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
            'deduct_on' => ['nullable', 'date'],
            'apply_to_period_id' => ['nullable', 'exists:payroll_periods,id'],
        ]);

        try {
            $advance = $this->cashAdvanceService->createAdvance($employee, $validated, auth()->user());
            
            // Auto-apply to payroll if we are in a payroll period context
            if ($request->has('apply_to_period_id')) {
                $period = PayrollPeriod::find($request->apply_to_period_id);
                if ($period && $period->status === 'OPEN') {
                    // Check if date matches or is blank
                    $isMatchingDate = !$advance->deduct_on || 
                                     ($advance->deduct_on >= $period->start_date && $advance->deduct_on <= $period->end_date);
                    
                    if ($isMatchingDate) {
                        $payroll = Payroll::where('employee_id', $employee->id)
                            ->where('payroll_period_id', $period->id)
                            ->first();
                        
                        if ($payroll) {
                            $this->cashAdvanceService->applyDeduction($advance, $payroll);
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Cash advance added successfully',
                'data' => $advance,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove cash advance from employee
     */
    public function removeCashAdvance(CashAdvance $advance)
    {
        try {
            $this->cashAdvanceService->deleteAdvance($advance);
            return response()->json([
                'success' => true,
                'message' => 'Cash advance removed successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * Apply cash advance deduction to payroll
     */
    public function applyCashAdvanceDeduction(Request $request, Payroll $payroll): JsonResponse
    {
        $request->validate([
            'cash_advance_id' => ['required', 'exists:cash_advances,id'],
        ]);

        try {
            $advance = CashAdvance::findOrFail($request->cash_advance_id);
            $this->cashAdvanceService->applyDeduction($advance, $payroll);
            return response()->json(['success' => true, 'message' => 'Deduction applied successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
