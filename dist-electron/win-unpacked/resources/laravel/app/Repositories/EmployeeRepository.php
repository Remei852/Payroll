<?php

namespace App\Repositories;

use App\Models\Employee;
use App\Models\EmployeeContribution;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class EmployeeRepository
{
    public function create(array $data): Employee
    {
        return Employee::create($data);
    }

    public function findAll(?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = Employee::with('department')->orderBy('last_name')->orderBy('first_name');

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    public function findById(int $id): ?Employee
    {
        return Employee::with(['department', 'contributions.contributionType'])->find($id);
    }

    public function update(Employee $employee, array $data): Employee
    {
        $employee->fill($data);
        $employee->save();

        return $employee;
    }

    /**
     * @param  Employee  $employee
     * @param  array<int, array<string, mixed>>  $contributions
     */
    public function syncContributions(Employee $employee, array $contributions): void
    {
        $employee->contributions()->delete();

        foreach ($contributions as $contribution) {
            EmployeeContribution::create([
                'employee_id' => $employee->id,
                'contribution_type_id' => $contribution['contribution_type_id'],
                'calculation_type' => $contribution['calculation_type'],
                'amount_or_rate' => $contribution['amount_or_rate'],
                'employer_share_amount' => $contribution['employer_share_amount'] ?? null,
                'effective_date' => $contribution['effective_date'] ?? now()->toDateString(),
                'is_active' => $contribution['is_active'] ?? true,
            ]);
        }
    }
}

