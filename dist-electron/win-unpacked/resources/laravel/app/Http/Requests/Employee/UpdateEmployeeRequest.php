<?php

namespace App\Http\Requests\Employee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $employeeId = $this->route('employee') ?? $this->route('id');

        return [
            'employee_code' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('employees', 'employee_code')->ignore($employeeId),
            ],
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'department_id' => ['sometimes', 'integer', 'exists:departments,id'],
            'position' => ['nullable', 'string', 'max:255'],
            'daily_rate' => ['sometimes', 'numeric', 'min:0'],
            'hire_date' => ['nullable', 'date'],
            'employment_status' => ['sometimes', 'string', 'in:ACTIVE,INACTIVE'],

            'contributions' => ['sometimes', 'array'],
            'contributions.*.contribution_type_id' => ['required_with:contributions', 'integer', 'exists:contribution_types,id'],
            'contributions.*.calculation_type' => ['required_with:contributions', 'string', 'in:FIXED,PERCENTAGE'],
            'contributions.*.amount_or_rate' => ['required_with:contributions', 'numeric', 'min:0'],
            'contributions.*.employer_share_amount' => ['nullable', 'numeric', 'min:0'],
            'contributions.*.effective_date' => ['nullable', 'date'],
            'contributions.*.is_active' => ['nullable', 'boolean'],
        ];
    }
}
