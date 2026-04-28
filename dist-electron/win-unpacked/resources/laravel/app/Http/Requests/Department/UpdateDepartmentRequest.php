<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
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
            'name'                          => ['sometimes', 'string', 'max:255'],
            'payroll_frequency'             => ['sometimes', 'string', 'in:WEEKLY,SEMI_MONTHLY,MONTHLY'],
            'is_active'                     => ['sometimes', 'boolean'],
            'work_schedule.work_start_time' => ['nullable', 'date_format:H:i'],
            'work_schedule.work_end_time'   => ['nullable', 'date_format:H:i', 'after:work_schedule.work_start_time'],
            'work_schedule.break_start_time'=> ['nullable', 'date_format:H:i'],
            'work_schedule.break_end_time'  => ['nullable', 'date_format:H:i', 'after:work_schedule.break_start_time'],
            'work_schedule.grace_period_minutes' => ['nullable', 'integer', 'min:0', 'max:60'],
        ];
    }
}

