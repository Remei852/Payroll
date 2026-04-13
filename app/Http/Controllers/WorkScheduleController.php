<?php

namespace App\Http\Controllers;

use App\Models\WorkSchedule;
use Illuminate\Http\Request;

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

        return back()->with('success', 'Work schedule updated successfully');
    }

    public function destroy(WorkSchedule $workSchedule)
    {
        $workSchedule->delete();

        return back()->with('success', 'Work schedule deleted successfully');
    }
}
