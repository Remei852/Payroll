<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\ScheduleOverride;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SundayAuthorizationController extends Controller
{
    public function __construct(protected AttendanceService $service) {}

    // ── Shared validation ─────────────────────────────────────────────────────

    private function validateRequest(Request $request): array
    {
        return $request->validate([
            'reason'       => 'required|string|max:500',
            'opening_time' => 'nullable|date_format:H:i',
            'closing_time' => 'nullable|date_format:H:i|after:opening_time',
        ]);
    }

    /**
     * Check that a record is eligible for Sunday authorization:
     * - date is Sunday
     * - has at least one log
     * - no existing sunday_work override for this employee/date
     */
    private function assertEligible(AttendanceRecord $record): void
    {
        $date = $record->attendance_date;

        if ($date->dayOfWeek !== 0) {
            throw new \InvalidArgumentException('This record is not on a Sunday.');
        }

        $hasLogs = $record->time_in_am || $record->time_in_pm;
        if (!$hasLogs) {
            throw new \InvalidArgumentException('No attendance logs found for this record.');
        }

        $alreadyExists = ScheduleOverride::where('override_date', $date->format('Y-m-d'))
            ->where('override_type', 'sunday_work')
            ->where(function ($q) use ($record) {
                $q->where('employee_id', $record->employee_id)
                  ->orWhereHas('employees', fn($q2) => $q2->where('employees.id', $record->employee_id));
            })
            ->exists();

        if ($alreadyExists) {
            throw new \InvalidArgumentException('Sunday work is already authorized for this employee on this date.');
        }
    }

    /**
     * Create a sunday_work override for one employee on one date,
     * then reprocess attendance for that date.
     * Returns the updated AttendanceRecord.
     */
    private function authorizeOne(
        AttendanceRecord $record,
        string $reason,
        ?string $openingTime,
        ?string $closingTime
    ): AttendanceRecord {
        $employee = $record->employee()->with('department')->first();
        $date     = $record->attendance_date->format('Y-m-d');

        DB::transaction(function () use ($employee, $date, $reason, $openingTime, $closingTime) {
            ScheduleOverride::create([
                'override_date' => $date,
                'department_id' => $employee->department_id,
                'employee_id'   => $employee->id,
                'override_type' => 'sunday_work',
                'reason'        => $reason,
                'opening_time'  => $openingTime,
                'closing_time'  => $closingTime,
                'is_paid'       => true,
                'is_recurring'  => false,
            ]);

            // Delete the existing record so reprocessing creates a fresh one
            AttendanceRecord::where('employee_id', $employee->id)
                ->whereDate('attendance_date', $date)
                ->delete();

            // Reprocess just this employee on this date
            $this->service->processLogsToRecords(
                Carbon::parse($date),
                Carbon::parse($date)
            );
        });

        return AttendanceRecord::where('employee_id', $employee->id)
            ->whereDate('attendance_date', $date)
            ->firstOrFail();
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    /**
     * POST /api/attendance/records/{record}/authorize-sunday
     * Authorize a single Sunday record.
     */
    public function authorizeSingle(Request $request, AttendanceRecord $record)
    {
        $validated = $this->validateRequest($request);

        try {
            $this->assertEligible($record);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        try {
            $updated = $this->authorizeOne(
                $record,
                $validated['reason'],
                $validated['opening_time'] ?? null,
                $validated['closing_time'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Sunday work authorized and attendance recomputed.',
                'record'  => $updated,
            ]);
        } catch (\Exception $e) {
            Log::error('Sunday authorization failed', [
                'record_id' => $record->id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/attendance/employees/{employee}/authorize-sundays
     * Bulk authorize all eligible Sunday records for one employee.
     */
    public function authorizeForEmployee(Request $request, Employee $employee)
    {
        $validated = $this->validateRequest($request);

        // Find all eligible Sunday records for this employee
        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->get()
            ->filter(function (AttendanceRecord $r) {
                if ($r->attendance_date->dayOfWeek !== 0) return false;
                if (!$r->time_in_am && !$r->time_in_pm)  return false;
                $s = strtolower($r->status ?? '');
                return str_contains($s, 'unauthorized');
            });

        if ($records->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'No eligible Sunday records found.',
                'authorized' => 0,
                'records' => [],
            ]);
        }

        $authorized = [];
        $errors     = [];

        foreach ($records as $record) {
            try {
                $this->assertEligible($record);
                $updated = $this->authorizeOne(
                    $record,
                    $validated['reason'],
                    $validated['opening_time'] ?? null,
                    $validated['closing_time'] ?? null
                );
                $authorized[] = $updated;
            } catch (\Exception $e) {
                $errors[] = [
                    'date'  => $record->attendance_date->format('Y-m-d'),
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => count($authorized) . ' Sunday record(s) authorized.',
            'authorized' => count($authorized),
            'records'    => $authorized,
            'errors'     => $errors,
        ]);
    }

    /**
     * POST /api/attendance/authorize-sundays
     * Bulk authorize all eligible Sunday records across the current view.
     * Accepts optional employee_ids and date range filters.
     */
    public function authorizeBulk(Request $request)
    {
        $validated = $this->validateRequest($request);

        $request->validate([
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer|exists:employees,id',
            'date_from'    => 'nullable|date',
            'date_to'      => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = AttendanceRecord::query();

        if ($request->filled('employee_ids')) {
            $query->whereIn('employee_id', $request->employee_ids);
        }
        if ($request->filled('date_from')) {
            $query->where('attendance_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('attendance_date', '<=', $request->date_to);
        }

        $records = $query->get()->filter(function (AttendanceRecord $r) {
            if ($r->attendance_date->dayOfWeek !== 0) return false;
            if (!$r->time_in_am && !$r->time_in_pm)  return false;
            $s = strtolower($r->status ?? '');
            return str_contains($s, 'unauthorized');
        });

        if ($records->isEmpty()) {
            return response()->json([
                'success'    => true,
                'message'    => 'No eligible Sunday records found.',
                'authorized' => 0,
                'records'    => [],
            ]);
        }

        $authorized = [];
        $errors     = [];

        foreach ($records as $record) {
            try {
                $this->assertEligible($record);
                $updated = $this->authorizeOne(
                    $record,
                    $validated['reason'],
                    $validated['opening_time'] ?? null,
                    $validated['closing_time'] ?? null
                );
                $authorized[] = $updated;
            } catch (\Exception $e) {
                $errors[] = [
                    'employee_id' => $record->employee_id,
                    'date'        => $record->attendance_date->format('Y-m-d'),
                    'error'       => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => count($authorized) . ' Sunday record(s) authorized.',
            'authorized' => count($authorized),
            'records'    => $authorized,
            'errors'     => $errors,
        ]);
    }
}
