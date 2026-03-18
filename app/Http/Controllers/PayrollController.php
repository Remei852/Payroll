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
            ->orderBy('start_date', 'desc')
            ->paginate(10);

        return Inertia::render('Payroll/Index', [
            'periods' => $periods,
        ]);
    }

    /**
     * Show payroll generation page
     */
    public function generate(): Response
    {
        $departments = Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Payroll/Generate', [
            'departments' => $departments,
        ]);
    }

    /**
     * Process payroll generation
     */
    public function processGeneration(Request $request): RedirectResponse
    {
        $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'payroll_date' => ['required', 'date'],
        ]);

        try {
            // Log the request
            \Log::info('Payroll Generation Started', [
                'department_id' => $request->department_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'payroll_date' => $request->payroll_date,
            ]);

            // Create payroll period
            $period = PayrollPeriod::create([
                'department_id' => $request->department_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'payroll_date' => $request->payroll_date,
                'status' => 'PROCESSING',
            ]);

            // Generate payroll
            $results = $this->payrollService->generatePayroll($period);

            // Update period status
            $period->update(['status' => 'OPEN']);

            // Log results
            \Log::info('Payroll Generation Completed', [
                'period_id' => $period->id,
                'success' => $results['success'],
                'failed' => $results['failed'],
                'errors' => $results['errors'],
                'warnings' => $results['warnings'] ?? [],
            ]);

            // Build message
            $message = "Payroll generated successfully. {$results['success']} employees processed";
            if ($results['failed'] > 0) {
                $message .= ", {$results['failed']} failed.";
            }

            // Add warnings if any
            if (!empty($results['warnings'])) {
                foreach ($results['warnings'] as $warning) {
                    if ($warning['type'] === 'ZERO_DAILY_RATE') {
                        $message .= "\n⚠️ WARNING: {$warning['message']}. Please update their daily rates in the Employees section.";
                    } elseif ($warning['type'] === 'NO_ATTENDANCE') {
                        $message .= "\n⚠️ WARNING: {$warning['message']}. Make sure attendance logs have been processed.";
                    }
                }
            }

            return redirect()->route('admin.payroll.period', $period->id)
                ->with('success', $message);
        } catch (\Exception $e) {
            \Log::error('Payroll Generation Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()
                ->with('error', 'Failed to generate payroll: ' . $e->getMessage());
        }
    }

    /**
     * Show payroll period details
     */
    public function showPeriod(int $id): Response
    {
        $period = PayrollPeriod::with(['department', 'payrolls.employee', 'payrolls.items'])
            ->findOrFail($id);

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
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $advance = $this->cashAdvanceService->createAdvance($employee, $validated, auth()->user());
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
