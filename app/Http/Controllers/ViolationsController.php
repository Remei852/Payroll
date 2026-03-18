<?php

namespace App\Http\Controllers;

use App\Models\AttendanceViolation;
use App\Models\Department;
use App\Models\DepartmentGracePeriodSettings;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ViolationsController extends Controller
{
    /**
     * Display violations list with filters.
     * By default, excludes dismissed violations.
     * Optional 'show_dismissed' filter to include dismissed violations.
     */
    public function index(Request $request): Response
    {
        // Start with base query
        $query = AttendanceViolation::query();

        // Apply scopeActive by default to exclude dismissed violations
        // Unless show_dismissed filter is explicitly set to true
        if (!$request->boolean('show_dismissed')) {
            $query->active();
        }

        // Apply filters
        if ($request->filled('employee_name')) {
            $query->search($request->input('employee_name'));
        }

        if ($request->filled('violation_type')) {
            $query->byType($request->input('violation_type'));
        }

        if ($request->filled('severity')) {
            $query->bySeverity($request->input('severity'));
        }

        if ($request->filled('status')) {
            $query->byStatus($request->input('status'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'));
            $endDate = Carbon::parse($request->input('end_date'));
            $query->dateRange($startDate, $endDate);
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->input('department_id'));
            });
        }

        // Eager load employee relationship
        $query->with('employee.department');

        // Sort by violation_date DESC by default
        $query->orderBy('violation_date', 'desc');

        // Paginate results (25 per page)
        $violations = $query->paginate(25)->withQueryString();

        // Get departments for filter dropdown
        $departments = Department::orderBy('name')->get(['id', 'name']);

        // Prepare filter data
        $filters = [
            'employee_name' => $request->input('employee_name'),
            'violation_type' => $request->input('violation_type'),
            'severity' => $request->input('severity'),
            'status' => $request->input('status'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'department_id' => $request->input('department_id'),
            'show_dismissed' => $request->boolean('show_dismissed'),
        ];

        return Inertia::render('Violations/Index', [
            'violations' => $violations,
            'filters' => $filters,
            'departments' => $departments,
        ]);
    }

    /**
     * Get violation details.
     */
    public function show(int $id): Response
    {
        $violation = AttendanceViolation::with('employee.department', 'dismissedBy')
            ->findOrFail($id);

        return Inertia::render('Violations/Show', [
            'violation' => $violation,
        ]);
    }

    /**
     * Update violation status.
     */
    public function updateStatus(Request $request, int $id): RedirectResponse
    {
        $request->validate([
            'status' => ['required', Rule::in(['Pending', 'Reviewed', 'Letter Sent'])],
        ]);

        try {
            $violation = AttendanceViolation::findOrFail($id);
            $violation->status = $request->input('status');
            $violation->save();

            return redirect()->back()->with('success', 'Violation status updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update violation status: ' . $e->getMessage());
        }
    }

    /**
     * Update violation notes.
     */
    public function updateNotes(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $violation = AttendanceViolation::findOrFail($id);
            $violation->notes = $request->input('notes');
            $violation->save();

            return response()->json([
                'success' => true,
                'message' => 'Notes updated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update notes: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dismiss a violation.
     */
    public function dismissViolation(Request $request, int $id): JsonResponse
    {
        try {
            $violation = AttendanceViolation::findOrFail($id);
            $violation->dismiss(auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'Violation dismissed successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to dismiss violation: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export violations to CSV.
     */
    public function export(Request $request): BinaryFileResponse
    {
        // Start with base query
        $query = AttendanceViolation::query();

        // Apply scopeActive by default to exclude dismissed violations
        if (!$request->boolean('show_dismissed')) {
            $query->active();
        }

        // Apply same filters as index()
        if ($request->filled('employee_name')) {
            $query->search($request->input('employee_name'));
        }

        if ($request->filled('violation_type')) {
            $query->byType($request->input('violation_type'));
        }

        if ($request->filled('severity')) {
            $query->bySeverity($request->input('severity'));
        }

        if ($request->filled('status')) {
            $query->byStatus($request->input('status'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'));
            $endDate = Carbon::parse($request->input('end_date'));
            $query->dateRange($startDate, $endDate);
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->input('department_id'));
            });
        }

        // Eager load employee relationship
        $query->with('employee');

        // Sort by violation_date DESC
        $query->orderBy('violation_date', 'desc');

        // Get all violations (no pagination for export)
        $violations = $query->get();

        // Generate CSV
        $filename = 'violations_' . now()->format('Y-m-d_His') . '.csv';
        $handle = fopen('php://temp', 'r+');

        // Write CSV headers
        fputcsv($handle, [
            'Employee Name',
            'Employee ID',
            'Violation Date',
            'Violation Type',
            'Severity',
            'Status',
            'Details',
            'Notes',
        ]);

        // Write CSV rows
        foreach ($violations as $violation) {
            fputcsv($handle, [
                $violation->employee->first_name . ' ' . $violation->employee->last_name,
                $violation->employee->employee_code,
                $violation->violation_date->format('Y-m-d'),
                $violation->violation_type,
                $violation->severity,
                $violation->status,
                $violation->details,
                $violation->notes ?? '',
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return ResponseFacade::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get printable violation notice.
     */
    public function print(int $id): Response
    {
        $violation = AttendanceViolation::with('employee.department')
            ->findOrFail($id);

        return Inertia::render('Violations/Print', [
            'violations' => [$violation],
        ]);
    }

    /**
     * Bulk print multiple violations.
     */
    public function bulkPrint(Request $request): Response
    {
        $request->validate([
            'violation_ids' => ['required', 'array'],
            'violation_ids.*' => ['required', 'integer', 'exists:attendance_violations,id'],
        ]);

        $violations = AttendanceViolation::with('employee.department')
            ->whereIn('id', $request->input('violation_ids'))
            ->get();

        return Inertia::render('Violations/Print', [
            'violations' => $violations,
        ]);
    }

    /**
     * Get grace period settings for a department.
     */
    public function getGracePeriodSettings(int $departmentId): JsonResponse
    {
        $settings = DepartmentGracePeriodSettings::where('department_id', $departmentId)->first();

        // Return settings or defaults
        if ($settings) {
            return response()->json($settings);
        }

        return response()->json([
            'department_id' => $departmentId,
            'cumulative_tracking_enabled' => DepartmentGracePeriodSettings::DEFAULT_CUMULATIVE_ENABLED,
            'grace_period_limit_minutes' => DepartmentGracePeriodSettings::DEFAULT_GRACE_PERIOD_MINUTES,
            'tracking_period' => DepartmentGracePeriodSettings::DEFAULT_TRACKING_PERIOD,
            'pay_period_start_day' => null,
            'pay_period_frequency' => null,
        ]);
    }

    /**
     * Update grace period settings for a department.
     */
    public function updateGracePeriodSettings(Request $request, int $departmentId): JsonResponse
    {
        $request->validate([
            'cumulative_tracking_enabled' => ['required', 'boolean'],
            'grace_period_limit_minutes' => ['required', 'integer', 'min:1', 'max:480'],
            'tracking_period' => ['required', Rule::in(['monthly', 'pay_period', 'rolling_30'])],
            'pay_period_start_day' => ['nullable', 'integer', 'min:1', 'max:31'],
            'pay_period_frequency' => ['nullable', Rule::in(['weekly', 'bi-weekly', 'semi-monthly', 'monthly'])],
        ]);

        try {
            $settings = DepartmentGracePeriodSettings::updateOrCreate(
                ['department_id' => $departmentId],
                [
                    'cumulative_tracking_enabled' => $request->input('cumulative_tracking_enabled'),
                    'grace_period_limit_minutes' => $request->input('grace_period_limit_minutes'),
                    'tracking_period' => $request->input('tracking_period'),
                    'pay_period_start_day' => $request->input('pay_period_start_day'),
                    'pay_period_frequency' => $request->input('pay_period_frequency'),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Grace period settings updated successfully.',
                'settings' => $settings,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update grace period settings: ' . $e->getMessage(),
            ], 500);
        }
    }
}
