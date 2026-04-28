<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StoreEmployeeRequest;
use App\Http\Requests\Employee\UpdateEmployeeRequest;
use App\Models\Employee;
use App\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        protected EmployeeService $service,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->integer('per_page');
            $departmentId = $request->get('department_id');

            if ($departmentId) {
                $employees = Employee::where('department_id', $departmentId)
                    ->with('department')
                    ->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get();
                
                return response()->json(['data' => $employees]);
            }

            $employees = $this->service->getAll($perPage ?: null);

            return response()->json($employees);
        } catch (\Exception $e) {
            \Log::error('Employee API Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch employees'], 500);
        }
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = $this->service->createWithContributions($request->validated());

        return response()->json($employee, 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        try {
            $employee->load([
                'department',
                'contributions.contributionType',
                'cashAdvances.payrollPeriod',
            ]);

            return response()->json($employee);
        } catch (\Exception $e) {
            \Log::error('Employee show error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load employee details'], 500);
        }
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): JsonResponse
    {
        $updated = $this->service->update($employee->id, $request->validated());

        return response()->json($updated);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $this->service->delete($employee->id);

        return response()->json(['message' => 'Employee deleted successfully'], 200);
    }
}

