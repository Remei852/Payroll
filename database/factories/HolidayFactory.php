<?php

namespace Database\Factories;

use App\Models\Holiday;
use Illuminate\Database\Eloquent\Factories\Factory;

class HolidayFactory extends Factory
{
    protected $model = Holiday::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'holiday_date' => $this->faker->date(),
            'type' => $this->faker->randomElement(['Regular', 'Special', 'Company']),
            'rate_multiplier' => 1.00,
            'is_paid' => true,
            'is_recurring' => false,
            'department_id' => null,
        ];
    }
}
