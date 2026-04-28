<?php

namespace App\Http\Controllers;

use App\Models\AttendanceViolation;
use App\Models\Department;
use App\Models\DepartmentGracePeriodSettings;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ViolationsController extends Controller
{
    /**
     * Display violations list with filters.
     * Now queries AttendanceRecord grouped by employee so the table shows
     * per-employee summaries (absences, lates, missing logs) for the filtered period.
     */
    public function index(Request $request): Response
    {
        $request->validate([
            'search'        => 'nullable|string|max:100',
            'department_id' => 'nullable|integer',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date|after_or_equal:start_date',
            'status'        => 'nullable|string',   // attendance status filter (Absent, Late, etc.)
        ]);

        // ── Build attendance record query ──────────────────────────────────
        $query = \App\Models\AttendanceRecord::with('employee.department');

        if ($request->filled('start_date')) {
            $query->where('attendance_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->where('attendance_date', '<=', $request->input('end_date'));
        }
        if ($request->filled('department_id')) {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $request->input('department_id')));
        }
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->whereHas('employee', function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name',  'like', "%{$s}%")
                  ->orWhere('employee_code', 'like', "%{$s}%");
            });
        }
        // Only include records that have at least one issue
        $query->where(function ($q) {
            $q->where(function ($q2) {
                    $q2->where('status', 'like', '%Absent%')
                       ->where('status', 'not like', '%Holiday%');
                })
                ->orWhere('total_late_minutes', '>', 0)
                ->orWhere('missed_logs_count', '>', 0)
                ->orWhere('undertime_minutes', '>', 0);
        });

        // Optional: filter by attendance status keyword
        if ($request->filled('status')) {
            $query->where('status', 'like', '%' . $request->input('status') . '%');
        }

        $records = $query->orderBy('attendance_date')->get();

        // ── Group by employee ──────────────────────────────────────────────
        $grouped = $records->groupBy('employee_id');

        $summary = [];
        foreach ($grouped as $employeeId => $empRecords) {
            $employee = $empRecords->first()->employee;
            if (!$employee) continue;

            $absences      = $empRecords->filter(fn($r) => str_contains($r->status ?? '', 'Absent') && !str_contains($r->status ?? '', 'Holiday'))->count();
            $halfDays      = $empRecords->filter(fn($r) => str_contains($r->status ?? '', 'Half Day'))->count();
            $lateMinutes   = $empRecords->sum('total_late_minutes');
            $lateFrequency = $empRecords->filter(fn($r) => ($r->total_late_minutes ?? 0) > 0)->count();
            $missedLogs    = $empRecords->filter(fn($r) => ($r->missed_logs_count ?? 0) > 0 && !str_contains($r->status ?? '', 'Absent'))->count();
            $undertime     = $empRecords->sum('undertime_minutes');

            $summary[] = [
                'employee_id'             => $employee->id,
                'employee_code'           => $employee->employee_code,
                'employee_name'           => $employee->last_name . ', ' . $employee->first_name,
                'department'              => $employee->department->name ?? 'N/A',
                'total_absences'          => $absences + ($halfDays * 0.5),
                'total_late_minutes'      => $lateMinutes,
                'late_frequency'          => $lateFrequency,
                'total_missed_logs'       => $missedLogs,
                'total_undertime_minutes' => $undertime,
            ];
        }

        // Sort by name
        usort($summary, fn($a, $b) => strcmp($a['employee_name'], $b['employee_name']));

        // ── Summary card totals ────────────────────────────────────────────
        $totals = [
            'employees'    => count($summary),
            'absences'     => array_sum(array_column($summary, 'total_absences')),
            'late_days'    => array_sum(array_column($summary, 'late_frequency')),
            'missing_logs' => array_sum(array_column($summary, 'total_missed_logs')),
            'undertime'    => array_sum(array_column($summary, 'total_undertime_minutes')),
        ];

        $departments = Department::orderBy('name')->get(['id', 'name']);

        $filters = [
            'search'        => $request->input('search', ''),
            'department_id' => $request->input('department_id', ''),
            'start_date'    => $request->input('start_date', ''),
            'end_date'      => $request->input('end_date', ''),
            'status'        => $request->input('status', ''),
        ];

        // ── Multiple raw logs per day ──────────────────────────────────────
        // Find employee+date combinations with more than 4 biometric logs.
        // These are ambiguous and may need manual review.
        // Uses PostgreSQL-compatible syntax (STRING_AGG, CAST AS DATE, TO_CHAR).
        $logsQuery = \App\Models\AttendanceLog::query()
            ->select(
                'employee_code',
                DB::raw("CAST(log_datetime AS DATE) as log_date"),
                DB::raw("COUNT(*) as log_count"),
                DB::raw("STRING_AGG(TO_CHAR(log_datetime, 'HH24:MI:SS'), ',' ORDER BY log_datetime) as times"),
                DB::raw("STRING_AGG(log_type, ',' ORDER BY log_datetime) as types")
            )
            ->groupBy('employee_code', DB::raw("CAST(log_datetime AS DATE)"))
            ->havingRaw("COUNT(*) > 4")
            ->orderBy('log_date', 'desc');

        if ($request->filled('start_date')) {
            $logsQuery->whereRaw("CAST(log_datetime AS DATE) >= ?", [$request->input('start_date')]);
        }
        if ($request->filled('end_date')) {
            $logsQuery->whereRaw("CAST(log_datetime AS DATE) <= ?", [$request->input('end_date')]);
        }
        if ($request->filled('search')) {
            $logsQuery->where('employee_code', 'like', '%' . $request->input('search') . '%');
        }

        $rawMultiple = $logsQuery->get();

        // Enrich with employee name + department
        $employeeLookup = \App\Models\Employee::with('department')
            ->whereIn('employee_code', $rawMultiple->pluck('employee_code')->unique())
            ->get()
            ->keyBy('employee_code');

        if ($request->filled('department_id')) {
            $deptId = (int) $request->input('department_id');
            $employeeLookup = $employeeLookup->filter(fn($e) => $e->department_id === $deptId);
        }

        $multipleLogs = $rawMultiple
            ->filter(fn($row) => isset($employeeLookup[$row->employee_code]))
            ->groupBy('employee_code')
            ->map(function ($rows, $code) use ($employeeLookup) {
                $emp   = $employeeLookup[$code];
                $dates = $rows->map(function ($row) {
                    $times = explode(',', $row->times);
                    $types = explode(',', $row->types);
                    $logs  = array_map(fn($t, $tp) => ['time' => $t, 'type' => strtoupper($tp)], $times, $types);
                    return [
                        'log_date'  => $row->log_date,
                        'log_count' => (int) $row->log_count,
                        'logs'      => $logs,
                    ];
                })->sortByDesc('log_date')->values();

                return [
                    'employee_code' => $code,
                    'employee_name' => $emp->last_name . ', ' . $emp->first_name,
                    'department'    => $emp->department->name ?? 'N/A',
                    'employee_id'   => $emp->id,
                    'total_days'    => $dates->count(),
                    'total_logs'    => $dates->sum('log_count'),
                    'dates'         => $dates->values(),
                ];
            })
            ->sortBy('employee_name')
            ->values();

        return Inertia::render('Violations/Index', [
            'summary'      => $summary,
            'totals'       => $totals,
            'filters'      => $filters,
            'departments'  => $departments,
            'multipleLogs' => $multipleLogs,
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
