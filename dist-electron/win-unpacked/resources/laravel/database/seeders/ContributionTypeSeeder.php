<?php

namespace Database\Seeders;

use App\Models\ContributionType;
use Illuminate\Database\Seeder;

class ContributionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['name' => 'SSS', 'category' => 'Government', 'frequency' => 'Monthly', 'is_active' => true],
            ['name' => 'PhilHealth', 'category' => 'Government', 'frequency' => 'Monthly', 'is_active' => true],
            ['name' => 'Pag-IBIG', 'category' => 'Government', 'frequency' => 'Monthly', 'is_active' => true],
            ['name' => 'Withholding Tax', 'category' => 'Government', 'frequency' => 'PerPayroll', 'is_active' => true],
        ];

        foreach ($defaults as $row) {
            ContributionType::firstOrCreate(
                ['name' => $row['name']],
                $row,
            );
        }
    }
}
