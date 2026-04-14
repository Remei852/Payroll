<?php

namespace App\Repositories;

use App\Models\Department;
use App\Models\WorkSchedule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DepartmentRepository
{
    public function create(array $data): Department
    {
        // Extract work schedule data
        $workScheduleData = $data['work_schedule'] ?? [];
        unset($data['work_schedule']);
        
        // Create the department first
        $department = Department::create($data);
        
        // Create work schedule with provided data or defaults
        WorkSchedule::create([
            'department_id'               => $department->id,
            'name'                        => $department->name . ' Schedule',
            'work_start_time'             => $workScheduleData['work_start_time'] ?? '08:00',
            'work_end_time'               => $workScheduleData['work_end_time'] ?? '17:00',
            'break_start_time'            => $workScheduleData['break_start_time'] ?? '12:00',
            'break_end_time'              => $workScheduleData['break_end_time'] ?? '13:00',
            'grace_period_minutes'        => $workScheduleData['grace_period_minutes'] ?? 15,
            'grace_period_enabled'        => $workScheduleData['grace_period_enabled'] ?? true,
            'undertime_allowance_minutes' => $workScheduleData['undertime_allowance_minutes'] ?? 5,
            'undertime_enabled'           => $workScheduleData['undertime_enabled'] ?? true,
            'monthly_late_allowance_minutes' => $workScheduleData['monthly_late_allowance_minutes'] ?? 0,
            'is_working_day'              => true,
            'half_day_hours'              => 4,
        ]);
        
        return $department->load('workSchedule');
    }

    public function findAll(?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = Department::withCount('employees')->orderBy('name');

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    public function findById(int $id): ?Department
    {
        return Department::withCount('employees')
            ->with(['workSchedule', 'employees' => function ($query) {
                $query->select('id', 'employee_code', 'first_name', 'last_name', 'department_id', 'employment_status')
                    ->orderBy('last_name')
                    ->orderBy('first_name');
            }])
            ->find($id);
    }

    public function update(Department $department, array $data): Department
    {
        // Extract work schedule data
        $workScheduleData = $data['work_schedule'] ?? null;
        unset($data['work_schedule']);
        
        // Update department
        $department->fill($data);
        $department->save();
        
        // Update work schedule if data provided
        if ($workScheduleData && $department->workSchedule) {
            $department->workSchedule->update([
                'work_start_time'             => $workScheduleData['work_start_time'] ?? $department->workSchedule->work_start_time,
                'work_end_time'               => $workScheduleData['work_end_time'] ?? $department->workSchedule->work_end_time,
                'break_start_time'            => $workScheduleData['break_start_time'] ?? $department->workSchedule->break_start_time,
                'break_end_time'              => $workScheduleData['break_end_time'] ?? $department->workSchedule->break_end_time,
                'grace_period_minutes'        => $workScheduleData['grace_period_minutes'] ?? $department->workSchedule->grace_period_minutes,
                'grace_period_enabled'        => $workScheduleData['grace_period_enabled'] ?? $department->workSchedule->grace_period_enabled,
                'undertime_allowance_minutes' => $workScheduleData['undertime_allowance_minutes'] ?? $department->workSchedule->undertime_allowance_minutes,
                'undertime_enabled'           => $workScheduleData['undertime_enabled'] ?? $department->workSchedule->undertime_enabled,
                'monthly_late_allowance_minutes' => $workScheduleData['monthly_late_allowance_minutes'] ?? $department->workSchedule->monthly_late_allowance_minutes,
            ]);
        } elseif ($workScheduleData && !$department->workSchedule) {
            // Work schedule was somehow missing — create it now
            WorkSchedule::create([
                'department_id'               => $department->id,
                'name'                        => $department->name . ' Schedule',
                'work_start_time'             => $workScheduleData['work_start_time'] ?? '08:00',
                'work_end_time'               => $workScheduleData['work_end_time'] ?? '17:00',
                'break_start_time'            => $workScheduleData['break_start_time'] ?? '12:00',
                'break_end_time'              => $workScheduleData['break_end_time'] ?? '13:00',
                'grace_period_minutes'        => $workScheduleData['grace_period_minutes'] ?? 15,
                'grace_period_enabled'        => $workScheduleData['grace_period_enabled'] ?? true,
                'undertime_allowance_minutes' => $workScheduleData['undertime_allowance_minutes'] ?? 5,
                'undertime_enabled'           => $workScheduleData['undertime_enabled'] ?? true,
                'monthly_late_allowance_minutes' => $workScheduleData['monthly_late_allowance_minutes'] ?? 0,
                'is_working_day'              => true,
                'half_day_hours'              => 4,
            ]);
        }

        return $department->load('workSchedule');
    }

    public function softDelete(Department $department): void
    {
        // The work schedule will be automatically deleted via cascade
        $department->delete();
    }

    public function getStats(): array
    {
        $totalDepartments = Department::count();
        $activeDepartments = Department::where('is_active', true)->count();
        $inactiveDepartments = Department::where('is_active', false)->count();
        $totalEmployees = \App\Models\Employee::count();

        return [
            'total_departments' => $totalDepartments,
            'active_departments' => $activeDepartments,
            'inactive_departments' => $inactiveDepartments,
            'total_employees' => $totalEmployees,
        ];
    }
}

