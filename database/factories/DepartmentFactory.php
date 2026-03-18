<?php

namespace Database\Factories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'payroll_frequency' => $this->faker->randomElement(['weekly', 'bi-weekly', 'semi-monthly', 'monthly']),
            'is_active' => true,
        ];
    }
}
