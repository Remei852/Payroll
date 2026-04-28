<?php

namespace App\Http\Requests\Employee;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
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
        return [
            'employee_code' => ['required', 'string', 'max:255', 'unique:employees,employee_code'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'position' => ['nullable', 'string', 'max:255'],
            'daily_rate' => ['required', 'numeric', 'min:0'],
            'hire_date' => ['nullable', 'date'],
            'employment_status' => ['nullable', 'string', 'in:ACTIVE,INACTIVE'],

            'contributions' => ['sometimes', 'array'],
            'contributions.*.contribution_type_id' => ['required_with:contributions', 'integer', 'exists:contribution_types,id'],
            'contributions.*.calculation_type' => ['required_with:contributions', 'string', 'in:FIXED,PERCENTAGE'],
            'contributions.*.amount_or_rate' => ['required_with:contributions', 'numeric', 'min:0'],
            'contributions.*.employer_share_amount' => ['nullable', 'numeric', 'min:0'],
            'contributions.*.effective_date' => ['nullable', 'date'],
            'contributions.*.is_active' => ['nullable', 'boolean'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        if (empty($data['employment_status'])) {
            $data['employment_status'] = 'ACTIVE';
        }

        return $data;
    }
}

