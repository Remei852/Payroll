<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        // ── Employees ────────────────────────────────────────────────────────
        $totalEmployees = Employee::whereNull('deleted_at')->count();
        $activeEmployees = Employee::whereNull('deleted_at')
            ->where('employment_status', 'ACTIVE')->count();

        // ── Latest payroll period ─────────────────────────────────────────────
        $latestPeriod = PayrollPeriod::with('department')
            ->orderBy('start_date', 'desc')
            ->first();

        $openPeriods = PayrollPeriod::where('status', 'OPEN')->count();

        // ── Attendance stats for the latest processed period ──────────────────
        $dateFrom = $latestPeriod?->start_date ?? Carbon::now()->startOfMonth();
        $dateTo   = $latestPeriod?->end_date   ?? Carbon::now();

        $records = AttendanceRecord::whereBetween('attendance_date', [$dateFrom, $dateTo])->get();

        $totalRecords     = $records->count();
        $lateCount        = $records->filter(fn($r) => $r->total_late_minutes > 0)->count();
        $absentCount      = $records->filter(fn($r) => str_contains($r->status ?? '', 'Absent'))->count();
        $missedLogsCount  = $records->filter(fn($r) => $r->missed_logs_count > 0)->count();

        // ── Late by department ────────────────────────────────────────────────
        $lateByDept = AttendanceRecord::whereBetween('attendance_date', [$dateFrom, $dateTo])
            ->where('total_late_minutes', '>', 0)
            ->join('employees', 'attendance_records.employee_id', '=', 'employees.id')
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->select('departments.name as department', DB::raw('COUNT(*) as lates'))
            ->groupBy('departments.name')
            ->orderByDesc('lates')
            ->limit(8)
            ->get()
            ->map(fn($r) => ['department' => $r->department, 'lates' => (int) $r->lates]);

        // ── Attendance status distribution ────────────────────────────────────
        $statusGroups = [
            'Present'      => $records->filter(fn($r) => str_starts_with($r->status ?? '', 'Present'))->count(),
            'Late'         => $records->filter(fn($r) => str_contains($r->status ?? '', 'Late') && !str_contains($r->status ?? '', 'Absent'))->count(),
            'Absent'       => $absentCount,
            'Missed Log'   => $missedLogsCount,
        ];

        $attendanceDist = collect($statusGroups)
            ->filter(fn($v) => $v > 0)
            ->map(fn($v, $k) => ['name' => $k, 'value' => $v])
            ->values();

        // ── Recent payroll periods ────────────────────────────────────────────
        $recentPeriods = PayrollPeriod::with('department')
            ->withCount('payrolls')
            ->withSum('payrolls', 'net_pay')
            ->orderBy('start_date', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id'         => $p->id,
                'department' => $p->department?->name ?? '—',
                'start_date' => $p->start_date->format('M d'),
                'end_date'   => $p->end_date->format('M d, Y'),
                'net_pay'    => (float) ($p->payrolls_sum_net_pay ?? 0),
                'status'     => $p->status,
                'count'      => $p->payrolls_count,
            ]);

        return Inertia::render('Dashboard', [
            'stats' => [
                'total_employees'  => $totalEmployees,
                'active_employees' => $activeEmployees,
                'open_periods'     => $openPeriods,
                'late_count'       => $lateCount,
                'absent_count'     => $absentCount,
                'missed_logs'      => $missedLogsCount,
                'total_records'    => $totalRecords,
            ],
            'period' => $latestPeriod ? [
                'label'      => $latestPeriod->department?->name . ' · ' .
                                $latestPeriod->start_date->format('M d') . ' – ' .
                                $latestPeriod->end_date->format('M d, Y'),
                'status'     => $latestPeriod->status,
            ] : null,
            'lateByDept'    => $lateByDept,
            'attendanceDist' => $attendanceDist,
            'recentPeriods' => $recentPeriods,
            'dateRange'     => [
                'from' => Carbon::parse($dateFrom)->format('M d, Y'),
                'to'   => Carbon::parse($dateTo)->format('M d, Y'),
            ],
        ]);
    }
}
