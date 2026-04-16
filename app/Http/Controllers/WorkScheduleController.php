<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\WorkSchedule;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WorkScheduleController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'grace_period_minutes' => 'nullable|integer|min:0|max:60',
            'monday' => 'nullable|array',
            'tuesday' => 'nullable|array',
            'wednesday' => 'nullable|array',
            'thursday' => 'nullable|array',
            'friday' => 'nullable|array',
            'saturday' => 'nullable|array',
            'sunday' => 'nullable|array',
        ]);

        WorkSchedule::create($validated);

        return back()->with('success', 'Work schedule created successfully');
    }

    public function update(Request $request, WorkSchedule $workSchedule)
    {
        $validated = $request->validate([
            'name'                        => 'required|string|max:255',
            'work_start_time'             => 'nullable|date_format:H:i',
            'work_end_time'               => 'nullable|date_format:H:i|after:work_start_time',
            'break_start_time'            => 'nullable|date_format:H:i',
            'break_end_time'              => 'nullable|date_format:H:i|after:break_start_time',
            'grace_period_enabled'        => 'boolean',
            'grace_period_minutes'        => 'nullable|integer|min:0|max:60',
            'undertime_allowance_minutes' => 'nullable|integer|min:0|max:60',
            'undertime_enabled'           => 'boolean',
            'monthly_late_allowance_minutes' => 'nullable|integer|min:0|max:480',
            'is_working_day'              => 'boolean',
        ]);

        $workSchedule->update($validated);

        // Reprocess all existing attendance records that used this schedule.
        // Only touches dates that already have records — does not create new ones.
        $this->reprocessAffectedAttendance($workSchedule);

        return back()->with('success', 'Schedule updated and attendance records recalculated.');
    }

    public function destroy(WorkSchedule $workSchedule)
    {
        $workSchedule->delete();

        return back()->with('success', 'Work schedule deleted successfully');
    }

    /**
     * Reprocess all attendance records that belong to this schedule's department.
     * Follows the same pattern as ScheduleOverrideController::reprocessAttendanceForDate().
     *
     * Strategy:
     *   1. Find every distinct date that has attendance records for this schedule.
     *   2. Delete those records.
     *   3. Re-run processLogsToRecords() for each date so computed fields
     *      (late, undertime, overtime, status) reflect the updated schedule.
     *
     * Safety: only dates that already have records are touched — no new records
     * are created for dates that were never processed.
     */
    private function reprocessAffectedAttendance(WorkSchedule $workSchedule): void
    {
        try {
            // Collect every distinct date that has a record using this schedule
            $dates = AttendanceRecord::where('schedule_id', $workSchedule->id)
                ->selectRaw('DISTINCT attendance_date')
                ->orderBy('attendance_date')
                ->pluck('attendance_date');

            if ($dates->isEmpty()) {
                return;
            }

            $attendanceService = app(AttendanceService::class);

            foreach ($dates as $rawDate) {
                $date = Carbon::parse($rawDate);
                $dateStr = $date->format('Y-m-d');

                // Delete existing records for this date that use this schedule
                AttendanceRecord::where('schedule_id', $workSchedule->id)
                    ->whereDate('attendance_date', $dateStr)
                    ->delete();

                // Reprocess the full date (all employees) so cross-department
                // records on the same date are not orphaned
                $attendanceService->processLogsToRecords($date, $date);

                Log::info('Reprocessed attendance after schedule update', [
                    'schedule_id'   => $workSchedule->id,
                    'department_id' => $workSchedule->department_id,
                    'date'          => $dateStr,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to reprocess attendance after schedule update', [
                'schedule_id' => $workSchedule->id,
                'error'       => $e->getMessage(),
            ]);
        }
    }
}
