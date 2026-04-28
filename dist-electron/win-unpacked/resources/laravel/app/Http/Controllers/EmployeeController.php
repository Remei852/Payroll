<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Services\EmployeeService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeService $service,
    ) {
    }

    public function index(Request $request): Response
    {
        $employees = $this->service->getAll();

        // Transform employees for frontend
        $employeesData = $employees->map(function ($employee) {
            return [
                'id' => $employee->id,
                'employeeCode' => $employee->employee_code,
                'firstName' => $employee->first_name,
                'lastName' => $employee->last_name,
                'department' => $employee->department->name ?? '',
                'departmentId' => $employee->department_id,
                'dailyRate' => (float) $employee->daily_rate,
                'status' => $employee->employment_status,
                'position' => $employee->position,
                'hireDate' => $employee->hire_date?->format('Y-m-d'),
            ];
        });

        // Get unique department names for filter
        $departmentNames = $employees->pluck('department.name')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Get all departments with IDs for form dropdown
        $departmentsList = Department::orderBy('name')->get()->map(function ($dept) {
            return [
                'id' => $dept->id,
                'name' => $dept->name,
            ];
        })->toArray();

        return Inertia::render('Employees/Index', [
            'employees' => $employeesData,
            'departments' => $departmentNames,
            'departmentsList' => $departmentsList,
        ]);
    }
}
