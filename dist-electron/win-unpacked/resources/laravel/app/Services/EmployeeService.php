<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Employee;
use App\Repositories\EmployeeRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class EmployeeService
{
    public function __construct(
        protected EmployeeRepository $repository,
    ) {
    }

    public function getAll(?int $perPage = null): Collection|LengthAwarePaginator
    {
        return $this->repository->findAll($perPage);
    }

    public function getById(int $id): Employee
    {
        $employee = $this->repository->findById($id);

        if (! $employee) {
            throw new ModelNotFoundException('Employee not found.');
        }

        return $employee;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createWithContributions(array $data): Employee
    {
        return DB::transaction(function () use ($data) {
            // Validate department exists explicitly (in addition to validation rule)
            Department::findOrFail($data['department_id']);

            $employeeData = $data;
            $contributions = $employeeData['contributions'] ?? [];
            unset($employeeData['contributions']);

            if (empty($employeeData['employment_status'])) {
                $employeeData['employment_status'] = 'ACTIVE';
            }

            /** @var Employee $employee */
            $employee = $this->repository->create($employeeData);

            if (! empty($contributions)) {
                $this->repository->syncContributions($employee, $contributions);
            }

            return $employee->load('department', 'contributions');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(int $id, array $data): Employee
    {
        return DB::transaction(function () use ($id, $data) {
            $employee = $this->getById($id);

            if (isset($data['department_id'])) {
                Department::findOrFail($data['department_id']);
            }

            $employeeData = $data;
            $contributions = $employeeData['contributions'] ?? null;
            unset($employeeData['contributions']);

            $employee = $this->repository->update($employee, $employeeData);

            if ($contributions !== null) {
                $this->repository->syncContributions($employee, $contributions);
            }

            return $employee->load('department', 'contributions');
        });
    }

    public function delete(int $id): bool
    {
        $employee = $this->getById($id);

        return $employee->delete();
    }
}

