<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'employee_code' => $this->faker->unique()->numerify('EMP####'),
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'department_id' => Department::factory(),
            'position' => $this->faker->jobTitle(),
            'daily_rate' => $this->faker->randomFloat(2, 500, 2000),
            'hire_date' => $this->faker->date(),
            'employment_status' => $this->faker->randomElement(['Regular', 'Probationary', 'Contractual']),
        ];
    }
}
