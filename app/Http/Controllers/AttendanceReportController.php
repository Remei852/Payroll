<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AttendanceReportController extends Controller
{
    public function index(Request $request)
    {
        $employees = Employee::whereNull('deleted_at')
            ->where('employment_status', 'ACTIVE')
            ->with('department')
            ->orderBy('last_name')
            ->get(['id', 'employee_code', 'first_name', 'last_name', 'department_id']);

        return Inertia::render('Attendance/Report', [
            'employees' => $employees,
        ]);
    }

    public function generate(Request $request)
    {
        $request->validate([
            'date_from'    => 'required|date',
            'date_to'      => 'required|date|after_or_equal:date_from',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer|exists:employees,id',
        ]);

        $dateFrom = Carbon::parse($request->date_from)->startOfDay();
        $dateTo   = Carbon::parse($request->date_to)->endOfDay();
        $employeeIds = $request->employee_ids ?? [];

        $query = Employee::whereNull('deleted_at')
            ->with(['department']);

        if (!empty($employeeIds)) {
            $query->whereIn('id', $employeeIds);
        }

        $employees = $query->orderBy('last_name')->get();

        $allEmployeeIds = $employees->pluck('id')->toArray();

        // Fetch all records in range for selected employees
        $records = AttendanceRecord::whereBetween('attendance_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->whereIn('employee_id', $allEmployeeIds)
            ->orderBy('attendance_date')
            ->get();

        $recordsByEmployee = $records->groupBy('employee_id');

        $reportData = [];

        foreach ($employees as $employee) {
            $empRecords = $recordsByEmployee->get($employee->id, collect());

            $rows = [];
            $totalLateMinutes      = 0;
            $totalAbsences         = 0;
            $totalMissingLogs      = 0;
            $totalLateDays         = 0;
            $totalUndertimeMinutes = 0;
            $totalOvertimeMinutes  = 0;
            $totalDaysWorked       = 0.0;

            foreach ($empRecords as $rec) {
                $status = $rec->status ?? '';
                $statusLower = strtolower($status);
                $isAbsent = str_contains($statusLower, 'absent') && !str_contains($statusLower, 'holiday');
                $isHalfDay = str_contains($statusLower, 'half day');
                $isLate   = $rec->total_late_minutes > 0 || str_contains(strtolower($status), 'late');

                if ($isAbsent) {
                    $totalAbsences++;
                } elseif ($isHalfDay) {
                    $totalAbsences += 0.5;
                }
                if ($isLate)   $totalLateDays++;
                $totalLateMinutes      += ($rec->total_late_minutes ?? 0);
                $totalMissingLogs      += ($rec->missed_logs_count ?? 0);
                $totalUndertimeMinutes += ($rec->undertime_minutes ?? 0);
                $totalOvertimeMinutes  += ($rec->overtime_minutes ?? 0);
                $totalDaysWorked       += (float) ($rec->rendered ?? 0);

                $rows[] = [
                    'date'              => $rec->attendance_date->format('Y-m-d'),
                    'time_in_am'        => $rec->time_in_am ?? null,
                    'time_out_lunch'    => $rec->time_out_lunch ?? null,
                    'time_in_pm'        => $rec->time_in_pm ?? null,
                    'time_out_pm'       => $rec->time_out_pm ?? null,
                    'missed_logs'       => $rec->missed_logs_count ?? 0,
                    'late_minutes_am'   => $rec->late_minutes_am ?? 0,
                    'late_minutes_pm'   => $rec->late_minutes_pm ?? 0,
                    'late_minutes'      => $rec->total_late_minutes ?? 0,
                    'undertime_minutes' => $rec->undertime_minutes ?? 0,
                    'overtime_minutes'  => $rec->overtime_minutes ?? 0,
                    'status'            => $status,
                    'rendered'          => $rec->rendered,
                ];
            }

            $reportData[] = [
                'employee' => [
                    'id'            => $employee->id,
                    'employee_code' => $employee->employee_code,
                    'first_name'    => $employee->first_name,
                    'last_name'     => $employee->last_name,
                    'department'    => $employee->department?->name,
                ],
                'rows'                   => $rows,
                'total_days_worked'      => round($totalDaysWorked, 2),
                'total_late_minutes'     => $totalLateMinutes,
                'total_absences'         => $totalAbsences,
                'total_late_days'        => $totalLateDays,
                'total_missing_logs'     => $totalMissingLogs,
                'total_undertime_minutes'=> $totalUndertimeMinutes,
                'total_overtime_minutes' => $totalOvertimeMinutes,
            ];
        }

        return Inertia::render('Attendance/PrintReport', [
            'reportData' => $reportData,
            'dateFrom'   => $dateFrom->format('Y-m-d'),
            'dateTo'     => $dateTo->format('Y-m-d'),
        ]);
    }
}
