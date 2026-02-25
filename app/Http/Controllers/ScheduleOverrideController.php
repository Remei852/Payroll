<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\ScheduleOverride;
use App\Models\WorkSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleOverrideController extends Controller
{
    public function index(Request $request)
    {
        $departmentId = $request->get('department_id');
        
        $query = ScheduleOverride::with(['department', 'schedule'])
            ->orderBy('override_date', 'desc');

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        $overrides = $query->get();
        $departments = Department::orderBy('name')->get();
        $schedules = WorkSchedule::orderBy('name')->get();

        return Inertia::render('Settings/ScheduleOverrides', [
            'overrides' => $overrides,
            'departments' => $departments,
            'schedules' => $schedules,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'override_date' => 'required|date',
            'department_id' => 'nullable|exists:departments,id',
            'employee_id' => 'nullable|exists:employees,id',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'exists:employees,id',
            'schedule_id' => 'nullable|exists:work_schedules,id',
            'override_type' => 'required|in:no_work,special_schedule,sunday_work,half_day,regular_holiday,special_holiday,company_holiday',
            'reason' => 'required|string|max:500',
            'opening_time' => 'nullable|date_format:H:i',
            'closing_time' => 'nullable|date_format:H:i',
            'is_paid' => 'boolean',
            'is_recurring' => 'boolean',
        ]);

        // Set defaults for holidays
        if (in_array($validated['override_type'], ['regular_holiday', 'special_holiday', 'company_holiday'])) {
            $validated['is_paid'] = $validated['is_paid'] ?? true;
        }

        // Extract employee_ids before creating
        $employeeIds = $validated['employee_ids'] ?? [];
        unset($validated['employee_ids']);
        
        // Store the override date for reprocessing
        $overrideDate = $validated['override_date'];

        // If department_id is null, create overrides for ALL departments
        if (empty($validated['department_id'])) {
            $departments = Department::all();
            
            foreach ($departments as $department) {
                $overrideData = $validated;
                $overrideData['department_id'] = $department->id;
                
                $override = ScheduleOverride::create($overrideData);
                
                // Attach multiple employees if provided
                if (!empty($employeeIds)) {
                    $override->employees()->attach($employeeIds);
                }
            }
            
            // Automatically reprocess attendance for this date
            $this->reprocessAttendanceForDate($overrideDate);
            
            return back()->with('success', 'Schedule override added for all departments and attendance reprocessed successfully');
        }

        // Single department override
        $override = ScheduleOverride::create($validated);

        // Attach multiple employees if provided
        if (!empty($employeeIds)) {
            $override->employees()->attach($employeeIds);
        }
        
        // Automatically reprocess attendance for this date
        $this->reprocessAttendanceForDate($overrideDate);

        return back()->with('success', 'Schedule override added and attendance reprocessed successfully');
    }

    public function update(Request $request, ScheduleOverride $scheduleOverride)
    {
        $validated = $request->validate([
            'override_date' => 'required|date',
            'department_id' => 'nullable|exists:departments,id',
            'employee_id' => 'nullable|exists:employees,id',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'exists:employees,id',
            'schedule_id' => 'nullable|exists:work_schedules,id',
            'override_type' => 'required|in:no_work,special_schedule,sunday_work,half_day,regular_holiday,special_holiday,company_holiday',
            'reason' => 'required|string|max:500',
            'opening_time' => 'nullable|date_format:H:i',
            'closing_time' => 'nullable|date_format:H:i',
            'is_paid' => 'boolean',
            'is_recurring' => 'boolean',
        ]);

        // Set defaults for holidays
        if (in_array($validated['override_type'], ['regular_holiday', 'special_holiday', 'company_holiday'])) {
            $validated['is_paid'] = $validated['is_paid'] ?? true;
        }

        // Extract employee_ids before updating
        $employeeIds = $validated['employee_ids'] ?? [];
        unset($validated['employee_ids']);
        
        // Store both old and new dates for reprocessing
        $oldDate = $scheduleOverride->override_date;
        $newDate = $validated['override_date'];

        $scheduleOverride->update($validated);

        // Sync multiple employees if provided
        if (!empty($employeeIds)) {
            $scheduleOverride->employees()->sync($employeeIds);
        } else {
            $scheduleOverride->employees()->detach();
        }
        
        // Reprocess both old and new dates (in case date was changed)
        $this->reprocessAttendanceForDate($oldDate);
        if ($oldDate !== $newDate) {
            $this->reprocessAttendanceForDate($newDate);
        }

        return back()->with('success', 'Schedule override updated and attendance reprocessed successfully');
    }

    public function destroy(ScheduleOverride $scheduleOverride)
    {
        // Store the date before deleting
        $overrideDate = $scheduleOverride->override_date;
        
        $scheduleOverride->delete();
        
        // Reprocess attendance for this date (to remove override effects)
        $this->reprocessAttendanceForDate($overrideDate);

        return back()->with('success', 'Schedule override deleted and attendance reprocessed successfully');
    }
    
    /**
     * Automatically reprocess attendance for a specific date
     * This ensures overrides are immediately applied
     */
    private function reprocessAttendanceForDate($date)
    {
        try {
            $attendanceService = app(\App\Services\AttendanceService::class);
            $carbonDate = \Carbon\Carbon::parse($date);
            
            // Delete existing records for this date
            \App\Models\AttendanceRecord::whereDate('attendance_date', $carbonDate->format('Y-m-d'))->delete();
            
            // Reprocess the date
            $attendanceService->processLogsToRecords($carbonDate, $carbonDate);
            
            \Log::info('Auto-reprocessed attendance after override change', [
                'date' => $carbonDate->format('Y-m-d'),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to auto-reprocess attendance', [
                'date' => $date,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
