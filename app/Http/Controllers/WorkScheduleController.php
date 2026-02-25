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

        $workSchedule->update($validated);

        return back()->with('success', 'Work schedule updated successfully');
    }

    public function destroy(WorkSchedule $workSchedule)
    {
        $workSchedule->delete();

        return back()->with('success', 'Work schedule deleted successfully');
    }
}
