<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;

class PhilippineHolidaySeeder extends Seeder
{
    public function run(): void
    {
        $holidays = [
            ['name' => "New Year's Day", 'holiday_date' => '2026-01-01', 'type' => 'Regular', 'rate_multiplier' =>  1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Araw ng Kagitingan (Day of Valor)', 'holiday_date' => '2026-04-09', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Labor Day', 'holiday_date' => '2026-05-01', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Independence Day', 'holiday_date' => '2026-06-12', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Ninoy Aquino Day', 'holiday_date' => '2026-08-21', 'type' => 'Special', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'National Heroes Day', 'holiday_date' => '2026-08-31', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => "All Saints' Day", 'holiday_date' => '2026-11-01', 'type' => 'Special', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Bonifacio Day', 'holiday_date' => '2026-11-30', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Feast of the Immaculate Conception', 'holiday_date' => '2026-12-08', 'type' => 'Special', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Christmas Day', 'holiday_date' => '2026-12-25', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Rizal Day', 'holiday_date' => '2026-12-30', 'type' => 'Regular', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
            ['name' => 'Last Day of the Year', 'holiday_date' => '2026-12-31', 'type' => 'Special', 'rate_multiplier' => 1.00, 'is_paid' => false, 'is_recurring' => true],
        ];

        foreach ($holidays as $holiday) {
            Holiday::firstOrCreate(['name' => $holiday['name'], 'is_recurring' => true], $holiday);
        }

        $this->command->info('Philippine holidays seeded successfully!');
    }
}
