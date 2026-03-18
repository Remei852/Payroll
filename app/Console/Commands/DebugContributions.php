<?php

namespace App\Console\Commands;

use App\Models\Employee;
use Illuminate\Console\Command;

class DebugContributions extends Command
{
    protected $signature = 'contributions:debug {employee_id}';
    protected $description = 'Debug contributions for a specific employee';

    public function handle()
    {
        $employeeId = $this->argument('employee_id');
        $employee = Employee::find($employeeId);

        if (!$employee) {
            $this->error("Employee with ID {$employeeId} not found.");
            return 1;
        }

        $this->info("=== EMPLOYEE CONTRIBUTIONS DEBUG ===");
        $this->info("Employee: {$employee->first_name} {$employee->last_name}");
        $this->info("Employee ID: {$employee->id}");
        $this->info("Employee Code: {$employee->employee_code}");
        $this->info("Daily Rate: ₱" . number_format($employee->daily_rate, 2));
        $this->newLine();

        // Get all contributions
        $allContributions = $employee->contributions()->get();
        $this->info("Total Contributions in Database: {$allContributions->count()}");
        $this->newLine();

        if ($allContributions->count() === 0) {
            $this->warn("⚠️ No contributions found for this employee!");
            $this->info("To add contributions:");
            $this->info("1. Go to Employees page");
            $this->info("2. Edit this employee");
            $this->info("3. Go to Contributions tab");
            $this->info("4. Add contributions");
            return 0;
        }

        // Display all contributions
        $this->table(
            ['ID', 'Type', 'Calculation', 'Amount/Rate', 'Active', 'Effective Date'],
            $allContributions->map(function ($c) {
                return [
                    $c->id,
                    $c->contributionType->name ?? 'UNKNOWN',
                    $c->calculation_type,
                    $c->amount_or_rate,
                    $c->is_active ? '✓ Yes' : '✗ No',
                    $c->effective_date->format('Y-m-d'),
                ];
            })
        );
        $this->newLine();

        // Get active contributions
        $activeContributions = $employee->contributions()->where('is_active', true)->get();
        $this->info("Active Contributions: {$activeContributions->count()}");

        if ($activeContributions->count() === 0) {
            $this->warn("⚠️ No ACTIVE contributions found!");
            $this->info("To activate contributions:");
            $this->info("1. Go to Employees page");
            $this->info("2. Edit this employee");
            $this->info("3. Go to Contributions tab");
            $this->info("4. Toggle each contribution to ON (active)");
            $this->info("5. Save");
            return 0;
        }

        $this->newLine();
        $this->info("=== ACTIVE CONTRIBUTIONS DETAILS ===");
        $this->newLine();

        foreach ($activeContributions as $contribution) {
            $this->info("Contribution: {$contribution->contributionType->name}");
            $this->info("  ID: {$contribution->id}");
            $this->info("  Type: {$contribution->calculation_type}");
            $this->info("  Amount/Rate: {$contribution->amount_or_rate}");
            $this->info("  Effective Date: {$contribution->effective_date->format('Y-m-d')}");
            
            // Calculate what will be deducted
            if ($contribution->calculation_type === 'FIXED') {
                $amount = (float) $contribution->amount_or_rate;
                $this->info("  → Will deduct: ₱" . number_format($amount, 2) . " (fixed)");
            } elseif ($contribution->calculation_type === 'PERCENTAGE') {
                $rate = (float) $contribution->amount_or_rate;
                $basicPay = $employee->daily_rate * 10; // Assuming 10 days
                $amount = $basicPay * ($rate / 100);
                $this->info("  → Will deduct: ₱" . number_format($amount, 2) . " ({$rate}% of ₱" . number_format($basicPay, 2) . ")");
            }
            $this->newLine();
        }

        $this->info("✓ Contributions are properly configured!");
        $this->info("If contributions are still not appearing in payroll:");
        $this->info("1. Check the payroll logs: tail -f storage/logs/laravel.log");
        $this->info("2. Look for 'Contributions Debug' entries");
        $this->info("3. Regenerate payroll");

        return 0;
    }
}
